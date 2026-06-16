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
import { Lead } from '../../core/models/lead.entity';
import { MembershipPlan } from '../../core/models/membership-plan.entity';
import { Employee } from '../../core/models/employee.entity';
import { MembershipPlanState } from '../../presentation/state/membership-plan.state';
import { EmployeeState } from '../../presentation/state/employee.state';

@Component({
  selector: 'app-lead-dialog',
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
      {{ isEdit ? 'Edit CRM Lead: ' + data?.name : 'Add New CRM Lead' }}
    </h2>
    
    <form [formGroup]="leadForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        <div class="form-grid">
          <!-- Name -->
          <mat-form-field appearance="outline">
            <mat-label>Full Name</mat-label>
            <input matInput formControlName="name" placeholder="John Doe">
            <mat-error *ngIf="leadForm.get('name')?.hasError('required')">Name is required</mat-error>
          </mat-form-field>

          <!-- Phone -->
          <mat-form-field appearance="outline">
            <mat-label>Phone Number</mat-label>
            <input matInput formControlName="phone" placeholder="+91 XXXXX XXXXX">
            <mat-error *ngIf="leadForm.get('phone')?.hasError('required')">Phone is required</mat-error>
          </mat-form-field>

          <!-- Email -->
          <mat-form-field appearance="outline">
            <mat-label>Email Address</mat-label>
            <input matInput type="email" formControlName="email" placeholder="john.doe@example.com">
            <mat-error *ngIf="leadForm.get('email')?.hasError('required')">Email is required</mat-error>
            <mat-error *ngIf="leadForm.get('email')?.hasError('email')">Invalid email address</mat-error>
          </mat-form-field>

          <!-- Fitness Goal -->
          <mat-form-field appearance="outline">
            <mat-label>Fitness Goal(s)</mat-label>
            <mat-select formControlName="fitnessGoal" multiple>
              <mat-option *ngFor="let goal of fitnessGoalOptions" [value]="goal">{{ goal }}</mat-option>
            </mat-select>
            <mat-error *ngIf="leadForm.get('fitnessGoal')?.hasError('required')">Fitness goal is required</mat-error>
          </mat-form-field>

          <!-- Lead Source -->
          <mat-form-field appearance="outline">
            <mat-label>Lead Source</mat-label>
            <mat-select formControlName="leadSource">
              <mat-option value="Walk-In">Walk-In</mat-option>
              <mat-option value="Website">Website</mat-option>
              <mat-option value="Instagram">Instagram</mat-option>
              <mat-option value="Facebook">Facebook</mat-option>
              <mat-option value="Google Ads">Google Ads</mat-option>
              <mat-option value="WhatsApp">WhatsApp</mat-option>
              <mat-option value="Referral">Referral</mat-option>
              <mat-option value="Existing Member Referral">Existing Member Referral</mat-option>
              <mat-option value="Trainer Referral">Trainer Referral</mat-option>
              <mat-option value="Other">Other</mat-option>
            </mat-select>
            <mat-error *ngIf="leadForm.get('leadSource')?.hasError('required')">Lead source is required</mat-error>
          </mat-form-field>

          <!-- Referral details -->
          <mat-form-field appearance="outline" *ngIf="['Referral', 'Existing Member Referral', 'Trainer Referral'].includes(leadForm.get('leadSource')?.value)">
            <mat-label>Referral Details</mat-label>
            <input matInput formControlName="referralSource" placeholder="Referred by who?">
          </mat-form-field>

          <!-- Trial Date -->
          <mat-form-field appearance="outline">
            <mat-label>Trial Date</mat-label>
            <input matInput [matDatepicker]="trialPicker" formControlName="trialDate">
            <mat-datepicker-toggle matSuffix [for]="trialPicker"></mat-datepicker-toggle>
            <mat-datepicker #trialPicker></mat-datepicker>
            <mat-error *ngIf="leadForm.get('trialDate')?.hasError('required')">Trial date is required</mat-error>
          </mat-form-field>

          <!-- Trial Status -->
          <mat-form-field appearance="outline">
            <mat-label>Trial Status</mat-label>
            <mat-select formControlName="trialStatus">
              <mat-option value="Not Scheduled">Not Scheduled</mat-option>
              <mat-option value="Scheduled">Scheduled</mat-option>
              <mat-option value="Attended">Attended</mat-option>
              <mat-option value="No Show">No Show</mat-option>
              <mat-option value="Converted After Trial">Converted After Trial</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Last Follow Up Date -->
          <mat-form-field appearance="outline">
            <mat-label>Last Follow Up Date</mat-label>
            <input matInput [matDatepicker]="lastPicker" formControlName="lastFollowUp">
            <mat-datepicker-toggle matSuffix [for]="lastPicker"></mat-datepicker-toggle>
            <mat-datepicker #lastPicker></mat-datepicker>
          </mat-form-field>

          <!-- Next Follow Up Date -->
          <mat-form-field appearance="outline">
            <mat-label>Next Follow Up Date</mat-label>
            <input matInput [matDatepicker]="followUpPicker" formControlName="followUpDate">
            <mat-datepicker-toggle matSuffix [for]="followUpPicker"></mat-datepicker-toggle>
            <mat-datepicker #followUpPicker></mat-datepicker>
            <mat-error *ngIf="leadForm.get('followUpDate')?.hasError('required')">Follow up date is required</mat-error>
          </mat-form-field>

          <!-- Follow Up Status -->
          <mat-form-field appearance="outline">
            <mat-label>Follow Up Status</mat-label>
            <mat-select formControlName="followUpStatus">
              <mat-option value="Pending">Pending</mat-option>
              <mat-option value="Completed">Completed</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Lead Temperature -->
          <mat-form-field appearance="outline">
            <mat-label>Lead Temperature</mat-label>
            <mat-select formControlName="leadTemperature">
              <mat-option value="Hot">🔥 Hot Lead</mat-option>
              <mat-option value="Warm">🟡 Warm Lead</mat-option>
              <mat-option value="Cold">🔵 Cold Lead</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Interested Plan -->
          <mat-form-field appearance="outline">
            <mat-label>Interested Membership Plan</mat-label>
            <mat-select formControlName="interestedPlan">
              <mat-option *ngFor="let plan of plans" [value]="plan.name">{{ plan.name }} (₹{{ plan.price }})</mat-option>
            </mat-select>
            <mat-error *ngIf="leadForm.get('interestedPlan')?.hasError('required')">Interested plan is required</mat-error>
          </mat-form-field>

          <!-- Assigned Staff (Employee) -->
          <mat-form-field appearance="outline">
            <mat-label>Lead Owner (Employee)</mat-label>
            <mat-select formControlName="assignedEmployee">
              <mat-option value="">Unassigned</mat-option>
              <mat-option *ngFor="let emp of employees" [value]="emp.id">
                {{ emp.fullName }} ({{ emp.role === 'staff' ? 'Sales Executive' : emp.role | titlecase }})
              </mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Status -->
          <mat-form-field appearance="outline">
            <mat-label>Lead Stage</mat-label>
            <mat-select formControlName="status">
              <mat-option value="New">New</mat-option>
              <mat-option value="Contacted">Contacted</mat-option>
              <mat-option value="Follow Up">Follow Up</mat-option>
              <mat-option value="Trial Scheduled">Trial Scheduled</mat-option>
              <mat-option value="Trial Attended">Trial Attended</mat-option>
              <mat-option value="Negotiation">Negotiation</mat-option>
              <mat-option value="Converted">Converted</mat-option>
              <mat-option value="Lost">Lost</mat-option>
            </mat-select>
            <mat-error *ngIf="leadForm.get('status')?.hasError('required')">Status is required</mat-error>
          </mat-form-field>

          <!-- Reason Lost -->
          <mat-form-field appearance="outline" *ngIf="leadForm.get('status')?.value === 'Lost'">
            <mat-label>Reason Lost</mat-label>
            <mat-select formControlName="reasonLost">
              <mat-option *ngFor="let reason of lostReasonOptions" [value]="reason">{{ reason }}</mat-option>
            </mat-select>
            <mat-error *ngIf="leadForm.get('reasonLost')?.hasError('required')">Reason lost is required</mat-error>
          </mat-form-field>

          <!-- Follow-Up Notes -->
          <mat-form-field appearance="outline" class="notes-field">
            <mat-label>Follow-Up Notes</mat-label>
            <textarea matInput formControlName="followUpNotes" rows="2" placeholder="Add details from latest follow-up conversation..."></textarea>
          </mat-form-field>

          <!-- Notes -->
          <mat-form-field appearance="outline" class="notes-field">
            <mat-label>General Notes & CRM Requirements</mat-label>
            <textarea matInput formControlName="notes" rows="2" placeholder="Add custom notes, fitness level, schedule preferences..."></textarea>
          </mat-form-field>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="leadForm.invalid">
          {{ isEdit ? 'Save Changes' : 'Add Lead' }}
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
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .notes-field {
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
      .notes-field {
        grid-column: span 1;
      }
    }
  `]
})
export class LeadDialogComponent implements OnInit {
  leadForm!: FormGroup;
  isEdit = false;
  plans: MembershipPlan[] = [];
  employees: Employee[] = [];

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

  lostReasonOptions: string[] = [
    'Too Expensive',
    'Joined Another Gym',
    'Location Too Far',
    'No Time',
    'Not Interested',
    'Medical Reasons',
    'Moved Location',
    'Other'
  ];

  constructor(
    private fb: FormBuilder,
    private planState: MembershipPlanState,
    private employeeState: EmployeeState,
    private dialogRef: MatDialogRef<LeadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Lead | null
  ) { }

  ngOnInit(): void {
    this.isEdit = !!this.data;

    this.planState.plans$.subscribe(plans => this.plans = plans);
    this.employeeState.employees$.subscribe(employees => this.employees = employees.filter(e => e.accountStatus === 'Active'));

    const trialVal = this.data ? new Date(this.data.trialDate) : new Date();
    const followVal = this.data ? new Date(this.data.followUpDate) : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const lastFollowVal = this.data && this.data.lastFollowUp ? new Date(this.data.lastFollowUp) : '';

    let initialGoals: string[] = [];
    if (this.data?.fitnessGoal) {
      if (Array.isArray(this.data.fitnessGoal)) {
        initialGoals = this.data.fitnessGoal;
      } else {
        initialGoals = this.data.fitnessGoal.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    if (initialGoals.length === 0) {
      initialGoals = ['General Fitness'];
    }

    this.leadForm = this.fb.group({
      name: [this.data?.name || '', [Validators.required]],
      phone: [this.data?.phone || '', [Validators.required]],
      email: [this.data?.email || '', [Validators.required, Validators.email]],
      trialDate: [trialVal, [Validators.required]],
      leadSource: [this.data?.leadSource || 'Website', [Validators.required]],
      followUpDate: [followVal, [Validators.required]],
      interestedPlan: [this.data?.interestedPlan || '', [Validators.required]],
      assignedEmployee: [this.data?.assignedEmployee || ''],
      status: [this.data?.status || 'New', [Validators.required]],
      
      // CRM Details
      leadTemperature: [this.data?.leadTemperature || 'Hot', [Validators.required]],
      fitnessGoal: [initialGoals, [Validators.required]],
      referralSource: [this.data?.referralSource || ''],
      trialStatus: [this.data?.trialStatus || 'Not Scheduled', [Validators.required]],
      lastFollowUp: [lastFollowVal],
      followUpStatus: [this.data?.followUpStatus || 'Pending', [Validators.required]],
      followUpNotes: [this.data?.followUpNotes || ''],
      reasonLost: [this.data?.reasonLost || ''],
      notes: [this.data?.notes || '']
    });

    // Handle conditional validation for Lost Reason
    this.leadForm.get('status')?.valueChanges.subscribe(status => {
      const reasonCtrl = this.leadForm.get('reasonLost');
      if (status === 'Lost') {
        reasonCtrl?.setValidators([Validators.required]);
      } else {
        reasonCtrl?.clearValidators();
        reasonCtrl?.setValue('');
      }
      reasonCtrl?.updateValueAndValidity();
    });

    // Run once at start to bind initially if status = Lost
    if (this.data?.status === 'Lost') {
      this.leadForm.get('reasonLost')?.setValidators([Validators.required]);
      this.leadForm.get('reasonLost')?.updateValueAndValidity();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.leadForm.valid) {
      const formValue = this.leadForm.value;
      const assignedEmp = this.employees.find(e => e.id === formValue.assignedEmployee);

      const formattedLead = {
        ...formValue,
        trialDate: this.formatDate(formValue.trialDate),
        followUpDate: this.formatDate(formValue.followUpDate),
        nextFollowUp: this.formatDate(formValue.followUpDate),
        lastFollowUp: formValue.lastFollowUp ? this.formatDate(formValue.lastFollowUp) : '',
        assignedStaff: assignedEmp ? assignedEmp.fullName : '',
        assignedEmployeeName: assignedEmp ? assignedEmp.fullName : '',
        leadOwner: assignedEmp ? assignedEmp.id : '',
        reasonLost: formValue.status === 'Lost' ? formValue.reasonLost : ''
      };

      if (this.isEdit && this.data) {
        this.dialogRef.close({
          ...this.data,
          ...formattedLead
        });
      } else {
        this.dialogRef.close(formattedLead);
      }
    }
  }

  private formatDate(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }
}
