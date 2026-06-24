export interface Member {
  id: string;
  gymId: string; // Multi-tenant foreign key
  branchId?: string;
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

  // PT Additions
  ptPlanId?: string;
  ptPlanName?: string;
  trainerId?: string;
  trainerName?: string;
  ptGoal?: string;
  ptStartDate?: string;
  ptEndDate?: string;
  ptSessionsTotal?: number;
  ptSessionsCompleted?: number;
  ptSessionsRemaining?: number;

  // Enterprise additions
  membershipFreezeStatus?: 'active' | 'frozen';
  queuedActivationInvoiceId?: string;
  customFields?: Record<string, any>;
}
