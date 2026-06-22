import { Injectable, Inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { PaymentProvider, PaymentOrder, PaymentVerificationResult, PaymentWebhookResult } from '../../../core/interfaces/payment-provider.interface';
import { PAYMENT_SETTINGS_REPOSITORY_TOKEN, IPaymentSettingsRepository } from '../../../core/interfaces/repository.interfaces';

@Injectable({ providedIn: 'root' })
export class ManualUPIProvider implements PaymentProvider {
  name = 'Manual UPI';

  constructor(
    @Inject(PAYMENT_SETTINGS_REPOSITORY_TOKEN) private settingsRepo: IPaymentSettingsRepository
  ) {}

  createOrder(
    gymId: string,
    branchId: string,
    invoiceId: string,
    amount: number,
    currency: string,
    metadata?: any
  ): Observable<PaymentOrder> {
    return this.settingsRepo.getSettingsByProvider(gymId, 'Manual UPI').pipe(
      map(settings => {
        const upiId = settings?.gatewayConfig?.upiId || 'apexfit@upi';
        const businessName = settings?.gatewayConfig?.businessName || 'ApexFit Gym';
        
        const orderId = 'order-upi-' + Math.random().toString(36).substring(2, 9);
        const note = `Inv-${invoiceId.substring(0, 8)}`;
        const qrData = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(note)}`;

        return {
          orderId,
          amount,
          currency,
          qrData,
          paymentLink: qrData
        };
      })
    );
  }

  verifyPayment(
    gymId: string,
    orderId: string,
    transactionId: string
  ): Observable<PaymentVerificationResult> {
    // Simulated verification for Manual UPI - always returns successful verification for testing
    return of({
      success: true,
      gatewayTransactionId: transactionId || 'txn-' + Math.random().toString(36).substring(2, 9),
      amount: 0, // Filled by caller
      paymentMethod: 'UPI'
    });
  }

  handleWebhook(
    gymId: string,
    payload: any,
    signature?: string
  ): Observable<PaymentWebhookResult> {
    return of({
      success: true,
      orderId: payload.orderId || 'order-mock',
      gatewayTransactionId: payload.transactionId || 'txn-mock',
      amount: payload.amount || 0,
      paymentMethod: 'UPI',
      eventId: 'evt_' + Math.random().toString(36).substring(2, 9),
      signatureValid: true,
      rawPayload: payload
    });
  }

  refundPayment(
    gymId: string,
    transactionId: string,
    amount: number
  ): Observable<boolean> {
    return of(true);
  }

  generatePaymentLink(
    gymId: string,
    invoiceId: string,
    amount: number
  ): Observable<string> {
    return this.settingsRepo.getSettingsByProvider(gymId, 'Manual UPI').pipe(
      map(settings => {
        const upiId = settings?.gatewayConfig?.upiId || 'apexfit@upi';
        const businessName = settings?.gatewayConfig?.businessName || 'ApexFit Gym';
        const note = `Inv-${invoiceId.substring(0, 8)}`;
        return `upi://pay?pa=${upiId}&pn=${encodeURIComponent(businessName)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(note)}`;
      })
    );
  }
}
