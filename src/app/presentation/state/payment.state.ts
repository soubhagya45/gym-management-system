import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { Payment } from '../../core/models/payment.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { FinanceState } from './finance.state';

@Injectable({
  providedIn: 'root'
})
export class PaymentState {
  private paymentsSubject = new BehaviorSubject<Payment[]>([]);
  payments$ = this.paymentsSubject.asObservable();

  constructor(
    @Inject(PAYMENT_REPOSITORY_TOKEN) private paymentRepository: IPaymentRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService,
    private financeState: FinanceState
  ) {
    this.tenantContext.activeGymId$.pipe(
      switchMap(gymId => {
        if (!gymId) return of([]);
        return this.paymentRepository.getPayments(gymId);
      })
    ).subscribe(payments => {
      this.paymentsSubject.next(payments);
    });
  }

  loadPayments(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.paymentRepository.getPayments(gymId).subscribe(payments => {
        this.paymentsSubject.next(payments);
      });
    }
  }

  addPayment(payment: Omit<Payment, 'id' | 'gymId'>): Observable<Payment> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.paymentRepository.addPayment(gymId, { ...payment, gymId }).pipe(
      tap(() => {
        this.loadPayments();
        this.financeState.loadFinanceData();
        const msg = payment.status === 'paid' 
          ? `Recorded payment of ₹${payment.amount} from ${payment.memberName}`
          : `Created billing invoice of ₹${payment.amount} (Due: ₹${payment.dueAmount}) for ${payment.memberName}`;
        this.logRepository.addLog(gymId, msg, 'payment').subscribe();
      })
    );
  }

  confirmPayment(paymentId: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const payment = this.paymentsSubject.value.find(p => p.id === paymentId);
    const memberName = payment ? payment.memberName : 'Member';
    const amount = payment ? payment.amount : 0;

    return this.paymentRepository.confirmPayment(gymId, paymentId).pipe(
      tap(() => {
        this.loadPayments();
        this.financeState.loadFinanceData();
        this.logRepository.addLog(gymId, `Confirmed pending payment of ₹${amount} from ${memberName}`, 'payment').subscribe();
      })
    );
  }

  sendPaymentReminder(paymentId: string): void {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) return;
    const payment = this.paymentsSubject.value.find(p => p.id === paymentId);
    if (payment) {
      this.logRepository.addLog(gymId, `Sent payment reminder notification to ${payment.memberName} for ₹${payment.dueAmount}`, 'payment').subscribe();
    }
  }
}
