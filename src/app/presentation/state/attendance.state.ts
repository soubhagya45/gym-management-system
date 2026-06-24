import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { Attendance } from '../../core/models/attendance.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { AttendanceService } from '../../services/attendance.service';

@Injectable({
  providedIn: 'root'
})
export class AttendanceState {
  private attendanceSubject = new BehaviorSubject<Attendance[]>([]);
  attendance$ = this.attendanceSubject.asObservable();

  constructor(
    private attendanceService: AttendanceService,
    private tenantContext: TenantContextService
  ) {
    combineLatest([
      this.tenantContext.activeGymId$,
      this.tenantContext.activeBranchId$
    ]).pipe(
      switchMap(([gymId, branchId]) => {
        if (!gymId) return of([]);
        return this.attendanceService.getAttendance().pipe(
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
      this.attendanceService.getAttendance().subscribe(attendance => {
        this.attendanceSubject.next(attendance);
      });
    }
  }

  markAttendance(memberId: string, status: 'present' | 'absent'): Observable<Attendance> {
    const timeIn = status === 'present' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    
    return this.attendanceService.markAttendance(memberId, status, timeIn).pipe(
      tap(() => {
        this.loadAttendance();
      })
    );
  }
}
