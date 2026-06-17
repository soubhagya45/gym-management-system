export interface PTSession {
  id: string;
  gymId: string; // Multi-tenant foreign key
  branchId: string;
  memberId: string;
  memberName: string;
  trainerId: string;
  trainerName: string;
  date: string; // YYYY-MM-DD
  time: string; // e.g. "10:00 AM"
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes: string;
  attendanceStatus: 'present' | 'absent' | 'pending';
}
