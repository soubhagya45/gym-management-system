export interface TrainerRevenue {
  id: string;
  gymId: string; // Multi-tenant foreign key
  branchId: string;
  trainerId: string;
  trainerName: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  invoiceId: string;
  ptPlanName: string;
  salespersonId?: string;
  salespersonName?: string;
}
