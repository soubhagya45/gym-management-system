import { UserRole } from '../enums/roles.enum';

export interface UserProfile {
  id: string;              // Stable unique identifier
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  gymId?: string;          // Null/undefined for Super Admin; set for all other roles
  branchId?: string;        // Assigned branch for managers, trainers, and staff
  permissions: string[];   // Snapshot of allowed permission keys (populated on login)
  lastLogin: string;       // ISO timestamp
  sessionExpiresAt: string; // ISO timestamp — used by SessionService for auto-logout
  isFirstLogin?: boolean;   // Tracks if this is the user's first login
  tempPasswordExpiresAt?: string; // Expiration timestamp for temporary password
  token?: string;          // Bearer token for API authentication
}
