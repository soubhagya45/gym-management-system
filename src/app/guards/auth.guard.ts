import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard to restrict access to authenticated users only.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated) {
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
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    return true;
  }

  const user = authService.currentUserValue;
  if (user) {
    if (user.role === 'owner') {
      router.navigate(['/dashboard']);
    } else if (user.role === 'trainer') {
      router.navigate(['/trainers']);
    } else if (user.role === 'member') {
      router.navigate(['/members']);
    } else {
      router.navigate(['/dashboard']);
    }
  } else {
    router.navigate(['/dashboard']);
  }
  return false;
};
