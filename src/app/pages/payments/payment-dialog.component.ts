import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MemberState } from '../../presentation/state/member.state';
import { Member } from '../../core/models/member.entity';

@Component({
  selector: 'app-payment-dialog',
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
    <h2 mat-dialog-title class="gradient-text dialogue-title">Record Payment Invoice</h2>
    
    <form [formGroup]="paymentForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        <div class="form-grid">
          <!-- Member Select -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Select Member</mat-label>
            <mat-select formControlName="memberId" (selectionChange)="onMemberSelect($event.value)">
              <mat-option *ngFor="let member of members" [value]="member.id">
                {{ member.name }} (Outstanding: ₹{{ member.balance }})
              </mat-option>
            </mat-select>
            <mat-error *ngIf="paymentForm.get('memberId')?.hasError('required')">Member selection is required</mat-error>
          </mat-form-field>

          <!-- Total Amount -->
          <mat-form-field appearance="outline">
            <mat-label>Total Amount (₹)</mat-label>
            <input matInput type="number" formControlName="amount" placeholder="0.00" (input)="updateDueCalculations()">
            <mat-error *ngIf="paymentForm.get('amount')?.hasError('required')">Amount is required</mat-error>
            <mat-error *ngIf="paymentForm.get('amount')?.hasError('min')">Amount must be greater than 0</mat-error>
          </mat-form-field>

          <!-- Paid Amount -->
          <mat-form-field appearance="outline">
            <mat-label>Paid Amount (₹)</mat-label>
            <input matInput type="number" formControlName="paidAmount" placeholder="0.00" (input)="updateDueCalculations()">
            <mat-error *ngIf="paymentForm.get('paidAmount')?.hasError('required')">Paid amount is required</mat-error>
            <mat-error *ngIf="paymentForm.get('paidAmount')?.hasError('min')">Paid amount must be 0 or greater</mat-error>
            <mat-error *ngIf="paymentForm.get('paidAmount')?.hasError('max')">Paid amount cannot exceed total amount</mat-error>
          </mat-form-field>

          <!-- Due Amount (Read-only) -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Due Amount (₹)</mat-label>
            <input matInput type="number" formControlName="dueAmount" [readonly]="true">
          </mat-form-field>

          <!-- Invoice Date -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Invoice/Billing Date</mat-label>
            <input matInput [matDatepicker]="datePicker" formControlName="date">
            <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
            <mat-datepicker #datePicker></mat-datepicker>
            <mat-error *ngIf="paymentForm.get('date')?.hasError('required')">Invoice date is required</mat-error>
          </mat-form-field>

          <!-- Due Date (shown only if dueAmount > 0) -->
          <mat-form-field appearance="outline" class="full-width" *ngIf="showDueDateField">
            <mat-label>Payment Due Date</mat-label>
            <input matInput [matDatepicker]="dueDatePicker" formControlName="dueDate">
            <mat-datepicker-toggle matSuffix [for]="dueDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #dueDatePicker></mat-datepicker>
            <mat-error *ngIf="paymentForm.get('dueDate')?.hasError('required')">Due date is required for pending balance</mat-error>
          </mat-form-field>

          <!-- Select Status -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Invoice Status</mat-label>
            <mat-select formControlName="status" (selectionChange)="updateDueCalculations()">
              <mat-option value="paid">Paid / Settled</mat-option>
              <mat-option value="pending">Pending</mat-option>
              <mat-option value="overdue">Overdue</mat-option>
            </mat-select>
            <mat-error *ngIf="paymentForm.get('status')?.hasError('required')">Status is required</mat-error>
          </mat-form-field>

          <!-- Payment Method -->
          <mat-form-field appearance="outline" class="full-width" *ngIf="paymentForm.get('paidAmount')?.value > 0 || paymentForm.get('status')?.value === 'paid'">
            <mat-label>Payment Method</mat-label>
            <mat-select formControlName="paymentMethod">
              <mat-option value="UPI">UPI</mat-option>
              <mat-option value="Cash">Cash</mat-option>
              <mat-option value="Card">Card</mat-option>
              <mat-option value="Net Banking">Net Banking</mat-option>
            </mat-select>
            <mat-error *ngIf="paymentForm.get('paymentMethod')?.hasError('required')">Payment method is required</mat-error>
          </mat-form-field>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="paymentForm.invalid">
          Record Payment
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
    .full-width {
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
      .full-width {
        grid-column: span 1;
      }
    }
  `]
})
export class PaymentDialogComponent implements OnInit {
  paymentForm!: FormGroup;
  members: Member[] = [];
  showDueDateField = false;

  constructor(
    private fb: FormBuilder,
    private memberState: MemberState,
    private dialogRef: MatDialogRef<PaymentDialogComponent>
  ) {}

  ngOnInit(): void {
    // Load members
    this.memberState.members$.subscribe(members => {
      this.members = members.filter(m => m.status !== 'inactive');
    });

    this.paymentForm = this.fb.group({
      memberId: ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(1)]],
      paidAmount: ['', [Validators.required, Validators.min(0)]],
      dueAmount: [{ value: 0, disabled: true }],
      dueDate: [new Date()],
      date: [new Date(), [Validators.required]],
      status: ['paid', [Validators.required]],
      paymentMethod: ['UPI']
    });
  }

  onMemberSelect(memberId: string): void {
    const selectedMember = this.members.find(m => m.id === memberId);
    if (selectedMember) {
      const price = selectedMember.balance > 0 ? selectedMember.balance : 1500;
      this.paymentForm.get('amount')?.setValue(price);
      this.paymentForm.get('paidAmount')?.setValue(price);
      this.updateDueCalculations();
    }
  }

  updateDueCalculations(): void {
    const amount = Number(this.paymentForm.get('amount')?.value || 0);
    const paid = Number(this.paymentForm.get('paidAmount')?.value || 0);
    const status = this.paymentForm.get('status')?.value;

    this.paymentForm.get('paidAmount')?.setValidators([
      Validators.required,
      Validators.min(0),
      Validators.max(amount)
    ]);
    this.paymentForm.get('paidAmount')?.updateValueAndValidity({ emitEvent: false });

    const due = Math.max(0, amount - paid);
    this.paymentForm.get('dueAmount')?.setValue(due);

    if (due > 0) {
      this.showDueDateField = true;
      this.paymentForm.get('dueDate')?.setValidators([Validators.required]);
      if (status === 'paid') {
        this.paymentForm.get('status')?.setValue('pending');
      }
    } else {
      this.showDueDateField = false;
      this.paymentForm.get('dueDate')?.clearValidators();
      if (status !== 'paid') {
        this.paymentForm.get('status')?.setValue('paid');
      }
    }

    if (this.paymentForm.get('status')?.value === 'paid' || paid > 0) {
      this.paymentForm.get('paymentMethod')?.setValidators([Validators.required]);
    } else {
      this.paymentForm.get('paymentMethod')?.clearValidators();
    }

    this.paymentForm.get('dueDate')?.updateValueAndValidity();
    this.paymentForm.get('status')?.updateValueAndValidity();
    this.paymentForm.get('paymentMethod')?.updateValueAndValidity();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.paymentForm.valid) {
      const formValue = this.paymentForm.getRawValue();
      const member = this.members.find(m => m.id === formValue.memberId);
      
      const paymentResult = {
        memberId: formValue.memberId,
        memberName: member ? member.name : 'Unknown Member',
        amount: formValue.amount,
        paidAmount: formValue.paidAmount,
        dueAmount: formValue.dueAmount,
        dueDate: this.formatDate(formValue.dueDate || new Date()),
        date: this.formatDate(formValue.date),
        status: formValue.status,
        planName: member ? member.planName : 'Custom Plan',
        paymentMethod: formValue.paidAmount > 0 || formValue.status === 'paid' ? (formValue.paymentMethod || 'UPI') : 'Pending',
        collectedBy: 'Sophia Chen'
      };

      this.dialogRef.close(paymentResult);
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
