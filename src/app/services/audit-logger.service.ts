import { Injectable, Injector } from '@angular/core';
import { doc, setDoc } from 'firebase/firestore';
import { FirebaseService } from '../data/repositories/firebase/firebase.service';
import { AuthState } from '../presentation/state/auth.state';
import { TenantContextService } from '../domain/tenancy/tenant-context.service';

@Injectable({
  providedIn: 'root'
})
export class AuditLoggerService {
  constructor(
    private firebaseService: FirebaseService,
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

    const db = this.firebaseService.getDb();
    const id = 'audit_' + Math.random().toString(36).substring(2, 9);
    
    const logEntry = {
      id,
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

    setDoc(doc(db, 'auditLogs', id), logEntry)
      .then(() => console.log(`[AuditLogger] Action logged: ${action}`))
      .catch(err => console.error('[AuditLogger] Action logging failed:', err));
  }
}
