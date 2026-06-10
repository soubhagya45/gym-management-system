import { Injectable } from '@angular/core';
import { UserRole } from '../../core/enums/roles.enum';
import {
  Permission,
  NavItem,
  ROLE_PERMISSIONS,
  ROUTE_PERMISSION_MAP,
  ALL_NAV_ITEMS
} from '../../core/models/permission.model';
import { UserProfile } from '../../core/models/user.model';

/**
 * PermissionService
 *
 * Centralised, backend-agnostic permission resolver.
 * All checks are pure computations against the static ROLE_PERMISSIONS matrix —
 * no HTTP calls, no async — safe to use inside guards and computed properties.
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {

  /** Returns all permissions granted to a given role. */
  getPermissionsForRole(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] ?? [];
  }

  /** Checks whether a user holds a specific permission. */
  hasPermission(user: UserProfile | null, permission: Permission): boolean {
    if (!user) return false;
    return (ROLE_PERMISSIONS[user.role] ?? []).includes(permission);
  }

  /** Checks whether a user is allowed any of the provided roles. */
  hasRole(user: UserProfile | null, roles: UserRole[]): boolean {
    if (!user) return false;
    return roles.includes(user.role);
  }

  /**
   * Returns true if the user can navigate to the given route path.
   * Falls back to `true` if the route has no required permission (public routes).
   */
  canAccessRoute(user: UserProfile | null, routePath: string): boolean {
    if (!user) return false;
    // Normalize path — strip query string and trailing slash
    const clean = routePath.split('?')[0].replace(/\/$/, '') || '/';
    const required = ROUTE_PERMISSION_MAP[clean];
    if (!required) return true; // No permission required → accessible
    return this.hasPermission(user, required);
  }

  /**
   * Returns the subset of ALL_NAV_ITEMS the user is allowed to see.
   * Used by AppComponent to build the sidebar dynamically.
   */
  getNavigationItems(user: UserProfile | null): NavItem[] {
    if (!user) return [];
    return ALL_NAV_ITEMS.filter(item => item.roles.includes(user.role));
  }

  /**
   * Derives the default landing route for a given role.
   * Used by loginGuard and AuthState post-login redirect.
   */
  getDefaultRoute(role: UserRole): string {
    switch (role) {
      case UserRole.SuperAdmin:
      case UserRole.Owner:
        return '/dashboard';
      case UserRole.Trainer:
        return '/attendance';
      case UserRole.Staff:
        return '/members';
      default:
        return '/dashboard';
    }
  }

  /**
   * Builds the permissions snapshot for a UserProfile.
   * Called once on login so the snapshot is stored in localStorage.
   */
  buildPermissionsSnapshot(role: UserRole): string[] {
    return this.getPermissionsForRole(role) as string[];
  }
}
