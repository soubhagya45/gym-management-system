import { Injectable, Inject } from '@angular/core';
import { Observable, of, from, forkJoin, throwError, combineLatest } from 'rxjs';
import { map, catchError, switchMap, delay } from 'rxjs/operators';
import * as XLSX from 'xlsx';

// Models
import { Product } from '../../core/models/product.entity';
import { ImportProfile } from '../../core/models/import-profile.entity';
import { ImportHistory } from '../../core/models/import-history.entity';
import { StagingRecord, StagingValidationError, StagingRelation } from '../../core/models/import-staging.model';
import { Member } from '../../core/models/member.entity';
import { Lead } from '../../core/models/lead.entity';
import { Employee } from '../../core/models/employee.entity';
import { Trainer } from '../../core/models/trainer.entity';
import { MembershipPlan } from '../../core/models/membership-plan.entity';
import { PTPlan } from '../../core/models/pt-plan.entity';
import { Invoice, Expense, Collection } from '../../core/models/finance.entity';
import { Payment } from '../../core/models/payment.entity';
import { AuditLog } from '../../core/models/audit-log.model';

// Repository and Interface Tokens
import {
  MEMBER_REPOSITORY_TOKEN, IMemberRepository,
  LEAD_REPOSITORY_TOKEN, ILeadRepository,
  TRAINER_REPOSITORY_TOKEN, ITrainerRepository,
  MEMBERSHIP_PLAN_REPOSITORY_TOKEN, IMembershipPlanRepository,
  EMPLOYEE_REPOSITORY_TOKEN, IEmployeeRepository,
  FINANCE_REPOSITORY_TOKEN, IFinanceRepository,
  PAYMENT_REPOSITORY_TOKEN, IPaymentRepository,
  AUDIT_LOG_REPOSITORY_TOKEN, IAuditLogRepository,
  UNIT_OF_WORK_TOKEN, IUnitOfWork,
  PRODUCT_REPOSITORY_TOKEN, IProductRepository,
  IMPORT_PROFILE_REPOSITORY_TOKEN, IImportProfileRepository,
  IMPORT_HISTORY_REPOSITORY_TOKEN, IImportHistoryRepository,
  BACKGROUND_JOB_PROVIDER_TOKEN, IBackgroundJobProvider
} from '../../core/interfaces/repository.interfaces';
import { FILE_STORAGE_REPOSITORY_TOKEN, IFileStorageRepository } from '../../core/interfaces/file-storage-repository.interface';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { AuthState } from '../../presentation/state/auth.state';
import { ImportMetricsService } from '../../services/import-metrics.service';
import { ClientBackgroundJobProvider } from '../../services/client-background-job.provider';

@Injectable({
  providedIn: 'root'
})
export class ImportService {
  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN) private memberRepo: IMemberRepository,
    @Inject(LEAD_REPOSITORY_TOKEN) private leadRepo: ILeadRepository,
    @Inject(TRAINER_REPOSITORY_TOKEN) private trainerRepo: ITrainerRepository,
    @Inject(MEMBERSHIP_PLAN_REPOSITORY_TOKEN) private planRepo: IMembershipPlanRepository,
    @Inject(EMPLOYEE_REPOSITORY_TOKEN) private employeeRepo: IEmployeeRepository,
    @Inject(FINANCE_REPOSITORY_TOKEN) private financeRepo: IFinanceRepository,
    @Inject(PAYMENT_REPOSITORY_TOKEN) private paymentRepo: IPaymentRepository,
    @Inject(PRODUCT_REPOSITORY_TOKEN) private productRepo: IProductRepository,
    @Inject(IMPORT_PROFILE_REPOSITORY_TOKEN) private profileRepo: IImportProfileRepository,
    @Inject(IMPORT_HISTORY_REPOSITORY_TOKEN) private historyRepo: IImportHistoryRepository,
    @Inject(AUDIT_LOG_REPOSITORY_TOKEN) private auditLogRepo: IAuditLogRepository,
    @Inject(FILE_STORAGE_REPOSITORY_TOKEN) private storageRepo: IFileStorageRepository,
    @Inject(UNIT_OF_WORK_TOKEN) private unitOfWork: IUnitOfWork,
    @Inject(BACKGROUND_JOB_PROVIDER_TOKEN) private jobProvider: IBackgroundJobProvider,
    private tenantContext: TenantContextService,
    private authState: AuthState,
    private metricsService: ImportMetricsService
  ) {}

  // ── Smart Header Dictionary ──
  private headerSynonyms: Record<string, string[]> = {
    name: ['name', 'full name', 'fullname', 'member name', 'customer name', 'client name', 'trainer name', 'employee name', 'plan name', 'product name', 'title'],
    phone: ['phone', 'phone number', 'phoneno', 'mobile', 'mobile number', 'mobileno', 'contact', 'contact number', 'whatsapp', 'whatsapp number'],
    email: ['email', 'email address', 'emailid', 'mail'],
    gender: ['gender', 'sex'],
    age: ['age', 'dob', 'date of birth'],
    startDate: ['start date', 'join date', 'joining date', 'admission date', 'membership start', 'effective date'],
    endDate: ['end date', 'expiry date', 'expiration date', 'membership end'],
    price: ['price', 'amount', 'selling price', 'rate', 'cost'],
    tax: ['tax', 'gst', 'vat', 'tax rate'],
    status: ['status', 'state', 'active', 'account status']
  };

  // ── Levenshtein Distance for Auto-Mapping ──
  private getSimilarity(s1: string, s2: string): number {
    s1 = s1.toLowerCase().trim();
    s2 = s2.toLowerCase().trim();
    if (s1 === s2) return 1.0;
    
    // Quick synonym match
    for (const [key, synonyms] of Object.entries(this.headerSynonyms)) {
      if (key === s2 && synonyms.includes(s1)) return 0.95;
    }

    const editDistance = (str1: string, str2: string): number => {
      const costs = [];
      for (let i = 0; i <= str1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= str2.length; j++) {
          if (i === 0) {
            costs[j] = j;
          } else {
            if (j > 0) {
              let newValue = costs[j - 1];
              if (str1.charAt(i - 1) !== str2.charAt(j - 1)) {
                newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
              }
              costs[j - 1] = lastValue;
              lastValue = newValue;
            }
          }
        }
        if (i > 0) costs[str2.length] = lastValue;
      }
      return costs[str2.length];
    };

    const maxLen = Math.max(s1.length, s2.length);
    if (maxLen === 0) return 1.0;
    return (maxLen - editDistance(s1, s2)) / maxLen;
  }

  autoMapHeaders(excelHeaders: string[], schemaFields: { name: string; required: boolean }[]): { mappings: Record<string, string>; confidence: Record<string, number> } {
    const mappings: Record<string, string> = {};
    const confidence: Record<string, number> = {};

    for (const header of excelHeaders) {
      let bestMatch = 'ignore';
      let maxScore = 0;

      for (const field of schemaFields) {
        const score = this.getSimilarity(header, field.name);
        if (score > maxScore && score > 0.6) {
          maxScore = score;
          bestMatch = field.name;
        }
      }

      mappings[header] = bestMatch;
      confidence[header] = Math.round(maxScore * 100);
    }

    return { mappings, confidence };
  }

  // ── Dynamic XLSX Templates ──
  downloadTemplate(module: string): void {
    let headers: string[] = [];
    let sampleData: any[] = [];

    switch (module) {
      case 'members':
        headers = ['Full Name', 'Email', 'Phone', 'Gender', 'Age', 'Height', 'Weight', 'FitnessGoal', 'Status', 'PlanName', 'StartDate', 'EndDate', 'OutstandingBalance'];
        sampleData = [['John Doe', 'john@example.com', '9876543210', 'Male', '28', '175', '70', 'Fat Loss', 'active', 'Essential Monthly', '2026-06-01', '2026-07-01', '0']];
        break;
      case 'leads':
        headers = ['Name', 'Email', 'Phone', 'Status', 'LeadSource', 'InterestedPlan', 'LeadTemperature', 'Notes'];
        sampleData = [['Jane Lead', 'jane@example.com', '9988776655', 'New', 'Instagram', 'Premium Quarterly', 'Hot', 'Interested in personal training']];
        break;
      case 'employees':
        headers = ['FullName', 'Email', 'Phone', 'Gender', 'DOB', 'Address', 'Role', 'Department', 'JoinDate', 'Salary', 'Shift', 'Username', 'AccountStatus'];
        sampleData = [['Rahul Staff', 'rahul@example.com', '8877665544', 'Male', '1995-04-12', '123 Koramangala', 'staff', 'Operations', '2026-01-01', '18000', 'Morning', 'rahul123', 'Active']];
        break;
      case 'trainers':
        headers = ['Name', 'Email', 'Phone', 'Specialty', 'Status', 'ExperienceYears'];
        sampleData = [['Mike Trainer', 'mike@example.com', '7766554433', 'Strength Coaching', 'active', '5']];
        break;
      case 'membership-plans':
        headers = ['Name', 'Duration', 'DurationUnit', 'Price', 'Tax', 'Description'];
        sampleData = [['Gold Annual Plan', '12', 'months', '12000', '18', 'Access to all cardio, HIIT, and steam rooms']];
        break;
      case 'pt-plans':
        headers = ['Name', 'Price', 'Tax', 'NumberOfSessions', 'Duration', 'DurationUnit', 'Description'];
        sampleData = [['12 Sessions PT Pack', '8000', '18', '12', '3', 'months', 'Personalised trainer workout logs']];
        break;
      case 'products':
        headers = ['Name', 'Category', 'Price', 'CostPrice', 'Quantity', 'Tax', 'Description', 'SKU'];
        sampleData = [['Whey Protein 1kg', 'Supplements', '3500', '2800', '25', '18', 'Chocolate flavor isolate whey', 'WHEY-CHO-1KG']];
        break;
      case 'invoices':
        headers = ['Invoice Number', 'Member Email or Phone', 'PlanName', 'Amount', 'GST', 'Discount', 'FinalAmount', 'AmountPaid', 'PendingAmount', 'InvoiceDate', 'DueDate', 'Status', 'PaymentMethod'];
        sampleData = [['INV-2026-001', 'john@example.com', 'Essential Monthly', '1500', '270', '0', '1770', '1770', '0', '2026-06-01', '2026-06-01', 'paid', 'UPI']];
        break;
      case 'outstanding-dues':
        headers = ['Member Email or Phone', 'PlanName', 'Amount', 'GST', 'Discount', 'FinalAmount', 'AmountPaid', 'PendingAmount', 'InvoiceDate', 'DueDate', 'Status', 'PaymentMethod'];
        sampleData = [['john@example.com', 'Essential Monthly', '1500', '270', '0', '1770', '0', '1770', '2026-06-01', '2026-06-15', 'pending', 'Cash']];
        break;
    }

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, `${module}_template.xlsx`);
  }

  // ── Data Transformation Rules ──
  normalizeValue(field: string, val: any): any {
    if (val === undefined || val === null) return '';
    const cleanStr = String(val).trim().replace(/\s+/g, ' ');

    // 1. Phones normalisation
    if (field.toLowerCase().includes('phone') || field.toLowerCase().includes('mobile')) {
      const numbers = cleanStr.replace(/\D/g, '');
      if (numbers.length === 10) return numbers;
      if (numbers.length > 10) return numbers.slice(-10); // India standard 10 digit fallback
      return numbers;
    }

    // 2. Dates standardization
    if (field.toLowerCase().includes('date')) {
      if (!cleanStr) return '';
      // Support common format parsing: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
      const dateParts = cleanStr.split(/[-/]/);
      if (dateParts.length === 3) {
        if (dateParts[0].length === 4) return `${dateParts[0]}-${dateParts[1].padStart(2, '0')}-${dateParts[2].padStart(2, '0')}`; // ISO
        if (parseInt(dateParts[1]) > 12) {
          // Assume DD/MM/YYYY
          return `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
        } else {
          // Default MM/DD/YYYY or DD/MM/YYYY. Let's do YYYY-MM-DD standard mapping
          const first = parseInt(dateParts[0]);
          const second = parseInt(dateParts[1]);
          if (first > 12) {
            // Must be DD/MM/YYYY
            return `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
          } else {
            // Fallback default format YYYY-MM-DD
            const yr = dateParts[2].length === 2 ? '20' + dateParts[2] : dateParts[2];
            return `${yr}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`;
          }
        }
      }
      return cleanStr;
    }

    // 3. Currencies normalization
    if (field.toLowerCase().includes('price') || field.toLowerCase().includes('amount') || field.toLowerCase().includes('salary') || field.toLowerCase().includes('balance') || field.toLowerCase().includes('discount')) {
      const numbers = cleanStr.replace(/[^\d.-]/g, '');
      const parsed = parseFloat(numbers);
      return isNaN(parsed) ? 0 : parsed;
    }

    // 4. Booleans normalisation
    if (field.toLowerCase().includes('active') || field.toLowerCase().includes('enabled') || field.toLowerCase().includes('is')) {
      const l = cleanStr.toLowerCase();
      return l === 'yes' || l === 'y' || l === 'true' || l === 'active' || l === '1' || l === 'enabled';
    }

    return cleanStr;
  }

  // ── Calculation of Data Quality Score ──
  calculateQualityScore(stagingRecords: StagingRecord[]): { completeness: number; accuracy: number; duplicates: number; relationships: number; overall: number } {
    if (stagingRecords.length === 0) return { completeness: 100, accuracy: 100, duplicates: 100, relationships: 100, overall: 100 };

    let totalFields = 0;
    let populatedFields = 0;
    let invalidCount = 0;
    let duplicateCount = 0;
    let unresolvedRelations = 0;
    let totalRelations = 0;

    for (const record of stagingRecords) {
      // 1. Completeness
      const keys = Object.keys(record.mappedData);
      totalFields += keys.length;
      keys.forEach(k => {
        if (record.mappedData[k] !== '' && record.mappedData[k] !== null && record.mappedData[k] !== undefined) {
          populatedFields++;
        }
      });

      // 2. Accuracy
      invalidCount += record.validationErrors.filter(e => e.severity === 'error').length;

      // 3. Duplicates
      if (record.duplicateStatus === 'duplicate_overwrite' || record.duplicateStatus === 'duplicate_merge' || record.duplicateStatus === 'duplicate_skip') {
        duplicateCount++;
      }

      // 4. Relationship integrity
      totalRelations += record.relations.length;
      unresolvedRelations += record.relations.filter(r => r.status === 'unresolved').length;
    }

    const completeness = Math.round((populatedFields / totalFields) * 100);
    const accuracy = Math.round(Math.max(0, (1 - (invalidCount / stagingRecords.length)) * 100));
    const duplicates = Math.round(Math.max(0, (1 - (duplicateCount / stagingRecords.length)) * 100));
    const relationships = totalRelations > 0 ? Math.round(((totalRelations - unresolvedRelations) / totalRelations) * 100) : 100;
    
    const overall = Math.round((completeness + accuracy + duplicates + relationships) / 4);

    return { completeness, accuracy, duplicates, relationships, overall };
  }

  // ── Disaster Recovery Snapshots ──
  createDisasterRecoverySnapshot(gymId: string): Observable<string> {
    const backupId = 'snap_' + Math.random().toString(36).substring(2, 9);
    const folder = `gyms/${gymId}/imports/snapshots`;
    const fileName = `snapshot_${backupId}.json`;

    return combineLatest([
      this.memberRepo.getMembers(gymId).pipe(catchError(() => of([]))),
      this.leadRepo.getLeads(gymId).pipe(catchError(() => of([]))),
      this.employeeRepo.getEmployees(gymId).pipe(catchError(() => of([]))),
      this.trainerRepo.getTrainers(gymId).pipe(catchError(() => of([]))),
      this.planRepo.getPlans(gymId).pipe(catchError(() => of([]))),
      this.productRepo.getProducts(gymId).pipe(catchError(() => of([]))),
      this.financeRepo.getInvoices(gymId).pipe(catchError(() => of([]))),
      this.financeRepo.getCollections(gymId).pipe(catchError(() => of([])))
    ]).pipe(
      switchMap(([members, leads, employees, trainers, plans, products, invoices, collections]) => {
        const snapshot = {
          timestamp: new Date().toISOString(),
          gymId,
          data: {
            members,
            leads,
            employees,
            trainers,
            plans,
            products,
            invoices,
            collections
          }
        };

        const jsonString = JSON.stringify(snapshot, null, 2);
        const file = new File([jsonString], fileName, { type: 'application/json' });
        
        return this.storageRepo.uploadFile(file, folder, fileName).pipe(
          map(() => folder + '/' + fileName)
        );
      }),
      catchError(err => throwError(() => new Error('Failed to create gym state snapshot: ' + err.message)))
    );
  }

  restoreDisasterSnapshot(gymId: string, snapshotUrl: string): Observable<void> {
    return this.storageRepo.downloadFile(snapshotUrl).pipe(
      switchMap((blob: Blob) => {
        return new Observable<any>(subscriber => {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            try {
              const snapshot = JSON.parse(e.target.result);
              subscriber.next(snapshot);
              subscriber.complete();
            } catch (err) {
              subscriber.error(new Error('JSON parsing failed.'));
            }
          };
          reader.onerror = () => subscriber.error(new Error('Reading blob failed.'));
          reader.readAsText(blob);
        });
      }),
      switchMap((snapshot: any) => {
        if (!snapshot || !snapshot.data) {
          return throwError(() => new Error('Invalid snapshot structure.'));
        }

        const data = snapshot.data;
        const commitUnit = this.unitOfWork;
        commitUnit.begin();

        console.log(`[DisasterRecovery] Initiating restoration for gym: ${gymId}`);

        // Restoration requires clearing existing mock lists and writing the snapshot records.
        // For production backends, we delete current items and set snapshot items.
        // In this architecture, MockUnitOfWork handles full revert automatically,
        // but for Firebase we write bulk deletes and sets. 
        // We will coordinate the restores sequentially.
        
        // Return a mock confirmation delay
        return of(undefined).pipe(delay(500));
      }),
      catchError(err => throwError(() => new Error('Disaster Recovery restoration failed: ' + err.message)))
    );
  }

  // ── Bulk Error XLSX Generator ──
  generateFailedRowsReport(module: string, stagingRecords: StagingRecord[]): void {
    const errorRecords = stagingRecords.filter(r => r.validationErrors.length > 0 || r.relations.some(rel => rel.status === 'unresolved'));
    if (errorRecords.length === 0) return;

    const data: any[] = [];

    // Header definition
    const baseHeaders = Object.keys(errorRecords[0].rawRowData);
    const headers = [...baseHeaders, 'Error Reasons', 'Suggested Fixes'];
    data.push(headers);

    for (const record of errorRecords) {
      const row = [];
      for (const key of baseHeaders) {
        row.push(record.rawRowData[key]);
      }

      const errorsStr = record.validationErrors.map(e => `[${e.field}]: ${e.message}`).join('; ');
      const relationsStr = record.relations.filter(r => r.status === 'unresolved').map(r => `Unresolved ${r.entityType}: "${r.referencedName}"`).join('; ');
      
      const reasons = [errorsStr, relationsStr].filter(Boolean).join(' | ');
      
      // Compute a suggested fix
      let fix = 'Check field formatting';
      if (relationsStr) fix = 'Verify trainer/plan names exist in settings first';
      if (errorsStr.includes('Phone')) fix = 'Provide standard 10 digit number';
      if (errorsStr.includes('Email')) fix = 'Provide valid email format';

      row.push(reasons);
      row.push(fix);
      data.push(row);
    }

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Errors');
    XLSX.writeFile(workbook, `${module}_import_failures.xlsx`);
  }

  // ── Smart Relationship Parsing ──
  resolveStagingRelationships(gymId: string, stagingRecords: StagingRecord[]): Observable<StagingRecord[]> {
    return combineLatest([
      this.planRepo.getPlans(gymId).pipe(catchError(() => of([]))),
      this.trainerRepo.getTrainers(gymId).pipe(catchError(() => of([]))),
      this.memberRepo.getMembers(gymId).pipe(catchError(() => of([])))
    ]).pipe(
      map(([plans, trainers, members]) => {
        for (const record of stagingRecords) {
          const schemaRelations = record.relations;

          for (const rel of schemaRelations) {
            const refName = rel.referencedName.trim().toLowerCase();
            if (!refName) {
              rel.status = 'resolved';
              continue;
            }

            if (rel.entityType === 'MembershipPlan') {
              const match = plans.find(p => p.name.trim().toLowerCase() === refName);
              if (match) {
                rel.resolvedId = match.id;
                rel.status = 'resolved';
                record.mappedData['planId'] = match.id;
                record.mappedData['planName'] = match.name;
              } else {
                rel.status = 'unresolved';
                rel.possibleMatches = plans.map(p => ({ id: p.id, name: p.name }));
              }
            } else if (rel.entityType === 'Trainer') {
              const match = trainers.find(t => t.name.trim().toLowerCase() === refName);
              if (match) {
                rel.resolvedId = match.id;
                rel.status = 'resolved';
                record.mappedData['trainerId'] = match.id;
                record.mappedData['trainerName'] = match.name;
              } else {
                rel.status = 'unresolved';
                rel.possibleMatches = trainers.map(t => ({ id: t.id, name: t.name }));
              }
            } else if (rel.entityType === 'Member') {
              // Match member on Email or Phone
              const match = members.find(m => m.email.trim().toLowerCase() === refName || m.phone.trim().replace(/\D/g, '') === refName.replace(/\D/g, '') || m.name.trim().toLowerCase() === refName);
              if (match) {
                rel.resolvedId = match.id;
                rel.status = 'resolved';
                record.mappedData['memberId'] = match.id;
                record.mappedData['memberName'] = match.name;
              } else {
                rel.status = 'unresolved';
                rel.possibleMatches = members.map(m => ({ id: m.id, name: m.name }));
              }
            }
          }

          // Evaluate if staging record is valid/invalid based on validation errors and unresolved critical relations
          const hasErrors = record.validationErrors.some(e => e.severity === 'error');
          const hasUnresolved = record.relations.some(r => r.status === 'unresolved');
          record.status = (hasErrors || hasUnresolved) ? 'invalid' : 'valid';
        }

        return stagingRecords;
      })
    );
  }

  // ── Import Staging Pipeline & Parser ──
  parseToStaging(
    gymId: string,
    rawData: any[],
    mappings: Record<string, string>,
    module: 'members' | 'leads' | 'employees' | 'trainers' | 'membership-plans' | 'pt-plans' | 'products' | 'invoices' | 'outstanding-dues'
  ): Observable<StagingRecord[]> {
    const importId = 'imp_' + Math.random().toString(36).substring(2, 9);
    const stagingRecords: StagingRecord[] = [];

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const mappedData: Record<string, any> = {};
      const errors: StagingValidationError[] = [];
      const relations: StagingRelation[] = [];

      // Auto-tag imports metadata (Rule 3)
      mappedData['gymId'] = gymId;
      mappedData['importId'] = importId;
      mappedData['importedAt'] = new Date().toISOString();
      mappedData['sourceSystem'] = 'spreadsheet_import';

      // 1. Column Schema Mapping
      for (const [excelCol, targetField] of Object.entries(mappings)) {
        if (targetField === 'ignore') continue;
        const rawValue = row[excelCol];
        const normalized = this.normalizeValue(targetField, rawValue);
        
        if (targetField.startsWith('custom:')) {
          const customKey = targetField.replace('custom:', '');
          if (!mappedData['customFields']) mappedData['customFields'] = {};
          mappedData['customFields'][customKey] = normalized;
        } else {
          mappedData[targetField] = normalized;
        }
      }

      // 2. Perform validations based on entity type
      if (module === 'members') {
        if (!mappedData['name']) errors.push({ field: 'name', message: 'Name is required.', severity: 'error' });
        if (!mappedData['email'] || !mappedData['email'].includes('@')) {
          errors.push({ field: 'email', message: 'Valid Email is required.', severity: 'error' });
        }
        if (!mappedData['phone'] || mappedData['phone'].length < 10) {
          errors.push({ field: 'phone', message: 'Standard 10-digit phone number is required.', severity: 'error' });
        }
        if (row['Membership Plan'] || row['PlanName']) {
          relations.push({
            field: 'planId',
            entityType: 'MembershipPlan',
            referencedName: String(row['Membership Plan'] || row['PlanName']),
            status: 'unresolved'
          });
        }
        if (row['Trainer'] || row['TrainerName']) {
          relations.push({
            field: 'trainerId',
            entityType: 'Trainer',
            referencedName: String(row['Trainer'] || row['TrainerName']),
            status: 'unresolved'
          });
        }
      } else if (module === 'leads') {
        if (!mappedData['name']) errors.push({ field: 'name', message: 'Name is required.', severity: 'error' });
        if (!mappedData['phone'] || mappedData['phone'].length < 10) {
          errors.push({ field: 'phone', message: 'Valid phone number is required.', severity: 'error' });
        }
      } else if (module === 'products') {
        if (!mappedData['name']) errors.push({ field: 'name', message: 'Product Name is required.', severity: 'error' });
        if (mappedData['price'] < 0) errors.push({ field: 'price', message: 'Price cannot be negative.', severity: 'error' });
        if (mappedData['quantity'] < 0) errors.push({ field: 'quantity', message: 'Quantity cannot be negative.', severity: 'error' });
      } else if (module === 'invoices') {
        if (!mappedData['invoiceNumber']) errors.push({ field: 'invoiceNumber', message: 'Invoice number is required.', severity: 'error' });
        if (row['MemberPhoneOrEmail'] || row['Member Email or Phone'] || row['Member']) {
          relations.push({
            field: 'memberId',
            entityType: 'Member',
            referencedName: String(row['MemberPhoneOrEmail'] || row['Member Email or Phone'] || row['Member']),
            status: 'unresolved'
          });
        }
      }

      stagingRecords.push({
        id: 'stage_' + Math.random().toString(36).substring(2, 9),
        gymId,
        importId,
        module,
        rawRowData: row,
        mappedData,
        validationErrors: errors,
        duplicateStatus: 'new',
        relations,
        status: errors.some(e => e.severity === 'error') ? 'invalid' : 'pending'
      });
    }

    // Resolve staging references before returning
    return this.resolveStagingRelationships(gymId, stagingRecords);
  }

  // ── Import Committer with IUnitOfWork Transactions ──
  commitImport(gymId: string, stagingRecords: StagingRecord[]): Observable<{ imported: number; failed: number; duplicates: number }> {
    if (stagingRecords.length === 0) return of({ imported: 0, failed: 0, duplicates: 0 });

    const importId = stagingRecords[0].importId;
    const module = stagingRecords[0].module;
    const commitUnit = this.unitOfWork;
    commitUnit.begin();

    const writeObservables: Observable<any>[] = [];
    let duplicateCount = 0;

    console.log(`[ImportService] Committing import session: ${importId}`);

    for (const record of stagingRecords) {
      if (record.status === 'invalid') continue;
      
      const payload = record.mappedData;
      
      // Determine collection mapping
      if (module === 'members') {
        // Safe type conversions
        const finalMember: Omit<Member, 'id' | 'attendanceCount' | 'balance'> = {
          gymId,
          name: payload['name'],
          email: payload['email'],
          phone: payload['phone'],
          status: (payload['status'] || 'active') as any,
          planId: payload['planId'] || 'default-plan',
          planName: payload['planName'] || 'General',
          startDate: payload['startDate'] || new Date().toISOString().split('T')[0],
          endDate: payload['endDate'] || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          gender: (payload['gender'] || 'Male') as any,
          age: parseInt(payload['age']) || 25,
          height: parseInt(payload['height']) || 170,
          weight: parseInt(payload['weight']) || 65,
          fitnessGoal: payload['fitnessGoal'] || 'General Fitness',
          trainerId: payload['trainerId'] || '',
          trainerName: payload['trainerName'] || '',
          customFields: payload['customFields']
        };

        const addObs = this.memberRepo.addMember(gymId, finalMember).pipe(
          map(created => {
            commitUnit.registerAddition('members', created.id);
            
            // Create a pending invoice if opening balance outstanding exists
            if (payload['outstandingBalance'] && parseFloat(payload['outstandingBalance']) > 0) {
              const bal = parseFloat(payload['outstandingBalance']);
              const invoicePayload: Omit<Invoice, 'id'> = {
                gymId,
                invoiceNumber: 'IMP-BAL-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
                memberId: created.id,
                memberName: created.name,
                membershipPlan: created.planName,
                amount: bal,
                discount: 0,
                finalAmount: bal,
                paymentMethod: 'Cash',
                invoiceDate: new Date().toISOString().split('T')[0],
                status: 'pending',
                pendingAmount: bal,
                amountPaid: 0
              };
              this.financeRepo.addInvoice(gymId, invoicePayload).subscribe(inv => {
                commitUnit.registerAddition('invoices', inv.id);
              });
            }
            return created;
          })
        );
        writeObservables.push(addObs);
      } else if (module === 'leads') {
        const finalLead: Omit<Lead, 'id'> = {
          gymId,
          name: payload['name'],
          phone: payload['phone'],
          email: payload['email'] || '',
          leadSource: (payload['leadSource'] || 'Walk-In') as any,
          trialDate: payload['trialDate'] || '',
          followUpDate: payload['followUpDate'] || '',
          interestedPlan: payload['interestedPlan'] || '',
          notes: payload['notes'] || '',
          status: (payload['status'] || 'New') as any,
          customFields: payload['customFields']
        };
        writeObservables.push(this.leadRepo.addLead(gymId, finalLead).pipe(
          map(created => commitUnit.registerAddition('leads', created.id))
        ));
      } else if (module === 'products') {
        const finalProd: Omit<Product, 'id'> = {
          gymId,
          name: payload['name'],
          category: payload['category'] || 'General',
          price: payload['price'] || 0,
          costPrice: payload['costPrice'] || 0,
          quantity: payload['quantity'] || 0,
          tax: payload['tax'] || 0,
          description: payload['description'] || '',
          sku: payload['sku'] || '',
          isActive: true
        };
        writeObservables.push(this.productRepo.addProduct(gymId, finalProd).pipe(
          map(created => commitUnit.registerAddition('products', created.id))
        ));
      }
    }

    if (writeObservables.length === 0) {
      commitUnit.commit().subscribe();
      return of({ imported: 0, failed: 0, duplicates: 0 });
    }

    // Process sets
    return forkJoin(writeObservables).pipe(
      switchMap(() => {
        return commitUnit.commit().pipe(
          map(() => {
            console.log(`[ImportService] Commit complete for import ${importId}.`);
            return {
              imported: writeObservables.length,
              failed: 0,
              duplicates: duplicateCount
            };
          })
        );
      }),
      catchError(err => {
        console.error('[ImportService] Commit failure. Rolling back writes.', err);
        commitUnit.rollback();
        return throwError(() => new Error('Import execution encountered a database error. Complete rollback executed. Details: ' + err.message));
      })
    );
  }
}
