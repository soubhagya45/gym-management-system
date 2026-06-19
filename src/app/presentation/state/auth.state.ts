import { Injectable, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IAuthRepository, AUTH_REPOSITORY_TOKEN } from '../../core/interfaces/repository.interfaces';
import { UserProfile } from '../../core/models/user.model';
import { UserRole } from '../../core/enums/roles.enum';
import { Permission } from '../../core/models/permission.model';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { SessionService } from '../../domain/auth/session.service';
import { PermissionService } from '../../domain/auth/permission.service';

@Injectable({
  providedIn: 'root'
})
export class AuthState {
  private readonly STORAGE_KEY = 'apexfit_auth_user';
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);

  currentUser$: Observable<UserProfile | null> = this.currentUserSubject.asObservable();

  constructor(
    @Inject(AUTH_REPOSITORY_TOKEN) private authRepository: IAuthRepository,
    private tenantContext: TenantContextService,
    private sessionService: SessionService,
    private permissionService: PermissionService,
    private router: Router
  ) {
    this.loadSession();

    // Auto-logout when session expires
    this.sessionService.sessionExpired$.subscribe(() => {
      this.logout();
    });
  }

  get currentUserValue(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.currentUserValue !== null && this.sessionService.isSessionValid();
  }

  /** True if the current account is Active (not Suspended or Inactive). */
  get isAccountActive(): boolean {
    const status = this.currentUserValue?.accountStatus;
    // Treat missing status as Active for backward compatibility (gym owners pre-migration)
    return !status || status === 'Active';
  }

  /** Convenience: check a permission against the current user. */
  hasPermission(permission: Permission): boolean {
    return this.permissionService.hasPermission(this.currentUserValue, permission);
  }

  /** Convenience: check whether the current user can access a route path. */
  canAccessRoute(routePath: string): boolean {
    return this.permissionService.canAccessRoute(this.currentUserValue, routePath);
  }

  /**
   * Awaits the first Firebase Auth state resolution (onAuthStateChanged).
   *
   * This is called by APP_INITIALIZER to gate Angular bootstrapping until
   * Firebase has recovered the user token from IndexedDB. This eliminates
   * the race condition where Firestore queries fire before the auth token
   * is available, causing permission-denied errors and empty UI state.
   *
   * Synchronisation logic:
   * - If Firebase resolves a valid user → session is already live, proceed normally.
   * - If Firebase resolves null but localStorage has a cached session → the server-side
   *   session has expired or been revoked. Clear local state and redirect to /login.
   * - If no localStorage session → normal unauthenticated state, nothing to do.
   *
   * @param firebaseAuth The Firebase Auth instance (injected by APP_INITIALIZER factory).
   */
  waitForAuthResolution(firebaseAuth: import('firebase/auth').Auth): Promise<void> {
    return new Promise<void>((resolve) => {
      // Import onAuthStateChanged lazily to avoid a hard dependency in the provider-agnostic state layer.
      import('firebase/auth').then(({ onAuthStateChanged }) => {
        const unsubscribe = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
          // Unsubscribe immediately — we only need the first emission.
          unsubscribe();

          if (!firebaseUser) {
            // Firebase reports no authenticated user.
            // If we have a stale localStorage session, evict it now — before any
            // data queries run — so the app starts in a clean unauthenticated state.
            const hasCachedSession = !!localStorage.getItem(this.STORAGE_KEY);
            if (hasCachedSession) {
              console.warn('[AuthState] Firebase Auth resolved null but localStorage has a cached session. Clearing stale session.');
              localStorage.removeItem(this.STORAGE_KEY);
              this.currentUserSubject.next(null);
              this.tenantContext.setTenantId(null);
              this.sessionService.stop();
              // Navigate to login after Angular finishes bootstrapping.
              // Using a microtask ensures the router is fully initialised.
              Promise.resolve().then(() => this.router.navigate(['/login']));
            }
          }
          // If firebaseUser is non-null, the existing loadSession() already populated
          // the state from localStorage. The session is valid — no action needed.

          resolve();
        });
      }).catch(() => {
        // If the firebase/auth import fails (e.g. Mock provider), resolve immediately
        // so the app still boots normally in non-Firebase environments.
        resolve();
      });
    });
  }

  private loadSession(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const user: UserProfile = JSON.parse(saved);
        // Validate session is still fresh
        if (!user.sessionExpiresAt || new Date(user.sessionExpiresAt).getTime() > Date.now()) {
          this.currentUserSubject.next(user);
          if (user.gymId) {
            this.tenantContext.setTenantId(user.gymId);
          } else {
            this.tenantContext.setTenantId('gym-a');
          }
          // Resume session timer
          this.sessionService.start(user.sessionExpiresAt);
        } else {
          // Session expired while offline — clear it
          localStorage.removeItem(this.STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error('Error loading session from storage', e);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  login(email: string, password: string): Observable<UserProfile> {
    return this.authRepository.login(email, password).pipe(
      tap(user => this.setSession(user))
    );
  }

  register(
    gymName: string,
    ownerName: string,
    email: string,
    phone: string,
    password?: string,
    address?: string,
    gstNumber?: string,
    deferSession = false,
    gymType?: string,
    openingTime?: string,
    closingTime?: string
  ): Observable<UserProfile> {
    return this.authRepository.register(
      gymName,
      ownerName,
      email,
      phone,
      password,
      address,
      gstNumber,
      gymType,
      openingTime,
      closingTime
    ).pipe(
      tap(user => {
        if (!deferSession) {
          this.setSession(user);
        }
      })
    );
  }

  setCurrentUser(user: UserProfile): void {
    this.setSession(user);
  }

  loginWithRole(role: UserRole): Observable<UserProfile> {
    return this.authRepository.loginWithRole(role).pipe(
      tap(user => this.setSession(user))
    );
  }

  changePassword(email: string, newPassword: string): Observable<void> {
    return this.authRepository.changePassword(email, newPassword).pipe(
      tap(() => {
        const currentUser = this.currentUserValue;
        if (currentUser && currentUser.email.toLowerCase().trim() === email.toLowerCase().trim()) {
          const updated = { ...currentUser, isFirstLogin: false };
          this.setCurrentUser(updated);
        }
      })
    );
  }

  clearFirstLoginFlag(email: string): Observable<void> {
    return this.authRepository.clearFirstLoginFlag(email).pipe(
      tap(() => {
        const currentUser = this.currentUserValue;
        if (currentUser && currentUser.email.toLowerCase().trim() === email.toLowerCase().trim()) {
          const updated = { ...currentUser, isFirstLogin: false };
          this.setCurrentUser(updated);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentUserSubject.next(null);
    this.tenantContext.setTenantId(null);
    this.sessionService.stop();
    this.router.navigate(['/login']);
  }

  private setSession(user: UserProfile): void {
    // Enrich user with permissions snapshot from PermissionService
    const enriched: UserProfile = {
      ...user,
      permissions: this.permissionService.buildPermissionsSnapshot(user.role),
      sessionExpiresAt: this.sessionService.getExpiresAt() ?? new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(enriched));
    this.currentUserSubject.next(enriched);

    // Set tenant context
    if (enriched.gymId) {
      this.tenantContext.setTenantId(enriched.gymId);
    } else {
      // Super Admin: default to gym-a, switchable via toolbar
      this.tenantContext.setTenantId('gym-a');
    }

    // Start/reset session timer
    this.sessionService.start(enriched.sessionExpiresAt);
  }
}
