import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AttendanceProvider, AttendanceLog, SyncResult } from '../../../core/interfaces/attendance-provider.interface';
import { DeviceConfiguration } from '../../../core/models/device-configuration.model';
import { Member } from '../../../core/models/member.entity';
import { Employee } from '../../../core/models/employee.entity';
import { FirebaseService } from '../firebase/firebase.service';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAttendanceProvider implements AttendanceProvider {
  constructor(private firebaseService: FirebaseService) {}

  testConnection(device: DeviceConfiguration): Observable<boolean> {
    // If the device configuration has an API URL, we simulate verifying the REST API connection
    return of(true);
  }

  getAttendanceLogs(device: DeviceConfiguration, fromDate?: string, toDate?: string): Observable<AttendanceLog[]> {
    const db = this.firebaseService.getDb();
    const q = query(
      collection(db, 'deviceRawLogs'),
      where('gymId', '==', device.gymId),
      where('deviceId', '==', device.id)
    );
    
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => {
        const data = d.data();
        return {
          deviceUserId: data['deviceUserId'],
          timestamp: data['timestamp'],
          direction: data['direction'] || 'in',
          rawLog: data['rawLog'] || ''
        } as AttendanceLog;
      })),
      catchError(() => of([]))
    );
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
    // Write member data to local buffer or device database representation
    const db = this.firebaseService.getDb();
    return from(addDoc(collection(db, 'deviceSyncQueue'), {
      gymId: device.gymId,
      branchId: device.branchId,
      deviceId: device.id,
      action: 'push_member',
      entityId: member.id,
      deviceUserId,
      status: 'pending',
      createdAt: new Date().toISOString()
    })).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  pushEmployee(device: DeviceConfiguration, employee: Employee, deviceUserId: string): Observable<boolean> {
    // Write employee data to local buffer or device database representation
    const db = this.firebaseService.getDb();
    return from(addDoc(collection(db, 'deviceSyncQueue'), {
      gymId: device.gymId,
      branchId: device.branchId,
      deviceId: device.id,
      action: 'push_employee',
      entityId: employee.id,
      deviceUserId,
      status: 'pending',
      createdAt: new Date().toISOString()
    })).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
}
