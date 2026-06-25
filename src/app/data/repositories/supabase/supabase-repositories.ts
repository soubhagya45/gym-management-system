import { Injectable } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
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
import { PagedRequest, PagedResponse } from '../../../core/models/pagination.contracts';

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
  IUnitOfWork
} from '../../../core/interfaces/repository.interfaces';
import { AuditLog } from '../../../core/models/audit-log.model';
import { PaymentSettings } from '../../../core/models/payment-settings.model';
import { Expense, Invoice, Collection } from '../../../core/models/finance.entity';
import { Employee, EmployeeAttendance, EmployeePayroll, EmployeePerformance } from '../../../core/models/employee.entity';
import { IEmployeeRepository } from '../../../core/interfaces/repository.interfaces';


/**
 * FUTURE MIGRATION STUB FOR SUPABASE (POSTGRESQL WITH RLS)
 * To migrate, install `@supabase/supabase-js` and implement database transactions below.
 */

@Injectable({ providedIn: 'root' })
export class SupabaseAuthRepository implements IAuthRepository {
  login(email: string, password: string): Observable<UserProfile> {
    return throwError(() => new Error('Supabase integration is not enabled. Switch app-config.ts provider to MOCK.'));
  }
  loginWithRole(role: UserRole): Observable<UserProfile> {
    return throwError(() => new Error('Supabase integration is not enabled.'));
  }
  logout(): Observable<void> {
    return throwError(() => new Error('Supabase integration is not enabled.'));
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
    return throwError(() => new Error('Supabase integration is not enabled.'));
  }
  getUserProfile(_userId: string): Observable<UserProfile | null> {
    return throwError(() => new Error('Supabase integration is not enabled.'));
  }
  inviteStaff(_email: string, _name: string, _role: UserRole, _gymId: string): Observable<UserProfile> {
    return throwError(() => new Error('Supabase integration is not enabled.'));
  }
  changePassword(email: string, newPassword: string): Observable<void> {
    return throwError(() => new Error('Supabase integration is not enabled.'));
  }
  clearFirstLoginFlag(email: string): Observable<void> {
    return throwError(() => new Error('Supabase integration is not enabled.'));
  }
  getUsers(): Observable<UserProfile[]> {
    return throwError(() => new Error('Supabase integration is not enabled.'));
  }
  updateUserRole(userId: string, role: UserRole): Observable<void> {
    return throwError(() => new Error('Supabase integration is not enabled.'));
  }
  waitForAuthResolution(): Promise<boolean> {
    return Promise.reject(new Error('Supabase integration is not enabled.'));
  }
}

@Injectable({ providedIn: 'root' })
export class SupabaseGymRepository implements IGymRepository {
  getGyms(): Observable<Gym[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getGymById(gymId: string): Observable<Gym | null> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  createGym(gym: Omit<Gym, 'gymId' | 'createdAt'>): Observable<Gym> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  updateGym(gym: Gym): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseMemberRepository implements IMemberRepository {
  getMembers(gymId: string): Observable<Member[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getMembersPaged(gymId: string, req: PagedRequest): Observable<PagedResponse<Member>> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getMemberById(gymId: string, id: string): Observable<Member | null> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addMember(gymId: string, member: Omit<Member, 'id' | 'attendanceCount' | 'balance'>): Observable<Member> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  updateMember(gymId: string, member: Member): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteMember(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  registerMember(payload: LeadConversionPayload): Observable<LeadConversionResult> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabasePaymentRepository implements IPaymentRepository {
  getPayments(gymId: string): Observable<Payment[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getPaymentsPaged(gymId: string, req: PagedRequest): Observable<PagedResponse<Payment>> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addPayment(gymId: string, payment: Omit<Payment, 'id'>): Observable<Payment> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  confirmPayment(gymId: string, paymentId: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deletePayment(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabasePaymentSettingsRepository implements IPaymentSettingsRepository {
  getSettings(gymId: string): Observable<PaymentSettings[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getSettingsByProvider(gymId: string, provider: string): Observable<PaymentSettings | null> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  saveSettings(gymId: string, settings: PaymentSettings): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseLeadRepository implements ILeadRepository {
  getLeads(gymId: string): Observable<Lead[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getLeadsPaged(gymId: string, req: PagedRequest): Observable<PagedResponse<Lead>> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addLead(gymId: string, lead: Omit<Lead, 'id'>): Observable<Lead> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  updateLead(gymId: string, lead: Lead): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteLead(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  convertLeadToMember(_payload: LeadConversionPayload): Observable<LeadConversionResult> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseTrainerRepository implements ITrainerRepository {
  getTrainers(gymId: string): Observable<Trainer[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addTrainer(gymId: string, trainer: Omit<Trainer, 'id' | 'membersCount'>): Observable<Trainer> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  updateTrainer(gymId: string, trainer: Trainer): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteTrainer(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseAttendanceRepository implements IAttendanceRepository {
  getAttendance(gymId: string): Observable<Attendance[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  markAttendance(gymId: string, memberId: string, status: 'present' | 'absent', timeIn: string): Observable<Attendance> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getDevices(gymId: string): Observable<DeviceConfiguration[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  saveDevice(gymId: string, device: DeviceConfiguration): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteDevice(gymId: string, deviceId: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getMappings(gymId: string): Observable<AttendanceMapping[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  saveMapping(gymId: string, mapping: AttendanceMapping): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteMapping(gymId: string, mappingId: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  updateDeviceSyncTime(gymId: string, deviceId: string, syncTime: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseMembershipPlanRepository implements IMembershipPlanRepository {
  getPlans(gymId: string): Observable<MembershipPlan[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addPlan(gymId: string, plan: Omit<MembershipPlan, 'id' | 'activeMembersCount'>): Observable<MembershipPlan> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  updatePlan(gymId: string, plan: MembershipPlan): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deletePlan(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseActivityLogRepository implements IActivityLogRepository {
  getLogs(gymId: string): Observable<ActivityLog[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addLog(gymId: string, text: string, type: 'join' | 'payment' | 'attendance' | 'plan-change'): Observable<ActivityLog> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseWhatsAppRepository implements IWhatsAppRepository {
  getTemplates(gymId: string): Observable<WhatsAppTemplate[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addTemplate(gymId: string, template: Omit<WhatsAppTemplate, 'id'>): Observable<WhatsAppTemplate> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  updateTemplate(gymId: string, template: WhatsAppTemplate): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteTemplate(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getReminders(gymId: string): Observable<WhatsAppReminder[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addReminder(gymId: string, reminder: Omit<WhatsAppReminder, 'id'>): Observable<WhatsAppReminder> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  updateReminder(gymId: string, reminder: WhatsAppReminder): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteReminder(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}


@Injectable({ providedIn: 'root' })
export class SupabaseBodyProgressRepository implements IBodyProgressRepository {
  getEntries(gymId: string, memberId: string): Observable<BodyProgressEntry[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getAllEntries(gymId: string): Observable<BodyProgressEntry[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addEntry(gymId: string, entry: Omit<BodyProgressEntry, 'id'>): Observable<BodyProgressEntry> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteEntry(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseFinanceRepository implements IFinanceRepository {
  getExpenses(gymId: string): Observable<Expense[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addExpense(gymId: string, expense: Omit<Expense, 'id'>): Observable<Expense> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  updateExpense(gymId: string, expense: Expense): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteExpense(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getInvoices(gymId: string): Observable<Invoice[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addInvoice(gymId: string, invoice: Omit<Invoice, 'id'>): Observable<Invoice> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  updateInvoice(gymId: string, invoice: Invoice): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteInvoice(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getCollections(gymId: string): Observable<Collection[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addCollection(gymId: string, collection: Omit<Collection, 'id'>): Observable<Collection> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteCollection(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseEmployeeRepository implements IEmployeeRepository {
  getEmployees(gymId: string): Observable<Employee[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getEmployeeById(gymId: string, id: string): Observable<Employee | null> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addEmployee(gymId: string, employee: Omit<Employee, 'id'>): Observable<Employee> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  updateEmployee(gymId: string, employee: Employee): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteEmployee(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getAttendance(gymId: string): Observable<EmployeeAttendance[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  markAttendance(gymId: string, record: Omit<EmployeeAttendance, 'id'>): Observable<EmployeeAttendance> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getPayroll(gymId: string): Observable<EmployeePayroll[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addPayroll(gymId: string, payroll: Omit<EmployeePayroll, 'id'>): Observable<EmployeePayroll> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getPerformance(gymId: string): Observable<EmployeePerformance[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addPerformance(gymId: string, performance: Omit<EmployeePerformance, 'id'>): Observable<EmployeePerformance> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseAuditLogRepository implements IAuditLogRepository {
  getAuditLogs(gymId: string): Observable<AuditLog[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getAuditLogsPaged(gymId: string, req: PagedRequest): Observable<PagedResponse<AuditLog>> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addAuditLog(gymId: string, log: Omit<AuditLog, 'id'>): Observable<AuditLog> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseProductRepository implements IProductRepository {
  getProducts(gymId: string): Observable<Product[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getProductById(gymId: string, id: string): Observable<Product | null> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addProduct(gymId: string, product: Omit<Product, 'id'>): Observable<Product> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  updateProduct(gymId: string, product: Product): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteProduct(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseImportProfileRepository implements IImportProfileRepository {
  getProfiles(gymId: string): Observable<ImportProfile[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getProfileById(gymId: string, id: string): Observable<ImportProfile | null> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  saveProfile(gymId: string, profile: Omit<ImportProfile, 'id'> | ImportProfile): Observable<ImportProfile> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  deleteProfile(gymId: string, id: string): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseImportHistoryRepository implements IImportHistoryRepository {
  getHistory(gymId: string): Observable<ImportHistory[]> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getHistoryPaged(gymId: string, req: PagedRequest): Observable<PagedResponse<ImportHistory>> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  getHistoryById(gymId: string, id: string): Observable<ImportHistory | null> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  addHistory(gymId: string, history: Omit<ImportHistory, 'id'>): Observable<ImportHistory> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  updateHistory(gymId: string, history: ImportHistory): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
}

@Injectable({ providedIn: 'root' })
export class SupabaseUnitOfWork implements IUnitOfWork {
  begin(): void {}
  commit(): Observable<void> { return throwError(() => new Error('Supabase integration is not enabled.')); }
  rollback(): Observable<void> {
    // Supabase SDK is not implemented — log a warning so this silent no-op is visible in monitoring.
    console.warn('[SupabaseUnitOfWork] rollback() called but Supabase integration is not enabled. No data was cleaned up.');
    return of(undefined);
  }
  failure(error: Error): void {
    console.error('[SupabaseUnitOfWork] failure() called:', error.message);
    this.rollback().subscribe();
  }
  registerAddition(collectionName: string, id: string): void {}
}


