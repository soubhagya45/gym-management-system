import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { delay, map } from 'rxjs/operators';

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
  IWhatsAppRepository
} from '../../../core/interfaces/repository.interfaces';

import { UserProfile } from '../../../core/models/user.model';
import { Gym } from '../../../core/models/gym.entity';
import { Member } from '../../../core/models/member.entity';
import { Payment } from '../../../core/models/payment.entity';
import { Lead } from '../../../core/models/lead.entity';
import { Trainer } from '../../../core/models/trainer.entity';
import { Attendance } from '../../../core/models/attendance.entity';
import { MembershipPlan } from '../../../core/models/membership-plan.entity';
import { ActivityLog } from '../../../core/models/activity-log.entity';
import { SubscriptionPlan } from '../../../core/enums/subscription-plans.enum';
import { WhatsAppTemplate } from '../../../core/models/whatsapp-template.entity';
import { WhatsAppReminder } from '../../../core/models/whatsapp-reminder.entity';

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
    createdAt: '2026-01-01'
  },
  {
    gymId: 'gym-b',
    gymName: 'Apex Fit Uptown',
    ownerName: 'Sarah Connor',
    email: 'owner-b@apexfit.com',
    phone: '+91 99887 76699',
    subscriptionPlan: SubscriptionPlan.Basic,
    status: 'active',
    createdAt: '2026-03-01'
  }
];

const dbMockAccounts: Record<string, UserProfile> = {
  'superadmin@apexfit.com': {
    name: 'HQ Master Admin',
    email: 'superadmin@apexfit.com',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    role: 'super-admin'
  },
  'owner@apexfit.com': {
    name: 'Alex Johnson',
    email: 'owner@apexfit.com',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    role: 'owner',
    gymId: 'gym-a'
  },
  'owner-b@apexfit.com': {
    name: 'Sarah Connor',
    email: 'owner-b@apexfit.com',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150',
    role: 'owner',
    gymId: 'gym-b'
  },
  'trainer@apexfit.com': {
    name: 'Marcus Vance',
    email: 'trainer@apexfit.com',
    avatarUrl: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=150',
    role: 'trainer',
    gymId: 'gym-a'
  },
  'member@apexfit.com': {
    name: 'Sophia Chen',
    email: 'member@apexfit.com',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    role: 'staff',
    gymId: 'gym-a'
  }
};

const dbPasswords: Record<string, string> = {
  'superadmin@apexfit.com': 'password',
  'owner@apexfit.com': 'password',
  'owner-b@apexfit.com': 'password',
  'trainer@apexfit.com': 'password',
  'member@apexfit.com': 'password'
};

const dbPlans: MembershipPlan[] = [
  { id: 'plan-1', gymId: 'gym-a', name: 'Essential Monthly', durationMonths: 1, price: 1500, description: 'Access to standard gym facilities, weights, and cardio area.', features: ['Full gym access', '1 Fitness assessment', 'Locker room access'], activeMembersCount: 15 },
  { id: 'plan-2', gymId: 'gym-a', name: 'Premium Quarterly', durationMonths: 3, price: 4000, description: 'Full access with trainer guidance, group classes, and sauna.', features: ['All Essential features', '10 Group fitness classes', 'Sauna & Steam room access', '2 Personal trainer sessions'], activeMembersCount: 24 },
  { id: 'plan-3', gymId: 'gym-a', name: 'Elite Annual Platinum', durationMonths: 12, price: 15000, description: 'VIP access with unlimited classes, private trainer, nutrition plans.', features: ['24/7 Gym access', 'Unlimited group classes', 'Sauna, Steam & Ice bath', 'Monthly customized meal plans', '1 Private session weekly', 'Complimentary supplement kit'], activeMembersCount: 8 },
  { id: 'plan-b1', gymId: 'gym-b', name: 'Standard Month Pass', durationMonths: 1, price: 2000, description: 'Basic workout pass.', features: ['Gym Floor', 'Lockers'], activeMembersCount: 2 },
  { id: 'plan-b2', gymId: 'gym-b', name: 'VIP Year Pass', durationMonths: 12, price: 18000, description: 'All access pass.', features: ['Gym Floor', 'Sauna', 'Personal Trainer'], activeMembersCount: 1 }
];

const dbTrainers: Trainer[] = [
  { id: 'trainer-1', gymId: 'gym-a', name: 'Rahul Dev', specialty: 'Strength & Conditioning', rating: 4.9, membersCount: 14, avatarUrl: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=150', status: 'active', email: 'rahul.dev@apexfit.com', phone: '+91 98765 43210' },
  { id: 'trainer-2', gymId: 'gym-a', name: 'Kavita Sharma', specialty: 'Yoga & Functional Mobility', rating: 4.8, membersCount: 18, avatarUrl: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=150', status: 'active', email: 'kavita.sharma@apexfit.com', phone: '+91 98765 43211' },
  { id: 'trainer-3', gymId: 'gym-a', name: 'Vikram Malhotra', specialty: 'High Intensity Interval Training (HIIT)', rating: 4.7, membersCount: 12, avatarUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150', status: 'active', email: 'vikram.m@apexfit.com', phone: '+91 98765 43212' },
  { id: 'trainer-4', gymId: 'gym-a', name: 'Gurpreet Singh', specialty: 'Bodybuilding & Powerlifting', rating: 4.9, membersCount: 9, avatarUrl: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=150', status: 'on leave', email: 'gurpreet.s@apexfit.com', phone: '+91 98765 43213' },
  { id: 'trainer-b1', gymId: 'gym-b', name: 'Kyle Reese', specialty: 'Tactical Conditioning & Cardio', rating: 5.0, membersCount: 3, avatarUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150', status: 'active', email: 'kyle.reese@apexfit.com', phone: '+91 98765 43299' }
];

const dbMembers: Member[] = [
  { id: 'mem-1', gymId: 'gym-a', name: 'Amit Sharma', email: 'amit.sharma@gmail.com', phone: '+91 99887 76655', status: 'active', planId: 'plan-2', planName: 'Premium Quarterly', startDate: '2026-04-10', endDate: '2026-07-10', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', attendanceCount: 18, balance: 0, gender: 'Male', age: 28, height: 182, weight: 79, fitnessGoal: 'Muscle Gain' },
  { id: 'mem-2', gymId: 'gym-a', name: 'Priya Patel', email: 'priya.patel@yahoo.com', phone: '+91 99887 76656', status: 'active', planId: 'plan-3', planName: 'Elite Annual Platinum', startDate: '2026-01-15', endDate: '2027-01-15', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', attendanceCount: 42, balance: 0, gender: 'Female', age: 25, height: 165, weight: 58, fitnessGoal: 'Cardio Fitness' },
  { id: 'mem-3', gymId: 'gym-a', name: 'Rajesh Kumar', email: 'rajesh.k@outlook.com', phone: '+91 99887 76657', status: 'expiring', planId: 'plan-1', planName: 'Essential Monthly', startDate: '2026-05-08', endDate: '2026-06-08', avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150', attendanceCount: 11, balance: 1500, gender: 'Male', age: 45, height: 193, weight: 88, fitnessGoal: 'Strength Training' },
  { id: 'mem-4', gymId: 'gym-a', name: 'Anjali Rao', email: 'anjali.rao@gmail.com', phone: '+91 99887 76658', status: 'active', planId: 'plan-2', planName: 'Premium Quarterly', startDate: '2026-05-01', endDate: '2026-08-01', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', attendanceCount: 8, balance: 0, gender: 'Female', age: 31, height: 168, weight: 62, fitnessGoal: 'Weight Loss' },
  { id: 'mem-5', gymId: 'gym-a', name: 'Vikram Singh', email: 'vikram.singh@gmail.com', phone: '+91 99887 76659', status: 'inactive', planId: 'plan-1', planName: 'Essential Monthly', startDate: '2026-02-10', endDate: '2026-03-10', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', attendanceCount: 4, balance: 0, gender: 'Male', age: 38, height: 178, weight: 75, fitnessGoal: 'General Fitness' },
  { id: 'mem-6', gymId: 'gym-a', name: 'Neha Gupta', email: 'neha.gupta@outlook.com', phone: '+91 99887 76660', status: 'active', planId: 'plan-3', planName: 'Elite Annual Platinum', startDate: '2026-03-20', endDate: '2027-03-20', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', attendanceCount: 29, balance: 0, gender: 'Female', age: 29, height: 165, weight: 54, fitnessGoal: 'Flexibility & Mobility' },
  { id: 'mem-7', gymId: 'gym-a', name: 'Rohan Mehta', email: 'rohan.mehta@gmail.com', phone: '+91 99887 76661', status: 'expiring', planId: 'plan-2', planName: 'Premium Quarterly', startDate: '2026-03-10', endDate: '2026-06-10', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', attendanceCount: 22, balance: 4000, gender: 'Male', age: 34, height: 184, weight: 82, fitnessGoal: 'Muscle Gain' },
  // Gym B Members
  { id: 'mem-b1', gymId: 'gym-b', name: 'John Connor', email: 'john.connor@sky.net', phone: '+91 99887 76601', status: 'active', planId: 'plan-b2', planName: 'VIP Year Pass', startDate: '2026-03-01', endDate: '2027-03-01', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', attendanceCount: 12, balance: 0, gender: 'Male', age: 21, height: 178, weight: 70, fitnessGoal: 'Tactical Survival' },
  { id: 'mem-b2', gymId: 'gym-b', name: 'Marcus Wright', email: 'marcus.w@sky.net', phone: '+91 99887 76602', status: 'active', planId: 'plan-b1', planName: 'Standard Month Pass', startDate: '2026-05-15', endDate: '2026-06-15', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', attendanceCount: 5, balance: 2000, gender: 'Male', age: 35, height: 185, weight: 90, fitnessGoal: 'Strength Building' }
];

const dbPayments: Payment[] = [
  { id: 'pay-1', gymId: 'gym-a', memberId: 'mem-2', memberName: 'Priya Patel', amount: 15000, paidAmount: 15000, dueAmount: 0, dueDate: '2026-01-15', date: '2026-01-15', status: 'paid', planName: 'Elite Annual Platinum' },
  { id: 'pay-2', gymId: 'gym-a', memberId: 'mem-1', memberName: 'Amit Sharma', amount: 4000, paidAmount: 4000, dueAmount: 0, dueDate: '2026-04-10', date: '2026-04-10', status: 'paid', planName: 'Premium Quarterly' },
  { id: 'pay-3', gymId: 'gym-a', memberId: 'mem-4', memberName: 'Anjali Rao', amount: 4000, paidAmount: 4000, dueAmount: 0, dueDate: '2026-05-01', date: '2026-05-01', status: 'paid', planName: 'Premium Quarterly' },
  { id: 'pay-4', gymId: 'gym-a', memberId: 'mem-6', memberName: 'Neha Gupta', amount: 15000, paidAmount: 15000, dueAmount: 0, dueDate: '2026-03-20', date: '2026-03-20', status: 'paid', planName: 'Elite Annual Platinum' },
  { id: 'pay-5', gymId: 'gym-a', memberId: 'mem-3', memberName: 'Rajesh Kumar', amount: 1500, paidAmount: 0, dueAmount: 1500, dueDate: '2026-06-08', date: '2026-05-08', status: 'pending', planName: 'Essential Monthly' },
  { id: 'pay-6', gymId: 'gym-a', memberId: 'mem-7', memberName: 'Rohan Mehta', amount: 4000, paidAmount: 0, dueAmount: 4000, dueDate: '2026-06-05', date: '2026-03-10', status: 'overdue', planName: 'Premium Quarterly' },
  { id: 'pay-h1', gymId: 'gym-a', memberId: 'mem-1', memberName: 'Amit Sharma', amount: 4000, paidAmount: 4000, dueAmount: 0, dueDate: '2026-01-10', date: '2026-01-10', status: 'paid', planName: 'Premium Quarterly' },
  // Gym B Payments
  { id: 'pay-b1', gymId: 'gym-b', memberId: 'mem-b1', memberName: 'John Connor', amount: 18000, paidAmount: 18000, dueAmount: 0, dueDate: '2026-03-01', date: '2026-03-01', status: 'paid', planName: 'VIP Year Pass' },
  { id: 'pay-b2', gymId: 'gym-b', memberId: 'mem-b2', memberName: 'Marcus Wright', amount: 2000, paidAmount: 0, dueAmount: 2000, dueDate: '2026-06-15', date: '2026-05-15', status: 'pending', planName: 'Standard Month Pass' }
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

const dbLeads: Lead[] = [
  { id: 'lead-1', gymId: 'gym-a', name: 'Sachin Tendulkar', phone: '+91 97766 55443', email: 'sachin.t@gmail.com', trialDate: '2026-06-10', leadSource: 'Instagram', followUpDate: '2026-06-12', interestedPlan: 'Elite Annual Platinum', notes: 'Wants customized diet chart.', assignedStaff: 'Rahul Dev', status: 'New' },
  { id: 'lead-2', gymId: 'gym-a', name: 'Pooja Hegde', phone: '+91 97766 55444', email: 'pooja.h@gmail.com', trialDate: '2026-06-05', leadSource: 'Referral', followUpDate: '2026-06-08', interestedPlan: 'Premium Quarterly', notes: 'Interested in HIIT and group classes.', assignedStaff: 'Kavita Sharma', status: 'Trial Scheduled' },
  { id: 'lead-3', gymId: 'gym-a', name: 'Varun Dhawan', phone: '+91 97766 55445', email: 'varun.d@gmail.com', trialDate: '2026-06-01', leadSource: 'Website', followUpDate: '2026-06-04', interestedPlan: 'Essential Monthly', notes: 'Inquired about weightlifting facilities.', assignedStaff: 'Vikram Malhotra', status: 'Contacted' },
  { id: 'lead-b1', gymId: 'gym-b', name: 'Katherine Brewster', phone: '+91 97766 55401', email: 'kate.b@sky.net', trialDate: '2026-06-09', leadSource: 'Website', followUpDate: '2026-06-11', interestedPlan: 'Standard Month Pass', notes: 'Looking to start immediately.', assignedStaff: 'Kyle Reese', status: 'New' }
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

// --- Mock Implementations ---

@Injectable({ providedIn: 'root' })
export class MockAuthRepository implements IAuthRepository {
  login(email: string, password: string): Observable<UserProfile> {
    const emailKey = email.toLowerCase().trim();
    const user = dbMockAccounts[emailKey];
    const storedPassword = dbPasswords[emailKey] || 'password';
    if (user && password === storedPassword) {
      return of(user).pipe(delay(800));
    }
    return throwError(() => new Error('Invalid email or password. Hint: password'));
  }

  loginWithRole(role: 'owner' | 'trainer' | 'member'): Observable<UserProfile> {
    const email = role === 'owner' ? 'owner@apexfit.com' : role === 'trainer' ? 'trainer@apexfit.com' : 'member@apexfit.com';
    const user = dbMockAccounts[email];
    return of(user).pipe(delay(500));
  }

  logout(): Observable<void> {
    return of(undefined).pipe(delay(200));
  }

  register(
    gymName: string,
    ownerName: string,
    email: string,
    phone: string,
    password?: string
  ): Observable<UserProfile> {
    const emailKey = email.toLowerCase().trim();
    if (dbMockAccounts[emailKey]) {
      return throwError(() => new Error('This email address is already registered.'));
    }

    const gymId = 'gym-' + Math.random().toString(36).substring(2, 9);
    const newGym: Gym = {
      gymId,
      gymName,
      ownerName,
      email,
      phone,
      subscriptionPlan: SubscriptionPlan.FreeTrial,
      status: 'active',
      createdAt: new Date().toISOString().split('T')[0]
    };
    dbGyms.push(newGym);

    const newUser: UserProfile = {
      name: ownerName,
      email,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ownerName)}`,
      role: 'owner',
      gymId
    };
    dbMockAccounts[emailKey] = newUser;
    if (password) {
      dbPasswords[emailKey] = password;
    }

    return of(newUser).pipe(delay(800));
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
export class MockMemberRepository implements IMemberRepository {
  getMembers(gymId: string): Observable<Member[]> {
    return of(dbMembers.filter(m => m.gymId === gymId)).pipe(delay(300));
  }

  getMemberById(gymId: string, id: string): Observable<Member | null> {
    const member = dbMembers.find(m => m.gymId === gymId && m.id === id) || null;
    return of(member).pipe(delay(200));
  }

  addMember(gymId: string, member: Omit<Member, 'id' | 'attendanceCount' | 'balance'>): Observable<Member> {
    const newMember: Member = {
      ...member,
      id: 'mem-' + Math.random().toString(36).substring(2, 9),
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

  private getPlanPrice(gymId: string, planId: string): number {
    return dbPlans.find(p => p.gymId === gymId && p.id === planId)?.price || 0;
  }
}

@Injectable({ providedIn: 'root' })
export class MockPaymentRepository implements IPaymentRepository {
  getPayments(gymId: string): Observable<Payment[]> {
    return of(dbPayments.filter(p => p.gymId === gymId)).pipe(delay(300));
  }

  addPayment(gymId: string, payment: Omit<Payment, 'id'>): Observable<Payment> {
    const newPayment: Payment = {
      ...payment,
      id: 'pay-' + Math.random().toString(36).substring(2, 9),
      gymId
    };
    dbPayments.unshift(newPayment);

    const member = dbMembers.find(m => m.gymId === gymId && m.id === payment.memberId);
    if (member) {
      member.balance = payment.dueAmount;
    }

    return of(newPayment).pipe(delay(300));
  }

  confirmPayment(gymId: string, paymentId: string): Observable<void> {
    const payment = dbPayments.find(p => p.gymId === gymId && p.id === paymentId);
    if (payment) {
      payment.status = 'paid';
      payment.paidAmount = payment.amount;
      payment.dueAmount = 0;
      payment.date = new Date().toISOString().split('T')[0];

      const member = dbMembers.find(m => m.gymId === gymId && m.id === payment.memberId);
      if (member) {
        member.balance = 0;
      }
    }
    return of(undefined).pipe(delay(200));
  }
}

@Injectable({ providedIn: 'root' })
export class MockLeadRepository implements ILeadRepository {
  getLeads(gymId: string): Observable<Lead[]> {
    return of(dbLeads.filter(l => l.gymId === gymId)).pipe(delay(300));
  }

  addLead(gymId: string, lead: Omit<Lead, 'id'>): Observable<Lead> {
    const newLead: Lead = {
      ...lead,
      id: 'lead-' + Math.random().toString(36).substring(2, 9),
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
}

@Injectable({ providedIn: 'root' })
export class MockTrainerRepository implements ITrainerRepository {
  getTrainers(gymId: string): Observable<Trainer[]> {
    return of(dbTrainers.filter(t => t.gymId === gymId)).pipe(delay(300));
  }

  addTrainer(gymId: string, trainer: Omit<Trainer, 'id' | 'membersCount'>): Observable<Trainer> {
    const newTrainer: Trainer = {
      ...trainer,
      id: 'trainer-' + Math.random().toString(36).substring(2, 9),
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
      id: 'plan-' + Math.random().toString(36).substring(2, 9),
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

  updateTemplate(gymId: string, template: WhatsAppTemplate): Observable<void> {
    const idx = dbWhatsAppTemplates.findIndex(t => t.gymId === gymId && t.id === template.id);
    if (idx !== -1) {
      dbWhatsAppTemplates[idx] = template;
    }
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
