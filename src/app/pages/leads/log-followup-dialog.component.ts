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
import { EmployeeState } from '../../presentation/state/employee.state';
import { Employee } from '../../core/models/employee.entity';
import { Lead } from '../../core/models/lead.entity';

@Component({
  selector: 'app-log-followup-dialog',
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
      Log Lead Follow-Up: {{ data.name }}
    </h2>
    
    <form [formGroup]="followUpForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        <p class="dialog-desc">Log interaction details and schedule the next follow-up call.</p>
        
        <div class="form-grid">
          <!-- Date -->
          <mat-form-field appearance="outline">
            <mat-label>Follow-Up Date</mat-label>
            <input matInput [matDatepicker]="datePicker" formControlName="date">
            <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
            <mat-datepicker #datePicker></mat-datepicker>
            <mat-error *ngIf="followUpForm.get('date')?.hasError('required')">Date is required</mat-error>
          </mat-form-field>

          <!-- Employee (Salesperson) -->
          <mat-form-field appearance="outline">
            <mat-label>Staff / Employee</mat-label>
            <mat-select formControlName="employeeId">
              <mat-option *ngFor="let emp of employees" [value]="emp.id">
                {{ emp.fullName }} ({{ emp.role | titlecase }})
              </mat-option>
            </mat-select>
            <mat-error *ngIf="followUpForm.get('employeeId')?.hasError('required')">Employee is required</mat-error>
          </mat-form-field>

          <!-- Next Follow Up Date -->
          <mat-form-field appearance="outline">
            <mat-label>Next Follow-Up Date</mat-label>
            <input matInput [matDatepicker]="nextPicker" formControlName="nextFollowUpDate">
            <mat-datepicker-toggle matSuffix [for]="nextPicker"></mat-datepicker-toggle>
            <mat-datepicker #nextPicker></mat-datepicker>
          </mat-form-field>
        </div>

        <!-- Notes -->
        <mat-form-field appearance="outline" style="width: 100%;">
          <mat-label>Interaction Notes</mat-label>
          <textarea matInput formControlName="notes" rows="4" placeholder="Detail the call discussion, interest levels, objections raised..."></textarea>
          <mat-error *ngIf="followUpForm.get('notes')?.hasError('required')">Notes are required</mat-error>
        </mat-form-field>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="followUpForm.invalid">
          <mat-icon>check</mat-icon>
          <span>Log Interaction</span>
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
export class LogFollowUpDialogComponent implements OnInit {
  followUpForm!: FormGroup;
  employees: Employee[] = [];

  constructor(
    private fb: FormBuilder,
    private employeeState: EmployeeState,
    private dialogRef: MatDialogRef<LogFollowUpDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Lead
  ) {}

  ngOnInit(): void {
    this.employeeState.employees$.subscribe(employees => {
      this.employees = employees.filter(e => e.accountStatus === 'Active');
    });

    const today = new Date();
    const defaultNext = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // Prefill default salesperson if lead has one assigned
    let defaultEmpId = '';
    if (this.data.assignedEmployee) {
      defaultEmpId = this.data.assignedEmployee;
    } else if (this.data.leadOwner) {
      defaultEmpId = this.data.leadOwner;
    }

    this.followUpForm = this.fb.group({
      date: [today, [Validators.required]],
      employeeId: [defaultEmpId, [Validators.required]],
      notes: ['', [Validators.required]],
      nextFollowUpDate: [defaultNext]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.followUpForm.valid) {
      const val = this.followUpForm.value;
      const emp = this.employees.find(e => e.id === val.employeeId);
      
      this.dialogRef.close({
        date: this.formatDate(val.date),
        employeeId: val.employeeId,
        employeeName: emp ? emp.fullName : 'Unknown Staff',
        notes: val.notes,
        nextFollowUpDate: val.nextFollowUpDate ? this.formatDate(val.nextFollowUpDate) : ''
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
