export type ExpenseCategory =
  | 'Rent'
  | 'Electricity'
  | 'Water'
  | 'Equipment'
  | 'Maintenance'
  | 'Salaries'
  | 'Marketing'
  | 'Software'
  | 'Miscellaneous';

export interface Expense {
  id: string;
  gymId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
  createdBy: string;
  approvedBy?: string;
}

export interface Invoice {
  id: string;
  gymId: string;
  branchId?: string;
  invoiceNumber: string;
  memberId: string;
  memberName: string;
  membershipPlan: string;
  amount: number;
  gst?: number;
  discount: number;
  finalAmount: number;
  paymentMethod: string;
  invoiceDate: string;
  status: 'paid' | 'partially_paid' | 'pending' | 'cancelled' | 'refunded' | 'overdue';
  collectedBy?: string;
  createdBy?: string;
  approvedBy?: string;
  attachmentUrl?: string;

  // Plan-driven attributes
  membershipPlanId?: string;
  ptPlanId?: string;
  originalAmount?: number;
  discountType?: 'flat' | 'percentage' | 'none';
  discountValue?: number;
  amountPaid?: number;
  pendingAmount?: number;
  dueDate?: string;
  salespersonId?: string;
  salespersonName?: string;
  
  // PT Additions
  type?: 'membership' | 'pt';
  trainerId?: string;
  trainerName?: string;
}

export interface Collection {
  id: string;
  gymId: string;
  branchId?: string;
  receiptNo: string;
  memberId: string;
  memberName: string;
  membershipPlan: string;
  amount: number;
  paymentMethod: string;
  date: string;
  collectedBy: string;

  // Plan-driven attributes
  membershipPlanId?: string;
  ptPlanId?: string;
  originalAmount?: number;
  discountType?: 'flat' | 'percentage' | 'none';
  discountValue?: number;
  finalAmount?: number;
  salespersonId?: string;
  salespersonName?: string;

  // PT Additions
  type?: 'membership' | 'pt';
  trainerId?: string;
  trainerName?: string;
}

export interface CashFlowSummary {
  openingBalance: number;
  cashInflow: number;
  cashOutflow: number;
  closingBalance: number;
}
