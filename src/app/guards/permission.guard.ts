import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthState } from '../presentation/state/auth.state';
import { Permission } from '../core/models/permission.model';

/**
 * permissionGuard — checks if the current user has the required permission.
 * Expects `route.data['permission']` to be a Permission string.
 */
export const permissionGuard: CanActivateFn = (route, _state) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  const requiredPermission = route.data['permission'] as Permission;
  if (!requiredPermission) {
    return true; // No permission required → accessible
  }

  if (authState.hasPermission(requiredPermission)) {
    return true;
  }

  // Not authorized -> redirect to unauthorized page
  router.navigate(['/unauthorized']);
  return false;
};
