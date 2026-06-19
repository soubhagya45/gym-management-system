import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { IActivityLogRepository, ACTIVITY_LOG_REPOSITORY_TOKEN } from '../../core/interfaces/repository.interfaces';
import { ActivityLog } from '../../core/models/activity-log.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';

@Injectable({
  providedIn: 'root'
})
export class ActivityLogState {
  private logsSubject = new BehaviorSubject<ActivityLog[]>([]);
  logs$ = this.logsSubject.asObservable();

  constructor(
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService
  ) {
    combineLatest([
      this.tenantContext.activeGymId$,
      this.tenantContext.activeBranchId$
    ]).pipe(
      switchMap(([gymId, branchId]) => {
        if (!gymId) return of([]);
        return this.logRepository.getLogs(gymId).pipe(
          catchError(err => {
            console.error('Error fetching logs:', err);
            return of([]);
          })
        );
      })
    ).subscribe(logs => {
      this.logsSubject.next(logs);
    });
  }

  loadLogs(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.logRepository.getLogs(gymId).subscribe(logs => {
        this.logsSubject.next(logs);
      });
    }
  }

  addLog(text: string, type: 'join' | 'payment' | 'attendance' | 'plan-change'): Observable<ActivityLog> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.logRepository.addLog(gymId, text, type).pipe(
      tap(() => this.loadLogs())
    );
  }
}
