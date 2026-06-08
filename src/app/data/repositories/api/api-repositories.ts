import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { UserProfile } from '../../../core/models/user.model';
import { Gym } from '../../../core/models/gym.entity';
import { Member } from '../../../core/models/member.entity';
import { Payment } from '../../../core/models/payment.entity';
import { Lead } from '../../../core/models/lead.entity';
import { Trainer } from '../../../core/models/trainer.entity';
import { Attendance } from '../../../core/models/attendance.entity';
import { MembershipPlan } from '../../../core/models/membership-plan.entity';
import { ActivityLog } from '../../../core/models/activity-log.entity';

import {
  IAuthRepository,
  IGymRepository,
  IMemberRepository,
  IPaymentRepository,
  ILeadRepository,
  ITrainerRepository,
  IAttendanceRepository,
  IMembershipPlanRepository,
  IActivityLogRepository
} from '../../../core/interfaces/repository.interfaces';

/**
 * FUTURE MIGRATION STUB FOR REST API (NODE.JS, NESTJS, OR .NET CORE WITH POSTGRESQL/MONGODB)
 * To migrate, implement HttpClient requests using relative or absolute paths.
 */

@Injectable({ providedIn: 'root' })
export class ApiAuthRepository implements IAuthRepository {
  constructor(private http: HttpClient) {}
  login(email: string, password: string): Observable<UserProfile> {
    return throwError(() => new Error('API integration is not enabled. Switch app-config.ts provider to MOCK.'));
  }
  loginWithRole(role: 'owner' | 'trainer' | 'member'): Observable<UserProfile> {
    return throwError(() => new Error('API integration is not enabled.'));
  }
  logout(): Observable<void> {
    return throwError(() => new Error('API integration is not enabled.'));
  }
  register(
    gymName: string,
    ownerName: string,
    email: string,
    phone: string,
    password?: string
  ): Observable<UserProfile> {
    return throwError(() => new Error('API integration is not enabled.'));
  }
}

@Injectable({ providedIn: 'root' })
export class ApiGymRepository implements IGymRepository {
  constructor(private http: HttpClient) {}
  getGyms(): Observable<Gym[]> { return throwError(() => new Error('API integration is not enabled.')); }
  getGymById(gymId: string): Observable<Gym | null> { return throwError(() => new Error('API integration is not enabled.')); }
  createGym(gym: Omit<Gym, 'gymId' | 'createdAt'>): Observable<Gym> { return throwError(() => new Error('API integration is not enabled.')); }
  updateGym(gym: Gym): Observable<void> { return throwError(() => new Error('API integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class ApiMemberRepository implements IMemberRepository {
  constructor(private http: HttpClient) {}
  getMembers(gymId: string): Observable<Member[]> { return throwError(() => new Error('API integration is not enabled.')); }
  getMemberById(gymId: string, id: string): Observable<Member | null> { return throwError(() => new Error('API integration is not enabled.')); }
  addMember(gymId: string, member: Omit<Member, 'id' | 'attendanceCount' | 'balance'>): Observable<Member> { return throwError(() => new Error('API integration is not enabled.')); }
  updateMember(gymId: string, member: Member): Observable<void> { return throwError(() => new Error('API integration is not enabled.')); }
  deleteMember(gymId: string, id: string): Observable<void> { return throwError(() => new Error('API integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class ApiPaymentRepository implements IPaymentRepository {
  constructor(private http: HttpClient) {}
  getPayments(gymId: string): Observable<Payment[]> { return throwError(() => new Error('API integration is not enabled.')); }
  addPayment(gymId: string, payment: Omit<Payment, 'id'>): Observable<Payment> { return throwError(() => new Error('API integration is not enabled.')); }
  confirmPayment(gymId: string, paymentId: string): Observable<void> { return throwError(() => new Error('API integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class ApiLeadRepository implements ILeadRepository {
  constructor(private http: HttpClient) {}
  getLeads(gymId: string): Observable<Lead[]> { return throwError(() => new Error('API integration is not enabled.')); }
  addLead(gymId: string, lead: Omit<Lead, 'id'>): Observable<Lead> { return throwError(() => new Error('API integration is not enabled.')); }
  updateLead(gymId: string, lead: Lead): Observable<void> { return throwError(() => new Error('API integration is not enabled.')); }
  deleteLead(gymId: string, id: string): Observable<void> { return throwError(() => new Error('API integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class ApiTrainerRepository implements ITrainerRepository {
  constructor(private http: HttpClient) {}
  getTrainers(gymId: string): Observable<Trainer[]> { return throwError(() => new Error('API integration is not enabled.')); }
  addTrainer(gymId: string, trainer: Omit<Trainer, 'id' | 'membersCount'>): Observable<Trainer> { return throwError(() => new Error('API integration is not enabled.')); }
  updateTrainer(gymId: string, trainer: Trainer): Observable<void> { return throwError(() => new Error('API integration is not enabled.')); }
  deleteTrainer(gymId: string, id: string): Observable<void> { return throwError(() => new Error('API integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class ApiAttendanceRepository implements IAttendanceRepository {
  constructor(private http: HttpClient) {}
  getAttendance(gymId: string): Observable<Attendance[]> { return throwError(() => new Error('API integration is not enabled.')); }
  markAttendance(gymId: string, memberId: string, status: 'present' | 'absent', timeIn: string): Observable<Attendance> { return throwError(() => new Error('API integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class ApiMembershipPlanRepository implements IMembershipPlanRepository {
  constructor(private http: HttpClient) {}
  getPlans(gymId: string): Observable<MembershipPlan[]> { return throwError(() => new Error('API integration is not enabled.')); }
  addPlan(gymId: string, plan: Omit<MembershipPlan, 'id' | 'activeMembersCount'>): Observable<MembershipPlan> { return throwError(() => new Error('API integration is not enabled.')); }
  updatePlan(gymId: string, plan: MembershipPlan): Observable<void> { return throwError(() => new Error('API integration is not enabled.')); }
  deletePlan(gymId: string, id: string): Observable<void> { return throwError(() => new Error('API integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class ApiActivityLogRepository implements IActivityLogRepository {
  constructor(private http: HttpClient) {}
  getLogs(gymId: string): Observable<ActivityLog[]> { return throwError(() => new Error('API integration is not enabled.')); }
  addLog(gymId: string, text: string, type: 'join' | 'payment' | 'attendance' | 'plan-change'): Observable<ActivityLog> { return throwError(() => new Error('API integration is not enabled.')); }
}
