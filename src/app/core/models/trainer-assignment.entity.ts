export interface TrainerAssignment {
  id: string;
  gymId: string; // Multi-tenant foreign key
  branchId: string;
  memberId: string;
  memberName: string;
  trainerId: string;
  trainerName: string;
  assignedDate: string; // YYYY-MM-DD
  status: 'active' | 'transferred' | 'inactive';
  ptGoal: string;
  notes?: string;
}
