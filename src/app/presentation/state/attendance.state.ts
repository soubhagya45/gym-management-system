import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import {
  IAttendanceRepository,
  ATTENDANCE_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN,
  IMemberRepository,
  MEMBER_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { Attendance } from '../../core/models/attendance.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';

@Injectable({
  providedIn: 'root'
})
export class AttendanceState {
  private attendanceSubject = new BehaviorSubject<Attendance[]>([]);
  attendance$ = this.attendanceSubject.asObservable();

  constructor(
    @Inject(ATTENDANCE_REPOSITORY_TOKEN) private attendanceRepository: IAttendanceRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    @Inject(MEMBER_REPOSITORY_TOKEN) private memberRepository: IMemberRepository,
    private tenantContext: TenantContextService
  ) {
    combineLatest([
      this.tenantContext.activeGymId$,
      this.tenantContext.activeBranchId$
    ]).pipe(
      switchMap(([gymId, branchId]) => {
        if (!gymId) return of([]);
        return this.attendanceRepository.getAttendance(gymId).pipe(
          catchError(err => {
            console.error('Error fetching attendance:', err);
            return of([]);
          })
        );
      })
    ).subscribe(attendance => {
      this.attendanceSubject.next(attendance);
    });
  }

  loadAttendance(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.attendanceRepository.getAttendance(gymId).subscribe(attendance => {
        this.attendanceSubject.next(attendance);
      });
    }
  }

  markAttendance(memberId: string, status: 'present' | 'absent'): Observable<Attendance> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const timeIn = status === 'present' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    
    return this.attendanceRepository.markAttendance(gymId, memberId, status, timeIn).pipe(
      tap((attendance) => {
        this.loadAttendance();
        const msg = status === 'absent'
          ? `${attendance.memberName} marked absent today`
          : `${attendance.memberName} checked in today at ${timeIn}`;
        this.logRepository.addLog(gymId, msg, 'attendance').subscribe();
      })
    );
  }
}
