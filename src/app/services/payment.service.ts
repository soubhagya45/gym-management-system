import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IPaymentRepository, PAYMENT_REPOSITORY_TOKEN, IActivityLogRepository, ACTIVITY_LOG_REPOSITORY_TOKEN } from '../core/interfaces/repository.interfaces';
import { Payment } from '../core/models/payment.entity';
import { TenantContextService } from '../domain/tenancy/tenant-context.service';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  constructor(
    @Inject(PAYMENT_REPOSITORY_TOKEN) private paymentRepository: IPaymentRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService
  ) {}

  getPayments(): Observable<Payment[]> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.paymentRepository.getPayments(gymId);
  }

  addPayment(payment: Omit<Payment, 'id'>): Observable<Payment> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.paymentRepository.addPayment(gymId, payment);
  }

  confirmPayment(paymentId: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.paymentRepository.confirmPayment(gymId, paymentId);
  }

  addLog(text: string, type: 'join' | 'payment' | 'attendance' | 'plan-change'): Observable<any> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.logRepository.addLog(gymId, text, type);
  }
}
