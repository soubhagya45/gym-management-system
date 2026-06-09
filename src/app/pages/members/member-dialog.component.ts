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
import { MembershipPlanState } from '../../presentation/state/membership-plan.state';
import { Member } from '../../core/models/member.entity';
import { MembershipPlan } from '../../core/models/membership-plan.entity';

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
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title class="gradient-text dialogue-title">
      {{ isEdit ? 'Edit Member Profile' : 'Add New Gym Member' }}
    </h2>
    
    <form [formGroup]="memberForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        <!-- Profile Image Display & Avatar URL selection -->
        <div class="avatar-select-section">
          <div class="avatar-preview">
            <img [src]="selectedAvatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'" alt="Avatar Preview">
          </div>
          <div class="avatar-inputs">
            <mat-form-field appearance="outline">
              <mat-label>Avatar Image URL</mat-label>
              <input matInput placeholder="Unsplash URL" (input)="onAvatarChange($event)" formControlName="avatarUrl">
              <mat-hint>Paste an image URL or leave blank for default</mat-hint>
            </mat-form-field>
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

          <!-- Starting Weight -->
          <mat-form-field appearance="outline">
            <mat-label>Starting Weight (kg)</mat-label>
            <input matInput type="number" formControlName="startingWeight" placeholder="80">
            <mat-error *ngIf="memberForm.get('startingWeight')?.hasError('min')">Starting weight must be at least 10 kg</mat-error>
          </mat-form-field>

          <!-- Goal Weight -->
          <mat-form-field appearance="outline">
            <mat-label>Goal Weight (kg)</mat-label>
            <input matInput type="number" formControlName="goalWeight" placeholder="75">
            <mat-error *ngIf="memberForm.get('goalWeight')?.hasError('min')">Goal weight must be at least 10 kg</mat-error>
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
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="memberForm.invalid">
          {{ isEdit ? 'Save Changes' : 'Register Member' }}
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
  selectedAvatarUrl = '';

  constructor(
    private fb: FormBuilder,
    private planState: MembershipPlanState,
    private dialogRef: MatDialogRef<MemberDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Member | null
  ) {}

  ngOnInit(): void {
    // 1. Fetch available plans
    this.planState.plans$.subscribe(plans => {
      this.plans = plans;
      if (!this.data && plans.length > 0) {
        // Auto-set the initial plan and end date based on first plan
        const defaultPlanId = plans[0].id;
        this.memberForm.patchValue({ planId: defaultPlanId });
        this.onPlanChange(defaultPlanId);
      }
    });

    this.isEdit = !!this.data;
    this.selectedAvatarUrl = this.data?.avatarUrl || '';

    // Convert string dates to Date objects for datepicker
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
      startingWeight: [this.data?.startingWeight || '', [Validators.min(10), Validators.max(300)]],
      goalWeight: [this.data?.goalWeight || '', [Validators.min(10), Validators.max(300)]],
      fitnessGoal: [this.data?.fitnessGoal || 'General Fitness', [Validators.required]]
    });
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
    const selectedPlan = this.plans.find(p => p.id === planId) || { durationMonths: 1 };
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + selectedPlan.durationMonths);
    return endDate;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.memberForm.valid) {
      const formValue = this.memberForm.value;
      const planName = this.plans.find(p => p.id === formValue.planId)?.name || 'Custom Plan';
      
      // Format dates back to string format
      const formattedMember = {
        ...formValue,
        planName,
        startDate: this.formatDate(formValue.startDate),
        endDate: this.formatDate(formValue.endDate)
      };

      if (this.isEdit && this.data) {
        this.dialogRef.close({
          ...this.data,
          ...formattedMember
        });
      } else {
        this.dialogRef.close(formattedMember);
      }
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
