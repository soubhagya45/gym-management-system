import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PaymentProvider, PaymentOrder, PaymentVerificationResult, PaymentWebhookResult } from '../../../core/interfaces/payment-provider.interface';

@Injectable({ providedIn: 'root' })
export class RazorpayProvider implements PaymentProvider {
  name = 'Razorpay';

  createOrder(
    gymId: string,
    branchId: string,
    invoiceId: string,
    amount: number,
    currency: string,
    metadata?: any
  ): Observable<PaymentOrder> {
    const orderId = 'rzp-order-' + Math.random().toString(36).substring(2, 9);
    return of({
      orderId,
      amount,
      currency,
      paymentLink: `https://api.razorpay.com/v1/pay_mock?order_id=${orderId}&invoice_id=${invoiceId}`
    });
  }

  verifyPayment(
    gymId: string,
    orderId: string,
    transactionId: string
  ): Observable<PaymentVerificationResult> {
    return of({
      success: true,
      gatewayTransactionId: transactionId || 'pay_rzp_' + Math.random().toString(36).substring(2, 9),
      amount: 0,
      paymentMethod: 'Card/UPI/NetBanking'
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
      paymentMethod: 'Razorpay',
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
    return of(`https://rzp.io/i/${Math.random().toString(36).substring(2, 9)}`);
  }
}
