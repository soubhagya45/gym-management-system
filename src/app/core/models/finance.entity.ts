export type ExpenseCategory =
  | 'Rent'
  | 'Electricity'
  | 'Water'
  | 'Equipment'
  | 'Maintenance'
  | 'Salaries'
  | 'Marketing'
  | 'Miscellaneous';

export interface Expense {
  id: string;
  gymId: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  notes?: string;
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
  status: 'paid' | 'pending' | 'cancelled';
}

export interface CashFlowSummary {
  openingBalance: number;
  cashInflow: number;
  cashOutflow: number;
  closingBalance: number;
}
