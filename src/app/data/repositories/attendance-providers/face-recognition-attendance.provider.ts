import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AttendanceProvider, AttendanceLog, SyncResult } from '../../../core/interfaces/attendance-provider.interface';
import { DeviceConfiguration } from '../../../core/models/device-configuration.model';
import { Member } from '../../../core/models/member.entity';
import { Employee } from '../../../core/models/employee.entity';

@Injectable({
  providedIn: 'root'
})
export class FaceRecognitionAttendanceProvider implements AttendanceProvider {
  testConnection(device: DeviceConfiguration): Observable<boolean> {
    console.log(`[FaceRecognitionAttendanceProvider] Testing REST API connection to Face Scanner: ${device.apiUrl}`);
    return of(!!device.apiUrl);
  }

  getAttendanceLogs(device: DeviceConfiguration, fromDate?: string, toDate?: string): Observable<AttendanceLog[]> {
    console.log(`[FaceRecognitionAttendanceProvider] Pulling face scanner transaction logs...`);
    return of([]);
  }

  syncAttendance(device: DeviceConfiguration): Observable<SyncResult> {
    return of({
      successCount: 0,
      failureCount: 0,
      logsSynced: 0,
      timestamp: new Date().toISOString()
    });
  }

  pushMember(device: DeviceConfiguration, member: Member, deviceUserId: string): Observable<boolean> {
    console.log(`[FaceRecognitionAttendanceProvider] Registering face ID for member: UID ${deviceUserId} -> ${member.name}`);
    return of(true);
  }

  pushEmployee(device: DeviceConfiguration, employee: Employee, deviceUserId: string): Observable<boolean> {
    console.log(`[FaceRecognitionAttendanceProvider] Registering face ID for employee: UID ${deviceUserId} -> ${employee.fullName}`);
    return of(true);
  }
}
