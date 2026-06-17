import { Injectable, Injector } from '@angular/core';
import { doc, setDoc } from 'firebase/firestore';
import { FirebaseService } from '../data/repositories/firebase/firebase.service';
import { AuthState } from '../presentation/state/auth.state';

@Injectable({
  providedIn: 'root'
})
export class AuditLoggerService {
  constructor(
    private firebaseService: FirebaseService,
    private injector: Injector
  ) {}

  log(action: string, entityType: string, entityId: string): void {
    const authState = this.injector.get(AuthState);
    const user = authState.currentUserValue;
    if (!user || !user.gymId) return;

    const db = this.firebaseService.getDb();
    const id = 'audit_' + Math.random().toString(36).substring(2, 9);
    
    const logEntry = {
      id,
      userId: user.id,
      role: user.role,
      action,
      entityType,
      entityId,
      timestamp: new Date().toISOString(),
      gymId: user.gymId
    };

    setDoc(doc(db, 'auditLogs', id), logEntry)
      .then(() => console.log(`[AuditLogger] Action logged: ${action}`))
      .catch(err => console.error('[AuditLogger] Action logging failed:', err));
  }
}
