import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap, map, tap } from 'rxjs/operators';
import { 
  IEmployeeRepository, 
  EMPLOYEE_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../core/interfaces/repository.interfaces';
import { Employee, EmployeeAttendance, EmployeePayroll, EmployeePerformance } from '../core/models/employee.entity';
import { TenantContextService } from '../domain/tenancy/tenant-context.service';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY_TOKEN) private employeeRepository: IEmployeeRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService
  ) {}

  getEmployees(): Observable<Employee[]> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.employeeRepository.getEmployees(gymId);
  }

  getEmployeeById(id: string): Observable<Employee | null> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.employeeRepository.getEmployeeById(gymId, id);
  }

  addEmployee(employee: Omit<Employee, 'id' | 'gymId'>): Observable<Employee> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.employeeRepository.addEmployee(gymId, { ...employee, gymId } as Employee).pipe(
      switchMap(newEmp => {
        return this.logRepository.addLog(gymId, `Onboarded employee: ${employee.fullName} (${employee.role})`, 'join').pipe(
          map(() => newEmp)
        );
      })
    );
  }

  updateEmployee(employee: Employee): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.employeeRepository.updateEmployee(gymId, employee).pipe(
      switchMap(() => {
        return this.logRepository.addLog(gymId, `Updated employee: ${employee.fullName}`, 'plan-change');
      }),
      map(() => undefined)
    );
  }

  deleteEmployee(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.employeeRepository.getEmployeeById(gymId, id).pipe(
      switchMap(emp => {
        const name = emp ? emp.fullName : 'Employee';
        return this.employeeRepository.deleteEmployee(gymId, id).pipe(
          switchMap(() => {
            return this.logRepository.addLog(gymId, `Removed employee: ${name}`, 'plan-change');
          })
        );
      }),
      map(() => undefined)
    );
  }

  getAttendance(): Observable<EmployeeAttendance[]> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.employeeRepository.getAttendance(gymId);
  }

  markAttendance(record: Omit<EmployeeAttendance, 'id' | 'gymId'>): Observable<EmployeeAttendance> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.employeeRepository.markAttendance(gymId, { ...record, gymId } as EmployeeAttendance).pipe(
      switchMap(newRecord => {
        return this.logRepository.addLog(gymId, `Marked attendance for: ${record.employeeName} as ${record.status}`, 'attendance').pipe(
          map(() => newRecord)
        );
      })
    );
  }

  getPayroll(): Observable<EmployeePayroll[]> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.employeeRepository.getPayroll(gymId);
  }

  addPayroll(record: Omit<EmployeePayroll, 'id' | 'gymId'>): Observable<EmployeePayroll> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.employeeRepository.addPayroll(gymId, { ...record, gymId } as EmployeePayroll).pipe(
      switchMap(newRecord => {
        return this.logRepository.addLog(gymId, `Processed payroll for ${record.employeeName} (${record.monthYear})`, 'payment').pipe(
          map(() => newRecord)
        );
      })
    );
  }

  getPerformance(): Observable<EmployeePerformance[]> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.employeeRepository.getPerformance(gymId);
  }

  addPerformance(record: Omit<EmployeePerformance, 'id' | 'gymId'>): Observable<EmployeePerformance> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.employeeRepository.addPerformance(gymId, { ...record, gymId } as EmployeePerformance).pipe(
      switchMap(newRecord => {
        return this.logRepository.addLog(gymId, `Added performance review for ${record.employeeName}`, 'plan-change').pipe(
          map(() => newRecord)
        );
      })
    );
  }
}
