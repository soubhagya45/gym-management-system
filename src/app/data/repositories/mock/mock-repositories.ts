import { Injectable, Injector } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';
import { UserRole } from '../../../core/enums/roles.enum';
import { IOnboardingRepository } from '../../../core/interfaces/onboarding-repository.interface';
import { OnboardingData } from '../../../core/models/onboarding.model';
import { UserContextService } from '../../../core/services/user-context.service';

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
  IEmployeeRepository,
  IPersonalTrainingRepository,
  IAuditLogRepository,
  IPaymentSettingsRepository
} from '../../../core/interfaces/repository.interfaces';
import { AuditLog } from '../../../core/models/audit-log.model';
import { PaymentSettings } from '../../../core/models/payment-settings.model';
import { BillingCalculationService } from '../../../services/billing-calculation.service';
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
import { SubscriptionPlan } from '../../../core/enums/subscription-plans.enum';
import { WhatsAppTemplate } from '../../../core/models/whatsapp-template.entity';
import { WhatsAppReminder } from '../../../core/models/whatsapp-reminder.entity';
import { BodyProgressEntry } from '../../../core/models/body-progress.entity';
import { Expense, Invoice, Collection } from '../../../core/models/finance.entity';
import { Employee, EmployeeAttendance, EmployeePayroll, EmployeePerformance } from '../../../core/models/employee.entity';
import { PTPlan } from '../../../core/models/pt-plan.entity';
import { PTSession } from '../../../core/models/pt-session.entity';
import { TrainerAssignment } from '../../../core/models/trainer-assignment.entity';
import { SessionHistory } from '../../../core/models/session-history.entity';
import { TrainerRevenue } from '../../../core/models/trainer-revenue.entity';
import { MemberPTPlan } from '../../../core/models/member-pt-plan.entity';
import { Product } from '../../../core/models/product.entity';
import { ImportProfile } from '../../../core/models/import-profile.entity';
import { ImportHistory } from '../../../core/models/import-history.entity';
import { PagedRequest, PagedResponse } from '../../../core/models/pagination.contracts';
import { IProductRepository, IImportProfileRepository, IImportHistoryRepository, IUnitOfWork } from '../../../core/interfaces/repository.interfaces';

function paginateData<T>(items: T[], req: PagedRequest): PagedResponse<T> {
  let filtered = [...items];

  // 1. Search Term (case-insensitive substring match)
  if (req.searchTerm) {
    const term = req.searchTerm.toLowerCase().trim();
    filtered = filtered.filter(item => {
      const serialized = JSON.stringify(item).toLowerCase();
      return serialized.includes(term);
    });
  }

  // 2. Filters
  if (req.filters && req.filters.length > 0) {
    for (const f of req.filters) {
      filtered = filtered.filter(item => {
        const val = (item as any)[f.field];
        if (val === undefined || val === null) return false;
        const compareVal = f.value;

        switch (f.operator) {
          case 'eq': return String(val).toLowerCase() === String(compareVal).toLowerCase();
          case 'neq': return String(val).toLowerCase() !== String(compareVal).toLowerCase();
          case 'gt': return Number(val) > Number(compareVal);
          case 'lt': return Number(val) < Number(compareVal);
          case 'contains': return String(val).toLowerCase().includes(String(compareVal).toLowerCase());
          case 'startsWith': return String(val).toLowerCase().startsWith(String(compareVal).toLowerCase());
          default: return true;
        }
      });
    }
  }

  // 3. Sort
  if (req.sort && req.sort.column) {
    const col = req.sort.column;
    const dir = req.sort.direction === 'desc' ? -1 : 1;
    filtered.sort((a, b) => {
      const valA = (a as any)[col];
      const valB = (b as any)[col];
      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      return valA < valB ? -1 * dir : 1 * dir;
    });
  }

  const totalCount = filtered.length;
  const pageIndex = req.pageIndex;
  const pageSize = req.pageSize;
  const totalPages = Math.ceil(totalCount / pageSize);
  const start = pageIndex * pageSize;
  const pagedItems = filtered.slice(start, start + pageSize);

  const lastVisible = pagedItems.length > 0 ? pagedItems[pagedItems.length - 1] : null;

  return {
    items: pagedItems,
    totalCount,
    pageIndex,
    pageSize,
    totalPages,
    lastVisible
  };
}


// --- Static In-Memory Database State ---
const dbGyms: Gym[] = [
  {
    gymId: 'gym-a',
    gymName: 'Apex Fit Downtown',
    ownerName: 'Alex Johnson',
    email: 'owner@apexfit.com',
    phone: '+91 99887 76655',
    subscriptionPlan: SubscriptionPlan.Pro,
    status: 'active',
    createdAt: '2026-01-01',
    address: '123 Elite Athlete Boulevard, Suite 500, Downtown',
    gstNumber: '29ABCDE1234F1Z5',
    logoUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=150',
    website: 'https://downtown.apexfit.com',
    socialLinks: {
      facebook: 'https://facebook.com/apexfitdowntown',
      instagram: 'https://instagram.com/apexfitdowntown',
      twitter: 'https://twitter.com/apexfitdt',
      linkedin: 'https://linkedin.com/company/apexfitdowntown'
    },
    branches: [
      { id: 'br-1', name: 'Downtown Main Branch', code: 'DT-01', address: '123 Elite Athlete Boulevard, Suite 500', manager: 'Rahul Sharma', phone: '+91 99887 76655' },
      { id: 'br-2', name: 'Koramangala Extension', code: 'DT-02', address: '77 Koramangala 4th Block, Bangalore', manager: 'Vikram Malhotra', phone: '+91 99887 76688' }
    ],
    membershipSettings: {
      monthlyPrice: 1500,
      quarterlyPrice: 4000,
      halfYearlyPrice: 7500,
      annualPrice: 15000,
      autoExpiryEnabled: true,
      autoExpiryGraceDays: 3,
      renewalReminderDays: 7
    },
    paymentSettings: {
      currency: '₹',
      enableCard: true,
      enableUPI: true,
      enableCash: true,
      bankName: 'HDFC Bank',
      bankAccountNo: '50100223344556',
      bankIfsc: 'HDFC0000123',
      bankHolderName: 'Apex Fit Downtown Private Limited'
    },
    invoiceSettings: {
      prefix: 'APEX-DT-',
      taxName: 'GST',
      taxRate: 18,
      footerNotes: 'Thank you for choosing Apex Fit. Keep pushing your limits!'
    },
    notificationSettings: {
      renewalRemindersEnabled: true,
      paymentRemindersEnabled: true,
      leadFollowUpsEnabled: true,
      attendanceRemindersEnabled: false
    },
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=150',
      primaryColor: '#6366f1',
      secondaryColor: '#8b5cf6',
      theme: 'dark'
    },
    integrations: {
      whatsapp: { isEnabled: true, apiKey: 'wa_live_998877abc123xyz', senderPhone: '+91 90000 11111' },
      razorpay: { isEnabled: true, merchantId: 'mid_rzp_123', keyId: 'rzp_live_abc123', keySecret: '••••••••••••••••' },
      stripe: { isEnabled: false },
      firebase: { isEnabled: false },
      restApi: { isEnabled: false }
    }
  },
  {
    gymId: 'gym-b',
    gymName: 'Apex Fit Uptown',
    ownerName: 'Sarah Connor',
    email: 'owner-b@apexfit.com',
    phone: '+91 99887 76699',
    subscriptionPlan: SubscriptionPlan.Basic,
    status: 'active',
    createdAt: '2026-03-01',
    address: '456 Resistance Road, Level 2, Uptown',
    gstNumber: '29FGHIJ5678K2Z6',
    logoUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150',
    website: 'https://uptown.apexfit.com',
    socialLinks: {
      facebook: 'https://facebook.com/apexfituptown',
      instagram: 'https://instagram.com/apexfituptown'
    },
    branches: [
      { id: 'br-b1', name: 'Uptown Head Office', code: 'UT-01', address: '456 Resistance Road, Level 2', manager: 'Sarah Connor', phone: '+91 99887 76699' }
    ],
    membershipSettings: {
      monthlyPrice: 2000,
      quarterlyPrice: 5500,
      halfYearlyPrice: 10000,
      annualPrice: 18000,
      autoExpiryEnabled: true,
      autoExpiryGraceDays: 0,
      renewalReminderDays: 5
    },
    paymentSettings: {
      currency: '₹',
      enableCard: false,
      enableUPI: true,
      enableCash: true,
      bankName: 'ICICI Bank',
      bankAccountNo: '000401502633',
      bankIfsc: 'ICIC0000004',
      bankHolderName: 'Apex Fit Uptown Ltd'
    },
    invoiceSettings: {
      prefix: 'APEX-UT-',
      taxName: 'GST',
      taxRate: 18,
      footerNotes: 'Join the resistance. Stay strong!'
    },
    notificationSettings: {
      renewalRemindersEnabled: true,
      paymentRemindersEnabled: false,
      leadFollowUpsEnabled: false,
      attendanceRemindersEnabled: true
    },
    branding: {
      logoUrl: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150',
      primaryColor: '#3b82f6',
      secondaryColor: '#1d4ed8',
      theme: 'dark'
    },
    integrations: {
      whatsapp: { isEnabled: false },
      razorpay: { isEnabled: false },
      stripe: { isEnabled: false },
      firebase: { isEnabled: false },
      restApi: { isEnabled: false }
    }
  }
];

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function buildUser(base: Omit<UserProfile, 'permissions' | 'lastLogin' | 'sessionExpiresAt'>): UserProfile {
  const now = new Date().toISOString();
  return {
    ...base,
    permissions: [],   // populated by PermissionService after login
    lastLogin: now,
    sessionExpiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString()
  };
}

const dbMockAccounts: Record<string, UserProfile> = {
  'superadmin@apexfit.com': buildUser({
    id: 'usr-superadmin',
    name: 'HQ Master Admin',
    email: 'superadmin@apexfit.com',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    role: UserRole.SuperAdmin
  }),
  'owner@apexfit.com': buildUser({
    id: 'usr-owner-a',
    name: 'Alex Johnson',
    email: 'owner@apexfit.com',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    role: UserRole.Owner,
    gymId: 'gym-a'
  }),
  'owner-b@apexfit.com': buildUser({
    id: 'usr-owner-b',
    name: 'Sarah Connor',
    email: 'owner-b@apexfit.com',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    role: UserRole.Owner,
    gymId: 'gym-b'
  }),
  'trainer@apexfit.com': buildUser({
    id: 'usr-trainer-1',
    name: 'Marcus Vance',
    email: 'trainer@apexfit.com',
    avatarUrl: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=150',
    role: UserRole.Trainer,
    gymId: 'gym-a'
  }),
  'staff@apexfit.com': buildUser({
    id: 'usr-staff-1',
    name: 'Sophia Chen',
    email: 'staff@apexfit.com',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    role: UserRole.Staff,
    gymId: 'gym-a',
    isFirstLogin: true
  }),
  'manager@apexfit.com': buildUser({
    id: 'usr-manager-1',
    name: 'Rahul Sharma',
    email: 'manager@apexfit.com',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Rahul%20Sharma',
    role: UserRole.Manager,
    gymId: 'gym-a',
    branchId: 'br-1'
  }),
  'receptionist@apexfit.com': buildUser({
    id: 'usr-receptionist-1',
    name: 'Kavita Patel',
    email: 'receptionist@apexfit.com',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Kavita%20Patel',
    role: UserRole.Staff,
    gymId: 'gym-a'
  }),
  'accountant@apexfit.com': buildUser({
    id: 'usr-accountant-1',
    name: 'Vikram Mehta',
    email: 'accountant@apexfit.com',
    avatarUrl: 'https://api.dicebear.com/7.x/initials/svg?seed=Vikram%20Mehta',
    role: UserRole.Staff,
    gymId: 'gym-a'
  })
};

const dbPasswords: Record<string, string> = {
  'superadmin@apexfit.com': 'password',
  'owner@apexfit.com': 'password',
  'owner-b@apexfit.com': 'password',
  'trainer@apexfit.com': 'password',
  'staff@apexfit.com': 'password',
  'manager@apexfit.com': 'password',
  'receptionist@apexfit.com': 'password',
  'accountant@apexfit.com': 'password'
};

const dbPlans: MembershipPlan[] = [
  { id: 'plan-1', gymId: 'gym-a', name: 'Monthly', type: 'membership', durationMonths: 1, duration: 1, durationUnit: 'months', price: 2000, tax: 18, description: 'Access to standard gym facilities, weights, and cardio area.', features: ['Full gym access', '1 Fitness assessment', 'Locker room access'], activeMembersCount: 15, isActive: true },
  { id: 'plan-2', gymId: 'gym-a', name: 'Quarterly', type: 'membership', durationMonths: 3, duration: 3, durationUnit: 'months', price: 5000, tax: 18, description: 'Full access with trainer guidance, group classes, and sauna.', features: ['All Essential features', '10 Group fitness classes', 'Sauna & Steam room access', '2 Personal trainer sessions'], activeMembersCount: 24, isActive: true },
  { id: 'plan-3', gymId: 'gym-a', name: 'Annual', type: 'membership', durationMonths: 12, duration: 12, durationUnit: 'months', price: 15000, tax: 18, description: 'VIP access with unlimited classes, private trainer, nutrition plans.', features: ['24/7 Gym access', 'Unlimited group classes', 'Sauna, Steam & Ice bath', 'Monthly customized meal plans', '1 Private session weekly', 'Complimentary supplement kit'], activeMembersCount: 8, isActive: true },
  { id: 'plan-4', gymId: 'gym-a', name: 'Half Yearly', type: 'membership', durationMonths: 6, duration: 6, durationUnit: 'months', price: 9000, tax: 18, description: 'Standard bi-annual membership pass.', features: ['Gym floor access', 'Steam & Sauna room'], activeMembersCount: 0, isActive: true },
  { id: 'plan-5', gymId: 'gym-a', name: 'Personal Training', type: 'membership', durationMonths: 1, duration: 1, durationUnit: 'months', price: 8000, tax: 18, description: 'One-on-one personal trainer sessions.', features: ['Custom workouts', 'Nutrition consultation'], activeMembersCount: 0, isActive: true },
  { id: 'plan-6', gymId: 'gym-a', name: 'Group Classes', type: 'membership', durationMonths: 1, duration: 1, durationUnit: 'months', price: 4000, tax: 18, description: 'Unlimited group fitness classes access.', features: ['Yoga, Zumba, CrossFit'], activeMembersCount: 0, isActive: true },
  { id: 'plan-7', gymId: 'gym-a', name: 'Premium Package', type: 'membership', durationMonths: 12, duration: 12, durationUnit: 'months', price: 20000, tax: 18, description: 'Ultimate all-access and training pass.', features: ['Sauna & Ice Bath', 'PT Access', 'Meal Preps'], activeMembersCount: 0, isActive: true },
  { id: 'plan-b1', gymId: 'gym-b', name: 'Standard Month Pass', type: 'membership', durationMonths: 1, duration: 1, durationUnit: 'months', price: 2000, tax: 18, description: 'Basic workout pass.', features: ['Gym Floor', 'Lockers'], activeMembersCount: 2, isActive: true },
  { id: 'plan-b2', gymId: 'gym-b', name: 'VIP Year Pass', type: 'membership', durationMonths: 12, duration: 12, durationUnit: 'months', price: 18000, tax: 18, description: 'All access pass.', features: ['Gym Floor', 'Sauna', 'Personal Trainer'], activeMembersCount: 1, isActive: true }
];

const dbTrainers: Trainer[] = [
  { id: 'trainer-1', gymId: 'gym-a', name: 'Rahul Dev', specialty: 'Strength & Conditioning', rating: 4.9, membersCount: 14, avatarUrl: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=150', status: 'active', email: 'rahul.dev@apexfit.com', phone: '+91 98765 43210' },
  { id: 'trainer-2', gymId: 'gym-a', name: 'Kavita Sharma', specialty: 'Yoga & Functional Mobility', rating: 4.8, membersCount: 18, avatarUrl: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=150', status: 'active', email: 'kavita.sharma@apexfit.com', phone: '+91 98765 43211' },
  { id: 'trainer-3', gymId: 'gym-a', name: 'Vikram Malhotra', specialty: 'High Intensity Interval Training (HIIT)', rating: 4.7, membersCount: 12, avatarUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150', status: 'active', email: 'vikram.m@apexfit.com', phone: '+91 98765 43212' },
  { id: 'trainer-4', gymId: 'gym-a', name: 'Gurpreet Singh', specialty: 'Bodybuilding & Powerlifting', rating: 4.9, membersCount: 9, avatarUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=150', status: 'on leave', email: 'gurpreet.s@apexfit.com', phone: '+91 98765 43213' },
  { id: 'trainer-b1', gymId: 'gym-b', name: 'Kyle Reese', specialty: 'Tactical Conditioning & Cardio', rating: 5.0, membersCount: 3, avatarUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150', status: 'active', email: 'kyle.reese@apexfit.com', phone: '+91 98765 43299' }
];

const dbMembers: Member[] = [
  { id: 'mem-1', gymId: 'gym-a', name: 'Amit Sharma', email: 'amit.sharma@gmail.com', phone: '+91 99887 76655', status: 'active', planId: 'plan-2', planName: 'Quarterly', startDate: '2026-04-10', endDate: '2026-07-10', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', attendanceCount: 18, balance: 0, gender: 'Male', age: 28, height: 182, weight: 79, fitnessGoal: 'Muscle Gain', startingWeight: 85, goalWeight: 75 },
  { id: 'mem-2', gymId: 'gym-a', name: 'Priya Patel', email: 'priya.patel@yahoo.com', phone: '+91 99887 76656', status: 'active', planId: 'plan-3', planName: 'Annual', startDate: '2026-01-15', endDate: '2027-01-15', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', attendanceCount: 42, balance: 0, gender: 'Female', age: 25, height: 165, weight: 58, fitnessGoal: 'Cardio Fitness', startingWeight: 65, goalWeight: 55 },
  { id: 'mem-3', gymId: 'gym-a', name: 'Rajesh Kumar', email: 'rajesh.k@outlook.com', phone: '+91 99887 76657', status: 'expiring', planId: 'plan-1', planName: 'Monthly', startDate: '2026-05-08', endDate: '2026-06-08', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', attendanceCount: 11, balance: 2000, gender: 'Male', age: 45, height: 193, weight: 88, fitnessGoal: 'Strength Training', startingWeight: 95, goalWeight: 80 },
  { id: 'mem-4', gymId: 'gym-a', name: 'Anjali Rao', email: 'anjali.rao@gmail.com', phone: '+91 99887 76658', status: 'active', planId: 'plan-2', planName: 'Quarterly', startDate: '2026-05-01', endDate: '2026-08-01', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', attendanceCount: 8, balance: 0, gender: 'Female', age: 31, height: 168, weight: 62, fitnessGoal: 'Weight Loss', startingWeight: 68, goalWeight: 60 },
  { id: 'mem-5', gymId: 'gym-a', name: 'Vikram Singh', email: 'vikram.singh@gmail.com', phone: '+91 99887 76659', status: 'inactive', planId: 'plan-1', planName: 'Monthly', startDate: '2026-02-10', endDate: '2026-03-10', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', attendanceCount: 4, balance: 0, gender: 'Male', age: 38, height: 178, weight: 75, fitnessGoal: 'General Fitness', startingWeight: 80, goalWeight: 75 },
  { id: 'mem-6', gymId: 'gym-a', name: 'Neha Gupta', email: 'neha.gupta@outlook.com', phone: '+91 99887 76660', status: 'active', planId: 'plan-3', planName: 'Annual', startDate: '2026-03-20', endDate: '2027-03-20', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', attendanceCount: 29, balance: 0, gender: 'Female', age: 29, height: 165, weight: 54, fitnessGoal: 'Flexibility & Mobility', startingWeight: 58, goalWeight: 52 },
  { id: 'mem-7', gymId: 'gym-a', name: 'Rohan Mehta', email: 'rohan.mehta@gmail.com', phone: '+91 99887 76661', status: 'expiring', planId: 'plan-2', planName: 'Quarterly', startDate: '2026-03-10', endDate: '2026-06-10', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', attendanceCount: 22, balance: 5000, gender: 'Male', age: 34, height: 184, weight: 82, fitnessGoal: 'Muscle Gain', startingWeight: 88, goalWeight: 80 },
  // Gym B Members
  { id: 'mem-b1', gymId: 'gym-b', name: 'John Connor', email: 'john.connor@sky.net', phone: '+91 99887 76601', status: 'active', planId: 'plan-b2', planName: 'VIP Year Pass', startDate: '2026-03-01', endDate: '2027-03-01', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', attendanceCount: 12, balance: 0, gender: 'Male', age: 21, height: 178, weight: 70, fitnessGoal: 'Tactical Survival', startingWeight: 75, goalWeight: 72 },
  { id: 'mem-b2', gymId: 'gym-b', name: 'Marcus Wright', email: 'marcus.w@sky.net', phone: '+91 99887 76602', status: 'active', planId: 'plan-b1', planName: 'Standard Month Pass', startDate: '2026-05-15', endDate: '2026-06-15', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', attendanceCount: 5, balance: 2000, gender: 'Male', age: 35, height: 185, weight: 90, fitnessGoal: 'Strength Building', startingWeight: 98, goalWeight: 88 }
];

const dbPayments: Payment[] = [
  { id: 'pay-1', gymId: 'gym-a', memberId: 'mem-2', memberName: 'Priya Patel', amount: 15000, paidAmount: 15000, dueAmount: 0, dueDate: '2026-01-15', date: '2026-01-15', status: 'paid', planName: 'Annual', invoiceId: 'inv-1' },
  { id: 'pay-2', gymId: 'gym-a', memberId: 'mem-1', memberName: 'Amit Sharma', amount: 4000, paidAmount: 4000, dueAmount: 0, dueDate: '2026-04-10', date: '2026-04-10', status: 'paid', planName: 'Quarterly', invoiceId: 'inv-2' },
  { id: 'pay-3', gymId: 'gym-a', memberId: 'mem-4', memberName: 'Anjali Rao', amount: 4000, paidAmount: 4000, dueAmount: 0, dueDate: '2026-05-01', date: '2026-05-01', status: 'paid', planName: 'Quarterly', invoiceId: 'inv-3' },
  { id: 'pay-4', gymId: 'gym-a', memberId: 'mem-6', memberName: 'Neha Gupta', amount: 15000, paidAmount: 15000, dueAmount: 0, dueDate: '2026-03-20', date: '2026-03-20', status: 'paid', planName: 'Annual', invoiceId: 'inv-4' },
  { id: 'pay-5', gymId: 'gym-a', memberId: 'mem-3', memberName: 'Rajesh Kumar', amount: 1500, paidAmount: 0, dueAmount: 1500, dueDate: '2026-07-20', date: '2026-05-08', status: 'pending', planName: 'Monthly', invoiceId: 'inv-5' },
  { id: 'pay-6', gymId: 'gym-a', memberId: 'mem-7', memberName: 'Rohan Mehta', amount: 4000, paidAmount: 0, dueAmount: 4000, dueDate: '2026-06-10', date: '2026-03-10', status: 'overdue', planName: 'Quarterly', invoiceId: 'inv-6' },
  { id: 'pay-7', gymId: 'gym-a', memberId: 'mem-1', memberName: 'Amit Sharma', amount: 4000, paidAmount: 4000, dueAmount: 0, dueDate: '2026-01-10', date: '2026-01-10', status: 'paid', planName: 'Quarterly', invoiceId: 'inv-7' },
  { id: 'pay-8', gymId: 'gym-a', memberId: 'mem-2', memberName: 'Priya Patel', amount: 4000, paidAmount: 1500, dueAmount: 2500, dueDate: '2026-07-15', date: '2026-06-20', status: 'partially_paid', planName: 'Quarterly', invoiceId: 'inv-8' },
  { id: 'pay-9', gymId: 'gym-a', memberId: 'mem-3', memberName: 'Rajesh Kumar', amount: 4000, paidAmount: 1000, dueAmount: 3000, dueDate: '2026-06-05', date: '2026-05-01', status: 'overdue', planName: 'Quarterly', invoiceId: 'inv-9' },
  // Gym B Payments
  { id: 'pay-b1', gymId: 'gym-b', memberId: 'mem-b1', memberName: 'John Connor', amount: 18000, paidAmount: 18000, dueAmount: 0, dueDate: '2026-03-01', date: '2026-03-01', status: 'paid', planName: 'VIP Year Pass', invoiceId: 'inv-b1' },
  { id: 'pay-b2', gymId: 'gym-b', memberId: 'mem-b2', memberName: 'Marcus Wright', amount: 2000, paidAmount: 0, dueAmount: 2000, dueDate: '2026-06-15', date: '2026-05-15', status: 'pending', planName: 'Standard Month Pass', invoiceId: 'inv-b2' }
];

const dbPaymentSettings: PaymentSettings[] = [
  {
    id: 'ps-1',
    gymId: 'gym-a',
    provider: 'Manual UPI',
    enabled: true,
    gatewayConfig: {
      upiId: 'apexfit@upi',
      businessName: 'ApexFit Gym Downtown',
      autoGenerateQR: true,
      supportContact: '+91 99887 76655'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ps-2',
    gymId: 'gym-a',
    provider: 'Razorpay',
    enabled: false,
    gatewayConfig: {
      keyId: 'rzp_test_12345',
      keySecret: 'sec_test_67890'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ps-3',
    gymId: 'gym-a',
    provider: 'Cashfree',
    enabled: false,
    gatewayConfig: {
      keyId: 'cf_test_12345',
      keySecret: 'cf_sec_test_67890'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'ps-4',
    gymId: 'gym-b',
    provider: 'Manual UPI',
    enabled: true,
    gatewayConfig: {
      upiId: 'apexfitb@upi',
      businessName: 'ApexFit Gym Extension',
      autoGenerateQR: true,
      supportContact: '+91 99887 76688'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

const dbAttendance: Attendance[] = [
  { id: 'att-1', gymId: 'gym-a', memberId: 'mem-1', memberName: 'Amit Sharma', date: '2026-06-04', timeIn: '08:15 AM', status: 'present' },
  { id: 'att-2', gymId: 'gym-a', memberId: 'mem-2', memberName: 'Priya Patel', date: '2026-06-04', timeIn: '07:30 AM', status: 'present' },
  { id: 'att-3', gymId: 'gym-a', memberId: 'mem-4', memberName: 'Anjali Rao', date: '2026-06-04', timeIn: '09:45 AM', status: 'present' },
  { id: 'att-4', gymId: 'gym-a', memberId: 'mem-6', memberName: 'Neha Gupta', date: '2026-06-04', timeIn: '06:05 AM', status: 'present' },
  { id: 'att-5', gymId: 'gym-a', memberId: 'mem-3', memberName: 'Rajesh Kumar', date: '2026-06-04', timeIn: '', status: 'absent' },
  { id: 'att-6', gymId: 'gym-a', memberId: 'mem-7', memberName: 'Rohan Mehta', date: '2026-06-04', timeIn: '10:00 AM', status: 'present' },
  // Gym B Attendance
  { id: 'att-b1', gymId: 'gym-b', memberId: 'mem-b1', memberName: 'John Connor', date: '2026-06-04', timeIn: '07:00 AM', status: 'present' }
];

const dbDeviceConfigurations: DeviceConfiguration[] = [
  { id: 'dev-1', gymId: 'gym-a', branchId: 'br-1', deviceName: 'Front Gate Biometric', deviceType: 'essl_biometric', ipAddress: '192.168.1.50', port: 4370, status: 'Active', lastSyncTime: '2026-06-24T12:00:00Z', createdAt: '2026-06-24T12:00:00Z' },
  { id: 'dev-2', gymId: 'gym-a', branchId: 'br-1', deviceName: 'Back Entrance Biometric', deviceType: 'essl_biometric', ipAddress: '192.168.1.51', port: 4370, status: 'Inactive', lastSyncTime: '2026-06-23T18:30:00Z', createdAt: '2026-06-24T12:00:00Z' }
];

const dbAttendanceMappings: AttendanceMapping[] = [
  { id: 'map-1', gymId: 'gym-a', branchId: 'br-1', deviceUserId: '1001', mappedType: 'member', mappedId: 'mem-1', mappedName: 'Amit Sharma', createdAt: '2026-06-24T12:00:00Z' },
  { id: 'map-2', gymId: 'gym-a', branchId: 'br-1', deviceUserId: '1002', mappedType: 'member', mappedId: 'mem-2', mappedName: 'Priya Patel', createdAt: '2026-06-24T12:00:00Z' }
];

const dbLeads: Lead[] = [
  {
    id: 'lead-1',
    gymId: 'gym-a',
    name: 'Sachin Tendulkar',
    phone: '+91 97766 55443',
    email: 'sachin.t@gmail.com',
    trialDate: '2026-06-10',
    followUpDate: '2026-06-18',
    interestedPlan: 'Annual',
    notes: 'Wants customized diet chart.',
    assignedStaff: 'Sophia Chen',
    status: 'New',
    leadSource: 'Instagram',
    leadTemperature: 'Hot',
    fitnessGoal: ['Muscle Gain', 'Personal Training'],
    preferredPlan: 'Annual',
    referralSource: '',
    leadOwner: 'usr-staff-1',
    assignedEmployee: 'usr-staff-1',
    assignedEmployeeName: 'Sophia Chen',
    assignedDate: '2026-06-10',
    lastFollowUp: '2026-06-11',
    nextFollowUp: '2026-06-18',
    followUpStatus: 'Pending',
    followUpNotes: 'Follow up on diet requirements.',
    trialStatus: 'Scheduled',
    createdAt: '2026-06-10'
  },
  {
    id: 'lead-2',
    gymId: 'gym-a',
    name: 'Pooja Hegde',
    phone: '+91 97766 55444',
    email: 'pooja.h@gmail.com',
    trialDate: '2026-06-05',
    followUpDate: '2026-06-16', // Due today
    interestedPlan: 'Quarterly',
    notes: 'Interested in HIIT and group classes.',
    assignedStaff: 'Kavita Patel',
    status: 'Follow Up',
    leadSource: 'Referral',
    leadTemperature: 'Warm',
    fitnessGoal: ['General Fitness', 'Group Classes'],
    preferredPlan: 'Quarterly',
    referralSource: 'Friend (Sneha)',
    leadOwner: 'usr-receptionist-1',
    assignedEmployee: 'usr-receptionist-1',
    assignedEmployeeName: 'Kavita Patel',
    assignedDate: '2026-06-05',
    lastFollowUp: '2026-06-12',
    nextFollowUp: '2026-06-16',
    followUpStatus: 'Pending',
    followUpNotes: 'Discuss package discounts.',
    trialStatus: 'Attended',
    createdAt: '2026-06-05'
  },
  {
    id: 'lead-3',
    gymId: 'gym-a',
    name: 'Varun Dhawan',
    phone: '+91 97766 55445',
    email: 'varun.d@gmail.com',
    trialDate: '2026-06-01',
    followUpDate: '2026-06-14', // Overdue
    interestedPlan: 'Monthly',
    notes: 'Inquired about weightlifting facilities.',
    assignedStaff: 'Rahul Sharma',
    status: 'Contacted',
    leadSource: 'Website',
    leadTemperature: 'Warm',
    fitnessGoal: ['Weight Loss', 'CrossFit'],
    preferredPlan: 'Monthly',
    referralSource: '',
    leadOwner: 'usr-manager-1',
    assignedEmployee: 'usr-manager-1',
    assignedEmployeeName: 'Rahul Sharma',
    assignedDate: '2026-06-01',
    lastFollowUp: '2026-06-03',
    nextFollowUp: '2026-06-14',
    followUpStatus: 'Pending',
    followUpNotes: 'Missed scheduled call, need callback.',
    trialStatus: 'Scheduled',
    createdAt: '2026-06-01'
  },
  {
    id: 'lead-4',
    gymId: 'gym-a',
    name: 'Virat Kohli',
    phone: '+91 97766 55446',
    email: 'virat.k@gmail.com',
    trialDate: '2026-05-10',
    followUpDate: '2026-05-15',
    interestedPlan: 'Annual',
    notes: 'Converted and registered.',
    assignedStaff: 'Sophia Chen',
    status: 'Converted',
    leadSource: 'Instagram',
    leadTemperature: 'Hot',
    fitnessGoal: ['Body Transformation', 'Personal Training'],
    preferredPlan: 'Annual',
    referralSource: 'Direct',
    leadOwner: 'usr-staff-1',
    assignedEmployee: 'usr-staff-1',
    assignedEmployeeName: 'Sophia Chen',
    assignedDate: '2026-05-10',
    lastFollowUp: '2026-05-14',
    nextFollowUp: '2026-05-15',
    followUpStatus: 'Completed',
    trialStatus: 'Converted After Trial',
    convertedBy: 'Sophia Chen',
    revenueGenerated: 15000,
    commissionPercent: 10,
    commissionEarned: 1500,
    createdAt: '2026-05-10'
  },
  {
    id: 'lead-5',
    gymId: 'gym-a',
    name: 'MS Dhoni',
    phone: '+91 97766 55447',
    email: 'msd@gmail.com',
    trialDate: '2026-05-12',
    followUpDate: '2026-05-14',
    interestedPlan: 'Quarterly',
    notes: 'Converted.',
    assignedStaff: 'Kavita Patel',
    status: 'Converted',
    leadSource: 'Walk-In',
    leadTemperature: 'Hot',
    fitnessGoal: ['Muscle Gain', 'MMA'],
    preferredPlan: 'Quarterly',
    referralSource: 'Walk-in',
    leadOwner: 'usr-receptionist-1',
    assignedEmployee: 'usr-receptionist-1',
    assignedEmployeeName: 'Kavita Patel',
    assignedDate: '2026-05-12',
    lastFollowUp: '2026-05-13',
    nextFollowUp: '2026-05-14',
    followUpStatus: 'Completed',
    trialStatus: 'Converted After Trial',
    convertedBy: 'Kavita Patel',
    revenueGenerated: 5000,
    commissionPercent: 10,
    commissionEarned: 500,
    createdAt: '2026-05-12'
  },
  {
    id: 'lead-6',
    gymId: 'gym-a',
    name: 'Alia Bhatt',
    phone: '+91 97766 55448',
    email: 'alia.b@gmail.com',
    trialDate: '2026-06-03',
    followUpDate: '2026-06-05',
    interestedPlan: 'Monthly',
    notes: 'Lost due to price.',
    assignedStaff: 'Sophia Chen',
    status: 'Lost',
    leadSource: 'Instagram',
    leadTemperature: 'Cold',
    fitnessGoal: ['Weight Loss', 'General Fitness'],
    preferredPlan: 'Monthly',
    referralSource: 'Instagram',
    leadOwner: 'usr-staff-1',
    assignedEmployee: 'usr-staff-1',
    assignedEmployeeName: 'Sophia Chen',
    assignedDate: '2026-06-03',
    lastFollowUp: '2026-06-05',
    nextFollowUp: '2026-06-05',
    followUpStatus: 'Completed',
    trialStatus: 'No Show',
    reasonLost: 'Too Expensive',
    createdAt: '2026-06-03'
  },
  {
    id: 'lead-7',
    gymId: 'gym-a',
    name: 'Deepika Padukone',
    phone: '+91 97766 55449',
    email: 'deepika.p@gmail.com',
    trialDate: '2026-06-12',
    followUpDate: '2026-06-18',
    interestedPlan: 'Quarterly',
    notes: 'Trial attended, positive feedback.',
    assignedStaff: 'Sophia Chen',
    status: 'Trial Attended',
    leadSource: 'Walk-In',
    leadTemperature: 'Hot',
    fitnessGoal: ['Body Transformation', 'Group Classes'],
    preferredPlan: 'Quarterly',
    referralSource: 'Walk-in',
    leadOwner: 'usr-staff-1',
    assignedEmployee: 'usr-staff-1',
    assignedEmployeeName: 'Sophia Chen',
    assignedDate: '2026-06-12',
    lastFollowUp: '2026-06-12',
    nextFollowUp: '2026-06-18',
    followUpStatus: 'Pending',
    trialStatus: 'Attended',
    createdAt: '2026-06-12'
  },
  {
    id: 'lead-8',
    gymId: 'gym-a',
    name: 'Ranbir Kapoor',
    phone: '+91 97766 55450',
    email: 'ranbir.k@gmail.com',
    trialDate: '2026-06-11',
    followUpDate: '2026-06-17',
    interestedPlan: 'Annual',
    notes: 'Negotiating discount for corporate membership.',
    assignedStaff: 'Rahul Sharma',
    status: 'Negotiation',
    leadSource: 'Google Ads',
    leadTemperature: 'Hot',
    fitnessGoal: ['Muscle Gain', 'Boxing'],
    preferredPlan: 'Annual',
    referralSource: 'Google Ads',
    leadOwner: 'usr-manager-1',
    assignedEmployee: 'usr-manager-1',
    assignedEmployeeName: 'Rahul Sharma',
    assignedDate: '2026-06-11',
    lastFollowUp: '2026-06-14',
    nextFollowUp: '2026-06-17',
    followUpStatus: 'Pending',
    trialStatus: 'Scheduled',
    createdAt: '2026-06-11'
  },
  {
    id: 'lead-9',
    gymId: 'gym-a',
    name: 'Rohan Gavaskar',
    phone: '+91 97766 55451',
    email: 'rohan.g@gmail.com',
    trialDate: '2026-06-19',
    followUpDate: '2026-06-20',
    interestedPlan: 'Quarterly',
    notes: 'Trial scheduled for next week.',
    assignedStaff: 'Sophia Chen',
    status: 'Trial Scheduled',
    leadSource: 'Facebook',
    leadTemperature: 'Warm',
    fitnessGoal: ['CrossFit', 'Boxing'],
    preferredPlan: 'Quarterly',
    referralSource: 'Facebook',
    leadOwner: 'usr-staff-1',
    assignedEmployee: 'usr-staff-1',
    assignedEmployeeName: 'Sophia Chen',
    assignedDate: '2026-06-14',
    lastFollowUp: '2026-06-14',
    nextFollowUp: '2026-06-20',
    followUpStatus: 'Pending',
    trialStatus: 'Scheduled',
    createdAt: '2026-06-14'
  },
  {
    id: 'lead-10',
    gymId: 'gym-a',
    name: 'Neha Kakkar',
    phone: '+91 97766 55452',
    email: 'neha.k@gmail.com',
    trialDate: '2026-05-20',
    followUpDate: '2026-05-22',
    interestedPlan: 'Monthly',
    notes: 'Converted.',
    assignedStaff: 'Sophia Chen',
    status: 'Converted',
    leadSource: 'Website',
    leadTemperature: 'Warm',
    fitnessGoal: ['General Fitness', 'Personal Training'],
    preferredPlan: 'Monthly',
    referralSource: 'Website',
    leadOwner: 'usr-staff-1',
    assignedEmployee: 'usr-staff-1',
    assignedEmployeeName: 'Sophia Chen',
    assignedDate: '2026-05-20',
    lastFollowUp: '2026-05-21',
    nextFollowUp: '2026-05-22',
    followUpStatus: 'Completed',
    trialStatus: 'Converted After Trial',
    convertedBy: 'Sophia Chen',
    revenueGenerated: 2000,
    commissionPercent: 10,
    commissionEarned: 200,
    createdAt: '2026-05-20'
  },
  {
    id: 'lead-b1',
    gymId: 'gym-b',
    name: 'Katherine Brewster',
    phone: '+91 97766 55401',
    email: 'kate.b@sky.net',
    trialDate: '2026-06-09',
    followUpDate: '2026-06-11',
    interestedPlan: 'Standard Month Pass',
    notes: 'Looking to start immediately.',
    assignedStaff: 'Kyle Reese',
    status: 'New',
    leadSource: 'Website',
    leadTemperature: 'Hot',
    fitnessGoal: ['Rehabilitation'],
    preferredPlan: 'Standard Month Pass',
    createdAt: '2026-06-09'
  }
];

const dbLogs: ActivityLog[] = [
  { id: 'log-1', gymId: 'gym-a', text: 'Priya Patel checked in today at 07:30 AM', time: '1 hour ago', type: 'attendance' },
  { id: 'log-2', gymId: 'gym-a', text: 'Recorded payment of ₹15,000 from Neha Gupta', time: '3 hours ago', type: 'payment' },
  { id: 'log-b1', gymId: 'gym-b', text: 'John Connor joined Apex Fit Uptown!', time: '1 day ago', type: 'join' }
];

const dbWhatsAppTemplates: WhatsAppTemplate[] = [
  {
    id: 'tpl-1',
    gymId: 'gym-a',
    name: 'Renewal Reminder',
    type: 'renewal_reminder',
    body: 'Hey {name}, your {planName} membership at {gymName} is expiring on {dueDate}. Renew today to continue your workout streak without interruptions!',
    variables: ['name', 'planName', 'gymName', 'dueDate'],
    isActive: true
  },
  {
    id: 'tpl-2',
    gymId: 'gym-a',
    name: 'Payment Reminder',
    type: 'payment_reminder',
    body: 'Dear {name}, this is a gentle reminder that your payment of ₹{amount} for {planName} is due on {dueDate}. Please settle at your earliest convenience. Thank you!',
    variables: ['name', 'amount', 'planName', 'dueDate'],
    isActive: true
  },
  {
    id: 'tpl-3',
    gymId: 'gym-a',
    name: 'Trial Follow Up',
    type: 'trial_follow_up',
    body: 'Hi {name}, we hope you enjoyed your trial session on {trialDate} at {gymName}! Are you ready to join our fitness family? Reply here or give us a call!',
    variables: ['name', 'trialDate', 'gymName'],
    isActive: true
  },
  {
    id: 'tpl-4',
    gymId: 'gym-a',
    name: 'Welcome Message',
    type: 'welcome_message',
    body: 'Hi {name}! Welcome to {gymName}. We are thrilled to have you join our fitness community. Let\'s crush your goals together!',
    variables: ['name', 'gymName'],
    isActive: true
  },
  {
    id: 'tpl-5',
    gymId: 'gym-a',
    name: 'Attendance Reminder',
    type: 'attendance_reminder',
    body: 'Hey {name}, we missed you at {gymName} today! Keep up the consistency — see you tomorrow for your next session!',
    variables: ['name', 'gymName'],
    isActive: true
  }
];

const dbWhatsAppReminders: WhatsAppReminder[] = [
  {
    id: 'rem-w1',
    gymId: 'gym-a',
    recipientName: 'Amit Sharma',
    recipientPhone: '+91 99887 76655',
    recipientType: 'member',
    templateId: 'tpl-4',
    templateName: 'Welcome Message',
    messageContent: 'Hi Amit Sharma! Welcome to Apex Fit Downtown. We are thrilled to have you join our fitness community. Let\'s crush your goals together!',
    status: 'sent',
    sentTime: '2026-06-08T10:00:00.000Z'
  },
  {
    id: 'rem-w2',
    gymId: 'gym-a',
    recipientName: 'Priya Patel',
    recipientPhone: '+91 99887 76656',
    recipientType: 'member',
    templateId: 'tpl-4',
    templateName: 'Welcome Message',
    messageContent: 'Hi Priya Patel! Welcome to Apex Fit Downtown. We are thrilled to have you join our fitness community. Let\'s crush your goals together!',
    status: 'sent',
    sentTime: '2026-06-08T11:15:00.000Z'
  },
  {
    id: 'rem-w3',
    gymId: 'gym-a',
    recipientName: 'Rajesh Kumar',
    recipientPhone: '+91 99887 76657',
    recipientType: 'renewal',
    templateId: 'tpl-1',
    templateName: 'Renewal Reminder',
    messageContent: 'Hey Rajesh Kumar, your Essential Monthly membership at Apex Fit Downtown is expiring on 2026-06-08. Renew today to continue your workout streak without interruptions!',
    status: 'scheduled',
    scheduledTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString()
  },
  {
    id: 'rem-w4',
    gymId: 'gym-a',
    recipientName: 'Rohan Mehta',
    recipientPhone: '+91 99887 76661',
    recipientType: 'payment',
    templateId: 'tpl-2',
    templateName: 'Payment Reminder',
    messageContent: 'Dear Rohan Mehta, this is a gentle reminder that your payment of ₹4000 for Premium Quarterly is due on 2026-06-05. Please settle at your earliest convenience. Thank you!',
    status: 'scheduled',
    scheduledTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
  }
];

const dbExpenses: Expense[] = [
  { id: 'exp-1', gymId: 'gym-a', title: 'Monthly Gym Rent', category: 'Rent', amount: 35000, date: '2026-06-01', notes: 'Paid to landlord for June 2026', createdBy: 'Rahul Sharma' },
  { id: 'exp-2', gymId: 'gym-a', title: 'Electricity Bill', category: 'Electricity', amount: 8400, date: '2026-06-05', notes: 'Summer AC usage bill', createdBy: 'Vikram Mehta' },
  { id: 'exp-3', gymId: 'gym-a', title: 'Water Delivery', category: 'Water', amount: 1200, date: '2026-06-07', notes: 'Drinking water cans', createdBy: 'Kavita Patel' },
  { id: 'exp-4', gymId: 'gym-a', title: 'Salaries - Trainers & Staff', category: 'Salaries', amount: 45000, date: '2026-06-10', notes: 'Salary payout for May', createdBy: 'Rahul Sharma' },
  { id: 'exp-5', gymId: 'gym-a', title: 'Marketing Campaign', category: 'Marketing', amount: 5000, date: '2026-06-03', notes: 'Instagram ads', createdBy: 'Sophia Chen' },
  { id: 'exp-6', gymId: 'gym-a', title: 'Cable Replacement (Lat Pulldown)', category: 'Maintenance', amount: 2500, date: '2026-06-08', notes: 'Equipment upkeep', createdBy: 'Vikram Mehta' }
];

const dbInvoices: Invoice[] = [
  { id: 'inv-1', gymId: 'gym-a', invoiceNumber: 'INV-2026-0001', memberId: 'mem-2', memberName: 'Priya Patel', membershipPlan: 'Elite Annual Platinum', amount: 12711.86, gst: 2288.14, discount: 0, finalAmount: 15000, paymentMethod: 'UPI', invoiceDate: '2026-01-15', status: 'paid', amountPaid: 15000, pendingAmount: 0, dueDate: '2026-01-15', collectedBy: 'Sophia Chen', createdBy: 'Sophia Chen' },
  { id: 'inv-2', gymId: 'gym-a', invoiceNumber: 'INV-2026-0002', memberId: 'mem-1', memberName: 'Amit Sharma', membershipPlan: 'Premium Quarterly', amount: 3389.83, gst: 610.17, discount: 0, finalAmount: 4000, paymentMethod: 'Card', invoiceDate: '2026-04-10', status: 'paid', amountPaid: 4000, pendingAmount: 0, dueDate: '2026-04-10', collectedBy: 'Sophia Chen', createdBy: 'Sophia Chen' },
  { id: 'inv-3', gymId: 'gym-a', invoiceNumber: 'INV-2026-0003', memberId: 'mem-4', memberName: 'Anjali Rao', membershipPlan: 'Premium Quarterly', amount: 3389.83, gst: 610.17, discount: 0, finalAmount: 4000, paymentMethod: 'Cash', invoiceDate: '2026-05-01', status: 'paid', amountPaid: 4000, pendingAmount: 0, dueDate: '2026-05-01', collectedBy: 'Sophia Chen', createdBy: 'Sophia Chen' },
  { id: 'inv-4', gymId: 'gym-a', invoiceNumber: 'INV-2026-0004', memberId: 'mem-6', memberName: 'Neha Gupta', membershipPlan: 'Elite Annual Platinum', amount: 12711.86, gst: 2288.14, discount: 0, finalAmount: 15000, paymentMethod: 'UPI', invoiceDate: '2026-03-20', status: 'paid', amountPaid: 15000, pendingAmount: 0, dueDate: '2026-03-20', collectedBy: 'Kavita Patel', createdBy: 'Kavita Patel' },
  { id: 'inv-5', gymId: 'gym-a', invoiceNumber: 'INV-2026-0005', memberId: 'mem-3', memberName: 'Rajesh Kumar', membershipPlan: 'Essential Monthly', amount: 1271.19, gst: 228.81, discount: 0, finalAmount: 1500, paymentMethod: 'UPI', invoiceDate: '2026-05-08', status: 'pending', amountPaid: 0, pendingAmount: 1500, dueDate: '2026-07-20' },
  { id: 'inv-6', gymId: 'gym-a', invoiceNumber: 'INV-2026-0006', memberId: 'mem-7', memberName: 'Rohan Mehta', membershipPlan: 'Premium Quarterly', amount: 3389.83, gst: 610.17, discount: 0, finalAmount: 4000, paymentMethod: 'UPI', invoiceDate: '2026-03-10', status: 'overdue', amountPaid: 0, pendingAmount: 4000, dueDate: '2026-06-10' },
  { id: 'inv-7', gymId: 'gym-a', invoiceNumber: 'INV-2026-0007', memberId: 'mem-1', memberName: 'Amit Sharma', membershipPlan: 'Premium Quarterly', amount: 3389.83, gst: 610.17, discount: 0, finalAmount: 4000, paymentMethod: 'UPI', invoiceDate: '2026-01-10', status: 'paid', amountPaid: 4000, pendingAmount: 0, dueDate: '2026-01-10', collectedBy: 'Sophia Chen', createdBy: 'Sophia Chen' },
  { id: 'inv-8', gymId: 'gym-a', invoiceNumber: 'INV-2026-0008', memberId: 'mem-2', memberName: 'Priya Patel', membershipPlan: 'Premium Quarterly', amount: 3389.83, gst: 610.17, discount: 0, finalAmount: 4000, paymentMethod: 'UPI', invoiceDate: '2026-06-20', status: 'partially_paid', amountPaid: 1500, pendingAmount: 2500, dueDate: '2026-07-15' },
  { id: 'inv-9', gymId: 'gym-a', invoiceNumber: 'INV-2026-0009', memberId: 'mem-3', memberName: 'Rajesh Kumar', membershipPlan: 'Premium Quarterly', amount: 3389.83, gst: 610.17, discount: 0, finalAmount: 4000, paymentMethod: 'UPI', invoiceDate: '2026-05-01', status: 'overdue', amountPaid: 1000, pendingAmount: 3000, dueDate: '2026-06-05' },
  { id: 'inv-b1', gymId: 'gym-b', invoiceNumber: 'INV-2026-0010', memberId: 'mem-b1', memberName: 'John Connor', membershipPlan: 'VIP Year Pass', amount: 15254.24, gst: 2745.76, discount: 0, finalAmount: 18000, paymentMethod: 'UPI', invoiceDate: '2026-03-01', status: 'paid', amountPaid: 18000, pendingAmount: 0, dueDate: '2026-03-01', collectedBy: 'Kyle Reese', createdBy: 'Kyle Reese' },
  { id: 'inv-b2', gymId: 'gym-b', invoiceNumber: 'INV-2026-0011', memberId: 'mem-b2', memberName: 'Marcus Wright', membershipPlan: 'Standard Month Pass', amount: 1694.92, gst: 305.08, discount: 0, finalAmount: 2000, paymentMethod: 'UPI', invoiceDate: '2026-05-15', status: 'overdue', amountPaid: 0, pendingAmount: 2000, dueDate: '2026-05-15' }
];

const dbCollections: Collection[] = [
  { id: 'col-1', gymId: 'gym-a', receiptNo: 'REC-2026-0001', memberId: 'mem-2', memberName: 'Priya Patel', membershipPlan: 'Elite Annual Platinum', amount: 15000, paymentMethod: 'UPI', date: '2026-01-15', collectedBy: 'Sophia Chen' },
  { id: 'col-2', gymId: 'gym-a', receiptNo: 'REC-2026-0002', memberId: 'mem-1', memberName: 'Amit Sharma', membershipPlan: 'Premium Quarterly', amount: 4000, paymentMethod: 'Card', date: '2026-04-10', collectedBy: 'Sophia Chen' },
  { id: 'col-3', gymId: 'gym-a', receiptNo: 'REC-2026-0003', memberId: 'mem-4', memberName: 'Anjali Rao', membershipPlan: 'Premium Quarterly', amount: 4000, paymentMethod: 'Cash', date: '2026-05-01', collectedBy: 'Sophia Chen' },
  { id: 'col-4', gymId: 'gym-a', receiptNo: 'REC-2026-0004', memberId: 'mem-6', memberName: 'Neha Gupta', membershipPlan: 'Elite Annual Platinum', amount: 15000, paymentMethod: 'UPI', date: '2026-03-20', collectedBy: 'Kavita Patel' },
  { id: 'col-7', gymId: 'gym-a', receiptNo: 'REC-2026-0007', memberId: 'mem-1', memberName: 'Amit Sharma', membershipPlan: 'Premium Quarterly', amount: 4000, paymentMethod: 'UPI', date: '2026-01-10', collectedBy: 'Sophia Chen' },
  { id: 'col-b1', gymId: 'gym-b', receiptNo: 'REC-2026-0008', memberId: 'mem-b1', memberName: 'John Connor', membershipPlan: 'VIP Year Pass', amount: 18000, paymentMethod: 'UPI', date: '2026-03-01', collectedBy: 'Kyle Reese' }
];


// --- Employee DB Seed Data ---
const dbEmployees: Employee[] = [
  {
    id: 'usr-owner-a',
    gymId: 'gym-a',
    fullName: 'Alex Johnson',
    phone: '+91 99887 76655',
    email: 'owner@apexfit.com',
    gender: 'Male',
    dob: '1985-03-10',
    address: '123 Elite Athlete Boulevard, Suite 500, Downtown',
    role: UserRole.Owner,
    department: 'Management',
    joinDate: '2026-01-01',
    salary: 0,
    shift: 'General',
    username: 'owner',
    accountStatus: 'Active'
  },
  {
    id: 'usr-owner-b',
    gymId: 'gym-b',
    fullName: 'Sarah Connor',
    phone: '+91 99887 76699',
    email: 'owner-b@apexfit.com',
    gender: 'Female',
    dob: '1982-11-20',
    address: '456 Resistance Road, Level 2, Uptown',
    role: UserRole.Owner,
    department: 'Management',
    joinDate: '2026-03-01',
    salary: 0,
    shift: 'General',
    username: 'owner-b',
    accountStatus: 'Active'
  },
  {
    id: 'usr-manager-1',
    gymId: 'gym-a',
    fullName: 'Rahul Sharma',
    phone: '+91 98765 00001',
    email: 'manager@apexfit.com',
    gender: 'Male',
    dob: '1988-05-15',
    address: '45 MG Road, Bangalore',
    role: UserRole.Manager,
    department: 'Management',
    joinDate: '2026-01-01',
    salary: 65000,
    shift: 'General',
    username: 'rahul_manager',
    accountStatus: 'Active'
  },
  {
    id: 'usr-receptionist-1',
    gymId: 'gym-a',
    fullName: 'Kavita Patel',
    phone: '+91 98765 00002',
    email: 'receptionist@apexfit.com',
    gender: 'Female',
    dob: '1995-08-20',
    address: '88 Indiranagar, Bangalore',
    role: UserRole.Staff,
    department: 'Front Desk',
    joinDate: '2026-02-15',
    salary: 25000,
    shift: 'Morning',
    reportingManagerId: 'usr-manager-1',
    reportingManagerName: 'Rahul Sharma',
    username: 'kavita_receptionist',
    accountStatus: 'Active'
  },
  {
    id: 'usr-accountant-1',
    gymId: 'gym-a',
    fullName: 'Vikram Mehta',
    phone: '+91 98765 00003',
    email: 'accountant@apexfit.com',
    gender: 'Male',
    dob: '1990-12-10',
    address: '12 Whitefield, Bangalore',
    role: UserRole.Staff,
    department: 'Finance',
    joinDate: '2026-03-01',
    salary: 45000,
    shift: 'General',
    reportingManagerId: 'usr-manager-1',
    reportingManagerName: 'Rahul Sharma',
    username: 'vikram_accountant',
    accountStatus: 'Active'
  },
  {
    id: 'trainer-1',
    gymId: 'gym-a',
    fullName: 'Rahul Dev',
    phone: '+91 98765 43210',
    email: 'rahul.dev@apexfit.com',
    gender: 'Male',
    dob: '1992-04-10',
    address: '15 JP Nagar, Bangalore',
    role: UserRole.Trainer,
    department: 'Fitness',
    joinDate: '2026-01-10',
    salary: 35000,
    shift: 'Morning',
    reportingManagerId: 'usr-manager-1',
    reportingManagerName: 'Rahul Sharma',
    username: 'rahul_dev',
    accountStatus: 'Active',
    specialty: 'Strength & Conditioning',
    experienceYears: 6,
    assignedMembersCount: 14
  },
  {
    id: 'trainer-2',
    gymId: 'gym-a',
    fullName: 'Kavita Sharma',
    phone: '+91 98765 43211',
    email: 'kavita.sharma@apexfit.com',
    gender: 'Female',
    dob: '1994-07-22',
    address: '22 Jayanagar, Bangalore',
    role: UserRole.Trainer,
    department: 'Fitness',
    joinDate: '2026-01-15',
    salary: 32000,
    shift: 'General',
    reportingManagerId: 'usr-manager-1',
    reportingManagerName: 'Rahul Sharma',
    username: 'kavita_yoga',
    accountStatus: 'Active',
    specialty: 'Yoga & Functional Mobility',
    experienceYears: 5,
    assignedMembersCount: 18
  },
  {
    id: 'trainer-3',
    gymId: 'gym-a',
    fullName: 'Vikram Malhotra',
    phone: '+91 98765 43212',
    email: 'vikram.m@apexfit.com',
    gender: 'Male',
    dob: '1991-11-05',
    address: '77 Koramangala, Bangalore',
    role: UserRole.Trainer,
    department: 'Fitness',
    joinDate: '2026-02-01',
    salary: 38000,
    shift: 'Evening',
    reportingManagerId: 'usr-manager-1',
    reportingManagerName: 'Rahul Sharma',
    username: 'vikram_hiit',
    accountStatus: 'Active',
    specialty: 'High Intensity Interval Training (HIIT)',
    experienceYears: 7,
    assignedMembersCount: 12
  },
  {
    id: 'trainer-4',
    gymId: 'gym-a',
    fullName: 'Gurpreet Singh',
    phone: '+91 98765 43213',
    email: 'gurpreet.s@apexfit.com',
    gender: 'Male',
    dob: '1989-09-18',
    address: '99 Sadashivanagar, Bangalore',
    role: UserRole.Trainer,
    department: 'Fitness',
    joinDate: '2026-02-10',
    salary: 40000,
    shift: 'Evening',
    reportingManagerId: 'usr-manager-1',
    reportingManagerName: 'Rahul Sharma',
    username: 'gurpreet_power',
    accountStatus: 'Suspended',
    specialty: 'Bodybuilding & Powerlifting',
    experienceYears: 10,
    assignedMembersCount: 9
  },
  {
    id: 'usr-staff-1',
    gymId: 'gym-a',
    fullName: 'Sophia Chen',
    phone: '+91 99887 76655',
    email: 'staff@apexfit.com',
    gender: 'Female',
    dob: '1996-03-24',
    address: '11 MG Road, Bangalore',
    role: UserRole.Staff,
    department: 'Operations',
    joinDate: '2026-03-10',
    salary: 20000,
    shift: 'Morning',
    reportingManagerId: 'usr-manager-1',
    reportingManagerName: 'Rahul Sharma',
    username: 'sophia_staff',
    accountStatus: 'Active'
  },
  {
    id: 'trainer-b1',
    gymId: 'gym-b',
    fullName: 'Kyle Reese',
    phone: '+91 98765 43299',
    email: 'kyle.reese@sky.net',
    gender: 'Male',
    dob: '1998-12-01',
    address: '456 Resistance Road, Uptown',
    role: UserRole.Trainer,
    department: 'Fitness',
    joinDate: '2026-03-01',
    salary: 30000,
    shift: 'Morning',
    username: 'kyle_tactical',
    accountStatus: 'Active',
    specialty: 'Tactical Conditioning & Cardio',
    experienceYears: 4,
    assignedMembersCount: 3
  }
];

const dbEmployeeAttendance: EmployeeAttendance[] = [
  { id: 'att-emp-1', gymId: 'gym-a', employeeId: 'usr-manager-1', employeeName: 'Rahul Sharma', role: UserRole.Manager, date: '2026-06-12', status: 'Present', checkInTime: '09:00 AM', checkOutTime: '05:30 PM' },
  { id: 'att-emp-2', gymId: 'gym-a', employeeId: 'usr-receptionist-1', employeeName: 'Kavita Patel', role: UserRole.Staff, date: '2026-06-12', status: 'Present', checkInTime: '08:00 AM', checkOutTime: '04:00 PM' },
  { id: 'att-emp-3', gymId: 'gym-a', employeeId: 'usr-accountant-1', employeeName: 'Vikram Mehta', role: UserRole.Staff, date: '2026-06-12', status: 'Present', checkInTime: '09:15 AM', checkOutTime: '05:00 PM' },
  { id: 'att-emp-4', gymId: 'gym-a', employeeId: 'trainer-1', employeeName: 'Rahul Dev', role: UserRole.Trainer, date: '2026-06-12', status: 'Present', checkInTime: '06:00 AM', checkOutTime: '02:00 PM' },
  { id: 'att-emp-5', gymId: 'gym-a', employeeId: 'trainer-2', employeeName: 'Kavita Sharma', role: UserRole.Trainer, date: '2026-06-12', status: 'Present', checkInTime: '08:30 AM', checkOutTime: '04:30 PM' },
  { id: 'att-emp-6', gymId: 'gym-a', employeeId: 'trainer-3', employeeName: 'Vikram Malhotra', role: UserRole.Trainer, date: '2026-06-12', status: 'Leave', notes: 'Personal work' },
  { id: 'att-emp-7', gymId: 'gym-a', employeeId: 'trainer-4', employeeName: 'Gurpreet Singh', role: UserRole.Trainer, date: '2026-06-12', status: 'Absent' }
];

const dbEmployeePayroll: EmployeePayroll[] = [
  { id: 'pay-emp-1', gymId: 'gym-a', employeeId: 'usr-manager-1', employeeName: 'Rahul Sharma', role: UserRole.Manager, monthYear: 'May 2026', baseSalary: 65000, bonus: 5000, deductions: 2000, netPaid: 68000, paymentDate: '2026-06-05', status: 'Paid' },
  { id: 'pay-emp-2', gymId: 'gym-a', employeeId: 'usr-receptionist-1', employeeName: 'Kavita Patel', role: UserRole.Staff, monthYear: 'May 2026', baseSalary: 25000, bonus: 1000, deductions: 500, netPaid: 25500, paymentDate: '2026-06-05', status: 'Paid' },
  { id: 'pay-emp-3', gymId: 'gym-a', employeeId: 'usr-accountant-1', employeeName: 'Vikram Mehta', role: UserRole.Staff, monthYear: 'May 2026', baseSalary: 45000, bonus: 2000, deductions: 1000, netPaid: 46000, paymentDate: '2026-06-05', status: 'Paid' },
  { id: 'pay-emp-4', gymId: 'gym-a', employeeId: 'trainer-1', employeeName: 'Rahul Dev', role: UserRole.Trainer, monthYear: 'May 2026', baseSalary: 35000, bonus: 3000, deductions: 1000, netPaid: 37000, paymentDate: '2026-06-05', status: 'Paid' },
  { id: 'pay-emp-5', gymId: 'gym-a', employeeId: 'trainer-2', employeeName: 'Kavita Sharma', role: UserRole.Trainer, monthYear: 'May 2026', baseSalary: 32000, bonus: 4000, deductions: 500, netPaid: 35500, paymentDate: '2026-06-05', status: 'Paid' },
  
  { id: 'pay-emp-6', gymId: 'gym-a', employeeId: 'usr-manager-1', employeeName: 'Rahul Sharma', role: UserRole.Manager, monthYear: 'June 2026', baseSalary: 65000, bonus: 0, deductions: 0, netPaid: 65000, status: 'Pending' },
  { id: 'pay-emp-7', gymId: 'gym-a', employeeId: 'usr-receptionist-1', employeeName: 'Kavita Patel', role: UserRole.Staff, monthYear: 'June 2026', baseSalary: 25000, bonus: 0, deductions: 0, netPaid: 25000, status: 'Pending' },
  { id: 'pay-emp-8', gymId: 'gym-a', employeeId: 'usr-accountant-1', employeeName: 'Vikram Mehta', role: UserRole.Staff, monthYear: 'June 2026', baseSalary: 45000, bonus: 0, deductions: 0, netPaid: 45000, status: 'Pending' }
];

const dbEmployeePerformance: EmployeePerformance[] = [
  { id: 'perf-1', gymId: 'gym-a', employeeId: 'usr-manager-1', employeeName: 'Rahul Sharma', rating: 4.8, reviewDate: '2026-06-01', feedback: 'Excellent management skills, keeps team motivated and operations smooth.', tasksAssignedCount: 15, tasksCompletedCount: 14 },
  { id: 'perf-2', gymId: 'gym-a', employeeId: 'usr-receptionist-1', employeeName: 'Kavita Patel', rating: 4.5, reviewDate: '2026-06-02', feedback: 'Very polite with members, highly organized. Needs slight improvement in handling peak hour crowd.', tasksAssignedCount: 10, tasksCompletedCount: 9 },
  { id: 'perf-3', gymId: 'gym-a', employeeId: 'usr-accountant-1', employeeName: 'Vikram Mehta', rating: 4.9, reviewDate: '2026-06-03', feedback: 'Flawless book-keeping, timely salary disbursements, clear expense tracking.', tasksAssignedCount: 8, tasksCompletedCount: 8 },
  { id: 'perf-4', gymId: 'gym-a', employeeId: 'trainer-1', employeeName: 'Rahul Dev', rating: 4.7, reviewDate: '2026-06-04', feedback: 'Great personal training feedback, members appreciate his customized plans.', tasksAssignedCount: 20, tasksCompletedCount: 18 }
];


// --- Mock Implementations ---

@Injectable({ providedIn: 'root' })
@Injectable({ providedIn: 'root' })
export class MockAuthRepository implements IAuthRepository {
  login(emailOrUsername: string, password: string): Observable<UserProfile> {
    const identifier = emailOrUsername.toLowerCase().trim();
    
    // Check if directly in mock accounts (email match)
    let user = dbMockAccounts[identifier];
    let emailKey = identifier;

    // Search in dbEmployees for a match on username or email
    if (!user) {
      const foundEmp = dbEmployees.find(e => 
        e.username?.toLowerCase() === identifier || 
        e.email?.toLowerCase() === identifier
      );
      if (foundEmp && foundEmp.email) {
        emailKey = foundEmp.email.toLowerCase().trim();
        user = dbMockAccounts[emailKey];
      }
    }

    const storedPassword = dbPasswords[emailKey] || 'password';
    if (user && password === storedPassword) {
      // Refresh session timestamps on each login
      const fresh = buildUser(user);
      dbMockAccounts[emailKey] = fresh;
      return of(fresh).pipe(delay(800));
    }
    return throwError(() => new Error('Invalid email, username or password. Hint: password'));
  }

  loginWithRole(role: UserRole): Observable<UserProfile> {
    const emailMap: Partial<Record<UserRole, string>> = {
      [UserRole.Owner]:      'owner@apexfit.com',
      [UserRole.Trainer]:    'trainer@apexfit.com',
      [UserRole.Staff]:      'staff@apexfit.com',
      [UserRole.SuperAdmin]: 'superadmin@apexfit.com',
      [UserRole.Manager]:    'manager@apexfit.com'
    };
    const email = emailMap[role] ?? 'owner@apexfit.com';
    const user = buildUser(dbMockAccounts[email]);
    dbMockAccounts[email] = user;
    return of(user).pipe(delay(500));
  }

  logout(): Observable<void> {
    return of(undefined).pipe(delay(200));
  }

  getUserProfile(userId: string): Observable<UserProfile | null> {
    const user = Object.values(dbMockAccounts).find(u => u.id === userId) ?? null;
    return of(user).pipe(delay(200));
  }

  inviteStaff(email: string, name: string, role: UserRole, gymId: string): Observable<UserProfile> {
    const emailKey = email.toLowerCase().trim();
    if (dbMockAccounts[emailKey]) {
      return throwError(() => new Error('This email is already registered.'));
    }
    const newUser = buildUser({
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      name,
      email,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      role,
      gymId,
      isFirstLogin: true
    });
    dbMockAccounts[emailKey] = newUser;
    dbPasswords[emailKey] = 'welcome123';
    return of(newUser).pipe(delay(600));
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
    const emailKey = email.toLowerCase().trim();
    if (dbMockAccounts[emailKey]) {
      return throwError(() => new Error('This email address is already registered.'));
    }

    const gymId = 'gym-' + Math.random().toString(36).substring(2, 9);
    const branchId = 'branch-' + Math.random().toString(36).substring(2, 9);
    const newGym: Gym = {
      gymId,
      gymName,
      ownerName,
      email,
      phone,
      subscriptionPlan: SubscriptionPlan.FreeTrial,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0],
      address: address || 'Not Specified',
      gstNumber: gstNumber || undefined,
      gymType: gymType || 'Unisex',
      openingTime: openingTime || '06:00',
      closingTime: closingTime || '22:00',
      branches: [
        {
          id: branchId,
          name: 'Main Branch',
          code: 'MAIN',
          address: address || 'Not Specified',
          manager: ownerName,
          phone: phone
        }
      ]
    };
    dbGyms.push(newGym);

    const newUser = buildUser({
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
      name: ownerName,
      email,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ownerName)}`,
      role: UserRole.Owner,
      gymId,
      branchId,
      accountStatus: 'Active'
    });
    dbMockAccounts[emailKey] = newUser;
    if (password) dbPasswords[emailKey] = password;

    const ownerEmployee: Employee = {
      id: newUser.id,
      gymId,
      branchId,
      fullName: ownerName,
      phone: phone,
      email,
      gender: 'Male',
      dob: '1990-01-01',
      address: address || 'Not Specified',
      role: UserRole.Owner,
      department: 'Management',
      joinDate: newGym.createdAt,
      salary: 0,
      shift: 'General',
      username: email.split('@')[0],
      accountStatus: 'Active',
      photoUrl: newUser.avatarUrl
    };
    dbEmployees.push(ownerEmployee);

    return of(newUser).pipe(delay(800));
  }

  changePassword(email: string, newPassword: string): Observable<void> {
    const emailKey = email.toLowerCase().trim();
    dbPasswords[emailKey] = newPassword;
    const user = dbMockAccounts[emailKey];
    if (user) {
      user.isFirstLogin = false;
      dbMockAccounts[emailKey] = user;
    }
    return of(undefined).pipe(delay(400));
  }

  clearFirstLoginFlag(email: string): Observable<void> {
    const emailKey = email.toLowerCase().trim();
    const user = dbMockAccounts[emailKey];
    if (user) {
      user.isFirstLogin = false;
      dbMockAccounts[emailKey] = user;
    }
    return of(undefined).pipe(delay(200));
  }

  getUsers(): Observable<UserProfile[]> {
    return of(Object.values(dbMockAccounts)).pipe(delay(200));
  }

  updateUserRole(userId: string, role: UserRole): Observable<void> {
    const user = Object.values(dbMockAccounts).find(u => u.id === userId);
    if (user) {
      user.role = role;
    }
    return of(undefined).pipe(delay(200));
  }

  waitForAuthResolution(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

@Injectable({ providedIn: 'root' })
export class MockGymRepository implements IGymRepository {
  getGyms(): Observable<Gym[]> {
    return of(dbGyms).pipe(delay(300));
  }

  getGymById(gymId: string): Observable<Gym | null> {
    const gym = dbGyms.find(g => g.gymId === gymId) || null;
    return of(gym).pipe(delay(200));
  }

  createGym(gym: Omit<Gym, 'gymId' | 'createdAt'>): Observable<Gym> {
    const newGym: Gym = {
      ...gym,
      gymId: 'gym-' + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString().split('T')[0]
    };
    dbGyms.push(newGym);
    return of(newGym).pipe(delay(300));
  }

  updateGym(gym: Gym): Observable<void> {
    const idx = dbGyms.findIndex(g => g.gymId === gym.gymId);
    if (idx !== -1) {
      dbGyms[idx] = gym;
    }
    return of(undefined).pipe(delay(200));
  }
}

@Injectable({ providedIn: 'root' })
export class MockOnboardingRepository implements IOnboardingRepository {
  sendVerificationCode(email: string): Observable<boolean> {
    console.log(`[MockOnboardingRepository] Verification code sent to ${email}`);
    return of(true).pipe(delay(1000));
  }

  verifyEmailCode(email: string, code: string): Observable<boolean> {
    const isValid = code.length === 6;
    return of(isValid).pipe(delay(800));
  }

  onboardWorkspace(payload: OnboardingData): Observable<{ gym: Gym; owner: UserProfile }> {
    const gymId = 'gym-' + Math.random().toString(36).substring(2, 9);
    const branchId = 'branch-' + Math.random().toString(36).substring(2, 9);
    const today = new Date();
    const trialExpiry = new Date();
    trialExpiry.setDate(today.getDate() + 14);

    const newGym: Gym = {
      gymId,
      gymName: payload.gymName,
      ownerName: payload.ownerFullName,
      email: payload.gymEmail,
      phone: payload.gymPhone,
      subscriptionPlan: SubscriptionPlan.FreeTrial,
      status: 'active',
      createdAt: today.toISOString().split('T')[0],
      address: payload.gymAddress,
      city: payload.gymCity,
      state: payload.gymState,
      country: payload.gymCountry,
      trialExpiryDate: trialExpiry.toISOString().split('T')[0],
      subscriptionStatus: 'trialing',
      branches: [
        {
          id: branchId,
          name: payload.branchName,
          code: payload.branchName.toUpperCase().replace(/\s+/g, '-').substring(0, 5),
          address: payload.branchAddress,
          manager: payload.ownerFullName,
          phone: payload.branchPhone
        }
      ],
      membershipSettings: {
        monthlyPrice: 1500,
        quarterlyPrice: 4000,
        halfYearlyPrice: 7500,
        annualPrice: 14000,
        autoExpiryEnabled: true,
        autoExpiryGraceDays: 3,
        renewalReminderDays: 7
      },
      paymentSettings: {
        currency: 'INR',
        enableCard: true,
        enableUPI: true,
        enableCash: true
      },
      invoiceSettings: {
        prefix: 'INV',
        taxName: 'GST',
        taxRate: 18
      },
      notificationSettings: {
        renewalRemindersEnabled: true,
        paymentRemindersEnabled: true,
        leadFollowUpsEnabled: true,
        attendanceRemindersEnabled: false
      }
    };

    dbGyms.push(newGym);

    const userId = 'usr-' + Math.random().toString(36).substring(2, 9);
    const ownerProfile = buildUser({
      id: userId,
      name: payload.ownerFullName,
      email: payload.ownerEmail,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(payload.ownerFullName)}`,
      role: UserRole.Owner,
      gymId: gymId,
      branchId: branchId,
      isFirstLogin: true,
      accountStatus: 'Active'
    });

    const emailKey = payload.ownerEmail.toLowerCase().trim();
    dbMockAccounts[emailKey] = ownerProfile;
    dbPasswords[emailKey] = payload.ownerPassword || 'password';

    const ownerEmployee: Employee = {
      id: userId,
      gymId,
      branchId,
      fullName: payload.ownerFullName,
      phone: payload.ownerPhone || payload.gymPhone,
      email: payload.ownerEmail,
      gender: 'Male',
      dob: '1990-01-01',
      address: payload.gymAddress || 'Not Specified',
      role: UserRole.Owner,
      department: 'Management',
      joinDate: today.toISOString().split('T')[0],
      salary: 0,
      shift: 'General',
      username: payload.ownerEmail.split('@')[0],
      accountStatus: 'Active',
      photoUrl: ownerProfile.avatarUrl
    };
    dbEmployees.push(ownerEmployee);

    if (payload.plans && payload.plans.length > 0) {
      payload.plans.forEach(planConfig => {
        if (planConfig.enabled) {
          dbPlans.push({
            id: 'plan-' + Math.random().toString(36).substring(2, 9),
            gymId,
            name: planConfig.name,
            type: 'membership',
            durationMonths: planConfig.durationMonths,
            duration: planConfig.durationMonths,
            durationUnit: 'months',
            price: planConfig.price,
            tax: 18,
            description: planConfig.description,
            features: planConfig.features,
            activeMembersCount: 0,
            isActive: true
          });
        }
      });
    }

    return of({ gym: newGym, owner: ownerProfile }).pipe(delay(2000));
  }
}

@Injectable({ providedIn: 'root' })
export class MockMemberRepository implements IMemberRepository {
  getMembers(gymId: string): Observable<Member[]> {
    return of(dbMembers.filter(m => m.gymId === gymId)).pipe(delay(300));
  }

  getMembersPaged(gymId: string, req: PagedRequest): Observable<PagedResponse<Member>> {
    return of(paginateData(dbMembers.filter(m => m.gymId === gymId), req)).pipe(delay(200));
  }

  getMemberById(gymId: string, id: string): Observable<Member | null> {
    const member = dbMembers.find(m => m.gymId === gymId && m.id === id) || null;
    return of(member).pipe(delay(200));
  }

  addMember(gymId: string, member: Omit<Member, 'id' | 'attendanceCount' | 'balance'>): Observable<Member> {
    const newMember: Member = {
      ...member,
      id: (member as any).id || 'mem-' + Math.random().toString(36).substring(2, 9),
      gymId,
      attendanceCount: 0,
      balance: member.status === 'inactive' ? 0 : this.getPlanPrice(gymId, member.planId)
    };
    dbMembers.unshift(newMember);
    return of(newMember).pipe(delay(300));
  }

  updateMember(gymId: string, member: Member): Observable<void> {
    const idx = dbMembers.findIndex(m => m.gymId === gymId && m.id === member.id);
    if (idx !== -1) {
      dbMembers[idx] = member;
    }
    return of(undefined).pipe(delay(200));
  }

  deleteMember(gymId: string, id: string): Observable<void> {
    const idx = dbMembers.findIndex(m => m.gymId === gymId && m.id === id);
    if (idx !== -1) {
      dbMembers.splice(idx, 1);
    }
    return of(undefined).pipe(delay(200));
  }

  registerMember(payload: LeadConversionPayload): Observable<LeadConversionResult> {
    const leadRepo = new MockLeadRepository();
    return leadRepo.convertLeadToMember(payload);
  }

  private getPlanPrice(gymId: string, planId: string): number {
    return dbPlans.find(p => p.gymId === gymId && p.id === planId)?.price || 0;
  }
}

@Injectable({ providedIn: 'root' })
export class MockPaymentRepository implements IPaymentRepository {
  getPayments(gymId: string): Observable<Payment[]> {
    return of(dbPayments.filter(p => p.gymId === gymId)).pipe(delay(300));
  }

  getPaymentsPaged(gymId: string, req: PagedRequest): Observable<PagedResponse<Payment>> {
    return of(paginateData(dbPayments.filter(p => p.gymId === gymId), req)).pipe(delay(200));
  }

  addPayment(gymId: string, payment: Omit<Payment, 'id'>): Observable<Payment> {
    // 1. Idempotency protection check: Gateway transaction ID cannot be reused
    if (payment.gatewayTransactionId) {
      const dup = dbPayments.find(p => p.gymId === gymId && p.gatewayTransactionId === payment.gatewayTransactionId);
      if (dup) {
        return throwError(() => new Error('Duplicate Payment: The Gateway Transaction ID has already been logged.'));
      }
    }
    // 1b. Idempotency protection check: Idempotency Key cannot be reused
    if (payment.idempotencyKey) {
      const dup = dbPayments.find(p => p.gymId === gymId && p.idempotencyKey === payment.idempotencyKey);
      if (dup) {
        return throwError(() => new Error('Duplicate Payment: The Idempotency Key has already been processed.'));
      }
    }

    // 2. Invoice locking & overpayment checks
    if (payment.invoiceId) {
      const invoice = dbInvoices.find(i => i.gymId === gymId && i.id === payment.invoiceId);
      if (invoice) {
        if (invoice.locked) {
          return throwError(() => new Error('Invoice Locked: This invoice is already paid and editing/payments are locked.'));
        }
        const outstanding = (invoice.finalAmount ?? invoice.amount) - (invoice.amountPaid ?? 0);
        if (payment.amount > outstanding + 0.01) {
          return throwError(() => new Error(`Overpayment Blocked: Payment amount ₹${payment.amount} exceeds remaining outstanding due of ₹${outstanding}.`));
        }
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const billingCalc = new BillingCalculationService();
    const calculations = billingCalc.calculate({
      originalAmount: payment.originalAmount || payment.amount,
      discountType: payment.discountType as any || 'none',
      discountValue: payment.discountValue || 0,
      paidAmount: payment.paidAmount || 0,
      dueDate: payment.dueDate || today
    });

    // Create Invoice
    const invoiceId = 'inv-mock-' + Math.random().toString(36).substring(2, 9);

    const newPayment: Payment = {
      ...payment,
      id: 'pay-' + Math.random().toString(36).substring(2, 9),
      gymId,
      amount: calculations.finalAmount,
      paidAmount: calculations.paidAmount,
      dueAmount: calculations.pendingAmount,
      status: calculations.paymentStatus as any,
      invoiceId: invoiceId
    };
    dbPayments.unshift(newPayment);

    const member = dbMembers.find(m => m.gymId === gymId && m.id === payment.memberId);
    if (member) {
      member.balance = calculations.pendingAmount;
    }
    dbInvoices.unshift({
      id: invoiceId,
      gymId,
      invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      memberId: payment.memberId,
      memberName: payment.memberName,
      membershipPlan: payment.planName,
      amount: calculations.subtotal,
      gst: calculations.taxAmount,
      discount: calculations.discountAmount,
      finalAmount: calculations.finalAmount,
      paymentMethod: calculations.paidAmount > 0 ? (payment.paymentMethod || 'Cash') : 'Pending',
      invoiceDate: payment.date || today,
      status: calculations.paymentStatus as any,
      collectedBy: payment.collectedBy || 'Sophia Chen',
      createdBy: payment.collectedBy || 'Sophia Chen',
      type: (payment as any).type || 'membership',
      trainerId: (payment as any).trainerId,
      trainerName: (payment as any).trainerName,
      originalAmount: calculations.originalAmount,
      discountType: calculations.discountType,
      discountValue: calculations.discountValue,
      amountPaid: calculations.paidAmount,
      pendingAmount: calculations.pendingAmount,
      dueDate: payment.dueDate || today,
      receiptNumber: calculations.paymentStatus === 'paid' ? `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}` : undefined
    });

    // Create Collection if paid amount is greater than 0
    if (calculations.paidAmount > 0) {
      dbCollections.unshift({
        id: 'col-mock-' + Math.random().toString(36).substring(2, 9),
        gymId,
        receiptNo: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        memberId: payment.memberId,
        memberName: payment.memberName,
        membershipPlan: payment.planName,
        amount: calculations.paidAmount,
        paymentMethod: payment.paymentMethod || 'Cash',
        date: payment.date || today,
        collectedBy: payment.collectedBy || 'Sophia Chen',
        type: (payment as any).type || 'membership',
        trainerId: (payment as any).trainerId,
        trainerName: (payment as any).trainerName
      });
    }

    return of(newPayment).pipe(delay(300));
  }

  confirmPayment(gymId: string, paymentId: string): Observable<void> {
    const payment = dbPayments.find(p => p.gymId === gymId && p.id === paymentId);
    if (payment) {
      // Idempotent: if already paid, do nothing
      if (payment.status === 'paid') {
        return of(undefined);
      }

      // Check if invoice is locked
      if (payment.invoiceId) {
        const inv = dbInvoices.find(i => i.gymId === gymId && i.id === payment.invoiceId);
        if (inv && inv.locked) {
          return throwError(() => new Error('Invoice Locked: Invoice editing/payments are locked.'));
        }
      }

      payment.status = 'paid';
      payment.paidAmount = payment.amount;
      payment.dueAmount = 0;
      const today = new Date().toISOString().split('T')[0];
      payment.date = today;

      // Check if invoice already exists
      const existingInv = dbInvoices.find(inv => inv.gymId === gymId && (inv.id === payment.invoiceId || (inv.memberId === payment.memberId && Math.abs(inv.finalAmount - payment.amount) < 0.01)));
      if (!existingInv) {
        const invoiceId = 'inv-mock-' + Math.random().toString(36).substring(2, 9);
        const gst = Math.round(payment.amount * 0.18 * 100) / 100;
        const baseAmount = payment.amount - gst;
        dbInvoices.unshift({
          id: invoiceId,
          gymId,
          invoiceNumber: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          memberId: payment.memberId,
          memberName: payment.memberName,
          membershipPlan: payment.planName,
          amount: Number(baseAmount.toFixed(2)),
          gst: Number(gst.toFixed(2)),
          discount: 0,
          finalAmount: payment.amount,
          paymentMethod: payment.paymentMethod || 'UPI',
          invoiceDate: today,
          status: 'paid',
          collectedBy: payment.collectedBy || 'Sophia Chen',
          createdBy: payment.collectedBy || 'Sophia Chen',
          type: (payment as any).type || 'membership',
          trainerId: (payment as any).trainerId,
          trainerName: (payment as any).trainerName,
          amountPaid: payment.amount,
          pendingAmount: 0,
          dueDate: payment.dueDate || today
        });
        payment.invoiceId = invoiceId;
      } else {
        existingInv.status = 'paid';
        existingInv.amountPaid = payment.amount;
        existingInv.pendingAmount = 0;
        existingInv.paymentMethod = payment.paymentMethod || 'UPI';
      }

      // Recalculate member balance
      const member = dbMembers.find(m => m.gymId === gymId && m.id === payment.memberId);
      if (member) {
        const memberInvoices = dbInvoices.filter(i => i.gymId === gymId && i.memberId === payment.memberId && i.status !== 'cancelled' && i.status !== 'paid');
        member.balance = memberInvoices.reduce((sum, inv) => sum + (inv.pendingAmount ?? ((inv.finalAmount ?? inv.amount ?? 0) - (inv.amountPaid ?? 0))), 0);
      }

      // Check if collection already exists
      const existingCol = dbCollections.find(col => col.gymId === gymId && col.memberId === payment.memberId && Math.abs(col.amount - payment.amount) < 0.01 && col.date === today);
      if (!existingCol) {
        dbCollections.unshift({
          id: 'col-mock-' + Math.random().toString(36).substring(2, 9),
          gymId,
          receiptNo: `REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
          memberId: payment.memberId,
          memberName: payment.memberName,
          membershipPlan: payment.planName,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod || 'UPI',
          date: today,
          collectedBy: payment.collectedBy || 'Sophia Chen',
          type: (payment as any).type || 'membership',
          trainerId: (payment as any).trainerId,
          trainerName: (payment as any).trainerName
        });
      }

      // If it is a PT payment, credit trainer revenue
      if (payment.type === 'pt' && payment.trainerId && payment.trainerId !== 'unassigned') {
        dbTrainerRevenue.unshift({
          id: 'tr-mock-' + Math.random().toString(36).substring(2, 9),
          gymId,
          branchId: (payment as any).branchId || 'br-1',
          trainerId: payment.trainerId,
          trainerName: payment.trainerName || 'Unassigned',
          memberId: payment.memberId,
          memberName: payment.memberName,
          amount: payment.amount, // credit amount
          date: today,
          invoiceId: paymentId,
          ptPlanName: payment.planName,
          salespersonId: payment.salespersonId || '',
          salespersonName: payment.salespersonName || ''
        });
      }
    }
    return of(undefined).pipe(delay(200));
  }

  deletePayment(gymId: string, id: string): Observable<void> {
    const idx = dbPayments.findIndex(p => p.gymId === gymId && p.id === id);
    if (idx !== -1) {
      dbPayments.splice(idx, 1);
    }
    return of(undefined).pipe(delay(100));
  }
}

@Injectable({ providedIn: 'root' })
export class MockPaymentSettingsRepository implements IPaymentSettingsRepository {
  getSettings(gymId: string): Observable<PaymentSettings[]> {
    return of(dbPaymentSettings.filter(s => s.gymId === gymId)).pipe(delay(200));
  }

  getSettingsByProvider(gymId: string, provider: string): Observable<PaymentSettings | null> {
    const settings = dbPaymentSettings.find(s => s.gymId === gymId && s.provider === provider);
    return of(settings || null).pipe(delay(200));
  }

  saveSettings(gymId: string, settings: PaymentSettings): Observable<void> {
    const idx = dbPaymentSettings.findIndex(s => s.gymId === gymId && s.provider === settings.provider);
    const updated: PaymentSettings = {
      ...settings,
      gymId,
      updatedAt: new Date().toISOString()
    };
    if (idx !== -1) {
      dbPaymentSettings[idx] = updated;
    } else {
      updated.id = 'ps-' + Math.random().toString(36).substring(2, 9);
      updated.createdAt = new Date().toISOString();
      dbPaymentSettings.push(updated);
    }
    return of(undefined).pipe(delay(200));
  }
}

@Injectable({ providedIn: 'root' })
export class MockLeadRepository implements ILeadRepository {
  getLeads(gymId: string): Observable<Lead[]> {
    return of(dbLeads.filter(l => l.gymId === gymId)).pipe(delay(300));
  }

  getLeadsPaged(gymId: string, req: PagedRequest): Observable<PagedResponse<Lead>> {
    return of(paginateData(dbLeads.filter(l => l.gymId === gymId), req)).pipe(delay(200));
  }

  addLead(gymId: string, lead: Omit<Lead, 'id'>): Observable<Lead> {
    const newLead: Lead = {
      ...lead,
      id: (lead as any).id || 'lead-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbLeads.unshift(newLead);
    return of(newLead).pipe(delay(300));
  }

  updateLead(gymId: string, lead: Lead): Observable<void> {
    const idx = dbLeads.findIndex(l => l.gymId === gymId && l.id === lead.id);
    if (idx !== -1) {
      dbLeads[idx] = lead;
    }
    return of(undefined).pipe(delay(200));
  }

  deleteLead(gymId: string, id: string): Observable<void> {
    const idx = dbLeads.findIndex(l => l.gymId === gymId && l.id === id);
    if (idx !== -1) {
      dbLeads.splice(idx, 1);
    }
    return of(undefined).pipe(delay(200));
  }

  convertLeadToMember(payload: any): Observable<any> {
    const { lead, memberData, membershipPlanPrice, conversionDetails, gymId, branchId, today } = payload;

    const memberId        = 'mem_mock_'  + Math.random().toString(36).substring(2, 9);
    const paymentId       = 'pay_mock_'  + Math.random().toString(36).substring(2, 9);
    const invoiceId       = 'inv_mock_'  + Math.random().toString(36).substring(2, 9);
    const mptId           = 'mpt_mock_'  + Math.random().toString(36).substring(2, 9);
    const taId            = 'ta_mock_'   + Math.random().toString(36).substring(2, 9);
    const ptPayId         = 'pay_mock_'  + Math.random().toString(36).substring(2, 9);
    const trId            = 'trev_mock_' + Math.random().toString(36).substring(2, 9);

    const hasPT   = conversionDetails.interestedInPT && !!conversionDetails.ptPlanId;
    const ptPlanPrice = hasPT ? (conversionDetails.ptPlanPrice || 0) : 0;

    // ── Unified Calculations ──
    const discountType = conversionDetails.discountType || 'none';
    const discountValue = conversionDetails.discountValue || 0;
    const paidAmount = conversionDetails.paidAmount || 0;

    const billingCalc = new BillingCalculationService();

    // Overall Calculation
    const overallCalc = billingCalc.calculate({
      originalAmount: membershipPlanPrice + ptPlanPrice,
      discountType: discountType as any,
      discountValue: discountValue,
      paidAmount: paidAmount,
      dueDate: today
    });

    let mDiscount = 0;
    let ptDiscount = 0;
    const totalOrig = membershipPlanPrice + ptPlanPrice;
    if (totalOrig > 0) {
      mDiscount = Math.round((overallCalc.discountAmount * (membershipPlanPrice / totalOrig)) * 100) / 100;
      ptDiscount = Math.round((overallCalc.discountAmount - mDiscount) * 100) / 100;
    }

    const mFinal = Math.max(0, membershipPlanPrice - mDiscount);
    const ptFinal = Math.max(0, ptPlanPrice - ptDiscount);

    let mPaid = 0;
    let ptPaid = 0;
    if (overallCalc.finalAmount > 0) {
      mPaid = Math.round((overallCalc.paidAmount * (mFinal / overallCalc.finalAmount)) * 100) / 100;
      ptPaid = Math.round((overallCalc.paidAmount - mPaid) * 100) / 100;
    }

    // Proportional calculation for membership
    const mCalc = billingCalc.calculate({
      originalAmount: membershipPlanPrice,
      discountType: 'flat',
      discountValue: mDiscount,
      paidAmount: mPaid,
      dueDate: today
    });

    // Proportional calculation for PT
    const ptCalc = billingCalc.calculate({
      originalAmount: ptPlanPrice,
      discountType: 'flat',
      discountValue: ptDiscount,
      paidAmount: ptPaid,
      dueDate: today
    });

    const mDue = mCalc.pendingAmount;
    const ptDue = ptCalc.pendingAmount;
    const totalDue = overallCalc.pendingAmount;

    const mStatus = mCalc.paymentStatus;
    const ptStatus = ptCalc.paymentStatus;
    const overallStatus = overallCalc.paymentStatus;
    const totalFinal = overallCalc.finalAmount;

    // ── 1. Create Member ──
    const defaultExpiry = new Date();
    defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
    const newMember: Member = {
      ...memberData,
      id: memberId,
      gymId,
      branchId: memberData.branchId || branchId,
      joinDate: memberData.joinDate || today,
      expiryDate: memberData.expiryDate || defaultExpiry.toISOString().split('T')[0],
      attendanceCount: 0,
      balance: totalDue,
      ...(hasPT ? {
        ptPlanId: conversionDetails.ptPlanId,
        ptPlanName: conversionDetails.ptPlanName,
        trainerId: conversionDetails.preferredTrainerId || 'unassigned',
        trainerName: conversionDetails.trainerName || 'Unassigned',
        ptGoal: conversionDetails.ptGoal,
        ptStartDate: today,
        ptEndDate: new Date(new Date().setMonth(new Date().getMonth() + (conversionDetails.ptPlanDuration || 1))).toISOString().split('T')[0],
        ptSessionsTotal: conversionDetails.ptSessionsTotal || 0,
        ptSessionsCompleted: 0,
        ptSessionsRemaining: conversionDetails.ptSessionsTotal || 0
      } : {})
    } as Member;
    dbMembers.unshift(newMember);

    // ── 2. Update Lead ──
    if (lead) {
      const match = dbLeads.find(l => l.gymId === gymId && l.id === lead.id);
      if (match) {
        match.status = 'Converted';
        match.convertedBy = conversionDetails.convertedBy;
        match.revenueGenerated = totalFinal;
      }
    }

    // ── 3. Membership Payment ──
    const mPayment: Payment = {
      id: paymentId,
      gymId,
      branchId,
      memberId,
      memberName: memberData.name,
      amount: mFinal,
      paidAmount: mPaid,
      dueAmount: mDue,
      dueDate: today,
      date: today,
      status: mStatus as any,
      planName: memberData.planName,
      paymentMethod: mPaid > 0 ? conversionDetails.paymentMethod : 'Pending',
      type: 'membership',
      collectedBy: conversionDetails.convertedBy,
      membershipPlanId: memberData.planId,
      originalAmount: membershipPlanPrice,
      discountType: discountType as any,
      discountValue: mDiscount,
      finalAmount: mFinal,
      discountGivenBy: conversionDetails.convertedBy,
      discountDate: today,
      salespersonId: conversionDetails.salespersonId || '',
      salespersonName: conversionDetails.salespersonName || '',
      invoiceId: invoiceId
    };
    dbPayments.unshift(mPayment);

    // ── 4. Unified Invoice ──
    const newInvoice: Invoice = {
      id: invoiceId,
      gymId,
      branchId,
      invoiceNumber: 'INV-MOCK-' + Date.now().toString().slice(-6),
      memberId,
      memberName: memberData.name,
      membershipPlan: memberData.planName,
      amount: overallCalc.subtotal,
      gst: overallCalc.taxAmount,
      discount: overallCalc.discountAmount,
      finalAmount: overallCalc.finalAmount,
      paymentMethod: overallCalc.paidAmount > 0 ? (conversionDetails.paymentMethod || 'Cash') : 'Pending',
      invoiceDate: today,
      status: overallStatus as any,
      collectedBy: conversionDetails.convertedBy,
      createdBy: conversionDetails.convertedBy,
      type: hasPT ? 'pt' : 'membership',
      membershipPlanId: memberData.planId,
      ptPlanId: conversionDetails.ptPlanId,
      originalAmount: overallCalc.originalAmount,
      discountType: discountType as any,
      discountValue: discountValue,
      amountPaid: overallCalc.paidAmount,
      pendingAmount: overallCalc.pendingAmount,
      dueDate: today,
      receiptNumber: overallStatus === 'paid' ? 'RCT-MOCK-' + Date.now().toString().slice(-6) : undefined
    };
    dbInvoices.unshift(newInvoice);

    // ── 4b. Membership Collection ──
    if (mPaid > 0) {
      dbCollections.unshift({
        id: 'col_mock_' + Math.random().toString(36).substring(2, 9),
        gymId,
        branchId,
        receiptNo: 'REC-MOCK-' + Date.now().toString().slice(-6),
        memberId,
        memberName: memberData.name,
        membershipPlan: memberData.planName,
        amount: mPaid,
        paymentMethod: conversionDetails.paymentMethod || 'UPI',
        date: today,
        collectedBy: conversionDetails.convertedBy,
        type: 'membership',
        membershipPlanId: memberData.planId,
        originalAmount: membershipPlanPrice,
        discountType: discountType as any,
        discountValue: mDiscount,
        finalAmount: mFinal,
        salespersonId: conversionDetails.salespersonId || '',
        salespersonName: conversionDetails.salespersonName || ''
      });
    }

    // ── 5. PT Wallet + Trainer Assignment + PT Payment ──
    if (hasPT) {
      const ptDuration = conversionDetails.ptPlanDuration || 1;
      const ptEndDate = new Date(new Date().setMonth(new Date().getMonth() + ptDuration)).toISOString().split('T')[0];

      dbMemberPTPlans.unshift({
        id: mptId,
        gymId,
        branchId,
        memberId,
        memberName: memberData.name,
        trainerId: conversionDetails.preferredTrainerId || 'unassigned',
        trainerName: conversionDetails.trainerName || 'Unassigned',
        planId: conversionDetails.ptPlanId || '',
        planName: conversionDetails.ptPlanName || '',
        price: ptFinal,
        totalSessions: conversionDetails.ptSessionsTotal || 0,
        completedSessions: 0,
        remainingSessions: conversionDetails.ptSessionsTotal || 0,
        expiredSessions: 0,
        ptGoal: conversionDetails.ptGoal || 'General Fitness',
        startDate: today,
        endDate: ptEndDate,
        status: 'active',
        salespersonId: conversionDetails.salespersonId || '',
        salespersonName: conversionDetails.salespersonName || '',
        history: [{ action: 'assign', date: today, trainerId: conversionDetails.preferredTrainerId, trainerName: conversionDetails.trainerName, planId: conversionDetails.ptPlanId, planName: conversionDetails.ptPlanName, notes: 'Initial assignment' }]
      });

      dbTrainerAssignments.unshift({
        id: taId,
        gymId,
        branchId,
        memberId,
        memberName: memberData.name,
        trainerId: conversionDetails.preferredTrainerId || 'unassigned',
        trainerName: conversionDetails.trainerName || 'Unassigned',
        assignedDate: today,
        status: 'active',
        ptGoal: conversionDetails.ptGoal || 'General Fitness'
      });

      const ptPayment: Payment = {
        id: ptPayId,
        gymId,
        branchId,
        memberId,
        memberName: memberData.name,
        amount: ptFinal,
        paidAmount: ptPaid,
        dueAmount: ptDue,
        dueDate: today,
        date: today,
        status: ptStatus as any,
        planName: conversionDetails.ptPlanName || 'PT Plan',
        paymentMethod: ptPaid > 0 ? conversionDetails.paymentMethod : 'Pending',
        type: 'pt',
        trainerId: conversionDetails.preferredTrainerId || 'unassigned',
        trainerName: conversionDetails.trainerName || 'Unassigned',
        collectedBy: conversionDetails.convertedBy,
        ptPlanId: conversionDetails.ptPlanId,
        originalAmount: ptPlanPrice,
        discountType: discountType as any,
        discountValue: ptDiscount,
        finalAmount: ptFinal,
        discountGivenBy: conversionDetails.convertedBy,
        discountDate: today,
        salespersonId: conversionDetails.salespersonId || '',
        salespersonName: conversionDetails.salespersonName || '',
        invoiceId: invoiceId
      };
      dbPayments.unshift(ptPayment);

      if (ptPaid > 0) {
        dbTrainerRevenue.unshift({
          id: trId,
          gymId,
          branchId,
          trainerId: conversionDetails.preferredTrainerId || 'unassigned',
          trainerName: conversionDetails.trainerName || 'Unassigned',
          memberId,
          memberName: memberData.name,
          amount: ptPaid,
          date: today,
          invoiceId: ptPayId,
          ptPlanName: conversionDetails.ptPlanName || 'PT Plan',
          salespersonId: conversionDetails.salespersonId || '',
          salespersonName: conversionDetails.salespersonName || ''
        });

        dbCollections.unshift({
          id: 'col_mock_' + Math.random().toString(36).substring(2, 9),
          gymId,
          branchId,
          receiptNo: 'REC-MOCK-' + Date.now().toString().slice(-6),
          memberId,
          memberName: memberData.name,
          membershipPlan: conversionDetails.ptPlanName || 'PT Plan',
          amount: ptPaid,
          paymentMethod: conversionDetails.paymentMethod || 'UPI',
          date: today,
          collectedBy: conversionDetails.convertedBy,
          type: 'pt',
          trainerId: conversionDetails.preferredTrainerId || 'unassigned',
          trainerName: conversionDetails.trainerName || 'Unassigned',
          ptPlanId: conversionDetails.ptPlanId,
          originalAmount: ptPlanPrice,
          discountType: discountType as any,
          discountValue: ptDiscount,
          finalAmount: ptFinal,
          salespersonId: conversionDetails.salespersonId || '',
          salespersonName: conversionDetails.salespersonName || ''
        });
      }
    }

    return of({
      memberId,
      membershipPaymentId: paymentId,
      invoiceId,
      ...(hasPT ? { memberPTPlanId: mptId, trainerAssignmentId: taId, ptPaymentId: ptPayId } : {})
    }).pipe(delay(400));
  }
}

@Injectable({ providedIn: 'root' })
export class MockTrainerRepository implements ITrainerRepository {
  getTrainers(gymId: string): Observable<Trainer[]> {
    return of(dbTrainers.filter(t => t.gymId === gymId)).pipe(delay(300));
  }

  addTrainer(gymId: string, trainer: Omit<Trainer, 'id' | 'membersCount'>): Observable<Trainer> {
    const newTrainer: Trainer = {
      ...trainer,
      id: (trainer as any).id || 'trainer-' + Math.random().toString(36).substring(2, 9),
      gymId,
      membersCount: 0
    };
    dbTrainers.push(newTrainer);
    return of(newTrainer).pipe(delay(300));
  }

  updateTrainer(gymId: string, trainer: Trainer): Observable<void> {
    const idx = dbTrainers.findIndex(t => t.gymId === gymId && t.id === trainer.id);
    if (idx !== -1) {
      dbTrainers[idx] = trainer;
    }
    return of(undefined).pipe(delay(200));
  }

  deleteTrainer(gymId: string, id: string): Observable<void> {
    const idx = dbTrainers.findIndex(t => t.gymId === gymId && t.id === id);
    if (idx !== -1) {
      dbTrainers.splice(idx, 1);
    }
    return of(undefined).pipe(delay(200));
  }
}

@Injectable({ providedIn: 'root' })
export class MockAttendanceRepository implements IAttendanceRepository {
  getAttendance(gymId: string): Observable<Attendance[]> {
    return of(dbAttendance.filter(a => a.gymId === gymId)).pipe(delay(300));
  }

  markAttendance(gymId: string, memberId: string, status: 'present' | 'absent', timeIn: string): Observable<Attendance> {
    const date = new Date().toISOString().split('T')[0];
    const existingIdx = dbAttendance.findIndex(a => a.gymId === gymId && a.memberId === memberId && a.date === date);

    if (existingIdx !== -1) {
      dbAttendance[existingIdx].status = status;
      dbAttendance[existingIdx].timeIn = timeIn;
      return of(dbAttendance[existingIdx]).pipe(delay(200));
    } else {
      const member = dbMembers.find(m => m.gymId === gymId && m.id === memberId);
      const newAttendance: Attendance = {
        id: 'att-' + Math.random().toString(36).substring(2, 9),
        gymId,
        memberId,
        memberName: member?.name || 'Unknown',
        date,
        timeIn,
        status
      };
      dbAttendance.unshift(newAttendance);

      if (status === 'present' && member) {
        member.attendanceCount += 1;
      }

      return of(newAttendance).pipe(delay(300));
    }
  }

  getDevices(gymId: string): Observable<DeviceConfiguration[]> {
    return of(dbDeviceConfigurations.filter(d => d.gymId === gymId)).pipe(delay(200));
  }

  saveDevice(gymId: string, device: DeviceConfiguration): Observable<void> {
    const existingIdx = dbDeviceConfigurations.findIndex(d => d.id === device.id);
    if (existingIdx !== -1) {
      dbDeviceConfigurations[existingIdx] = { ...device, gymId };
    } else {
      dbDeviceConfigurations.push({ ...device, gymId });
    }
    return of(undefined).pipe(delay(200));
  }

  deleteDevice(gymId: string, deviceId: string): Observable<void> {
    const existingIdx = dbDeviceConfigurations.findIndex(d => d.id === deviceId);
    if (existingIdx !== -1) {
      dbDeviceConfigurations.splice(existingIdx, 1);
    }
    return of(undefined).pipe(delay(200));
  }

  getMappings(gymId: string): Observable<AttendanceMapping[]> {
    return of(dbAttendanceMappings.filter(m => m.gymId === gymId)).pipe(delay(200));
  }

  saveMapping(gymId: string, mapping: AttendanceMapping): Observable<void> {
    const existingIdx = dbAttendanceMappings.findIndex(m => m.id === mapping.id);
    if (existingIdx !== -1) {
      dbAttendanceMappings[existingIdx] = { ...mapping, gymId };
    } else {
      dbAttendanceMappings.push({ ...mapping, gymId });
    }
    return of(undefined).pipe(delay(200));
  }

  deleteMapping(gymId: string, mappingId: string): Observable<void> {
    const existingIdx = dbAttendanceMappings.findIndex(m => m.id === mappingId);
    if (existingIdx !== -1) {
      dbAttendanceMappings.splice(existingIdx, 1);
    }
    return of(undefined).pipe(delay(200));
  }

  updateDeviceSyncTime(gymId: string, deviceId: string, syncTime: string): Observable<void> {
    const device = dbDeviceConfigurations.find(d => d.id === deviceId);
    if (device) {
      device.lastSyncTime = syncTime;
    }
    return of(undefined).pipe(delay(200));
  }
}

@Injectable({ providedIn: 'root' })
export class MockMembershipPlanRepository implements IMembershipPlanRepository {
  getPlans(gymId: string): Observable<MembershipPlan[]> {
    dbPlans.forEach(p => {
      if (p.gymId === gymId) {
        p.activeMembersCount = dbMembers.filter(m => m.gymId === gymId && m.planId === p.id && m.status === 'active').length;
      }
    });
    return of(dbPlans.filter(p => p.gymId === gymId)).pipe(delay(300));
  }

  addPlan(gymId: string, plan: Omit<MembershipPlan, 'id' | 'activeMembersCount'>): Observable<MembershipPlan> {
    const newPlan: MembershipPlan = {
      ...plan,
      id: (plan as any).id || 'plan-' + Math.random().toString(36).substring(2, 9),
      gymId,
      activeMembersCount: 0
    };
    dbPlans.push(newPlan);
    return of(newPlan).pipe(delay(300));
  }

  updatePlan(gymId: string, plan: MembershipPlan): Observable<void> {
    const idx = dbPlans.findIndex(p => p.gymId === gymId && p.id === plan.id);
    if (idx !== -1) {
      dbPlans[idx] = plan;
    }
    return of(undefined).pipe(delay(200));
  }

  deletePlan(gymId: string, id: string): Observable<void> {
    const idx = dbPlans.findIndex(p => p.gymId === gymId && p.id === id);
    if (idx !== -1) {
      dbPlans.splice(idx, 1);
    }
    return of(undefined).pipe(delay(200));
  }
}

@Injectable({ providedIn: 'root' })
export class MockActivityLogRepository implements IActivityLogRepository {
  getLogs(gymId: string): Observable<ActivityLog[]> {
    return of(dbLogs.filter(l => l.gymId === gymId)).pipe(delay(200));
  }

  addLog(gymId: string, text: string, type: 'join' | 'payment' | 'attendance' | 'plan-change'): Observable<ActivityLog> {
    const newLog: ActivityLog = {
      id: 'log-' + Math.random().toString(36).substring(2, 9),
      gymId,
      text,
      time: 'Just now',
      type
    };
    dbLogs.unshift(newLog);
    const gymLogs = dbLogs.filter(l => l.gymId === gymId);
    if (gymLogs.length > 20) {
      const excessIndex = dbLogs.findIndex(l => l.gymId === gymId && l.id === gymLogs[gymLogs.length - 1].id);
      if (excessIndex !== -1) dbLogs.splice(excessIndex, 1);
    }
    return of(newLog).pipe(delay(100));
  }
}

@Injectable({ providedIn: 'root' })
export class MockWhatsAppRepository implements IWhatsAppRepository {
  getTemplates(gymId: string): Observable<WhatsAppTemplate[]> {
    return of(dbWhatsAppTemplates.filter(t => t.gymId === gymId)).pipe(delay(200));
  }

  addTemplate(gymId: string, template: Omit<WhatsAppTemplate, 'id'>): Observable<WhatsAppTemplate> {
    const newTpl: WhatsAppTemplate = {
      ...template,
      id: 'tpl_' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbWhatsAppTemplates.push(newTpl);
    return of(newTpl).pipe(delay(200));
  }

  updateTemplate(gymId: string, template: WhatsAppTemplate): Observable<void> {
    const idx = dbWhatsAppTemplates.findIndex(t => t.gymId === gymId && t.id === template.id);
    if (idx !== -1) {
      dbWhatsAppTemplates[idx] = template;
    }
    return of(undefined).pipe(delay(200));
  }

  deleteTemplate(gymId: string, id: string): Observable<void> {
    const idx = dbWhatsAppTemplates.findIndex(t => t.gymId === gymId && t.id === id);
    if (idx !== -1) dbWhatsAppTemplates.splice(idx, 1);
    return of(undefined).pipe(delay(200));
  }


  getReminders(gymId: string): Observable<WhatsAppReminder[]> {
    return of(dbWhatsAppReminders.filter(r => r.gymId === gymId)).pipe(delay(200));
  }

  addReminder(gymId: string, reminder: Omit<WhatsAppReminder, 'id'>): Observable<WhatsAppReminder> {
    const newReminder: WhatsAppReminder = {
      ...reminder,
      id: 'rem-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbWhatsAppReminders.unshift(newReminder);
    return of(newReminder).pipe(delay(200));
  }

  updateReminder(gymId: string, reminder: WhatsAppReminder): Observable<void> {
    const idx = dbWhatsAppReminders.findIndex(r => r.gymId === gymId && r.id === reminder.id);
    if (idx !== -1) {
      dbWhatsAppReminders[idx] = reminder;
    }
    return of(undefined).pipe(delay(200));
  }

  deleteReminder(gymId: string, id: string): Observable<void> {
    const idx = dbWhatsAppReminders.findIndex(r => r.gymId === gymId && r.id === id);
    if (idx !== -1) {
      dbWhatsAppReminders.splice(idx, 1);
    }
    return of(undefined).pipe(delay(200));
  }
}

const dbBodyProgressEntries: BodyProgressEntry[] = [
  // Amit Sharma (mem-1) - Gym A
  { id: 'bp-1', memberId: 'mem-1', gymId: 'gym-a', date: '2026-01-10', weight: 85.0, bodyFat: 22.0, chest: 104, waist: 94, arms: 36.0, thighs: 60, shoulder: 118, bmi: 25.7, notes: 'Starting weight assessment. Focus on strength training and high protein diet.', frontPhoto: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', sidePhoto: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400', backPhoto: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400' },
  { id: 'bp-2', memberId: 'mem-1', gymId: 'gym-a', date: '2026-02-10', weight: 83.5, bodyFat: 21.0, chest: 103, waist: 92, arms: 36.5, thighs: 59, shoulder: 119, bmi: 25.2, notes: 'Feeling stronger. Waist size dropping.', frontPhoto: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', sidePhoto: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400', backPhoto: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400' },
  { id: 'bp-3', memberId: 'mem-1', gymId: 'gym-a', date: '2026-03-10', weight: 82.0, bodyFat: 19.5, chest: 102, waist: 90, arms: 37.0, thighs: 58, shoulder: 120, bmi: 24.8, notes: 'Progressing well. Muscle definition improving.', frontPhoto: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', sidePhoto: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400', backPhoto: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400' },
  { id: 'bp-4', memberId: 'mem-1', gymId: 'gym-a', date: '2026-04-10', weight: 80.5, bodyFat: 18.0, chest: 102, waist: 87, arms: 37.5, thighs: 57, shoulder: 121, bmi: 24.3, notes: 'Steady weight loss, strength parameters are still going up.', frontPhoto: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', sidePhoto: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400', backPhoto: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400' },
  { id: 'bp-5', memberId: 'mem-1', gymId: 'gym-a', date: '2026-05-10', weight: 79.0, bodyFat: 16.5, chest: 101, waist: 85, arms: 38.0, thighs: 56, shoulder: 122, bmi: 23.8, notes: 'Almost reached goal weight. Feeling amazing.', frontPhoto: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', sidePhoto: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400', backPhoto: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400' },

  // Priya Patel (mem-2) - Gym A
  { id: 'bp-6', memberId: 'mem-2', gymId: 'gym-a', date: '2026-02-15', weight: 65.0, bodyFat: 28.0, chest: 92, waist: 76, arms: 28.0, thighs: 55, shoulder: 102, bmi: 23.9, notes: 'First evaluation. Goal is fat loss and cardiovascular health.', frontPhoto: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=400', sidePhoto: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400', backPhoto: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400' },
  { id: 'bp-7', memberId: 'mem-2', gymId: 'gym-a', date: '2026-03-15', weight: 63.0, bodyFat: 26.5, chest: 91, waist: 73, arms: 27.5, thighs: 54, shoulder: 101, bmi: 23.1, notes: 'Increased cardio frequency. Waist reduced by 3cm.', frontPhoto: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=400', sidePhoto: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400', backPhoto: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400' },
  { id: 'bp-8', memberId: 'mem-2', gymId: 'gym-a', date: '2026-04-15', weight: 61.0, bodyFat: 25.0, chest: 90, waist: 71, arms: 27.0, thighs: 53, shoulder: 100, bmi: 22.4, notes: 'Significant improvements in breathing and core strength.', frontPhoto: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=400', sidePhoto: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400', backPhoto: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400' },
  { id: 'bp-9', memberId: 'mem-2', gymId: 'gym-a', date: '2026-05-15', weight: 59.0, bodyFat: 23.5, chest: 89, waist: 69, arms: 26.8, thighs: 52, shoulder: 99, bmi: 21.7, notes: 'Very close to goal weight. Increased muscle tone.', frontPhoto: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=400', sidePhoto: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400', backPhoto: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400' },
  { id: 'bp-10', memberId: 'mem-2', gymId: 'gym-a', date: '2026-06-05', weight: 58.0, bodyFat: 22.8, chest: 88, waist: 68, arms: 26.5, thighs: 52, shoulder: 98, bmi: 21.3, notes: 'Maintenance phase initiated. Excellent energy levels.', frontPhoto: 'https://images.unsplash.com/photo-1518310383802-640c2de311b2?w=400', sidePhoto: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400', backPhoto: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400' },

  // Rajesh Kumar (mem-3) - Gym A
  { id: 'bp-11', memberId: 'mem-3', gymId: 'gym-a', date: '2026-03-08', weight: 95.0, bodyFat: 26.0, chest: 110, waist: 98, arms: 38.0, thighs: 62, shoulder: 122, bmi: 25.5, notes: 'Starting assessment. Main focus is strength and general fitness.', frontPhoto: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400', sidePhoto: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400', backPhoto: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400' },
  { id: 'bp-12', memberId: 'mem-3', gymId: 'gym-a', date: '2026-04-08', weight: 92.0, bodyFat: 24.5, chest: 109, waist: 95, arms: 38.5, thighs: 61, shoulder: 123, bmi: 24.7, notes: 'Weight drops, lifting capacity increased.', frontPhoto: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400', sidePhoto: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400', backPhoto: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400' },
  { id: 'bp-13', memberId: 'mem-3', gymId: 'gym-a', date: '2026-05-08', weight: 90.0, bodyFat: 23.0, chest: 108, waist: 92, arms: 39.0, thighs: 60, shoulder: 124, bmi: 24.2, notes: 'Steady progress. Visible improvements in shoulders and arms.', frontPhoto: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400', sidePhoto: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400', backPhoto: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400' },
  { id: 'bp-14', memberId: 'mem-3', gymId: 'gym-a', date: '2026-06-04', weight: 88.0, bodyFat: 21.8, chest: 108, waist: 89, arms: 39.5, thighs: 59, shoulder: 125, bmi: 23.6, notes: 'Highly consistent. Approaching ideal parameters.', frontPhoto: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400', sidePhoto: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400', backPhoto: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400' }
];

@Injectable({ providedIn: 'root' })
export class MockBodyProgressRepository implements IBodyProgressRepository {
  getEntries(gymId: string, memberId: string): Observable<BodyProgressEntry[]> {
    const entries = dbBodyProgressEntries.filter(e => e.gymId === gymId && e.memberId === memberId);
    entries.sort((a, b) => b.date.localeCompare(a.date));
    return of(entries).pipe(delay(300));
  }

  getAllEntries(gymId: string): Observable<BodyProgressEntry[]> {
    const entries = dbBodyProgressEntries.filter(e => e.gymId === gymId);
    entries.sort((a, b) => b.date.localeCompare(a.date));
    return of(entries).pipe(delay(300));
  }

  addEntry(gymId: string, entry: Omit<BodyProgressEntry, 'id'>): Observable<BodyProgressEntry> {
    const newEntry: BodyProgressEntry = {
      ...entry,
      id: 'bp-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbBodyProgressEntries.unshift(newEntry);

    // Update weight inside the member in the database
    const member = dbMembers.find(m => m.gymId === gymId && m.id === entry.memberId);
    if (member) {
      member.weight = entry.weight;
    }

    return of(newEntry).pipe(delay(300));
  }

  deleteEntry(gymId: string, id: string): Observable<void> {
    const idx = dbBodyProgressEntries.findIndex(e => e.gymId === gymId && e.id === id);
    if (idx !== -1) {
      dbBodyProgressEntries.splice(idx, 1);
    }
    return of(undefined).pipe(delay(200));
  }
}

@Injectable({ providedIn: 'root' })
export class MockFinanceRepository implements IFinanceRepository {
  getExpenses(gymId: string): Observable<Expense[]> {
    return of(dbExpenses.filter(e => e.gymId === gymId)).pipe(delay(300));
  }

  addExpense(gymId: string, expense: Omit<Expense, 'id'>): Observable<Expense> {
    const newExpense: Expense = {
      ...expense,
      id: 'exp-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbExpenses.unshift(newExpense);
    return of(newExpense).pipe(delay(300));
  }

  updateExpense(gymId: string, expense: Expense): Observable<void> {
    const idx = dbExpenses.findIndex(e => e.gymId === gymId && e.id === expense.id);
    if (idx !== -1) {
      dbExpenses[idx] = expense;
    }
    return of(undefined).pipe(delay(200));
  }

  deleteExpense(gymId: string, id: string): Observable<void> {
    const idx = dbExpenses.findIndex(e => e.gymId === gymId && e.id === id);
    if (idx !== -1) {
      dbExpenses.splice(idx, 1);
    }
    return of(undefined).pipe(delay(200));
  }

  getInvoices(gymId: string): Observable<Invoice[]> {
    return of(dbInvoices.filter(i => i.gymId === gymId)).pipe(delay(300));
  }

  addInvoice(gymId: string, invoice: Omit<Invoice, 'id'>): Observable<Invoice> {
    const newInvoice: Invoice = {
      ...invoice,
      id: (invoice as any).id || 'inv-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbInvoices.unshift(newInvoice);
    return of(newInvoice).pipe(delay(300));
  }

  updateInvoice(gymId: string, invoice: Invoice): Observable<void> {
    const idx = dbInvoices.findIndex(i => i.gymId === gymId && i.id === invoice.id);
    if (idx !== -1) {
      dbInvoices[idx] = invoice;

      // Keep dbPayments in sync!
      const payment = dbPayments.find(p => p.gymId === gymId && p.invoiceId === invoice.id);
      if (payment) {
        payment.paidAmount = invoice.amountPaid ?? 0;
        payment.dueAmount = invoice.pendingAmount ?? 0;
        payment.status = invoice.status;
        if (invoice.paymentMethod) {
          payment.paymentMethod = invoice.paymentMethod;
        }
      }

      // Update Member Balance!
      const member = dbMembers.find(m => m.gymId === gymId && m.id === invoice.memberId);
      if (member) {
        const memberInvoices = dbInvoices.filter(i => i.gymId === gymId && i.memberId === invoice.memberId && i.status !== 'cancelled' && i.status !== 'paid');
        member.balance = memberInvoices.reduce((sum, inv) => sum + (inv.pendingAmount ?? ((inv.finalAmount ?? inv.amount ?? 0) - (inv.amountPaid ?? 0))), 0);
      }
    }
    return of(undefined).pipe(delay(200));
  }

  getCollections(gymId: string): Observable<Collection[]> {
    return of(dbCollections.filter(c => c.gymId === gymId)).pipe(delay(300));
  }

  addCollection(gymId: string, collection: Omit<Collection, 'id'>): Observable<Collection> {
    const newCollection: Collection = {
      ...collection,
      id: (collection as any).id || 'col-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbCollections.unshift(newCollection);
    return of(newCollection).pipe(delay(300));
  }

  deleteInvoice(gymId: string, id: string): Observable<void> {
    const idx = dbInvoices.findIndex(i => i.gymId === gymId && i.id === id);
    if (idx !== -1) dbInvoices.splice(idx, 1);
    return of(undefined).pipe(delay(200));
  }

  deleteCollection(gymId: string, id: string): Observable<void> {
    const idx = dbCollections.findIndex(c => c.gymId === gymId && c.id === id);
    if (idx !== -1) dbCollections.splice(idx, 1);
    return of(undefined).pipe(delay(200));
  }
}
@Injectable({ providedIn: 'root' })
export class MockEmployeeRepository implements IEmployeeRepository {
  getEmployees(gymId: string): Observable<Employee[]> {
    return of(dbEmployees.filter(e => e.gymId === gymId)).pipe(delay(300));
  }

  getEmployeeById(gymId: string, id: string): Observable<Employee | null> {
    const emp = dbEmployees.find(e => e.gymId === gymId && e.id === id) || null;
    return of(emp).pipe(delay(200));
  }

  addEmployee(gymId: string, employee: Omit<Employee, 'id'>): Observable<Employee> {
    if (employee.email) {
      const emailKey = employee.email.toLowerCase().trim();
      const duplicateEmp = dbEmployees.find(e => e.gymId === gymId && e.email.toLowerCase().trim() === emailKey);
      if (duplicateEmp && !(employee as any).id) {
        return throwError(() => new Error('An employee with this email already exists.'));
      }
    }

    const id = (employee as any).id || 'emp-' + Math.random().toString(36).substring(2, 9);
    
    const generateSecurePassword = (length: number = 10): string => {
      const lowercase = 'abcdefghijklmnopqrstuvwxyz';
      const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const numbers = '0123456789';
      const symbols = '!@#$%^&*';
      const allChars = lowercase + uppercase + numbers + symbols;
      
      let pwd = '';
      pwd += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
      pwd += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
      pwd += numbers.charAt(Math.floor(Math.random() * numbers.length));
      pwd += symbols.charAt(Math.floor(Math.random() * symbols.length));
      
      for (let i = 4; i < length; i++) {
        pwd += allChars.charAt(Math.floor(Math.random() * allChars.length));
      }
      return pwd.split('').sort(() => 0.5 - Math.random()).join('');
    };

    const generatedPassword = generateSecurePassword();

    const newEmp: Employee = {
      ...employee,
      id,
      gymId,
      password: generatedPassword
    };
    dbEmployees.push(newEmp);

    // If there is an email, create a login account for them in mock db
    if (newEmp.email) {
      const emailKey = newEmp.email.toLowerCase().trim();
      dbMockAccounts[emailKey] = buildUser({
        id: newEmp.id,
        name: newEmp.fullName,
        email: newEmp.email,
        avatarUrl: newEmp.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newEmp.fullName)}`,
        role: newEmp.role,
        gymId,
        isFirstLogin: true
      });
      dbPasswords[emailKey] = generatedPassword;
    }

    return of(newEmp).pipe(delay(300));
  }

  updateEmployee(gymId: string, employee: Employee): Observable<void> {
    const idx = dbEmployees.findIndex(e => e.gymId === gymId && e.id === employee.id);
    if (idx !== -1) {
      dbEmployees[idx] = employee;
      
      // Update the user profile if it exists in dbMockAccounts
      if (employee.email) {
        const emailKey = employee.email.toLowerCase().trim();
        const existingUser = dbMockAccounts[emailKey];
        if (existingUser) {
          dbMockAccounts[emailKey] = {
            ...existingUser,
            name: employee.fullName,
            role: employee.role,
            avatarUrl: employee.photoUrl || existingUser.avatarUrl
          };
        }
      }
    }
    return of(undefined).pipe(delay(200));
  }

  deleteEmployee(gymId: string, id: string): Observable<void> {
    const idx = dbEmployees.findIndex(e => e.gymId === gymId && e.id === id);
    if (idx !== -1) {
      const emp = dbEmployees[idx];
      dbEmployees.splice(idx, 1);
      
      if (emp.email) {
        delete dbMockAccounts[emp.email.toLowerCase().trim()];
      }
    }
    return of(undefined).pipe(delay(200));
  }

  // Attendance
  getAttendance(gymId: string): Observable<EmployeeAttendance[]> {
    return of(dbEmployeeAttendance.filter(a => a.gymId === gymId)).pipe(delay(300));
  }

  markAttendance(gymId: string, record: Omit<EmployeeAttendance, 'id'>): Observable<EmployeeAttendance> {
    const newRecord: EmployeeAttendance = {
      ...record,
      id: 'att-emp-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbEmployeeAttendance.push(newRecord);
    return of(newRecord).pipe(delay(200));
  }

  // Payroll
  getPayroll(gymId: string): Observable<EmployeePayroll[]> {
    return of(dbEmployeePayroll.filter(p => p.gymId === gymId)).pipe(delay(300));
  }

  addPayroll(gymId: string, payroll: Omit<EmployeePayroll, 'id'>): Observable<EmployeePayroll> {
    const newPayroll: EmployeePayroll = {
      ...payroll,
      id: 'pay-emp-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbEmployeePayroll.push(newPayroll);
    return of(newPayroll).pipe(delay(200));
  }

  // Performance
  getPerformance(gymId: string): Observable<EmployeePerformance[]> {
    return of(dbEmployeePerformance.filter(p => p.gymId === gymId)).pipe(delay(300));
  }

  addPerformance(gymId: string, performance: Omit<EmployeePerformance, 'id'>): Observable<EmployeePerformance> {
    const newPerformance: EmployeePerformance = {
      ...performance,
      id: 'perf-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbEmployeePerformance.push(newPerformance);
    return of(newPerformance).pipe(delay(200));
  }
}

// --- Personal Training DB Seed Data ---
const dbPTPlans: PTPlan[] = [
  { id: 'pt-1', gymId: 'gym-a', branchId: 'br-1', name: 'PT Monthly', type: 'pt', price: 6000, tax: 18, numberOfSessions: 12, duration: 1, durationUnit: 'months', description: '12 sessions of customized personal coaching per month.', isActive: true },
  { id: 'pt-2', gymId: 'gym-a', branchId: 'br-1', name: 'PT Quarterly', type: 'pt', price: 15000, tax: 18, numberOfSessions: 36, duration: 3, durationUnit: 'months', description: '36 sessions of comprehensive strength and conditioning.', isActive: true },
  { id: 'pt-3', gymId: 'gym-a', branchId: 'br-1', name: 'PT Annual', type: 'pt', price: 50000, tax: 18, numberOfSessions: 144, duration: 12, durationUnit: 'months', description: '144 sessions of complete transformation package.', isActive: true }
];

const dbPTSessions: PTSession[] = [
  {
    id: 'pts-1',
    gymId: 'gym-a',
    branchId: 'br-1',
    memberId: 'mem-1',
    memberName: 'Amit Sharma',
    trainerId: 'trainer-1',
    trainerName: 'Rahul Dev',
    date: '2026-06-15',
    time: '10:00 AM',
    status: 'completed',
    notes: 'Focus on chest and triceps. Good intensity.',
    attendanceStatus: 'present'
  },
  {
    id: 'pts-2',
    gymId: 'gym-a',
    branchId: 'br-1',
    memberId: 'mem-1',
    memberName: 'Amit Sharma',
    trainerId: 'trainer-1',
    trainerName: 'Rahul Dev',
    date: '2026-06-17',
    time: '09:00 AM',
    status: 'scheduled',
    notes: 'Leg day - squats and lunges focus.',
    attendanceStatus: 'pending'
  }
];

const dbTrainerAssignments: TrainerAssignment[] = [
  {
    id: 'ta-1',
    gymId: 'gym-a',
    branchId: 'br-1',
    memberId: 'mem-1',
    memberName: 'Amit Sharma',
    trainerId: 'trainer-1',
    trainerName: 'Rahul Dev',
    assignedDate: '2026-04-10',
    status: 'active',
    ptGoal: 'Muscle Gain'
  }
];

const dbSessionHistory: SessionHistory[] = [
  {
    id: 'sh-1',
    gymId: 'gym-a',
    branchId: 'br-1',
    sessionId: 'pts-1',
    memberId: 'mem-1',
    trainerId: 'trainer-1',
    action: 'schedule',
    timestamp: '2026-06-14T10:00:00.000Z',
    performedBy: 'Rahul Dev',
    notes: 'Session scheduled'
  },
  {
    id: 'sh-2',
    gymId: 'gym-a',
    branchId: 'br-1',
    sessionId: 'pts-1',
    memberId: 'mem-1',
    trainerId: 'trainer-1',
    action: 'complete',
    timestamp: '2026-06-15T11:00:00.000Z',
    performedBy: 'Rahul Dev',
    notes: 'Session marked complete'
  }
];

const dbTrainerRevenue: TrainerRevenue[] = [
  {
    id: 'tr-1',
    gymId: 'gym-a',
    branchId: 'br-1',
    trainerId: 'trainer-1',
    trainerName: 'Rahul Dev',
    memberId: 'mem-1',
    memberName: 'Amit Sharma',
    amount: 15000,
    date: '2026-04-10',
    invoiceId: 'inv-2',
    ptPlanName: 'PT Quarterly'
  }
];

const dbMemberPTPlans: MemberPTPlan[] = [
  {
    id: 'mpt-1',
    gymId: 'gym-a',
    branchId: 'br-1',
    memberId: 'mem-1',
    memberName: 'Amit Sharma',
    trainerId: 'trainer-1',
    trainerName: 'Rahul Dev',
    planId: 'pt-2',
    planName: 'PT Quarterly',
    price: 15000,
    totalSessions: 36,
    completedSessions: 10,
    remainingSessions: 26,
    expiredSessions: 0,
    ptGoal: 'Muscle Gain',
    startDate: '2026-04-10',
    endDate: '2026-07-10',
    status: 'active',
    history: [
      { action: 'assign', date: '2026-04-10', trainerId: 'trainer-1', trainerName: 'Rahul Dev', planId: 'pt-2', planName: 'PT Quarterly', notes: 'Initial assignment' }
    ]
  }
];

@Injectable({ providedIn: 'root' })
export class MockPersonalTrainingRepository implements IPersonalTrainingRepository {
  getPTPlans(gymId: string): Observable<PTPlan[]> {
    return of(dbPTPlans.filter(p => p.gymId === gymId)).pipe(delay(200));
  }

  addPTPlan(gymId: string, plan: Omit<PTPlan, 'id'>): Observable<PTPlan> {
    const newPlan: PTPlan = {
      ...plan,
      id: 'pt-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbPTPlans.push(newPlan);
    return of(newPlan).pipe(delay(200));
  }

  updatePTPlan(gymId: string, plan: PTPlan): Observable<void> {
    const idx = dbPTPlans.findIndex(p => p.gymId === gymId && p.id === plan.id);
    if (idx !== -1) {
      dbPTPlans[idx] = plan;
    }
    return of(undefined).pipe(delay(200));
  }

  deletePTPlan(gymId: string, id: string): Observable<void> {
    const idx = dbPTPlans.findIndex(p => p.gymId === gymId && p.id === id);
    if (idx !== -1) {
      dbPTPlans.splice(idx, 1);
    }
    return of(undefined).pipe(delay(200));
  }

  getPTSessions(gymId: string): Observable<PTSession[]> {
    return of(dbPTSessions.filter(s => s.gymId === gymId)).pipe(delay(200));
  }

  addPTSession(gymId: string, session: Omit<PTSession, 'id'>): Observable<PTSession> {
    const newSession: PTSession = {
      ...session,
      id: 'pts-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbPTSessions.push(newSession);
    
    const hist: SessionHistory = {
      id: 'sh-' + Math.random().toString(36).substring(2, 9),
      gymId,
      branchId: session.branchId,
      sessionId: newSession.id,
      memberId: session.memberId,
      trainerId: session.trainerId,
      action: 'schedule',
      timestamp: new Date().toISOString(),
      performedBy: session.trainerName,
      notes: 'Session scheduled'
    };
    dbSessionHistory.push(hist);

    return of(newSession).pipe(delay(200));
  }

  updatePTSession(gymId: string, session: PTSession): Observable<void> {
    const idx = dbPTSessions.findIndex(s => s.gymId === gymId && s.id === session.id);
    if (idx !== -1) {
      const oldSession = dbPTSessions[idx];
      dbPTSessions[idx] = session;

      let action: SessionHistory['action'] = 'add_notes';
      let note = 'Session notes updated';
      if (oldSession.status !== session.status) {
        if (session.status === 'completed') {
          action = 'complete';
          note = 'Session marked complete';

          const mPlan = dbMemberPTPlans.find(mp => mp.gymId === gymId && mp.memberId === session.memberId && mp.status === 'active');
          if (mPlan) {
            mPlan.completedSessions++;
            mPlan.remainingSessions = Math.max(0, mPlan.totalSessions - mPlan.completedSessions);
            if (mPlan.remainingSessions === 0) {
              mPlan.status = 'completed';
            }
          }
        } else if (session.status === 'cancelled') {
          action = 'cancel';
          note = 'Session cancelled';
        } else if (session.status === 'rescheduled') {
          action = 'reschedule';
          note = `Rescheduled to ${session.date} at ${session.time}`;
        }
      }

      const hist: SessionHistory = {
        id: 'sh-' + Math.random().toString(36).substring(2, 9),
        gymId,
        branchId: session.branchId,
        sessionId: session.id,
        memberId: session.memberId,
        trainerId: session.trainerId,
        action,
        timestamp: new Date().toISOString(),
        performedBy: session.trainerName,
        notes: note
      };
      dbSessionHistory.push(hist);
    }
    return of(undefined).pipe(delay(200));
  }

  deletePTSession(gymId: string, id: string): Observable<void> {
    const idx = dbPTSessions.findIndex(s => s.gymId === gymId && s.id === id);
    if (idx !== -1) {
      dbPTSessions.splice(idx, 1);
    }
    return of(undefined).pipe(delay(200));
  }

  getTrainerAssignments(gymId: string): Observable<TrainerAssignment[]> {
    return of(dbTrainerAssignments.filter(a => a.gymId === gymId)).pipe(delay(200));
  }

  addTrainerAssignment(gymId: string, assignment: Omit<TrainerAssignment, 'id'>): Observable<TrainerAssignment> {
    const newAssignment: TrainerAssignment = {
      ...assignment,
      id: 'ta-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbTrainerAssignments.push(newAssignment);
    return of(newAssignment).pipe(delay(200));
  }

  getSessionHistory(gymId: string): Observable<SessionHistory[]> {
    return of(dbSessionHistory.filter(h => h.gymId === gymId)).pipe(delay(200));
  }

  addSessionHistory(gymId: string, history: Omit<SessionHistory, 'id'>): Observable<SessionHistory> {
    const newHistory: SessionHistory = {
      ...history,
      id: 'sh-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbSessionHistory.push(newHistory);
    return of(newHistory).pipe(delay(200));
  }

  getTrainerRevenue(gymId: string): Observable<TrainerRevenue[]> {
    return of(dbTrainerRevenue.filter(r => r.gymId === gymId)).pipe(delay(200));
  }

  addTrainerRevenue(gymId: string, revenue: Omit<TrainerRevenue, 'id'>): Observable<TrainerRevenue> {
    const newRev: TrainerRevenue = {
      ...revenue,
      id: 'tr-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbTrainerRevenue.push(newRev);
    return of(newRev).pipe(delay(200));
  }

  getMemberPTPlans(gymId: string): Observable<MemberPTPlan[]> {
    return of(dbMemberPTPlans.filter(p => p.gymId === gymId)).pipe(delay(200));
  }

  getMemberPTPlanById(gymId: string, id: string): Observable<MemberPTPlan | null> {
    const plan = dbMemberPTPlans.find(p => p.gymId === gymId && p.id === id);
    return of(plan || null).pipe(delay(200));
  }

  addMemberPTPlan(gymId: string, memberPlan: Omit<MemberPTPlan, 'id'>): Observable<MemberPTPlan> {
    const newMP: MemberPTPlan = {
      ...memberPlan,
      id: 'mpt-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbMemberPTPlans.push(newMP);
    return of(newMP).pipe(delay(200));
  }

  updateMemberPTPlan(gymId: string, memberPlan: MemberPTPlan): Observable<void> {
    const idx = dbMemberPTPlans.findIndex(p => p.gymId === gymId && p.id === memberPlan.id);
    if (idx !== -1) {
      dbMemberPTPlans[idx] = memberPlan;
    }
    return of(undefined).pipe(delay(200));
  }
}

// --- Audit Logs DB Seed Data ---
export const dbAuditLogs: AuditLog[] = [
  {
    id: 'audit-1',
    userId: 'owner-1',
    userName: 'John Owner',
    role: 'gym_owner',
    action: 'Login',
    entityType: 'user',
    entityId: 'owner-1',
    entityName: 'John Owner',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    gymId: 'gym-a',
    gymName: 'Apex Fit Downtown',
    branchId: 'br-1',
    branchName: 'Downtown Branch',
    ipAddress: '192.168.1.15'
  },
  {
    id: 'audit-2',
    userId: 'owner-1',
    userName: 'John Owner',
    role: 'gym_owner',
    action: 'Lead Created',
    entityType: 'lead',
    entityId: 'lead-1',
    entityName: 'Alice Smith',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    gymId: 'gym-a',
    gymName: 'Apex Fit Downtown',
    branchId: 'br-1',
    branchName: 'Downtown Branch',
    ipAddress: '192.168.1.15'
  },
  {
    id: 'audit-3',
    userId: 'owner-1',
    userName: 'John Owner',
    role: 'gym_owner',
    action: 'Member Created',
    entityType: 'member',
    entityId: 'mem-1',
    entityName: 'Liam Neeson',
    timestamp: new Date(Date.now() - 10800000).toISOString(),
    gymId: 'gym-a',
    gymName: 'Apex Fit Downtown',
    branchId: 'br-1',
    branchName: 'Downtown Branch',
    ipAddress: '192.168.1.15'
  },
  {
    id: 'audit-4',
    userId: 'manager-1',
    userName: 'Sarah Manager',
    role: 'branch_manager',
    action: 'Login',
    entityType: 'user',
    entityId: 'manager-1',
    entityName: 'Sarah Manager',
    timestamp: new Date(Date.now() - 5000000).toISOString(),
    gymId: 'gym-a',
    gymName: 'Apex Fit Downtown',
    branchId: 'br-1',
    branchName: 'Downtown Branch',
    ipAddress: '192.168.1.22'
  },
  {
    id: 'audit-5',
    userId: 'owner-b',
    userName: 'Bruce Owner',
    role: 'gym_owner',
    action: 'Login',
    entityType: 'user',
    entityId: 'owner-b',
    entityName: 'Bruce Owner',
    timestamp: new Date(Date.now() - 4000000).toISOString(),
    gymId: 'gym-b',
    gymName: 'Apex Fit East',
    branchId: 'br-b1',
    branchName: 'East Branch',
    ipAddress: '192.168.2.11'
  }
];

@Injectable({ providedIn: 'root' })
export class MockAuditLogRepository implements IAuditLogRepository {
  constructor(private injector: Injector) {}

  getAuditLogs(gymId: string): Observable<AuditLog[]> {
    const userContext = this.injector.get(UserContextService);
    const user = userContext.getCurrentUser();
    if (!user) return of([]);

    let list = [...dbAuditLogs];

    if (user.role === 'super_admin') {
      // Super Admin: sees all gyms
    } else if (user.role === 'gym_owner') {
      // Gym Owner: sees own gym logs
      list = list.filter(l => l.gymId === gymId);
    } else if (user.role === 'branch_manager') {
      // Branch Manager: sees own branch logs
      const branchId = user.branchId || '';
      list = list.filter(l => l.gymId === gymId && l.branchId === branchId);
    } else {
      // Trainer and Staff: No access
      return of([]);
    }

    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return of(list).pipe(delay(300));
  }

  getAuditLogsPaged(gymId: string, req: PagedRequest): Observable<PagedResponse<AuditLog>> {
    const userContext = this.injector.get(UserContextService);
    const user = userContext.getCurrentUser();
    if (!user) return of({ items: [], totalCount: 0, pageIndex: req.pageIndex, pageSize: req.pageSize, totalPages: 0 });

    let list = [...dbAuditLogs];

    if (user.role === 'super_admin') {
      // Super Admin: sees all gyms
    } else if (user.role === 'gym_owner') {
      list = list.filter(l => l.gymId === gymId);
    } else if (user.role === 'branch_manager') {
      const branchId = user.branchId || '';
      list = list.filter(l => l.gymId === gymId && l.branchId === branchId);
    } else {
      return of({ items: [], totalCount: 0, pageIndex: req.pageIndex, pageSize: req.pageSize, totalPages: 0 });
    }

    return of(paginateData(list, req)).pipe(delay(200));
  }

  addAuditLog(gymId: string, log: Omit<AuditLog, 'id'>): Observable<AuditLog> {
    const newLog: AuditLog = {
      ...log,
      id: 'audit-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbAuditLogs.unshift(newLog);
    return of(newLog).pipe(delay(100));
  }
}

// --- Dynamic Mock Data Arrays ---
export const dbProducts: Product[] = [];
export const dbImportProfiles: ImportProfile[] = [];
export const dbImportHistory: ImportHistory[] = [];

@Injectable({ providedIn: 'root' })
export class MockProductRepository implements IProductRepository {
  getProducts(gymId: string): Observable<Product[]> {
    return of(dbProducts.filter(p => p.gymId === gymId)).pipe(delay(300));
  }

  getProductById(gymId: string, id: string): Observable<Product | null> {
    const p = dbProducts.find(prod => prod.gymId === gymId && prod.id === id);
    return of(p || null).pipe(delay(200));
  }

  addProduct(gymId: string, product: Omit<Product, 'id'>): Observable<Product> {
    const newP: Product = {
      ...product,
      id: (product as any).id || 'prod-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbProducts.push(newP);
    return of(newP).pipe(delay(200));
  }

  updateProduct(gymId: string, product: Product): Observable<void> {
    const idx = dbProducts.findIndex(p => p.gymId === gymId && p.id === product.id);
    if (idx !== -1) {
      dbProducts[idx] = product;
    }
    return of(undefined).pipe(delay(200));
  }

  deleteProduct(gymId: string, id: string): Observable<void> {
    const idx = dbProducts.findIndex(p => p.gymId === gymId && p.id === id);
    if (idx !== -1) {
      dbProducts.splice(idx, 1);
    }
    return of(undefined).pipe(delay(200));
  }
}

@Injectable({ providedIn: 'root' })
export class MockImportProfileRepository implements IImportProfileRepository {
  getProfiles(gymId: string): Observable<ImportProfile[]> {
    return of(dbImportProfiles.filter(p => p.gymId === gymId)).pipe(delay(300));
  }

  getProfileById(gymId: string, id: string): Observable<ImportProfile | null> {
    const p = dbImportProfiles.find(prof => prof.gymId === gymId && prof.id === id);
    return of(p || null).pipe(delay(200));
  }

  saveProfile(gymId: string, profile: Omit<ImportProfile, 'id'> | ImportProfile): Observable<ImportProfile> {
    const id = (profile as any).id || 'prof-' + Math.random().toString(36).substring(2, 9);
    const existingIdx = dbImportProfiles.findIndex(p => p.gymId === gymId && p.id === id);
    const now = new Date().toISOString();
    
    const newProfile: ImportProfile = {
      ...profile,
      id,
      gymId,
      createdAt: existingIdx !== -1 ? dbImportProfiles[existingIdx].createdAt : now,
      updatedAt: now
    } as ImportProfile;

    if (existingIdx !== -1) {
      dbImportProfiles[existingIdx] = newProfile;
    } else {
      dbImportProfiles.push(newProfile);
    }
    return of(newProfile).pipe(delay(200));
  }

  deleteProfile(gymId: string, id: string): Observable<void> {
    const idx = dbImportProfiles.findIndex(p => p.gymId === gymId && p.id === id);
    if (idx !== -1) {
      dbImportProfiles.splice(idx, 1);
    }
    return of(undefined).pipe(delay(200));
  }
}

@Injectable({ providedIn: 'root' })
export class MockImportHistoryRepository implements IImportHistoryRepository {
  getHistory(gymId: string): Observable<ImportHistory[]> {
    return of(dbImportHistory.filter(h => h.gymId === gymId)).pipe(delay(300));
  }

  getHistoryPaged(gymId: string, req: PagedRequest): Observable<PagedResponse<ImportHistory>> {
    return of(paginateData(dbImportHistory.filter(h => h.gymId === gymId), req)).pipe(delay(200));
  }

  getHistoryById(gymId: string, id: string): Observable<ImportHistory | null> {
    const h = dbImportHistory.find(hist => hist.gymId === gymId && hist.id === id);
    return of(h || null).pipe(delay(200));
  }

  addHistory(gymId: string, history: Omit<ImportHistory, 'id'>): Observable<ImportHistory> {
    const newHist: ImportHistory = {
      ...history,
      id: 'hist-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbImportHistory.unshift(newHist);
    return of(newHist).pipe(delay(200));
  }

  updateHistory(gymId: string, history: ImportHistory): Observable<void> {
    const idx = dbImportHistory.findIndex(h => h.gymId === gymId && h.id === history.id);
    if (idx !== -1) {
      dbImportHistory[idx] = history;
    }
    return of(undefined).pipe(delay(200));
  }
}

@Injectable({ providedIn: 'root' })
export class MockUnitOfWork implements IUnitOfWork {
  private snapshots: any = null;
  private inTransaction = false;

  begin(): void {
    // Take a full shallow copy snapshot of all local db arrays
    this.snapshots = {
      members: [...dbMembers],
      leads: [...dbLeads],
      trainers: [...dbTrainers],
      plans: [...dbPlans],
      invoices: [...dbInvoices],
      payments: [...dbPayments],
      employees: [...dbEmployees],
      products: [...dbProducts],
      importProfiles: [...dbImportProfiles],
      importHistory: [...dbImportHistory],
      auditLogs: [...dbAuditLogs]
    };
    this.inTransaction = true;
  }

  commit(): Observable<void> {
    this.inTransaction = false;
    this.snapshots = null;
    return of(undefined).pipe(delay(200));
  }

  rollback(): Observable<void> {
    if (this.snapshots) {
      // Revert length and push back original snapshots
      dbMembers.length = 0; dbMembers.push(...this.snapshots.members);
      dbLeads.length = 0; dbLeads.push(...this.snapshots.leads);
      dbTrainers.length = 0; dbTrainers.push(...this.snapshots.trainers);
      dbPlans.length = 0; dbPlans.push(...this.snapshots.plans);
      dbInvoices.length = 0; dbInvoices.push(...this.snapshots.invoices);
      dbPayments.length = 0; dbPayments.push(...this.snapshots.payments);
      dbEmployees.length = 0; dbEmployees.push(...this.snapshots.employees);
      dbProducts.length = 0; dbProducts.push(...this.snapshots.products);
      dbImportProfiles.length = 0; dbImportProfiles.push(...this.snapshots.importProfiles);
      dbImportHistory.length = 0; dbImportHistory.push(...this.snapshots.importHistory);
      dbAuditLogs.length = 0; dbAuditLogs.push(...this.snapshots.auditLogs);
    }
    this.inTransaction = false;
    this.snapshots = null;
    return of(undefined);
  }

  failure(error: Error): void {
    console.error('[MockUnitOfWork] failure() called:', error.message);
    this.rollback().subscribe();
  }

  registerAddition(collectionName: string, id: string): void {
    // Snapshots are used for mock rollback, no manual tracking required.
  }
}

