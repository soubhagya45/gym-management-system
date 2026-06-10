import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthState } from '../presentation/state/auth.state';
import { UserRole } from '../core/enums/roles.enum';

/**
 * roleGuard — checks if the current user has one of the required roles.
 * Expects `route.data['roles']` to be an array of UserRole.
 */
export const roleGuard: CanActivateFn = (route, _state) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as UserRole[];
  if (!requiredRoles || requiredRoles.length === 0) {
    return true; // No roles required → accessible
  }

  const user = authState.currentUserValue;
  if (user && requiredRoles.includes(user.role)) {
    return true;
  }

  // Not authorized -> redirect to unauthorized page
  router.navigate(['/unauthorized']);
  return false;
};
