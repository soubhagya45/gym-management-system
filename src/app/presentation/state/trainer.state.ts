import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { Trainer } from '../../core/models/trainer.entity';
import { Employee } from '../../core/models/employee.entity';
import { UserRole } from '../../core/enums/roles.enum';
import { EmployeeState } from './employee.state';

@Injectable({
  providedIn: 'root'
})
export class TrainerState {
  private trainersSubject = new BehaviorSubject<Trainer[]>([]);
  trainers$ = this.trainersSubject.asObservable();

  constructor(private employeeState: EmployeeState) {
    this.employeeState.employees$.pipe(
      map(employees => employees
        .filter(e => e.role === UserRole.Trainer)
        .map(e => this.mapEmployeeToTrainer(e))
      )
    ).subscribe(trainers => {
      this.trainersSubject.next(trainers);
    });
  }

  private mapEmployeeToTrainer(emp: Employee): Trainer {
    return {
      id: emp.id,
      gymId: emp.gymId,
      name: emp.fullName,
      specialty: emp.specialty || 'Fitness Trainer',
      rating: 4.8, // Default rating
      membersCount: emp.assignedMembersCount || 0,
      avatarUrl: emp.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(emp.fullName)}`,
      status: emp.accountStatus === 'Active' ? 'active' : 'on leave',
      email: emp.email,
      phone: emp.phone
    };
  }

  private mapTrainerToEmployeeInput(trainer: Omit<Trainer, 'id' | 'membersCount' | 'gymId'>): Omit<Employee, 'id' | 'gymId'> {
    return {
      fullName: trainer.name,
      photoUrl: trainer.avatarUrl,
      phone: trainer.phone,
      email: trainer.email,
      gender: 'Male', // Default values since Trainer page does not collect them
      dob: '1990-01-01',
      address: 'Not Specified',
      role: UserRole.Trainer,
      department: 'Fitness',
      joinDate: new Date().toISOString().split('T')[0],
      salary: 30000,
      shift: 'General',
      username: trainer.email.split('@')[0],
      accountStatus: trainer.status === 'active' ? 'Active' : 'Suspended',
      specialty: trainer.specialty,
      experienceYears: 3,
      assignedMembersCount: 0
    };
  }

  loadTrainers(): void {
    this.employeeState.loadEmployees();
  }

  addTrainer(trainer: Omit<Trainer, 'id' | 'membersCount' | 'gymId'>): Observable<Trainer> {
    const empInput = this.mapTrainerToEmployeeInput(trainer);
    return this.employeeState.addEmployee(empInput).pipe(
      map(emp => this.mapEmployeeToTrainer(emp))
    );
  }

  updateTrainer(trainer: Trainer): Observable<void> {
    // To update, we first get the existing employee to preserve other details like salary, dob etc.
    const existingEmp = this.employeeState.employees.find(e => e.id === trainer.id);
    if (!existingEmp) {
      return of(undefined);
    }
    const updatedEmp: Employee = {
      ...existingEmp,
      fullName: trainer.name,
      photoUrl: trainer.avatarUrl,
      phone: trainer.phone,
      email: trainer.email,
      specialty: trainer.specialty,
      accountStatus: trainer.status === 'active' ? 'Active' : 'Suspended'
    };
    return this.employeeState.updateEmployee(updatedEmp);
  }

  deleteTrainer(id: string): Observable<void> {
    return this.employeeState.deleteEmployee(id);
  }

  // Helper helper to access snapshot in sync contexts
  get trainers(): Trainer[] {
    return this.trainersSubject.value;
  }
}
