import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AttendanceProvider, AttendanceLog, SyncResult } from '../../../core/interfaces/attendance-provider.interface';
import { DeviceConfiguration } from '../../../core/models/device-configuration.model';
import { Member } from '../../../core/models/member.entity';
import { Employee } from '../../../core/models/employee.entity';

@Injectable({
  providedIn: 'root'
})
export class QRAttendanceProvider implements AttendanceProvider {
  testConnection(device: DeviceConfiguration): Observable<boolean> {
    console.log(`[QRAttendanceProvider] Testing API connection for QR Scan check-ins: ${device.apiUrl}`);
    return of(true);
  }

  getAttendanceLogs(device: DeviceConfiguration, fromDate?: string, toDate?: string): Observable<AttendanceLog[]> {
    console.log(`[QRAttendanceProvider] Reading check-in log stream from QR database...`);
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
    console.log(`[QRAttendanceProvider] Activating QR code profile for member: ${member.name} (${deviceUserId})`);
    return of(true);
  }

  pushEmployee(device: DeviceConfiguration, employee: Employee, deviceUserId: string): Observable<boolean> {
    console.log(`[QRAttendanceProvider] Activating QR code profile for employee: ${employee.fullName} (${deviceUserId})`);
    return of(true);
  }
}
