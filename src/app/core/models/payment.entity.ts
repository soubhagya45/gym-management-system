export interface Payment {
  id: string;
  gymId: string; // Multi-tenant foreign key
  memberId: string;
  memberName: string;
  amount: number;
  paidAmount: number;
  dueAmount: number;
  dueDate: string;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
  planName: string;
  paymentMethod?: string;
  collectedBy?: string;
}
