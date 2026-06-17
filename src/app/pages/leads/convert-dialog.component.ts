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
        <p class="dialog-desc">Complete membership details and payment options to finalize the sale.</p>
        
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

          <!-- Converted By (Salesperson) -->
          <mat-form-field appearance="outline">
            <mat-label>Salesperson (Converted By)</mat-label>
            <mat-select formControlName="convertedBy">
              <mat-option *ngFor="let emp of employees" [value]="emp.fullName">
                {{ emp.fullName }} ({{ emp.role === 'staff' ? 'Sales Executive' : emp.role | titlecase }})
              </mat-option>
            </mat-select>
            <mat-error *ngIf="convertForm.get('convertedBy')?.hasError('required')">Salesperson is required</mat-error>
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

          <!-- Payment Status -->
          <mat-form-field appearance="outline">
            <mat-label>Payment Status</mat-label>
            <mat-select formControlName="paymentStatus">
              <mat-option value="paid">Paid immediately</mat-option>
              <mat-option value="pending">Bill / Pay Later</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Payment Method -->
          <mat-form-field appearance="outline" *ngIf="convertForm.get('paymentStatus')?.value === 'paid'">
            <mat-label>Payment Method</mat-label>
            <mat-select formControlName="paymentMethod">
              <mat-option value="UPI">UPI / GPay</mat-option>
              <mat-option value="Card">Credit/Debit Card</mat-option>
              <mat-option value="Cash">Cash</mat-option>
              <mat-option value="NetBanking">Net Banking</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="billing-summary" *ngIf="selectedPlanPrice > 0 || (convertForm.get('interestedInPT')?.value === 'Yes' && selectedPTPlanPrice > 0)">
          <h4>Billing Invoice Summary</h4>
          
          <div class="summary-row" *ngIf="selectedPlanPrice > 0">
            <span>Membership Plan:</span>
            <strong>{{ selectedPlanName }} (₹{{ selectedPlanPrice }})</strong>
          </div>

          <div class="summary-row" *ngIf="convertForm.get('interestedInPT')?.value === 'Yes' && selectedPTPlanPrice > 0">
            <span>Personal Training:</span>
            <strong>{{ selectedPTPlanName }} (₹{{ selectedPTPlanPrice }})</strong>
          </div>

          <div class="summary-row">
            <span>Base Amount:</span>
            <span>₹{{ ((selectedPlanPrice + (convertForm.get('interestedInPT')?.value === 'Yes' ? selectedPTPlanPrice : 0)) / 1.18) | number:'1.2-2' }}</span>
          </div>
          <div class="summary-row">
            <span>Tax (GST 18%):</span>
            <span>₹{{ ((selectedPlanPrice + (convertForm.get('interestedInPT')?.value === 'Yes' ? selectedPTPlanPrice : 0)) - ((selectedPlanPrice + (convertForm.get('interestedInPT')?.value === 'Yes' ? selectedPTPlanPrice : 0)) / 1.18)) | number:'1.2-2' }}</span>
          </div>
          <mat-divider></mat-divider>
          <div class="summary-row total">
            <span>Final Paid Amount:</span>
            <strong>₹{{ selectedPlanPrice + (convertForm.get('interestedInPT')?.value === 'Yes' ? selectedPTPlanPrice : 0) }}</strong>
          </div>
          <div class="summary-row commission">
            <span>Salesperson Commission (10% Auto):</span>
            <span class="success-text">₹{{ (selectedPlanPrice * 0.10) | number:'1.2-2' }}</span>
          </div>
          <div class="summary-row commission" *ngIf="convertForm.get('interestedInPT')?.value === 'Yes' && selectedPTPlanPrice > 0 && convertForm.get('preferredTrainerId')?.value">
            <span>Trainer Commission (10% Auto):</span>
            <span class="success-text">₹{{ (selectedPTPlanPrice * 0.10) | number:'1.2-2' }}</span>
          </div>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="convertForm.invalid">
          <mat-icon>check</mat-icon>
          <span>Complete Conversion</span>
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
      border: 1px solid var(--border-color);
      padding: 16px;
      border-radius: 12px;
      margin-top: 8px;

      h4 {
        margin-bottom: 12px;
        color: var(--accent-hover);
        font-size: 15px;
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
      &.commission {
        color: var(--success);
      }
    }
    .success-text {
      color: var(--success);
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
  selectedPlanPrice = 0;
  selectedPlanName = '';
  selectedPTPlanPrice = 0;
  selectedPTPlanName = '';

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
    @Inject(MAT_DIALOG_DATA) public data: Lead
  ) {}

  ngOnInit(): void {
    this.planState.plans$.subscribe(plans => {
      this.plans = plans;
      this.initFormAndListeners();
    });
    
    this.employeeState.employees$.subscribe(employees => {
      this.employees = employees.filter(e => e.accountStatus === 'Active');
      
      // Auto-prefill convertedBy if assignedStaff/assignedEmployeeName matches
      if (this.convertForm && this.employees.length > 0) {
        const matchingEmp = this.employees.find(e => 
          e.fullName.toLowerCase() === this.data.assignedStaff?.toLowerCase() ||
          e.id === this.data.assignedEmployee
        );
        if (matchingEmp) {
          this.convertForm.patchValue({ convertedBy: matchingEmp.fullName });
        }
      }
    });

    this.ptState.ptPlans$.subscribe(plans => {
      this.ptPlans = plans.filter(p => p.isActive);
      this.updatePTPlanDetails();
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
      convertedBy: ['', [Validators.required]],
      commissionPercent: [10, [Validators.required]],
      paymentStatus: ['paid', [Validators.required]],
      paymentMethod: ['UPI', [Validators.required]],

      // PT fields
      interestedInPT: [this.data.interestedInPT || 'No', [Validators.required]],
      ptPlanId: [this.data.ptPlanId || ''],
      preferredTrainerId: [this.data.preferredTrainerId || ''],
      ptGoal: [this.data.ptGoal || 'General Fitness']
    });

    this.convertForm.get('planId')?.valueChanges.subscribe(() => this.updatePlanDetails());
    this.convertForm.get('startDate')?.valueChanges.subscribe(() => this.updatePlanDetails());

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
      this.updatePTPlanDetails();
    });

    this.convertForm.get('ptPlanId')?.valueChanges.subscribe(() => {
      this.updatePTPlanDetails();
    });
    
    this.updatePlanDetails();
    this.updatePTPlanDetails();
  }

  updatePlanDetails(): void {
    if (!this.convertForm) return;
    const startDateVal = this.convertForm.get('startDate')?.value;
    const planIdVal = this.convertForm.get('planId')?.value;
    if (startDateVal && planIdVal) {
      const selectedPlan = this.plans.find(p => p.id === planIdVal);
      if (selectedPlan) {
        this.selectedPlanPrice = selectedPlan.price;
        this.selectedPlanName = selectedPlan.name;
        
        const start = new Date(startDateVal);
        const end = new Date(start.setMonth(start.getMonth() + selectedPlan.durationMonths));
        this.convertForm.patchValue({
          endDate: this.formatDate(end)
        }, { emitEvent: false });
      }
    }
  }

  updatePTPlanDetails(): void {
    if (!this.convertForm) return;
    const ptPlanId = this.convertForm.get('ptPlanId')?.value;
    if (ptPlanId && this.convertForm.get('interestedInPT')?.value === 'Yes') {
      const selectedPlan = this.ptPlans.find(p => p.id === ptPlanId);
      if (selectedPlan) {
        this.selectedPTPlanPrice = selectedPlan.price;
        this.selectedPTPlanName = selectedPlan.name;
        return;
      }
    }
    this.selectedPTPlanPrice = 0;
    this.selectedPTPlanName = '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.convertForm.valid) {
      const formValue = this.convertForm.value;
      const selectedPlan = this.plans.find(p => p.id === formValue.planId);
      const selectedPTPlan = this.ptPlans.find(p => p.id === formValue.ptPlanId);
      const selectedTrainer = this.trainers.find(t => t.id === formValue.preferredTrainerId);
      
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

      const conversionDetails = {
        convertedBy: formValue.convertedBy,
        revenueGenerated: this.selectedPlanPrice + (formValue.interestedInPT === 'Yes' ? this.selectedPTPlanPrice : 0),
        commissionPercent: formValue.commissionPercent,
        paymentStatus: formValue.paymentStatus,
        paymentMethod: formValue.paymentMethod,
        paidAmount: formValue.paymentStatus === 'paid' ? (this.selectedPlanPrice + (formValue.interestedInPT === 'Yes' ? this.selectedPTPlanPrice : 0)) : 0,
        
        // PT Additions
        interestedInPT: formValue.interestedInPT,
        ptPlanId: formValue.ptPlanId,
        preferredTrainerId: formValue.preferredTrainerId,
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
