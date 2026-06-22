import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { PaymentProvider, PaymentOrder, PaymentVerificationResult, PaymentWebhookResult } from '../../../core/interfaces/payment-provider.interface';

@Injectable({ providedIn: 'root' })
export class StripeProvider implements PaymentProvider {
  name = 'Stripe';

  createOrder(
    gymId: string,
    branchId: string,
    invoiceId: string,
    amount: number,
    currency: string,
    metadata?: any
  ): Observable<PaymentOrder> {
    const orderId = 'cs-stripe-' + Math.random().toString(36).substring(2, 9);
    return of({
      orderId,
      amount,
      currency,
      paymentLink: `https://checkout.stripe.com/pay/${orderId}`
    });
  }

  verifyPayment(
    gymId: string,
    orderId: string,
    transactionId: string
  ): Observable<PaymentVerificationResult> {
    return of({
      success: true,
      gatewayTransactionId: transactionId || 'ch_' + Math.random().toString(36).substring(2, 9),
      amount: 0,
      paymentMethod: 'Card'
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
      paymentMethod: 'Stripe',
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
    return of(`https://stripe.com/pay/${Math.random().toString(36).substring(2, 9)}`);
  }
}
