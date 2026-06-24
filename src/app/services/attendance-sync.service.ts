import { Injectable, Inject } from '@angular/core';
import { Observable, of, forkJoin, throwError } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';

import { DeviceConfiguration } from '../core/models/device-configuration.model';
import { AttendanceMapping } from '../core/models/attendance-mapping.model';
import { AttendanceProvider, SyncResult, AttendanceLog } from '../core/interfaces/attendance-provider.interface';
import { EncryptionService } from './encryption.service';
import { AttendanceState } from '../presentation/state/attendance.state';
import { EmployeeState } from '../presentation/state/employee.state';

import {
  IAttendanceRepository,
  ATTENDANCE_REPOSITORY_TOKEN,
  IEmployeeRepository,
  EMPLOYEE_REPOSITORY_TOKEN,
  IAuditLogRepository,
  AUDIT_LOG_REPOSITORY_TOKEN
} from '../core/interfaces/repository.interfaces';

import { MockAttendanceProvider } from '../data/repositories/attendance-providers/mock-attendance.provider';
import { FirebaseAttendanceProvider } from '../data/repositories/attendance-providers/firebase-attendance.provider';
import { EsslAttendanceProvider } from '../data/repositories/attendance-providers/essl-attendance.provider';
import { FaceRecognitionAttendanceProvider } from '../data/repositories/attendance-providers/face-recognition-attendance.provider';
import { QRAttendanceProvider } from '../data/repositories/attendance-providers/qr-attendance.provider';

@Injectable({
  providedIn: 'root'
})
export class AttendanceSyncService {

  constructor(
    private encryptionService: EncryptionService,
    private attendanceState: AttendanceState,
    private employeeState: EmployeeState,
    @Inject(ATTENDANCE_REPOSITORY_TOKEN) private attendanceRepository: IAttendanceRepository,
    @Inject(EMPLOYEE_REPOSITORY_TOKEN) private employeeRepository: IEmployeeRepository,
    @Inject(AUDIT_LOG_REPOSITORY_TOKEN) private auditLogRepository: IAuditLogRepository,
    private mockProvider: MockAttendanceProvider,
    private firebaseProvider: FirebaseAttendanceProvider,
    private esslProvider: EsslAttendanceProvider,
    private faceProvider: FaceRecognitionAttendanceProvider,
    private qrProvider: QRAttendanceProvider
  ) {}

  getProvider(device: DeviceConfiguration): AttendanceProvider {
    const isMock = device.ipAddress === 'mock' || device.apiUrl === 'mock' || device.deviceName?.toLowerCase().includes('mock');
    if (isMock) {
      return this.mockProvider;
    }
    
    switch (device.deviceType) {
      case 'essl_biometric':
      case 'fingerprint':
      case 'rfid_card':
        return this.esslProvider;
      case 'face_recognition':
        return this.faceProvider;
      case 'qr_attendance':
      case 'custom_api':
        return this.qrProvider;
      default:
        return this.firebaseProvider;
    }
  }

  // --- Device Configurations CRUD ---

  getDevices(gymId: string): Observable<DeviceConfiguration[]> {
    return this.attendanceRepository.getDevices(gymId);
  }

  saveDevice(gymId: string, device: DeviceConfiguration): Observable<void> {
    return this.attendanceRepository.saveDevice(gymId, device);
  }

  deleteDevice(gymId: string, deviceId: string): Observable<void> {
    return this.attendanceRepository.deleteDevice(gymId, deviceId);
  }

  // --- Mappings CRUD ---

  getMappings(gymId: string): Observable<AttendanceMapping[]> {
    return this.attendanceRepository.getMappings(gymId);
  }

  saveMapping(gymId: string, mapping: AttendanceMapping): Observable<void> {
    return this.attendanceRepository.saveMapping(gymId, mapping);
  }

  deleteMapping(gymId: string, mappingId: string): Observable<void> {
    return this.attendanceRepository.deleteMapping(gymId, mappingId);
  }

  // --- Connection Tester ---

  testDeviceConnection(device: DeviceConfiguration): Observable<boolean> {
    try {
      const provider = this.getProvider(device);
      return provider.testConnection(device);
    } catch (e) {
      return of(false);
    }
  }

  // --- Synchronization Runner ---

  syncDevice(device: DeviceConfiguration, activeUserId: string, activeUserName: string): Observable<SyncResult> {
    const provider = this.getProvider(device);

    return provider.getAttendanceLogs(device).pipe(
      switchMap((logs: AttendanceLog[]) => {
        if (!logs || logs.length === 0) {
          return of({
            successCount: 0,
            failureCount: 0,
            logsSynced: 0,
            timestamp: new Date().toISOString()
          });
        }

        // Fetch mappings, member attendance, and employee attendance forkJoin
        return forkJoin([
          this.getMappings(device.gymId),
          this.attendanceRepository.getAttendance(device.gymId).pipe(catchError(() => of([]))),
          this.employeeRepository.getAttendance(device.gymId).pipe(catchError(() => of([])))
        ]).pipe(
          switchMap(([mappings, memberAttendance, employeeAttendance]) => {
            const syncOperations: Observable<boolean>[] = [];
            let successes = 0;
            let failures = 0;

            logs.forEach(log => {
              const mapping = mappings.find(m => m.deviceUserId === log.deviceUserId);
              if (!mapping) {
                failures++;
                return;
              }

              let datePart = new Date().toISOString().split('T')[0];
              let timePart = '00:00';
              try {
                if (log.timestamp.includes(' ')) {
                  const parts = log.timestamp.split(' ');
                  datePart = parts[0];
                  timePart = parts[1].substring(0, 5);
                } else if (log.timestamp.includes('T')) {
                  const dateObj = new Date(log.timestamp);
                  datePart = dateObj.toISOString().split('T')[0];
                  timePart = dateObj.toTimeString().substring(0, 5);
                } else {
                  datePart = log.timestamp;
                }
              } catch (e) {
                console.error('Error parsing log timestamp:', e);
              }

              if (mapping.mappedType === 'member') {
                const existing = memberAttendance.find(
                  a => a.gymId === device.gymId && a.memberId === mapping.mappedId && a.date === datePart
                );

                if (existing) {
                  if (existing.status === 'absent') {
                    // Update status in repo
                    const op = this.attendanceRepository.markAttendance(
                      device.gymId,
                      mapping.mappedId,
                      'present',
                      timePart
                    ).pipe(
                      map(() => true),
                      catchError(() => of(false))
                    );
                    syncOperations.push(op);
                  } else {
                    // already marked present
                    successes++;
                  }
                } else {
                  // Mark attendance in repo
                  const op = this.attendanceRepository.markAttendance(
                    device.gymId,
                    mapping.mappedId,
                    'present',
                    timePart
                  ).pipe(
                    map(() => true),
                    catchError(() => of(false))
                  );
                  syncOperations.push(op);
                }
              } else if (mapping.mappedType === 'employee') {
                const existing = employeeAttendance.find(
                  ea => ea.gymId === device.gymId && ea.employeeId === mapping.mappedId && ea.date === datePart
                );

                if (existing) {
                  if (log.direction === 'out' && !existing.checkOutTime) {
                    const recordToUpdate = {
                      ...existing,
                      checkOutTime: timePart
                    };
                    const op = this.employeeRepository.markAttendance(device.gymId, recordToUpdate).pipe(
                      map(() => true),
                      catchError(() => of(false))
                    );
                    syncOperations.push(op);
                  } else {
                    successes++;
                  }
                } else {
                  const record = {
                    gymId: device.gymId,
                    employeeId: mapping.mappedId,
                    employeeName: mapping.mappedName,
                    role: 'staff' as any,
                    date: datePart,
                    status: 'Present' as any,
                    checkInTime: log.direction === 'in' ? timePart : '09:00',
                    checkOutTime: log.direction === 'out' ? timePart : undefined,
                    notes: `Synced from ${device.deviceName} (${device.deviceType})`
                  };

                  const op = this.employeeRepository.markAttendance(device.gymId, record).pipe(
                    map(() => true),
                    catchError(() => of(false))
                  );
                  syncOperations.push(op);
                }
              }
            });

            const lastSyncStr = new Date().toISOString();

            const finalizeSync = () => {
              // Update sync time
              return this.attendanceRepository.updateDeviceSyncTime(device.gymId, device.id, lastSyncStr).pipe(
                switchMap(() => {
                  // Trigger state refresh
                  this.attendanceState.loadAttendance();
                  this.employeeState.loadAttendance();

                  // Audit sync log metrics
                  return this.auditLogRepository.addAuditLog(device.gymId, {
                    userId: activeUserId,
                    userName: activeUserName,
                    role: 'gym_owner',
                    action: `Sync Logs: ${device.deviceName}`,
                    entityType: 'attendance_device',
                    entityId: device.id,
                    entityName: device.deviceName,
                    timestamp: lastSyncStr,
                    gymId: device.gymId,
                    branchId: device.branchId
                  }).pipe(
                    map(() => ({
                      successCount: successes,
                      failureCount: failures,
                      logsSynced: logs.length,
                      timestamp: lastSyncStr
                    }))
                  );
                }),
                catchError(() => {
                  return of({
                    successCount: successes,
                    failureCount: failures,
                    logsSynced: logs.length,
                    timestamp: lastSyncStr
                  });
                })
              );
            };

            if (syncOperations.length === 0) {
              return finalizeSync();
            }

            return forkJoin(syncOperations).pipe(
              switchMap(results => {
                results.forEach(res => {
                  if (res) successes++;
                  else failures++;
                });
                return finalizeSync();
              })
            );
          })
        );
      }),
      catchError(err => {
        return of({
          successCount: 0,
          failureCount: 0,
          logsSynced: 0,
          timestamp: new Date().toISOString(),
          errors: [err.message || 'Sync failed due to error']
        });
      })
    );
  }
}
