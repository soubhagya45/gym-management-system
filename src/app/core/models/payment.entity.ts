export enum PaymentMethod {
  CASH = 'Cash',
  UPI = 'UPI',
  RAZORPAY = 'Razorpay',
  CREDIT_CARD = 'Credit Card',
  DEBIT_CARD = 'Debit Card',
  NET_BANKING = 'Net Banking'
}

export interface Payment {
  id: string;
  gymId: string; // Multi-tenant foreign key
  branchId?: string;
  memberId: string;
  memberName: string;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  date: string;
  status: 'paid' | 'partially_paid' | 'pending' | 'overdue';
  planName: string;
  paymentMethod?: PaymentMethod | string;
  collectedBy?: string;

  // Plan-driven attributes
  membershipPlanId?: string;
  ptPlanId?: string;
  originalAmount?: number;
  discountType?: 'flat' | 'percentage' | 'none';
  discountValue?: number;
  finalAmount?: number;
  discountGivenBy?: string;
  discountDate?: string;
  salespersonId?: string;
  salespersonName?: string;

  // PT Additions
  type?: 'membership' | 'renewal' | 'pt' | 'diet' | 'product' | 'custom';
  trainerId?: string;
  trainerName?: string;

  // Razorpay Integration Security
  transactionId?: string;
  gatewayResponse?: any;

  // Enterprise additions
  idempotencyKey?: string;
  gatewayTransactionId?: string;
  provider?: string;
  tax?: number;
  invoiceId?: string;
  leadOwnerId?: string;
}
