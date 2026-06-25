import { Injectable } from '@angular/core';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';

/**
 * UserContextService — Core-layer facade that provides the current user's
 * identity and tenant context to domain and data-layer services WITHOUT
 * importing presentation-layer classes (AuthState).
 *
 * This breaks the architectural violation where firebase-repositories.ts and
 * import.service.ts previously imported AuthState (a presentation class) directly.
 *
 * Usage: Inject this service in domain services and data-layer repositories
 * instead of AuthState.
 */
@Injectable({
  providedIn: 'root'
})
export class UserContextService {
  /** Snapshot of the currently authenticated user profile, or null if unauthenticated. */
  private _currentUser: any = null;

  constructor(private tenantContext: TenantContextService) {}

  /**
   * Called by AuthState.setSession() after a successful login or session restore.
   * This keeps the data/domain layers decoupled from the presentation layer.
   */
  setCurrentUser(user: any): void {
    this._currentUser = user;
  }

  /**
   * Called by AuthState.logout() to clear the user context.
   */
  clearCurrentUser(): void {
    this._currentUser = null;
  }

  /** Returns the full user profile snapshot, or null if unauthenticated. */
  getCurrentUser(): any {
    return this._currentUser;
  }

  /** Returns the current user's gymId, or null. */
  getGymId(): string | null {
    return this._currentUser?.gymId ?? this.tenantContext.getTenantId();
  }

  /** Returns the current user's role string, or null. */
  getRole(): string | null {
    return this._currentUser?.role ?? null;
  }

  /** Returns the current user's uid, or null. */
  getUserId(): string | null {
    return this._currentUser?.uid ?? null;
  }

  /** Returns the current user's display name, or null. */
  getDisplayName(): string | null {
    return this._currentUser?.name ?? this._currentUser?.displayName ?? null;
  }

  /** Returns the current user's branchId (for branch-level filtering), or null. */
  getBranchId(): string | null {
    return this._currentUser?.branchId ?? this.tenantContext.getBranchId();
  }

  /**
   * Returns true if the current user has the specified permission.
   * Reads from the permissions snapshot stored on the user profile.
   */
  hasPermission(permission: string): boolean {
    if (!this._currentUser) return false;
    const perms: string[] = this._currentUser.permissions ?? [];
    return perms.includes(permission);
  }
}
