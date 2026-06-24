import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { 
  IAttendanceRepository, 
  ATTENDANCE_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../core/interfaces/repository.interfaces';
import { Attendance } from '../core/models/attendance.entity';
import { TenantContextService } from '../domain/tenancy/tenant-context.service';

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY_TOKEN) private attendanceRepository: IAttendanceRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService
  ) {}

  getAttendance(): Observable<Attendance[]> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.attendanceRepository.getAttendance(gymId);
  }

  markAttendance(memberId: string, status: 'present' | 'absent', timeIn: string): Observable<Attendance> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.attendanceRepository.markAttendance(gymId, memberId, status, timeIn).pipe(
      switchMap(attendance => {
        const msg = status === 'absent'
          ? `${attendance.memberName} marked absent today`
          : `${attendance.memberName} checked in today at ${timeIn}`;
        return this.logRepository.addLog(gymId, msg, 'attendance').pipe(
          map(() => attendance)
        );
      })
    );
  }
}
