import { Injectable } from '@angular/core';
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
 * FUTURE MIGRATION STUB FOR FIREBASE FIRESTORE
 * To migrate, install `@angular/fire` and implement the Firestore calls below.
 */

@Injectable({ providedIn: 'root' })
export class FirebaseAuthRepository implements IAuthRepository {
  login(email: string, password: string): Observable<UserProfile> {
    return throwError(() => new Error('Firebase integration is not enabled. Switch app-config.ts provider to MOCK.'));
  }
  loginWithRole(role: 'owner' | 'trainer' | 'member'): Observable<UserProfile> {
    return throwError(() => new Error('Firebase integration is not enabled.'));
  }
  logout(): Observable<void> {
    return throwError(() => new Error('Firebase integration is not enabled.'));
  }
  register(
    gymName: string,
    ownerName: string,
    email: string,
    phone: string,
    password?: string
  ): Observable<UserProfile> {
    return throwError(() => new Error('Firebase integration is not enabled.'));
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseGymRepository implements IGymRepository {
  getGyms(): Observable<Gym[]> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  getGymById(gymId: string): Observable<Gym | null> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  createGym(gym: Omit<Gym, 'gymId' | 'createdAt'>): Observable<Gym> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  updateGym(gym: Gym): Observable<void> { return throwError(() => new Error('Firebase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class FirebaseMemberRepository implements IMemberRepository {
  getMembers(gymId: string): Observable<Member[]> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  getMemberById(gymId: string, id: string): Observable<Member | null> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  addMember(gymId: string, member: Omit<Member, 'id' | 'attendanceCount' | 'balance'>): Observable<Member> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  updateMember(gymId: string, member: Member): Observable<void> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  deleteMember(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Firebase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class FirebasePaymentRepository implements IPaymentRepository {
  getPayments(gymId: string): Observable<Payment[]> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  addPayment(gymId: string, payment: Omit<Payment, 'id'>): Observable<Payment> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  confirmPayment(gymId: string, paymentId: string): Observable<void> { return throwError(() => new Error('Firebase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class FirebaseLeadRepository implements ILeadRepository {
  getLeads(gymId: string): Observable<Lead[]> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  addLead(gymId: string, lead: Omit<Lead, 'id'>): Observable<Lead> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  updateLead(gymId: string, lead: Lead): Observable<void> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  deleteLead(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Firebase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class FirebaseTrainerRepository implements ITrainerRepository {
  getTrainers(gymId: string): Observable<Trainer[]> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  addTrainer(gymId: string, trainer: Omit<Trainer, 'id' | 'membersCount'>): Observable<Trainer> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  updateTrainer(gymId: string, trainer: Trainer): Observable<void> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  deleteTrainer(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Firebase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class FirebaseAttendanceRepository implements IAttendanceRepository {
  getAttendance(gymId: string): Observable<Attendance[]> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  markAttendance(gymId: string, memberId: string, status: 'present' | 'absent', timeIn: string): Observable<Attendance> { return throwError(() => new Error('Firebase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class FirebaseMembershipPlanRepository implements IMembershipPlanRepository {
  getPlans(gymId: string): Observable<MembershipPlan[]> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  addPlan(gymId: string, plan: Omit<MembershipPlan, 'id' | 'activeMembersCount'>): Observable<MembershipPlan> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  updatePlan(gymId: string, plan: MembershipPlan): Observable<void> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  deletePlan(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Firebase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class FirebaseActivityLogRepository implements IActivityLogRepository {
  getLogs(gymId: string): Observable<ActivityLog[]> { return throwError(() => new Error('Firebase integration is not enabled.')); }
  addLog(gymId: string, text: string, type: 'join' | 'payment' | 'attendance' | 'plan-change'): Observable<ActivityLog> { return throwError(() => new Error('Firebase integration is not enabled.')); }
}
