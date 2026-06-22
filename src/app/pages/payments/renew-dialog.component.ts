import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
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
import { MembershipPlanState } from '../../presentation/state/membership-plan.state';
import { Member } from '../../core/models/member.entity';
import { MembershipPlan } from '../../core/models/membership-plan.entity';
import { SubmissionGuardService } from '../../services/submission-guard.service';
import { PAYMENT_SETTINGS_REPOSITORY_TOKEN, IPaymentSettingsRepository } from '../../core/interfaces/repository.interfaces';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { BillingCalculationService } from '../../services/billing-calculation.service';
import { PaymentGatewayModalComponent } from '../../shared/components/payment-gateway-modal/payment-gateway-modal.component';

@Component({
  selector: 'app-renew-dialog',
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
    <h2 mat-dialog-title class="gradient-text dialogue-title">Renew Gym Membership</h2>
    
    <form [formGroup]="renewForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        <div class="form-grid">
          <!-- Member Info -->
          <div class="full-width member-display-info" *ngIf="preselectedMember">
            <label>Member Name</label>
            <span class="member-name">{{ preselectedMember.name }}</span>
            <span class="member-sub">Current plan expires: {{ preselectedMember.endDate | date:'mediumDate' }}</span>
          </div>

          <!-- Member Select (if not preselected) -->
          <mat-form-field appearance="outline" class="full-width" *ngIf="!preselectedMember">
            <mat-label>Select Member</mat-label>
            <mat-select formControlName="memberId" (selectionChange)="onMemberSelect($event.value)">
              <mat-option *ngFor="let member of members" [value]="member.id">
                {{ member.name }} (Current Plan: {{ member.planName }})
              </mat-option>
            </mat-select>
            <mat-error *ngIf="renewForm.get('memberId')?.hasError('required')">Member is required</mat-error>
          </mat-form-field>

          <!-- Plan Select -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Select Renewal Plan</mat-label>
            <mat-select formControlName="planId" (selectionChange)="onPlanSelect($event.value)">
              <mat-option *ngFor="let plan of plans" [value]="plan.id">
                {{ plan.name }} (₹{{ plan.price }} for {{ plan.duration || plan.durationMonths || 1 }} mo)
              </mat-option>
            </mat-select>
            <mat-error *ngIf="renewForm.get('planId')?.hasError('required')">Membership plan is required</mat-error>
          </mat-form-field>

          <!-- Start Date -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Renewal Start Date</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate">
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
            <mat-error *ngIf="renewForm.get('startDate')?.hasError('required')">Start date is required</mat-error>
          </mat-form-field>

          <!-- Price / Amount -->
          <mat-form-field appearance="outline">
            <mat-label>Base Price (₹)</mat-label>
            <input matInput type="number" formControlName="amount" placeholder="0.00">
            <mat-error *ngIf="renewForm.get('amount')?.hasError('required')">Base price is required</mat-error>
            <mat-error *ngIf="renewForm.get('amount')?.hasError('min')">Must be greater than 0</mat-error>
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
          <mat-form-field appearance="outline" *ngIf="renewForm.get('discountType')?.value !== 'none'">
            <mat-label>{{ renewForm.get('discountType')?.value === 'flat' ? 'Discount Amount (₹)' : 'Discount Percentage (%)' }}</mat-label>
            <input matInput type="number" formControlName="discountValue">
            <mat-error *ngIf="renewForm.get('discountValue')?.hasError('required')">Discount value is required</mat-error>
            <mat-error *ngIf="renewForm.get('discountValue')?.hasError('min')">Must be greater than 0</mat-error>
          </mat-form-field>

          <!-- Paid Amount -->
          <mat-form-field appearance="outline">
            <mat-label>Amount Paid Now (₹)</mat-label>
            <input matInput type="number" formControlName="paidAmount" placeholder="0.00">
            <mat-error *ngIf="renewForm.get('paidAmount')?.hasError('required')">Paid amount is required</mat-error>
            <mat-error *ngIf="renewForm.get('paidAmount')?.hasError('min')">Must be 0 or greater</mat-error>
          </mat-form-field>

          <!-- Payment Method -->
          <mat-form-field appearance="outline" *ngIf="renewForm.get('paidAmount')?.value > 0">
            <mat-label>Payment Method</mat-label>
            <mat-select formControlName="paymentMethod">
              <mat-option *ngFor="let method of availablePaymentMethods" [value]="method">{{ method }}</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Due Date (shown only if remaining balance > 0) -->
          <mat-form-field appearance="outline" class="full-width" *ngIf="calculations.pendingAmount > 0">
            <mat-label>Payment Due Date</mat-label>
            <input matInput [matDatepicker]="dueDatePicker" formControlName="dueDate">
            <mat-datepicker-toggle matSuffix [for]="dueDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #dueDatePicker></mat-datepicker>
            <mat-error *ngIf="renewForm.get('dueDate')?.hasError('required')">Due date is required for outstanding balance</mat-error>
          </mat-form-field>
        </div>

        <!-- Live Billing Summary -->
        <div class="billing-summary" *ngIf="calculations.originalAmount > 0">
          <h4>Live Billing Summary</h4>
          <div class="summary-row">
            <span>Base Price:</span>
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
        <button mat-button type="button" (click)="onCancel()" [disabled]="submissionGuard.isSubmitting('renew-dialog-submit') | async">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="renewForm.invalid || (submissionGuard.isSubmitting('renew-dialog-submit') | async)">
          <mat-icon *ngIf="submissionGuard.isSubmitting('renew-dialog-submit') | async" class="spin-icon" style="margin-right: 8px;">sync</mat-icon>
          <span>{{ (submissionGuard.isSubmitting('renew-dialog-submit') | async) ? 'Renewing...' : 'Renew Membership' }}</span>
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
    .member-display-info {
      display: flex;
      flex-direction: column;
      background-color: var(--accent-light);
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      label {
        font-size: 11px;
        color: var(--text-secondary);
        text-transform: uppercase;
        font-weight: 600;
      }
      .member-name {
        font-size: 18px;
        font-weight: 700;
        color: var(--accent-color);
      }
      .member-sub {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 4px;
      }
    }
    .billing-summary {
      background: rgba(255, 255, 255, 0.03);
      border: 1px dashed rgba(99, 102, 241, 0.4);
      padding: 16px;
      border-radius: 12px;
      margin-top: 8px;

      h4 {
        margin-bottom: 12px;
        color: #6366f1;
        font-size: 15px;
        font-weight: 600;
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
    .danger-text {
      color: #ef4444;
      font-weight: 600;
    }
    .success-text {
      color: #10b981;
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
export class RenewDialogComponent implements OnInit {
  renewForm!: FormGroup;
  members: Member[] = [];
  plans: MembershipPlan[] = [];
  preselectedMember: Member | null = null;
  availablePaymentMethods: string[] = ['Cash'];
  private _matDialog!: MatDialog;

  constructor(
    private fb: FormBuilder,
    private memberState: MemberState,
    private planState: MembershipPlanState,
    private tenantContext: TenantContextService,
    private billingCalc: BillingCalculationService,
    private snackBar: MatSnackBar,
    @Inject(PAYMENT_SETTINGS_REPOSITORY_TOKEN) private settingsRepo: IPaymentSettingsRepository,
    private dialogRef: MatDialogRef<RenewDialogComponent>,
    public submissionGuard: SubmissionGuardService,
    @Inject(MAT_DIALOG_DATA) public data: { member?: Member } | null,
    matDialog: MatDialog
  ) {
    this._matDialog = matDialog;
    if (data && data.member) {
      this.preselectedMember = data.member;
    }
  }

  ngOnInit(): void {
    // 1. Fetch plans
    this.planState.plans$.subscribe(plans => {
      this.plans = plans;
    });

    if (!this.preselectedMember) {
      this.memberState.members$.subscribe(members => {
        this.members = members;
      });
    }

    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.settingsRepo.getSettings(gymId).subscribe(settings => {
        const enabled = settings.filter(s => s.enabled).map(s => s.provider as string);
        this.availablePaymentMethods = ['Cash', ...enabled.filter(p => p !== 'Cash')];
      });
    }

    // 2. Build form
    this.renewForm = this.fb.group({
      memberId: [this.preselectedMember ? this.preselectedMember.id : '', this.preselectedMember ? [] : [Validators.required]],
      planId: ['', [Validators.required]],
      startDate: [this.calculateDefaultStartDate(), [Validators.required]],
      amount: [0, [Validators.required, Validators.min(1)]],
      discountType: ['none', [Validators.required]],
      discountValue: [0, [Validators.min(0)]],
      paidAmount: [0, [Validators.required, Validators.min(0)]],
      paymentMethod: ['Cash'],
      dueDate: [new Date(), [Validators.required]]
    });

    // Auto-update paid amount to total plan price initially, and handle bounds
    this.renewForm.get('planId')?.valueChanges.subscribe(planId => {
      const plan = this.plans.find(p => p.id === planId);
      if (plan) {
        this.renewForm.patchValue({
          amount: plan.price
        });
        setTimeout(() => {
          this.renewForm.patchValue({
            paidAmount: this.calculations.finalAmount
          });
        });
      }
    });

    this.renewForm.get('amount')?.valueChanges.subscribe(() => {
      setTimeout(() => {
        this.renewForm.patchValue({
          paidAmount: this.calculations.finalAmount
        });
      });
    });

    this.renewForm.get('paidAmount')?.valueChanges.subscribe(val => {
      const finalTotal = this.calculations.finalAmount;
      if (val > finalTotal) {
        this.renewForm.get('paidAmount')?.setValue(finalTotal, { emitEvent: false });
      }
    });

    this.renewForm.get('discountType')?.valueChanges.subscribe(type => {
      const discountValCtrl = this.renewForm.get('discountValue');
      if (type === 'none') {
        discountValCtrl?.setValue(0);
        discountValCtrl?.clearValidators();
      } else {
        discountValCtrl?.setValidators([Validators.required, Validators.min(0.01)]);
      }
      discountValCtrl?.updateValueAndValidity();
    });
  }

  get calculations() {
    if (!this.renewForm) {
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

    const formValue = this.renewForm.getRawValue();
    return this.billingCalc.calculate({
      originalAmount: formValue.amount || 0,
      discountType: formValue.discountType || 'none',
      discountValue: formValue.discountValue || 0,
      paidAmount: formValue.paidAmount || 0,
      dueDate: this.formatDate(formValue.dueDate || new Date())
    });
  }

  private calculateDefaultStartDate(): Date {
    if (this.preselectedMember) {
      const expiry = new Date(this.preselectedMember.endDate);
      const today = new Date();
      if (expiry.getTime() < today.getTime()) {
        return today;
      } else {
        const nextDay = new Date(expiry);
        nextDay.setDate(nextDay.getDate() + 1);
        return nextDay;
      }
    }
    return new Date();
  }

  onMemberSelect(memberId: string): void {
    const selected = this.members.find(m => m.id === memberId);
    if (selected) {
      this.preselectedMember = selected;
      this.renewForm.get('startDate')?.setValue(this.calculateDefaultStartDate());
      this.preselectedMember = null;
    }
  }

  onPlanSelect(planId: string): void {
    const plan = this.plans.find(p => p.id === planId);
    if (plan) {
      this.renewForm.get('amount')?.setValue(plan.price);
      this.renewForm.get('paidAmount')?.setValue(plan.price);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.renewForm.valid) {
      if (!this.submissionGuard.start('renew-dialog-submit')) {
        return;
      }
      const formValue = this.renewForm.getRawValue();
      const finalMemberId = this.preselectedMember ? this.preselectedMember.id : formValue.memberId;
      const plan = this.plans.find(p => p.id === formValue.planId);
      const planName = plan ? plan.name : 'Membership Plan';
      const durationMonths = plan ? (plan.duration || plan.durationMonths || 1) : 1;

      const start = new Date(formValue.startDate);
      start.setMonth(start.getMonth() + durationMonths);
      const calculatedEndDate = start;
      const calc = this.calculations;

      const paidNow = Number(calc.paidAmount) || 0;
      const paymentMethod = paidNow > 0 ? (formValue.paymentMethod || 'Cash') : 'Cash';
      const gymId = this.tenantContext.getTenantId() || undefined;

      const completeRenewal = (gatewayTransactionId?: string) => {
        const renewalResult = {
          memberId: finalMemberId,
          planId: formValue.planId,
          planName,
          durationMonths,
          startDate: this.formatDate(formValue.startDate),
          endDate: this.formatDate(calculatedEndDate),
          price: calc.finalAmount,
          paidAmount: paidNow,
          dueAmount: calc.pendingAmount,
          dueDate: this.formatDate(formValue.dueDate || new Date()),
          paymentStatus: calc.paymentStatus,
          paymentMethod: paidNow > 0 ? paymentMethod : 'Pending',
          discountType: formValue.discountType,
          discountValue: formValue.discountValue,
          originalAmount: calc.originalAmount,
          gatewayTransactionId: gatewayTransactionId || ''
        };
        this.submissionGuard.end('renew-dialog-submit');
        this.dialogRef.close(renewalResult);
      };

      if (paidNow > 0) {
        const gwRef = this._matDialog.open(PaymentGatewayModalComponent, {
          width: '500px',
          maxWidth: '98vw',
          disableClose: true,
          data: {
            amount: paidNow,
            paymentMethod,
            memberName: this.preselectedMember?.name || 'Member',
            planName,
            invoiceRef: `RNW-${Date.now()}`,
            gymId
          }
        });

        gwRef.afterClosed().subscribe(gwResult => {
          if (!gwResult || !gwResult.success) {
            this.submissionGuard.end('renew-dialog-submit');
            this.snackBar.open('Payment cancelled. Renewal not completed.', 'Dismiss', { duration: 4000 });
            return;
          }
          completeRenewal(gwResult.transactionId);
        });
      } else {
        completeRenewal();
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
