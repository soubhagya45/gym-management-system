export interface AttendanceMapping {
  id: string;
  gymId: string;
  branchId: string;
  deviceUserId: string;
  mappedType: 'member' | 'employee';
  mappedId: string;
  mappedName: string;
  createdAt: string; // ISO string format
}
