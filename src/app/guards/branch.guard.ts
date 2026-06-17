import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AuthState } from '../presentation/state/auth.state';
import { TenantContextService } from '../domain/tenancy/tenant-context.service';
import { UserRole } from '../core/enums/roles.enum';

export const branchGuard: CanActivateFn = (_route, _state) => {
  const authState = inject(AuthState);
  const tenantContext = inject(TenantContextService);
  const user = authState.currentUserValue;

  if (!user) {
    return true; // Let authGuard handle missing authentication
  }

  // Super admin and gym owners are allowed to access any branch.
  if (user.role === UserRole.SuperAdmin || user.role === UserRole.Owner) {
    return true;
  }

  // Branch managers, trainers, and staff are restricted to their assigned branch.
  if (user.branchId) {
    const activeBranch = tenantContext.getBranchId();
    if (activeBranch !== user.branchId) {
      tenantContext.setBranchId(user.branchId);
    }
  }

  return true;
};
