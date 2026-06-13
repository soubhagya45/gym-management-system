import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import {
  IEmployeeRepository,
  EMPLOYEE_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { Employee, EmployeeAttendance, EmployeePayroll, EmployeePerformance } from '../../core/models/employee.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';

@Injectable({
  providedIn: 'root'
})
export class EmployeeState {
  private employeesSubject = new BehaviorSubject<Employee[]>([]);
  employees$ = this.employeesSubject.asObservable();

  private attendanceSubject = new BehaviorSubject<EmployeeAttendance[]>([]);
  attendance$ = this.attendanceSubject.asObservable();

  private payrollSubject = new BehaviorSubject<EmployeePayroll[]>([]);
  payroll$ = this.payrollSubject.asObservable();

  private performanceSubject = new BehaviorSubject<EmployeePerformance[]>([]);
  performance$ = this.performanceSubject.asObservable();

  get employees(): Employee[] { return this.employeesSubject.value; }
  get attendance(): EmployeeAttendance[] { return this.attendanceSubject.value; }
  get payroll(): EmployeePayroll[] { return this.payrollSubject.value; }
  get performance(): EmployeePerformance[] { return this.performanceSubject.value; }

  constructor(
    @Inject(EMPLOYEE_REPOSITORY_TOKEN) private employeeRepository: IEmployeeRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService
  ) {
    this.tenantContext.activeGymId$.pipe(
      switchMap(gymId => {
        if (!gymId) {
          this.employeesSubject.next([]);
          this.attendanceSubject.next([]);
          this.payrollSubject.next([]);
          this.performanceSubject.next([]);
          return of(null);
        }
        this.loadAll(gymId);
        return of(gymId);
      })
    ).subscribe();
  }

  private loadAll(gymId: string): void {
    this.employeeRepository.getEmployees(gymId).subscribe(emp => this.employeesSubject.next(emp));
    this.employeeRepository.getAttendance(gymId).subscribe(att => this.attendanceSubject.next(att));
    this.employeeRepository.getPayroll(gymId).subscribe(pay => this.payrollSubject.next(pay));
    this.employeeRepository.getPerformance(gymId).subscribe(perf => this.performanceSubject.next(perf));
  }

  loadEmployees(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.employeeRepository.getEmployees(gymId).subscribe(emp => this.employeesSubject.next(emp));
    }
  }

  loadAttendance(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.employeeRepository.getAttendance(gymId).subscribe(att => this.attendanceSubject.next(att));
    }
  }

  loadPayroll(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.employeeRepository.getPayroll(gymId).subscribe(pay => this.payrollSubject.next(pay));
    }
  }

  loadPerformance(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.employeeRepository.getPerformance(gymId).subscribe(perf => this.performanceSubject.next(perf));
    }
  }

  addEmployee(employee: Omit<Employee, 'id' | 'gymId'>): Observable<Employee> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.employeeRepository.addEmployee(gymId, { ...employee, gymId } as Employee).pipe(
      tap(() => {
        this.loadEmployees();
        this.logRepository.addLog(gymId, `Onboarded employee: ${employee.fullName} (${employee.role})`, 'join').subscribe();
      })
    );
  }

  updateEmployee(employee: Employee): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.employeeRepository.updateEmployee(gymId, employee).pipe(
      tap(() => {
        this.loadEmployees();
        this.logRepository.addLog(gymId, `Updated employee: ${employee.fullName}`, 'plan-change').subscribe();
      })
    );
  }

  deleteEmployee(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const name = this.employeesSubject.value.find(e => e.id === id)?.fullName || 'Employee';

    return this.employeeRepository.deleteEmployee(gymId, id).pipe(
      tap(() => {
        this.loadEmployees();
        this.logRepository.addLog(gymId, `Removed employee: ${name}`, 'plan-change').subscribe();
      })
    );
  }

  markAttendance(record: Omit<EmployeeAttendance, 'id' | 'gymId'>): Observable<EmployeeAttendance> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.employeeRepository.markAttendance(gymId, { ...record, gymId } as EmployeeAttendance).pipe(
      tap(() => {
        this.loadAttendance();
        this.logRepository.addLog(gymId, `Marked attendance for: ${record.employeeName} as ${record.status}`, 'attendance').subscribe();
      })
    );
  }

  addPayroll(record: Omit<EmployeePayroll, 'id' | 'gymId'>): Observable<EmployeePayroll> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.employeeRepository.addPayroll(gymId, { ...record, gymId } as EmployeePayroll).pipe(
      tap(() => {
        this.loadPayroll();
        this.logRepository.addLog(gymId, `Processed payroll for ${record.employeeName} (${record.monthYear})`, 'payment').subscribe();
      })
    );
  }

  addPerformance(record: Omit<EmployeePerformance, 'id' | 'gymId'>): Observable<EmployeePerformance> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.employeeRepository.addPerformance(gymId, { ...record, gymId } as EmployeePerformance).pipe(
      tap(() => {
        this.loadPerformance();
        this.logRepository.addLog(gymId, `Added performance review for ${record.employeeName}`, 'plan-change').subscribe();
      })
    );
  }
}
