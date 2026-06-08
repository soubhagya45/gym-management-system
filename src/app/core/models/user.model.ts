import { UserRole } from '../enums/roles.enum';

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  gymId?: string; // Optional: null/undefined for Super Admin, set for other roles
}
