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
  | 'manage:finance';


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
    'manage:finance'
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
    'manage:finance'
  ],

  [UserRole.Trainer]: [
    'view:attendance', 'manage:attendance',
    'view:body-progress',
    'view:members'  // trainers can view their assigned members
  ],
  [UserRole.Staff]: [
    'view:members', 'manage:members',
    'view:payments', 'manage:payments',
    'view:leads', 'manage:leads',
    'view:attendance', 'manage:attendance',
    'view:body-progress'
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
  '/settings':      'manage:settings',
  '/finance/dashboard': 'view:finance',
  '/finance/invoices': 'view:finance',
  '/finance/collections': 'view:finance',
  '/finance/expenses': 'view:finance',
  '/finance/reports': 'view:finance',
  '/finance/cash-flow': 'view:finance'
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
  { label: 'Dashboard',        route: '/dashboard',     icon: 'dashboard',       permission: 'view:dashboard',     roles: [UserRole.SuperAdmin, UserRole.Owner] },
  { label: 'Members',          route: '/members',        icon: 'people',          permission: 'view:members',       roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Staff, UserRole.Trainer] },
  { label: 'Leads',            route: '/leads',          icon: 'leaderboard',     permission: 'view:leads',         roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Staff] },
  { label: 'Attendance',       route: '/attendance',     icon: 'event_available', permission: 'view:attendance',    roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Trainer, UserRole.Staff] },
  { label: 'Payments',         route: '/payments',       icon: 'payments',        permission: 'view:payments',      roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Staff] },
  {
    label: 'Finance',
    route: '/finance/dashboard',
    icon: 'account_balance_wallet',
    permission: 'view:finance',
    roles: [UserRole.SuperAdmin, UserRole.Owner]
  },
  { label: 'Membership Plans', route: '/plans',          icon: 'fitness_center',  permission: 'view:plans',         roles: [UserRole.SuperAdmin, UserRole.Owner] },

  { label: 'Trainers',         route: '/trainers',       icon: 'sports',          permission: 'view:trainers',      roles: [UserRole.SuperAdmin, UserRole.Owner] },
  { label: 'WhatsApp Center',  route: '/whatsapp',       icon: 'chat',            permission: 'view:whatsapp',      roles: [UserRole.SuperAdmin, UserRole.Owner] },
  { label: 'Body Progress',    route: '/body-progress',  icon: 'trending_up',     permission: 'view:body-progress', roles: [UserRole.SuperAdmin, UserRole.Owner, UserRole.Trainer, UserRole.Staff] },
  { label: 'Settings',         route: '/settings',       icon: 'settings',        permission: 'manage:settings',    roles: [UserRole.SuperAdmin, UserRole.Owner] }
];
