/**
 * UserRole enum — used for role-based access control throughout the app.
 * Values are stable strings preserved across sessions (localStorage safe).
 */
export enum UserRole {
  SuperAdmin   = 'super_admin',
  Owner        = 'gym_owner',
  Manager      = 'branch_manager',
  Trainer      = 'trainer',
  Staff        = 'staff'
}
