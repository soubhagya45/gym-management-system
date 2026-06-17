import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthState } from '../presentation/state/auth.state';
import { UserRole } from '../core/enums/roles.enum';

export const roleGuard: CanActivateFn = (route, _state) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  const expectedRoles = route.data['expectedRoles'] as UserRole[];
  if (!expectedRoles || expectedRoles.length === 0) {
    return true;
  }

  const user = authState.currentUserValue;
  if (user && expectedRoles.includes(user.role)) {
    return true;
  }

  router.navigate(['/unauthorized']);
  return false;
};
