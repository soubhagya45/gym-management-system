export interface ActivityLog {
  id: string;
  gymId: string; // Multi-tenant foreign key
  text: string;
  time: string;
  type: 'join' | 'payment' | 'attendance' | 'plan-change';
}
