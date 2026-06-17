import { Injectable } from '@angular/core';
import { AuthState } from '../../presentation/state/auth.state';
import { PermissionService } from './permission.service';
import { UserRole } from '../../core/enums/roles.enum';
import { Permission } from '../../core/models/permission.model';

@Injectable({ providedIn: 'root' })
export class RbacService {
  constructor(
    private authState: AuthState,
    private permissionService: PermissionService
  ) {}

  hasPermission(permission: Permission): boolean {
    const user = this.authState.currentUserValue;
    return this.permissionService.hasPermission(user, permission);
  }

  hasRole(roles: UserRole[] | UserRole): boolean {
    const user = this.authState.currentUserValue;
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return this.permissionService.hasRole(user, rolesArray);
  }

  getCurrentUserRole(): UserRole | null {
    const user = this.authState.currentUserValue;
    return user ? user.role : null;
  }
}
