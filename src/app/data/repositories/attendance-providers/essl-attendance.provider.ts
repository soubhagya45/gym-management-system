import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AttendanceProvider, AttendanceLog, SyncResult } from '../../../core/interfaces/attendance-provider.interface';
import { DeviceConfiguration } from '../../../core/models/device-configuration.model';
import { Member } from '../../../core/models/member.entity';
import { Employee } from '../../../core/models/employee.entity';

@Injectable({
  providedIn: 'root'
})
export class EsslAttendanceProvider implements AttendanceProvider {
  testConnection(device: DeviceConfiguration): Observable<boolean> {
    console.log(`[EsslAttendanceProvider] Connection test to ESSL biometric machine: ${device.ipAddress}:${device.port}`);
    // Simulate connection checking: if IP is provided, assume active stub succeeds
    return of(!!device.ipAddress);
  }

  getAttendanceLogs(device: DeviceConfiguration, fromDate?: string, toDate?: string): Observable<AttendanceLog[]> {
    console.log(`[EsslAttendanceProvider] Pulling logs from ESSL biometric machine...`);
    // Placeholder ESSL response (returns empty since hardware is not integrated yet)
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
    console.log(`[EsslAttendanceProvider] Push Member mapping to biometric database: UID ${deviceUserId} -> ${member.name}`);
    return of(true);
  }

  pushEmployee(device: DeviceConfiguration, employee: Employee, deviceUserId: string): Observable<boolean> {
    console.log(`[EsslAttendanceProvider] Push Employee mapping to biometric database: UID ${deviceUserId} -> ${employee.fullName}`);
    return of(true);
  }
}
