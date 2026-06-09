import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SubscriptionPlan } from '../../core/enums/subscription-plans.enum';
import { PLAN_PRICES } from '../../domain/subscription/subscription.service';
import { MatDividerModule } from '@angular/material/divider';

interface CheckoutData {
  plan: SubscriptionPlan;
  billingCycle: 'monthly' | 'yearly';
}

@Component({
  selector: 'app-checkout-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule
  ],
  template: `
    <div class="checkout-dialog-container">
      <!-- Title -->
      <div class="dialog-header">
        <div class="title-row">
          <mat-icon class="premium-badge">workspace_premium</mat-icon>
          <h2>Upgrade SaaS Workspace</h2>
        </div>
        <p class="subtitle">Complete payment details to instantly activate your new plan permissions.</p>
        <button mat-icon-button (click)="onCancel()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Content -->
      <div class="dialog-content">
        <!-- Billing Summary -->
        <div class="billing-summary glass-panel">
          <div class="summary-row header">
            <span class="plan-title">{{ getPlanLabel(data.plan) }} Tier ({{ data.billingCycle | titlecase }})</span>
            <span class="plan-price">₹{{ formatPrice(basePrice) }}</span>
          </div>
          <mat-divider></mat-divider>
          <div class="summary-details">
            <div class="summary-row">
              <span class="label">SaaS Billing Base</span>
              <span class="value">₹{{ formatPrice(basePrice) }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Tax (18% GST)</span>
              <span class="value">₹{{ formatPrice(taxAmount) }}</span>
            </div>
            <div class="summary-row total">
              <span class="label">Amount Due Today</span>
              <span class="value font-bold text-accent">₹{{ formatPrice(totalAmount) }}</span>
            </div>
          </div>
        </div>

        <!-- Checkout Form / Loading State -->
        <div class="form-container" [class.processing]="isProcessing">
          <div class="spinner-overlay" *ngIf="isProcessing">
            <div class="pulse-ring"></div>
            <mat-icon class="process-icon">lock</mat-icon>
            <h3>{{ processingStateText }}</h3>
            <p>Please do not refresh or close this dialog.</p>
          </div>

          <form [formGroup]="paymentForm" (ngSubmit)="onSubmit()" *ngIf="!isProcessing">
            <!-- Cardholder Name -->
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Cardholder Full Name</mat-label>
              <input matInput formControlName="cardholderName" placeholder="Alex Johnson">
              <mat-error *ngIf="paymentForm.get('cardholderName')?.hasError('required')">Cardholder name is required</mat-error>
            </mat-form-field>

            <!-- Card Number -->
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Credit Card Number</mat-label>
              <input matInput formControlName="cardNumber" placeholder="4111 2222 3333 4444" (input)="formatCardNumber($event)">
              <mat-icon matSuffix>credit_card</mat-icon>
              <mat-error *ngIf="paymentForm.get('cardNumber')?.hasError('required')">Card number is required</mat-error>
              <mat-error *ngIf="paymentForm.get('cardNumber')?.hasError('pattern')">Enter a valid 16-digit card number</mat-error>
            </mat-form-field>

            <div class="form-row">
              <!-- Expiry -->
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Expiration Date</mat-label>
                <input matInput formControlName="expiry" placeholder="MM/YY" (input)="formatExpiry($event)">
                <mat-error *ngIf="paymentForm.get('expiry')?.hasError('required')">Expiry date is required</mat-error>
                <mat-error *ngIf="paymentForm.get('expiry')?.hasError('pattern')">Use MM/YY format</mat-error>
              </mat-form-field>

              <!-- CVV -->
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>CVV / CVC Code</mat-label>
                <input matInput formControlName="cvv" placeholder="•••" maxlength="4" type="password">
                <mat-icon matSuffix>help_outline</mat-icon>
                <mat-error *ngIf="paymentForm.get('cvv')?.hasError('required')">CVV code is required</mat-error>
                <mat-error *ngIf="paymentForm.get('cvv')?.hasError('pattern')">Enter a 3 or 4 digit code</mat-error>
              </mat-form-field>
            </div>

            <!-- Submit Buttons -->
            <div class="actions-row">
              <button mat-button type="button" (click)="onCancel()" class="cancel-btn">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="paymentForm.invalid" class="submit-btn">
                <mat-icon>verified_user</mat-icon>
                <span>Authorize & Pay ₹{{ formatPrice(totalAmount) }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .checkout-dialog-container {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .dialog-header {
      position: relative;
      .title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--accent-color);
        margin-bottom: 6px;
        h2 {
          font-size: 22px;
          font-weight: 800;
          margin: 0;
          color: var(--text-primary);
        }
        .premium-badge {
          color: var(--accent-color);
          font-size: 26px;
          width: 26px;
          height: 26px;
        }
      }
      .subtitle {
        font-size: 13px;
        color: var(--text-secondary);
        margin: 0;
      }
      .close-btn {
        position: absolute;
        top: -8px;
        right: -8px;
      }
    }
    .billing-summary {
      padding: 16px;
      margin-bottom: 20px;
      background: rgba(var(--accent-rgb, 99, 102, 241), 0.05);
      border: 1px solid rgba(var(--accent-rgb, 99, 102, 241), 0.15) !important;
      border-radius: 12px;

      .summary-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 13px;
        color: var(--text-secondary);

        &.header {
          margin-bottom: 12px;
          color: var(--text-primary);
          .plan-title {
            font-size: 15px;
            font-weight: 700;
          }
          .plan-price {
            font-size: 16px;
            font-weight: 800;
            color: var(--accent-color);
          }
        }
        &.total {
          margin-top: 12px;
          border-top: 1px dashed var(--border-color);
          padding-top: 12px;
          color: var(--text-primary);
          .label {
            font-size: 14px;
            font-weight: 600;
          }
          .value {
            font-size: 18px;
            font-weight: 800;
          }
        }
      }
      .summary-details {
        margin-top: 12px;
      }
    }
    .form-container {
      position: relative;
      min-height: 250px;
      display: flex;
      flex-direction: column;
      
      form {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
    }
    .form-row {
      display: flex;
      gap: 16px;
      .half-width {
        flex: 1;
      }
    }
    .w-100 {
      width: 100%;
    }
    .actions-row {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
      border-top: 1px solid var(--border-color);
      padding-top: 16px;

      button {
        border-radius: 8px !important;
        height: 42px !important;
        line-height: 42px !important;
        font-weight: 600 !important;
      }
    }

    /* Processing spinner overlay */
    .spinner-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      text-align: center;
      background: var(--bg-card);
      z-index: 5;
      animation: fadeIn 0.3s ease;

      .process-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: var(--accent-color);
        margin-bottom: 16px;
        animation: spin 2s infinite linear;
      }

      h3 {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 6px;
        color: var(--text-primary);
      }

      p {
        font-size: 12px;
        color: var(--text-muted);
      }
    }

    .pulse-ring {
      border: 3px solid var(--accent-color);
      border-radius: 30px;
      height: 60px;
      width: 60px;
      position: absolute;
      animation: pulsate 1.5s ease-out infinite;
      opacity: 0.0;
    }

    @keyframes pulsate {
      0% {transform: scale(0.1, 0.1); opacity: 0.0;}
      50% {opacity: 0.8;}
      100% {transform: scale(1.2, 1.2); opacity: 0.0;}
    }

    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class CheckoutDialogComponent implements OnInit {
  paymentForm!: FormGroup;
  isProcessing = false;
  processingStateText = 'Contacting payment gateway...';

  basePrice = 0;
  taxAmount = 0;
  totalAmount = 0;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CheckoutDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CheckoutData
  ) { }

  ngOnInit(): void {
    const prices = PLAN_PRICES[this.data.plan];
    this.basePrice = this.data.billingCycle === 'yearly' ? prices.yearly : prices.monthly;
    this.taxAmount = Math.round(this.basePrice * 0.18); // 18% GST
    this.totalAmount = this.basePrice + this.taxAmount;

    this.paymentForm = this.fb.group({
      cardholderName: ['', [Validators.required, Validators.minLength(3)]],
      cardNumber: ['', [Validators.required, Validators.pattern(/^\d{4} \d{4} \d{4} \d{4}$/)]],
      expiry: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
      cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]]
    });
  }

  getPlanLabel(plan: SubscriptionPlan): string {
    switch (plan) {
      case SubscriptionPlan.FreeTrial: return 'Free Trial';
      case SubscriptionPlan.Basic: return 'Basic';
      case SubscriptionPlan.Pro: return 'Pro';
      case SubscriptionPlan.Enterprise: return 'Enterprise';
      default: return 'Tier';
    }
  }

  formatPrice(num: number): string {
    return num.toLocaleString('en-IN');
  }

  formatCardNumber(event: any): void {
    let input = event.target.value.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < input.length && i < 16; i++) {
      if (i > 0 && i % 4 === 0) {
        formatted += ' ';
      }
      formatted += input[i];
    }
    this.paymentForm.patchValue({ cardNumber: formatted }, { emitEvent: false });
  }

  formatExpiry(event: any): void {
    let input = event.target.value.replace(/\D/g, '');
    let formatted = '';
    if (input.length > 0) {
      formatted = input.substring(0, 2);
      if (input.length > 2) {
        formatted += '/' + input.substring(2, 4);
      }
    }
    this.paymentForm.patchValue({ expiry: formatted }, { emitEvent: false });
  }

  onCancel(): void {
    this.dialogRef.close(null);
  }

  onSubmit(): void {
    if (this.paymentForm.valid) {
      this.isProcessing = true;

      // Step 1: Gateway handshake
      setTimeout(() => {
        this.processingStateText = 'Securing payment channel...';

        // Step 2: Authorizing charge
        setTimeout(() => {
          this.processingStateText = 'Provisioning SaaS subscription...';

          // Step 3: Success activation
          setTimeout(() => {
            const last4Digits = this.paymentForm.value.cardNumber.slice(-4);
            const cardBrand = this.paymentForm.value.cardNumber.startsWith('4') ? 'Visa' : 'Mastercard';

            this.dialogRef.close({
              paymentMethod: `${cardBrand} ending in ${last4Digits}`,
              amountPaid: this.totalAmount
            });
          }, 1000);

        }, 1200);

      }, 1000);
    }
  }
}
