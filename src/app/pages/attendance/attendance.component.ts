import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';

import { MemberState } from '../../presentation/state/member.state';
import { AttendanceState } from '../../presentation/state/attendance.state';
import { EmployeeState } from '../../presentation/state/employee.state';
import { Member } from '../../core/models/member.entity';
import { Attendance } from '../../core/models/attendance.entity';
import { Observable, combineLatest, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ExportService } from '../../domain/export/export.service';

interface RosterItem {
  memberId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  planName: string;
  timeIn: string;
  status: 'present' | 'absent' | 'unmarked';
}

interface EmployeeRosterItem {
  employeeId: string;
  name: string;
  email: string;
  role: string;
  timeIn: string;
  timeOut: string;
  status: 'Present' | 'Absent' | 'Leave' | 'Half Day' | 'Unmarked';
}

@Component({
  selector: 'app-attendance',
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
    MatSnackBarModule,
    MatMenuModule,
    MatTabsModule
  ],
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.scss']
})
export class AttendanceComponent implements OnInit {
  // Members Roster listing
  roster$: Observable<RosterItem[]> | undefined;
  filteredRoster$: Observable<RosterItem[]> | undefined;
  
  // Employees Roster listing
  employeesRoster$: Observable<EmployeeRosterItem[]> | undefined;
  filteredEmployeesRoster$: Observable<EmployeeRosterItem[]> | undefined;

  // Tabs tracking
  activeTab = 0; // 0 for members, 1 for employees
  
  // Members Stats
  presentCount$ = new Observable<number>();
  absentCount$ = new Observable<number>();
  attendanceRate$ = new Observable<number>();
  totalEligible$ = new Observable<number>();

  // Employees Stats
  employeePresentCount$ = new Observable<number>();
  employeeAbsentCount$ = new Observable<number>();
  employeeAttendanceRate$ = new Observable<number>();
  employeeTotalEligible$ = new Observable<number>();

  // Filter queries
  searchQuery = '';
  employeeSearchQuery = '';
  todayString = '';

  displayedColumns = ['photo', 'name', 'plan', 'time', 'status', 'actions'];
  displayedEmployeeColumns = ['photo', 'name', 'role', 'timeIn', 'timeOut', 'status', 'actions'];

  constructor(
    private memberState: MemberState,
    private attendanceState: AttendanceState,
    private employeeState: EmployeeState,
    private snackBar: MatSnackBar,
    private exportService: ExportService
  ) {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.todayString = new Date().toLocaleDateString('en-US', options);
  }

  ngOnInit(): void {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // --- Members Roster Init ---
    this.roster$ = combineLatest([
      this.memberState.members$,
      this.attendanceState.attendance$
    ]).pipe(
      map(([members, attendanceList]) => {
        const eligibleMembers = members.filter(m => m.status !== 'inactive');
        
        return eligibleMembers.map(m => {
          const checkin = attendanceList.find(a => a.memberId === m.id && a.date === todayStr);
          return {
            memberId: m.id,
            name: m.name,
            email: m.email,
            avatarUrl: m.avatarUrl,
            planName: m.planName,
            timeIn: checkin ? checkin.timeIn : '',
            status: checkin ? checkin.status : 'unmarked'
          };
        });
      })
    );

    this.presentCount$ = this.roster$.pipe(
      map(items => items.filter(i => i.status === 'present').length)
    );

    this.absentCount$ = this.roster$.pipe(
      map(items => items.filter(i => i.status === 'absent').length)
    );

    this.totalEligible$ = this.roster$.pipe(
      map(items => items.length)
    );

    this.attendanceRate$ = combineLatest([this.presentCount$, this.totalEligible$]).pipe(
      map(([present, total]) => total > 0 ? Math.round((present / total) * 100) : 0)
    );

    this.applySearchFilter();

    // --- Employees Roster Init ---
    this.employeesRoster$ = combineLatest([
      this.employeeState.employees$,
      this.employeeState.attendance$
    ]).pipe(
      map(([employees, attendanceList]) => {
        const eligibleEmployees = employees.filter(e => e.accountStatus !== 'Inactive');
        return eligibleEmployees.map(e => {
          const checkin = attendanceList.find(a => a.employeeId === e.id && a.date === todayStr);
          return {
            employeeId: e.id,
            name: e.fullName,
            email: e.email,
            role: e.role,
            timeIn: checkin ? (checkin.checkInTime || '') : '',
            timeOut: checkin ? (checkin.checkOutTime || '') : '',
            status: checkin ? (checkin.status || 'Unmarked') : 'Unmarked'
          };
        });
      })
    );

    this.employeePresentCount$ = this.employeesRoster$.pipe(
      map(items => items.filter(i => i.status === 'Present').length)
    );

    this.employeeAbsentCount$ = this.employeesRoster$.pipe(
      map(items => items.filter(i => i.status === 'Absent').length)
    );

    this.employeeTotalEligible$ = this.employeesRoster$.pipe(
      map(items => items.length)
    );

    this.employeeAttendanceRate$ = combineLatest([this.employeePresentCount$, this.employeeTotalEligible$]).pipe(
      map(([present, total]) => total > 0 ? Math.round((present / total) * 100) : 0)
    );

    this.applyEmployeeSearchFilter();
  }

  applySearchFilter() {
    if (this.roster$) {
      this.filteredRoster$ = this.roster$.pipe(
        map(items => items.filter(item => 
          item.name.toLowerCase().includes(this.searchQuery.trim().toLowerCase()) ||
          item.email.toLowerCase().includes(this.searchQuery.trim().toLowerCase())
        ))
      );
    }
  }

  applyEmployeeSearchFilter() {
    if (this.employeesRoster$) {
      this.filteredEmployeesRoster$ = this.employeesRoster$.pipe(
        map(items => items.filter(item => 
          item.name.toLowerCase().includes(this.employeeSearchQuery.trim().toLowerCase()) ||
          item.email.toLowerCase().includes(this.employeeSearchQuery.trim().toLowerCase())
        ))
      );
    }
  }

  // --- Members Mark Actions ---

  markPresent(item: RosterItem) {
    this.attendanceState.markAttendance(item.memberId, 'present').subscribe(() => {
      this.snackBar.open(`${item.name} checked in successfully.`, 'Dismiss', {
        duration: 2000
      });
    });
  }

  markAbsent(item: RosterItem) {
    this.attendanceState.markAttendance(item.memberId, 'absent').subscribe(() => {
      this.snackBar.open(`${item.name} marked absent.`, 'Dismiss', {
        duration: 2000
      });
    });
  }

  // --- Employees Mark Actions ---

  markEmployeePresent(item: EmployeeRosterItem) {
    const todayStr = new Date().toISOString().split('T')[0];
    const checkInTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    this.employeeState.markAttendance({
      employeeId: item.employeeId,
      employeeName: item.name,
      role: item.role as any,
      date: todayStr,
      status: 'Present',
      checkInTime,
      notes: 'Manual Check-in'
    }).subscribe(() => {
      this.snackBar.open(`${item.name} checked in successfully at ${checkInTime}.`, 'Dismiss', {
        duration: 2000
      });
    });
  }

  markEmployeeAbsent(item: EmployeeRosterItem) {
    const todayStr = new Date().toISOString().split('T')[0];
    this.employeeState.markAttendance({
      employeeId: item.employeeId,
      employeeName: item.name,
      role: item.role as any,
      date: todayStr,
      status: 'Absent',
      notes: 'Manual Absent'
    }).subscribe(() => {
      this.snackBar.open(`${item.name} marked absent today.`, 'Dismiss', {
        duration: 2000
      });
    });
  }

  markEmployeeCheckedOut(item: EmployeeRosterItem) {
    const todayStr = new Date().toISOString().split('T')[0];
    const checkOutTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    
    this.employeeState.markAttendance({
      employeeId: item.employeeId,
      employeeName: item.name,
      role: item.role as any,
      date: todayStr,
      status: 'Present',
      checkInTime: item.timeIn,
      checkOutTime,
      notes: 'Manual Check-out'
    }).subscribe(() => {
      this.snackBar.open(`${item.name} checked out successfully at ${checkOutTime}.`, 'Dismiss', {
        duration: 2000
      });
    });
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

  // --- Export Actions ---

  exportData(format: 'csv' | 'excel'): void {
    if (this.activeTab === 0) {
      if (!this.filteredRoster$) return;

      this.filteredRoster$.pipe(take(1)).subscribe(roster => {
        if (roster.length === 0) {
          this.snackBar.open('No member roster data to export.', 'Close', { duration: 3000 });
          return;
        }

        this.snackBar.open(`Member roster report generated! Downloading ${format.toUpperCase()}...`, 'Dismiss', {
          duration: 3000
        });

        const exportData = roster.map(r => ({
          MemberID: r.memberId,
          Name: r.name,
          Email: r.email,
          PlanName: r.planName,
          CheckInTime: r.timeIn || '—',
          Status: r.status.toUpperCase()
        }));

        const filename = `members_attendance_roster_${new Date().toISOString().split('T')[0]}`;
        if (format === 'csv') {
          this.exportService.exportToCsv(filename, exportData);
        } else {
          this.exportService.exportToExcel(filename, exportData);
        }
      });
    } else {
      if (!this.filteredEmployeesRoster$) return;

      this.filteredEmployeesRoster$.pipe(take(1)).subscribe(roster => {
        if (roster.length === 0) {
          this.snackBar.open('No employee roster data to export.', 'Close', { duration: 3000 });
          return;
        }

        this.snackBar.open(`Employee roster report generated! Downloading ${format.toUpperCase()}...`, 'Dismiss', {
          duration: 3000
        });

        const exportData = roster.map(r => ({
          EmployeeID: r.employeeId,
          Name: r.name,
          Email: r.email,
          Role: this.getRoleLabel(r.role),
          CheckInTime: r.timeIn || '—',
          CheckOutTime: r.timeOut || '—',
          Status: r.status.toUpperCase()
        }));

        const filename = `employees_attendance_roster_${new Date().toISOString().split('T')[0]}`;
        if (format === 'csv') {
          this.exportService.exportToCsv(filename, exportData);
        } else {
          this.exportService.exportToExcel(filename, exportData);
        }
      });
    }
  }
}
