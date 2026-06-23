import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { PaymentProviderFactory } from '../../domain/payments/payment-provider.factory';
import { PAYMENT_SETTINGS_REPOSITORY_TOKEN, IPaymentSettingsRepository, MEMBER_REPOSITORY_TOKEN, IMemberRepository, FINANCE_REPOSITORY_TOKEN, IFinanceRepository } from '../../core/interfaces/repository.interfaces';
import { Invoice, Collection } from '../../core/models/finance.entity';
import { PaymentSettings } from '../../core/models/payment-settings.model';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { FinanceState } from '../../presentation/state/finance.state';
import { PaymentState } from '../../presentation/state/payment.state';
import { MemberState } from '../../presentation/state/member.state';
import { Payment } from '../../core/models/payment.entity';
import { auditLogRepositoryFactory } from '../../data/providers/repository.providers';
import { AuditLoggerService } from '../../services/audit-logger.service';

@Component({
  selector: 'app-pay-now-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <div class="checkout-modal-container">
      <div class="modal-header">
        <h2>ApexFit Secure Checkout</h2>
        <button mat-icon-button (click)="onClose()" class="close-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-divider></mat-divider>

      <div class="modal-body" *ngIf="invoice">
        <!-- Invoice Summary Card -->
        <div class="invoice-summary-card">
          <div class="summary-row">
            <span class="label">Invoice No:</span>
            <span class="value monospace">{{ invoice.invoiceNumber }}</span>
          </div>
          <div class="summary-row">
            <span class="label">Member:</span>
            <span class="value">{{ invoice.memberName }}</span>
          </div>
          <div class="summary-row">
            <span class="label">Membership Plan:</span>
            <span class="value">{{ invoice.membershipPlan }}</span>
          </div>
          <div class="summary-row">
            <span class="label">Total Amount:</span>
            <span class="value">₹{{ invoice.finalAmount }}</span>
          </div>
          <div class="summary-row highlight">
            <span class="label">Outstanding Due:</span>
            <span class="value text-danger">₹{{ outstandingAmount }}</span>
          </div>
        </div>

        <form [formGroup]="paymentForm" (ngSubmit)="processPayment()" class="payment-form">
          <!-- Step 1: Select Amount -->
          <div class="form-section">
            <h3 class="section-title"><span class="step-num">1</span> Enter Payment Amount</h3>
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Amount to Pay (₹)</mat-label>
              <input matInput type="number" formControlName="amount" placeholder="Enter amount">
              <mat-error *ngIf="paymentForm.get('amount')?.hasError('max')">
                Amount cannot exceed the outstanding due of ₹{{ outstandingAmount }}
              </mat-error>
              <mat-error *ngIf="paymentForm.get('amount')?.hasError('min')">
                Amount must be at least ₹1
              </mat-error>
            </mat-form-field>
          </div>

          <!-- Step 2: Select Provider -->
          <div class="form-section">
            <h3 class="section-title"><span class="step-num">2</span> Choose Payment Provider</h3>
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Payment Gateway / Method</mat-label>
              <mat-select formControlName="provider" (selectionChange)="onProviderChange()">
                <mat-option *ngFor="let p of availableProviders" [value]="p.provider">
                  {{ p.provider }} {{ p.enabled ? '(Active)' : '(Disabled)' }}
                </mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <!-- Dynamic UPI QR Code Display -->
          <div class="qr-container" *ngIf="paymentForm.get('provider')?.value === 'Manual UPI' && upiQrData">
            <div class="qr-card">
              <p class="qr-instruction">Scan this UPI QR code using any UPI app (GPay, PhonePe, Paytm, BHIM) to pay:</p>
              
              <div class="qr-image-wrapper">
                <img [src]="qrCodeImageUrl" alt="UPI Payment QR Code" class="qr-img">
              </div>

              <div class="upi-details-copy-box">
                <div class="detail-row">
                  <span class="lbl">UPI ID:</span>
                  <span class="val monospace">{{ activeUPIConfig?.upiId }}</span>
                  <button type="button" mat-icon-button (click)="copyToClipboard(activeUPIConfig?.upiId)" matTooltip="Copy UPI ID">
                    <mat-icon class="copy-icon">content_copy</mat-icon>
                  </button>
                </div>
                <div class="detail-row mt-2">
                  <span class="lbl">Payee Name:</span>
                  <span class="val">{{ activeUPIConfig?.businessName }}</span>
                </div>
                <div class="detail-row mt-2">
                  <span class="lbl">Amount:</span>
                  <span class="val font-bold">₹{{ paymentForm.get('amount')?.value }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Confirmation Transaction Reference -->
          <div class="form-section mt-4">
            <h3 class="section-title"><span class="step-num">3</span> Transaction Reference</h3>
            <mat-form-field appearance="outline" class="w-100">
              <mat-label>Transaction UTR / ID</mat-label>
              <input matInput formControlName="transactionId" placeholder="e.g. TXN18362548901">
              <mat-error *ngIf="paymentForm.get('transactionId')?.hasError('required')">
                Transaction reference ID is required to log the payment.
              </mat-error>
            </mat-form-field>
          </div>

          <div class="action-footer">
            <button mat-stroked-button type="button" (click)="onClose()">Cancel</button>
            <button mat-flat-button color="primary" type="submit" [disabled]="paymentForm.invalid || isProcessing">
              <mat-icon *ngIf="!isProcessing">check_circle</mat-icon>
              <span>{{ isProcessing ? 'Processing Transaction...' : 'Complete Payment' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .checkout-modal-container {
      padding: 16px;
      max-width: 500px;
      background: var(--card-background, #1e1e2d);
      color: var(--text-primary, #ffffff);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      h2 {
        font-size: 20px;
        font-weight: 800;
        margin: 0;
        color: var(--accent-color, #6366f1);
      }
    }
    .modal-body {
      padding-top: 16px;
      max-height: 60vh;
      overflow-y: auto;
      padding-right: 8px;
    }
    .modal-body::-webkit-scrollbar {
      width: 6px;
    }
    .modal-body::-webkit-scrollbar-track {
      background: transparent;
    }
    .modal-body::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
    }
    .modal-body::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .invoice-summary-card {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 10px;

      .summary-row {
        display: flex;
        justify-content: space-between;
        font-size: 13.5px;
        .label { color: var(--text-muted, #94a3b8); }
        .value { font-weight: 600; }
        &.highlight {
          border-top: 1px dashed var(--border-color, rgba(255, 255, 255, 0.08));
          padding-top: 10px;
          margin-top: 5px;
          font-size: 15px;
          font-weight: 700;
        }
      }
    }
    .section-title {
      font-size: 14.5px;
      font-weight: 700;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--text-secondary, #e2e8f0);

      .step-num {
        background: var(--accent-color, #6366f1);
        color: #ffffff;
        font-size: 11px;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
      }
    }
    .qr-container {
      margin-top: 16px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      border-radius: 12px;
      padding: 16px;
    }
    .qr-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      .qr-instruction {
        font-size: 12px;
        color: var(--text-muted, #94a3b8);
        margin-bottom: 16px;
        line-height: 1.4;
      }
    }
    .qr-image-wrapper {
      background: #ffffff;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 16px;
      display: flex;
      justify-content: center;
      align-items: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      .qr-img {
        width: 180px;
        height: 180px;
        display: block;
      }
    }
    .upi-details-copy-box {
      width: 100%;
      background: rgba(0,0,0,0.2);
      border-radius: 8px;
      padding: 12px;
      font-size: 12.5px;
      .detail-row {
        display: flex;
        align-items: center;
        .lbl { color: var(--text-muted, #94a3b8); width: 80px; text-align: left; }
        .val { font-weight: 600; flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .copy-icon { font-size: 16px; width: 16px; height: 16px; color: var(--accent-color, #6366f1); cursor: pointer; }
      }
    }
    .action-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      padding-top: 16px;
    }
    .w-100 { width: 100%; }
    .mt-2 { margin-top: 8px; }
    .mt-4 { margin-top: 16px; }
    .font-bold { font-weight: 700; }
  `]
})
export class PayNowModalComponent implements OnInit {
  invoice!: Invoice;
  outstandingAmount = 0;
  availableProviders: PaymentSettings[] = [];
  activeUPIConfig: any = null;
  upiQrData = '';
  qrCodeImageUrl = '';
  paymentForm!: FormGroup;
  isProcessing = false;

  constructor(
    private dialogRef: MatDialogRef<PayNowModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { invoice: Invoice },
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private providerFactory: PaymentProviderFactory,
    private tenantContext: TenantContextService,
    private financeState: FinanceState,
    @Inject(PAYMENT_SETTINGS_REPOSITORY_TOKEN) private settingsRepo: IPaymentSettingsRepository,
    @Inject(MEMBER_REPOSITORY_TOKEN) private memberRepo: IMemberRepository,
    @Inject(FINANCE_REPOSITORY_TOKEN) private financeRepo: IFinanceRepository,
    private auditLogger: AuditLoggerService,
    private paymentState: PaymentState,
    private memberState: MemberState
  ) {
    if (data && data.invoice) {
      this.invoice = data.invoice;
      const finalAmt = this.invoice.finalAmount;
      const amtPaid = this.invoice.amountPaid ?? 0;
      this.outstandingAmount = Number((finalAmt - amtPaid).toFixed(2));
    }
  }

  ngOnInit(): void {
    this.paymentForm = this.fb.group({
      amount: [this.outstandingAmount, [Validators.required, Validators.min(1), Validators.max(this.outstandingAmount)]],
      provider: ['Manual UPI', Validators.required],
      transactionId: ['', Validators.required]
    });

    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      // Fetch settings to know what providers are configured
      this.settingsRepo.getSettings(gymId).subscribe(settings => {
        // Find all enabled payment providers or seed defaults
        this.availableProviders = settings.filter(s => s.enabled);
        if (this.availableProviders.length === 0) {
          // If no providers are explicitly enabled, mock UPI as fallback
          this.availableProviders = [{
            gymId, provider: 'Manual UPI', enabled: true, gatewayConfig: {
              upiId: 'apexfit@upi', businessName: 'ApexFit Gym', autoGenerateQR: true
            }, createdAt: '', updatedAt: ''
          }];
        }
        
        // Find manual UPI config specifically to render QR code
        const upiSettings = settings.find(s => s.provider === 'Manual UPI');
        this.activeUPIConfig = upiSettings?.gatewayConfig || {
          upiId: 'apexfit@upi',
          businessName: 'ApexFit Gym',
          autoGenerateQR: true
        };

        this.generateUPIQRData();
      });
    }

    // Monitor amount changes to re-render UPI QR
    this.paymentForm.get('amount')?.valueChanges.subscribe(() => {
      this.generateUPIQRData();
    });
  }

  generateUPIQRData() {
    if (!this.invoice || !this.activeUPIConfig) return;
    const amount = this.paymentForm.get('amount')?.value || 0;
    if (amount <= 0) {
      this.upiQrData = '';
      this.qrCodeImageUrl = '';
      return;
    }

    const upiId = this.activeUPIConfig.upiId || 'apexfit@upi';
    const bizName = this.activeUPIConfig.businessName || 'ApexFit Gym';
    const note = `Inv-${this.invoice.invoiceNumber}`;
    this.upiQrData = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(bizName)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(note)}`;
    
    // Live QR API to generate a beautiful, scanable QR code image
    this.qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(this.upiQrData)}`;
  }

  onProviderChange() {
    const provider = this.paymentForm.get('provider')?.value;
    if (provider !== 'Manual UPI') {
      this.upiQrData = '';
      this.qrCodeImageUrl = '';
      // Placeholders like Razorpay/Cashfree don't need required Transaction ID initially since they process online
      // But for our mockup checkouts, we ask the user to enter a mock txn reference anyway
    } else {
      this.generateUPIQRData();
    }
  }

  copyToClipboard(text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open('Copied to clipboard!', 'Dismiss', { duration: 2000 });
    });
  }

  processPayment() {
    if (this.paymentForm.invalid || !this.invoice || this.isProcessing) return;
    this.isProcessing = true;

    const amountPaid = this.paymentForm.get('amount')?.value;
    const providerName = this.paymentForm.get('provider')?.value;
    const txnId = this.paymentForm.get('transactionId')?.value;
    const gymId = this.tenantContext.getTenantId() || this.invoice.gymId;
    const branchId = this.tenantContext.getBranchId() || this.invoice.branchId || 'br-1';

    // 1. Resolve Provider via Factory
    const provider = this.providerFactory.getProvider(providerName);

    // Call createOrder & verifyPayment pipeline
    provider.createOrder(gymId, branchId, this.invoice.id, amountPaid, 'INR').subscribe(order => {
      provider.verifyPayment(gymId, order.orderId, txnId).subscribe(verifyResult => {
        if (verifyResult.success) {
          // 2. Load Member to verify Freeze Protection status
          this.memberRepo.getMemberById(gymId, this.invoice.memberId).subscribe(member => {
            if (!member) {
              this.snackBar.open('Error: Member record not found.', 'Dismiss', { duration: 3000 });
              this.isProcessing = false;
              return;
            }

            // Check if member is frozen
            const isFrozen = member.membershipFreezeStatus === 'frozen';

            // Calculate outstanding amounts
            const totalInvoiced = this.invoice.finalAmount;
            const currentPaid = (this.invoice.amountPaid ?? 0) + amountPaid;
            const remainingDue = Number((totalInvoiced - currentPaid).toFixed(2));
            const newStatus = remainingDue <= 0 ? 'paid' : 'partially_paid';

            // Receipts are auto-generated as RCT-YYYYMM-000001
            const today = new Date();
            const yearMonth = today.toISOString().slice(0, 7).replace('-', '');
            const randSerial = Math.floor(100000 + Math.random() * 900000);
            const receiptNumber = `RCT-${yearMonth}-${randSerial}`;

            // Create collection entry
            const collectionId = 'col_' + Math.random().toString(36).substring(2, 9);
            const newCollection: Collection = {
              id: collectionId,
              gymId,
              branchId,
              receiptNo: receiptNumber,
              memberId: this.invoice.memberId,
              memberName: this.invoice.memberName,
              membershipPlan: this.invoice.membershipPlan,
              amount: amountPaid,
              paymentMethod: providerName === 'Manual UPI' ? 'UPI' : providerName,
              date: today.toISOString().split('T')[0],
              collectedBy: this.invoice.createdBy || 'System',
              salespersonId: this.invoice.salespersonId || '',
              salespersonName: this.invoice.salespersonName || '',
              type: this.invoice.type as any || 'membership',
              trainerId: this.invoice.trainerId || '',
              trainerName: this.invoice.trainerName || ''
            };

            // Setup payment history entry
            const paymentHistoryItem = {
              paymentId: 'pay_' + Math.random().toString(36).substring(2, 9),
              amount: amountPaid,
              date: today.toISOString(),
              method: providerName === 'Manual UPI' ? 'UPI' : providerName,
              status: 'Success',
              transactionId: txnId
            };

            // Update Invoice fields
            const updatedInvoice: Invoice = {
              ...this.invoice,
              amountPaid: currentPaid,
              pendingAmount: remainingDue,
              status: newStatus,
              receiptNumber: receiptNumber,
              paymentHistory: [...(this.invoice.paymentHistory || []), paymentHistoryItem]
            };

            // If settled fully, lock invoice editing
            if (newStatus === 'paid') {
              updatedInvoice.locked = true;
            }

            // Save updated invoice
            this.financeRepo.updateInvoice(gymId, updatedInvoice).subscribe(() => {
              // Add collection
              this.financeRepo.addCollection(gymId, newCollection).subscribe(() => {
                
                // 3. Process membership actions based on type
                if (newStatus === 'paid') {
                  if (isFrozen) {
                    // Queue activation
                    member.queuedActivationInvoiceId = this.invoice.id;
                    this.memberRepo.updateMember(gymId, member).subscribe(() => {
                      this.auditLogger.log(
                        'Membership Activation Queued (Freeze Protection)',
                        'member',
                        member.id,
                        member.name
                      );
                      this.snackBar.open('Invoice settled! Membership activation queued until freeze period ends.', 'Dismiss', { duration: 5000 });
                      this.financeState.loadFinanceData();
                      this.paymentState.loadPayments();
                      this.memberState.loadMembers();
                      this.dialogRef.close(true);
                    });
                  } else {
                    // Activate immediately
                    member.status = 'active';
                    // Update start/end date based on membership type
                    const startDate = new Date();
                    const endDate = new Date();
                    if (this.invoice.type === 'renewal' || this.invoice.type === 'membership') {
                      if (this.invoice.billingCycle === 'quarterly') {
                        endDate.setMonth(startDate.getMonth() + 3);
                      } else if (this.invoice.billingCycle === 'half-yearly') {
                        endDate.setMonth(startDate.getMonth() + 6);
                      } else if (this.invoice.billingCycle === 'annual') {
                        endDate.setMonth(startDate.getMonth() + 12);
                      } else {
                        endDate.setMonth(startDate.getMonth() + 1); // monthly
                      }
                      member.startDate = startDate.toISOString().split('T')[0];
                      member.endDate = endDate.toISOString().split('T')[0];
                    }
                    this.memberRepo.updateMember(gymId, member).subscribe(() => {
                      this.auditLogger.log(
                        'Membership Activated (Paid Invoice)',
                        'member',
                        member.id,
                        member.name
                      );
                      this.snackBar.open('Invoice settled! Membership activated successfully.', 'Dismiss', { duration: 4000 });
                      this.financeState.loadFinanceData();
                      this.paymentState.loadPayments();
                      this.memberState.loadMembers();
                      this.dialogRef.close(true);
                    });
                  }
                } else {
                  // Partially Paid
                  this.auditLogger.log(
                    `Partial Payment Recorded (₹${amountPaid})`,
                    'invoice',
                    this.invoice.id,
                    this.invoice.invoiceNumber
                  );
                  this.snackBar.open(`Partial payment of ₹${amountPaid} logged. Outstanding: ₹${remainingDue}`, 'Dismiss', { duration: 4000 });
                  this.financeState.loadFinanceData();
                  this.paymentState.loadPayments();
                  this.memberState.loadMembers();
                  this.dialogRef.close(true);
                }

              });
            });

          });
        } else {
          this.snackBar.open('Payment verification failed. Please check reference ID.', 'Dismiss', { duration: 4000 });
          this.isProcessing = false;
        }
      }, err => {
        this.snackBar.open(`Verification error: ${err.message || err}`, 'Dismiss', { duration: 4000 });
        this.isProcessing = false;
      });
    }, err => {
      this.snackBar.open(`Order creation error: ${err.message || err}`, 'Dismiss', { duration: 4000 });
      this.isProcessing = false;
    });
  }

  onClose() {
    this.dialogRef.close(false);
  }
}
