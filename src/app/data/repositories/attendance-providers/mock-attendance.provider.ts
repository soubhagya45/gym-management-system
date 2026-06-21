import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AttendanceProvider, AttendanceLog, SyncResult } from '../../../core/interfaces/attendance-provider.interface';
import { DeviceConfiguration } from '../../../core/models/device-configuration.model';
import { Member } from '../../../core/models/member.entity';
import { Employee } from '../../../core/models/employee.entity';

@Injectable({
  providedIn: 'root'
})
export class MockAttendanceProvider implements AttendanceProvider {
  testConnection(device: DeviceConfiguration): Observable<boolean> {
    // A mock device configuration with "Inactive" status might fail connection for testing
    if (device.status === 'Inactive') {
      return of(false);
    }
    return of(true);
  }

  getAttendanceLogs(device: DeviceConfiguration, fromDate?: string, toDate?: string): Observable<AttendanceLog[]> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    // Generate mock logs for today
    const logs: AttendanceLog[] = [
      {
        deviceUserId: '101', // Should map to a member
        timestamp: `${dateStr} 09:15:00`,
        direction: 'in',
        rawLog: `MOCK_LOG|USR101|DATE:${dateStr}|TIME:09:15|DIR:IN`
      },
      {
        deviceUserId: '202', // Should map to an employee
        timestamp: `${dateStr} 09:30:00`,
        direction: 'in',
        rawLog: `MOCK_LOG|USR202|DATE:${dateStr}|TIME:09:30|DIR:IN`
      },
      {
        deviceUserId: '101',
        timestamp: `${dateStr} 17:45:00`,
        direction: 'out',
        rawLog: `MOCK_LOG|USR101|DATE:${dateStr}|TIME:17:45|DIR:OUT`
      },
      {
        deviceUserId: '202',
        timestamp: `${dateStr} 18:00:00`,
        direction: 'out',
        rawLog: `MOCK_LOG|USR202|DATE:${dateStr}|TIME:18:00|DIR:OUT`
      }
    ];

    return of(logs);
  }

  syncAttendance(device: DeviceConfiguration): Observable<SyncResult> {
    return of({
      successCount: 4,
      failureCount: 0,
      logsSynced: 4,
      timestamp: new Date().toISOString()
    });
  }

  pushMember(device: DeviceConfiguration, member: Member, deviceUserId: string): Observable<boolean> {
    console.log(`[MockAttendanceProvider] Pushed member ${member.name} with device ID ${deviceUserId} to device ${device.deviceName}`);
    return of(true);
  }

  pushEmployee(device: DeviceConfiguration, employee: Employee, deviceUserId: string): Observable<boolean> {
    console.log(`[MockAttendanceProvider] Pushed employee ${employee.fullName} with device ID ${deviceUserId} to device ${device.deviceName}`);
    return of(true);
  }
}
