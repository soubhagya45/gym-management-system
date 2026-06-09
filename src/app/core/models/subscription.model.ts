import { SubscriptionPlan } from '../enums/subscription-plans.enum';

export interface FeatureFlags {
  canManageTrainers: boolean;
  canExportReports: boolean;
  canAccessAnalytics: boolean;
  maxMembers: number;
  maxTrainers: number;
}

export interface SaaSPayment {
  id: string;
  gymId: string;
  plan: SubscriptionPlan;
  amount: number;
  paymentMethod: string;
  status: 'paid' | 'failed' | 'pending';
  date: string;
  invoiceNumber: string;
}

export interface SubscriptionStatus {
  activePlan: SubscriptionPlan;
  status: 'active' | 'trialing' | 'expired' | 'suspended';
  startDate: string;
  endDate: string;
  memberCount: number;
  memberLimit: number;
  trainerCount: number;
  trainerLimit: number;
}

