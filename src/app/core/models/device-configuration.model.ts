export type AttendanceDeviceType =
  | 'essl_biometric'
  | 'face_recognition'
  | 'fingerprint'
  | 'rfid_card'
  | 'qr_attendance'
  | 'custom_api';

export interface DeviceConfiguration {
  id: string;
  gymId: string;
  branchId: string;
  deviceName: string;
  deviceType: AttendanceDeviceType;
  ipAddress?: string;
  port?: number;
  apiUrl?: string;
  username?: string;
  passwordEncrypted?: string;
  status: 'Active' | 'Inactive';
  lastSyncTime?: string; // ISO string format
  createdAt: string; // ISO string format
}
