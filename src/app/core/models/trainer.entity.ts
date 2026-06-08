export interface Trainer {
  id: string;
  gymId: string; // Multi-tenant foreign key
  name: string;
  specialty: string;
  rating: number;
  membersCount: number;
  avatarUrl: string;
  status: 'active' | 'on leave';
  email: string;
  phone: string;
}
