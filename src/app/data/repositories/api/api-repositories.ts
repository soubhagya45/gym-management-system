import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserRole } from '../../../core/enums/roles.enum';
import { UserProfile } from '../../../core/models/user.model';
import { Gym } from '../../../core/models/gym.entity';
import { Member } from '../../../core/models/member.entity';
import { Payment } from '../../../core/models/payment.entity';
import { Lead, LeadConversionPayload, LeadConversionResult } from '../../../core/models/lead.entity';
import { Trainer } from '../../../core/models/trainer.entity';
import { Attendance } from '../../../core/models/attendance.entity';
import { MembershipPlan } from '../../../core/models/membership-plan.entity';
import { ActivityLog } from '../../../core/models/activity-log.entity';
import { WhatsAppTemplate } from '../../../core/models/whatsapp-template.entity';
import { WhatsAppReminder } from '../../../core/models/whatsapp-reminder.entity';
import { BodyProgressEntry } from '../../../core/models/body-progress.entity';

import {
  IAuthRepository,
  IGymRepository,
  IMemberRepository,
  IPaymentRepository,
  ILeadRepository,
  ITrainerRepository,
  IAttendanceRepository,
  IMembershipPlanRepository,
  IActivityLogRepository,
  IWhatsAppRepository,
  IBodyProgressRepository,
  IFinanceRepository,
  IAuditLogRepository,
  IPaymentSettingsRepository
} from '../../../core/interfaces/repository.interfaces';
import { AuditLog } from '../../../core/models/audit-log.model';
import { PaymentSettings } from '../../../core/models/payment-settings.model';
import { Expense, Invoice, Collection } from '../../../core/models/finance.entity';
import { Employee, EmployeeAttendance, EmployeePayroll, EmployeePerformance } from '../../../core/models/employee.entity';
import { IEmployeeRepository } from '../../../core/interfaces/repository.interfaces';
import { AppConfigService } from '../../../core/config/app-config';
import { BaseApiRepository } from '../../../core/repositories/base-api.repository';

@Injectable({ providedIn: 'root' })
export class ApiAuthRepository extends BaseApiRepository implements IAuthRepository {
  protected get endpoint(): string {
    return '/auth';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  login(email: string, password: string): Observable<UserProfile> {
    return this.post<UserProfile>('/login', { email, password });
  }

  loginWithRole(role: UserRole): Observable<UserProfile> {
    return this.post<UserProfile>('/login-role', { role });
  }

  logout(): Observable<void> {
    return this.post<void>('/logout', {});
  }

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
  ): Observable<UserProfile> {
    return this.post<UserProfile>('/register', {
      gymName,
      ownerName,
      email,
      phone,
      password,
      address,
      gstNumber,
      gymType,
      openingTime,
      closingTime
    });
  }

  getUserProfile(userId: string): Observable<UserProfile | null> {
    return this.get<UserProfile | null>(`/profile/${userId}`);
  }

  inviteStaff(email: string, name: string, role: UserRole, gymId: string): Observable<UserProfile> {
    return this.post<UserProfile>('/invite-staff', { email, name, role, gymId });
  }

  changePassword(email: string, newPassword: string): Observable<void> {
    return this.post<void>('/change-password', { email, newPassword });
  }

  clearFirstLoginFlag(email: string): Observable<void> {
    return this.post<void>('/clear-first-login', { email });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiGymRepository extends BaseApiRepository implements IGymRepository {
  protected get endpoint(): string {
    return '/gyms';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getGyms(): Observable<Gym[]> {
    return this.get<Gym[]>('');
  }

  getGymById(gymId: string): Observable<Gym | null> {
    return this.get<Gym | null>(`/${gymId}`);
  }

  createGym(gym: Omit<Gym, 'gymId' | 'createdAt'>): Observable<Gym> {
    return this.post<Gym>('', gym);
  }

  updateGym(gym: Gym): Observable<void> {
    return this.put<void>(`/${gym.gymId}`, gym);
  }
}

@Injectable({ providedIn: 'root' })
export class ApiMemberRepository extends BaseApiRepository implements IMemberRepository {
  protected get endpoint(): string {
    return '/members';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getMembers(gymId: string): Observable<Member[]> {
    return this.get<Member[]>('', { params: new HttpParams().set('gymId', gymId) });
  }

  getMemberById(gymId: string, id: string): Observable<Member | null> {
    return this.get<Member | null>(`/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }

  addMember(gymId: string, member: Omit<Member, 'id' | 'attendanceCount' | 'balance'>): Observable<Member> {
    return this.post<Member>('', member, { params: new HttpParams().set('gymId', gymId) });
  }

  updateMember(gymId: string, member: Member): Observable<void> {
    return this.put<void>(`/${member.id}`, member, { params: new HttpParams().set('gymId', gymId) });
  }

  deleteMember(gymId: string, id: string): Observable<void> {
    return this.delete<void>(`/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }

  registerMember(payload: LeadConversionPayload): Observable<LeadConversionResult> {
    return this.post<LeadConversionResult>('/register', payload);
  }
}

@Injectable({ providedIn: 'root' })
export class ApiPaymentRepository extends BaseApiRepository implements IPaymentRepository {
  protected get endpoint(): string {
    return '/payments';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getPayments(gymId: string): Observable<Payment[]> {
    return this.get<Payment[]>('', { params: new HttpParams().set('gymId', gymId) });
  }

  addPayment(gymId: string, payment: Omit<Payment, 'id'>): Observable<Payment> {
    return this.post<Payment>('', payment, { params: new HttpParams().set('gymId', gymId) });
  }

  confirmPayment(gymId: string, paymentId: string): Observable<void> {
    return this.post<void>(`/${paymentId}/confirm`, {}, { params: new HttpParams().set('gymId', gymId) });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiPaymentSettingsRepository extends BaseApiRepository implements IPaymentSettingsRepository {
  protected get endpoint(): string {
    return '/payment-settings';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getSettings(gymId: string): Observable<PaymentSettings[]> {
    return this.get<PaymentSettings[]>('', { params: new HttpParams().set('gymId', gymId) });
  }

  getSettingsByProvider(gymId: string, provider: string): Observable<PaymentSettings | null> {
    return this.get<PaymentSettings | null>(`/provider/${provider}`, { params: new HttpParams().set('gymId', gymId) });
  }

  saveSettings(gymId: string, settings: PaymentSettings): Observable<void> {
    return this.post<void>('/save', settings, { params: new HttpParams().set('gymId', gymId) });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiLeadRepository extends BaseApiRepository implements ILeadRepository {
  protected get endpoint(): string {
    return '/leads';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getLeads(gymId: string): Observable<Lead[]> {
    return this.get<Lead[]>('', { params: new HttpParams().set('gymId', gymId) });
  }

  addLead(gymId: string, lead: Omit<Lead, 'id'>): Observable<Lead> {
    return this.post<Lead>('', lead, { params: new HttpParams().set('gymId', gymId) });
  }

  updateLead(gymId: string, lead: Lead): Observable<void> {
    return this.put<void>(`/${lead.id}`, lead, { params: new HttpParams().set('gymId', gymId) });
  }

  deleteLead(gymId: string, id: string): Observable<void> {
    return this.delete<void>(`/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }

  convertLeadToMember(payload: LeadConversionPayload): Observable<LeadConversionResult> {
    return this.post<LeadConversionResult>('/convert', payload, { params: new HttpParams().set('gymId', payload.gymId) });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiTrainerRepository extends BaseApiRepository implements ITrainerRepository {
  protected get endpoint(): string {
    return '/trainers';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getTrainers(gymId: string): Observable<Trainer[]> {
    return this.get<Trainer[]>('', { params: new HttpParams().set('gymId', gymId) });
  }

  addTrainer(gymId: string, trainer: Omit<Trainer, 'id' | 'membersCount'>): Observable<Trainer> {
    return this.post<Trainer>('', trainer, { params: new HttpParams().set('gymId', gymId) });
  }

  updateTrainer(gymId: string, trainer: Trainer): Observable<void> {
    return this.put<void>(`/${trainer.id}`, trainer, { params: new HttpParams().set('gymId', gymId) });
  }

  deleteTrainer(gymId: string, id: string): Observable<void> {
    return this.delete<void>(`/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiAttendanceRepository extends BaseApiRepository implements IAttendanceRepository {
  protected get endpoint(): string {
    return '/attendance';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getAttendance(gymId: string): Observable<Attendance[]> {
    return this.get<Attendance[]>('', { params: new HttpParams().set('gymId', gymId) });
  }

  markAttendance(gymId: string, memberId: string, status: 'present' | 'absent', timeIn: string): Observable<Attendance> {
    return this.post<Attendance>('/mark', { memberId, status, timeIn }, { params: new HttpParams().set('gymId', gymId) });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiMembershipPlanRepository extends BaseApiRepository implements IMembershipPlanRepository {
  protected get endpoint(): string {
    return '/membership-plans';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getPlans(gymId: string): Observable<MembershipPlan[]> {
    return this.get<MembershipPlan[]>('', { params: new HttpParams().set('gymId', gymId) });
  }

  addPlan(gymId: string, plan: Omit<MembershipPlan, 'id' | 'activeMembersCount'>): Observable<MembershipPlan> {
    return this.post<MembershipPlan>('', plan, { params: new HttpParams().set('gymId', gymId) });
  }

  updatePlan(gymId: string, plan: MembershipPlan): Observable<void> {
    return this.put<void>(`/${plan.id}`, plan, { params: new HttpParams().set('gymId', gymId) });
  }

  deletePlan(gymId: string, id: string): Observable<void> {
    return this.delete<void>(`/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiActivityLogRepository extends BaseApiRepository implements IActivityLogRepository {
  protected get endpoint(): string {
    return '/activity-logs';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getLogs(gymId: string): Observable<ActivityLog[]> {
    return this.get<ActivityLog[]>('', { params: new HttpParams().set('gymId', gymId) });
  }

  addLog(gymId: string, text: string, type: 'join' | 'payment' | 'attendance' | 'plan-change'): Observable<ActivityLog> {
    return this.post<ActivityLog>('', { text, type }, { params: new HttpParams().set('gymId', gymId) });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiWhatsAppRepository extends BaseApiRepository implements IWhatsAppRepository {
  protected get endpoint(): string {
    return '/whatsapp';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getTemplates(gymId: string): Observable<WhatsAppTemplate[]> {
    return this.get<WhatsAppTemplate[]>('/templates', { params: new HttpParams().set('gymId', gymId) });
  }

  addTemplate(gymId: string, template: Omit<WhatsAppTemplate, 'id'>): Observable<WhatsAppTemplate> {
    return this.post<WhatsAppTemplate>('/templates', template, { params: new HttpParams().set('gymId', gymId) });
  }

  updateTemplate(gymId: string, template: WhatsAppTemplate): Observable<void> {
    return this.put<void>(`/templates/${template.id}`, template, { params: new HttpParams().set('gymId', gymId) });
  }

  deleteTemplate(gymId: string, id: string): Observable<void> {
    return this.delete<void>(`/templates/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }

  getReminders(gymId: string): Observable<WhatsAppReminder[]> {
    return this.get<WhatsAppReminder[]>('/reminders', { params: new HttpParams().set('gymId', gymId) });
  }

  addReminder(gymId: string, reminder: Omit<WhatsAppReminder, 'id'>): Observable<WhatsAppReminder> {
    return this.post<WhatsAppReminder>('/reminders', reminder, { params: new HttpParams().set('gymId', gymId) });
  }

  updateReminder(gymId: string, reminder: WhatsAppReminder): Observable<void> {
    return this.put<void>(`/reminders/${reminder.id}`, reminder, { params: new HttpParams().set('gymId', gymId) });
  }

  deleteReminder(gymId: string, id: string): Observable<void> {
    return this.delete<void>(`/reminders/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }

}

@Injectable({ providedIn: 'root' })
export class ApiBodyProgressRepository extends BaseApiRepository implements IBodyProgressRepository {
  protected get endpoint(): string {
    return '/body-progress';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getEntries(gymId: string, memberId: string): Observable<BodyProgressEntry[]> {
    return this.get<BodyProgressEntry[]>(`/member/${memberId}`, { params: new HttpParams().set('gymId', gymId) });
  }

  getAllEntries(gymId: string): Observable<BodyProgressEntry[]> {
    return this.get<BodyProgressEntry[]>('', { params: new HttpParams().set('gymId', gymId) });
  }

  addEntry(gymId: string, entry: Omit<BodyProgressEntry, 'id'>): Observable<BodyProgressEntry> {
    return this.post<BodyProgressEntry>('', entry, { params: new HttpParams().set('gymId', gymId) });
  }

  deleteEntry(gymId: string, id: string): Observable<void> {
    return this.delete<void>(`/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiFinanceRepository extends BaseApiRepository implements IFinanceRepository {
  protected get endpoint(): string {
    return '/finance';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getExpenses(gymId: string): Observable<Expense[]> {
    return this.get<Expense[]>('/expenses', { params: new HttpParams().set('gymId', gymId) });
  }

  addExpense(gymId: string, expense: Omit<Expense, 'id'>): Observable<Expense> {
    return this.post<Expense>('/expenses', expense, { params: new HttpParams().set('gymId', gymId) });
  }

  updateExpense(gymId: string, expense: Expense): Observable<void> {
    return this.put<void>(`/expenses/${expense.id}`, expense, { params: new HttpParams().set('gymId', gymId) });
  }

  deleteExpense(gymId: string, id: string): Observable<void> {
    return this.delete<void>(`/expenses/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }

  getInvoices(gymId: string): Observable<Invoice[]> {
    return this.get<Invoice[]>('/invoices', { params: new HttpParams().set('gymId', gymId) });
  }

  addInvoice(gymId: string, invoice: Omit<Invoice, 'id'>): Observable<Invoice> {
    return this.post<Invoice>('/invoices', invoice, { params: new HttpParams().set('gymId', gymId) });
  }

  updateInvoice(gymId: string, invoice: Invoice): Observable<void> {
    return this.put<void>(`/invoices/${invoice.id}`, invoice, { params: new HttpParams().set('gymId', gymId) });
  }

  getCollections(gymId: string): Observable<Collection[]> {
    return this.get<Collection[]>('/collections', { params: new HttpParams().set('gymId', gymId) });
  }

  addCollection(gymId: string, collection: Omit<Collection, 'id'>): Observable<Collection> {
    return this.post<Collection>('/collections', collection, { params: new HttpParams().set('gymId', gymId) });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiEmployeeRepository extends BaseApiRepository implements IEmployeeRepository {
  protected get endpoint(): string {
    return '/employees';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getEmployees(gymId: string): Observable<Employee[]> {
    return this.get<Employee[]>('', { params: new HttpParams().set('gymId', gymId) });
  }

  getEmployeeById(gymId: string, id: string): Observable<Employee | null> {
    return this.get<Employee | null>(`/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }

  addEmployee(gymId: string, employee: Omit<Employee, 'id'>): Observable<Employee> {
    return this.post<Employee>('', employee, { params: new HttpParams().set('gymId', gymId) });
  }

  updateEmployee(gymId: string, employee: Employee): Observable<void> {
    return this.put<void>(`/${employee.id}`, employee, { params: new HttpParams().set('gymId', gymId) });
  }

  deleteEmployee(gymId: string, id: string): Observable<void> {
    return this.delete<void>(`/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }

  getAttendance(gymId: string): Observable<EmployeeAttendance[]> {
    return this.get<EmployeeAttendance[]>('/attendance', { params: new HttpParams().set('gymId', gymId) });
  }

  markAttendance(gymId: string, record: Omit<EmployeeAttendance, 'id'>): Observable<EmployeeAttendance> {
    return this.post<EmployeeAttendance>('/attendance', record, { params: new HttpParams().set('gymId', gymId) });
  }

  getPayroll(gymId: string): Observable<EmployeePayroll[]> {
    return this.get<EmployeePayroll[]>('/payroll', { params: new HttpParams().set('gymId', gymId) });
  }

  addPayroll(gymId: string, payroll: Omit<EmployeePayroll, 'id'>): Observable<EmployeePayroll> {
    return this.post<EmployeePayroll>('/payroll', payroll, { params: new HttpParams().set('gymId', gymId) });
  }

  getPerformance(gymId: string): Observable<EmployeePerformance[]> {
    return this.get<EmployeePerformance[]>('/performance', { params: new HttpParams().set('gymId', gymId) });
  }

  addPerformance(gymId: string, performance: Omit<EmployeePerformance, 'id'>): Observable<EmployeePerformance> {
    return this.post<EmployeePerformance>('/performance', performance, { params: new HttpParams().set('gymId', gymId) });
  }
}

@Injectable({ providedIn: 'root' })
export class ApiAuditLogRepository extends BaseApiRepository implements IAuditLogRepository {
  protected get endpoint(): string {
    return '/audit-logs';
  }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getAuditLogs(gymId: string): Observable<AuditLog[]> {
    return this.get<AuditLog[]>('', { params: new HttpParams().set('gymId', gymId) });
  }

  addAuditLog(gymId: string, log: Omit<AuditLog, 'id'>): Observable<AuditLog> {
    return this.post<AuditLog>('', log, { params: new HttpParams().set('gymId', gymId) });
  }
}

