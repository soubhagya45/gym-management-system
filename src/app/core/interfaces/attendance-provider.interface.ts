import { Observable } from 'rxjs';
import { DeviceConfiguration } from '../models/device-configuration.model';
import { Member } from '../models/member.entity';
import { Employee } from '../models/employee.entity';

export interface AttendanceLog {
  deviceUserId: string;
  timestamp: string; // ISO string format or YYYY-MM-DD HH:mm:ss
  direction: 'in' | 'out';
  rawLog?: string;
}

export interface SyncResult {
  successCount: number;
  failureCount: number;
  logsSynced: number;
  timestamp: string;
  errors?: string[];
}

export interface AttendanceProvider {
  testConnection(device: DeviceConfiguration): Observable<boolean>;
  getAttendanceLogs(device: DeviceConfiguration, fromDate?: string, toDate?: string): Observable<AttendanceLog[]>;
  syncAttendance(device: DeviceConfiguration): Observable<SyncResult>;
  pushMember(device: DeviceConfiguration, member: Member, deviceUserId: string): Observable<boolean>;
  pushEmployee(device: DeviceConfiguration, employee: Employee, deviceUserId: string): Observable<boolean>;
}
