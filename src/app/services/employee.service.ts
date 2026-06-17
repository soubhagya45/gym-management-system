import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IEmployeeRepository, EMPLOYEE_REPOSITORY_TOKEN } from '../core/interfaces/repository.interfaces';
import { Employee, EmployeeAttendance, EmployeePayroll, EmployeePerformance } from '../core/models/employee.entity';

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY_TOKEN) private employeeRepository: IEmployeeRepository
  ) {}

  getEmployees(gymId: string): Observable<Employee[]> {
    return this.employeeRepository.getEmployees(gymId);
  }

  getEmployeeById(gymId: string, id: string): Observable<Employee | null> {
    return this.employeeRepository.getEmployeeById(gymId, id);
  }

  addEmployee(gymId: string, employee: Omit<Employee, 'id'>): Observable<Employee> {
    return this.employeeRepository.addEmployee(gymId, employee);
  }

  updateEmployee(gymId: string, employee: Employee): Observable<void> {
    return this.employeeRepository.updateEmployee(gymId, employee);
  }

  deleteEmployee(gymId: string, id: string): Observable<void> {
    return this.employeeRepository.deleteEmployee(gymId, id);
  }

  getAttendance(gymId: string): Observable<EmployeeAttendance[]> {
    return this.employeeRepository.getAttendance(gymId);
  }

  markAttendance(gymId: string, record: Omit<EmployeeAttendance, 'id'>): Observable<EmployeeAttendance> {
    return this.employeeRepository.markAttendance(gymId, record);
  }

  getPayroll(gymId: string): Observable<EmployeePayroll[]> {
    return this.employeeRepository.getPayroll(gymId);
  }

  addPayroll(gymId: string, payroll: Omit<EmployeePayroll, 'id'>): Observable<EmployeePayroll> {
    return this.employeeRepository.addPayroll(gymId, payroll);
  }

  getPerformance(gymId: string): Observable<EmployeePerformance[]> {
    return this.employeeRepository.getPerformance(gymId);
  }

  addPerformance(gymId: string, performance: Omit<EmployeePerformance, 'id'>): Observable<EmployeePerformance> {
    return this.employeeRepository.addPerformance(gymId, performance);
  }
}
