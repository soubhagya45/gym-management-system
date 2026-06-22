import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';

import { PaymentState } from '../../presentation/state/payment.state';
import { MemberState } from '../../presentation/state/member.state';
import { MembershipPlanState } from '../../presentation/state/membership-plan.state';
import { FinanceState } from '../../presentation/state/finance.state';
import { PAYMENT_SETTINGS_REPOSITORY_TOKEN, IPaymentSettingsRepository } from '../../core/interfaces/repository.interfaces';
import { Invoice } from '../../core/models/finance.entity';
import { PayNowModalComponent } from './pay-now-modal.component';

import { Payment } from '../../core/models/payment.entity';
import { Member } from '../../core/models/member.entity';
import { MembershipPlan } from '../../core/models/membership-plan.entity';

import { PaymentDialogComponent } from './payment-dialog.component';
import { RenewDialogComponent } from './renew-dialog.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { WhatsAppPreviewModalComponent } from '../whatsapp/whatsapp-preview-modal.component';
import { GymState } from '../../presentation/state/gym.state';
import { ExportService } from '../../domain/export/export.service';
import { MatMenuModule } from '@angular/material/menu';
import { SubmissionGuardService } from '../../services/submission-guard.service';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';

@Component({
  selector: 'app-invoice-details-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatDividerModule, MatIconModule],
  template: `
    <div style="padding: 20px; min-width: 400px; background: #1e1e2d; color: #ffffff;">
      <h2 style="margin-top: 0; color: #6366f1; font-weight: 800; font-size: 20px;">Invoice Details</h2>
      <mat-divider style="margin: 12px 0; border-color: rgba(255,255,255,0.08);"></mat-divider>
      
      <div style="display: flex; flex-direction: column; gap: 12px; font-size: 14px;">
        <div style="display: flex; justify-content: space-between;"><span style="color: #94a3b8;">Invoice Number:</span><strong class="monospace">{{ data.invoice.invoiceNumber }}</strong></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #94a3b8;">Member:</span><span>{{ data.invoice.memberName }}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #94a3b8;">Membership Plan:</span><span>{{ data.invoice.membershipPlan }}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #94a3b8;">Date:</span><span>{{ data.invoice.invoiceDate | date:'mediumDate' }}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #94a3b8;">Due Date:</span><span>{{ data.invoice.dueDate ? (data.invoice.dueDate | date:'mediumDate') : '—' }}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #94a3b8;">Subtotal:</span><span>₹{{ data.invoice.amount }}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #94a3b8;">GST (18% structure):</span><span>₹{{ data.invoice.gst ?? 0 }}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #94a3b8;">Total Amount:</span><strong style="color: var(--accent-color, #6366f1);">₹{{ data.invoice.finalAmount }}</strong></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #94a3b8;">Amount Paid:</span><span style="color: #22c55e; font-weight: bold;">₹{{ data.invoice.amountPaid ?? 0 }}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #94a3b8;">Pending Balance:</span><span style="color: #ef4444; font-weight: bold;">₹{{ data.invoice.pendingAmount ?? (data.invoice.finalAmount - (data.invoice.amountPaid ?? 0)) }}</span></div>
        <div style="display: flex; justify-content: space-between;"><span style="color: #94a3b8;">Status:</span><span style="text-transform: uppercase; font-weight: bold;">{{ data.invoice.status }}</span></div>
        
        <div *ngIf="data.invoice.locked" style="margin-top: 8px; padding: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 4px; color: #ef4444; display: flex; align-items: center; gap: 8px;">
          <mat-icon style="font-size: 18px; width:18px; height:18px;">lock</mat-icon>
          <span>Invoice is locked. Edit modifications are disabled.</span>
        </div>

        <div *ngIf="data.invoice.paymentHistory && data.invoice.paymentHistory.length > 0" style="margin-top: 12px;">
          <h4 style="margin: 0 0 8px 0; color: #e2e8f0; font-size: 13.5px;">Payment Installments History</h4>
          <div style="max-height: 120px; overflow-y: auto; background: rgba(0,0,0,0.2); border-radius: 6px; padding: 8px; font-size: 12.5px;">
            <div *ngFor="let pay of data.invoice.paymentHistory" style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.05); padding: 4px 0;">
              <span>{{ pay.date | date:'shortDate' }} ({{ pay.method }}):</span>
              <strong style="color: #22c55e;">₹{{ pay.amount }}</strong>
            </div>
          </div>
        </div>

        <div *ngIf="data.invoice.refundAmount" style="margin-top: 12px; background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 6px; padding: 10px;">
          <h4 style="margin: 0 0 6px 0; color: #f59e0b; font-size: 13.5px;">Refund Processed</h4>
          <div>Refunded: <strong>₹{{ data.invoice.refundAmount }}</strong> on {{ data.invoice.refundDate }} by {{ data.invoice.refundBy }}</div>
          <div style="font-size: 12px; color: #94a3b8; margin-top: 4px;">Reason: {{ data.invoice.refundReason }}</div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
        <button mat-flat-button color="primary" (click)="onClose()">Close</button>
      </div>
    </div>
  `
})
export class InvoiceDetailsDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<InvoiceDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { invoice: Invoice }
  ) {}

  onClose() {
    this.dialogRef.close();
  }
}

interface PaymentStats {
  totalCollected: number;
  outstandingDues: number;
  pendingCount: number;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatTabsModule,
    MatProgressBarModule,
    MatMenuModule
  ],
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss']
})
export class PaymentsComponent implements OnInit {
  historyColumns = ['name', 'plan', 'amount', 'paidAmount', 'dueAmount', 'date', 'dueDate', 'status', 'actions'];
  pendingColumns = ['invoiceNumber', 'memberName', 'mobileNumber', 'invoiceDate', 'dueDate', 'amount', 'outstandingAmount', 'status', 'daysOverdue', 'branch', 'createdBy', 'actions'];
  renewalColumns = ['name', 'plan', 'endDate', 'daysRemaining', 'status', 'actions'];

  dataSource = new MatTableDataSource<Payment>();
  pendingDataSource = new MatTableDataSource<Invoice>();
  membersDataSource = new MatTableDataSource<Member>();

  stats$: Observable<PaymentStats> | undefined;
  plans: MembershipPlan[] = [];

  searchQuery = '';
  selectedStatus = 'all';
  selectedPendingStatus = 'all';
  selectedRenewalStatus = 'all';
  activeTab = 0;

  constructor(
    private paymentState: PaymentState,
    private memberState: MemberState,
    private planState: MembershipPlanState,
    private gymState: GymState,
    private financeState: FinanceState,
    private tenantContext: TenantContextService,
    @Inject(PAYMENT_SETTINGS_REPOSITORY_TOKEN) private settingsRepo: IPaymentSettingsRepository,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private exportService: ExportService,
    public submissionGuard: SubmissionGuardService
  ) {}

  ngOnInit(): void {
    // 1. Subscribe to payments list
    this.paymentState.payments$.subscribe(payments => {
      this.dataSource.data = payments;
      this.applyFilters();
    });

    // 1b. Subscribe to invoices list
    this.financeState.invoices$.subscribe(invoices => {
      this.pendingDataSource.data = invoices.filter(
        p => p.status === 'pending' || p.status === 'overdue' || p.status === 'partially_paid'
      );
      this.applyFilters();
    });

    // 1c. Listen to query params for tab selection & status pre-filtering
    this.route.queryParams.subscribe(params => {
      if (params['tab'] !== undefined) {
        this.activeTab = parseInt(params['tab'], 10);
      }
      if (params['status'] !== undefined) {
        const targetStatus = params['status'];
        if (this.activeTab === 0) {
          this.selectedStatus = targetStatus;
        } else if (this.activeTab === 1) {
          this.selectedPendingStatus = targetStatus;
        } else if (this.activeTab === 2) {
          this.selectedRenewalStatus = targetStatus;
        }
      }
      this.applyFilters();
    });

    // 2. Subscribe to members list for renewal tracking
    this.memberState.members$.subscribe(members => {
      this.membersDataSource.data = members;
      this.applyFilters();
    });

    // 3. Subscribe to plans to fetch pricing and helper counts
    this.planState.plans$.subscribe(plans => {
      this.plans = plans;
    });

    // 4. Compute dynamic stats
    this.stats$ = this.paymentState.payments$.pipe(
      map(payments => {
        const totalCollected = payments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.paidAmount, 0);

        const outstandingDues = payments
          .filter(p => p.status === 'pending' || p.status === 'overdue')
          .reduce((sum, p) => sum + p.dueAmount, 0);

        const pendingCount = payments.filter(p => p.status === 'pending').length;

        return {
          totalCollected,
          outstandingDues,
          pendingCount
        };
      })
    );
  }

  applyFilters() {
    const query = this.searchQuery.trim().toLowerCase();
    
    this.dataSource.filterPredicate = (data: Payment, filter: string) => {
      const matchesSearch = data.memberName.toLowerCase().includes(query) ||
                            data.planName.toLowerCase().includes(query);
      const matchesStatus = this.selectedStatus === 'all' || data.status === this.selectedStatus;
      return matchesSearch && matchesStatus;
    };
    this.dataSource.filter = query + '_' + this.selectedStatus;

    this.pendingDataSource.filterPredicate = (data: Invoice, filter: string) => {
      const matchesSearch = data.memberName.toLowerCase().includes(query) ||
                            data.membershipPlan.toLowerCase().includes(query);
      const matchesStatus = this.selectedPendingStatus === 'all' ?
                            (data.status === 'pending' || data.status === 'overdue' || data.status === 'partially_paid') :
                            data.status === this.selectedPendingStatus;
      return matchesSearch && matchesStatus;
    };
    this.pendingDataSource.filter = query + '_' + this.selectedPendingStatus;

    this.membersDataSource.filterPredicate = (data: Member, filter: string) => {
      const matchesSearch = data.name.toLowerCase().includes(query) ||
                            data.planName.toLowerCase().includes(query);
      const matchesStatus = this.selectedRenewalStatus === 'all' || data.status === this.selectedRenewalStatus;
      return matchesSearch && matchesStatus;
    };
    this.membersDataSource.filter = query + '_' + this.selectedRenewalStatus;
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.selectedPendingStatus = 'all';
    this.selectedRenewalStatus = 'all';
    this.applyFilters();
  }

  openRecordPaymentDialog() {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '550px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (!this.submissionGuard.start('payment-add')) {
          return;
        }
        this.paymentState.addPayment(result).subscribe({
          next: () => {
            this.submissionGuard.end('payment-add');
            this.snackBar.open('Invoice recorded successfully!', 'Dismiss', {
              duration: 3000
            });
          },
          error: (err) => {
            this.submissionGuard.end('payment-add');
            this.snackBar.open(err.message || 'Failed to record invoice', 'Dismiss', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  exportData(format: 'csv' | 'excel') {
    this.gymState.activeGymFeatures$.pipe(take(1)).subscribe(features => {
      if (!features || !features.canExportReports) {
        this.snackBar.open('Export Reports feature is locked on your current plan. Please upgrade to Pro or Enterprise.', 'Upgrade Plan', {
          duration: 5000
        }).onAction().subscribe(() => {
          this.router.navigate(['/settings']);
        });
        return;
      }

      this.snackBar.open(`Ledger report generated! Downloading ${format.toUpperCase()}...`, 'Dismiss', {
        duration: 3000
      });

      const exportData = this.dataSource.data.map(p => ({
        ID: p.id,
        Member: p.memberName,
        Plan: p.planName,
        TotalAmount: p.amount,
        PaidAmount: p.paidAmount,
        DueAmount: p.dueAmount,
        InvoiceDate: p.date,
        Status: p.status
      }));

      const filename = `payments_ledger_${new Date().toISOString().split('T')[0]}`;
      if (format === 'csv') {
        this.exportService.exportToCsv(filename, exportData);
      } else {
        this.exportService.exportToExcel(filename, exportData);
      }
    });
  }

  markAsPaid(payment: Payment) {
    this.paymentState.confirmPayment(payment.id).subscribe(() => {
      this.snackBar.open(`Payment of ₹${payment.amount} from ${payment.memberName} marked as PAID.`, 'Dismiss', {
        duration: 3000
      });
    });
  }

  sendReminder(payment: Payment) {
    this.paymentState.sendPaymentReminder(payment.id);
    this.snackBar.open(`Reminder message sent to ${payment.memberName} successfully.`, 'Dismiss', {
      duration: 3000
    });
  }

  openRenewDialog(member: Member) {
    const dialogRef = this.dialog.open(RenewDialogComponent, {
      width: '600px',
      data: { member }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (!this.submissionGuard.start('membership-renew')) {
          return;
        }
        this.memberState.renewMembership(
          result.memberId,
          result.planId,
          result.planName || 'Membership Plan',
          result.startDate,
          result.endDate || result.startDate,
          result.price,
          result.paidAmount,
          result.dueAmount,
          result.dueDate,
          result.paymentStatus,
          result.paymentMethod,
          result.discountType,
          result.discountValue,
          result.originalAmount
        ).subscribe({
          next: () => {
            this.submissionGuard.end('membership-renew');
            this.snackBar.open(`Membership renewed successfully for ${member.name}!`, 'Dismiss', {
              duration: 3000
            });
          },
          error: (err) => {
            this.submissionGuard.end('membership-renew');
            this.snackBar.open(err.message || 'Failed to renew membership', 'Dismiss', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  getDaysRemaining(member: Member): number {
    const end = new Date(member.endDate).getTime();
    const now = new Date();
    now.setHours(0,0,0,0);
    const diff = end - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getDaysPercent(member: Member): number {
    const start = new Date(member.startDate).getTime();
    const end = new Date(member.endDate).getTime();
    const now = new Date().getTime();
    const total = end - start;
    if (total <= 0) return 100;
    const elapsed = now - start;
    const percent = Math.round((elapsed / total) * 100);
    return Math.min(100, Math.max(0, percent));
  }

  printInvoice(payment: Payment) {
    this.snackBar.open(`Generating invoice slip for ${payment.memberName}...`, 'Dismiss', {
      duration: 2000
    });
  }

  getMemberPhone(memberId: string): string {
    let phone = '+91 99887 76655';
    this.memberState.members$.pipe(take(1)).subscribe(members => {
      const found = members.find(m => m.id === memberId);
      if (found) {
        phone = found.phone;
      }
    });
    return phone;
  }

  openWhatsAppPaymentDialog(payment: Payment) {
    const phone = this.getMemberPhone(payment.memberId);
    this.dialog.open(WhatsAppPreviewModalComponent, {
      width: '800px',
      data: {
        name: payment.memberName,
        phone,
        recipientType: 'payment',
        variables: {
          planName: payment.planName,
          amount: payment.dueAmount,
          dueDate: payment.dueDate,
          gymName: 'Apex Fit Downtown'
        }
      }
    });
  }

  openWhatsAppRenewalDialog(member: Member) {
    this.dialog.open(WhatsAppPreviewModalComponent, {
      width: '800px',
      data: {
        name: member.name,
        phone: member.phone,
        recipientType: 'renewal',
        variables: {
          planName: member.planName,
          dueDate: member.endDate,
          amount: member.balance,
          gymName: 'Apex Fit Downtown'
        }
      }
    });
  }

  viewInvoice(invoice: Invoice) {
    this.dialog.open(InvoiceDetailsDialogComponent, {
      width: '500px',
      data: { invoice }
    });
  }

  payNow(invoice: Invoice) {
    const dialogRef = this.dialog.open(PayNowModalComponent, {
      width: '550px',
      data: { invoice }
    });
    dialogRef.afterClosed().subscribe(res => {
      if (res) {
        this.financeState.loadFinanceData();
      }
    });
  }

  generateInvoiceQR(invoice: Invoice) {
    this.dialog.open(PayNowModalComponent, {
      width: '550px',
      data: { invoice }
    });
  }

  sendPaymentLink(invoice: Invoice) {
    const link = `https://apexfit.io/checkout/${invoice.id}`;
    navigator.clipboard.writeText(link).then(() => {
      this.snackBar.open(`Payment link copied to clipboard: ${link}`, 'Dismiss', { duration: 3000 });
    });
  }

  shareWhatsApp(invoice: Invoice) {
    const phone = this.getMemberPhone(invoice.memberId);
    this.dialog.open(WhatsAppPreviewModalComponent, {
      width: '800px',
      data: {
        name: invoice.memberName,
        phone,
        recipientType: 'payment',
        variables: {
          planName: invoice.membershipPlan,
          amount: invoice.pendingAmount ?? invoice.amount,
          dueDate: invoice.dueDate || '',
          gymName: 'Apex Fit Downtown'
        }
      }
    });
  }

  shareSMS(invoice: Invoice) {
    this.snackBar.open(`SMS notification request sent to ${invoice.memberName} successfully.`, 'Dismiss', { duration: 3000 });
  }

  shareEmail(invoice: Invoice) {
    this.snackBar.open(`Invoice email queued to ${invoice.memberName} successfully.`, 'Dismiss', { duration: 3000 });
  }

  recordManualCollection(invoice: Invoice) {
    this.payNow(invoice);
  }

  instantMarkPaid(invoice: Invoice) {
    const amountToPay = invoice.pendingAmount ?? invoice.amount;
    const today = new Date();
    const yearMonth = today.toISOString().slice(0, 7).replace('-', '');
    const randSerial = Math.floor(100000 + Math.random() * 900000);
    const receiptNumber = `RCT-${yearMonth}-${randSerial}`;

    const updated: Invoice = {
      ...invoice,
      amountPaid: (invoice.amountPaid ?? 0) + amountToPay,
      pendingAmount: 0,
      status: 'paid',
      locked: true,
      receiptNumber: receiptNumber,
      paymentHistory: [
        ...(invoice.paymentHistory || []),
        {
          paymentId: 'pay_' + Math.random().toString(36).substring(2, 9),
          amount: amountToPay,
          date: today.toISOString(),
          method: 'Cash',
          status: 'Success',
          transactionId: 'txn-' + Math.random().toString(36).substring(2, 9)
        }
      ]
    };

    this.financeState.updateInvoice(updated).subscribe(() => {
      this.snackBar.open(`Invoice ${invoice.invoiceNumber} successfully marked as PAID. Receipt ${receiptNumber} generated.`, 'Dismiss', { duration: 4000 });
    });
  }

  addReminder(invoice: Invoice) {
    this.snackBar.open(`Payment reminder scheduled for invoice ${invoice.invoiceNumber}.`, 'Dismiss', { duration: 3000 });
  }

  createFollowUp(invoice: Invoice) {
    this.snackBar.open(`CRM follow-up task recorded for member ${invoice.memberName}.`, 'Dismiss', { duration: 3000 });
  }

  viewReceipts(invoice: Invoice) {
    if (!invoice.receiptNumber) {
      this.snackBar.open('No receipt found for this invoice. Settle invoice to generate receipts.', 'Dismiss', { duration: 3000 });
      return;
    }
    this.snackBar.open(`Receipt Number: ${invoice.receiptNumber}. View details in View Details card.`, 'Dismiss', { duration: 4000 });
  }

  refundInvoice(invoice: Invoice) {
    const today = new Date();
    const updated: Invoice = {
      ...invoice,
      status: 'refunded',
      refundAmount: invoice.amountPaid || invoice.amount,
      refundReason: 'Member Cancellation Request',
      refundDate: today.toISOString().split('T')[0],
      refundBy: 'Sophia Chen'
    };
    this.financeState.updateInvoice(updated).subscribe(() => {
      this.snackBar.open(`Refund of ₹${updated.refundAmount} processed successfully for ${invoice.invoiceNumber}.`, 'Dismiss', { duration: 4000 });
    });
  }

  toggleInvoiceLock(invoice: Invoice) {
    const updated: Invoice = {
      ...invoice,
      locked: !invoice.locked
    };
    this.financeState.updateInvoice(updated).subscribe(() => {
      const lockStateStr = updated.locked ? 'LOCKED' : 'UNLOCKED';
      this.snackBar.open(`Invoice ${invoice.invoiceNumber} is now ${lockStateStr}.`, 'Dismiss', { duration: 3000 });
    });
  }

  getDaysOverdue(dueDateStr?: string): number {
    if (!dueDateStr) return 0;
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = today.getTime() - dueDate.getTime();
    if (diff <= 0) return 0;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  getBranchName(branchId?: string): string {
    if (!branchId) return 'Main Branch';
    if (branchId === 'br-1') return 'Downtown Main Branch';
    if (branchId === 'br-2') return 'Koramangala Extension';
    return branchId;
  }
}
