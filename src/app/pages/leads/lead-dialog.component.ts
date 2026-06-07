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
import { Lead } from '../../interfaces/gym.model';

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
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title class="gradient-text dialogue-title">
      {{ isEdit ? 'Edit Lead Details' : 'Add New Lead' }}
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
            <input matInput formControlName="phone" placeholder="+1 (555) 000-0000">
            <mat-error *ngIf="leadForm.get('phone')?.hasError('required')">Phone is required</mat-error>
          </mat-form-field>

          <!-- Trial Date -->
          <mat-form-field appearance="outline">
            <mat-label>Trial Date</mat-label>
            <input matInput [matDatepicker]="trialPicker" formControlName="trialDate">
            <mat-datepicker-toggle matSuffix [for]="trialPicker"></mat-datepicker-toggle>
            <mat-datepicker #trialPicker></mat-datepicker>
            <mat-error *ngIf="leadForm.get('trialDate')?.hasError('required')">Trial date is required</mat-error>
          </mat-form-field>

          <!-- Follow Up Date -->
          <mat-form-field appearance="outline">
            <mat-label>Follow Up Date</mat-label>
            <input matInput [matDatepicker]="followUpPicker" formControlName="followUpDate">
            <mat-datepicker-toggle matSuffix [for]="followUpPicker"></mat-datepicker-toggle>
            <mat-datepicker #followUpPicker></mat-datepicker>
            <mat-error *ngIf="leadForm.get('followUpDate')?.hasError('required')">Follow up date is required</mat-error>
          </mat-form-field>

          <!-- Lead Source -->
          <mat-form-field appearance="outline">
            <mat-label>Lead Source</mat-label>
            <mat-select formControlName="leadSource">
              <mat-option value="Website">Website</mat-option>
              <mat-option value="Social Media">Social Media</mat-option>
              <mat-option value="Referral">Referral</mat-option>
              <mat-option value="Walk-in">Walk-in</mat-option>
              <mat-option value="Other">Other</mat-option>
            </mat-select>
            <mat-error *ngIf="leadForm.get('leadSource')?.hasError('required')">Lead source is required</mat-error>
          </mat-form-field>

          <!-- Status -->
          <mat-form-field appearance="outline">
            <mat-label>Lead Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="New Lead">New Lead</mat-option>
              <mat-option value="Trial Booked">Trial Booked</mat-option>
              <mat-option value="Follow Up">Follow Up</mat-option>
              <mat-option value="Converted">Converted</mat-option>
              <mat-option value="Lost">Lost</mat-option>
            </mat-select>
            <mat-error *ngIf="leadForm.get('status')?.hasError('required')">Status is required</mat-error>
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
export class LeadDialogComponent implements OnInit {
  leadForm!: FormGroup;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<LeadDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Lead | null
  ) {}

  ngOnInit(): void {
    this.isEdit = !!this.data;

    const trialVal = this.data ? new Date(this.data.trialDate) : new Date();
    const followVal = this.data ? new Date(this.data.followUpDate) : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    this.leadForm = this.fb.group({
      name: [this.data?.name || '', [Validators.required]],
      phone: [this.data?.phone || '', [Validators.required]],
      trialDate: [trialVal, [Validators.required]],
      leadSource: [this.data?.leadSource || 'Website', [Validators.required]],
      followUpDate: [followVal, [Validators.required]],
      status: [this.data?.status || 'New Lead', [Validators.required]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.leadForm.valid) {
      const formValue = this.leadForm.value;
      const formattedLead = {
        ...formValue,
        trialDate: this.formatDate(formValue.trialDate),
        followUpDate: this.formatDate(formValue.followUpDate)
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
