export interface SessionHistory {
  id: string;
  gymId: string; // Multi-tenant foreign key
  branchId: string;
  sessionId: string;
  memberId: string;
  trainerId: string;
  action: 'schedule' | 'complete' | 'cancel' | 'reschedule' | 'add_notes';
  timestamp: string; // ISO datetime string
  performedBy: string; // Staff/Trainer name or ID
  notes: string;
}
