export interface PTPlan {
  id: string;
  gymId: string; // Multi-tenant foreign key
  branchId: string; // Branch tracking
  name: string;
  price: number;
  numberOfSessions: number;
  duration: number; // in months or days (we'll count months for validity check)
  description: string;
  isActive: boolean;
}
