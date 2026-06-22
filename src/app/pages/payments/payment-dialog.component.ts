import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MemberState } from '../../presentation/state/member.state';
import { Member } from '../../core/models/member.entity';
import { SubmissionGuardService } from '../../services/submission-guard.service';
import { PAYMENT_SETTINGS_REPOSITORY_TOKEN, IPaymentSettingsRepository } from '../../core/interfaces/repository.interfaces';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { BillingCalculationService } from '../../services/billing-calculation.service';
import { PaymentGatewayModalComponent } from '../../shared/components/payment-gateway-modal/payment-gateway-modal.component';

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
    MatNativeDateModule,
    MatIconModule,
    MatDividerModule
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

          <!-- Original/Total Amount -->
          <mat-form-field appearance="outline">
            <mat-label>Original Amount (₹)</mat-label>
            <input matInput type="number" formControlName="amount" placeholder="0.00">
            <mat-error *ngIf="paymentForm.get('amount')?.hasError('required')">Amount is required</mat-error>
            <mat-error *ngIf="paymentForm.get('amount')?.hasError('min')">Amount must be greater than 0</mat-error>
          </mat-form-field>

          <!-- Discount Type -->
          <mat-form-field appearance="outline">
            <mat-label>Discount Type</mat-label>
            <mat-select formControlName="discountType">
              <mat-option value="none">No Discount</mat-option>
              <mat-option value="flat">Flat Discount (₹)</mat-option>
              <mat-option value="percentage">Percentage Discount (%)</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Discount Value -->
          <mat-form-field appearance="outline" *ngIf="paymentForm.get('discountType')?.value !== 'none'">
            <mat-label>{{ paymentForm.get('discountType')?.value === 'flat' ? 'Discount Amount (₹)' : 'Discount Percentage (%)' }}</mat-label>
            <input matInput type="number" formControlName="discountValue">
            <mat-error *ngIf="paymentForm.get('discountValue')?.hasError('min')">Value must be greater than 0</mat-error>
          </mat-form-field>

          <!-- Paid Amount -->
          <mat-form-field appearance="outline">
            <mat-label>Paid Amount (₹)</mat-label>
            <input matInput type="number" formControlName="paidAmount" placeholder="0.00">
            <mat-error *ngIf="paymentForm.get('paidAmount')?.hasError('required')">Paid amount is required</mat-error>
            <mat-error *ngIf="paymentForm.get('paidAmount')?.hasError('min')">Paid amount must be 0 or greater</mat-error>
          </mat-form-field>

          <!-- Outstanding Amount (Read-only representation) -->
          <mat-form-field appearance="outline">
            <mat-label>Outstanding Amount (₹)</mat-label>
            <input matInput type="number" [value]="calculations.pendingAmount" [disabled]="true">
          </mat-form-field>

          <!-- Payment Method (shown only if paidAmount > 0) -->
          <mat-form-field appearance="outline" *ngIf="paymentForm.get('paidAmount')?.value > 0">
            <mat-label>Payment Method</mat-label>
            <mat-select formControlName="paymentMethod">
              <mat-option *ngFor="let method of availablePaymentMethods" [value]="method">{{ method }}</mat-option>
            </mat-select>
            <mat-error *ngIf="paymentForm.get('paymentMethod')?.hasError('required')">Payment method is required</mat-error>
          </mat-form-field>

          <!-- Invoice Date -->
          <mat-form-field appearance="outline">
            <mat-label>Invoice/Billing Date</mat-label>
            <input matInput [matDatepicker]="datePicker" formControlName="date">
            <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
            <mat-datepicker #datePicker></mat-datepicker>
            <mat-error *ngIf="paymentForm.get('date')?.hasError('required')">Invoice date is required</mat-error>
          </mat-form-field>

          <!-- Due Date (shown only if outstanding balance > 0) -->
          <mat-form-field appearance="outline" *ngIf="calculations.pendingAmount > 0">
            <mat-label>Payment Due Date</mat-label>
            <input matInput [matDatepicker]="dueDatePicker" formControlName="dueDate">
            <mat-datepicker-toggle matSuffix [for]="dueDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #dueDatePicker></mat-datepicker>
            <mat-error *ngIf="paymentForm.get('dueDate')?.hasError('required')">Due date is required</mat-error>
          </mat-form-field>

          <!-- Notes -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Notes / Memo</mat-label>
            <textarea matInput formControlName="notes" rows="2" placeholder="Record comments or memo..."></textarea>
          </mat-form-field>
        </div>

        <!-- Live Billing Summary -->
        <div class="billing-summary" *ngIf="calculations.originalAmount > 0">
          <h4>Live Billing Summary</h4>
          <div class="summary-row">
            <span>Original Amount:</span>
            <span>₹{{ calculations.originalAmount | number:'1.2-2' }}</span>
          </div>
          <div class="summary-row" *ngIf="calculations.discountAmount > 0">
            <span>Discount:</span>
            <span class="danger-text">-₹{{ calculations.discountAmount | number:'1.2-2' }}</span>
          </div>
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>₹{{ calculations.subtotal | number:'1.2-2' }}</span>
          </div>
          <div class="summary-row">
            <span>Tax (GST 18% inclusive):</span>
            <span>₹{{ calculations.taxAmount | number:'1.2-2' }}</span>
          </div>
          <mat-divider></mat-divider>
          <div class="summary-row total">
            <span>Final Amount (Payable):</span>
            <strong>₹{{ calculations.finalAmount | number:'1.2-2' }}</strong>
          </div>
          <div class="summary-row paid-row">
            <span>Paid Amount Now:</span>
            <span class="success-text">₹{{ calculations.paidAmount | number:'1.2-2' }}</span>
          </div>
          <div class="summary-row pending-row">
            <span>Outstanding Balance:</span>
            <strong [class.danger-text]="calculations.pendingAmount > 0" [class.success-text]="calculations.pendingAmount === 0">
              ₹{{ calculations.pendingAmount | number:'1.2-2' }}
            </strong>
          </div>
          <div class="summary-row">
            <span>Invoice Status:</span>
            <strong style="text-transform: capitalize;">{{ calculations.paymentStatus }}</strong>
          </div>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()" [disabled]="submissionGuard.isSubmitting('payment-record') | async">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="paymentForm.invalid || (submissionGuard.isSubmitting('payment-record') | async)">
          <mat-icon *ngIf="submissionGuard.isSubmitting('payment-record') | async" class="spin-icon" style="margin-right: 8px;">sync</mat-icon>
          <span>{{ (submissionGuard.isSubmitting('payment-record') | async) ? 'Recording...' : 'Record Payment' }}</span>
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
    .full-width {
      grid-column: span 2;
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
    }
    .success-text {
      color: var(--success);
      font-weight: 600;
    }
    .danger-text {
      color: var(--warn, #f43f5e);
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
      .full-width {
        grid-column: span 1;
      }
    }
  `]
})
export class PaymentDialogComponent implements OnInit {
  paymentForm!: FormGroup;
  members: Member[] = [];
  availablePaymentMethods: string[] = ['Cash'];

  constructor(
    private fb: FormBuilder,
    private memberState: MemberState,
    private tenantContext: TenantContextService,
    private billingCalc: BillingCalculationService,
    @Inject(PAYMENT_SETTINGS_REPOSITORY_TOKEN) private settingsRepo: IPaymentSettingsRepository,
    private dialogRef: MatDialogRef<PaymentDialogComponent>,
    public submissionGuard: SubmissionGuardService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Load members
    this.memberState.members$.subscribe(members => {
      this.members = members.filter(m => m.status !== 'inactive');
    });

    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.settingsRepo.getSettings(gymId).subscribe(settings => {
        const enabled = settings.filter(s => s.enabled).map(s => s.provider as string);
        this.availablePaymentMethods = ['Cash', ...enabled.filter(p => p !== 'Cash')];
      });
    }

    this.paymentForm = this.fb.group({
      memberId: ['', [Validators.required]],
      amount: ['', [Validators.required, Validators.min(1)]],
      discountType: ['none', [Validators.required]],
      discountValue: [0, [Validators.min(0)]],
      paidAmount: [0, [Validators.required, Validators.min(0)]],
      dueDate: [new Date(), [Validators.required]],
      date: [new Date(), [Validators.required]],
      paymentMethod: ['Cash'],
      notes: ['']
    });

    // Subscriptions to monitor values and perform validation/capping
    this.paymentForm.get('amount')?.valueChanges.subscribe(() => {
      setTimeout(() => {
        const finalTotal = this.calculations.finalAmount;
        this.paymentForm.get('paidAmount')?.setValue(finalTotal, { emitEvent: false });
      });
    });

    this.paymentForm.get('paidAmount')?.valueChanges.subscribe(val => {
      const finalTotal = this.calculations.finalAmount;
      if (val > finalTotal) {
        this.paymentForm.get('paidAmount')?.setValue(finalTotal, { emitEvent: false });
      }
    });

    this.paymentForm.get('discountType')?.valueChanges.subscribe(type => {
      const discountValCtrl = this.paymentForm.get('discountValue');
      if (type === 'none') {
        discountValCtrl?.setValue(0);
        discountValCtrl?.clearValidators();
      } else {
        discountValCtrl?.setValidators([Validators.required, Validators.min(0.01)]);
      }
      discountValCtrl?.updateValueAndValidity();
      
      setTimeout(() => {
        const finalTotal = this.calculations.finalAmount;
        if (this.paymentForm.get('paidAmount')?.value > finalTotal) {
          this.paymentForm.get('paidAmount')?.setValue(finalTotal, { emitEvent: false });
        }
      });
    });

    this.paymentForm.get('discountValue')?.valueChanges.subscribe(() => {
      setTimeout(() => {
        const finalTotal = this.calculations.finalAmount;
        if (this.paymentForm.get('paidAmount')?.value > finalTotal) {
          this.paymentForm.get('paidAmount')?.setValue(finalTotal, { emitEvent: false });
        }
      });
    });
  }

  onMemberSelect(memberId: string): void {
    const selectedMember = this.members.find(m => m.id === memberId);
    if (selectedMember) {
      const price = selectedMember.balance > 0 ? selectedMember.balance : 1500;
      this.paymentForm.get('amount')?.setValue(price);
      this.paymentForm.get('paidAmount')?.setValue(price, { emitEvent: false });
    }
  }

  get calculations() {
    if (!this.paymentForm) {
      return {
        originalAmount: 0,
        discountType: 'none' as const,
        discountValue: 0,
        discountAmount: 0,
        subtotal: 0,
        taxAmount: 0,
        finalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        paymentStatus: 'pending' as const
      };
    }
    const formValue = this.paymentForm.getRawValue();
    return this.billingCalc.calculate({
      originalAmount: formValue.amount || 0,
      discountType: formValue.discountType || 'none',
      discountValue: formValue.discountValue || 0,
      paidAmount: formValue.paidAmount || 0,
      dueDate: this.formatDate(formValue.dueDate || new Date())
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.paymentForm.valid) {
      if (!this.submissionGuard.start('payment-record')) {
        return;
      }
      const formValue = this.paymentForm.getRawValue();
      const member = this.members.find(m => m.id === formValue.memberId);
      const calc = this.calculations;
      const paidNow = Number(calc.paidAmount) || 0;
      const paymentMethod = paidNow > 0 ? (formValue.paymentMethod || 'Cash') : 'Cash';
      const gymId = this.tenantContext.getTenantId() || undefined;

      const completePayment = (gatewayTransactionId?: string) => {
        const paymentResult = {
          memberId: formValue.memberId,
          memberName: member ? member.name : 'Unknown Member',
          amount: calc.originalAmount,
          paidAmount: calc.paidAmount,
          dueAmount: calc.pendingAmount,
          dueDate: this.formatDate(formValue.dueDate || new Date()),
          date: this.formatDate(formValue.date),
          status: calc.paymentStatus,
          planName: member ? member.planName : 'Custom Plan',
          paymentMethod: calc.paidAmount > 0 ? paymentMethod : 'Pending',
          collectedBy: 'Sophia Chen',
          discountType: calc.discountType,
          discountValue: calc.discountValue,
          notes: formValue.notes,
          gatewayTransactionId: gatewayTransactionId || ''
        };

        this.dialogRef.close(paymentResult);
        this.submissionGuard.end('payment-record');
      };

      if (paidNow > 0) {
        const gwRef = this.dialog.open(PaymentGatewayModalComponent, {
          width: '500px',
          maxWidth: '98vw',
          disableClose: true,
          data: {
            amount: paidNow,
            paymentMethod,
            memberName: member ? member.name : 'Member',
            planName: member ? member.planName : 'Gym Plan',
            invoiceRef: `INV-${Date.now()}`,
            gymId
          }
        });

        gwRef.afterClosed().subscribe(gwResult => {
          if (!gwResult || !gwResult.success) {
            this.submissionGuard.end('payment-record');
            this.snackBar.open('Payment cancelled. Reference was not recorded.', 'Dismiss', { duration: 4000 });
            return;
          }
          completePayment(gwResult.transactionId);
        });
      } else {
        completePayment();
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
