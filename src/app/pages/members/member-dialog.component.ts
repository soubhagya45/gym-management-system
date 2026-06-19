import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MembershipPlanState } from '../../presentation/state/membership-plan.state';
import { PTState } from '../../presentation/state/pt.state';
import { TrainerState } from '../../presentation/state/trainer.state';
import { EmployeeState } from '../../presentation/state/employee.state';
import { Member } from '../../core/models/member.entity';
import { MembershipPlan } from '../../core/models/membership-plan.entity';
import { PTPlan } from '../../core/models/pt-plan.entity';
import { Trainer } from '../../core/models/trainer.entity';
import { Employee } from '../../core/models/employee.entity';
import { FILE_STORAGE_REPOSITORY_TOKEN, IFileStorageRepository } from '../../core/interfaces/file-storage-repository.interface';
import { SubmissionGuardService } from '../../services/submission-guard.service';

@Component({
  selector: 'app-member-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatTooltipModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title class="gradient-text dialogue-title">
      {{ isEdit ? 'Modify Member Profile' : 'Onboard & Register Member' }}
    </h2>
    
    <form [formGroup]="memberForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        <!-- Profile Image Display & Avatar URL selection -->
        <div class="avatar-select-section">
          <div class="avatar-preview" (click)="memberPhotoInput.click()" style="cursor: pointer" matTooltip="Click to upload avatar">
            <img [src]="selectedAvatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'" alt="Avatar Preview">
          </div>
          <div class="avatar-inputs" style="display: flex; gap: 8px; align-items: center; width: 100%;">
            <mat-form-field appearance="outline" style="flex: 1;">
              <mat-label>Avatar Image URL</mat-label>
              <input matInput placeholder="Unsplash URL" (input)="onAvatarChange($event)" formControlName="avatarUrl">
              <mat-hint>Paste an image URL or upload file</mat-hint>
            </mat-form-field>
            <input type="file" #memberPhotoInput (change)="onMemberPhotoUpload($event)" accept="image/*" style="display: none">
            <button type="button" mat-stroked-button color="accent" (click)="memberPhotoInput.click()" [disabled]="isUploading" style="height: 54px; margin-top: -18px;">
              <mat-icon *ngIf="!isUploading">cloud_upload</mat-icon>
              <mat-icon *ngIf="isUploading" class="spin-icon">sync</mat-icon>
            </button>
          </div>
        </div>

        <div class="form-grid">
          <!-- Name -->
          <mat-form-field appearance="outline">
            <mat-label>Full Name</mat-label>
            <input matInput formControlName="name" placeholder="John Doe">
            <mat-error *ngIf="memberForm.get('name')?.hasError('required')">Name is required</mat-error>
          </mat-form-field>

          <!-- Email -->
          <mat-form-field appearance="outline">
            <mat-label>Email Address</mat-label>
            <input matInput type="email" formControlName="email" placeholder="john.doe@example.com">
            <mat-error *ngIf="memberForm.get('email')?.hasError('required')">Email is required</mat-error>
            <mat-error *ngIf="memberForm.get('email')?.hasError('email')">Please enter a valid email</mat-error>
          </mat-form-field>

          <!-- Phone -->
          <mat-form-field appearance="outline">
            <mat-label>Phone Number</mat-label>
            <input matInput formControlName="phone" placeholder="+1 (555) 000-0000">
            <mat-error *ngIf="memberForm.get('phone')?.hasError('required')">Phone number is required</mat-error>
          </mat-form-field>

          <!-- Gender -->
          <mat-form-field appearance="outline">
            <mat-label>Gender</mat-label>
            <mat-select formControlName="gender">
              <mat-option value="Male">Male</mat-option>
              <mat-option value="Female">Female</mat-option>
              <mat-option value="Other">Other</mat-option>
            </mat-select>
            <mat-error *ngIf="memberForm.get('gender')?.hasError('required')">Gender is required</mat-error>
          </mat-form-field>

          <!-- Age -->
          <mat-form-field appearance="outline">
            <mat-label>Age</mat-label>
            <input matInput type="number" formControlName="age" placeholder="25">
            <mat-error *ngIf="memberForm.get('age')?.hasError('required')">Age is required</mat-error>
            <mat-error *ngIf="memberForm.get('age')?.hasError('min')">Age must be at least 1</mat-error>
            <mat-error *ngIf="memberForm.get('age')?.hasError('max')">Age must be at most 120</mat-error>
          </mat-form-field>

          <!-- Height -->
          <mat-form-field appearance="outline">
            <mat-label>Height (cm)</mat-label>
            <input matInput type="number" formControlName="height" placeholder="170">
            <mat-error *ngIf="memberForm.get('height')?.hasError('required')">Height is required</mat-error>
            <mat-error *ngIf="memberForm.get('height')?.hasError('min')">Height must be at least 50 cm</mat-error>
          </mat-form-field>

          <!-- Weight -->
          <mat-form-field appearance="outline">
            <mat-label>Current Weight (kg)</mat-label>
            <input matInput type="number" formControlName="weight" placeholder="70">
            <mat-error *ngIf="memberForm.get('weight')?.hasError('required')">Weight is required</mat-error>
            <mat-error *ngIf="memberForm.get('weight')?.hasError('min')">Weight must be at least 10 kg</mat-error>
          </mat-form-field>

          <!-- Fitness Goal -->
          <mat-form-field appearance="outline">
            <mat-label>Fitness Goal</mat-label>
            <mat-select formControlName="fitnessGoal">
              <mat-option value="Weight Loss">Weight Loss</mat-option>
              <mat-option value="Muscle Gain">Muscle Gain</mat-option>
              <mat-option value="Cardio Fitness">Cardio Fitness</mat-option>
              <mat-option value="Strength Training">Strength Training</mat-option>
              <mat-option value="General Fitness">General Fitness</mat-option>
              <mat-option value="Flexibility & Mobility">Flexibility & Mobility</mat-option>
            </mat-select>
            <mat-error *ngIf="memberForm.get('fitnessGoal')?.hasError('required')">Fitness Goal is required</mat-error>
          </mat-form-field>

          <!-- Status -->
          <mat-form-field appearance="outline">
            <mat-label>Membership Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="active">Active</mat-option>
              <mat-option value="expiring">Expiring</mat-option>
              <mat-option value="inactive">Inactive</mat-option>
            </mat-select>
            <mat-error *ngIf="memberForm.get('status')?.hasError('required')">Status is required</mat-error>
          </mat-form-field>

          <!-- Plan Selection -->
          <mat-form-field appearance="outline">
            <mat-label>Select Membership Plan</mat-label>
            <mat-select formControlName="planId" (selectionChange)="onPlanChange($event.value)">
              <mat-option *ngFor="let plan of plans" [value]="plan.id">
                {{ plan.name }} - ₹{{ plan.price }}
              </mat-option>
            </mat-select>
            <mat-error *ngIf="memberForm.get('planId')?.hasError('required')">Plan selection is required</mat-error>
          </mat-form-field>

          <!-- Start Date -->
          <mat-form-field appearance="outline">
            <mat-label>Join Date</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate" (dateChange)="onStartDateChange()">
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
            <mat-error *ngIf="memberForm.get('startDate')?.hasError('required')">Join date is required</mat-error>
          </mat-form-field>

          <!-- End Date -->
          <mat-form-field appearance="outline">
            <mat-label>Expiry Date</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate">
            <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
            <mat-error *ngIf="memberForm.get('endDate')?.hasError('required')">Expiry date is required</mat-error>
          </mat-form-field>

          <!-- ── ONBOARDING-ONLY FIELDS (Show if not isEdit) ── -->
          <ng-container *ngIf="!isEdit">
            <!-- Salesperson -->
            <mat-form-field appearance="outline">
              <mat-label>Attributed Salesperson</mat-label>
              <mat-select formControlName="salespersonId">
                <mat-option *ngFor="let emp of employees" [value]="emp.id">
                  {{ emp.fullName }} ({{ emp.role === 'staff' ? 'Sales Executive' : emp.role | titlecase }})
                </mat-option>
              </mat-select>
              <mat-error *ngIf="memberForm.get('salespersonId')?.hasError('required')">Salesperson attribution is required</mat-error>
            </mat-form-field>

            <!-- Interested in Personal Training (PT) -->
            <mat-form-field appearance="outline">
              <mat-label>Interested In Personal Training (PT)?</mat-label>
              <mat-select formControlName="interestedInPT">
                <mat-option value="No">No</mat-option>
                <mat-option value="Yes">Yes</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- PT Plan -->
            <mat-form-field appearance="outline" *ngIf="memberForm.get('interestedInPT')?.value === 'Yes'">
              <mat-label>PT Plan Package</mat-label>
              <mat-select formControlName="ptPlanId">
                <mat-option *ngFor="let pt of ptPlans" [value]="pt.id">
                  {{ pt.name }} ({{ pt.numberOfSessions }} Sessions - ₹{{ pt.price }})
                </mat-option>
              </mat-select>
              <mat-error *ngIf="memberForm.get('ptPlanId')?.hasError('required')">PT Plan selection is required</mat-error>
            </mat-form-field>

            <!-- PT Trainer -->
            <mat-form-field appearance="outline" *ngIf="memberForm.get('interestedInPT')?.value === 'Yes'">
              <mat-label>Assigned PT Trainer</mat-label>
              <mat-select formControlName="preferredTrainerId">
                <mat-option value="">Unassigned</mat-option>
                <mat-option *ngFor="let tr of trainers" [value]="tr.id">
                  {{ tr.name }} ({{ tr.specialty }})
                </mat-option>
              </mat-select>
            </mat-form-field>

            <!-- PT Goal -->
            <mat-form-field appearance="outline" *ngIf="memberForm.get('interestedInPT')?.value === 'Yes'">
              <mat-label>PT Fitness Goal</mat-label>
              <mat-select formControlName="ptGoal">
                <mat-option value="Weight Loss">Weight Loss</mat-option>
                <mat-option value="Muscle Gain">Muscle Gain</mat-option>
                <mat-option value="General Fitness">General Fitness</mat-option>
                <mat-option value="Strength Training">Strength Training</mat-option>
                <mat-option value="Rehabilitation">Rehabilitation</mat-option>
              </mat-select>
              <mat-error *ngIf="memberForm.get('ptGoal')?.hasError('required')">PT Fitness goal is required</mat-error>
            </mat-form-field>

            <!-- Discount Type -->
            <mat-form-field appearance="outline">
              <mat-label>Discount Type</mat-label>
              <mat-select formControlName="discountType">
                <mat-option value="none">No Discount</mat-option>
                <mat-option value="flat">Flat Cash Discount (₹)</mat-option>
                <mat-option value="percentage">Percentage Discount (%)</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Discount Value -->
            <mat-form-field appearance="outline" *ngIf="memberForm.get('discountType')?.value !== 'none'">
              <mat-label>{{ memberForm.get('discountType')?.value === 'flat' ? 'Discount Amount (₹)' : 'Discount Percentage (%)' }}</mat-label>
              <input matInput type="number" formControlName="discountValue">
              <mat-error *ngIf="memberForm.get('discountValue')?.hasError('min')">Value must be greater than 0</mat-error>
            </mat-form-field>

            <!-- Paid Amount -->
            <mat-form-field appearance="outline">
              <mat-label>Paid Amount (₹)</mat-label>
              <input matInput type="number" formControlName="paidAmount">
              <mat-error *ngIf="memberForm.get('paidAmount')?.hasError('required')">Paid amount is required</mat-error>
              <mat-error *ngIf="memberForm.get('paidAmount')?.hasError('min')">Paid amount cannot be negative</mat-error>
            </mat-form-field>

            <!-- Payment Method (Only if Paid > 0) -->
            <mat-form-field appearance="outline" *ngIf="memberForm.get('paidAmount')?.value > 0">
              <mat-label>Payment Method</mat-label>
              <mat-select formControlName="paymentMethod">
                <mat-option value="Cash">Cash</mat-option>
                <mat-option value="UPI">UPI / GPay / PhonePe</mat-option>
                <mat-option value="Razorpay">Razorpay Gateway</mat-option>
                <mat-option value="Credit Card">Credit Card</mat-option>
                <mat-option value="Debit Card">Debit Card</mat-option>
                <mat-option value="Net Banking">Net Banking</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Payment Status (If unpaid due balance exists) -->
            <mat-form-field appearance="outline" *ngIf="calculations.pendingAmount > 0">
              <mat-label>Outstanding Due Status</mat-label>
              <mat-select formControlName="paymentStatus">
                <mat-option value="pending">Pending (Standard)</mat-option>
                <mat-option value="overdue">Overdue (Immediate Action)</mat-option>
              </mat-select>
            </mat-form-field>
          </ng-container>
        </div>

        <!-- Billing Invoice Breakdown Summary Card -->
        <div class="billing-summary" *ngIf="!isEdit && calculations.originalTotal > 0">
          <h4>Billing Registration Breakdown</h4>
          
          <div class="summary-row">
            <span>Membership Plan Base (₹):</span>
            <span>₹{{ calculations.membershipPrice | number:'1.2-2' }}</span>
          </div>

          <div class="summary-row" *ngIf="memberForm.get('interestedInPT')?.value === 'Yes' && calculations.ptPrice > 0">
            <span>PT Plan Base (₹):</span>
            <span>₹{{ calculations.ptPrice | number:'1.2-2' }}</span>
          </div>

          <div class="summary-row" *ngIf="calculations.discountAmount > 0">
            <span>Discounts Applied:</span>
            <span class="danger-text">-₹{{ calculations.discountAmount | number:'1.2-2' }}</span>
          </div>

          <div class="summary-row">
            <span>GST Tax (18% inclusive):</span>
            <span>₹{{ (calculations.finalTotal * 0.18) | number:'1.2-2' }}</span>
          </div>

          <mat-divider></mat-divider>

          <div class="summary-row total">
            <span>Grand Total (Payable):</span>
            <strong>₹{{ calculations.finalTotal | number:'1.2-2' }}</strong>
          </div>

          <div class="summary-row paid-row">
            <span>Amount Paid:</span>
            <span class="success-text">₹{{ memberForm.get('paidAmount')?.value | number:'1.2-2' }}</span>
          </div>

          <div class="summary-row pending-row">
            <span>Outstanding Receivable Balance:</span>
            <strong [class.danger-text]="calculations.pendingAmount > 0" [class.success-text]="calculations.pendingAmount === 0">
              ₹{{ calculations.pendingAmount | number:'1.2-2' }}
            </strong>
          </div>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()" [disabled]="submissionGuard.isSubmitting('member-dialog-submit') | async">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="memberForm.invalid || (submissionGuard.isSubmitting('member-dialog-submit') | async)">
          <mat-icon *ngIf="submissionGuard.isSubmitting('member-dialog-submit') | async" class="spin-icon" style="margin-right: 8px;">sync</mat-icon>
          <span>{{ (submissionGuard.isSubmitting('member-dialog-submit') | async) ? 'Saving...' : (isEdit ? 'Save Profile' : 'Complete Registration') }}</span>
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .dialogue-title {
      font-weight: 700;
      font-size: 22px;
      margin-bottom: 20px;
    }
    .dialog-form-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 10px !important;
      max-height: 60vh;
      overflow-y: auto;
    }
    .avatar-select-section {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }
    .avatar-preview {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--border-color);
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
    .avatar-inputs {
      flex: 1;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .billing-summary {
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed rgba(99, 102, 241, 0.4);
      padding: 16px;
      border-radius: 12px;
      margin-top: 8px;

      h4 {
        margin-bottom: 12px;
        color: #6366f1;
        font-size: 15px;
        font-weight: 600;
      }
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 13.5px;
      margin-bottom: 8px;
      color: var(--text-secondary);

      &.total {
        margin-top: 8px;
        padding-top: 8px;
        font-size: 15px;
        color: var(--text-primary);
      }
    }
    .danger-text {
      color: #ef4444;
      font-weight: 600;
    }
    .success-text {
      color: #10b981;
      font-weight: 600;
    }
    .dialog-actions {
      padding: 16px 0 0 0 !important;
      gap: 8px;
    }
    
    @media (max-width: 599.98px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MemberDialogComponent implements OnInit {
  memberForm!: FormGroup;
  isEdit = false;
  plans: MembershipPlan[] = [];
  ptPlans: PTPlan[] = [];
  trainers: Trainer[] = [];
  employees: Employee[] = [];
  selectedAvatarUrl = '';
  isUploading = false;

  constructor(
    private fb: FormBuilder,
    private planState: MembershipPlanState,
    private ptState: PTState,
    private trainerState: TrainerState,
    private employeeState: EmployeeState,
    private dialogRef: MatDialogRef<MemberDialogComponent>,
    public submissionGuard: SubmissionGuardService,
    @Inject(MAT_DIALOG_DATA) public data: Member | null,
    @Inject(FILE_STORAGE_REPOSITORY_TOKEN) private fileStorage: IFileStorageRepository
  ) {}

  onMemberPhotoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.isUploading = true;
      this.fileStorage.uploadFile(file, 'members').subscribe({
        next: (url) => {
          this.memberForm.patchValue({ avatarUrl: url });
          this.selectedAvatarUrl = url;
          this.isUploading = false;
        },
        error: (err) => {
          this.isUploading = false;
          console.error('Member photo upload failed:', err);
        }
      });
    }
  }

  ngOnInit(): void {
    this.isEdit = !!this.data;
    this.selectedAvatarUrl = this.data?.avatarUrl || '';

    // Load static data references
    this.planState.plans$.subscribe(plans => {
      this.plans = plans;
      if (!this.data && plans.length > 0) {
        const defaultPlanId = plans[0].id;
        this.memberForm.patchValue({ planId: defaultPlanId });
        this.onPlanChange(defaultPlanId);
      }
    });

    this.ptState.ptPlans$.subscribe(plans => {
      this.ptPlans = plans.filter(p => p.isActive);
    });

    this.trainerState.trainers$.subscribe(trainers => {
      this.trainers = trainers.filter(t => t.status === 'active');
    });

    this.employeeState.employees$.subscribe(employees => {
      this.employees = employees.filter(e => e.accountStatus === 'Active');
      if (!this.data && this.employees.length > 0 && this.memberForm) {
        this.memberForm.patchValue({ salespersonId: this.employees[0].id });
      }
    });

    const startVal = this.data ? new Date(this.data.startDate) : new Date();
    const endVal = this.data ? new Date(this.data.endDate) : new Date();

    this.memberForm = this.fb.group({
      name: [this.data?.name || '', [Validators.required]],
      email: [this.data?.email || '', [Validators.required, Validators.email]],
      phone: [this.data?.phone || '', [Validators.required]],
      status: [this.data?.status || 'active', [Validators.required]],
      planId: [this.data?.planId || '', [Validators.required]],
      startDate: [startVal, [Validators.required]],
      endDate: [endVal, [Validators.required]],
      avatarUrl: [this.data?.avatarUrl || ''],
      gender: [this.data?.gender || 'Male', [Validators.required]],
      age: [this.data?.age || '', [Validators.required, Validators.min(1), Validators.max(120)]],
      height: [this.data?.height || '', [Validators.required, Validators.min(50), Validators.max(250)]],
      weight: [this.data?.weight || '', [Validators.required, Validators.min(10), Validators.max(300)]],
      startingWeight: [this.data?.startingWeight || ''],
      goalWeight: [this.data?.goalWeight || ''],
      fitnessGoal: [this.data?.fitnessGoal || 'General Fitness', [Validators.required]],

      // Onboarding Billing Form controls (only validated/submitted if !isEdit)
      salespersonId: [''],
      interestedInPT: ['No'],
      ptPlanId: [''],
      preferredTrainerId: [''],
      ptGoal: ['General Fitness'],
      discountType: ['none'],
      discountValue: [0, [Validators.min(0)]],
      paidAmount: [0, [Validators.min(0)]],
      paymentStatus: ['pending'],
      paymentMethod: ['Cash']
    });

    if (!this.isEdit) {
      // Add validation dynamically for onboarding controls
      this.memberForm.get('salespersonId')?.setValidators([Validators.required]);
      this.memberForm.get('paidAmount')?.setValidators([Validators.required, Validators.min(0)]);
      this.memberForm.get('discountType')?.setValidators([Validators.required]);
      this.memberForm.get('paymentStatus')?.setValidators([Validators.required]);
      this.memberForm.get('paymentMethod')?.setValidators([Validators.required]);

      // PT Fields conditional validation
      this.memberForm.get('interestedInPT')?.valueChanges.subscribe(interested => {
        const ptPlanCtrl = this.memberForm.get('ptPlanId');
        const ptGoalCtrl = this.memberForm.get('ptGoal');
        if (interested === 'Yes') {
          ptPlanCtrl?.setValidators([Validators.required]);
          ptGoalCtrl?.setValidators([Validators.required]);
          if (!ptPlanCtrl?.value && this.ptPlans.length > 0) {
            ptPlanCtrl?.setValue(this.ptPlans[0].id);
          }
        } else {
          ptPlanCtrl?.clearValidators();
          ptPlanCtrl?.setValue('');
          ptGoalCtrl?.clearValidators();
          ptGoalCtrl?.setValue('');
          this.memberForm.get('preferredTrainerId')?.setValue('');
        }
        ptPlanCtrl?.updateValueAndValidity();
        ptGoalCtrl?.updateValueAndValidity();
      });

      // Cap paidAmount to grandTotal
      this.memberForm.get('paidAmount')?.valueChanges.subscribe(val => {
        const finalTotal = this.calculations.finalTotal;
        if (val > finalTotal) {
          this.memberForm.get('paidAmount')?.setValue(finalTotal, { emitEvent: false });
        }
      });

      // Discount Type listener
      this.memberForm.get('discountType')?.valueChanges.subscribe(type => {
        const discountValCtrl = this.memberForm.get('discountValue');
        if (type === 'none') {
          discountValCtrl?.setValue(0);
          discountValCtrl?.clearValidators();
        } else {
          discountValCtrl?.setValidators([Validators.required, Validators.min(0.01)]);
        }
        discountValCtrl?.updateValueAndValidity();
      });
    }

    this.memberForm.get('planId')?.valueChanges.subscribe(planId => this.onPlanChange(planId));
    this.memberForm.get('startDate')?.valueChanges.subscribe(() => this.onStartDateChange());
  }

  get calculations() {
    if (!this.memberForm) {
      return {
        membershipPrice: 0,
        ptPrice: 0,
        originalTotal: 0,
        discountAmount: 0,
        finalTotal: 0,
        pendingAmount: 0
      };
    }

    const formValue = this.memberForm.value;
    const memPlan = this.plans.find(p => p.id === formValue.planId);
    const ptPlan = formValue.interestedInPT === 'Yes' ? this.ptPlans.find(p => p.id === formValue.ptPlanId) : null;

    const membershipPrice = memPlan ? memPlan.price : 0;
    const ptPrice = ptPlan ? ptPlan.price : 0;
    const originalTotal = membershipPrice + ptPrice;

    const discountType = formValue.discountType || 'none';
    const discountValue = formValue.discountValue || 0;
    let discountAmount = 0;

    let membershipDiscount = 0;
    let ptDiscount = 0;

    if (discountType === 'percentage') {
      membershipDiscount = membershipPrice * (discountValue / 100);
      ptDiscount = ptPrice * (discountValue / 100);
      discountAmount = membershipDiscount + ptDiscount;
    } else if (discountType === 'flat') {
      discountAmount = discountValue;
      if (originalTotal > 0) {
        membershipDiscount = discountValue * (membershipPrice / originalTotal);
        ptDiscount = discountValue - membershipDiscount;
      }
    }

    membershipDiscount = Math.round(membershipDiscount * 100) / 100;
    ptDiscount = Math.round(ptDiscount * 100) / 100;

    const membershipFinal = Math.max(0, membershipPrice - membershipDiscount);
    const ptFinal = Math.max(0, ptPrice - ptDiscount);
    const finalTotal = membershipFinal + ptFinal;

    const paidAmount = formValue.paidAmount || 0;
    const pendingAmount = Math.max(0, finalTotal - paidAmount);

    return {
      membershipPrice,
      ptPrice,
      originalTotal,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalTotal,
      pendingAmount,
      membershipDiscount,
      ptDiscount,
      membershipFinal,
      ptFinal
    };
  }

  onAvatarChange(event: any): void {
    this.selectedAvatarUrl = event.target.value;
  }

  onPlanChange(planId: string): void {
    const startDate = this.memberForm.get('startDate')?.value || new Date();
    const calculatedEndDate = this.calculateEndDate(startDate, planId);
    this.memberForm.get('endDate')?.setValue(calculatedEndDate);
  }

  onStartDateChange(): void {
    const startDate = this.memberForm.get('startDate')?.value;
    const planId = this.memberForm.get('planId')?.value;
    if (startDate && planId) {
      const calculatedEndDate = this.calculateEndDate(startDate, planId);
      this.memberForm.get('endDate')?.setValue(calculatedEndDate);
    }
  }

  private calculateEndDate(startDate: Date, planId: string): Date {
    const selectedPlan = this.plans.find(p => p.id === planId);
    const endDate = new Date(startDate);
    const duration = selectedPlan?.duration || selectedPlan?.durationMonths || 1;
    const unit = selectedPlan?.durationUnit || 'months';

    if (unit === 'days') {
      endDate.setDate(endDate.getDate() + duration);
    } else if (unit === 'weeks') {
      endDate.setDate(endDate.getDate() + duration * 7);
    } else if (unit === 'months') {
      endDate.setMonth(endDate.getMonth() + duration);
    } else if (unit === 'years') {
      endDate.setFullYear(endDate.getFullYear() + duration);
    }

    return endDate;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.memberForm.valid) {
      if (!this.submissionGuard.start('member-dialog-submit')) {
        return;
      }
      const formValue = this.memberForm.value;
      const selectedPlan = this.plans.find(p => p.id === formValue.planId);
      const selectedPTPlan = this.ptPlans.find(p => p.id === formValue.ptPlanId);
      const selectedTrainer = this.trainers.find(t => t.id === formValue.preferredTrainerId);
      const salesperson = this.employees.find(e => e.id === formValue.salespersonId);
      
      const memberDetails = {
        name: formValue.name,
        email: formValue.email,
        phone: formValue.phone,
        status: formValue.status,
        planId: formValue.planId,
        planName: selectedPlan ? selectedPlan.name : 'Unknown Plan',
        startDate: this.formatDate(formValue.startDate),
        endDate: this.formatDate(formValue.endDate),
        gender: formValue.gender,
        age: formValue.age,
        height: formValue.height,
        weight: formValue.weight,
        startingWeight: formValue.startingWeight || formValue.weight,
        goalWeight: formValue.goalWeight || formValue.weight,
        fitnessGoal: formValue.fitnessGoal,
        avatarUrl: this.selectedAvatarUrl || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80`
      };

      if (this.isEdit && this.data) {
        this.dialogRef.close({
          ...this.data,
          ...memberDetails
        });
      } else {
        const finalCalculations = this.calculations;

        const conversionDetails = {
          convertedBy: salesperson ? salesperson.fullName : 'System',
          salespersonId: salesperson ? salesperson.id : '',
          salespersonName: salesperson ? salesperson.fullName : 'System',
          revenueGenerated: finalCalculations.finalTotal,
          commissionPercent: 10,
          paymentStatus: finalCalculations.pendingAmount === 0 ? 'paid' : formValue.paymentStatus,
          paymentMethod: formValue.paidAmount > 0 ? formValue.paymentMethod : 'Pending',
          paidAmount: formValue.paidAmount,
          discountType: formValue.discountType,
          discountValue: formValue.discountValue,
          
          // PT Additions
          interestedInPT: formValue.interestedInPT === 'Yes',
          ptPlanId: formValue.ptPlanId || undefined,
          preferredTrainerId: formValue.preferredTrainerId || undefined,
          ptGoal: formValue.ptGoal,
          ptPlanPrice: selectedPTPlan ? selectedPTPlan.price : 0,
          ptPlanName: selectedPTPlan ? selectedPTPlan.name : '',
          trainerName: selectedTrainer ? selectedTrainer.name : '',
          ptPlanDuration: selectedPTPlan ? selectedPTPlan.duration : 1,
          ptSessionsTotal: selectedPTPlan ? selectedPTPlan.numberOfSessions : 0
        };

        this.dialogRef.close({
          memberData: memberDetails,
          membershipPlanPrice: selectedPlan ? selectedPlan.price : 0,
          conversionDetails
        });
      }
      this.submissionGuard.end('member-dialog-submit');
    }
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }
}
