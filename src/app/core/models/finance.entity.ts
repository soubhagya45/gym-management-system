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
  status: 'paid' | 'pending' | 'cancelled' | 'refunded';
  collectedBy?: string;
  createdBy?: string;
  approvedBy?: string;
  attachmentUrl?: string;
}

export interface Collection {
  id: string;
  gymId: string;
  receiptNo: string;
  memberId: string;
  memberName: string;
  membershipPlan: string;
  amount: number;
  paymentMethod: string;
  date: string;
  collectedBy: string;
}

export interface CashFlowSummary {
  openingBalance: number;
  cashInflow: number;
  cashOutflow: number;
  closingBalance: number;
}
