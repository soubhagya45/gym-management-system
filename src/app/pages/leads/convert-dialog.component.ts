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
import { Lead, MembershipPlan, Member } from '../../interfaces/gym.model';
import { GymService } from '../../services/gym.service';

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
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title class="gradient-text dialogue-title">
      Convert Lead to Member: {{ data.name }}
    </h2>
    
    <form [formGroup]="convertForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        <p class="dialog-desc">Complete membership details to convert this lead to an active member.</p>
        
        <div class="form-grid">
          <!-- Plan Selection -->
          <mat-form-field appearance="outline">
            <mat-label>Membership Plan</mat-label>
            <mat-select formControlName="planId">
              <mat-option *ngFor="let plan of plans" [value]="plan.id">
                {{ plan.name }} (\${{ plan.price }})
              </mat-option>
            </mat-select>
            <mat-error *ngIf="convertForm.get('planId')?.hasError('required')">Membership Plan is required</mat-error>
          </mat-form-field>

          <!-- Status -->
          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
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
          <mat-form-field appearance="outline" class="goal-field">
            <mat-label>Fitness Goal</mat-label>
            <input matInput formControlName="fitnessGoal" placeholder="e.g. Weight Loss, Muscle Gain">
          </mat-form-field>
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
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .goal-field {
      grid-column: span 2;
    }
    .dialog-actions {
      padding: 16px 0 0 0 !important;
      gap: 8px;
    }
    
    @media (max-width: 599.98px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      .goal-field {
        grid-column: span 1;
      }
    }
  `]
})
export class ConvertDialogComponent implements OnInit {
  convertForm!: FormGroup;
  plans: MembershipPlan[] = [];

  constructor(
    private fb: FormBuilder,
    private gymService: GymService,
    private dialogRef: MatDialogRef<ConvertDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Lead
  ) {}

  ngOnInit(): void {
    // Load available plans from service
    this.gymService.plans$.subscribe(plans => this.plans = plans);

    // Attempt to match lead's interested plan to a plan ID
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
    
    this.convertForm = this.fb.group({
      planId: [matchedPlanId, [Validators.required]],
      status: ['active', [Validators.required]],
      startDate: [today, [Validators.required]],
      endDate: ['', [Validators.required]],
      gender: ['Male', [Validators.required]],
      age: [25, [Validators.required, Validators.min(10)]],
      height: [175, [Validators.required, Validators.min(50)]],
      weight: [70, [Validators.required, Validators.min(20)]],
      fitnessGoal: ['General Fitness', [Validators.required]]
    });

    // Reactive listener to update endDate automatically
    this.convertForm.get('planId')?.valueChanges.subscribe(() => this.updateEndDate());
    this.convertForm.get('startDate')?.valueChanges.subscribe(() => this.updateEndDate());

    // Run once at start to compute initial end date
    this.updateEndDate();
  }

  updateEndDate(): void {
    const startDateVal = this.convertForm.get('startDate')?.value;
    const planIdVal = this.convertForm.get('planId')?.value;
    if (startDateVal && planIdVal) {
      const selectedPlan = this.plans.find(p => p.id === planIdVal);
      if (selectedPlan) {
        const start = new Date(startDateVal);
        const end = new Date(start.setMonth(start.getMonth() + selectedPlan.durationMonths));
        this.convertForm.patchValue({
          endDate: this.formatDate(end)
        }, { emitEvent: false });
      }
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.convertForm.valid) {
      const formValue = this.convertForm.value;
      const selectedPlan = this.plans.find(p => p.id === formValue.planId);
      
      const memberDetails: Omit<Member, 'id' | 'attendanceCount' | 'balance'> = {
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
        fitnessGoal: formValue.fitnessGoal,
        avatarUrl: `https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150` // placeholder avatar
      };

      this.dialogRef.close(memberDetails);
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
