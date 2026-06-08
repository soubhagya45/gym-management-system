export interface Attendance {
  id: string;
  gymId: string; // Multi-tenant foreign key
  memberId: string;
  memberName: string;
  date: string;
  timeIn: string;
  status: 'present' | 'absent';
}
