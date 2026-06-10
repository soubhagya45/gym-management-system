import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthState } from '../presentation/state/auth.state';
import { PermissionService } from '../domain/auth/permission.service';
import { UserRole } from '../core/enums/roles.enum';

/**
 * authGuard — protects all authenticated routes.
 * Validates both login state AND session validity (not expired).
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authState = inject(AuthState);
  const router    = inject(Router);

  if (authState.isAuthenticated) {
    return true;
  }

  // Preserve attempted URL so loginGuard can redirect back after login
  router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  return false;
};

/**
 * loginGuard — prevents already-logged-in users from accessing login/register.
 * Redirects to the role's default landing route instead.
 */
export const loginGuard: CanActivateFn = (_route, _state) => {
  const authState        = inject(AuthState);
  const permissionService = inject(PermissionService);
  const router           = inject(Router);

  if (!authState.isAuthenticated) {
    return true;
  }

  const user = authState.currentUserValue;
  const defaultRoute = user
    ? permissionService.getDefaultRoute(user.role)
    : '/dashboard';

  router.navigate([defaultRoute]);
  return false;
};
