import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Expense, ExpenseCategory } from '../../../core/models/finance.entity';

@Component({
  selector: 'app-expense-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <div class="dialog-container dark-theme-dialog">
      <h2 mat-dialog-title class="dialog-title">
        <mat-icon>{{ isEditMode ? 'edit' : 'add_circle' }}</mat-icon>
        <span>{{ isEditMode ? 'Edit Expense' : 'Record Expense' }}</span>
      </h2>
      
      <form [formGroup]="expenseForm" (ngSubmit)="onSubmit()">
        <mat-dialog-content class="dialog-content">
          <!-- Expense Title -->
          <mat-form-field appearance="outline">
            <mat-label>Expense Title</mat-label>
            <input matInput formControlName="title" placeholder="e.g. June Electricity Bill">
            <mat-error *ngIf="expenseForm.get('title')?.hasError('required')">Title is required</mat-error>
          </mat-form-field>

          <!-- Category and Amount -->
          <div class="row">
            <mat-form-field appearance="outline" class="col-half">
              <mat-label>Category</mat-label>
              <mat-select formControlName="category">
                <mat-option *ngFor="let cat of categories" [value]="cat">{{ cat }}</mat-option>
              </mat-select>
              <mat-error *ngIf="expenseForm.get('category')?.hasError('required')">Category is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="col-half">
              <mat-label>Amount (₹)</mat-label>
              <input matInput type="number" formControlName="amount" placeholder="0">
              <mat-error *ngIf="expenseForm.get('amount')?.hasError('required')">Amount is required</mat-error>
              <mat-error *ngIf="expenseForm.get('amount')?.hasError('min')">Amount must be greater than zero</mat-error>
            </mat-form-field>
          </div>

          <!-- Date -->
          <mat-form-field appearance="outline">
            <mat-label>Expense Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="date">
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error *ngIf="expenseForm.get('date')?.hasError('required')">Date is required</mat-error>
          </mat-form-field>

          <!-- Notes -->
          <mat-form-field appearance="outline">
            <mat-label>Notes (Optional)</mat-label>
            <textarea matInput formControlName="notes" rows="3" placeholder="Add additional billing details..."></textarea>
          </mat-form-field>
        </mat-dialog-content>

        <mat-dialog-actions class="dialog-actions">
          <button mat-button type="button" (click)="dialogRef.close()">Cancel</button>
          <button mat-flat-button color="accent" type="submit" [disabled]="expenseForm.invalid">
            Save Expense
          </button>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container {
      font-family: 'Outfit', sans-serif;
    }

    .dialog-title {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 20px;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 20px !important;
      
      mat-icon {
        color: var(--accent-color);
      }
    }

    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 0 !important;
      overflow-x: hidden;
    }

    .row {
      display: flex;
      gap: 16px;
    }

    .col-half {
      flex: 1;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 24px;
      margin-bottom: 0;
    }
  `]
})
export class ExpenseDialogComponent implements OnInit {
  expenseForm!: FormGroup;
  isEditMode = false;
  categories: ExpenseCategory[] = [
    'Rent',
    'Electricity',
    'Water',
    'Equipment',
    'Maintenance',
    'Salaries',
    'Marketing',
    'Miscellaneous'
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<ExpenseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { expense?: Expense; mode: 'add' | 'edit' }
  ) {}

  ngOnInit(): void {
    this.isEditMode = this.data.mode === 'edit';
    const expense = this.data.expense;

    this.expenseForm = this.fb.group({
      title: [expense?.title || '', Validators.required],
      category: [expense?.category || '', Validators.required],
      amount: [expense?.amount || null, [Validators.required, Validators.min(0.01)]],
      date: [expense?.date ? new Date(expense.date) : new Date(), Validators.required],
      notes: [expense?.notes || '']
    });
  }

  onSubmit(): void {
    if (this.expenseForm.valid) {
      const formVal = this.expenseForm.value;
      // Convert date to ISO split string
      const dateStr = formVal.date instanceof Date 
        ? formVal.date.toISOString().split('T')[0]
        : new Date(formVal.date).toISOString().split('T')[0];

      const result = {
        ...formVal,
        date: dateStr
      };

      this.dialogRef.close(result);
    }
  }
}
