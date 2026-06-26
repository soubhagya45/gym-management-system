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
import { UserRole } from '../../core/enums/roles.enum';

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
  BACKGROUND_JOB_PROVIDER_TOKEN, IBackgroundJobProvider,
  PERSONAL_TRAINING_REPOSITORY_TOKEN, IPersonalTrainingRepository
} from '../../core/interfaces/repository.interfaces';
import { FILE_STORAGE_REPOSITORY_TOKEN, IFileStorageRepository } from '../../core/interfaces/file-storage-repository.interface';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { UserContextService } from '../../core/services/user-context.service';
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
    @Inject(PERSONAL_TRAINING_REPOSITORY_TOKEN) private ptRepo: IPersonalTrainingRepository,
    private tenantContext: TenantContextService,
    private userContext: UserContextService,
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
      case 'expenses':
        headers = ['Title', 'Category', 'Amount', 'Date', 'Notes', 'CreatedBy'];
        sampleData = [['Downtown Rent', 'Rent', '25000', '2026-06-01', 'Monthly building rent payment', 'owner']];
        break;
      case 'collections':
        headers = ['Receipt Number', 'Member Email or Phone', 'PlanName', 'Amount', 'PaymentMethod', 'Date', 'CollectedBy'];
        sampleData = [['REC-2026-001', 'john@example.com', 'Essential Monthly', '1770', 'UPI', '2026-06-01', 'system']];
        break;
      case 'payments':
        headers = ['Member Email or Phone', 'PlanName', 'Amount', 'PaidAmount', 'DueAmount', 'DueDate', 'Date', 'Status', 'PaymentMethod', 'SalespersonEmailOrPhone', 'Type', 'InvoiceNumber'];
        sampleData = [['john@example.com', 'Essential Monthly', '1770', '1770', '0', '2026-06-01', '2026-06-01', 'paid', 'UPI', 'rahul.sharma@apexfit.com', 'membership', 'INV-2026-001']];
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
      this.memberRepo.getMembers(gymId),
      this.leadRepo.getLeads(gymId),
      this.employeeRepo.getEmployees(gymId),
      this.trainerRepo.getTrainers(gymId),
      this.planRepo.getPlans(gymId),
      this.ptRepo.getPTPlans(gymId),
      this.productRepo.getProducts(gymId),
      this.financeRepo.getInvoices(gymId),
      this.financeRepo.getCollections(gymId),
      this.paymentRepo.getPayments(gymId),
      this.financeRepo.getExpenses(gymId)
    ]).pipe(
      switchMap(([members, leads, employees, trainers, plans, ptPlans, products, invoices, collections, payments, expenses]) => {
        const snapshot = {
          timestamp: new Date().toISOString(),
          gymId,
          data: {
            members,
            leads,
            employees,
            trainers,
            plans,
            ptPlans,
            products,
            invoices,
            collections,
            payments,
            expenses
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

  /**
   * WARNING: Out of Memory (OOM) risk in browser environments.
   * restoreDisasterSnapshot loads entire collections into memory simultaneously via combineLatest
   * and performs batch creation of all snapshot entities. At enterprise scale (>1,000 records
   * per collection), browser tab memory limit (~1.5GB) can be exceeded.
   * Recommended long-term fix: Migrate to server-side streaming restore using Cloud Functions or
   * Paginated cursor-based sequential chunk loading.
   */
  restoreDisasterSnapshot(gymId: string, snapshotUrl: string): Observable<void> {
    if (!snapshotUrl) {
      return throwError(() => new Error('Disaster Recovery restoration aborted: Snapshot URL is empty.'));
    }
    if (this.userContext.getGymId() !== gymId) {
      return throwError(() => new Error('Access denied: Unauthorized gym context for snapshot restoration.'));
    }
    if (!this.userContext.hasPermission('import:rollback')) {
      return throwError(() => new Error('Access denied: Insufficient permission to perform restoration.'));
    }

    console.log(`[DisasterRecovery] Downloading snapshot from: ${snapshotUrl}`);
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
              subscriber.error(new Error('JSON parsing of snapshot file failed.'));
            }
          };
          reader.onerror = () => subscriber.error(new Error('Reading downloaded snapshot file failed.'));
          reader.readAsText(blob);
        });
      }),
      switchMap((snapshot: any) => {
        if (!snapshot || !snapshot.data) {
          return throwError(() => new Error('Invalid snapshot structure: missing data block.'));
        }

        const data = snapshot.data;
        const commitUnit = this.unitOfWork;
        commitUnit.begin();

        console.log(`[DisasterRecovery] Initiating restoration logic for gym: ${gymId}`);

        return combineLatest([
          this.memberRepo.getMembers(gymId).pipe(catchError(() => of([]))),
          this.leadRepo.getLeads(gymId).pipe(catchError(() => of([]))),
          this.employeeRepo.getEmployees(gymId).pipe(catchError(() => of([]))),
          this.trainerRepo.getTrainers(gymId).pipe(catchError(() => of([]))),
          this.planRepo.getPlans(gymId).pipe(catchError(() => of([]))),
          this.ptRepo.getPTPlans(gymId).pipe(catchError(() => of([]))),
          this.productRepo.getProducts(gymId).pipe(catchError(() => of([]))),
          this.financeRepo.getInvoices(gymId).pipe(catchError(() => of([]))),
          this.financeRepo.getCollections(gymId).pipe(catchError(() => of([]))),
          this.paymentRepo.getPayments(gymId).pipe(catchError(() => of([]))),
          this.financeRepo.getExpenses(gymId).pipe(catchError(() => of([])))
        ]).pipe(
          switchMap(([members, leads, employees, trainers, plans, ptPlans, products, invoices, collections, payments, expenses]) => {
            const addOps: Observable<any>[] = [];
            
            const snapshotMembers = data.members || [];
            const snapshotLeads = data.leads || [];
            const snapshotEmployees = data.employees || [];
            const snapshotTrainers = data.trainers || [];
            const snapshotPlans = data.plans || [];
            const snapshotPtPlans = data.ptPlans || [];
            const snapshotProducts = data.products || [];
            const snapshotInvoices = data.invoices || [];
            const snapshotCollections = data.collections || [];
            const snapshotPayments = data.payments || [];
            const snapshotExpenses = data.expenses || [];

            // 1. Queue additions/overwrites first
            snapshotMembers.forEach((m: any) => addOps.push(this.memberRepo.addMember(gymId, m).pipe(
              map(res => commitUnit.registerAddition('members', res.id))
            )));
            snapshotLeads.forEach((l: any) => addOps.push(this.leadRepo.addLead(gymId, l).pipe(
              map(res => commitUnit.registerAddition('leads', res.id))
            )));
            snapshotEmployees.forEach((e: any) => addOps.push(this.employeeRepo.addEmployee(gymId, e).pipe(
              map(res => commitUnit.registerAddition('employees', res.id))
            )));
            snapshotTrainers.forEach((t: any) => addOps.push(this.trainerRepo.addTrainer(gymId, t).pipe(
              map(res => commitUnit.registerAddition('trainers', res.id))
            )));
            snapshotPlans.forEach((p: any) => addOps.push(this.planRepo.addPlan(gymId, p).pipe(
              map(res => commitUnit.registerAddition('membershipPlans', res.id))
            )));
            snapshotPtPlans.forEach((p: any) => addOps.push(this.ptRepo.addPTPlan(gymId, p).pipe(
              map(res => commitUnit.registerAddition('ptPlans', res.id))
            )));
            snapshotProducts.forEach((pr: any) => addOps.push(this.productRepo.addProduct(gymId, pr).pipe(
              map(res => commitUnit.registerAddition('products', res.id))
            )));
            snapshotInvoices.forEach((inv: any) => addOps.push(this.financeRepo.addInvoice(gymId, inv).pipe(
              map(res => commitUnit.registerAddition('invoices', res.id))
            )));
            snapshotCollections.forEach((col: any) => addOps.push(this.financeRepo.addCollection(gymId, col).pipe(
              map(res => commitUnit.registerAddition('collections', res.id))
            )));
            snapshotPayments.forEach((p: any) => addOps.push(this.paymentRepo.addPayment(gymId, p).pipe(
              map(res => commitUnit.registerAddition('payments', res.id))
            )));
            snapshotExpenses.forEach((exp: any) => addOps.push(this.financeRepo.addExpense(gymId, exp).pipe(
              map(res => commitUnit.registerAddition('expenses', res.id))
            )));

            const runAdds = addOps.length > 0 ? forkJoin(addOps) : of([]);

            return runAdds.pipe(
              switchMap(() => {
                // 2. Queue deletes of orphans only after successful writes
                const deleteOps: Observable<void>[] = [];
                
                const snapshotMemberIds = new Set(snapshotMembers.map((sm: any) => sm.id));
                const snapshotLeadIds = new Set(snapshotLeads.map((sl: any) => sl.id));
                const snapshotEmployeeIds = new Set(snapshotEmployees.map((se: any) => se.id));
                const snapshotTrainerIds = new Set(snapshotTrainers.map((st: any) => st.id));
                const snapshotPlanIds = new Set(snapshotPlans.map((sp: any) => sp.id));
                const snapshotPtPlanIds = new Set(snapshotPtPlans.map((spt: any) => spt.id));
                const snapshotProductIds = new Set(snapshotProducts.map((sp: any) => sp.id));
                const snapshotInvoiceIds = new Set(snapshotInvoices.map((sinv: any) => sinv.id));
                const snapshotCollectionIds = new Set(snapshotCollections.map((sc: any) => sc.id));
                const snapshotPaymentIds = new Set(snapshotPayments.map((sp: any) => sp.id));
                const snapshotExpenseIds = new Set(snapshotExpenses.map((se: any) => se.id));

                members.filter(m => !snapshotMemberIds.has(m.id)).forEach(m => deleteOps.push(this.memberRepo.deleteMember(gymId, m.id).pipe(catchError(() => of(undefined)))));
                leads.filter(l => !snapshotLeadIds.has(l.id)).forEach(l => deleteOps.push(this.leadRepo.deleteLead(gymId, l.id).pipe(catchError(() => of(undefined)))));
                employees.filter(e => !snapshotEmployeeIds.has(e.id)).forEach(e => deleteOps.push(this.employeeRepo.deleteEmployee(gymId, e.id).pipe(catchError(() => of(undefined)))));
                trainers.filter(t => !snapshotTrainerIds.has(t.id)).forEach(t => deleteOps.push(this.trainerRepo.deleteTrainer(gymId, t.id).pipe(catchError(() => of(undefined)))));
                plans.filter(p => !snapshotPlanIds.has(p.id)).forEach(p => deleteOps.push(this.planRepo.deletePlan(gymId, p.id).pipe(catchError(() => of(undefined)))));
                ptPlans.filter(p => !snapshotPtPlanIds.has(p.id)).forEach(p => deleteOps.push(this.ptRepo.deletePTPlan(gymId, p.id).pipe(catchError(() => of(undefined)))));
                products.filter(pr => !snapshotProductIds.has(pr.id)).forEach(pr => deleteOps.push(this.productRepo.deleteProduct(gymId, pr.id).pipe(catchError(() => of(undefined)))));
                invoices.filter(inv => !snapshotInvoiceIds.has(inv.id)).forEach(inv => deleteOps.push(this.financeRepo.deleteInvoice(gymId, inv.id).pipe(catchError(() => of(undefined)))));
                collections.filter(col => !snapshotCollectionIds.has(col.id)).forEach(col => deleteOps.push(this.financeRepo.deleteCollection(gymId, col.id).pipe(catchError(() => of(undefined)))));
                payments.filter(p => !snapshotPaymentIds.has(p.id)).forEach(p => deleteOps.push(this.paymentRepo.deletePayment(gymId, p.id).pipe(catchError(() => of(undefined)))));
                expenses.filter(exp => !snapshotExpenseIds.has(exp.id)).forEach(exp => deleteOps.push(this.financeRepo.deleteExpense(gymId, exp.id).pipe(catchError(() => of(undefined)))));

                const runDeletes = deleteOps.length > 0 ? forkJoin(deleteOps) : of([]);
                return runDeletes.pipe(
                  switchMap(() => commitUnit.commit()),
                  map(() => undefined)
                );
              }),
              catchError(err => {
                // If anything fails, perform rollback of UoW and await it before propagating error
                console.error('[DisasterRecovery] Error occurred during restore operations. Triggering rollback...', err);
                return commitUnit.rollback().pipe(
                  switchMap(() => throwError(() => err)),
                  catchError(rollbackErr => {
                    console.error('[DisasterRecovery] Critical failure: Rollback also failed.', rollbackErr);
                    return throwError(() => new Error(`Disaster Recovery restoration failed, and rollback also failed: ${rollbackErr.message}. Original error: ${err.message}`));
                  })
                );
              })
            );
          })
        );
      }),
      catchError(err => {
        console.error('[DisasterRecovery] Disaster recovery restoration process failed:', err);
        return throwError(() => new Error('Disaster Recovery restoration failed: ' + err.message));
      })
    );
  }

  rollbackImport(gymId: string, history: ImportHistory): Observable<void> {
    if (!this.userContext.hasPermission('import:rollback')) {
      return throwError(() => new Error('Access denied: Insufficient permission to perform rollback.'));
    }
    if (!history.snapshotUrl) {
      return throwError(() => new Error('Cannot rollback: Snapshot not available.'));
    }

    return this.restoreDisasterSnapshot(gymId, history.snapshotUrl).pipe(
      switchMap(() => {
        const userId = this.userContext.getUserId() || 'system';
        const userName = this.userContext.getDisplayName() || 'Active Owner';
        const role = this.userContext.getRole() || 'user';
        
        const updated: ImportHistory = {
          ...history,
          status: 'rolled_back',
          rolledBackBy: userId,
          rolledBackByName: userName,
          rolledBackAt: new Date().toISOString()
        };

        const auditLog: Omit<AuditLog, 'id'> = {
          gymId,
          branchId: this.userContext.getBranchId() || '',
          userId,
          userName,
          role,
          action: 'Rollback Excel Import',
          entityType: 'importHistory',
          entityId: history.id || '',
          entityName: history.fileName,
          timestamp: new Date().toISOString()
        };

        return combineLatest([
          this.historyRepo.updateHistory(gymId, updated),
          this.auditLogRepo.addAuditLog(gymId, auditLog)
        ]).pipe(
          map(() => undefined)
        );
      })
    );
  }

  runBackgroundImport(
    gymId: string,
    jobId: string,
    module: string,
    fileName: string,
    fileHash: string,
    stagingRecords: StagingRecord[]
  ): Observable<void> {
    return this.createDisasterRecoverySnapshot(gymId).pipe(
      switchMap((snapshotUrl: string) => {
        const jobState = {
          jobId,
          gymId,
          module,
          fileName,
          fileHash,
          snapshotUrl,
          stagingRecords,
          processed: 0,
          failed: 0,
          duplicates: 0,
          status: 'running'
        };
        localStorage.setItem(`active_import_job_${jobId}`, JSON.stringify(jobState));

        return new Observable<void>((subscriber) => {
          const BATCH_SIZE = 50;
          const savedStateStr = localStorage.getItem(`active_import_job_${jobId}`);
          let savedState: any = null;
          try {
            if (savedStateStr) savedState = JSON.parse(savedStateStr);
          } catch (e) {}

          let currentIdx = savedState ? savedState.processed : 0;
          let failedCount = savedState ? savedState.failed : 0;
          let duplicateCount = savedState ? savedState.duplicates : 0;

          const processNextBatch = () => {
            const job = this.jobProvider.getJob(jobId);
            
            if (!job || job.status === 'cancelled') {
              console.log(`[BackgroundImport] Job ${jobId} cancelled. Initiating rollback.`);
              this.restoreDisasterSnapshot(gymId, snapshotUrl).subscribe({
                next: () => {
                  localStorage.removeItem(`active_import_job_${jobId}`);
                  subscriber.error(new Error('Import cancelled by user. Reverted to snapshot.'));
                },
                error: (rollbackErr) => {
                  localStorage.removeItem(`active_import_job_${jobId}`);
                  subscriber.error(new Error('Import cancelled but rollback encountered error: ' + rollbackErr.message));
                }
              });
              return;
            }

            if (job.status === 'paused') {
              setTimeout(processNextBatch, 1000);
              return;
            }

            if (currentIdx >= stagingRecords.length) {
              const historyPayload: Omit<ImportHistory, 'id'> = {
                gymId,
                importedBy: this.userContext.getUserId() || 'system',
                importedByName: this.userContext.getDisplayName() || 'Active Owner',
                date: new Date().toISOString(),
                fileName,
                module: module as any,
                recordsImported: stagingRecords.length - failedCount - duplicateCount,
                recordsFailed: failedCount,
                recordsDuplicates: duplicateCount,
                duration: Date.now() - job.progress.startTime,
                fileHash,
                snapshotUrl,
                status: 'completed'
              };

              const auditLog: Omit<AuditLog, 'id'> = {
                gymId,
                branchId: this.userContext.getBranchId() || '',
                userId: this.userContext.getUserId() || 'system',
                userName: this.userContext.getDisplayName() || 'Active Owner',
                role: this.userContext.getRole() || 'owner',
                action: 'Execute Excel Import Batch',
                entityType: 'importHistory',
                entityId: jobId,
                entityName: fileName,
                timestamp: new Date().toISOString()
              };

              combineLatest([
                this.historyRepo.addHistory(gymId, historyPayload),
                this.auditLogRepo.addAuditLog(gymId, auditLog)
              ]).subscribe({
                next: () => {
                  localStorage.removeItem(`active_import_job_${jobId}`);
                  this.jobProvider.updateProgress(jobId, stagingRecords.length, failedCount, duplicateCount);
                  subscriber.next();
                  subscriber.complete();
                },
                error: (dbErr) => {
                  subscriber.error(dbErr);
                }
              });
              return;
            }

            const batch = stagingRecords.slice(currentIdx, currentIdx + BATCH_SIZE);
            
            this.commitImport(gymId, batch).subscribe({
              next: (result) => {
                currentIdx += batch.length;
                failedCount += result.failed;
                duplicateCount += result.duplicates;

                this.jobProvider.updateProgress(jobId, currentIdx, failedCount, duplicateCount);

                const updatedState = {
                  ...jobState,
                  processed: currentIdx,
                  failed: failedCount,
                  duplicates: duplicateCount
                };
                localStorage.setItem(`active_import_job_${jobId}`, JSON.stringify(updatedState));

                setTimeout(processNextBatch, 100);
              },
              error: (err) => {
                console.error(`[BackgroundImport] Batch execution failed. Triggering rollback.`, err);
                this.jobProvider.markFailed(jobId, err.message);
                
                this.restoreDisasterSnapshot(gymId, snapshotUrl).pipe(
                  switchMap(() => {
                    localStorage.removeItem(`active_import_job_${jobId}`);
                    const failedHistory: Omit<ImportHistory, 'id'> = {
                      gymId,
                      importedBy: this.userContext.getUserId() || 'system',
                      importedByName: this.userContext.getDisplayName() || 'Active Owner',
                      date: new Date().toISOString(),
                      fileName,
                      module: module as any,
                      recordsImported: 0,
                      recordsFailed: stagingRecords.length,
                      recordsDuplicates: 0,
                      duration: Date.now() - job.progress.startTime,
                      fileHash,
                      snapshotUrl,
                      status: 'failed'
                    };
                    return this.historyRepo.addHistory(gymId, failedHistory);
                  }),
                  catchError(rollbackErr => of(null).pipe(map(() => {
                    localStorage.removeItem(`active_import_job_${jobId}`);
                    subscriber.error(new Error('Import failed and rollback also failed: ' + rollbackErr.message));
                  })))
                ).subscribe({
                  next: () => {
                    subscriber.error(new Error('Import failed: ' + err.message + '. Rollback executed.'));
                  },
                  error: () => {} // already handled by catchError above
                });
              }
            });
          };

          processNextBatch();
        });
      }),
      catchError((err) => {
        this.jobProvider.markFailed(jobId, err.message);
        return throwError(() => err);
      })
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
      this.memberRepo.getMembers(gymId).pipe(catchError(() => of([]))),
      this.employeeRepo.getEmployees(gymId).pipe(catchError(() => of([]))),
      this.leadRepo.getLeads(gymId).pipe(catchError(() => of([])))
    ]).pipe(
      map(([plans, trainers, members, employees, leads]) => {
        for (const record of stagingRecords) {
          const payload = record.mappedData;
          if (record.module === 'members') {
            const dup = members.find(m => 
              (payload['email'] && m.email === payload['email']) || 
              (payload['phone'] && m.phone === payload['phone'])
            );
            if (dup) {
              record.duplicateStatus = 'duplicate_skip';
              record.mappedData['id'] = dup.id;
            }
          } else if (record.module === 'leads') {
            const dup = leads.find(l => 
              (payload['email'] && l.email === payload['email']) || 
              (payload['phone'] && l.phone === payload['phone'])
            );
            if (dup) {
              record.duplicateStatus = 'duplicate_skip';
              record.mappedData['id'] = dup.id;
            }
          } else if (record.module === 'trainers') {
            const dup = trainers.find(t => 
              (payload['email'] && t.email === payload['email']) || 
              (payload['phone'] && t.phone === payload['phone'])
            );
            if (dup) {
              record.duplicateStatus = 'duplicate_skip';
              record.mappedData['id'] = dup.id;
            }
          } else if (record.module === 'employees') {
            const dup = employees.find(e => 
              (payload['email'] && e.email === payload['email']) || 
              (payload['phone'] && e.phone === payload['phone'])
            );
            if (dup) {
              record.duplicateStatus = 'duplicate_skip';
              record.mappedData['id'] = dup.id;
            }
          } else if (record.module === 'membership-plans') {
            const dup = plans.find(p => 
              p.name.trim().toLowerCase() === (payload['name'] || '').trim().toLowerCase()
            );
            if (dup) {
              record.duplicateStatus = 'duplicate_skip';
              record.mappedData['id'] = dup.id;
            }
          }
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
    module: 'members' | 'leads' | 'employees' | 'trainers' | 'membership-plans' | 'pt-plans' | 'products' | 'invoices' | 'outstanding-dues' | 'expenses' | 'collections' | 'payments'
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
      } else if (module === 'expenses') {
        if (!mappedData['title']) errors.push({ field: 'title', message: 'Title is required.', severity: 'error' });
        if (!mappedData['category']) errors.push({ field: 'category', message: 'Category is required.', severity: 'error' });
        if (mappedData['amount'] === undefined || mappedData['amount'] === null) {
          errors.push({ field: 'amount', message: 'Amount is required.', severity: 'error' });
        }
        if (!mappedData['date']) errors.push({ field: 'date', message: 'Date is required.', severity: 'error' });
      } else if (module === 'collections') {
        if (!mappedData['receiptNo']) errors.push({ field: 'receiptNo', message: 'Receipt number is required.', severity: 'error' });
        if (mappedData['amount'] === undefined || mappedData['amount'] === null) {
          errors.push({ field: 'amount', message: 'Amount is required.', severity: 'error' });
        }
        if (!mappedData['date']) errors.push({ field: 'date', message: 'Date is required.', severity: 'error' });
        
        const refMember = row['MemberPhoneOrEmail'] || row['Member Email or Phone'] || row['Member'] || row['MemberId'] || row['Member Name'];
        if (refMember) {
          relations.push({
            field: 'memberId',
            entityType: 'Member',
            referencedName: String(refMember),
            status: 'unresolved'
          });
        }
        const refPlan = row['MembershipPlan'] || row['PlanName'] || row['Plan'] || row['Membership Plan'];
        if (refPlan) {
          relations.push({
            field: 'membershipPlanId',
            entityType: 'MembershipPlan',
            referencedName: String(refPlan),
            status: 'unresolved'
          });
        }
      } else if (module === 'payments') {
        if (mappedData['amount'] === undefined || mappedData['amount'] === null) {
          errors.push({ field: 'amount', message: 'Amount is required.', severity: 'error' });
        }
        if (mappedData['paidAmount'] === undefined || mappedData['paidAmount'] === null) {
          errors.push({ field: 'paidAmount', message: 'Paid Amount is required.', severity: 'error' });
        }
        if (!mappedData['date']) errors.push({ field: 'date', message: 'Date is required.', severity: 'error' });
        
        const refMember = row['MemberPhoneOrEmail'] || row['Member Email or Phone'] || row['Member'] || row['MemberId'] || row['Member Name'];
        if (refMember) {
          relations.push({
            field: 'memberId',
            entityType: 'Member',
            referencedName: String(refMember),
            status: 'unresolved'
          });
        }
        const refPlan = row['MembershipPlan'] || row['PlanName'] || row['Plan'] || row['Membership Plan'];
        if (refPlan) {
          relations.push({
            field: 'membershipPlanId',
            entityType: 'MembershipPlan',
            referencedName: String(refPlan),
            status: 'unresolved'
          });
        }
      } else if (module === 'membership-plans') {
        if (!mappedData['name']) errors.push({ field: 'name', message: 'Plan Name is required.', severity: 'error' });
        if (mappedData['price'] === undefined || mappedData['price'] === null) {
          errors.push({ field: 'price', message: 'Price is required.', severity: 'error' });
        }
      } else if (module === 'pt-plans') {
        if (!mappedData['name']) errors.push({ field: 'name', message: 'PT Plan Name is required.', severity: 'error' });
        if (mappedData['price'] === undefined || mappedData['price'] === null) {
          errors.push({ field: 'price', message: 'Price is required.', severity: 'error' });
        }
      } else if (module === 'trainers') {
        if (!mappedData['name']) errors.push({ field: 'name', message: 'Trainer Name is required.', severity: 'error' });
        if (!mappedData['specialty']) errors.push({ field: 'specialty', message: 'Specialty is required.', severity: 'error' });
      } else if (module === 'employees') {
        if (!mappedData['fullName']) errors.push({ field: 'fullName', message: 'Full Name is required.', severity: 'error' });
        if (!mappedData['phone']) errors.push({ field: 'phone', message: 'Phone is required.', severity: 'error' });
        if (!mappedData['email']) errors.push({ field: 'email', message: 'Email is required.', severity: 'error' });
        if (!mappedData['role']) errors.push({ field: 'role', message: 'Role is required.', severity: 'error' });
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
      if (record.duplicateStatus === 'duplicate_skip') {
        duplicateCount++;
        continue;
      }
      
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
          switchMap(created => {
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
              return this.financeRepo.addInvoice(gymId, invoicePayload).pipe(
                map(inv => {
                  commitUnit.registerAddition('invoices', inv.id);
                  return created;
                })
              );
            }
            return of(created);
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
      } else if (module === 'invoices') {
        const finalInvoice: Omit<Invoice, 'id'> = {
          gymId,
          branchId: payload['branchId'] || '',
          invoiceNumber: payload['invoiceNumber'],
          memberId: payload['memberId'] || 'unknown-member',
          memberName: payload['memberName'] || 'Unknown Member',
          membershipPlan: payload['membershipPlan'] || payload['planName'] || 'General',
          amount: parseFloat(payload['amount']) || 0,
          discount: parseFloat(payload['discount']) || 0,
          finalAmount: parseFloat(payload['finalAmount']) || parseFloat(payload['amount']) || 0,
          paymentMethod: payload['paymentMethod'] || 'Cash',
          invoiceDate: payload['invoiceDate'] || new Date().toISOString().split('T')[0],
          status: (payload['status'] || 'paid') as any,
          amountPaid: parseFloat(payload['amountPaid']) || 0,
          pendingAmount: parseFloat(payload['pendingAmount']) || 0,
          dueDate: payload['dueDate'] || '',
          salespersonId: payload['salespersonId'] || '',
          salespersonName: payload['salespersonName'] || ''
        };
        writeObservables.push(this.financeRepo.addInvoice(gymId, finalInvoice).pipe(
          map(created => commitUnit.registerAddition('invoices', created.id))
        ));
      } else if (module === 'expenses') {
        const finalExpense: Omit<Expense, 'id'> = {
          gymId,
          title: payload['title'] || 'Legacy Expense',
          category: (payload['category'] || 'Miscellaneous') as any,
          amount: parseFloat(payload['amount']) || 0,
          date: payload['date'] || new Date().toISOString().split('T')[0],
          notes: payload['notes'] || '',
          createdBy: payload['createdBy'] || 'system'
        };
        writeObservables.push(this.financeRepo.addExpense(gymId, finalExpense).pipe(
          map(created => commitUnit.registerAddition('expenses', created.id))
        ));
      } else if (module === 'collections') {
        const finalCollection: Omit<Collection, 'id'> = {
          gymId,
          branchId: payload['branchId'] || '',
          receiptNo: payload['receiptNo'] || 'REC-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
          memberId: payload['memberId'] || 'unknown-member',
          memberName: payload['memberName'] || 'Unknown Member',
          membershipPlan: payload['membershipPlan'] || payload['planName'] || 'General',
          amount: parseFloat(payload['amount']) || 0,
          paymentMethod: payload['paymentMethod'] || 'Cash',
          date: payload['date'] || new Date().toISOString().split('T')[0],
          collectedBy: payload['collectedBy'] || 'system'
        };
        writeObservables.push(this.financeRepo.addCollection(gymId, finalCollection).pipe(
          map(created => commitUnit.registerAddition('collections', created.id))
        ));
      } else if (module === 'payments') {
        const finalPayment: Omit<Payment, 'id'> = {
          gymId,
          branchId: payload['branchId'] || '',
          memberId: payload['memberId'] || 'unknown-member',
          memberName: payload['memberName'] || 'Unknown Member',
          amount: parseFloat(payload['amount']) || 0,
          paidAmount: parseFloat(payload['paidAmount']) || 0,
          dueAmount: parseFloat(payload['dueAmount']) || 0,
          dueDate: payload['dueDate'] || '',
          date: payload['date'] || new Date().toISOString().split('T')[0],
          status: (payload['status'] || 'paid') as any,
          planName: payload['planName'] || 'General',
          paymentMethod: payload['paymentMethod'] || 'Cash',
          collectedBy: payload['collectedBy'] || 'system',
          salespersonId: payload['salespersonId'] || '',
          salespersonName: payload['salespersonName'] || '',
          type: (payload['type'] || 'membership') as any,
          invoiceId: payload['invoiceId'] || ''
        };
        writeObservables.push(this.paymentRepo.addPayment(gymId, finalPayment).pipe(
          map(created => commitUnit.registerAddition('payments', created.id))
        ));
      } else if (module === 'membership-plans') {
        const finalPlan: Omit<MembershipPlan, 'id' | 'activeMembersCount'> = {
          gymId,
          name: payload['name'],
          type: 'membership',
          durationMonths: parseInt(payload['durationMonths'] || payload['duration']) || 1,
          duration: parseInt(payload['duration']) || 1,
          durationUnit: (payload['durationUnit'] || 'months') as any,
          price: parseFloat(payload['price']) || 0,
          tax: parseFloat(payload['tax']) || 0,
          description: payload['description'] || '',
          features: payload['features'] ? (Array.isArray(payload['features']) ? payload['features'] : [payload['features']]) : [],
          isActive: payload['isActive'] !== undefined ? payload['isActive'] : true
        };
        writeObservables.push(this.planRepo.addPlan(gymId, finalPlan).pipe(
          map(created => commitUnit.registerAddition('membershipPlans', created.id))
        ));
      } else if (module === 'pt-plans') {
        const finalPTPlan: Omit<PTPlan, 'id'> = {
          gymId,
          branchId: payload['branchId'] || '',
          name: payload['name'],
          type: 'pt',
          price: parseFloat(payload['price']) || 0,
          tax: parseFloat(payload['tax']) || 0,
          numberOfSessions: parseInt(payload['numberOfSessions']) || 10,
          duration: parseInt(payload['duration']) || 1,
          durationUnit: (payload['durationUnit'] || 'months') as any,
          description: payload['description'] || '',
          isActive: payload['isActive'] !== undefined ? payload['isActive'] : true
        };
        writeObservables.push(this.ptRepo.addPTPlan(gymId, finalPTPlan).pipe(
          map(created => commitUnit.registerAddition('ptPlans', created.id))
        ));
      } else if (module === 'trainers') {
        const finalTrainer: Omit<Trainer, 'id' | 'membersCount'> = {
          gymId,
          branchId: payload['branchId'] || '',
          name: payload['name'],
          specialty: payload['specialty'] || 'General Training',
          rating: parseFloat(payload['rating']) || 5,
          avatarUrl: payload['avatarUrl'] || '',
          status: (payload['status'] || 'active') as any,
          email: payload['email'] || '',
          phone: payload['phone'] || ''
        };
        writeObservables.push(this.trainerRepo.addTrainer(gymId, finalTrainer).pipe(
          map(created => commitUnit.registerAddition('trainers', created.id))
        ));
      } else if (module === 'employees') {
        const finalEmp: Omit<Employee, 'id'> = {
          gymId,
          branchId: payload['branchId'] || '',
          fullName: payload['fullName'] || payload['name'] || '',
          phone: payload['phone'] || '',
          email: payload['email'] || '',
          gender: payload['gender'] || 'Male',
          dob: payload['dob'] || '1995-01-01',
          address: payload['address'] || '',
          role: (payload['role'] || UserRole.Staff) as any,
          department: payload['department'] || 'Operations',
          joinDate: payload['joinDate'] || new Date().toISOString().split('T')[0],
          salary: parseFloat(payload['salary']) || 15000,
          shift: payload['shift'] || 'Morning',
          username: payload['username'] || (payload['fullName'] || 'staff').toLowerCase().replace(/\s+/g, '_'),
          accountStatus: (payload['accountStatus'] || 'Active') as any
        };
        writeObservables.push(this.employeeRepo.addEmployee(gymId, finalEmp).pipe(
          map(created => commitUnit.registerAddition('employees', created.id))
        ));
      }
    }

    if (writeObservables.length === 0) {
      return commitUnit.commit().pipe(
        map(() => ({ imported: 0, failed: 0, duplicates: 0 }))
      );
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
        return commitUnit.rollback().pipe(
          switchMap(() => throwError(() => new Error('Import execution encountered a database error. Complete rollback executed. Details: ' + err.message))),
          catchError(rollbackErr => {
            console.error('[ImportService] Rollback also encountered error:', rollbackErr);
            return throwError(() => new Error('Import execution failed, and subsequent rollback also failed: ' + rollbackErr.message + '. Original error: ' + err.message));
          })
        );
      })
    );
  }
}
