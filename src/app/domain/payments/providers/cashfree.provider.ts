import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PaymentProvider, PaymentOrder, PaymentVerificationResult, PaymentWebhookResult } from '../../../core/interfaces/payment-provider.interface';

@Injectable({ providedIn: 'root' })
export class CashfreeProvider implements PaymentProvider {
  name = 'Cashfree';

  createOrder(
    gymId: string,
    branchId: string,
    invoiceId: string,
    amount: number,
    currency: string,
    metadata?: any
  ): Observable<PaymentOrder> {
    const orderId = 'cf-order-' + Math.random().toString(36).substring(2, 9);
    return of({
      orderId,
      amount,
      currency,
      paymentLink: `https://api.cashfree.com/v1/pay_mock?order_id=${orderId}&invoice_id=${invoiceId}`
    });
  }

  verifyPayment(
    gymId: string,
    orderId: string,
    transactionId: string
  ): Observable<PaymentVerificationResult> {
    return of({
      success: true,
      gatewayTransactionId: transactionId || 'pay_cf_' + Math.random().toString(36).substring(2, 9),
      amount: 0,
      paymentMethod: 'UPI/Wallets/Cards'
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
      paymentMethod: 'Cashfree',
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
    return of(`https://cf.link/${Math.random().toString(36).substring(2, 9)}`);
  }
}
