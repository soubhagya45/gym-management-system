export interface Member {
  id: string;
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
}

export interface Attendance {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  timeIn: string;
  status: 'present' | 'absent';
}

export interface Payment {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'overdue';
  planName: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  durationMonths: number;
  price: number;
  description: string;
  features: string[];
  activeMembersCount: number;
}

export interface Trainer {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  membersCount: number;
  avatarUrl: string;
  status: 'active' | 'on leave';
  email: string;
  phone: string;
}

export interface ActivityLog {
  id: string;
  text: string;
  time: string;
  type: 'join' | 'payment' | 'attendance' | 'plan-change';
}
