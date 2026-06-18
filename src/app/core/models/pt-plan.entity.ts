export interface PTPlan {
  id: string;
  gymId: string; // Multi-tenant foreign key
  branchId: string; // Branch tracking
  name: string;
  type: 'pt';
  price: number;
  tax: number;
  numberOfSessions: number;
  duration: number; // unified duration
  durationUnit: 'days' | 'weeks' | 'months' | 'years';
  description: string;
  isActive: boolean;
}
