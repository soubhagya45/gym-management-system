import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { GYM_REPOSITORY_TOKEN } from '../core/interfaces/repository.interfaces';
import { TenantContextService } from '../domain/tenancy/tenant-context.service';
import { TenantUrlSerializer } from '../core/routing/tenant-url-serializer';
import { AuthState } from '../presentation/state/auth.state';
import { map, switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

export const tenantGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const gymRepository = inject(GYM_REPOSITORY_TOKEN);
  const tenantContext = inject(TenantContextService);
  const serializer = inject(TenantUrlSerializer);
  const authState = inject(AuthState);

  // 1. Resolve tenant slug
  let tenantSlug: string | null = null;

  // A. Check subdomain
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  const isFirebaseHosting = 
    (parts.length >= 3 && parts[parts.length - 2] === 'web' && parts[parts.length - 1] === 'app') ||
    (parts.length >= 3 && parts[parts.length - 2] === 'firebaseapp' && parts[parts.length - 1] === 'com');

  if (isFirebaseHosting) {
    if (parts.length > 3) {
      tenantSlug = parts[0];
    }
  } else if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'apexfit') {
    tenantSlug = parts[0];
  } else if (parts.length === 2 && parts[1] === 'localhost' && parts[0] !== 'www') {
    // support gym-a.localhost
    tenantSlug = parts[0];
  }

  // B. Check path-based (via URL Serializer)
  if (!tenantSlug) {
    tenantSlug = serializer.getTenantSlug();
  }

  // C. Check query params (e.g. ?tenant=gym-b)
  if (!tenantSlug && route.queryParams['tenant']) {
    tenantSlug = route.queryParams['tenant'];
  }

  // D. Check logged in user context
  if (!tenantSlug && authState.isAuthenticated && authState.currentUserValue?.gymId) {
    tenantSlug = authState.currentUserValue.gymId;
  }

  // D2. Check localStorage for active tenant slug (persisted from previous session)
  if (!tenantSlug) {
    tenantSlug = localStorage.getItem('apexfit_active_tenant');
  }

  // E. Fallback default
  if (!tenantSlug) {
    tenantSlug = 'gym-a'; // Default to gym-a for mock database / local demo
  }

  // Prevent routing loop on tenant-not-found
  if (state.url.includes('/tenant-not-found')) {
    return true;
  }

  // Check if the target route is a public page that should remain accessible without a valid tenant
  const targetPath = state.url.split('?')[0].split('/').filter(p => p.length > 0)[0] || '';
  const isPublicRoute = ['login', 'register', 'tenant-not-found', 'landing', 'unauthorized'].includes(targetPath.toLowerCase()) || targetPath === '';

  // 2. Fetch gym data and populate tenant context
  return gymRepository.getGymById(tenantSlug).pipe(
    switchMap(gym => {
      if (gym) {
        // Sync context
        tenantContext.setActiveGym(gym);
        
        // Resolve branch from query param or localStorage or default to first
        const branchParam = route.queryParams['branch'];
        const savedBranchId = localStorage.getItem(`apexfit_active_branch_${gym.gymId}`);
        const availableBranches = gym.branches || [];
        
        if (branchParam && availableBranches.some(b => b.id === branchParam)) {
          tenantContext.setBranchId(branchParam);
        } else if (savedBranchId && availableBranches.some(b => b.id === savedBranchId)) {
          tenantContext.setBranchId(savedBranchId);
        } else if (availableBranches.length > 0) {
          tenantContext.setBranchId(availableBranches[0].id);
        } else {
          tenantContext.setBranchId(null);
        }

        // Synchronize serializer slug if it was resolved by other means
        if (!serializer.getTenantSlug() && !parts.includes('localhost') && parts.length <= 2) {
          serializer.setTenantSlug(gym.gymId);
        }

        return of(true);
      } else {
        // Clear context and serializer slugs
        tenantContext.setActiveGym(null);
        serializer.setTenantSlug(null);

        if (isPublicRoute) {
          return of(true);
        }

        // Redirect to beautiful "Tenant Not Found" screen
        router.navigate(['/tenant-not-found'], { queryParams: { tenant: tenantSlug } });
        return of(false);
      }
    }),
    catchError((err) => {
      console.error('Error resolving tenant:', err);
      tenantContext.setActiveGym(null);
      serializer.setTenantSlug(null);

      if (isPublicRoute) {
        return of(true);
      }

      router.navigate(['/tenant-not-found'], { queryParams: { tenant: tenantSlug, error: 'resolution_failed' } });
      return of(false);
    })
  );
};
