import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthState } from '../presentation/state/auth.state';

/**
 * Guard to restrict access to authenticated users only.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  if (authState.isAuthenticated) {
    return true;
  }

  // Redirect unauthorized users to login page
  router.navigate(['/login']);
  return false;
};

/**
 * Guard to prevent logged-in users from accessing the login page.
 * Redirects them to their appropriate workspace dashboard.
 */
export const loginGuard: CanActivateFn = (route, state) => {
  const authState = inject(AuthState);
  const router = inject(Router);

  if (!authState.isAuthenticated) {
    return true;
  }

  const user = authState.currentUserValue;
  if (user) {
    if (user.role === 'owner' || user.role === 'super-admin') {
      router.navigate(['/dashboard']);
    } else if (user.role === 'trainer') {
      router.navigate(['/trainers']);
    } else if (user.role === 'staff') {
      router.navigate(['/members']);
    } else {
      router.navigate(['/dashboard']);
    }
  } else {
    router.navigate(['/dashboard']);
  }
  return false;
};
