export interface MembershipPlan {
  id: string;
  gymId: string; // Multi-tenant foreign key
  name: string;
  durationMonths: number;
  price: number;
  description: string;
  features: string[];
  activeMembersCount: number;
}
