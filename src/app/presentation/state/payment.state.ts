import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { Payment } from '../../core/models/payment.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { FinanceState } from './finance.state';
import { InvoiceStatusService } from '../../services/invoice-status.service';
import { PaymentService } from '../../services/payment.service';
import { PagedRequest, PagedResponse } from '../../core/models/pagination.contracts';

@Injectable({
  providedIn: 'root'
})
export class PaymentState {
  private paymentsSubject = new BehaviorSubject<Payment[]>([]);
  payments$ = this.paymentsSubject.asObservable();

  constructor(
    private paymentService: PaymentService,
    private tenantContext: TenantContextService,
    private financeState: FinanceState,
    private invoiceStatusService: InvoiceStatusService
  ) {
    combineLatest([
      this.tenantContext.activeGymId$,
      this.tenantContext.activeBranchId$
    ]).pipe(
      switchMap(([gymId, branchId]) => {
        if (!gymId) return of([]);
        return this.paymentService.getPayments().pipe(
          catchError(err => {
            console.error('Error fetching payments:', err);
            return of([]);
          })
        );
      })
    ).subscribe(payments => {
      this.paymentsSubject.next(this.augmentPayments(payments));
    });
  }

  private augmentPayments(payments: Payment[]): Payment[] {
    return payments.map(payment => {
      const finalAmt = payment.amount !== undefined ? Number(payment.amount) : 0;
      const paidAmt = payment.paidAmount ?? 0;
      const pendingAmt = payment.dueAmount !== undefined ? Number(payment.dueAmount) : (finalAmt - paidAmt);
      
      const status = this.invoiceStatusService.calculateInvoiceStatus(payment);
      const overdueDays = this.invoiceStatusService.calculateDaysOverdue(payment);
      
      return {
        ...payment,
        dueAmount: pendingAmt,
        paidAmount: paidAmt,
        status,
        overdueDays,
        outstandingAmount: pendingAmt
      };
    });
  }

  loadPayments(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.paymentService.getPayments().subscribe(payments => {
        this.paymentsSubject.next(this.augmentPayments(payments));
      });
    }
  }

  getPaymentsPaged(req: PagedRequest): Observable<PagedResponse<Payment>> {
    return this.paymentService.getPaymentsPaged(req);
  }

  addPayment(payment: Omit<Payment, 'id' | 'gymId'>): Observable<Payment> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.paymentService.addPayment({ ...payment, gymId }).pipe(
      tap(() => {
        this.loadPayments();
        this.financeState.loadFinanceData();
        const msg = payment.status === 'paid' 
          ? `Recorded payment of ₹${payment.amount} from ${payment.memberName}`
          : `Created billing invoice of ₹${payment.amount} (Due: ₹${payment.dueAmount}) for ${payment.memberName}`;
        this.paymentService.addLog(msg, 'payment').subscribe();
      })
    );
  }

  confirmPayment(paymentId: string): Observable<void> {
    const payment = this.paymentsSubject.value.find(p => p.id === paymentId);
    const memberName = payment ? payment.memberName : 'Member';
    const amount = payment ? payment.amount : 0;

    return this.paymentService.confirmPayment(paymentId).pipe(
      tap(() => {
        this.loadPayments();
        this.financeState.loadFinanceData();
        this.paymentService.addLog(`Confirmed pending payment of ₹${amount} from ${memberName}`, 'payment').subscribe();
      })
    );
  }

  sendPaymentReminder(paymentId: string): void {
    const payment = this.paymentsSubject.value.find(p => p.id === paymentId);
    if (payment) {
      this.paymentService.addLog(`Sent payment reminder notification to ${payment.memberName} for ₹${payment.dueAmount}`, 'payment').subscribe();
    }
  }
}
