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
import { MatDividerModule } from '@angular/material/divider';
import { Lead } from '../../core/models/lead.entity';
import { MembershipPlan } from '../../core/models/membership-plan.entity';
import { Member } from '../../core/models/member.entity';
import { Employee } from '../../core/models/employee.entity';
import { PTPlan } from '../../core/models/pt-plan.entity';
import { Trainer } from '../../core/models/trainer.entity';
import { MembershipPlanState } from '../../presentation/state/membership-plan.state';
import { EmployeeState } from '../../presentation/state/employee.state';
import { PTState } from '../../presentation/state/pt.state';
import { TrainerState } from '../../presentation/state/trainer.state';
import { SubmissionGuardService } from '../../services/submission-guard.service';

@Component({
  selector: 'app-convert-dialog',
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
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title class="gradient-text dialogue-title">
      Convert Lead to Member: {{ data.name }}
    </h2>
    
    <form [formGroup]="convertForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        <p class="dialog-desc">Complete membership details, discount incentives, and payment info to finalize the conversion.</p>
        
        <div class="form-grid">
          <!-- Plan Selection -->
          <mat-form-field appearance="outline">
            <mat-label>Membership Plan</mat-label>
            <mat-select formControlName="planId">
              <mat-option *ngFor="let plan of plans" [value]="plan.id">
                {{ plan.name }} (₹{{ plan.price }})
              </mat-option>
            </mat-select>
            <mat-error *ngIf="convertForm.get('planId')?.hasError('required')">Membership Plan is required</mat-error>
          </mat-form-field>

          <!-- Status -->
          <mat-form-field appearance="outline">
            <mat-label>Member Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="active">Active</mat-option>
              <mat-option value="inactive">Inactive</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Start Date -->
          <mat-form-field appearance="outline">
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate">
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>

          <!-- End Date (Calculated & Readonly) -->
          <mat-form-field appearance="outline">
            <mat-label>End Date (Calculated)</mat-label>
            <input matInput formControlName="endDate" readonly placeholder="Calculated automatically">
          </mat-form-field>

          <!-- Gender -->
          <mat-form-field appearance="outline">
            <mat-label>Gender</mat-label>
            <mat-select formControlName="gender">
              <mat-option value="Male">Male</mat-option>
              <mat-option value="Female">Female</mat-option>
              <mat-option value="Other">Other</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Age -->
          <mat-form-field appearance="outline">
            <mat-label>Age</mat-label>
            <input matInput type="number" formControlName="age">
            <mat-error *ngIf="convertForm.get('age')?.hasError('min')">Must be at least 10 years old</mat-error>
          </mat-form-field>

          <!-- Height -->
          <mat-form-field appearance="outline">
            <mat-label>Height (cm)</mat-label>
            <input matInput type="number" formControlName="height">
          </mat-form-field>

          <!-- Weight -->
          <mat-form-field appearance="outline">
            <mat-label>Weight (kg)</mat-label>
            <input matInput type="number" formControlName="weight">
          </mat-form-field>

          <!-- Fitness Goal -->
          <mat-form-field appearance="outline">
            <mat-label>Fitness Goal(s)</mat-label>
            <mat-select formControlName="fitnessGoal" multiple>
              <mat-option *ngFor="let goal of fitnessGoalOptions" [value]="goal">{{ goal }}</mat-option>
            </mat-select>
            <mat-error *ngIf="convertForm.get('fitnessGoal')?.hasError('required')">Fitness goal is required</mat-error>
          </mat-form-field>

          <!-- Salesperson (Converted By) -->
          <mat-form-field appearance="outline">
            <mat-label>Salesperson (Lead Owner)</mat-label>
            <mat-select formControlName="salespersonId">
              <mat-option *ngFor="let emp of employees" [value]="emp.id">
                {{ emp.fullName }} ({{ emp.role === 'staff' ? 'Sales Executive' : emp.role | titlecase }})
              </mat-option>
            </mat-select>
            <mat-error *ngIf="convertForm.get('salespersonId')?.hasError('required')">Salesperson is required</mat-error>
          </mat-form-field>

          <!-- Interested in Personal Training (PT) -->
          <mat-form-field appearance="outline">
            <mat-label>Interested In PT</mat-label>
            <mat-select formControlName="interestedInPT">
              <mat-option value="No">No</mat-option>
              <mat-option value="Yes">Yes</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- PT Plan Selection -->
          <mat-form-field appearance="outline" *ngIf="convertForm.get('interestedInPT')?.value === 'Yes'">
            <mat-label>PT Plan</mat-label>
            <mat-select formControlName="ptPlanId">
              <mat-option *ngFor="let plan of ptPlans" [value]="plan.id">
                {{ plan.name }} ({{ plan.numberOfSessions }} sessions - ₹{{ plan.price }})
              </mat-option>
            </mat-select>
            <mat-error *ngIf="convertForm.get('ptPlanId')?.hasError('required')">PT Plan is required</mat-error>
          </mat-form-field>

          <!-- Assign Trainer -->
          <mat-form-field appearance="outline" *ngIf="convertForm.get('interestedInPT')?.value === 'Yes'">
            <mat-label>Assign Trainer</mat-label>
            <mat-select formControlName="preferredTrainerId">
              <mat-option value="">Unassigned</mat-option>
              <mat-option *ngFor="let trainer of trainers" [value]="trainer.id">
                {{ trainer.name }} ({{ trainer.specialty }})
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- PT Fitness Goal -->
          <mat-form-field appearance="outline" *ngIf="convertForm.get('interestedInPT')?.value === 'Yes'">
            <mat-label>PT Fitness Goal</mat-label>
            <mat-select formControlName="ptGoal">
              <mat-option *ngFor="let goal of ptGoalOptions" [value]="goal">{{ goal }}</mat-option>
            </mat-select>
            <mat-error *ngIf="convertForm.get('ptGoal')?.hasError('required')">PT Goal is required</mat-error>
          </mat-form-field>

          <!-- Discount Type -->
          <mat-form-field appearance="outline">
            <mat-label>Discount Incentive Type</mat-label>
            <mat-select formControlName="discountType">
              <mat-option value="none">No Discount</mat-option>
              <mat-option value="flat">Flat Cash Discount (₹)</mat-option>
              <mat-option value="percentage">Percentage Discount (%)</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Discount Value -->
          <mat-form-field appearance="outline" *ngIf="convertForm.get('discountType')?.value !== 'none'">
            <mat-label>{{ convertForm.get('discountType')?.value === 'flat' ? 'Discount Amount (₹)' : 'Discount Percentage (%)' }}</mat-label>
            <input matInput type="number" formControlName="discountValue">
            <mat-error *ngIf="convertForm.get('discountValue')?.hasError('min')">Value must be greater than 0</mat-error>
          </mat-form-field>

          <!-- Paid Amount -->
          <mat-form-field appearance="outline">
            <mat-label>Amount Paid (₹)</mat-label>
            <input matInput type="number" formControlName="paidAmount">
            <mat-error *ngIf="convertForm.get('paidAmount')?.hasError('required')">Paid amount is required</mat-error>
            <mat-error *ngIf="convertForm.get('paidAmount')?.hasError('min')">Paid amount cannot be negative</mat-error>
          </mat-form-field>

          <!-- Payment Method (Only if Paid Amount > 0) -->
          <mat-form-field appearance="outline" *ngIf="convertForm.get('paidAmount')?.value > 0">
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

          <!-- Payment Due Status (If Outstanding Balance exists) -->
          <mat-form-field appearance="outline" *ngIf="calculations.pendingAmount > 0">
            <mat-label>Outstanding Balance Status</mat-label>
            <mat-select formControlName="paymentStatus">
              <mat-option value="pending">Pending (Standard Term)</mat-option>
              <mat-option value="overdue">Overdue (Immediate Attention)</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <!-- Billing Summary Section -->
        <div class="billing-summary" *ngIf="calculations.originalTotal > 0">
          <h4>Billing Summary Breakdown</h4>
          
          <div class="summary-row">
            <span>Membership Plan Base (₹):</span>
            <span>₹{{ calculations.membershipPrice | number:'1.2-2' }}</span>
          </div>

          <div class="summary-row" *ngIf="convertForm.get('interestedInPT')?.value === 'Yes' && calculations.ptPrice > 0">
            <span>PT Plan Base (₹):</span>
            <span>₹{{ calculations.ptPrice | number:'1.2-2' }}</span>
          </div>

          <div class="summary-row" *ngIf="calculations.discountAmount > 0">
            <span>Incentive Discount:</span>
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
            <span>Amount Paid Now:</span>
            <span class="success-text">₹{{ convertForm.get('paidAmount')?.value | number:'1.2-2' }}</span>
          </div>

          <div class="summary-row pending-row">
            <span>Outstanding Due Balance:</span>
            <strong [class.danger-text]="calculations.pendingAmount > 0" [class.success-text]="calculations.pendingAmount === 0">
              ₹{{ calculations.pendingAmount | number:'1.2-2' }}
            </strong>
          </div>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()" [disabled]="submissionGuard.isSubmitting('lead-convert') | async">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="convertForm.invalid || (submissionGuard.isSubmitting('lead-convert') | async)">
          <mat-icon *ngIf="!(submissionGuard.isSubmitting('lead-convert') | async)">check</mat-icon>
          <mat-icon *ngIf="submissionGuard.isSubmitting('lead-convert') | async" class="spin-icon">sync</mat-icon>
          <span>{{ (submissionGuard.isSubmitting('lead-convert') | async) ? 'Converting...' : 'Complete Conversion' }}</span>
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .dialogue-title {
      font-weight: 700;
      font-size: 22px;
      margin-bottom: 8px;
    }
    .dialog-desc {
      color: var(--text-secondary);
      font-size: 14px;
      margin-bottom: 20px;
    }
    .dialog-form-content {
      display: flex;
      flex-direction: column;
      padding-top: 10px !important;
      max-height: 60vh;
      overflow-y: auto;
      gap: 16px;
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
export class ConvertDialogComponent implements OnInit {
  convertForm!: FormGroup;
  plans: MembershipPlan[] = [];
  employees: Employee[] = [];
  ptPlans: PTPlan[] = [];
  trainers: Trainer[] = [];

  fitnessGoalOptions: string[] = [
    'Weight Loss',
    'Muscle Gain',
    'Body Transformation',
    'General Fitness',
    'CrossFit',
    'MMA',
    'Boxing',
    'Personal Training',
    'Rehabilitation',
    'Other'
  ];

  ptGoalOptions: string[] = [
    'Weight Loss',
    'Muscle Gain',
    'Competition Prep',
    'Strength Training',
    'General Fitness',
    'Rehabilitation'
  ];

  constructor(
    private fb: FormBuilder,
    private planState: MembershipPlanState,
    private employeeState: EmployeeState,
    private ptState: PTState,
    private trainerState: TrainerState,
    private dialogRef: MatDialogRef<ConvertDialogComponent>,
    public submissionGuard: SubmissionGuardService,
    @Inject(MAT_DIALOG_DATA) public data: Lead
  ) {}

  ngOnInit(): void {
    this.planState.plans$.subscribe(plans => {
      this.plans = plans;
      this.initFormAndListeners();
    });
    
    this.employeeState.employees$.subscribe(employees => {
      this.employees = employees.filter(e => e.accountStatus === 'Active');
      
      if (this.convertForm && this.employees.length > 0) {
        const matchingEmp = this.employees.find(e => 
          e.fullName.toLowerCase() === this.data.assignedStaff?.toLowerCase() ||
          e.id === this.data.assignedEmployee ||
          e.id === this.data.leadOwner
        );
        if (matchingEmp) {
          this.convertForm.patchValue({ salespersonId: matchingEmp.id });
        }
      }
    });

    this.ptState.ptPlans$.subscribe(plans => {
      this.ptPlans = plans.filter(p => p.isActive);
    });

    this.trainerState.trainers$.subscribe(trainers => {
      this.trainers = trainers.filter(t => t.status === 'active');
    });
  }

  private initFormAndListeners(): void {
    let matchedPlanId = '';
    if (this.data.interestedPlan) {
      const match = this.plans.find(p => p.name.toLowerCase() === this.data.interestedPlan.toLowerCase());
      if (match) {
        matchedPlanId = match.id;
      }
    }
    if (!matchedPlanId && this.plans.length > 0) {
      matchedPlanId = this.plans[0].id;
    }

    const today = new Date();

    let initialGoals: string[] = [];
    if (this.data.fitnessGoal) {
      if (Array.isArray(this.data.fitnessGoal)) {
        initialGoals = this.data.fitnessGoal;
      } else {
        initialGoals = this.data.fitnessGoal.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    if (initialGoals.length === 0) {
      initialGoals = ['General Fitness'];
    }
    
    this.convertForm = this.fb.group({
      planId: [matchedPlanId, [Validators.required]],
      status: ['active', [Validators.required]],
      startDate: [today, [Validators.required]],
      endDate: ['', [Validators.required]],
      gender: [this.data.gender || 'Male', [Validators.required]],
      age: [this.data.age || 25, [Validators.required, Validators.min(10)]],
      height: [this.data.height || 175, [Validators.required, Validators.min(50)]],
      weight: [this.data.weight || 70, [Validators.required, Validators.min(20)]],
      fitnessGoal: [initialGoals, [Validators.required]],
      salespersonId: ['', [Validators.required]],
      commissionPercent: [10, [Validators.required]],
      
      discountType: ['none', [Validators.required]],
      discountValue: [0, [Validators.min(0)]],
      paidAmount: [0, [Validators.required, Validators.min(0)]],
      paymentStatus: ['pending', [Validators.required]],
      paymentMethod: ['Cash', [Validators.required]],

      // PT fields
      interestedInPT: [this.data.interestedInPT || 'No', [Validators.required]],
      ptPlanId: [this.data.ptPlanId || ''],
      preferredTrainerId: [this.data.preferredTrainerId || ''],
      ptGoal: [this.data.ptGoal || 'General Fitness']
    });

    this.convertForm.get('planId')?.valueChanges.subscribe(() => this.updatePlanEndDate());
    this.convertForm.get('startDate')?.valueChanges.subscribe(() => this.updatePlanEndDate());

    // PT Fields conditional validation
    this.convertForm.get('interestedInPT')?.valueChanges.subscribe(interested => {
      const ptPlanCtrl = this.convertForm.get('ptPlanId');
      const ptGoalCtrl = this.convertForm.get('ptGoal');
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
        this.convertForm.get('preferredTrainerId')?.setValue('');
      }
      ptPlanCtrl?.updateValueAndValidity();
      ptGoalCtrl?.updateValueAndValidity();
    });

    // Automatically cap paidAmount to grandTotal
    this.convertForm.get('paidAmount')?.valueChanges.subscribe(val => {
      const finalTotal = this.calculations.finalTotal;
      if (val > finalTotal) {
        this.convertForm.get('paidAmount')?.setValue(finalTotal, { emitEvent: false });
      }
    });

    // Discount Type listener: reset value if none
    this.convertForm.get('discountType')?.valueChanges.subscribe(type => {
      const discountValCtrl = this.convertForm.get('discountValue');
      if (type === 'none') {
        discountValCtrl?.setValue(0);
        discountValCtrl?.clearValidators();
      } else {
        discountValCtrl?.setValidators([Validators.required, Validators.min(0.01)]);
      }
      discountValCtrl?.updateValueAndValidity();
    });

    this.updatePlanEndDate();
  }

  get calculations() {
    if (!this.convertForm) {
      return {
        membershipPrice: 0,
        ptPrice: 0,
        originalTotal: 0,
        discountAmount: 0,
        finalTotal: 0,
        pendingAmount: 0,
        membershipDiscount: 0,
        ptDiscount: 0,
        membershipFinal: 0,
        ptFinal: 0
      };
    }

    const formValue = this.convertForm.value;
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

  updatePlanEndDate(): void {
    if (!this.convertForm) return;
    const startDateVal = this.convertForm.get('startDate')?.value;
    const planIdVal = this.convertForm.get('planId')?.value;
    if (startDateVal && planIdVal) {
      const selectedPlan = this.plans.find(p => p.id === planIdVal);
      if (selectedPlan) {
        const start = new Date(startDateVal);
        const duration = selectedPlan.duration || selectedPlan.durationMonths || 1;
        const unit = selectedPlan.durationUnit || 'months';

        if (unit === 'days') {
          start.setDate(start.getDate() + duration);
        } else if (unit === 'weeks') {
          start.setDate(start.getDate() + duration * 7);
        } else if (unit === 'months') {
          start.setMonth(start.getMonth() + duration);
        } else if (unit === 'years') {
          start.setFullYear(start.getFullYear() + duration);
        }
        
        this.convertForm.patchValue({
          endDate: this.formatDate(start)
        }, { emitEvent: false });
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.convertForm.valid) {
      if (!this.submissionGuard.start('lead-convert')) {
        return;
      }
      const formValue = this.convertForm.value;
      const selectedPlan = this.plans.find(p => p.id === formValue.planId);
      const selectedPTPlan = this.ptPlans.find(p => p.id === formValue.ptPlanId);
      const selectedTrainer = this.trainers.find(t => t.id === formValue.preferredTrainerId);
      const salesperson = this.employees.find(e => e.id === formValue.salespersonId);
      
      const memberDetails: Omit<Member, 'id' | 'attendanceCount' | 'balance' | 'gymId'> = {
        name: this.data.name,
        email: this.data.email,
        phone: this.data.phone,
        status: formValue.status,
        planId: formValue.planId,
        planName: selectedPlan ? selectedPlan.name : 'Unknown Plan',
        startDate: this.formatDate(formValue.startDate),
        endDate: formValue.endDate,
        gender: formValue.gender,
        age: formValue.age,
        height: formValue.height,
        weight: formValue.weight,
        fitnessGoal: Array.isArray(formValue.fitnessGoal) ? formValue.fitnessGoal.join(', ') : formValue.fitnessGoal,
        avatarUrl: `https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150`
      };

      const finalCalculations = this.calculations;

      const conversionDetails = {
        convertedBy: salesperson ? salesperson.fullName : 'System',
        salespersonId: salesperson ? salesperson.id : '',
        salespersonName: salesperson ? salesperson.fullName : 'System',
        revenueGenerated: finalCalculations.finalTotal,
        commissionPercent: formValue.commissionPercent,
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
        memberDetails,
        conversionDetails
      });
      this.submissionGuard.end('lead-convert');
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
