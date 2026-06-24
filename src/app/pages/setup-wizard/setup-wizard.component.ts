import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterModule } from '@angular/router';
import { Observable, Subscription, combineLatest, of, BehaviorSubject } from 'rxjs';
import { map, take, switchMap } from 'rxjs/operators';

// Domain and core states
import { ImportService } from '../../domain/import/import.service';
import { GymState } from '../../presentation/state/gym.state';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { FileImportConnector } from '../../domain/import/import-connectors';
import { ImportHistory } from '../../core/models/import-history.entity';
import { StagingRecord, StagingValidationError } from '../../core/models/import-staging.model';
import { Gym, Branch } from '../../core/models/gym.entity';
import { ImportProfile } from '../../core/models/import-profile.entity';
import {
  BACKGROUND_JOB_PROVIDER_TOKEN,
  IBackgroundJobProvider,
  IMPORT_PROFILE_REPOSITORY_TOKEN,
  IImportProfileRepository,
  IMPORT_HISTORY_REPOSITORY_TOKEN,
  IImportHistoryRepository
} from '../../core/interfaces/repository.interfaces';

interface ImportFileQueueItem {
  id: string;
  file: File;
  module: 'members' | 'leads' | 'employees' | 'trainers' | 'membership-plans' | 'pt-plans' | 'products' | 'invoices' | 'outstanding-dues';
  headers: string[];
  mappings: MappedField[];
  rawExcelData: any[];
  stagingRecords: StagingRecord[];
  isDryRunExecuted: boolean;
  qualityScores: any;
  duplicateRate: number;
  estimatedStorage: number;
  estimatedTimeSec: number;
  status: 'pending' | 'parsing' | 'mapped' | 'dry_run_failed' | 'dry_run_success' | 'importing' | 'completed' | 'failed';
  sequenceOrder?: number;
}

interface MappedField {
  excelHeader: string;
  mappedField: string;
  isCustom: boolean;
  customFieldName?: string;
}

@Component({
  selector: 'app-setup-wizard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatProgressBarModule,
    MatTabsModule,
    MatSnackBarModule,
    MatStepperModule,
    MatTooltipModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    RouterModule
  ],
  templateUrl: './setup-wizard.component.html',
  styleUrls: ['./setup-wizard.component.scss']
})
export class SetupWizardComponent implements OnInit, OnDestroy {
  gymForm!: FormGroup;
  branchForm!: FormGroup;
  balanceForm!: FormGroup;

  activeGym: Gym | null = null;
  historyLogs: ImportHistory[] = [];
  profiles: ImportProfile[] = [];
  activeTenantId = '';
  
  // Staging / File mapping variables
  fileQueue: ImportFileQueueItem[] = [];
  selectedQueueItemIndex: number | null = null;
  
  // Mapping Registry / Presets
  selectedProfileId = 'auto';
  customProfileName = '';
  detectedVendor = 'Excel Generic';
  isDuplicateWarning = false;
  existingHashMatch = '';
  
  // Background Job statuses
  jobId: string | null = null;
  jobProgress = 0;
  jobETA = '';
  jobStatus: 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled' = 'idle';
  jobProcessedRows = 0;
  jobTotalRows = 0;
  
  // Loading toggles
  isLoading = false;
  isProcessing = false;
  
  private sub = new Subscription();

  // Target schema fields for mappings (dictionary lookup)
  schemaFieldsMap: Record<string, { name: string; required: boolean }[]> = {
    members: [
      { name: 'name', required: true },
      { name: 'email', required: true },
      { name: 'phone', required: true },
      { name: 'gender', required: false },
      { name: 'age', required: false },
      { name: 'height', required: false },
      { name: 'weight', required: false },
      { name: 'fitnessGoal', required: false },
      { name: 'planName', required: false },
      { name: 'startDate', required: false },
      { name: 'endDate', required: false },
      { name: 'outstandingBalance', required: false }
    ],
    leads: [
      { name: 'name', required: true },
      { name: 'phone', required: true },
      { name: 'email', required: false },
      { name: 'status', required: false },
      { name: 'leadSource', required: false },
      { name: 'interestedPlan', required: false },
      { name: 'leadTemperature', required: false },
      { name: 'notes', required: false }
    ],
    products: [
      { name: 'name', required: true },
      { name: 'category', required: false },
      { name: 'price', required: false },
      { name: 'costPrice', required: false },
      { name: 'quantity', required: false },
      { name: 'tax', required: false },
      { name: 'description', required: false },
      { name: 'sku', required: false }
    ],
    invoices: [
      { name: 'invoiceNumber', required: true },
      { name: 'amount', required: true },
      { name: 'finalAmount', required: true },
      { name: 'invoiceDate', required: false },
      { name: 'dueDate', required: false },
      { name: 'status', required: false }
    ]
  };

  constructor(
    private fb: FormBuilder,
    private importService: ImportService,
    private gymState: GymState,
    private tenantContext: TenantContextService,
    private snackBar: MatSnackBar,
    private router: Router,
    @Inject(BACKGROUND_JOB_PROVIDER_TOKEN) public jobProvider: any,
    @Inject(IMPORT_PROFILE_REPOSITORY_TOKEN) private profileRepo: IImportProfileRepository,
    @Inject(IMPORT_HISTORY_REPOSITORY_TOKEN) private historyRepo: IImportHistoryRepository
  ) {}

  ngOnInit(): void {
    this.initForms();

    this.sub.add(
      this.gymState.activeGym$.subscribe(gym => {
        if (gym) {
          this.activeGym = gym;
          this.activeTenantId = gym.gymId;
          this.loadGymSettings(gym);
          this.loadImportHistoryAndProfiles();
        }
      })
    );

    // Watch background job progress
    this.sub.add(
      this.jobProvider.jobs$.subscribe((jobs: any[]) => {
        if (this.jobId) {
          const currentJob = jobs.find(j => j.id === this.jobId);
          if (currentJob) {
            this.jobProgress = currentJob.progress.percentage;
            this.jobStatus = currentJob.status as any;
            this.jobProcessedRows = currentJob.progress.processed;
            this.jobTotalRows = currentJob.progress.total;
            
            if (this.jobStatus === 'running' && currentJob.progress.processed > 0) {
              this.jobETA = currentJob.progress.eta + 's';
            }

            if (this.jobStatus === 'completed') {
              this.snackBar.open('Background Import Task Completed successfully.', 'Dismiss', { duration: 3000 });
              this.isProcessing = false;
            } else if (this.jobStatus === 'failed' || this.jobStatus === 'cancelled') {
              this.snackBar.open('Background Import failed or was cancelled.', 'Dismiss', { duration: 5000 });
              this.isProcessing = false;
            }
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  get selectedQueueItem(): ImportFileQueueItem | null {
    if (this.selectedQueueItemIndex === null || this.selectedQueueItemIndex < 0 || this.selectedQueueItemIndex >= this.fileQueue.length) {
      return null;
    }
    return this.fileQueue[this.selectedQueueItemIndex];
  }

  get selectedModule(): 'members' | 'leads' | 'employees' | 'trainers' | 'membership-plans' | 'pt-plans' | 'products' | 'invoices' | 'outstanding-dues' {
    return this.selectedQueueItem?.module || 'members';
  }

  set selectedModule(val: 'members' | 'leads' | 'employees' | 'trainers' | 'membership-plans' | 'pt-plans' | 'products' | 'invoices' | 'outstanding-dues') {
    if (this.selectedQueueItem) {
      this.selectedQueueItem.module = val;
      this.runAutoMapping(this.selectedQueueItem);
    }
  }

  get uploadedFile(): File | null {
    return this.selectedQueueItem?.file || null;
  }

  get fileHeaders(): string[] {
    return this.selectedQueueItem?.headers || [];
  }

  get columnMappings(): MappedField[] {
    return this.selectedQueueItem?.mappings || [];
  }

  set columnMappings(val: MappedField[]) {
    if (this.selectedQueueItem) {
      this.selectedQueueItem.mappings = val;
    }
  }

  get stagingRecords(): StagingRecord[] {
    return this.selectedQueueItem?.stagingRecords || [];
  }

  set stagingRecords(val: StagingRecord[]) {
    if (this.selectedQueueItem) {
      this.selectedQueueItem.stagingRecords = val;
    }
  }

  get rawExcelData(): any[] {
    return this.selectedQueueItem?.rawExcelData || [];
  }

  set rawExcelData(val: any[]) {
    if (this.selectedQueueItem) {
      this.selectedQueueItem.rawExcelData = val;
    }
  }

  get isDryRunExecuted(): boolean {
    return this.selectedQueueItem?.isDryRunExecuted || false;
  }

  set isDryRunExecuted(val: boolean) {
    if (this.selectedQueueItem) {
      this.selectedQueueItem.isDryRunExecuted = val;
    }
  }

  get qualityScores() {
    return this.selectedQueueItem?.qualityScores || { completeness: 0, accuracy: 0, duplicates: 0, relationships: 0, overall: 0 };
  }

  set qualityScores(val: any) {
    if (this.selectedQueueItem) {
      this.selectedQueueItem.qualityScores = val;
    }
  }

  get duplicateRate(): number {
    return this.selectedQueueItem?.duplicateRate || 0;
  }

  set duplicateRate(val: number) {
    if (this.selectedQueueItem) {
      this.selectedQueueItem.duplicateRate = val;
    }
  }

  get estimatedStorage(): number {
    return this.selectedQueueItem?.estimatedStorage || 0;
  }

  set estimatedStorage(val: number) {
    if (this.selectedQueueItem) {
      this.selectedQueueItem.estimatedStorage = val;
    }
  }

  get estimatedTimeSec(): number {
    return this.selectedQueueItem?.estimatedTimeSec || 0;
  }

  set estimatedTimeSec(val: number) {
    if (this.selectedQueueItem) {
      this.selectedQueueItem.estimatedTimeSec = val;
    }
  }

  autoDetectModuleByHeaders(headers: string[]): 'members' | 'leads' | 'employees' | 'trainers' | 'membership-plans' | 'pt-plans' | 'products' | 'invoices' | 'outstanding-dues' {
    const hdrs = headers.map(h => h.toLowerCase().trim().replace(/[\s_-]+/g, ''));
    if (hdrs.some(h => h.includes('durationunit') || h.includes('durationmonths') || h.includes('taxrate'))) {
      return 'membership-plans';
    }
    if (hdrs.some(h => h.includes('numberofsessions') || h.includes('sessioncount') || h.includes('ptplan'))) {
      return 'pt-plans';
    }
    if (hdrs.some(h => h.includes('specialty') || h.includes('experience') || h.includes('speciality') || h.includes('trainerstatus'))) {
      return 'trainers';
    }
    if (hdrs.some(h => h.includes('salary') || h.includes('joindate') || h.includes('department') || h.includes('shift'))) {
      return 'employees';
    }
    if (hdrs.some(h => h.includes('leadsource') || h.includes('leadtemperature') || h.includes('interestedplan') || h.includes('followupdate'))) {
      return 'leads';
    }
    if (hdrs.some(h => h.includes('invoicenumber') || h.includes('amountpaid') || h.includes('finalamount') || h.includes('paymentmethod'))) {
      return 'invoices';
    }
    if (hdrs.some(h => h.includes('category') || h.includes('costprice') || h.includes('quantity') || h.includes('sku'))) {
      return 'products';
    }
    if (hdrs.some(h => h.includes('outstandingbalance') || h.includes('pendingamount') || h.includes('dueamount') || h.includes('outstandingdues'))) {
      return 'outstanding-dues';
    }
    return 'members';
  }

  getSequencedQueue(): ImportFileQueueItem[] {
    const dependencyWeights: Record<string, number> = {
      'membership-plans': 1,
      'pt-plans': 1,
      'trainers': 2,
      'employees': 2,
      'leads': 3,
      'members': 4,
      'products': 5,
      'invoices': 6,
      'outstanding-dues': 7
    };

    return [...this.fileQueue].sort((a, b) => {
      const weightA = dependencyWeights[a.module] || 99;
      const weightB = dependencyWeights[b.module] || 99;
      return weightA - weightB;
    });
  }

  getSequencePosition(item: ImportFileQueueItem): number {
    const sorted = this.getSequencedQueue();
    return sorted.findIndex(s => s.id === item.id) + 1;
  }

  removeQueueItem(index: number): void {
    this.fileQueue.splice(index, 1);
    if (this.selectedQueueItemIndex === index) {
      this.selectedQueueItemIndex = this.fileQueue.length > 0 ? 0 : null;
    } else if (this.selectedQueueItemIndex !== null && this.selectedQueueItemIndex > index) {
      this.selectedQueueItemIndex--;
    }
  }

  selectQueueItem(index: number): void {
    this.selectedQueueItemIndex = index;
    this.checkIdempotentHash();
  }

  initForms(): void {
    this.gymForm = this.fb.group({
      gymName: ['', Validators.required],
      ownerName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      city: [''],
      state: [''],
      country: [''],
      gstNumber: [''],
      currency: ['INR', Validators.required]
    });

    this.branchForm = this.fb.group({
      branches: this.fb.array([])
    });

    this.balanceForm = this.fb.group({
      openingBalanceCash: [0, [Validators.required, Validators.min(0)]],
      openingBalanceBank: [0, [Validators.required, Validators.min(0)]]
    });
  }

  get branches(): FormArray {
    return this.branchForm.get('branches') as FormArray;
  }

  addBranch(b?: Branch): void {
    const branchG = this.fb.group({
      id: [b?.id || 'br_' + Math.random().toString(36).substring(2, 7)],
      name: [b?.name || '', Validators.required],
      code: [b?.code || '', Validators.required],
      address: [b?.address || '', Validators.required],
      manager: [b?.manager || '', Validators.required],
      phone: [b?.phone || '', Validators.required]
    });
    this.branches.push(branchG);
  }

  removeBranch(index: number): void {
    this.branches.removeAt(index);
  }

  loadGymSettings(gym: Gym): void {
    this.gymForm.patchValue({
      gymName: gym.gymName,
      ownerName: gym.ownerName,
      email: gym.email,
      phone: gym.phone,
      address: gym.address,
      city: gym.city || '',
      state: gym.state || '',
      country: gym.country || '',
      gstNumber: gym.gstNumber || '',
      currency: gym.paymentSettings?.currency || 'INR'
    });

    this.balanceForm.patchValue({
      openingBalanceCash: gym.openingBalanceCash || 0,
      openingBalanceBank: gym.openingBalanceBank || 0
    });

    this.branches.clear();
    if (gym.branches && gym.branches.length > 0) {
      gym.branches.forEach(b => this.addBranch(b));
    } else {
      this.addBranch({
        id: 'br_main',
        name: 'Main Branch',
        code: 'MAIN',
        address: gym.address || 'Default Address',
        manager: gym.ownerName,
        phone: gym.phone
      });
    }
  }

  loadImportHistoryAndProfiles(): void {
    if (!this.activeTenantId) return;

    this.historyRepo.getHistory(this.activeTenantId).subscribe(history => {
      this.historyLogs = history;
    });

    this.profileRepo.getProfiles(this.activeTenantId).subscribe(profiles => {
      this.profiles = profiles;
    });
  }

  saveStepSettings(): void {
    if (!this.activeGym) return;
    this.isLoading = true;

    const gymData = this.gymForm.value;
    const branchData = this.branchForm.value.branches;
    const balanceData = this.balanceForm.value;

    const updatedGym: Gym = {
      ...this.activeGym,
      gymName: gymData.gymName,
      ownerName: gymData.ownerName,
      email: gymData.email,
      phone: gymData.phone,
      address: gymData.address,
      city: gymData.city,
      state: gymData.state,
      country: gymData.country,
      gstNumber: gymData.gstNumber,
      branches: branchData,
      openingBalanceCash: balanceData.openingBalanceCash,
      openingBalanceBank: balanceData.openingBalanceBank,
      paymentSettings: {
        ...(this.activeGym.paymentSettings || { enableCard: true, enableUPI: true, enableCash: true }),
        currency: gymData.currency
      }
    };

    this.gymState.updateGym(updatedGym).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('Gym settings updated successfully.', 'Dismiss', { duration: 3000 });
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open('Error saving settings: ' + err.message, 'Dismiss', { duration: 3000 });
      }
    });
  }

  downloadBlankTemplate(): void {
    this.importService.downloadTemplate(this.selectedModule);
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      this.parseSpreadsheets(Array.from(files));
    }
  }

  onFileDropped(event: any): void {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      this.parseSpreadsheets(Array.from(files));
    }
  }

  onDragOver(event: any): void {
    event.preventDefault();
  }

  parseSpreadsheets(files: File[]): void {
    this.isLoading = true;
    let loadedCount = 0;

    const processFile = (file: File) => {
      const connector = new FileImportConnector();
      connector.connect({ file }).subscribe({
        next: () => {
          connector.fetchData().subscribe({
            next: (data) => {
              if (data.length > 0) {
                const headers = Object.keys(data[0]);
                const module = this.autoDetectModuleByHeaders(headers);
                
                const item: ImportFileQueueItem = {
                  id: 'q_' + Math.random().toString(36).substring(2, 9),
                  file,
                  module,
                  headers,
                  mappings: [],
                  rawExcelData: data,
                  stagingRecords: [],
                  isDryRunExecuted: false,
                  qualityScores: { completeness: 0, accuracy: 0, duplicates: 0, relationships: 0, overall: 0 },
                  duplicateRate: 0,
                  estimatedStorage: 0,
                  estimatedTimeSec: 0,
                  status: 'pending'
                };

                this.runAutoMapping(item);
                this.fileQueue.push(item);
                
                if (this.selectedQueueItemIndex === null) {
                  this.selectedQueueItemIndex = 0;
                }
              }
              loadedCount++;
              if (loadedCount === files.length) {
                this.isLoading = false;
                this.snackBar.open(`Processed ${files.length} file(s) into queue.`, 'Dismiss', { duration: 3000 });
              }
            },
            error: (err) => {
              loadedCount++;
              if (loadedCount === files.length) this.isLoading = false;
              this.snackBar.open(`Error reading ${file.name}: ${err.message}`, 'Dismiss', { duration: 3000 });
            }
          });
        },
        error: (err) => {
          loadedCount++;
          if (loadedCount === files.length) this.isLoading = false;
          this.snackBar.open(`Failed to parse ${file.name}: ${err.message}`, 'Dismiss', { duration: 3000 });
        }
      });
    };

    files.forEach(file => processFile(file));
  }

  runAutoMapping(targetItem?: ImportFileQueueItem): void {
    const item = targetItem || this.selectedQueueItem;
    if (!item) return;

    const fields = this.schemaFieldsMap[item.module] || this.schemaFieldsMap['members'];
    
    this.detectedVendor = 'Excel Generic';
    const hdrs = item.headers.map(h => h.toLowerCase());
    if (hdrs.includes('customer name') || hdrs.includes('whatsapp number')) {
      this.detectedVendor = 'GymMaster';
    } else if (hdrs.includes('client name') || hdrs.includes('contact number')) {
      this.detectedVendor = 'FitPro';
    } else if (hdrs.includes('admission date') || hdrs.includes('mobile no')) {
      this.detectedVendor = 'GymSoft';
    }

    const { mappings } = this.importService.autoMapHeaders(item.headers, fields);
    
    item.mappings = item.headers.map(header => {
      const target = mappings[header] || 'ignore';
      return {
        excelHeader: header,
        mappedField: target,
        isCustom: target.startsWith('custom:'),
        customFieldName: target.startsWith('custom:') ? target.replace('custom:', '') : ''
      };
    });
  }

  onMappingFieldChange(mapping: MappedField, target: string): void {
    if (target === 'custom') {
      mapping.isCustom = true;
      mapping.customFieldName = mapping.excelHeader.toLowerCase().replace(/\s+/g, '_');
      mapping.mappedField = `custom:${mapping.customFieldName}`;
    } else {
      mapping.isCustom = false;
      mapping.customFieldName = '';
      mapping.mappedField = target;
    }
  }

  onCustomFieldNameChange(mapping: MappedField, event: any): void {
    const name = event.target.value.toLowerCase().replace(/\s+/g, '_').trim();
    mapping.customFieldName = name;
    mapping.mappedField = `custom:${name}`;
  }

  checkIdempotentHash(): void {
    const item = this.selectedQueueItem;
    if (!item || !item.file) return;
    
    const fakeHash = 'hash_' + item.file.size + '_' + item.file.name.length;
    this.existingHashMatch = '';
    this.isDuplicateWarning = false;

    const match = this.historyLogs.find(h => h.fileHash === fakeHash && h.status !== 'rolled_back');
    if (match) {
      this.isDuplicateWarning = true;
      this.existingHashMatch = match.id;
    }
  }

  saveMappingAsProfile(): void {
    const item = this.selectedQueueItem;
    if (!item || !this.customProfileName.trim() || !this.activeTenantId) return;

    const maps: Record<string, string> = {};
    item.mappings.forEach(m => {
      maps[m.excelHeader] = m.mappedField;
    });

    const newProfile: Omit<ImportProfile, 'id'> = {
      gymId: this.activeTenantId,
      name: this.customProfileName.trim(),
      module: item.module,
      mappings: maps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.profileRepo.saveProfile(this.activeTenantId, newProfile).subscribe({
      next: (profile) => {
        this.snackBar.open(`Mapping template "${profile.name}" saved.`, 'Dismiss', { duration: 3000 });
        this.customProfileName = '';
        this.loadImportHistoryAndProfiles();
      }
    });
  }

  applySavedProfile(profileId: string): void {
    const item = this.selectedQueueItem;
    if (!item) return;

    if (profileId === 'auto') {
      this.runAutoMapping(item);
      return;
    }

    const match = this.profiles.find(p => p.id === profileId);
    if (match) {
      item.mappings = item.headers.map(header => {
        const target = match.mappings[header] || 'ignore';
        return {
          excelHeader: header,
          mappedField: target,
          isCustom: target.startsWith('custom:'),
          customFieldName: target.startsWith('custom:') ? target.replace('custom:', '') : ''
        };
      });
      this.snackBar.open(`Applied "${match.name}" mappings.`, 'Dismiss', { duration: 2000 });
    }
  }

  runDryRunValidation(): void {
    if (this.fileQueue.length === 0 || !this.activeTenantId) return;
    
    this.isLoading = true;
    const sequenced = this.getSequencedQueue();
    let currentIdx = 0;

    const executeNextDryRun = () => {
      if (currentIdx >= sequenced.length) {
        this.isLoading = false;
        this.snackBar.open('Sandbox dry run completed for all files in queue.', 'Dismiss', { duration: 3500 });
        return;
      }

      const item = sequenced[currentIdx];
      item.status = 'parsing';

      const mappingsDict: Record<string, string> = {};
      item.mappings.forEach(m => {
        mappingsDict[m.excelHeader] = m.mappedField;
      });

      this.importService.parseToStaging(this.activeTenantId, item.rawExcelData, mappingsDict, item.module).subscribe({
        next: (records) => {
          records.forEach(rec => {
            rec.relations.forEach(rel => {
              if (rel.status === 'unresolved') {
                const targetRef = rel.referencedName.trim().toLowerCase();
                
                for (const qItem of this.fileQueue) {
                  if (qItem.id !== item.id && (
                    (rel.entityType === 'MembershipPlan' && qItem.module === 'membership-plans') ||
                    (rel.entityType === 'Trainer' && qItem.module === 'trainers') ||
                    (rel.entityType === 'Member' && qItem.module === 'members')
                  )) {
                    const match = qItem.rawExcelData.find(row => {
                      const name = String(row['Name'] || row['Full Name'] || row['Plan Name'] || row['Trainer Name'] || '').trim().toLowerCase();
                      return name === targetRef;
                    });
                    if (match) {
                      rel.status = 'resolved';
                      rel.resolvedId = 'staged_match';
                      if (rel.entityType === 'MembershipPlan') {
                        rec.mappedData['planId'] = 'staged_match';
                      } else if (rel.entityType === 'Trainer') {
                        rec.mappedData['trainerId'] = 'staged_match';
                      }
                    }
                  }
                }
              }
            });

            const hasErrors = rec.validationErrors.some(e => e.severity === 'error');
            const hasUnresolved = rec.relations.some(r => r.status === 'unresolved');
            rec.status = (hasErrors || hasUnresolved) ? 'invalid' : 'valid';
          });

          item.stagingRecords = records;
          item.qualityScores = this.importService.calculateQualityScore(records);
          item.isDryRunExecuted = true;
          item.status = 'dry_run_success';

          item.estimatedStorage = Math.ceil(item.rawExcelData.length * 1.25);
          item.estimatedTimeSec = Math.ceil(item.rawExcelData.length * 0.15);
          
          const dupes = records.filter(r => r.duplicateStatus !== 'new').length;
          item.duplicateRate = Math.round((dupes / records.length) * 100);

          currentIdx++;
          executeNextDryRun();
        },
        error: (err) => {
          item.status = 'dry_run_failed';
          this.isLoading = false;
          this.snackBar.open(`Dry Run failed for ${item.file.name}: ${err.message}`, 'Dismiss', { duration: 4000 });
        }
      });
    };

    executeNextDryRun();
  }

  resolveMissingRelation(record: StagingRecord, relationIndex: number, targetOption: string): void {
    const item = this.selectedQueueItem;
    if (!item) return;

    const rel = record.relations[relationIndex];
    if (targetOption === 'skip') {
      rel.status = 'resolved';
      rel.resolvedId = 'skip';
    } else if (targetOption === 'auto_create') {
      rel.status = 'resolved';
      rel.resolvedId = 'auto_create';
    } else {
      rel.status = 'resolved';
      rel.resolvedId = targetOption;
      if (rel.entityType === 'MembershipPlan') {
        record.mappedData['planId'] = targetOption;
      } else if (rel.entityType === 'Trainer') {
        record.mappedData['trainerId'] = targetOption;
      }
    }

    const hasErrors = record.validationErrors.some(e => e.severity === 'error');
    const hasUnresolved = record.relations.some(r => r.status === 'unresolved');
    record.status = (hasErrors || hasUnresolved) ? 'invalid' : 'valid';

    item.qualityScores = this.importService.calculateQualityScore(item.stagingRecords);
  }

  downloadValidationErrorsReport(): void {
    const item = this.selectedQueueItem;
    if (!item || item.stagingRecords.length === 0) return;
    this.importService.generateFailedRowsReport(item.module, item.stagingRecords);
  }

  commitDataImport(): void {
    if (this.fileQueue.length === 0 || !this.activeTenantId) return;

    this.isProcessing = true;
    
    const sequenced = this.getSequencedQueue().filter(item => item.isDryRunExecuted && item.status !== 'dry_run_failed');
    if (sequenced.length === 0) {
      this.isProcessing = false;
      this.snackBar.open('No validated dry run files in queue to commit.', 'Dismiss', { duration: 3000 });
      return;
    }

    let currentIdx = 0;

    const commitNextFile = () => {
      if (currentIdx >= sequenced.length) {
        this.isProcessing = false;
        this.snackBar.open('All queue files committed successfully.', 'Dismiss', { duration: 3000 });
        this.resetQueueState();
        this.loadImportHistoryAndProfiles();
        return;
      }

      const item = sequenced[currentIdx];
      item.status = 'importing';

      if (item.stagingRecords.length > 1000) {
        this.snackBar.open(`${item.file.name} contains >1000 rows. Spawning background task...`, 'Dismiss', { duration: 3000 });
        
        const params = {
          stagingRecords: item.stagingRecords,
          gymId: this.activeTenantId,
          module: item.module,
          fileName: item.file.name,
          fileHash: 'hash_' + item.file.size + '_' + item.file.name.length
        };

        this.jobProvider.schedule('Execute legacy excel batch commit', 'once', { totalRows: item.stagingRecords.length }).subscribe({
          next: (jobId: string) => {
            this.jobId = jobId;
            this.simulateBackgroundJobRun(jobId, params);
            
            const progressSub = this.jobProvider.jobs$.subscribe((jobs: any[]) => {
              const job = jobs.find((j: any) => j.id === jobId);
              if (job && job.status === 'completed') {
                progressSub.unsubscribe();
                item.status = 'completed';
                currentIdx++;
                commitNextFile();
              } else if (job && job.status === 'failed') {
                progressSub.unsubscribe();
                item.status = 'failed';
                this.isProcessing = false;
                this.snackBar.open(`Background Import failed for ${item.file.name}`, 'Dismiss', { duration: 5000 });
              }
            });
          }
        });
      } else {
        this.importService.createDisasterRecoverySnapshot(this.activeTenantId).pipe(
          switchMap((snapshotUrl) => {
            return this.importService.commitImport(this.activeTenantId, item.stagingRecords).pipe(
              switchMap((result) => {
                const hash = 'hash_' + item.file.size + '_' + item.file.name.length;
                const historyPayload: Omit<ImportHistory, 'id'> = {
                  gymId: this.activeTenantId,
                  importedBy: 'system',
                  importedByName: 'Active Owner',
                  date: new Date().toISOString(),
                  fileName: item.file.name,
                  module: item.module,
                  recordsImported: result.imported,
                  recordsFailed: result.failed,
                  recordsDuplicates: result.duplicates,
                  duration: item.estimatedTimeSec * 1000,
                  fileHash: hash,
                  snapshotUrl,
                  status: 'completed'
                };
                return this.historyRepo.addHistory(this.activeTenantId, historyPayload);
              })
            );
          })
        ).subscribe({
          next: () => {
            item.status = 'completed';
            currentIdx++;
            commitNextFile();
          },
          error: (err) => {
            item.status = 'failed';
            this.isProcessing = false;
            this.snackBar.open(`Import failed for ${item.file.name}: ${err.message}`, 'Dismiss', { duration: 5000 });
          }
        });
      }
    };

    commitNextFile();
  }

  simulateBackgroundJobRun(jobId: string, params: any): void {
    let processed = 0;
    const interval = setInterval(() => {
      if (this.jobStatus === 'paused') return;
      if (this.jobStatus === 'cancelled' || this.jobStatus === 'failed' || this.jobStatus === 'completed' || this.jobStatus === 'idle') {
        clearInterval(interval);
        return;
      }

      processed += Math.ceil(params.stagingRecords.length / 10);
      if (processed >= params.stagingRecords.length) {
        processed = params.stagingRecords.length;
        clearInterval(interval);
        
        this.importService.createDisasterRecoverySnapshot(params.gymId).pipe(
          switchMap(snapshotUrl => {
            const hash = params.fileHash;
            const historyPayload: Omit<ImportHistory, 'id'> = {
              gymId: params.gymId,
              importedBy: 'system',
              importedByName: 'Active Owner',
              date: new Date().toISOString(),
              fileName: params.fileName,
              module: params.module,
              recordsImported: processed,
              recordsFailed: 0,
              recordsDuplicates: 0,
              duration: 0,
              fileHash: hash,
              snapshotUrl,
              status: 'completed'
            };
            return this.historyRepo.addHistory(params.gymId, historyPayload);
          })
        ).subscribe(() => {
          this.jobProvider.updateProgress(jobId, processed, 0, 0);
        });
      } else {
        this.jobProvider.updateProgress(jobId, processed, 0, 0);
      }
    }, 800);
  }

  pauseBackgroundJob(): void {
    if (this.jobId) {
      this.jobProvider.pause(this.jobId);
      this.jobStatus = 'paused';
    }
  }

  resumeBackgroundJob(): void {
    if (this.jobId) {
      this.jobProvider.resume(this.jobId);
      this.jobStatus = 'running';
    }
  }

  cancelBackgroundJob(): void {
    if (this.jobId) {
      this.jobProvider.cancel(this.jobId).subscribe(() => {
        this.jobStatus = 'failed';
        this.isProcessing = false;
        this.snackBar.open('Import batch execution cancelled.', 'Dismiss', { duration: 3000 });
      });
    }
  }

  triggerHistoryRollback(history: ImportHistory): void {
    if (!this.activeTenantId || !history.snapshotUrl) {
      this.snackBar.open('Cannot rollback: Snapshot not available.', 'Dismiss', { duration: 3000 });
      return;
    }

    this.isLoading = true;
    this.importService.restoreDisasterSnapshot(this.activeTenantId, history.snapshotUrl).subscribe({
      next: () => {
        const updated: ImportHistory = {
          ...history,
          status: 'rolled_back',
          rolledBackBy: 'system',
          rolledBackByName: 'Active Owner',
          rolledBackAt: new Date().toISOString()
        };
        this.historyRepo.updateHistory(this.activeTenantId, updated).subscribe(() => {
          this.isLoading = false;
          this.snackBar.open(`Rollback transaction executed. Gym reverted to pre-import snapshot state.`, 'Dismiss', { duration: 4000 });
          this.loadImportHistoryAndProfiles();
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open('Rollback failed: ' + err.message, 'Dismiss', { duration: 5000 });
      }
    });
  }

  resetStagingState(): void {
    this.jobId = null;
    this.jobProgress = 0;
    this.jobStatus = 'idle';
  }

  resetQueueState(): void {
    this.fileQueue = [];
    this.selectedQueueItemIndex = null;
    this.resetStagingState();
  }

  launchSystem(): void {
    if (!this.activeGym) return;
    
    this.isLoading = true;
    const finalGym: Gym = {
      ...this.activeGym,
      setupCompleted: true
    };

    this.gymState.updateGym(finalGym).subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open('Setup Wizard completed! Welcome to ApexFit.', 'Dismiss', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open('Failed to launch system: ' + err.message, 'Dismiss', { duration: 3000 });
      }
    });
  }
}
