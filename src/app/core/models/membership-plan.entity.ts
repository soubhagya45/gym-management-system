export interface MembershipPlan {
  id: string;
  gymId: string; // Multi-tenant foreign key
  name: string;
  type: 'membership';
  durationMonths: number; // for backward compatibility
  duration: number; // unified duration
  durationUnit: 'days' | 'weeks' | 'months' | 'years';
  price: number;
  tax: number;
  description: string;
  features: string[];
  activeMembersCount: number;
  isActive: boolean;
}
