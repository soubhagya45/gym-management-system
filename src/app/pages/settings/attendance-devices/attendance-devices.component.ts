import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { DeviceConfiguration, AttendanceDeviceType } from '../../../core/models/device-configuration.model';
import { AttendanceMapping } from '../../../core/models/attendance-mapping.model';
import { AttendanceSyncService } from '../../../services/attendance-sync.service';
import { EncryptionService } from '../../../services/encryption.service';
import { TenantContextService } from '../../../domain/tenancy/tenant-context.service';
import { AuthState } from '../../../presentation/state/auth.state';
import { MemberState } from '../../../presentation/state/member.state';
import { EmployeeState } from '../../../presentation/state/employee.state';
import { Member } from '../../../core/models/member.entity';
import { Employee } from '../../../core/models/employee.entity';
import { forkJoin, of } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-attendance-devices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTabsModule,
    MatTooltipModule
  ],
  templateUrl: './attendance-devices.component.html',
  styleUrls: ['./attendance-devices.component.scss']
})
export class AttendanceDevicesComponent implements OnInit {
  devices: DeviceConfiguration[] = [];
  mappings: AttendanceMapping[] = [];
  members: Member[] = [];
  employees: Employee[] = [];

  // Form toggles & properties
  showDeviceForm = false;
  isEditingDevice = false;
  showMappingForm = false;

  // New/Edit Device Form Model
  deviceForm: Omit<DeviceConfiguration, 'createdAt'> = {
    id: '',
    gymId: '',
    branchId: '',
    deviceName: '',
    deviceType: 'mock_attendance' as any,
    ipAddress: '',
    port: 80,
    apiUrl: '',
    username: '',
    passwordEncrypted: '',
    status: 'Active'
  };
  plainPassword = '';

  // New Mapping Form Model
  mappingForm: Omit<AttendanceMapping, 'id' | 'gymId' | 'branchId' | 'mappedName' | 'createdAt'> = {
    deviceUserId: '',
    mappedType: 'member',
    mappedId: ''
  };

  displayedDeviceColumns = ['name', 'type', 'connection', 'syncInfo', 'status', 'actions'];
  displayedMappingColumns = ['deviceUserId', 'mappedType', 'mappedName', 'actions'];

  constructor(
    private syncService: AttendanceSyncService,
    private encryptionService: EncryptionService,
    private tenantContext: TenantContextService,
    private authState: AuthState,
    private memberState: MemberState,
    private employeeState: EmployeeState,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) return;

    this.syncService.getDevices(gymId).subscribe(devices => this.devices = devices);
    this.syncService.getMappings(gymId).subscribe(mappings => this.mappings = mappings);

    this.memberState.members$.subscribe(members => this.members = members.filter(m => m.status !== 'inactive'));
    this.employeeState.employees$.subscribe(employees => this.employees = employees.filter(e => e.accountStatus !== 'Inactive'));
  }

  // --- Device Configurations Actions ---

  openAddDevice(): void {
    this.isEditingDevice = false;
    this.plainPassword = '';
    this.deviceForm = {
      id: 'dev_' + Math.random().toString(36).substring(2, 9),
      gymId: this.tenantContext.getTenantId() || '',
      branchId: this.tenantContext.getBranchId() || '',
      deviceName: '',
      deviceType: 'mock_attendance' as any,
      ipAddress: '',
      port: 80,
      apiUrl: '',
      username: '',
      passwordEncrypted: '',
      status: 'Active'
    };
    this.showDeviceForm = true;
  }

  openEditDevice(device: DeviceConfiguration): void {
    this.isEditingDevice = true;
    this.deviceForm = { ...device };
    this.plainPassword = device.passwordEncrypted ? this.encryptionService.decrypt(device.passwordEncrypted) : '';
    this.showDeviceForm = true;
  }

  saveDevice(): void {
    if (!this.deviceForm.deviceName) {
      this.snackBar.open('Device Name is required.', 'Dismiss', { duration: 3000 });
      return;
    }

    if (this.plainPassword) {
      this.deviceForm.passwordEncrypted = this.encryptionService.encrypt(this.plainPassword);
    }

    const gymId = this.tenantContext.getTenantId();
    if (!gymId) return;

    const deviceToSave: DeviceConfiguration = {
      ...this.deviceForm,
      createdAt: (this.deviceForm as any).createdAt || new Date().toISOString()
    } as DeviceConfiguration;

    this.syncService.saveDevice(gymId, deviceToSave).subscribe({
      next: () => {
        this.snackBar.open(`Device "${deviceToSave.deviceName}" saved successfully.`, 'Dismiss', { duration: 3000 });
        this.showDeviceForm = false;
        this.loadAllData();
      },
      error: (err) => {
        this.snackBar.open(err.message || 'Failed to save device.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  deleteDevice(deviceId: string): void {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) return;

    if (confirm('Are you sure you want to delete this device? This will not delete user mappings.')) {
      this.syncService.deleteDevice(gymId, deviceId).subscribe(() => {
        this.snackBar.open('Device deleted successfully.', 'Dismiss', { duration: 3000 });
        this.loadAllData();
      });
    }
  }

  toggleDeviceStatus(device: DeviceConfiguration): void {
    const newStatus = device.status === 'Active' ? 'Inactive' : 'Active';
    const updated: DeviceConfiguration = { ...device, status: newStatus };
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) return;

    this.syncService.saveDevice(gymId, updated).subscribe(() => {
      this.snackBar.open(`Device status updated to ${newStatus}.`, 'Dismiss', { duration: 3000 });
      this.loadAllData();
    });
  }

  testConnection(device: DeviceConfiguration): void {
    this.snackBar.open(`Testing connection to "${device.deviceName}"...`, 'Dismiss', { duration: 2000 });
    this.syncService.testDeviceConnection(device).subscribe(success => {
      if (success) {
        this.snackBar.open(`Connection test succeeded for "${device.deviceName}".`, 'Dismiss', {
          duration: 3000,
          panelClass: ['snackbar-success']
        });
      } else {
        this.snackBar.open(`Connection test FAILED for "${device.deviceName}". Check network details or status.`, 'Dismiss', {
          duration: 4000,
          panelClass: ['snackbar-error']
        });
      }
    });
  }

  syncLogs(device: DeviceConfiguration): void {
    const user = this.authState.currentUserValue;
    const uid = user ? user.id : 'system';
    const name = user ? user.name : 'System Sync';

    this.snackBar.open(`Synchronizing logs from "${device.deviceName}"...`, 'Dismiss', { duration: 2000 });
    this.syncService.syncDevice(device, uid, name).subscribe(result => {
      if (result.errors && result.errors.length > 0) {
        this.snackBar.open(`Sync Failed: ${result.errors[0]}`, 'Dismiss', { duration: 4000 });
      } else {
        this.snackBar.open(`Sync Completed. ${result.successCount} check-ins processed successfully, ${result.failureCount} unresolved.`, 'Dismiss', {
          duration: 4000
        });
        this.loadAllData();
      }
    });
  }

  // --- Mappings Actions ---

  openAddMapping(): void {
    this.mappingForm = {
      deviceUserId: '',
      mappedType: 'member',
      mappedId: ''
    };
    this.showMappingForm = true;
  }

  saveMapping(): void {
    if (!this.mappingForm.deviceUserId || !this.mappingForm.mappedId) {
      this.snackBar.open('Device User ID and target person are required.', 'Dismiss', { duration: 3000 });
      return;
    }

    const gymId = this.tenantContext.getTenantId();
    const branchId = this.tenantContext.getBranchId() || '';
    if (!gymId) return;

    let mappedName = '';
    if (this.mappingForm.mappedType === 'member') {
      const match = this.members.find(m => m.id === this.mappingForm.mappedId);
      mappedName = match ? match.name : 'Unknown Member';
    } else {
      const match = this.employees.find(e => e.id === this.mappingForm.mappedId);
      mappedName = match ? match.fullName : 'Unknown Employee';
    }

    // Check if the Device User ID is already mapped in this gym
    const duplicate = this.mappings.find(m => m.deviceUserId === this.mappingForm.deviceUserId);
    if (duplicate) {
      this.snackBar.open(`Device User ID "${this.mappingForm.deviceUserId}" is already mapped to ${duplicate.mappedName}.`, 'Dismiss', { duration: 4000 });
      return;
    }

    const newMapping: AttendanceMapping = {
      id: `map_${gymId}_${this.mappingForm.deviceUserId}`,
      gymId,
      branchId,
      deviceUserId: this.mappingForm.deviceUserId,
      mappedType: this.mappingForm.mappedType,
      mappedId: this.mappingForm.mappedId,
      mappedName,
      createdAt: new Date().toISOString()
    };

    this.syncService.saveMapping(gymId, newMapping).subscribe(() => {
      this.snackBar.open(`Mapped Device ID "${newMapping.deviceUserId}" to ${mappedName}.`, 'Dismiss', { duration: 3000 });
      this.showMappingForm = false;
      this.loadAllData();
    });
  }

  deleteMapping(mappingId: string): void {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) return;

    if (confirm('Are you sure you want to remove this user mapping?')) {
      this.syncService.deleteMapping(gymId, mappingId).subscribe(() => {
        this.snackBar.open('Mapping removed successfully.', 'Dismiss', { duration: 3000 });
        this.loadAllData();
      });
    }
  }

  getDeviceTypeLabel(type: AttendanceDeviceType): string {
    switch (type) {
      case 'essl_biometric': return 'ESSL Biometric';
      case 'face_recognition': return 'Face Recognition';
      case 'fingerprint': return 'Fingerprint';
      case 'rfid_card': return 'RFID Card Reader';
      case 'qr_attendance': return 'QR Attendance';
      case 'custom_api': return 'Custom API';
      default: return type;
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'gym_owner': return 'Gym Owner';
      case 'branch_manager': return 'Branch Manager';
      case 'trainer': return 'Trainer';
      case 'staff': return 'Staff';
      default: return role;
    }
  }
}
