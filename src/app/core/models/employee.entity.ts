import { UserRole } from '../enums/roles.enum';

export interface Employee {
  id: string;
  gymId: string;
  // Personal Details
  photoUrl?: string;
  fullName: string;
  phone: string;
  email: string;
  gender: string;
  dob: string;
  address: string;

  // Employment Details
  role: UserRole;
  department: string;
  joinDate: string;
  salary: number;
  shift: string;
  reportingManagerId?: string;
  reportingManagerName?: string;

  // Access Details
  username: string;
  accountStatus: 'Active' | 'Inactive' | 'Suspended';

  // Trainer Details (only relevant if role === UserRole.Trainer)
  specialty?: string;
  experienceYears?: number;
  assignedMembersCount?: number;
}

export interface EmployeeAttendance {
  id: string;
  gymId: string;
  employeeId: string;
  employeeName: string;
  role: UserRole;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Leave' | 'Half Day';
  checkInTime?: string;
  checkOutTime?: string;
  notes?: string;
}

export interface EmployeePayroll {
  id: string;
  gymId: string;
  employeeId: string;
  employeeName: string;
  role: UserRole;
  monthYear: string; // e.g. "June 2026"
  baseSalary: number;
  bonus: number;
  deductions: number;
  netPaid: number;
  paymentDate?: string;
  status: 'Paid' | 'Pending';
}

export interface EmployeePerformance {
  id: string;
  gymId: string;
  employeeId: string;
  employeeName: string;
  rating: number; // 1-5 stars
  reviewDate: string;
  feedback: string;
  tasksAssignedCount: number;
  tasksCompletedCount: number;
}
