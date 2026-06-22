import { Observable } from 'rxjs';

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  gatewayTransactionId?: string;
  paymentLink?: string;
  qrData?: string; // UPI pay link string
  rawResponse?: any;
}

export interface PaymentVerificationResult {
  success: boolean;
  gatewayTransactionId: string;
  amount: number;
  paymentMethod: string;
  rawResponse?: any;
}

export interface PaymentWebhookResult {
  success: boolean;
  orderId: string;
  gatewayTransactionId: string;
  amount: number;
  paymentMethod: string;
  eventId: string;
  signatureValid: boolean;
  rawPayload: any;
}

export interface PaymentProvider {
  name: string;
  createOrder(
    gymId: string,
    branchId: string,
    invoiceId: string,
    amount: number,
    currency: string,
    metadata?: any
  ): Observable<PaymentOrder>;

  verifyPayment(
    gymId: string,
    orderId: string,
    transactionId: string
  ): Observable<PaymentVerificationResult>;

  handleWebhook(
    gymId: string,
    payload: any,
    signature?: string
  ): Observable<PaymentWebhookResult>;

  refundPayment(
    gymId: string,
    transactionId: string,
    amount: number
  ): Observable<boolean>;

  generatePaymentLink(
    gymId: string,
    invoiceId: string,
    amount: number
  ): Observable<string>;
}
