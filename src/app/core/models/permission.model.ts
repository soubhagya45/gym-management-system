import { UserRole } from '../enums/roles.enum';

/**
 * Granular permission keys used throughout the app.
 * Convention: 'action:resource'
 */
export type Permission =
  | 'view:dashboard'
  | 'view:members'
  | 'manage:members'
  | 'view:trainers'
  | 'manage:trainers'
  | 'view:payments'
  | 'manage:payments'
  | 'view:leads'
  | 'manage:leads'
  | 'view:attendance'
  | 'manage:attendance'
  | 'view:plans'
  | 'manage:plans'
  | 'view:whatsapp'
  | 'manage:whatsapp'
  | 'view:body-progress'
  | 'manage:settings'
  | 'switch:gym'
  | 'export:reports'
  | 'invite:staff'
  | 'view:finance'
  | 'manage:finance'
  | 'view:employees'
  | 'manage:employees'
  | 'view:pt-sessions'
  | 'manage:pt-sessions'
  | 'view:settings'
  | 'view:audit-logs'
  | 'import:upload'
  | 'import:review'
  | 'import:approve'
  | 'import:rollback';


/**
 * Static role → permissions mapping.
 * Each role is assigned a fixed set of Permission keys.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SuperAdmin]: [
    'view:dashboard',
    'view:members', 'manage:members',
    'view:trainers', 'manage:trainers',
    'view:payments', 'manage:payments',
    'view:leads', 'manage:leads',
    'view:attendance', 'manage:attendance',
    'view:plans', 'manage:plans',
    'view:whatsapp', 'manage:whatsapp',
    'view:body-progress',
    'manage:settings',
    'switch:gym',
    'export:reports',
    'invite:staff',
    'view:finance',
    'manage:finance',
    'view:employees',
    'manage:employees',
    'view:pt-sessions',
    'manage:pt-sessions',
    'view:settings',
    'view:audit-logs',
    'import:upload',
    'import:review',
    'import:approve',
    'import:rollback'
  ],

  [UserRole.Owner]: [
    'view:dashboard',
    'view:members', 'manage:members',
    'view:trainers', 'manage:trainers',
    'view:payments', 'manage:payments',
    'view:leads', 'manage:leads',
    'view:attendance', 'manage:attendance',
    'view:plans', 'manage:plans',
    'view:whatsapp', 'manage:whatsapp',
    'view:body-progress',
    'manage:settings',
    'export:reports',
    'invite:staff',
    'view:finance',
    'manage:finance',
    'view:employees',
    'manage:employees',
    'view:pt-sessions',
    'manage:pt-sessions',
    'view:settings',
    'view:audit-logs',
    'import:upload',
    'import:review',
    'import:approve',
    'import:rollback'
  ],

  [UserRole.Manager]: [
    'view:dashboard',
    'view:members', 'manage:members',
    'view:trainers', 'manage:trainers',
    'view:payments', 'manage:payments',
    'view:leads', 'manage:leads',
    'view:attendance', 'manage:attendance',
    'view:plans', 'manage:plans',
    'view:whatsapp', 'manage:whatsapp',
    'view:body-progress',
    'manage:settings',
    'export:reports',
    'invite:staff',
    'view:finance',
    'manage:finance',
    'view:employees',
    'manage:employees',
    'view:pt-sessions',
    'manage:pt-sessions',
    'view:settings',
    'view:audit-logs',
    'import:upload',
    'import:review'
  ],

  [UserRole.Trainer]: [
    'view:dashboard',
    'view:members',
    'view:attendance', 'manage:attendance',
    'view:body-progress',
    'view:pt-sessions',
    'manage:pt-sessions'
  ],

  [UserRole.Staff]: [
    'view:members', 'manage:members',
    'view:leads', 'manage:leads',
    'view:payments', 'manage:payments',
    'view:attendance', 'manage:attendance',
    'view:body-progress',
    'view:pt-sessions',
    'view:finance'
  ]
};

/**
 * Route-to-required-permission mapping for canAccessRoute() helper.
 */
export const ROUTE_PERMISSION_MAP: Record<string, Permission> = {
  '/dashboard':     'view:dashboard',
  '/members':       'view:members',
  '/leads':         'view:leads',
  '/attendance':    'view:attendance',
  '/payments':      'view:payments',
  '/plans':         'view:plans',
  '/trainers':      'view:trainers',
  '/whatsapp':      'view:whatsapp',
  '/body-progress': 'view:body-progress',
  '/settings':      'view:settings',
  '/finance/dashboard': 'view:finance',
  '/finance/invoices': 'view:finance',
  '/finance/collections': 'view:finance',
  '/finance/expenses': 'view:finance',
  '/finance/reports': 'view:finance',
  '/finance/cash-flow': 'view:finance',
  '/finance/revenue-analytics': 'view:finance',
  '/employees':     'view:employees',
  '/pt-sessions':   'view:pt-sessions',
  '/setup-wizard':  'import:upload'
};


/**
 * Navigation item descriptor used by PermissionService and AppComponent.
 */
export interface NavItem {
  label: string;
  route: string;
  icon: string;
  permission: Permission;
  roles: UserRole[];
  subItems?: { label: string; route: string; icon: string }[];
}


/** Full ordered nav manifest — filtered at runtime per user role. */
export const ALL_NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',        route: '/dashboard',     icon: 'dashboard',       permission: 'view:dashboard',     roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager, UserRole.Trainer] },
  { label: 'Members',          route: '/members',        icon: 'people',          permission: 'view:members',       roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager, UserRole.Staff, UserRole.Trainer] },
  { label: 'Leads',            route: '/leads',          icon: 'leaderboard',     permission: 'view:leads',         roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager, UserRole.Staff] },
  { label: 'CRM Sales',        route: '/crm-sales',      icon: 'insights',        permission: 'view:leads',         roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager, UserRole.Staff] },
  { label: 'Employees',        route: '/employees',      icon: 'badge',           permission: 'view:employees',     roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager] },
  { label: 'Attendance',       route: '/attendance',     icon: 'event_available', permission: 'view:attendance',    roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager, UserRole.Trainer, UserRole.Staff] },
  { label: 'PT Sessions',      route: '/pt-sessions',    icon: 'event_note',      permission: 'view:pt-sessions',   roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager, UserRole.Trainer, UserRole.Staff] },
  { label: 'Payments',         route: '/payments',       icon: 'payments',        permission: 'view:payments',      roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager, UserRole.Staff] },
  {
    label: 'Finance',
    route: '/finance/dashboard',
    icon: 'account_balance_wallet',
    permission: 'view:finance',
    roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager, UserRole.Staff]
  },
  { label: 'Membership Plans', route: '/plans',          icon: 'fitness_center',  permission: 'view:plans',         roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager] },
  { label: 'Trainers',         route: '/trainers',       icon: 'sports',          permission: 'view:trainers',      roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager] },
  { label: 'WhatsApp Center',  route: '/whatsapp',       icon: 'chat',            permission: 'view:whatsapp',      roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager] },
  { label: 'Body Progress',    route: '/body-progress',  icon: 'trending_up',     permission: 'view:body-progress', roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager, UserRole.Trainer, UserRole.Staff] },
  { label: 'Setup & Import',   route: '/setup-wizard',   icon: 'upload_file',     permission: 'import:upload',      roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager] },
  { label: 'Settings',         route: '/settings',       icon: 'settings',        permission: 'view:settings',    roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Manager] }
];
