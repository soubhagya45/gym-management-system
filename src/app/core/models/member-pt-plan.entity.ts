export interface MemberPTPlan {
  id: string;
  gymId: string; // Multi-tenant foreign key
  branchId: string;
  memberId: string;
  memberName: string;
  trainerId: string;
  trainerName: string;
  planId: string;
  planName: string;
  price: number;
  totalSessions: number;
  completedSessions: number;
  remainingSessions: number;
  expiredSessions: number;
  ptGoal: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  history: {
    action: 'assign' | 'change_trainer' | 'upgrade_plan' | 'add_sessions' | 'transfer_trainer';
    date: string;
    trainerId?: string;
    trainerName?: string;
    planId?: string;
    planName?: string;
    sessionsAdded?: number;
    notes?: string;
  }[];
}
