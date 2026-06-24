import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { Employee, EmployeeAttendance, EmployeePayroll, EmployeePerformance } from '../../core/models/employee.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { EmployeeService } from '../../services/employee.service';

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
    private employeeService: EmployeeService,
    private tenantContext: TenantContextService
  ) {
    combineLatest([
      this.tenantContext.activeGymId$,
      this.tenantContext.activeBranchId$
    ]).pipe(
      switchMap(([gymId, branchId]) => {
        if (!gymId) {
          this.employeesSubject.next([]);
          this.attendanceSubject.next([]);
          this.payrollSubject.next([]);
          this.performanceSubject.next([]);
          return of(null);
        }
        this.loadAll();
        return of(gymId);
      })
    ).subscribe();
  }

  private loadAll(): void {
    this.employeeService.getEmployees().pipe(
      catchError(err => {
        console.error('Error fetching employees:', err);
        return of([]);
      })
    ).subscribe(emp => this.employeesSubject.next(emp));

    this.employeeService.getAttendance().pipe(
      catchError(err => {
        console.error('Error fetching employee attendance:', err);
        return of([]);
      })
    ).subscribe(att => this.attendanceSubject.next(att));

    this.employeeService.getPayroll().pipe(
      catchError(err => {
        console.error('Error fetching employee payroll:', err);
        return of([]);
      })
    ).subscribe(pay => this.payrollSubject.next(pay));

    this.employeeService.getPerformance().pipe(
      catchError(err => {
        console.error('Error fetching employee performance:', err);
        return of([]);
      })
    ).subscribe(perf => this.performanceSubject.next(perf));
  }

  loadEmployees(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.employeeService.getEmployees().subscribe(emp => this.employeesSubject.next(emp));
    }
  }

  loadAttendance(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.employeeService.getAttendance().subscribe(att => this.attendanceSubject.next(att));
    }
  }

  loadPayroll(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.employeeService.getPayroll().subscribe(pay => this.payrollSubject.next(pay));
    }
  }

  loadPerformance(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.employeeService.getPerformance().subscribe(perf => this.performanceSubject.next(perf));
    }
  }

  addEmployee(employee: Omit<Employee, 'id' | 'gymId'>): Observable<Employee> {
    return this.employeeService.addEmployee(employee).pipe(
      tap(() => {
        this.loadEmployees();
      })
    );
  }

  updateEmployee(employee: Employee): Observable<void> {
    return this.employeeService.updateEmployee(employee).pipe(
      tap(() => {
        this.loadEmployees();
      })
    );
  }

  deleteEmployee(id: string): Observable<void> {
    return this.employeeService.deleteEmployee(id).pipe(
      tap(() => {
        this.loadEmployees();
      })
    );
  }

  markAttendance(record: Omit<EmployeeAttendance, 'id' | 'gymId'>): Observable<EmployeeAttendance> {
    return this.employeeService.markAttendance(record).pipe(
      tap(() => {
        this.loadAttendance();
      })
    );
  }

  addPayroll(record: Omit<EmployeePayroll, 'id' | 'gymId'>): Observable<EmployeePayroll> {
    return this.employeeService.addPayroll(record).pipe(
      tap(() => {
        this.loadPayroll();
      })
    );
  }

  addPerformance(record: Omit<EmployeePerformance, 'id' | 'gymId'>): Observable<EmployeePerformance> {
    return this.employeeService.addPerformance(record).pipe(
      tap(() => {
        this.loadPerformance();
      })
    );
  }
}
