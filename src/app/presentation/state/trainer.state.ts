import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Trainer } from '../../core/models/trainer.entity';
import { Employee } from '../../core/models/employee.entity';
import { UserRole } from '../../core/enums/roles.enum';
import { EmployeeState } from './employee.state';
import { PTState } from './pt.state';

@Injectable({
  providedIn: 'root'
})
export class TrainerState {
  private trainersSubject = new BehaviorSubject<Trainer[]>([]);
  trainers$ = this.trainersSubject.asObservable();

  constructor(
    private employeeState: EmployeeState,
    private ptState: PTState
  ) {
    combineLatest([
      this.employeeState.employees$,
      this.ptState.memberPTPlans$,
      this.ptState.ptSessions$,
      this.ptState.trainerRevenue$
    ]).pipe(
      map(([employees, ptPlans, sessions, revenues]) => {
        return employees
          .filter(e => e.role === UserRole.Trainer)
          .map(e => {
            const trainer = this.mapEmployeeToTrainer(e);
            
            // Calculate activePTClients
            const activeClients = ptPlans.filter(p => p.trainerId === e.id && p.status === 'active').length;
            
            // Calculate totalPTRevenue
            const totalRevenue = revenues
              .filter(r => r.trainerId === e.id)
              .reduce((sum, r) => sum + r.amount, 0);
              
            // Calculate sessionsCompletedThisMonth
            const currentMonthStr = new Date().toISOString().substring(0, 7); // "YYYY-MM"
            const completedSessions = sessions.filter(s => 
              s.trainerId === e.id && 
              s.status === 'completed' && 
              s.date.startsWith(currentMonthStr)
            ).length;
            
            // Calculate utilizationPercent
            // Let's assume a full load is 40 sessions completed per month.
            const utilizationPercent = Math.min(100, Math.round((completedSessions / 40) * 100));
            
            // Monthly Rating - default or computed
            const monthlyRating = 4.8;

            return {
              ...trainer,
              activePTClients: activeClients,
              totalPTRevenue: totalRevenue,
              sessionsCompletedThisMonth: completedSessions,
              utilizationPercent: utilizationPercent,
              monthlyRating: monthlyRating
            };
          });
      })
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
