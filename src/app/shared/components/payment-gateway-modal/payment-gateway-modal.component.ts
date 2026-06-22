import {
  Component, Inject, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PAYMENT_SETTINGS_REPOSITORY_TOKEN, IPaymentSettingsRepository } from '../../../core/interfaces/repository.interfaces';
import { TenantContextService } from '../../../domain/tenancy/tenant-context.service';
import * as QRCode from 'qrcode';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaymentGatewayInput {
  amount: number;
  paymentMethod: string;        // 'Manual UPI' | 'Razorpay' | 'Cashfree' | 'Cash' | 'Paytm' | 'Stripe'
  memberName: string;
  planName?: string;
  invoiceRef?: string;
  gymId?: string;
}

export interface PaymentGatewayResult {
  success: boolean;
  transactionId?: string;
  method: string;
  paidAmount: number;
  paymentDate: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

@Component({
  selector: 'app-payment-gateway-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <div class="pgm-container">
      <!-- Header -->
      <div class="pgm-header">
        <div class="pgm-header-left">
          <div class="pgm-logo">
            <mat-icon>lock</mat-icon>
          </div>
          <div>
            <h2 class="pgm-title">ApexFit Secure Checkout</h2>
            <p class="pgm-subtitle">{{ getProviderLabel() }} Payment</p>
          </div>
        </div>
        <button mat-icon-button (click)="onCancel()" class="pgm-close-btn" matTooltip="Cancel Payment">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-divider></mat-divider>

      <!-- Body wrapper (Scrollable) -->
      <div class="pgm-body">
        <!-- Order Summary Card -->
        <div class="pgm-order-summary">
          <div class="pgm-summary-row">
            <span class="pgm-lbl">Member</span>
            <span class="pgm-val">{{ data.memberName }}</span>
          </div>
          <div class="pgm-summary-row" *ngIf="data.planName">
            <span class="pgm-lbl">Plan / Service</span>
            <span class="pgm-val">{{ data.planName }}</span>
          </div>
          <div class="pgm-summary-row" *ngIf="data.invoiceRef">
            <span class="pgm-lbl">Reference</span>
            <span class="pgm-val monospace">{{ data.invoiceRef }}</span>
          </div>
          <div class="pgm-summary-row amount-row">
            <span class="pgm-lbl">Amount Due</span>
            <span class="pgm-amount">₹{{ data.amount | number:'1.2-2' }}</span>
          </div>
        </div>

        <!-- ════════ UPI PROVIDER ════════ -->
        <ng-container *ngIf="resolvedMethod === 'Manual UPI'">
          <div class="pgm-provider-card upi-card">
            <div class="upi-provider-badge">
              <span class="upi-badge-icon">⬡</span>
              <span>UPI Payment</span>
            </div>

            <p class="upi-instruction">
              Scan the QR code below using any UPI app (Google Pay, PhonePe, Paytm, BHIM)
            </p>

            <!-- QR Code Canvas -->
            <div class="qr-wrapper" *ngIf="qrDataUrl">
              <div class="qr-frame">
                <img [src]="qrDataUrl" alt="UPI QR Code" class="qr-img">
              </div>
              <p class="qr-amount-label">Pay ₹{{ data.amount | number:'1.2-2' }}</p>
            </div>

            <div class="qr-generating" *ngIf="!qrDataUrl && isGeneratingQr">
              <mat-spinner diameter="40"></mat-spinner>
              <span>Generating QR…</span>
            </div>

            <!-- UPI Details -->
            <div class="upi-details-box" *ngIf="upiConfig">
              <div class="upi-detail-row">
                <span class="upi-detail-label">UPI ID</span>
                <span class="upi-detail-val monospace">{{ upiConfig.upiId }}</span>
                <button mat-icon-button type="button" (click)="copyText(upiConfig.upiId)" matTooltip="Copy UPI ID">
                  <mat-icon class="copy-icon">content_copy</mat-icon>
                </button>
              </div>
              <div class="upi-detail-row">
                <span class="upi-detail-label">Payee</span>
                <span class="upi-detail-val">{{ upiConfig.businessName }}</span>
              </div>
              <div class="upi-detail-row">
                <span class="upi-detail-label">Amount</span>
                <span class="upi-detail-val font-bold accent-color">₹{{ data.amount | number:'1.2-2' }}</span>
              </div>
            </div>

            <!-- UTR Input -->
            <form [formGroup]="upiForm" class="utr-form">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>UTR / Transaction Reference</mat-label>
                <input matInput formControlName="utr" placeholder="e.g. 312547896541" autocomplete="off">
                <mat-hint>Enter the 12-digit UTR from your UPI app after payment</mat-hint>
                <mat-error *ngIf="upiForm.get('utr')?.hasError('required')">UTR is required</mat-error>
                <mat-error *ngIf="upiForm.get('utr')?.hasError('minlength')">UTR must be at least 6 characters</mat-error>
              </mat-form-field>

              <button
                mat-flat-button
                class="pgm-confirm-btn upi-confirm"
                type="button"
                [disabled]="upiForm.invalid || isProcessing"
                (click)="confirmUPI()">
                <mat-icon *ngIf="!isProcessing">check_circle</mat-icon>
                <mat-spinner *ngIf="isProcessing" diameter="20"></mat-spinner>
                <span>{{ isProcessing ? 'Processing…' : 'Payment Done — Confirm' }}</span>
              </button>
            </form>
          </div>
        </ng-container>

        <!-- ════════ CASH PROVIDER ════════ -->
        <ng-container *ngIf="resolvedMethod === 'Cash'">
          <div class="pgm-provider-card cash-card">
            <div class="cash-icon-row">
              <div class="cash-icon">
                <mat-icon>payments</mat-icon>
              </div>
              <div>
                <h3 class="cash-title">Cash Collection</h3>
                <p class="cash-sub">Collect payment in person from the member</p>
              </div>
            </div>

            <div class="cash-amount-box">
              <span class="cash-amount-label">Collect from {{ data.memberName }}</span>
              <span class="cash-amount-value">₹{{ data.amount | number:'1.2-2' }}</span>
            </div>

            <form [formGroup]="cashForm" class="cash-form">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Receipt Reference (Optional)</mat-label>
                <input matInput formControlName="receiptRef" placeholder="e.g. RCP-001">
              </mat-form-field>

              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Notes (Optional)</mat-label>
                <textarea matInput formControlName="notes" rows="2" placeholder="Any collection notes..."></textarea>
              </mat-form-field>

              <button
                mat-flat-button
                class="pgm-confirm-btn cash-confirm"
                type="button"
                [disabled]="isProcessing"
                (click)="confirmCash()">
                <mat-icon *ngIf="!isProcessing">task_alt</mat-icon>
                <mat-spinner *ngIf="isProcessing" diameter="20"></mat-spinner>
                <span>{{ isProcessing ? 'Processing…' : 'Confirm Cash Collection' }}</span>
              </button>
            </form>
          </div>
        </ng-container>

        <!-- ════════ RAZORPAY PLACEHOLDER ════════ -->
        <ng-container *ngIf="resolvedMethod === 'Razorpay'">
          <div class="pgm-provider-card rzp-card">
            <div class="rzp-header">
              <div class="rzp-logo">
                <span class="rzp-logo-text">Razorpay</span>
              </div>
              <span class="rzp-secure-badge">
                <mat-icon>verified_user</mat-icon> Secure
              </span>
            </div>

            <div class="rzp-order-info">
              <span class="rzp-order-id monospace">Order ID: {{ mockOrderId }}</span>
            </div>

            <div class="rzp-amount-display">
              <span class="rzp-currency">₹</span>
              <span class="rzp-amount-num">{{ data.amount | number:'1.2-2' }}</span>
            </div>

            <p class="rzp-description">
              Complete this payment using Razorpay. After completing payment, enter the Transaction ID below.
            </p>

            <form [formGroup]="rzpForm" class="rzp-form">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Razorpay Transaction ID</mat-label>
                <input matInput formControlName="txnId" placeholder="e.g. pay_OEaawKQDwzxPGS">
              </mat-form-field>

              <button
                mat-flat-button
                class="pgm-confirm-btn rzp-confirm"
                type="button"
                [disabled]="rzpForm.invalid || isProcessing"
                (click)="confirmRazorpay()">
                <mat-icon *ngIf="!isProcessing">payments</mat-icon>
                <mat-spinner *ngIf="isProcessing" diameter="20"></mat-spinner>
                <span>{{ isProcessing ? 'Verifying…' : 'Complete Razorpay Payment' }}</span>
              </button>
            </form>
          </div>
        </ng-container>

        <!-- ════════ CASHFREE PLACEHOLDER ════════ -->
        <ng-container *ngIf="resolvedMethod === 'Cashfree'">
          <div class="pgm-provider-card cf-card">
            <div class="cf-header">
              <div class="cf-logo">
                <span class="cf-logo-text">Cashfree</span>
                <span class="cf-logo-sub">Payments</span>
              </div>
              <span class="cf-secure-badge">
                <mat-icon>lock</mat-icon> PCI DSS
              </span>
            </div>

            <div class="cf-order-info">
              <span class="cf-order-id monospace">Order: {{ mockOrderId }}</span>
            </div>

            <div class="cf-amount-display">
              <span class="cf-currency">INR</span>
              <span class="cf-amount-num">₹{{ data.amount | number:'1.2-2' }}</span>
            </div>

            <form [formGroup]="cfForm" class="cf-form">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Cashfree Transaction ID</mat-label>
                <input matInput formControlName="txnId" placeholder="e.g. CF-TXN-2024-XXXXXX">
              </mat-form-field>

              <button
                mat-flat-button
                class="pgm-confirm-btn cf-confirm"
                type="button"
                [disabled]="cfForm.invalid || isProcessing"
                (click)="confirmCashfree()">
                <mat-icon *ngIf="!isProcessing">credit_card</mat-icon>
                <mat-spinner *ngIf="isProcessing" diameter="20"></mat-spinner>
                <span>{{ isProcessing ? 'Verifying…' : 'Complete Cashfree Payment' }}</span>
              </button>
            </form>
          </div>
        </ng-container>

        <!-- ════════ GENERIC FALLBACK ════════ -->
        <ng-container *ngIf="resolvedMethod === 'generic'">
          <div class="pgm-provider-card generic-card">
            <div class="generic-icon"><mat-icon>account_balance_wallet</mat-icon></div>
            <h3>Record Payment — {{ data.paymentMethod }}</h3>
            <p>Enter a transaction reference to confirm this payment.</p>

            <form [formGroup]="genericForm" class="generic-form">
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Transaction Reference</mat-label>
                <input matInput formControlName="txnRef" placeholder="Transaction ID / Reference">
              </mat-form-field>

              <button
                mat-flat-button
                class="pgm-confirm-btn generic-confirm"
                type="button"
                [disabled]="genericForm.invalid || isProcessing"
                (click)="confirmGeneric()">
                <mat-icon>check</mat-icon>
                <span>Confirm Payment</span>
              </button>
            </form>
          </div>
        </ng-container>
      </div>

      <mat-divider></mat-divider>

      <!-- Footer -->
      <div class="pgm-footer">
        <mat-icon class="pgm-footer-icon">shield</mat-icon>
        <span>All transactions are encrypted and secured by ApexFit.</span>
      </div>

      <div class="pgm-cancel-row">
        <button mat-button class="pgm-cancel-link" type="button" (click)="onCancel()">
          <mat-icon>arrow_back</mat-icon>
          Cancel & Go Back
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .pgm-container {
      padding: 0;
      width: 100%;
      max-width: 480px;
      max-height: 85vh; /* Limit dialog size to prevent screen overflow */
      display: flex;
      flex-direction: column;
      background: var(--card-background, #1e1e2d);
      color: var(--text-primary, #f1f5f9);
      border-radius: 16px;
      overflow: hidden;
    }

    .pgm-body {
      flex: 1;
      overflow-y: auto; /* Internal scrolling if body overflows */
      padding: 0;
    }

    .pgm-body::-webkit-scrollbar {
      width: 6px;
    }
    .pgm-body::-webkit-scrollbar-track {
      background: transparent;
    }
    .pgm-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }
    .pgm-body::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* ─── Header ─── */
    .pgm-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px 12px;
      background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08));
    }
    .pgm-header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .pgm-logo {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(99,102,241,0.4);
      mat-icon {
        color: #fff;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
    }
    .pgm-title {
      font-size: 17px;
      font-weight: 800;
      margin: 0;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .pgm-subtitle {
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
      margin: 2px 0 0;
    }
    .pgm-close-btn {
      color: var(--text-muted, #94a3b8);
      &:hover { color: var(--text-primary, #f1f5f9); }
    }

    /* ─── Order Summary ─── */
    .pgm-order-summary {
      margin: 12px 20px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .pgm-summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }
    .pgm-lbl {
      color: var(--text-muted, #94a3b8);
    }
    .pgm-val {
      font-weight: 600;
      color: var(--text-primary, #f1f5f9);
      max-width: 220px;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .amount-row {
      border-top: 1px dashed rgba(255,255,255,0.08);
      padding-top: 10px;
      margin-top: 4px;
    }
    .pgm-amount {
      font-size: 20px;
      font-weight: 800;
      background: linear-gradient(135deg, #6366f1, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    /* ─── Provider Cards ─── */
    .pgm-provider-card {
      margin: 0 20px 12px;
      border-radius: 14px;
      padding: 16px;
      border: 1px solid rgba(255,255,255,0.08);
    }

    /* ─── UPI Card ─── */
    .upi-card {
      background: linear-gradient(180deg, rgba(16,185,129,0.06), rgba(16,185,129,0.02));
      border-color: rgba(16,185,129,0.2);
    }
    .upi-provider-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(16,185,129,0.15);
      border: 1px solid rgba(16,185,129,0.3);
      border-radius: 999px;
      padding: 4px 12px;
      font-size: 12px;
      font-weight: 600;
      color: #10b981;
      margin-bottom: 8px;
      .upi-badge-icon { font-size: 14px; }
    }
    .upi-instruction {
      font-size: 12.5px;
      color: var(--text-muted, #94a3b8);
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .qr-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 10px;
    }
    .qr-frame {
      background: #fff;
      padding: 8px;
      border-radius: 12px;
      box-shadow: 0 6px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.1);
      display: inline-block;
    }
    .qr-img {
      width: 150px;
      height: 150px;
      display: block;
    }
    .qr-amount-label {
      margin-top: 8px;
      font-size: 14.5px;
      font-weight: 700;
      color: #10b981;
    }
    .qr-generating {
      display: flex;
      align-items: center;
      gap: 12px;
      justify-content: center;
      padding: 16px 0;
      color: var(--text-muted, #94a3b8);
      font-size: 13px;
    }
    .upi-details-box {
      background: rgba(0,0,0,0.25);
      border-radius: 10px;
      padding: 8px 12px;
      margin-bottom: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .upi-detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .upi-detail-label {
      color: var(--text-muted, #94a3b8);
      font-size: 11.5px;
      min-width: 60px;
    }
    .upi-detail-val {
      flex: 1;
      font-size: 12.5px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .copy-icon {
      font-size: 15px;
      width: 15px;
      height: 15px;
      color: #6366f1;
      cursor: pointer;
    }
    .utr-form { margin-top: 4px; }

    /* ─── Cash Card ─── */
    .cash-card {
      background: linear-gradient(180deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02));
      border-color: rgba(245,158,11,0.2);
    }
    .cash-icon-row {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 12px;
    }
    .cash-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(245,158,11,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      mat-icon {
        color: #f59e0b;
        font-size: 24px;
        width: 24px;
        height: 24px;
      }
    }
    .cash-title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #f59e0b;
    }
    .cash-sub {
      margin: 2px 0 0;
      font-size: 11.5px;
      color: var(--text-muted, #94a3b8);
    }
    .cash-amount-box {
      background: rgba(245,158,11,0.1);
      border: 1px solid rgba(245,158,11,0.25);
      border-radius: 12px;
      padding: 10px 12px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .cash-amount-label {
      font-size: 12.5px;
      color: var(--text-muted, #94a3b8);
      max-width: 160px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cash-amount-value {
      font-size: 20px;
      font-weight: 800;
      color: #f59e0b;
    }
    .cash-form { display: flex; flex-direction: column; gap: 8px; }

    /* ─── Razorpay Card ─── */
    .rzp-card {
      background: linear-gradient(180deg, rgba(37,99,235,0.08), rgba(37,99,235,0.02));
      border-color: rgba(37,99,235,0.25);
    }
    .rzp-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .rzp-logo {
      background: #2563eb;
      padding: 4px 12px;
      border-radius: 6px;
    }
    .rzp-logo-text {
      color: #fff;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .rzp-secure-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #22c55e;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .rzp-order-info {
      margin-bottom: 10px;
    }
    .rzp-order-id {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
    }
    .rzp-amount-display {
      text-align: center;
      margin: 10px 0;
    }
    .rzp-currency {
      font-size: 18px;
      color: var(--text-muted, #94a3b8);
      margin-right: 4px;
    }
    .rzp-amount-num {
      font-size: 28px;
      font-weight: 800;
      color: #2563eb;
    }
    .rzp-description {
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
      margin-bottom: 10px;
      line-height: 1.5;
    }
    .rzp-form { margin-top: 4px; }

    /* ─── Cashfree Card ─── */
    .cf-card {
      background: linear-gradient(180deg, rgba(14,165,233,0.08), rgba(14,165,233,0.02));
      border-color: rgba(14,165,233,0.25);
    }
    .cf-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .cf-logo {
      display: flex;
      flex-direction: column;
    }
    .cf-logo-text {
      font-size: 15px;
      font-weight: 800;
      color: #0ea5e9;
    }
    .cf-logo-sub {
      font-size: 9px;
      color: var(--text-muted, #94a3b8);
      letter-spacing: 1px;
      text-transform: uppercase;
    }
    .cf-secure-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: #22c55e;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .cf-order-info { margin-bottom: 10px; }
    .cf-order-id { font-size: 11px; color: var(--text-muted, #94a3b8); }
    .cf-amount-display {
      text-align: center;
      margin: 10px 0;
    }
    .cf-currency {
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      margin-right: 4px;
    }
    .cf-amount-num {
      font-size: 28px;
      font-weight: 800;
      color: #0ea5e9;
    }
    .cf-form { margin-top: 4px; }

    /* ─── Generic Card ─── */
    .generic-card {
      background: rgba(255,255,255,0.03);
      text-align: center;
    }
    .generic-icon {
      margin-bottom: 10px;
      mat-icon { font-size: 40px; width: 40px; height: 40px; color: #6366f1; }
    }
    .generic-form { margin-top: 10px; text-align: left; }

    /* ─── Confirm Buttons ─── */
    .pgm-confirm-btn {
      width: 100%;
      height: 46px;
      margin-top: 8px;
      font-size: 13.5px;
      font-weight: 700;
      border-radius: 10px !important;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;

      &.upi-confirm {
        background: linear-gradient(135deg, #10b981, #059669) !important;
        color: #fff !important;
        &:hover:not([disabled]) { box-shadow: 0 4px 20px rgba(16,185,129,0.4); }
      }
      &.cash-confirm {
        background: linear-gradient(135deg, #f59e0b, #d97706) !important;
        color: #fff !important;
        &:hover:not([disabled]) { box-shadow: 0 4px 20px rgba(245,158,11,0.4); }
      }
      &.rzp-confirm {
        background: linear-gradient(135deg, #2563eb, #1d4ed8) !important;
        color: #fff !important;
        &:hover:not([disabled]) { box-shadow: 0 4px 20px rgba(37,99,235,0.4); }
      }
      &.cf-confirm {
        background: linear-gradient(135deg, #0ea5e9, #0284c7) !important;
        color: #fff !important;
        &:hover:not([disabled]) { box-shadow: 0 4px 20px rgba(14,165,233,0.4); }
      }
      &.generic-confirm {
        background: linear-gradient(135deg, #6366f1, #a855f7) !important;
        color: #fff !important;
      }

      &[disabled] { opacity: 0.5; cursor: not-allowed; }
    }

    /* ─── Footer ─── */
    .pgm-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 10px 20px;
      background: rgba(255,255,255,0.02);
      border-top: 1px solid rgba(255,255,255,0.06);
      font-size: 11px;
      color: var(--text-muted, #94a3b8);
      .pgm-footer-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .pgm-cancel-row {
      display: flex;
      justify-content: center;
      padding: 6px 20px 12px;
    }
    .pgm-cancel-link {
      color: var(--text-muted, #94a3b8);
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 4px;
      &:hover { color: var(--text-primary, #f1f5f9); }
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    /* ─── Utilities ─── */
    .w-full { width: 100%; }
    .monospace { font-family: 'Courier New', monospace; }
    .font-bold { font-weight: 700; }
    .accent-color { color: #6366f1; }
  `]
})
export class PaymentGatewayModalComponent implements OnInit {
  resolvedMethod = 'generic';
  upiConfig: any = null;
  qrDataUrl = '';
  isGeneratingQr = false;
  isProcessing = false;
  mockOrderId = '';

  upiForm!: FormGroup;
  cashForm!: FormGroup;
  rzpForm!: FormGroup;
  cfForm!: FormGroup;
  genericForm!: FormGroup;

  constructor(
    private dialogRef: MatDialogRef<PaymentGatewayModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PaymentGatewayInput,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private tenantContext: TenantContextService,
    @Inject(PAYMENT_SETTINGS_REPOSITORY_TOKEN) private settingsRepo: IPaymentSettingsRepository
  ) {}

  ngOnInit(): void {
    this.resolveMethod();
    this.initForms();
    this.generateMockOrderId();

    if (this.resolvedMethod === 'Manual UPI') {
      this.loadUPISettings();
    }
  }

  private resolveMethod(): void {
    const m = this.data.paymentMethod;
    if (m === 'Manual UPI') this.resolvedMethod = 'Manual UPI';
    else if (m === 'Cash') this.resolvedMethod = 'Cash';
    else if (m === 'Razorpay') this.resolvedMethod = 'Razorpay';
    else if (m === 'Cashfree') this.resolvedMethod = 'Cashfree';
    else this.resolvedMethod = 'generic';
  }

  private initForms(): void {
    this.upiForm = this.fb.group({
      utr: ['', [Validators.required, Validators.minLength(6)]]
    });
    this.cashForm = this.fb.group({
      receiptRef: [''],
      notes: ['']
    });
    this.rzpForm = this.fb.group({
      txnId: ['', Validators.required]
    });
    this.cfForm = this.fb.group({
      txnId: ['', Validators.required]
    });
    this.genericForm = this.fb.group({
      txnRef: ['', Validators.required]
    });
  }

  private generateMockOrderId(): void {
    const ts = Date.now();
    if (this.data.paymentMethod === 'Razorpay') {
      this.mockOrderId = `RZP-ORDER-${ts}`;
    } else if (this.data.paymentMethod === 'Cashfree') {
      this.mockOrderId = `CF-ORDER-${ts}`;
    } else {
      this.mockOrderId = `ORD-${ts}`;
    }
  }

  private loadUPISettings(): void {
    const gymId = this.data.gymId || this.tenantContext.getTenantId();
    if (!gymId) {
      this.upiConfig = { upiId: 'apexfit@upi', businessName: 'ApexFit Gym' };
      this.generateQR();
      return;
    }

    this.settingsRepo.getSettings(gymId).subscribe(settings => {
      const upiSetting = settings.find(s => s.provider === 'Manual UPI');
      if (upiSetting?.gatewayConfig) {
        this.upiConfig = upiSetting.gatewayConfig;
      } else {
        this.upiConfig = { upiId: 'apexfit@upi', businessName: 'ApexFit Gym' };
      }
      this.generateQR();
    }, () => {
      this.upiConfig = { upiId: 'apexfit@upi', businessName: 'ApexFit Gym' };
      this.generateQR();
    });
  }

  private async generateQR(): Promise<void> {
    if (!this.upiConfig) return;
    this.isGeneratingQr = true;
    try {
      const upiId = this.upiConfig.upiId || 'apexfit@upi';
      const bizName = encodeURIComponent(this.upiConfig.businessName || 'ApexFit Gym');
      const ref = encodeURIComponent(this.data.invoiceRef || 'Payment');
      const amount = this.data.amount.toFixed(2);
      const upiString = `upi://pay?pa=${upiId}&pn=${bizName}&am=${amount}&tn=${ref}&cu=INR`;

      this.qrDataUrl = await QRCode.toDataURL(upiString, {
        errorCorrectionLevel: 'H',
        width: 220,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
    } catch (err) {
      console.error('QR generation failed:', err);
      this.snackBar.open('QR generation failed. Use UPI ID to pay manually.', 'Dismiss', { duration: 3000 });
    } finally {
      this.isGeneratingQr = false;
    }
  }

  getProviderLabel(): string {
    switch (this.resolvedMethod) {
      case 'Manual UPI': return 'UPI';
      case 'Cash': return 'Cash';
      case 'Razorpay': return 'Razorpay';
      case 'Cashfree': return 'Cashfree';
      default: return this.data.paymentMethod || 'Payment';
    }
  }

  copyText(text: string): void {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Copied to clipboard!', 'Dismiss', { duration: 2000 });
    });
  }

  private buildResult(transactionId: string): PaymentGatewayResult {
    return {
      success: true,
      transactionId,
      method: this.data.paymentMethod,
      paidAmount: this.data.amount,
      paymentDate: new Date().toISOString()
    };
  }

  confirmUPI(): void {
    if (this.upiForm.invalid || this.isProcessing) return;
    this.isProcessing = true;
    const utr = this.upiForm.get('utr')!.value.trim();
    setTimeout(() => {
      this.isProcessing = false;
      this.snackBar.open('UPI payment confirmed! ✓', 'Dismiss', { duration: 2500 });
      this.dialogRef.close(this.buildResult(utr));
    }, 800);
  }

  confirmCash(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    const ref = this.cashForm.get('receiptRef')?.value || `CASH-${Date.now()}`;
    setTimeout(() => {
      this.isProcessing = false;
      this.snackBar.open('Cash collected and confirmed! ✓', 'Dismiss', { duration: 2500 });
      this.dialogRef.close(this.buildResult(ref));
    }, 600);
  }

  confirmRazorpay(): void {
    if (this.rzpForm.invalid || this.isProcessing) return;
    this.isProcessing = true;
    const txnId = this.rzpForm.get('txnId')!.value.trim();
    setTimeout(() => {
      this.isProcessing = false;
      this.snackBar.open('Razorpay payment confirmed! ✓', 'Dismiss', { duration: 2500 });
      this.dialogRef.close(this.buildResult(txnId));
    }, 1000);
  }

  confirmCashfree(): void {
    if (this.cfForm.invalid || this.isProcessing) return;
    this.isProcessing = true;
    const txnId = this.cfForm.get('txnId')!.value.trim();
    setTimeout(() => {
      this.isProcessing = false;
      this.snackBar.open('Cashfree payment confirmed! ✓', 'Dismiss', { duration: 2500 });
      this.dialogRef.close(this.buildResult(txnId));
    }, 1000);
  }

  confirmGeneric(): void {
    if (this.genericForm.invalid || this.isProcessing) return;
    this.isProcessing = true;
    const ref = this.genericForm.get('txnRef')!.value.trim();
    setTimeout(() => {
      this.isProcessing = false;
      this.dialogRef.close(this.buildResult(ref));
    }, 600);
  }

  onCancel(): void {
    this.dialogRef.close(undefined);
  }
}
