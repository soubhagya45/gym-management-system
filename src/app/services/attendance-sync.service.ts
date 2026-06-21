import { Injectable, Inject } from '@angular/core';
import { Observable, from, of, forkJoin, throwError } from 'rxjs';
import { map, switchMap, catchError, take } from 'rxjs/operators';
import { FirebaseService } from '../data/repositories/firebase/firebase.service';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';

import { DeviceConfiguration, AttendanceDeviceType } from '../core/models/device-configuration.model';
import { AttendanceMapping } from '../core/models/attendance-mapping.model';
import { AttendanceProvider, AttendanceLog, SyncResult } from '../core/interfaces/attendance-provider.interface';
import { EncryptionService } from './encryption.service';
import { AttendanceState } from '../presentation/state/attendance.state';
import { EmployeeState } from '../presentation/state/employee.state';

import {
  IAttendanceRepository,
  ATTENDANCE_REPOSITORY_TOKEN,
  IEmployeeRepository,
  EMPLOYEE_REPOSITORY_TOKEN,
  IAuditLogRepository,
  AUDIT_LOG_REPOSITORY_TOKEN,
  IMemberRepository,
  MEMBER_REPOSITORY_TOKEN
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
    private firebaseService: FirebaseService,
    private encryptionService: EncryptionService,
    private attendanceState: AttendanceState,
    private employeeState: EmployeeState,
    @Inject(ATTENDANCE_REPOSITORY_TOKEN) private attendanceRepository: IAttendanceRepository,
    @Inject(EMPLOYEE_REPOSITORY_TOKEN) private employeeRepository: IEmployeeRepository,
    @Inject(MEMBER_REPOSITORY_TOKEN) private memberRepository: IMemberRepository,
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
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'deviceConfigurations'), where('gymId', '==', gymId));
    
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as DeviceConfiguration)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get device configurations.')))
    );
  }

  saveDevice(gymId: string, device: DeviceConfiguration): Observable<void> {
    const db = this.firebaseService.getDb();
    const deviceRef = doc(db, 'deviceConfigurations', device.id);
    return from(setDoc(deviceRef, { ...device, gymId })).pipe(
      catchError(err => throwError(() => new Error(err.message || 'Failed to save device configuration.')))
    );
  }

  deleteDevice(gymId: string, deviceId: string): Observable<void> {
    const db = this.firebaseService.getDb();
    const deviceRef = doc(db, 'deviceConfigurations', deviceId);
    return from(deleteDoc(deviceRef)).pipe(
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete device configuration.')))
    );
  }

  // --- Mappings CRUD ---

  getMappings(gymId: string): Observable<AttendanceMapping[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'attendanceMappings'), where('gymId', '==', gymId));
    
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as AttendanceMapping)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get mappings.')))
    );
  }

  saveMapping(gymId: string, mapping: AttendanceMapping): Observable<void> {
    const db = this.firebaseService.getDb();
    const mapRef = doc(db, 'attendanceMappings', mapping.id);
    return from(setDoc(mapRef, { ...mapping, gymId })).pipe(
      catchError(err => throwError(() => new Error(err.message || 'Failed to save attendance mapping.')))
    );
  }

  deleteMapping(gymId: string, mappingId: string): Observable<void> {
    const db = this.firebaseService.getDb();
    const mapRef = doc(db, 'attendanceMappings', mappingId);
    return from(deleteDoc(mapRef)).pipe(
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete mapping.')))
    );
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
    const db = this.firebaseService.getDb();
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

        // Retrieve active user mappings for mapping resolution
        return this.getMappings(device.gymId).pipe(
          switchMap(mappings => {
            const syncOperations: Observable<boolean>[] = [];
            let successes = 0;
            let failures = 0;

            logs.forEach(log => {
              const mapping = mappings.find(m => m.deviceUserId === log.deviceUserId);
              if (!mapping) {
                // No user mapped to this deviceUserID
                failures++;
                return;
              }

              // Parse date and time from timestamp
              // Expect format: YYYY-MM-DD HH:MM:SS or ISO string
              let datePart = new Date().toISOString().split('T')[0];
              let timePart = '00:00';
              try {
                if (log.timestamp.includes(' ')) {
                  const parts = log.timestamp.split(' ');
                  datePart = parts[0];
                  timePart = parts[1].substring(0, 5); // HH:MM
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
                // Prevent duplicate checks in Firestore for members
                const checkDuplicateQuery = query(
                  collection(db, 'attendance'),
                  where('gymId', '==', device.gymId),
                  where('memberId', '==', mapping.mappedId),
                  where('date', '==', datePart)
                );

                const op = from(getDocs(checkDuplicateQuery)).pipe(
                  switchMap(snap => {
                    if (!snap.empty) {
                      // Already marked, check if status is absent. If so, update to present
                      const docSnap = snap.docs[0];
                      const currentStatus = docSnap.data()['status'];
                      if (currentStatus === 'absent') {
                        return from(updateDoc(doc(db, 'attendance', docSnap.id), {
                          status: 'present',
                          timeIn: timePart
                        })).pipe(map(() => true));
                      }
                      return of(true); // already checked in, skip
                    } else {
                      // Create member check-in attendance record
                      return this.attendanceRepository.markAttendance(
                        device.gymId,
                        mapping.mappedId,
                        'present',
                        timePart
                      ).pipe(
                        map(() => true),
                        catchError(() => of(false))
                      );
                    }
                  })
                );
                syncOperations.push(op);
              } else if (mapping.mappedType === 'employee') {
                // Prevent duplicate checks in Firestore for employees
                const checkDuplicateQuery = query(
                  collection(db, 'employee_attendance'),
                  where('gymId', '==', device.gymId),
                  where('employeeId', '==', mapping.mappedId),
                  where('date', '==', datePart)
                );

                const op = from(getDocs(checkDuplicateQuery)).pipe(
                  switchMap(snap => {
                    if (!snap.empty) {
                      // Record exists. If direction is 'out' and checkOutTime is not set, update checkOutTime
                      const docSnap = snap.docs[0];
                      const currentData = docSnap.data();
                      if (log.direction === 'out' && !currentData['checkOutTime']) {
                        return from(updateDoc(doc(db, 'employee_attendance', docSnap.id), {
                          checkOutTime: timePart
                        })).pipe(map(() => true));
                      }
                      return of(true);
                    } else {
                      // Create employee attendance record
                      const record = {
                        gymId: device.gymId,
                        employeeId: mapping.mappedId,
                        employeeName: mapping.mappedName,
                        role: 'staff' as any, // fallback role, will resolve if matching employee is loaded, or simple string
                        date: datePart,
                        status: 'Present' as any,
                        checkInTime: log.direction === 'in' ? timePart : '09:00',
                        checkOutTime: log.direction === 'out' ? timePart : undefined,
                        notes: `Synced from ${device.deviceName} (${device.deviceType})`
                      };

                      return this.employeeRepository.markAttendance(device.gymId, record).pipe(
                        map(() => true),
                        catchError(() => of(false))
                      );
                    }
                  })
                );
                syncOperations.push(op);
              }
            });

            if (syncOperations.length === 0) {
              return of({
                successCount: successes,
                failureCount: failures,
                logsSynced: logs.length,
                timestamp: new Date().toISOString()
              });
            }

            return forkJoin(syncOperations).pipe(
              map(results => {
                results.forEach(res => {
                  if (res) successes++;
                  else failures++;
                });

                // Update device lastSyncTime
                const lastSyncStr = new Date().toISOString();
                updateDoc(doc(db, 'deviceConfigurations', device.id), {
                  lastSyncTime: lastSyncStr
                }).catch(e => console.error('Failed to update device sync time:', e));

                // Trigger states refresh
                this.attendanceState.loadAttendance();
                this.employeeState.loadAttendance();

                // Audit sync log metrics
                this.auditLogRepository.addAuditLog(device.gymId, {
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
                }).subscribe();

                return {
                  successCount: successes,
                  failureCount: failures,
                  logsSynced: logs.length,
                  timestamp: lastSyncStr
                };
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
