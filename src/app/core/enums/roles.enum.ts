/**
 * UserRole enum — used for role-based access control throughout the app.
 * Values are stable strings preserved across sessions (localStorage safe).
 */
export enum UserRole {
  SuperAdmin   = 'super-admin',
  Owner        = 'owner',
  Manager      = 'manager',
  Receptionist = 'receptionist',
  Trainer      = 'trainer',
  Accountant   = 'accountant',
  Staff        = 'staff'
}
