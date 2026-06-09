export interface Member {
  id: string;
  gymId: string; // Multi-tenant foreign key
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'expiring';
  planId: string;
  planName: string;
  startDate: string;
  endDate: string;
  avatarUrl?: string;
  attendanceCount: number;
  balance: number;
  gender: 'Male' | 'Female' | 'Other';
  age: number;
  height: number;
  weight: number;
  fitnessGoal: string;
  startingWeight?: number;
  goalWeight?: number;
}
