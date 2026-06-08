import { SubscriptionPlan } from '../enums/subscription-plans.enum';

export interface Gym {
  gymId: string;
  gymName: string;
  ownerName: string;
  email: string;
  phone: string;
  subscriptionPlan: SubscriptionPlan;
  status: 'active' | 'suspended';
  createdAt: string;
}
