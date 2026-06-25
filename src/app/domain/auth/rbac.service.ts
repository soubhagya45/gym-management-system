import { Injectable } from '@angular/core';
import { UserContextService } from '../../core/services/user-context.service';
import { PermissionService } from './permission.service';
import { UserRole } from '../../core/enums/roles.enum';
import { Permission } from '../../core/models/permission.model';

@Injectable({ providedIn: 'root' })
export class RbacService {
  constructor(
    private userContext: UserContextService,
    private permissionService: PermissionService
  ) {}

  hasPermission(permission: Permission): boolean {
    const user = this.userContext.getCurrentUser();
    return this.permissionService.hasPermission(user, permission);
  }

  hasRole(roles: UserRole[] | UserRole): boolean {
    const user = this.userContext.getCurrentUser();
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return this.permissionService.hasRole(user, rolesArray);
  }

  getCurrentUserRole(): UserRole | null {
    const user = this.userContext.getCurrentUser();
    return user ? user.role : null;
  }
}
