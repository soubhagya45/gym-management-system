import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { UserRole } from '../../../core/enums/roles.enum';
import { UserProfile } from '../../../core/models/user.model';
import { Gym } from '../../../core/models/gym.entity';
import { Member } from '../../../core/models/member.entity';
import { Payment } from '../../../core/models/payment.entity';
import { Lead, LeadConversionPayload, LeadConversionResult } from '../../../core/models/lead.entity';
import { Trainer } from '../../../core/models/trainer.entity';
import { Attendance } from '../../../core/models/attendance.entity';
import { DeviceConfiguration } from '../../../core/models/device-configuration.model';
import { AttendanceMapping } from '../../../core/models/attendance-mapping.model';
import { MembershipPlan } from '../../../core/models/membership-plan.entity';
import { ActivityLog } from '../../../core/models/activity-log.entity';
import { WhatsAppTemplate } from '../../../core/models/whatsapp-template.entity';
import { WhatsAppReminder } from '../../../core/models/whatsapp-reminder.entity';
import { BodyProgressEntry } from '../../../core/models/body-progress.entity';
import { Product } from '../../../core/models/product.entity';
import { ImportProfile } from '../../../core/models/import-profile.entity';
import { ImportHistory } from '../../../core/models/import-history.entity';

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
  IPaymentSettingsRepository,
  IProductRepository,
  IImportProfileRepository,
  IImportHistoryRepository,
  IPersonalTrainingRepository,
  IUnitOfWork
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

  getUsers(): Observable<UserProfile[]> {
    return this.get<UserProfile[]>('/users');
  }

  updateUserRole(userId: string, role: UserRole): Observable<void> {
    return this.post<void>(`/users/${userId}/role`, { role });
  }

  waitForAuthResolution(): Promise<boolean> {
    return Promise.resolve(true);
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

  getDevices(gymId: string): Observable<DeviceConfiguration[]> {
    return this.get<DeviceConfiguration[]>('/devices', { params: new HttpParams().set('gymId', gymId) });
  }

  saveDevice(gymId: string, device: DeviceConfiguration): Observable<void> {
    return this.post<void>('/devices', device, { params: new HttpParams().set('gymId', gymId) });
  }

  deleteDevice(gymId: string, deviceId: string): Observable<void> {
    return this.delete<void>(`/devices/${deviceId}`, { params: new HttpParams().set('gymId', gymId) });
  }

  getMappings(gymId: string): Observable<AttendanceMapping[]> {
    return this.get<AttendanceMapping[]>('/mappings', { params: new HttpParams().set('gymId', gymId) });
  }

  saveMapping(gymId: string, mapping: AttendanceMapping): Observable<void> {
    return this.post<void>('/mappings', mapping, { params: new HttpParams().set('gymId', gymId) });
  }

  deleteMapping(gymId: string, mappingId: string): Observable<void> {
    return this.delete<void>(`/mappings/${mappingId}`, { params: new HttpParams().set('gymId', gymId) });
  }

  updateDeviceSyncTime(gymId: string, deviceId: string, syncTime: string): Observable<void> {
    return this.post<void>(`/devices/${deviceId}/sync`, { syncTime }, { params: new HttpParams().set('gymId', gymId) });
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

  deleteInvoice(gymId: string, id: string): Observable<void> {
    return this.delete<void>(`/invoices/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }

  getCollections(gymId: string): Observable<Collection[]> {
    return this.get<Collection[]>('/collections', { params: new HttpParams().set('gymId', gymId) });
  }

  addCollection(gymId: string, collection: Omit<Collection, 'id'>): Observable<Collection> {
    return this.post<Collection>('/collections', collection, { params: new HttpParams().set('gymId', gymId) });
  }

  deleteCollection(gymId: string, id: string): Observable<void> {
    return this.delete<void>(`/collections/${id}`, { params: new HttpParams().set('gymId', gymId) });
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

@Injectable({ providedIn: 'root' })
export class ApiProductRepository extends BaseApiRepository implements IProductRepository {
  protected get endpoint(): string { return '/products'; }
  getProducts(gymId: string): Observable<Product[]> { return this.get<Product[]>('', { params: new HttpParams().set('gymId', gymId) }); }
  getProductById(gymId: string, id: string): Observable<Product | null> { return this.get<Product>(`/${id}`, { params: new HttpParams().set('gymId', gymId) }); }
  addProduct(gymId: string, product: Omit<Product, 'id'>): Observable<Product> { return this.post<Product>('', product, { params: new HttpParams().set('gymId', gymId) }); }
  updateProduct(gymId: string, product: Product): Observable<void> { return this.put<void>(`/${product.id}`, product, { params: new HttpParams().set('gymId', gymId) }); }
  deleteProduct(gymId: string, id: string): Observable<void> { return this.delete<void>(`/${id}`, { params: new HttpParams().set('gymId', gymId) }); }
}

@Injectable({ providedIn: 'root' })
export class ApiImportProfileRepository extends BaseApiRepository implements IImportProfileRepository {
  protected get endpoint(): string { return '/import-profiles'; }
  getProfiles(gymId: string): Observable<ImportProfile[]> { return this.get<ImportProfile[]>('', { params: new HttpParams().set('gymId', gymId) }); }
  getProfileById(gymId: string, id: string): Observable<ImportProfile | null> { return this.get<ImportProfile>(`/${id}`, { params: new HttpParams().set('gymId', gymId) }); }
  saveProfile(gymId: string, profile: Omit<ImportProfile, 'id'> | ImportProfile): Observable<ImportProfile> { return this.post<ImportProfile>('', profile, { params: new HttpParams().set('gymId', gymId) }); }
  deleteProfile(gymId: string, id: string): Observable<void> { return this.delete<void>(`/${id}`, { params: new HttpParams().set('gymId', gymId) }); }
}

@Injectable({ providedIn: 'root' })
export class ApiImportHistoryRepository extends BaseApiRepository implements IImportHistoryRepository {
  protected get endpoint(): string { return '/import-history'; }
  getHistory(gymId: string): Observable<ImportHistory[]> { return this.get<ImportHistory[]>('', { params: new HttpParams().set('gymId', gymId) }); }
  getHistoryById(gymId: string, id: string): Observable<ImportHistory | null> { return this.get<ImportHistory>(`/${id}`, { params: new HttpParams().set('gymId', gymId) }); }
  addHistory(gymId: string, history: Omit<ImportHistory, 'id'>): Observable<ImportHistory> { return this.post<ImportHistory>('', history, { params: new HttpParams().set('gymId', gymId) }); }
  updateHistory(gymId: string, history: ImportHistory): Observable<void> { return this.put<void>(`/${history.id}`, history, { params: new HttpParams().set('gymId', gymId) }); }
}

@Injectable({ providedIn: 'root' })
export class ApiUnitOfWork implements IUnitOfWork {
  begin(): void {}
  commit(): Observable<void> { return of(undefined); }
  rollback(): void {
    // API provider — transactional rollback is responsibility of the backend.
    // Log warning so this is visible in monitoring during debugging.
    console.warn('[ApiUnitOfWork] rollback() called. The backend API must handle transaction cleanup.');
  }
  failure(error: Error): void {
    console.error('[ApiUnitOfWork] failure() called:', error.message);
    this.rollback();
  }
  registerAddition(collectionName: string, id: string): void {}
}

/**
 * ApiPersonalTrainingRepository
 * REST API implementation for Personal Training entities.
 * All PT operations are tenant-scoped by gymId query parameter.
 */
import { PTPlan } from '../../../core/models/pt-plan.entity';
import { PTSession } from '../../../core/models/pt-session.entity';
import { TrainerAssignment } from '../../../core/models/trainer-assignment.entity';
import { SessionHistory } from '../../../core/models/session-history.entity';
import { TrainerRevenue } from '../../../core/models/trainer-revenue.entity';
import { MemberPTPlan } from '../../../core/models/member-pt-plan.entity';

@Injectable({ providedIn: 'root' })
export class ApiPersonalTrainingRepository extends BaseApiRepository implements IPersonalTrainingRepository {
  protected get endpoint(): string { return '/personal-training'; }

  constructor(http: HttpClient, configService: AppConfigService) {
    super(http, configService);
  }

  getPTPlans(gymId: string): Observable<PTPlan[]> {
    return this.get<PTPlan[]>('/plans', { params: new HttpParams().set('gymId', gymId) });
  }

  addPTPlan(gymId: string, plan: Omit<PTPlan, 'id'>): Observable<PTPlan> {
    return this.post<PTPlan>('/plans', plan, { params: new HttpParams().set('gymId', gymId) });
  }

  updatePTPlan(gymId: string, plan: PTPlan): Observable<void> {
    return this.put<void>(`/plans/${plan.id}`, plan, { params: new HttpParams().set('gymId', gymId) });
  }

  deletePTPlan(gymId: string, id: string): Observable<void> {
    return this.delete<void>(`/plans/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }

  getPTSessions(gymId: string): Observable<PTSession[]> {
    return this.get<PTSession[]>('/sessions', { params: new HttpParams().set('gymId', gymId) });
  }

  addPTSession(gymId: string, session: Omit<PTSession, 'id'>): Observable<PTSession> {
    return this.post<PTSession>('/sessions', session, { params: new HttpParams().set('gymId', gymId) });
  }

  updatePTSession(gymId: string, session: PTSession): Observable<void> {
    return this.put<void>(`/sessions/${session.id}`, session, { params: new HttpParams().set('gymId', gymId) });
  }

  deletePTSession(gymId: string, id: string): Observable<void> {
    return this.delete<void>(`/sessions/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }

  getTrainerAssignments(gymId: string): Observable<TrainerAssignment[]> {
    return this.get<TrainerAssignment[]>('/trainer-assignments', { params: new HttpParams().set('gymId', gymId) });
  }

  addTrainerAssignment(gymId: string, assignment: Omit<TrainerAssignment, 'id'>): Observable<TrainerAssignment> {
    return this.post<TrainerAssignment>('/trainer-assignments', assignment, { params: new HttpParams().set('gymId', gymId) });
  }

  getSessionHistory(gymId: string): Observable<SessionHistory[]> {
    return this.get<SessionHistory[]>('/session-history', { params: new HttpParams().set('gymId', gymId) });
  }

  addSessionHistory(gymId: string, history: Omit<SessionHistory, 'id'>): Observable<SessionHistory> {
    return this.post<SessionHistory>('/session-history', history, { params: new HttpParams().set('gymId', gymId) });
  }

  getTrainerRevenue(gymId: string): Observable<TrainerRevenue[]> {
    return this.get<TrainerRevenue[]>('/trainer-revenue', { params: new HttpParams().set('gymId', gymId) });
  }

  addTrainerRevenue(gymId: string, revenue: Omit<TrainerRevenue, 'id'>): Observable<TrainerRevenue> {
    return this.post<TrainerRevenue>('/trainer-revenue', revenue, { params: new HttpParams().set('gymId', gymId) });
  }

  getMemberPTPlans(gymId: string): Observable<MemberPTPlan[]> {
    return this.get<MemberPTPlan[]>('/member-pt-plans', { params: new HttpParams().set('gymId', gymId) });
  }

  getMemberPTPlanById(gymId: string, id: string): Observable<MemberPTPlan | null> {
    return this.get<MemberPTPlan>(`/member-pt-plans/${id}`, { params: new HttpParams().set('gymId', gymId) });
  }

  addMemberPTPlan(gymId: string, memberPlan: Omit<MemberPTPlan, 'id'>): Observable<MemberPTPlan> {
    return this.post<MemberPTPlan>('/member-pt-plans', memberPlan, { params: new HttpParams().set('gymId', gymId) });
  }

  updateMemberPTPlan(gymId: string, memberPlan: MemberPTPlan): Observable<void> {
    return this.put<void>(`/member-pt-plans/${memberPlan.id}`, memberPlan, { params: new HttpParams().set('gymId', gymId) });
  }
}

