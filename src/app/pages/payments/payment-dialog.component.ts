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
import { GymService } from '../../services/gym.service';
import { Member } from '../../interfaces/gym.model';

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
                {{ member.name }} (Outstanding: \${{ member.balance }})
              </mat-option>
            </mat-select>
            <mat-error *ngIf="paymentForm.get('memberId')?.hasError('required')">Member selection is required</mat-error>
          </mat-form-field>

          <!-- Amount -->
          <mat-form-field appearance="outline">
            <mat-label>Amount ($)</mat-label>
            <input matInput type="number" formControlName="amount" placeholder="0.00">
            <mat-error *ngIf="paymentForm.get('amount')?.hasError('required')">Amount is required</mat-error>
            <mat-error *ngIf="paymentForm.get('amount')?.hasError('min')">Amount must be greater than 0</mat-error>
          </mat-form-field>

          <!-- Status -->
          <mat-form-field appearance="outline">
            <mat-label>Payment Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="paid">Paid / Confirmed</mat-option>
              <mat-option value="pending">Pending Verification</mat-option>
            </mat-select>
            <mat-error *ngIf="paymentForm.get('status')?.hasError('required')">Status is required</mat-error>
          </mat-form-field>

          <!-- Payment Date -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Invoice/Payment Date</mat-label>
            <input matInput [matDatepicker]="datePicker" formControlName="date">
            <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
            <mat-datepicker #datePicker></mat-datepicker>
            <mat-error *ngIf="paymentForm.get('date')?.hasError('required')">Date is required</mat-error>
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

  constructor(
    private fb: FormBuilder,
    private gymService: GymService,
    private dialogRef: MatDialogRef<PaymentDialogComponent>
  ) {}

  ngOnInit(): void {
    // Load members
    this.gymService.members$.subscribe(members => {
      // Show members who are not inactive
      this.members = members.filter(m => m.status !== 'inactive');
    });

    this.paymentForm = this.fb.group({
      memberId: ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(1)]],
      status: ['paid', [Validators.required]],
      date: [new Date(), [Validators.required]]
    });
  }

  onMemberSelect(memberId: string): void {
    const selectedMember = this.members.find(m => m.id === memberId);
    if (selectedMember) {
      // If outstanding balance is > 0, set that as amount, otherwise set plan price or default to 49
      const price = selectedMember.balance > 0 ? selectedMember.balance : 49;
      this.paymentForm.get('amount')?.setValue(price);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.paymentForm.valid) {
      const formValue = this.paymentForm.value;
      const member = this.members.find(m => m.id === formValue.memberId);
      
      const paymentResult = {
        memberId: formValue.memberId,
        memberName: member ? member.name : 'Unknown Member',
        amount: formValue.amount,
        status: formValue.status,
        planName: member ? member.planName : 'Custom Plan',
        date: this.formatDate(formValue.date)
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
