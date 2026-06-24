import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { UserProfile } from '../models/user.model';
import { UserRole } from '../enums/roles.enum';
import { Gym } from '../models/gym.entity';
import { Member } from '../models/member.entity';
import { Payment } from '../models/payment.entity';
import { Lead, LeadConversionPayload, LeadConversionResult } from '../models/lead.entity';
import { Trainer } from '../models/trainer.entity';
import { Attendance } from '../models/attendance.entity';
import { MembershipPlan } from '../models/membership-plan.entity';
import { ActivityLog } from '../models/activity-log.entity';
import { WhatsAppTemplate } from '../models/whatsapp-template.entity';
import { WhatsAppReminder } from '../models/whatsapp-reminder.entity';
import { BodyProgressEntry } from '../models/body-progress.entity';
import { Expense, Invoice, Collection } from '../models/finance.entity';
import { Employee, EmployeeAttendance, EmployeePayroll, EmployeePerformance } from '../models/employee.entity';
import { PTPlan } from '../models/pt-plan.entity';
import { PTSession } from '../models/pt-session.entity';
import { TrainerAssignment } from '../models/trainer-assignment.entity';
import { SessionHistory } from '../models/session-history.entity';
import { TrainerRevenue } from '../models/trainer-revenue.entity';
import { MemberPTPlan } from '../models/member-pt-plan.entity';
import { AuditLog } from '../models/audit-log.model';
import { PaymentSettings } from '../models/payment-settings.model';
import { DeviceConfiguration } from '../models/device-configuration.model';
import { AttendanceMapping } from '../models/attendance-mapping.model';

// --- Interface Definitions ---

export interface IAuthRepository {
  login(email: string, password: string): Observable<UserProfile>;
  loginWithRole(role: UserRole): Observable<UserProfile>;
  logout(): Observable<void>;
  register(
    gymName: string,
    ownerName: string,
    email: string,
    phone: string,
    password?: string,
    address?: string,
    gstNumber?: string,
    gymType?: string,
    openingTime?: string,
    closingTime?: string
  ): Observable<UserProfile>;
  getUserProfile(userId: string): Observable<UserProfile | null>;
  inviteStaff(email: string, name: string, role: UserRole, gymId: string): Observable<UserProfile>;
  changePassword(email: string, newPassword: string): Observable<void>;
  clearFirstLoginFlag(email: string): Observable<void>;
  getUsers(): Observable<UserProfile[]>;
  updateUserRole(userId: string, role: UserRole): Observable<void>;
  waitForAuthResolution(): Promise<boolean>;
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
  registerMember(payload: LeadConversionPayload): Observable<LeadConversionResult>;
}

export interface IPaymentRepository {
  getPayments(gymId: string): Observable<Payment[]>;
  addPayment(gymId: string, payment: Omit<Payment, 'id'>): Observable<Payment>;
  confirmPayment(gymId: string, paymentId: string): Observable<void>;
}

export interface IPaymentSettingsRepository {
  getSettings(gymId: string): Observable<PaymentSettings[]>;
  getSettingsByProvider(gymId: string, provider: string): Observable<PaymentSettings | null>;
  saveSettings(gymId: string, settings: PaymentSettings): Observable<void>;
}

export interface ILeadRepository {
  getLeads(gymId: string): Observable<Lead[]>;
  addLead(gymId: string, lead: Omit<Lead, 'id'>): Observable<Lead>;
  updateLead(gymId: string, lead: Lead): Observable<void>;
  deleteLead(gymId: string, id: string): Observable<void>;
  /**
   * Atomically converts a lead to a member using a Firestore WriteBatch.
   * Either ALL writes succeed or ALL fail — no partial state is possible.
   */
  convertLeadToMember(payload: LeadConversionPayload): Observable<LeadConversionResult>;
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
  getDevices(gymId: string): Observable<DeviceConfiguration[]>;
  saveDevice(gymId: string, device: DeviceConfiguration): Observable<void>;
  deleteDevice(gymId: string, deviceId: string): Observable<void>;
  getMappings(gymId: string): Observable<AttendanceMapping[]>;
  saveMapping(gymId: string, mapping: AttendanceMapping): Observable<void>;
  deleteMapping(gymId: string, mappingId: string): Observable<void>;
  updateDeviceSyncTime(gymId: string, deviceId: string, syncTime: string): Observable<void>;
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

export interface IAuditLogRepository {
  getAuditLogs(gymId: string): Observable<AuditLog[]>;
  addAuditLog(gymId: string, log: Omit<AuditLog, 'id'>): Observable<AuditLog>;
}

export interface IWhatsAppRepository {
  getTemplates(gymId: string): Observable<WhatsAppTemplate[]>;
  addTemplate(gymId: string, template: Omit<WhatsAppTemplate, 'id'>): Observable<WhatsAppTemplate>;
  updateTemplate(gymId: string, template: WhatsAppTemplate): Observable<void>;
  deleteTemplate(gymId: string, id: string): Observable<void>;
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

export interface IFinanceRepository {
  getExpenses(gymId: string): Observable<Expense[]>;
  addExpense(gymId: string, expense: Omit<Expense, 'id'>): Observable<Expense>;
  updateExpense(gymId: string, expense: Expense): Observable<void>;
  deleteExpense(gymId: string, id: string): Observable<void>;
  getInvoices(gymId: string): Observable<Invoice[]>;
  addInvoice(gymId: string, invoice: Omit<Invoice, 'id'>): Observable<Invoice>;
  updateInvoice(gymId: string, invoice: Invoice): Observable<void>;
  getCollections(gymId: string): Observable<Collection[]>;
  addCollection(gymId: string, collection: Omit<Collection, 'id'>): Observable<Collection>;
}

export interface IEmployeeRepository {
  getEmployees(gymId: string): Observable<Employee[]>;
  getEmployeeById(gymId: string, id: string): Observable<Employee | null>;
  addEmployee(gymId: string, employee: Omit<Employee, 'id'>): Observable<Employee>;
  updateEmployee(gymId: string, employee: Employee): Observable<void>;
  deleteEmployee(gymId: string, id: string): Observable<void>;

  // Attendance
  getAttendance(gymId: string): Observable<EmployeeAttendance[]>;
  markAttendance(gymId: string, record: Omit<EmployeeAttendance, 'id'>): Observable<EmployeeAttendance>;

  // Payroll
  getPayroll(gymId: string): Observable<EmployeePayroll[]>;
  addPayroll(gymId: string, payroll: Omit<EmployeePayroll, 'id'>): Observable<EmployeePayroll>;

  // Performance
  getPerformance(gymId: string): Observable<EmployeePerformance[]>;
  addPerformance(gymId: string, performance: Omit<EmployeePerformance, 'id'>): Observable<EmployeePerformance>;
}

export interface IPersonalTrainingRepository {
  getPTPlans(gymId: string): Observable<PTPlan[]>;
  addPTPlan(gymId: string, plan: Omit<PTPlan, 'id'>): Observable<PTPlan>;
  updatePTPlan(gymId: string, plan: PTPlan): Observable<void>;
  deletePTPlan(gymId: string, id: string): Observable<void>;

  getPTSessions(gymId: string): Observable<PTSession[]>;
  addPTSession(gymId: string, session: Omit<PTSession, 'id'>): Observable<PTSession>;
  updatePTSession(gymId: string, session: PTSession): Observable<void>;
  deletePTSession(gymId: string, id: string): Observable<void>;

  getTrainerAssignments(gymId: string): Observable<TrainerAssignment[]>;
  addTrainerAssignment(gymId: string, assignment: Omit<TrainerAssignment, 'id'>): Observable<TrainerAssignment>;

  getSessionHistory(gymId: string): Observable<SessionHistory[]>;
  addSessionHistory(gymId: string, history: Omit<SessionHistory, 'id'>): Observable<SessionHistory>;

  getTrainerRevenue(gymId: string): Observable<TrainerRevenue[]>;
  addTrainerRevenue(gymId: string, revenue: Omit<TrainerRevenue, 'id'>): Observable<TrainerRevenue>;

  getMemberPTPlans(gymId: string): Observable<MemberPTPlan[]>;
  getMemberPTPlanById(gymId: string, id: string): Observable<MemberPTPlan | null>;
  addMemberPTPlan(gymId: string, memberPlan: Omit<MemberPTPlan, 'id'>): Observable<MemberPTPlan>;
  updateMemberPTPlan(gymId: string, memberPlan: MemberPTPlan): Observable<void>;
}


// --- Angular InjectionTokens ---

export const AUTH_REPOSITORY_TOKEN = new InjectionToken<IAuthRepository>('AUTH_REPOSITORY_TOKEN');
export const GYM_REPOSITORY_TOKEN = new InjectionToken<IGymRepository>('GYM_REPOSITORY_TOKEN');
export const MEMBER_REPOSITORY_TOKEN = new InjectionToken<IMemberRepository>('MEMBER_REPOSITORY_TOKEN');
export const PAYMENT_REPOSITORY_TOKEN = new InjectionToken<IPaymentRepository>('PAYMENT_REPOSITORY_TOKEN');
export const PAYMENT_SETTINGS_REPOSITORY_TOKEN = new InjectionToken<IPaymentSettingsRepository>('PAYMENT_SETTINGS_REPOSITORY_TOKEN');
export const LEAD_REPOSITORY_TOKEN = new InjectionToken<ILeadRepository>('LEAD_REPOSITORY_TOKEN');
export const TRAINER_REPOSITORY_TOKEN = new InjectionToken<ITrainerRepository>('TRAINER_REPOSITORY_TOKEN');
export const ATTENDANCE_REPOSITORY_TOKEN = new InjectionToken<IAttendanceRepository>('ATTENDANCE_REPOSITORY_TOKEN');
export const MEMBERSHIP_PLAN_REPOSITORY_TOKEN = new InjectionToken<IMembershipPlanRepository>('MEMBERSHIP_PLAN_REPOSITORY_TOKEN');
export const ACTIVITY_LOG_REPOSITORY_TOKEN = new InjectionToken<IActivityLogRepository>('ACTIVITY_LOG_REPOSITORY_TOKEN');
export const WHATSAPP_REPOSITORY_TOKEN = new InjectionToken<IWhatsAppRepository>('WHATSAPP_REPOSITORY_TOKEN');
export const BODY_PROGRESS_REPOSITORY_TOKEN = new InjectionToken<IBodyProgressRepository>('BODY_PROGRESS_REPOSITORY_TOKEN');
export const FINANCE_REPOSITORY_TOKEN = new InjectionToken<IFinanceRepository>('FINANCE_REPOSITORY_TOKEN');
export const EMPLOYEE_REPOSITORY_TOKEN = new InjectionToken<IEmployeeRepository>('EMPLOYEE_REPOSITORY_TOKEN');
export const PERSONAL_TRAINING_REPOSITORY_TOKEN = new InjectionToken<IPersonalTrainingRepository>('PERSONAL_TRAINING_REPOSITORY_TOKEN');
export const AUDIT_LOG_REPOSITORY_TOKEN = new InjectionToken<IAuditLogRepository>('AUDIT_LOG_REPOSITORY_TOKEN');

// --- Enterprise Abstractions & Factories ---
export * from './storage-provider.interface';
export * from './job-scheduler.interface';
export * from './unit-of-work.interface';
export * from '../models/pagination.contracts';
export * from '../factories/provider-factories';


