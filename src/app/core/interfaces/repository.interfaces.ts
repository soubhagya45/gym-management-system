import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { UserProfile } from '../models/user.model';
import { Gym } from '../models/gym.entity';
import { Member } from '../models/member.entity';
import { Payment } from '../models/payment.entity';
import { Lead } from '../models/lead.entity';
import { Trainer } from '../models/trainer.entity';
import { Attendance } from '../models/attendance.entity';
import { MembershipPlan } from '../models/membership-plan.entity';
import { ActivityLog } from '../models/activity-log.entity';
import { WhatsAppTemplate } from '../models/whatsapp-template.entity';
import { WhatsAppReminder } from '../models/whatsapp-reminder.entity';
import { BodyProgressEntry } from '../models/body-progress.entity';

// --- Interface Definitions ---

export interface IAuthRepository {
  login(email: string, password: string): Observable<UserProfile>;
  loginWithRole(role: 'owner' | 'trainer' | 'member'): Observable<UserProfile>;
  logout(): Observable<void>;
  register(
    gymName: string,
    ownerName: string,
    email: string,
    phone: string,
    password?: string,
    address?: string,
    gstNumber?: string
  ): Observable<UserProfile>;
}

export interface IGymRepository {
  getGyms(): Observable<Gym[]>;
  getGymById(gymId: string): Observable<Gym | null>;
  createGym(gym: Omit<Gym, 'gymId' | 'createdAt'>): Observable<Gym>;
  updateGym(gym: Gym): Observable<void>;
}

export interface IMemberRepository {
  getMembers(gymId: string): Observable<Member[]>;
  getMemberById(gymId: string, id: string): Observable<Member | null>;
  addMember(gymId: string, member: Omit<Member, 'id' | 'attendanceCount' | 'balance'>): Observable<Member>;
  updateMember(gymId: string, member: Member): Observable<void>;
  deleteMember(gymId: string, id: string): Observable<void>;
}

export interface IPaymentRepository {
  getPayments(gymId: string): Observable<Payment[]>;
  addPayment(gymId: string, payment: Omit<Payment, 'id'>): Observable<Payment>;
  confirmPayment(gymId: string, paymentId: string): Observable<void>;
}

export interface ILeadRepository {
  getLeads(gymId: string): Observable<Lead[]>;
  addLead(gymId: string, lead: Omit<Lead, 'id'>): Observable<Lead>;
  updateLead(gymId: string, lead: Lead): Observable<void>;
  deleteLead(gymId: string, id: string): Observable<void>;
}

export interface ITrainerRepository {
  getTrainers(gymId: string): Observable<Trainer[]>;
  addTrainer(gymId: string, trainer: Omit<Trainer, 'id' | 'membersCount'>): Observable<Trainer>;
  updateTrainer(gymId: string, trainer: Trainer): Observable<void>;
  deleteTrainer(gymId: string, id: string): Observable<void>;
}

export interface IAttendanceRepository {
  getAttendance(gymId: string): Observable<Attendance[]>;
  markAttendance(gymId: string, memberId: string, status: 'present' | 'absent', timeIn: string): Observable<Attendance>;
}

export interface IMembershipPlanRepository {
  getPlans(gymId: string): Observable<MembershipPlan[]>;
  addPlan(gymId: string, plan: Omit<MembershipPlan, 'id' | 'activeMembersCount'>): Observable<MembershipPlan>;
  updatePlan(gymId: string, plan: MembershipPlan): Observable<void>;
  deletePlan(gymId: string, id: string): Observable<void>;
}

export interface IActivityLogRepository {
  getLogs(gymId: string): Observable<ActivityLog[]>;
  addLog(gymId: string, text: string, type: 'join' | 'payment' | 'attendance' | 'plan-change'): Observable<ActivityLog>;
}

export interface IWhatsAppRepository {
  getTemplates(gymId: string): Observable<WhatsAppTemplate[]>;
  updateTemplate(gymId: string, template: WhatsAppTemplate): Observable<void>;
  getReminders(gymId: string): Observable<WhatsAppReminder[]>;
  addReminder(gymId: string, reminder: Omit<WhatsAppReminder, 'id'>): Observable<WhatsAppReminder>;
  updateReminder(gymId: string, reminder: WhatsAppReminder): Observable<void>;
  deleteReminder(gymId: string, id: string): Observable<void>;
}

export interface IBodyProgressRepository {
  getEntries(gymId: string, memberId: string): Observable<BodyProgressEntry[]>;
  getAllEntries(gymId: string): Observable<BodyProgressEntry[]>;
  addEntry(gymId: string, entry: Omit<BodyProgressEntry, 'id'>): Observable<BodyProgressEntry>;
  deleteEntry(gymId: string, id: string): Observable<void>;
}

// --- Angular InjectionTokens ---

export const AUTH_REPOSITORY_TOKEN = new InjectionToken<IAuthRepository>('AUTH_REPOSITORY_TOKEN');
export const GYM_REPOSITORY_TOKEN = new InjectionToken<IGymRepository>('GYM_REPOSITORY_TOKEN');
export const MEMBER_REPOSITORY_TOKEN = new InjectionToken<IMemberRepository>('MEMBER_REPOSITORY_TOKEN');
export const PAYMENT_REPOSITORY_TOKEN = new InjectionToken<IPaymentRepository>('PAYMENT_REPOSITORY_TOKEN');
export const LEAD_REPOSITORY_TOKEN = new InjectionToken<ILeadRepository>('LEAD_REPOSITORY_TOKEN');
export const TRAINER_REPOSITORY_TOKEN = new InjectionToken<ITrainerRepository>('TRAINER_REPOSITORY_TOKEN');
export const ATTENDANCE_REPOSITORY_TOKEN = new InjectionToken<IAttendanceRepository>('ATTENDANCE_REPOSITORY_TOKEN');
export const MEMBERSHIP_PLAN_REPOSITORY_TOKEN = new InjectionToken<IMembershipPlanRepository>('MEMBERSHIP_PLAN_REPOSITORY_TOKEN');
export const ACTIVITY_LOG_REPOSITORY_TOKEN = new InjectionToken<IActivityLogRepository>('ACTIVITY_LOG_REPOSITORY_TOKEN');
export const WHATSAPP_REPOSITORY_TOKEN = new InjectionToken<IWhatsAppRepository>('WHATSAPP_REPOSITORY_TOKEN');
export const BODY_PROGRESS_REPOSITORY_TOKEN = new InjectionToken<IBodyProgressRepository>('BODY_PROGRESS_REPOSITORY_TOKEN');
