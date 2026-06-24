import { Injectable, Injector, Inject } from '@angular/core';
import { AuthState } from '../presentation/state/auth.state';
import { TenantContextService } from '../domain/tenancy/tenant-context.service';
import { IAuditLogRepository, AUDIT_LOG_REPOSITORY_TOKEN } from '../core/interfaces/repository.interfaces';

@Injectable({
  providedIn: 'root'
})
export class AuditLoggerService {
  constructor(
    @Inject(AUDIT_LOG_REPOSITORY_TOKEN) private auditLogRepository: IAuditLogRepository,
    private injector: Injector
  ) {}

  log(action: string, entityType: string, entityId: string, entityName?: string): void {
    const authState = this.injector.get(AuthState);
    const user = authState.currentUserValue;
    if (!user || !user.gymId) return;

    const tenantContext = this.injector.get(TenantContextService);
    const activeGym = tenantContext.getActiveGym();
    const gymName = activeGym?.gymName || '';
    const branchId = user.branchId || tenantContext.getBranchId() || '';
    const activeBranch = activeGym?.branches?.find(b => b.id === branchId);
    const branchName = activeBranch?.name || '';

    const logEntry = {
      userId: user.id,
      userName: user.name || user.email.split('@')[0],
      role: user.role,
      action,
      entityType,
      entityId,
      entityName: entityName || '',
      timestamp: new Date().toISOString(),
      gymId: user.gymId,
      gymName,
      branchId,
      branchName,
      ipAddress: '192.168.1.' + Math.floor(10 + Math.random() * 90)
    };

    this.auditLogRepository.addAuditLog(user.gymId, logEntry).subscribe({
      next: () => console.log(`[AuditLogger] Action logged: ${action}`),
      error: (err) => console.error('[AuditLogger] Action logging failed:', err)
    });
  }
}
