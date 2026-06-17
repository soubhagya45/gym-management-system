import { Injectable, Injector } from '@angular/core';
import { Observable, from, of, throwError, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';
import { UserRole } from '../../../core/enums/roles.enum';
import { UserProfile } from '../../../core/models/user.model';
import { Gym } from '../../../core/models/gym.entity';
import { Member } from '../../../core/models/member.entity';
import { Payment } from '../../../core/models/payment.entity';
import { Lead } from '../../../core/models/lead.entity';
import { Trainer } from '../../../core/models/trainer.entity';
import { Attendance } from '../../../core/models/attendance.entity';
import { MembershipPlan } from '../../../core/models/membership-plan.entity';
import { ActivityLog } from '../../../core/models/activity-log.entity';
import { WhatsAppTemplate } from '../../../core/models/whatsapp-template.entity';
import { WhatsAppReminder } from '../../../core/models/whatsapp-reminder.entity';
import { BodyProgressEntry } from '../../../core/models/body-progress.entity';
import { Expense, Invoice, Collection } from '../../../core/models/finance.entity';
import { Employee, EmployeeAttendance, EmployeePayroll, EmployeePerformance } from '../../../core/models/employee.entity';
import { SubscriptionPlan } from '../../../core/enums/subscription-plans.enum';
import { AuthState } from '../../../presentation/state/auth.state';
import { TenantContextService } from '../../../domain/tenancy/tenant-context.service';
import { AuditLoggerService } from '../../../services/audit-logger.service';

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
  IPersonalTrainingRepository
} from '../../../core/interfaces/repository.interfaces';

import { PTPlan } from '../../../core/models/pt-plan.entity';
import { PTSession } from '../../../core/models/pt-session.entity';
import { TrainerAssignment } from '../../../core/models/trainer-assignment.entity';
import { SessionHistory } from '../../../core/models/session-history.entity';
import { TrainerRevenue } from '../../../core/models/trainer-revenue.entity';
import { MemberPTPlan } from '../../../core/models/member-pt-plan.entity';

import { initializeApp, deleteApp } from 'firebase/app';
import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail,
  deleteUser,
  getAuth
} from 'firebase/auth';

import {
  doc,
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';

function getBranchFilteredQuery(injector: Injector, firebaseService: FirebaseService, collectionName: string, gymId: string) {
  const db = firebaseService.getDb();
  const authState = injector.get(AuthState);
  const tenantContext = injector.get(TenantContextService);
  const user = authState.currentUserValue;
  const colRef = collection(db, collectionName);

  if (!user) {
    return query(colRef, where('gymId', '==', gymId));
  }

  if (user.role === UserRole.SuperAdmin) {
    return query(colRef, where('gymId', '==', gymId));
  }

  if (user.role === UserRole.Owner) {
    const activeBranchId = tenantContext.getBranchId();
    if (activeBranchId) {
      return query(colRef, where('gymId', '==', gymId), where('branchId', '==', activeBranchId));
    }
    return query(colRef, where('gymId', '==', gymId));
  }

  const userBranchId = user.branchId || tenantContext.getBranchId();
  if (userBranchId) {
    return query(colRef, where('gymId', '==', gymId), where('branchId', '==', userBranchId));
  }

  return query(colRef, where('gymId', '==', gymId));
}

function logAudit(injector: Injector, action: string, entityType: string, entityId: string) {
  try {
    const auditLogger = injector.get(AuditLoggerService);
    auditLogger.log(action, entityType, entityId);
  } catch (e) {
    console.error('Audit log failed:', e);
  }
}


@Injectable({ providedIn: 'root' })
export class FirebaseAuthRepository implements IAuthRepository {
  constructor(
    private firebaseService: FirebaseService,
    private injector: Injector
  ) { }

  login(email: string, password: string): Observable<UserProfile> {
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getDb();
    return from(signInWithEmailAndPassword(auth, email, password)).pipe(
      switchMap(cred => {
        const uid = cred.user.uid;
        const docRef = doc(db, 'users', uid);
        return from(getDoc(docRef)).pipe(
          switchMap(userSnap => {
            if (userSnap.exists()) {
              const profile = userSnap.data() as UserProfile;
              
              // Enforce temporary employee password expiration (24h)
              if (profile.isFirstLogin && (profile as any).tempPasswordExpiresAt) {
                const expiresAt = new Date((profile as any).tempPasswordExpiresAt).getTime();
                if (Date.now() > expiresAt) {
                  return throwError(() => new Error('Temporary employee password has expired. Please request a new password reset or contact the Gym Owner.'));
                }
              }

              // Audit logging trigger
              const logId = 'audit_' + Math.random().toString(36).substring(2, 9);
              setDoc(doc(db, 'auditLogs', logId), {
                id: logId,
                userId: uid,
                role: profile.role,
                action: 'User Login',
                entityType: 'user',
                entityId: uid,
                timestamp: new Date().toISOString(),
                gymId: profile.gymId || ''
              }).catch(err => console.error('Login audit log failed:', err));

              return of(profile);
            }
            // Check for invited user placeholder
            const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()));
            return from(getDocs(q)).pipe(
              switchMap(snap => {
                if (!snap.empty) {
                  const inviteDoc = snap.docs[0];
                  const inviteData = inviteDoc.data() as UserProfile;
                  const newProfile: UserProfile = {
                    ...inviteData,
                    id: uid,
                    isFirstLogin: true
                  };
                  return from(deleteDoc(doc(db, 'users', inviteDoc.id))).pipe(
                    switchMap(() => from(setDoc(doc(db, 'users', uid), newProfile))),
                    map(() => newProfile)
                  );
                }
                return throwError(() => new Error('User profile not found in database.'));
              })
            );
          })
        );
      }),
      catchError(err => throwError(() => new Error(err.message || 'Login failed.')))
    );
  }

  loginWithRole(role: UserRole): Observable<UserProfile> {
    return throwError(() => new Error(
      'Quick role login is only available in Mock/Demo mode. ' +
      'Please sign in with your registered email and password.'
    ));
  }

  logout(): Observable<void> {
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getDb();
    try {
      const authState = this.injector.get(AuthState);
      const user = authState.currentUserValue;
      if (user) {
        const logId = 'audit_' + Math.random().toString(36).substring(2, 9);
        setDoc(doc(db, 'auditLogs', logId), {
          id: logId,
          userId: user.id,
          role: user.role,
          action: 'User Logout',
          entityType: 'user',
          entityId: user.id,
          timestamp: new Date().toISOString(),
          gymId: user.gymId || ''
        }).catch(err => console.error('Logout audit log failed:', err));
      }
    } catch (e) {
      console.error(e);
    }
    return from(signOut(auth));
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
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getDb();
    return from(createUserWithEmailAndPassword(auth, email, password || 'password')).pipe(
      switchMap(cred => {
        const uid = cred.user.uid;
        const gymId = 'gym_' + Math.random().toString(36).substring(2, 9);
        const defaultBranchId = 'branch_' + Math.random().toString(36).substring(2, 9);
        const today = new Date().toISOString().split('T')[0];

        const defaultBranch = {
          id: defaultBranchId,
          gymId,
          name: 'Main Branch',
          code: 'MAIN',
          address: address || 'Not Specified',
          manager: ownerName,
          phone: phone
        };

        const newGym: Gym = {
          gymId,
          gymName,
          ownerName,
          email,
          phone,
          subscriptionPlan: SubscriptionPlan.FreeTrial,
          status: 'active',
          createdAt: today,
          address: address || 'Not Specified',
          gstNumber: gstNumber || undefined,
          gymType: gymType || 'Unisex',
          openingTime: openingTime || '06:00',
          closingTime: closingTime || '22:00',
          subscriptionStatus: 'trialing',
          branches: [defaultBranch],
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

        const userDoc: UserProfile = {
          id: uid,
          name: ownerName,
          email,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ownerName)}`,
          role: UserRole.Owner,
          gymId,
          branchId: defaultBranchId,
          isFirstLogin: false,
          permissions: [],
          lastLogin: new Date().toISOString(),
          sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
        };

        const ownerEmployee: Employee = {
          id: uid,
          gymId,
          branchId: defaultBranchId,
          fullName: ownerName,
          phone: phone,
          email,
          gender: 'Male',
          dob: '1990-01-01',
          address: address || 'Not Specified',
          role: UserRole.Owner,
          department: 'Management',
          joinDate: today,
          salary: 0,
          shift: 'General',
          username: email.split('@')[0],
          accountStatus: 'Active',
          photoUrl: userDoc.avatarUrl,
          password: password || 'password'
        };

        return forkJoin([
          from(setDoc(doc(db, 'gyms', gymId), newGym)),
          from(setDoc(doc(db, 'users', uid), userDoc)),
          from(setDoc(doc(db, 'employees', uid), ownerEmployee)),
          from(setDoc(doc(db, 'branches', defaultBranchId), defaultBranch))
        ]).pipe(
          map(() => {
            const logId = 'audit_' + Math.random().toString(36).substring(2, 9);
            setDoc(doc(db, 'auditLogs', logId), {
              id: logId,
              userId: uid,
              role: UserRole.Owner,
              action: 'Employee Creation',
              entityType: 'employee',
              entityId: uid,
              timestamp: new Date().toISOString(),
              gymId: gymId
            }).catch(err => console.error('Registration audit log failed:', err));

            return userDoc;
          })
        );
      }),
      catchError(err => throwError(() => new Error(err.message || 'Registration failed.')))
    );
  }

  getUserProfile(userId: string): Observable<UserProfile | null> {
    const db = this.firebaseService.getDb();
    return from(getDoc(doc(db, 'users', userId))).pipe(
      map(snap => snap.exists() ? (snap.data() as UserProfile) : null),
      catchError(err => throwError(() => new Error(err.message || 'Failed to retrieve user profile.')))
    );
  }

  inviteStaff(email: string, name: string, role: UserRole, gymId: string): Observable<UserProfile> {
    const db = this.firebaseService.getDb();
    const cleanEmail = email.toLowerCase().trim();
    const inviteId = 'invited_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
    const invitedUser: UserProfile = {
      id: inviteId,
      name,
      email: cleanEmail,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      role,
      gymId,
      isFirstLogin: true,
      permissions: [],
      lastLogin: new Date().toISOString(),
      sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
    };
    return from(setDoc(doc(db, 'users', inviteId), invitedUser)).pipe(
      map(() => invitedUser),
      catchError(err => throwError(() => new Error(err.message || 'Failed to invite staff.')))
    );
  }

  changePassword(email: string, newPassword: string): Observable<void> {
    const auth = this.firebaseService.getAuth();
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email?.toLowerCase().trim() === email.toLowerCase().trim()) {
      return from(updatePassword(currentUser, newPassword)).pipe(
        catchError(err => throwError(() => new Error(err.message || 'Failed to update password.')))
      );
    } else {
      return from(sendPasswordResetEmail(auth, email)).pipe(
        map(() => undefined),
        catchError(err => throwError(() => new Error(err.message || 'Failed to send password reset email.')))
      );
    }
  }

  clearFirstLoginFlag(email: string): Observable<void> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()));
    return from(getDocs(q)).pipe(
      switchMap(snap => {
        if (!snap.empty) {
          const userDoc = snap.docs[0];
          return from(updateDoc(doc(db, 'users', userDoc.id), { isFirstLogin: false }));
        }
        return throwError(() => new Error('User not found in system.'));
      }),
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to clear first login flag.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseGymRepository implements IGymRepository {
  constructor(
    private firebaseService: FirebaseService,
    private injector: Injector
  ) { }

  getGyms(): Observable<Gym[]> {
    const db = this.firebaseService.getDb();
    return from(getDocs(collection(db, 'gyms'))).pipe(
      map(snap => snap.docs.map(d => d.data() as Gym)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get gyms.')))
    );
  }

  getGymById(gymId: string): Observable<Gym | null> {
    const db = this.firebaseService.getDb();
    return from(getDoc(doc(db, 'gyms', gymId))).pipe(
      map(snap => snap.exists() ? (snap.data() as Gym) : null),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get gym.')))
    );
  }

  createGym(gym: Omit<Gym, 'gymId' | 'createdAt'>): Observable<Gym> {
    const db = this.firebaseService.getDb();
    const gymId = 'gym_' + Math.random().toString(36).substring(2, 9);
    const newGym: Gym = {
      ...gym,
      gymId,
      createdAt: new Date().toISOString().split('T')[0]
    };
    return from(setDoc(doc(db, 'gyms', gymId), newGym)).pipe(
      map(() => newGym),
      catchError(err => throwError(() => new Error(err.message || 'Failed to create gym.')))
    );
  }

  updateGym(gym: Gym): Observable<void> {
    const db = this.firebaseService.getDb();
    const ops: Observable<any>[] = [
      from(setDoc(doc(db, 'gyms', gym.gymId), gym))
    ];
    if (gym.branches && gym.branches.length > 0) {
      gym.branches.forEach(b => {
        ops.push(from(setDoc(doc(db, 'branches', b.id), {
          ...b,
          gymId: gym.gymId
        })));
      });
    }
    return forkJoin(ops).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update gym.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseMemberRepository implements IMemberRepository {
  constructor(
    private firebaseService: FirebaseService,
    private injector: Injector
  ) { }

  getMembers(gymId: string): Observable<Member[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'members', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as Member)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get members.')))
    );
  }

  getMemberById(gymId: string, id: string): Observable<Member | null> {
    const db = this.firebaseService.getDb();
    return from(getDoc(doc(db, 'members', id))).pipe(
      map(snap => {
        if (snap.exists()) {
          const m = snap.data() as Member;
          return m.gymId === gymId ? m : null;
        }
        return null;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get member.')))
    );
  }

  addMember(gymId: string, member: Omit<Member, 'id' | 'attendanceCount' | 'balance'>): Observable<Member> {
    const db = this.firebaseService.getDb();
    const id = 'mem_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = member.branchId || tenantContext.getBranchId() || '';

    const planRef = doc(db, 'membership_plans', member.planId);
    return from(getDoc(planRef)).pipe(
      switchMap(planSnap => {
        const price = planSnap.exists() ? (planSnap.data() as MembershipPlan).price : 0;
        const newMember: Member = {
          ...member,
          id,
          gymId,
          branchId,
          attendanceCount: 0,
          balance: member.status === 'inactive' ? 0 : price
        };
        return from(setDoc(doc(db, 'members', id), newMember)).pipe(
          map(() => {
            logAudit(this.injector, 'Member Creation', 'member', id);
            return newMember;
          })
        );
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add member.')))
    );
  }

  updateMember(gymId: string, member: Member): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'members', member.id), member)).pipe(
      map(() => {
        logAudit(this.injector, 'Member Update', 'member', member.id);
        return undefined;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update member.')))
    );
  }

  deleteMember(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'members', id))).pipe(
      map(() => {
        logAudit(this.injector, 'Member Deletion', 'member', id);
        return undefined;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete member.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebasePaymentRepository implements IPaymentRepository {
  constructor(
    private firebaseService: FirebaseService,
    private injector: Injector
  ) { }

  getPayments(gymId: string): Observable<Payment[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'payments', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as Payment)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get payments.')))
    );
  }

  addPayment(gymId: string, payment: Omit<Payment, 'id'>): Observable<Payment> {
    const db = this.firebaseService.getDb();
    const id = 'pay_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = (payment as any).branchId || tenantContext.getBranchId() || '';
    const newPayment: Payment = {
      ...payment,
      id,
      gymId,
      branchId
    } as Payment;

    const memberRef = doc(db, 'members', payment.memberId);
    return from(setDoc(doc(db, 'payments', id), newPayment)).pipe(
      switchMap(() => from(updateDoc(memberRef, { balance: payment.dueAmount }))),
      map(() => {
        logAudit(this.injector, 'Payment Entry', 'payment', id);
        return newPayment;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add payment.')))
    );
  }

  confirmPayment(gymId: string, paymentId: string): Observable<void> {
    const db = this.firebaseService.getDb();
    const paymentRef = doc(db, 'payments', paymentId);

    return from(getDoc(paymentRef)).pipe(
      switchMap(snap => {
        if (!snap.exists()) {
          return throwError(() => new Error('Payment record not found.'));
        }
        const payment = snap.data() as Payment;
        const today = new Date().toISOString().split('T')[0];

        const updatedPayment = {
          ...payment,
          status: 'paid' as const,
          paidAmount: payment.amount,
          dueAmount: 0,
          date: today
        };

        const memberRef = doc(db, 'members', payment.memberId);
        return forkJoin([
          from(setDoc(paymentRef, updatedPayment)),
          from(updateDoc(memberRef, { balance: 0 }))
        ]).pipe(
          map(() => undefined)
        );
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to confirm payment.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseLeadRepository implements ILeadRepository {
  constructor(
    private firebaseService: FirebaseService,
    private injector: Injector
  ) { }

  getLeads(gymId: string): Observable<Lead[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'leads', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as Lead)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get leads.')))
    );
  }

  addLead(gymId: string, lead: Omit<Lead, 'id'>): Observable<Lead> {
    const db = this.firebaseService.getDb();
    const id = 'lead_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = lead.branchId || tenantContext.getBranchId() || '';
    const newLead: Lead = {
      ...lead,
      id,
      gymId,
      branchId
    };
    return from(setDoc(doc(db, 'leads', id), newLead)).pipe(
      map(() => {
        logAudit(this.injector, 'Lead Creation', 'lead', id);
        return newLead;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add lead.')))
    );
  }

  updateLead(gymId: string, lead: Lead): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(getDoc(doc(db, 'leads', lead.id))).pipe(
      switchMap(snap => {
        const oldLead = snap.exists() ? snap.data() as Lead : null;
        return from(setDoc(doc(db, 'leads', lead.id), lead)).pipe(
          map(() => {
            if (lead.status === 'Converted' && (!oldLead || oldLead.status !== 'Converted')) {
              logAudit(this.injector, 'Lead Conversion', 'lead', lead.id);
            }
            return undefined;
          })
        );
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update lead.')))
    );
  }

  deleteLead(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'leads', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete lead.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseTrainerRepository implements ITrainerRepository {
  constructor(
    private firebaseService: FirebaseService,
    private injector: Injector
  ) { }

  getTrainers(gymId: string): Observable<Trainer[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'trainers', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as Trainer)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get trainers.')))
    );
  }

  addTrainer(gymId: string, trainer: Omit<Trainer, 'id' | 'membersCount'>): Observable<Trainer> {
    const db = this.firebaseService.getDb();
    const id = 'trainer_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = trainer.branchId || tenantContext.getBranchId() || '';
    const newTrainer: Trainer = {
      ...trainer,
      id,
      gymId,
      branchId,
      membersCount: 0
    };
    return from(setDoc(doc(db, 'trainers', id), newTrainer)).pipe(
      map(() => {
        logAudit(this.injector, 'Trainer Change', 'trainer', id);
        return newTrainer;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add trainer.')))
    );
  }

  updateTrainer(gymId: string, trainer: Trainer): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'trainers', trainer.id), trainer)).pipe(
      map(() => {
        logAudit(this.injector, 'Trainer Change', 'trainer', trainer.id);
        return undefined;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update trainer.')))
    );
  }

  deleteTrainer(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'trainers', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete trainer.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseAttendanceRepository implements IAttendanceRepository {
  constructor(
    private firebaseService: FirebaseService,
    private injector: Injector
  ) { }

  getAttendance(gymId: string): Observable<Attendance[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'attendance', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as Attendance)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get attendance records.')))
    );
  }

  markAttendance(gymId: string, memberId: string, status: 'present' | 'absent', timeIn: string): Observable<Attendance> {
    const db = this.firebaseService.getDb();
    const date = new Date().toISOString().split('T')[0];

    const q = query(
      collection(db, 'attendance'),
      where('gymId', '==', gymId),
      where('memberId', '==', memberId),
      where('date', '==', date)
    );

    return from(getDocs(q)).pipe(
      switchMap(snap => {
        if (!snap.empty) {
          const attDoc = snap.docs[0];
          const updated = {
            ...attDoc.data() as Attendance,
            status,
            timeIn
          };
          return from(setDoc(doc(db, 'attendance', attDoc.id), updated)).pipe(
            map(() => updated)
          );
        } else {
          const memberRef = doc(db, 'members', memberId);
          return from(getDoc(memberRef)).pipe(
            switchMap(memberSnap => {
              const memberName = memberSnap.exists() ? (memberSnap.data() as Member).name : 'Unknown';
              const memberBranchId = memberSnap.exists() ? (memberSnap.data() as Member).branchId : '';
              const tenantContext = this.injector.get(TenantContextService);
              const branchId = memberBranchId || tenantContext.getBranchId() || '';
              const id = 'att_' + Math.random().toString(36).substring(2, 9);
              const newAttendance: Attendance = {
                id,
                gymId,
                branchId,
                memberId,
                memberName,
                date,
                timeIn,
                status
              };

              const writeOp = from(setDoc(doc(db, 'attendance', id), newAttendance));
              if (status === 'present' && memberSnap.exists()) {
                const currentCount = (memberSnap.data() as Member).attendanceCount || 0;
                return forkJoin([
                  writeOp,
                  from(updateDoc(memberRef, { attendanceCount: currentCount + 1 }))
                ]).pipe(
                  map(() => newAttendance)
                );
              }

              return writeOp.pipe(map(() => newAttendance));
            })
          );
        }
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to mark attendance.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseMembershipPlanRepository implements IMembershipPlanRepository {
  constructor(private firebaseService: FirebaseService) { }

  getPlans(gymId: string): Observable<MembershipPlan[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'membership_plans'), where('gymId', '==', gymId));

    return from(getDocs(q)).pipe(
      switchMap(plansSnap => {
        const plans = plansSnap.docs.map(d => d.data() as MembershipPlan);
        if (plans.length === 0) {
          return of([]);
        }

        const membersQ = query(
          collection(db, 'members'),
          where('gymId', '==', gymId),
          where('status', '==', 'active')
        );

        return from(getDocs(membersQ)).pipe(
          map(membersSnap => {
            const activeMembers = membersSnap.docs.map(d => d.data() as Member);
            return plans.map(plan => {
              const count = activeMembers.filter(m => m.planId === plan.id).length;
              return { ...plan, activeMembersCount: count };
            });
          })
        );
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get plans.')))
    );
  }

  addPlan(gymId: string, plan: Omit<MembershipPlan, 'id' | 'activeMembersCount'>): Observable<MembershipPlan> {
    const db = this.firebaseService.getDb();
    const id = 'plan_' + Math.random().toString(36).substring(2, 9);
    const newPlan: MembershipPlan = {
      ...plan,
      id,
      gymId,
      activeMembersCount: 0
    };
    return from(setDoc(doc(db, 'membership_plans', id), newPlan)).pipe(
      map(() => newPlan),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add plan.')))
    );
  }

  updatePlan(gymId: string, plan: MembershipPlan): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'membership_plans', plan.id), plan)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update plan.')))
    );
  }

  deletePlan(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'membership_plans', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete plan.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseActivityLogRepository implements IActivityLogRepository {
  constructor(private firebaseService: FirebaseService) { }

  getLogs(gymId: string): Observable<ActivityLog[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'activity_logs'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => {
        const logs = snap.docs.map(d => d.data() as ActivityLog);
        logs.sort((a, b) => b.time.localeCompare(a.time));
        return logs.slice(0, 20);
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get activity logs.')))
    );
  }

  addLog(gymId: string, text: string, type: 'join' | 'payment' | 'attendance' | 'plan-change'): Observable<ActivityLog> {
    const db = this.firebaseService.getDb();
    const id = 'log_' + Math.random().toString(36).substring(2, 9);
    const newLog: ActivityLog = {
      id,
      gymId,
      text,
      time: new Date().toISOString(),
      type
    };
    return from(setDoc(doc(db, 'activity_logs', id), newLog)).pipe(
      map(() => newLog),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add activity log.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseWhatsAppRepository implements IWhatsAppRepository {
  constructor(private firebaseService: FirebaseService) { }

  getTemplates(gymId: string): Observable<WhatsAppTemplate[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'whatsapp_templates'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as WhatsAppTemplate)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get WhatsApp templates.')))
    );
  }

  updateTemplate(gymId: string, template: WhatsAppTemplate): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'whatsapp_templates', template.id), template)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update template.')))
    );
  }

  getReminders(gymId: string): Observable<WhatsAppReminder[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'whatsapp_reminders'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as WhatsAppReminder)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get reminders.')))
    );
  }

  addReminder(gymId: string, reminder: Omit<WhatsAppReminder, 'id'>): Observable<WhatsAppReminder> {
    const db = this.firebaseService.getDb();
    const id = 'rem_' + Math.random().toString(36).substring(2, 9);
    const newReminder: WhatsAppReminder = {
      ...reminder,
      id,
      gymId
    };
    return from(setDoc(doc(db, 'whatsapp_reminders', id), newReminder)).pipe(
      map(() => newReminder),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add reminder.')))
    );
  }

  updateReminder(gymId: string, reminder: WhatsAppReminder): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'whatsapp_reminders', reminder.id), reminder)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update reminder.')))
    );
  }

  deleteReminder(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'whatsapp_reminders', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete reminder.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseBodyProgressRepository implements IBodyProgressRepository {
  constructor(private firebaseService: FirebaseService) { }

  getEntries(gymId: string, memberId: string): Observable<BodyProgressEntry[]> {
    const db = this.firebaseService.getDb();
    const q = query(
      collection(db, 'body_progress'),
      where('gymId', '==', gymId),
      where('memberId', '==', memberId)
    );
    return from(getDocs(q)).pipe(
      map(snap => {
        const entries = snap.docs.map(d => d.data() as BodyProgressEntry);
        entries.sort((a, b) => b.date.localeCompare(a.date));
        return entries;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get progress entries.')))
    );
  }

  getAllEntries(gymId: string): Observable<BodyProgressEntry[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'body_progress'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => {
        const entries = snap.docs.map(d => d.data() as BodyProgressEntry);
        entries.sort((a, b) => b.date.localeCompare(a.date));
        return entries;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get all progress entries.')))
    );
  }

  addEntry(gymId: string, entry: Omit<BodyProgressEntry, 'id'>): Observable<BodyProgressEntry> {
    const db = this.firebaseService.getDb();
    const id = 'bp_' + Math.random().toString(36).substring(2, 9);
    const newEntry: BodyProgressEntry = {
      ...entry,
      id,
      gymId
    };

    const memberRef = doc(db, 'members', entry.memberId);
    return from(setDoc(doc(db, 'body_progress', id), newEntry)).pipe(
      switchMap(() => from(updateDoc(memberRef, { weight: entry.weight }))),
      map(() => newEntry),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add progress entry.')))
    );
  }

  deleteEntry(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'body_progress', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete progress entry.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseFinanceRepository implements IFinanceRepository {
  constructor(
    private firebaseService: FirebaseService,
    private injector: Injector
  ) { }

  getExpenses(gymId: string): Observable<Expense[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'expenses', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as Expense)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get expenses.')))
    );
  }

  addExpense(gymId: string, expense: Omit<Expense, 'id'>): Observable<Expense> {
    const db = this.firebaseService.getDb();
    const id = 'exp_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = (expense as any).branchId || tenantContext.getBranchId() || '';
    const newExpense: Expense = {
      ...expense,
      id,
      gymId,
      branchId
    } as Expense;
    return from(setDoc(doc(db, 'expenses', id), newExpense)).pipe(
      map(() => {
        logAudit(this.injector, 'Expense Entry', 'expense', id);
        return newExpense;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add expense.')))
    );
  }

  updateExpense(gymId: string, expense: Expense): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'expenses', expense.id), expense)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update expense.')))
    );
  }

  deleteExpense(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'expenses', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete expense.')))
    );
  }

  getInvoices(gymId: string): Observable<Invoice[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'invoices', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as Invoice)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get invoices.')))
    );
  }

  addInvoice(gymId: string, invoice: Omit<Invoice, 'id'>): Observable<Invoice> {
    const db = this.firebaseService.getDb();
    const id = 'inv_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = (invoice as any).branchId || tenantContext.getBranchId() || '';
    const newInvoice: Invoice = {
      ...invoice,
      id,
      gymId,
      branchId
    } as Invoice;
    return from(setDoc(doc(db, 'invoices', id), newInvoice)).pipe(
      map(() => {
        logAudit(this.injector, 'Invoice Creation', 'invoice', id);
        return newInvoice;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add invoice.')))
    );
  }

  updateInvoice(gymId: string, invoice: Invoice): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'invoices', invoice.id), invoice)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update invoice.')))
    );
  }

  getCollections(gymId: string): Observable<Collection[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'collections', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as Collection)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get collections.')))
    );
  }

  addCollection(gymId: string, collection: Omit<Collection, 'id'>): Observable<Collection> {
    const db = this.firebaseService.getDb();
    const id = 'col_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = (collection as any).branchId || tenantContext.getBranchId() || '';
    const newCollection: Collection = {
      ...collection,
      id,
      gymId,
      branchId
    } as Collection;
    return from(setDoc(doc(db, 'collections', id), newCollection)).pipe(
      map(() => newCollection),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add collection.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseEmployeeRepository implements IEmployeeRepository {
  constructor(
    private firebaseService: FirebaseService,
    private injector: Injector
  ) { }

  getEmployees(gymId: string): Observable<Employee[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'employees', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as Employee)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get employees.')))
    );
  }

  getEmployeeById(gymId: string, id: string): Observable<Employee | null> {
    const db = this.firebaseService.getDb();
    return from(getDoc(doc(db, 'employees', id))).pipe(
      map(snap => {
        if (snap.exists()) {
          const emp = snap.data() as Employee;
          return emp.gymId === gymId ? emp : null;
        }
        return null;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get employee.')))
    );
  }

  addEmployee(gymId: string, employee: Omit<Employee, 'id'>): Observable<Employee> {
    const db = this.firebaseService.getDb();
    const auth = this.firebaseService.getAuth();
    const config = auth.app.options;
    
    if (!employee.email) {
      return throwError(() => new Error('Email address is required for employee onboarding.'));
    }
    
    const cleanEmail = employee.email.toLowerCase().trim();
    
    // Helper to generate a secure random password satisfying Firebase Auth rules
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

    // 1. Check for duplicate emails in Firestore collections first
    const empQ = query(collection(db, 'employees'), where('email', '==', cleanEmail));
    return from(getDocs(empQ)).pipe(
      switchMap(empSnap => {
        if (!empSnap.empty) {
          return throwError(() => new Error('An employee with this email already exists in Firestore.'));
        }
        
        const userQ = query(collection(db, 'users'), where('email', '==', cleanEmail));
        return from(getDocs(userQ)).pipe(
          switchMap(userSnap => {
            if (!userSnap.empty) {
              return throwError(() => new Error('A user profile with this email already exists.'));
            }
            
            // 2. Initialize a temporary secondary Firebase App to create user without taking over the admin session
            const tempAppName = 'temp_onboard_' + Math.random().toString(36).substring(2, 9);
            let tempApp;
            try {
              tempApp = initializeApp(config, tempAppName);
            } catch (err: any) {
              return throwError(() => new Error('Failed to initialize onboarding context: ' + err.message));
            }
            
            const tempAuth = getAuth(tempApp);

            // 3. Create the user in Firebase Authentication
            return from(createUserWithEmailAndPassword(tempAuth, cleanEmail, generatedPassword)).pipe(
              switchMap(cred => {
                const uid = cred.user.uid;
                const tenantContext = this.injector.get(TenantContextService);
                const branchId = employee.branchId || tenantContext.getBranchId() || '';
                
                // Construct Employee details
                const newEmp: Employee = {
                  ...employee,
                  id: uid,
                  gymId,
                  branchId,
                  password: generatedPassword // Temporarily attached for the success dialog display
                };

                const cleanEmp = { ...newEmp };
                delete cleanEmp.password; // Do not store the plain text password in Firestore
                Object.keys(cleanEmp).forEach(key => {
                  if ((cleanEmp as any)[key] === undefined) {
                    delete (cleanEmp as any)[key];
                  }
                });

                // Construct UserProfile for login session mapping
                const userProfile: UserProfile = {
                  id: uid,
                  name: newEmp.fullName,
                  email: cleanEmail,
                  avatarUrl: newEmp.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newEmp.fullName)}`,
                  role: newEmp.role,
                  gymId,
                  branchId,
                  isFirstLogin: true,
                  tempPasswordExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                  permissions: [],
                  lastLogin: new Date().toISOString(),
                  sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
                };

                const cleanUserProfile = { ...userProfile };
                Object.keys(cleanUserProfile).forEach(key => {
                  if ((cleanUserProfile as any)[key] === undefined) {
                    delete (cleanUserProfile as any)[key];
                  }
                });

                // 4. Save to Firestore (employees and users collections) and trigger password reset email
                return forkJoin([
                  from(setDoc(doc(db, 'employees', uid), cleanEmp)),
                  from(setDoc(doc(db, 'users', uid), cleanUserProfile)),
                  from(sendPasswordResetEmail(this.firebaseService.getAuth(), cleanEmail))
                ]).pipe(
                  // Complete transaction by signing out and deleting temp app context
                  switchMap(() => from(signOut(tempAuth)).pipe(
                    switchMap(() => from(deleteApp(tempApp))),
                    map(() => {
                      logAudit(this.injector, 'Employee Creation', 'employee', uid);
                      return newEmp;
                    })
                  )),
                  catchError(firestoreErr => {
                    // Rollback Firebase Auth user if DB write fails
                    return from(deleteUser(cred.user)).pipe(
                      switchMap(() => from(deleteApp(tempApp))),
                      switchMap(() => throwError(() => new Error('Registration failed while saving records: ' + (firestoreErr.message || firestoreErr)))),
                      catchError(() => {
                        // If deleteUser fails, try deleting the app anyway
                        return from(deleteApp(tempApp)).pipe(
                          switchMap(() => throwError(() => new Error('Registration failed while saving records. Rollback authentication user cleanup was incomplete.')))
                        );
                      })
                    );
                  })
                );
              }),
              catchError(authErr => {
                // Cleanup temp app context and map code errors to friendly alerts
                return from(deleteApp(tempApp)).pipe(
                  switchMap(() => {
                    let errMsg = authErr.message || 'Authentication user creation failed.';
                    if (authErr.code === 'auth/email-already-in-use') {
                      errMsg = 'This email address is already in use in Firebase Authentication.';
                    } else if (authErr.code === 'auth/operation-not-allowed') {
                      errMsg = 'Email/Password sign-in provider is not enabled in Firebase Console. Please enable it under Authentication > Sign-in method.';
                    } else if (authErr.code === 'auth/invalid-email') {
                      errMsg = 'The email address is invalid.';
                    } else if (authErr.code === 'auth/weak-password') {
                      errMsg = 'The password is too weak.';
                    }
                    return throwError(() => new Error(errMsg));
                  })
                );
              })
            );
          })
        );
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add employee.')))
    );
  }

  updateEmployee(gymId: string, employee: Employee): Observable<void> {
    const db = this.firebaseService.getDb();
    const empRef = doc(db, 'employees', employee.id);
    const userRef = doc(db, 'users', employee.id);

    const cleanEmp = { ...employee };
    delete cleanEmp.password; // Do not store plain text password in employee document
    Object.keys(cleanEmp).forEach(key => {
      if ((cleanEmp as any)[key] === undefined) {
        delete (cleanEmp as any)[key];
      }
    });

    return from(getDoc(empRef)).pipe(
      switchMap(oldEmpSnap => {
        const oldEmp = oldEmpSnap.exists() ? oldEmpSnap.data() as Employee : null;
        const ops = [
          from(setDoc(empRef, cleanEmp)),
          from(getDoc(userRef)).pipe(
            switchMap(snap => {
              if (snap.exists()) {
                const updatedUser = {
                  ...snap.data(),
                  name: employee.fullName,
                  role: employee.role,
                  branchId: employee.branchId,
                  avatarUrl: employee.photoUrl || snap.data()['avatarUrl']
                };
                return from(setDoc(userRef, updatedUser));
              }
              return of(undefined);
            })
          )
        ];

        return forkJoin(ops).pipe(
          map(() => {
            if (oldEmp && oldEmp.role !== employee.role) {
              logAudit(this.injector, 'Role Change', 'employee', employee.id);
            }
            return undefined;
          })
        );
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update employee.')))
    );
  }

  deleteEmployee(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();

    return forkJoin([
      from(deleteDoc(doc(db, 'employees', id))),
      from(deleteDoc(doc(db, 'users', id)))
    ]).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete employee.')))
    );
  }

  getAttendance(gymId: string): Observable<EmployeeAttendance[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'employee_attendance', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as EmployeeAttendance)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get employee attendance.')))
    );
  }

  markAttendance(gymId: string, record: Omit<EmployeeAttendance, 'id'>): Observable<EmployeeAttendance> {
    const db = this.firebaseService.getDb();
    const id = 'att_emp_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = record.branchId || tenantContext.getBranchId() || '';
    const newRecord: EmployeeAttendance = {
      ...record,
      id,
      gymId,
      branchId
    };
    return from(setDoc(doc(db, 'employee_attendance', id), newRecord)).pipe(
      map(() => newRecord),
      catchError(err => throwError(() => new Error(err.message || 'Failed to mark employee attendance.')))
    );
  }

  getPayroll(gymId: string): Observable<EmployeePayroll[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'employee_payroll', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as EmployeePayroll)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get employee payroll.')))
    );
  }

  addPayroll(gymId: string, payroll: Omit<EmployeePayroll, 'id'>): Observable<EmployeePayroll> {
    const db = this.firebaseService.getDb();
    const id = 'pay_emp_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = payroll.branchId || tenantContext.getBranchId() || '';
    const newPayroll: EmployeePayroll = {
      ...payroll,
      id,
      gymId,
      branchId
    };
    return from(setDoc(doc(db, 'employee_payroll', id), newPayroll)).pipe(
      map(() => newPayroll),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add payroll record.')))
    );
  }

  getPerformance(gymId: string): Observable<EmployeePerformance[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'employee_performance', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as EmployeePerformance)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get performance reviews.')))
    );
  }

  addPerformance(gymId: string, performance: Omit<EmployeePerformance, 'id'>): Observable<EmployeePerformance> {
    const db = this.firebaseService.getDb();
    const id = 'perf_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = performance.branchId || tenantContext.getBranchId() || '';
    const newPerformance: EmployeePerformance = {
      ...performance,
      id,
      gymId,
      branchId
    };
    return from(setDoc(doc(db, 'employee_performance', id), newPerformance)).pipe(
      map(() => newPerformance),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add performance review.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebasePersonalTrainingRepository implements IPersonalTrainingRepository {
  constructor(
    private firebaseService: FirebaseService,
    private injector: Injector
  ) { }

  getPTPlans(gymId: string): Observable<PTPlan[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'ptPlans', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as PTPlan)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get PT plans.')))
    );
  }

  addPTPlan(gymId: string, plan: Omit<PTPlan, 'id'>): Observable<PTPlan> {
    const db = this.firebaseService.getDb();
    const id = 'pt_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = (plan as any).branchId || tenantContext.getBranchId() || '';
    const newPlan: PTPlan = {
      ...plan,
      id,
      gymId,
      branchId
    } as any;
    return from(setDoc(doc(db, 'ptPlans', id), newPlan)).pipe(
      map(() => newPlan),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add PT plan.')))
    );
  }

  updatePTPlan(gymId: string, plan: PTPlan): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'ptPlans', plan.id), plan)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update PT plan.')))
    );
  }

  deletePTPlan(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'ptPlans', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete PT plan.')))
    );
  }

  getPTSessions(gymId: string): Observable<PTSession[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'ptSessions', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as PTSession)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get PT sessions.')))
    );
  }

  addPTSession(gymId: string, session: Omit<PTSession, 'id'>): Observable<PTSession> {
    const db = this.firebaseService.getDb();
    const id = 'pts_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = session.branchId || tenantContext.getBranchId() || '';
    const newSession: PTSession = {
      ...session,
      id,
      gymId,
      branchId
    };

    const histId = 'sh_' + Math.random().toString(36).substring(2, 9);
    const hist: SessionHistory = {
      id: histId,
      gymId,
      branchId,
      sessionId: id,
      memberId: session.memberId,
      trainerId: session.trainerId,
      action: 'schedule',
      timestamp: new Date().toISOString(),
      performedBy: session.trainerName,
      notes: 'Session scheduled'
    };

    return forkJoin([
      from(setDoc(doc(db, 'ptSessions', id), newSession)),
      from(setDoc(doc(db, 'sessionHistory', histId), hist))
    ]).pipe(
      map(() => newSession),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add PT session.')))
    );
  }

  updatePTSession(gymId: string, session: PTSession): Observable<void> {
    const db = this.firebaseService.getDb();
    const sessionRef = doc(db, 'ptSessions', session.id);

    return from(getDoc(sessionRef)).pipe(
      switchMap(snap => {
        if (!snap.exists()) {
          return throwError(() => new Error('Session not found.'));
        }
        const oldSession = snap.data() as PTSession;
        
        let action: SessionHistory['action'] = 'add_notes';
        let note = 'Session notes updated';
        let walletUpdate: Observable<any> = of(undefined);


        if (oldSession.status !== session.status) {
          if (session.status === 'completed') {
            action = 'complete';
            note = 'Session marked complete';

            const walletQ = query(
              collection(db, 'memberPTPlans'),
              where('gymId', '==', gymId),
              where('memberId', '==', session.memberId),
              where('status', '==', 'active')
            );
            walletUpdate = from(getDocs(walletQ)).pipe(
              switchMap(walletSnap => {
                if (!walletSnap.empty) {
                  const wDoc = walletSnap.docs[0];
                  const wData = wDoc.data() as MemberPTPlan;
                  const updatedCompleted = wData.completedSessions + 1;
                  const updatedRemaining = Math.max(0, wData.totalSessions - updatedCompleted);
                  const updatedStatus = updatedRemaining === 0 ? 'completed' : 'active';
                  
                  return from(updateDoc(doc(db, 'memberPTPlans', wDoc.id), {
                    completedSessions: updatedCompleted,
                    remainingSessions: updatedRemaining,
                    status: updatedStatus
                  })).pipe(
                    switchMap(() => {
                      const memberRef = doc(db, 'members', session.memberId);
                      return from(updateDoc(memberRef, {
                        ptSessionsCompleted: updatedCompleted,
                        ptSessionsRemaining: updatedRemaining
                      }));
                    })
                  );
                }
                return of(undefined);
              })
            );
          } else if (session.status === 'cancelled') {
            action = 'cancel';
            note = 'Session cancelled';
          } else if (session.status === 'rescheduled') {
            action = 'reschedule';
            note = `Rescheduled to ${session.date} at ${session.time}`;
          }
        }

        const histId = 'sh_' + Math.random().toString(36).substring(2, 9);
        const hist: SessionHistory = {
          id: histId,
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

        return forkJoin([
          from(setDoc(sessionRef, session)),
          from(setDoc(doc(db, 'sessionHistory', histId), hist)),
          walletUpdate
        ]).pipe(map(() => undefined));
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update PT session.')))
    );
  }

  deletePTSession(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'ptSessions', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete PT session.')))
    );
  }

  getTrainerAssignments(gymId: string): Observable<TrainerAssignment[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'trainerAssignments', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as TrainerAssignment)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get trainer assignments.')))
    );
  }

  addTrainerAssignment(gymId: string, assignment: Omit<TrainerAssignment, 'id'>): Observable<TrainerAssignment> {
    const db = this.firebaseService.getDb();
    const id = 'ta_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = (assignment as any).branchId || tenantContext.getBranchId() || '';
    const newAssignment: TrainerAssignment = {
      ...assignment,
      id,
      gymId,
      branchId
    } as any;
    return from(setDoc(doc(db, 'trainerAssignments', id), newAssignment)).pipe(
      map(() => newAssignment),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add trainer assignment.')))
    );
  }

  getSessionHistory(gymId: string): Observable<SessionHistory[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'sessionHistory', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as SessionHistory)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get session history.')))
    );
  }

  addSessionHistory(gymId: string, history: Omit<SessionHistory, 'id'>): Observable<SessionHistory> {
    const db = this.firebaseService.getDb();
    const id = 'sh_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = history.branchId || tenantContext.getBranchId() || '';
    const newHistory: SessionHistory = {
      ...history,
      id,
      gymId,
      branchId
    };
    return from(setDoc(doc(db, 'sessionHistory', id), newHistory)).pipe(
      map(() => newHistory),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add session history.')))
    );
  }

  getTrainerRevenue(gymId: string): Observable<TrainerRevenue[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'trainerRevenue', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as TrainerRevenue)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get trainer revenue.')))
    );
  }

  addTrainerRevenue(gymId: string, revenue: Omit<TrainerRevenue, 'id'>): Observable<TrainerRevenue> {
    const db = this.firebaseService.getDb();
    const id = 'tr_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = (revenue as any).branchId || tenantContext.getBranchId() || '';
    const newRev: TrainerRevenue = {
      ...revenue,
      id,
      gymId,
      branchId
    } as any;
    return from(setDoc(doc(db, 'trainerRevenue', id), newRev)).pipe(
      map(() => newRev),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add trainer revenue.')))
    );
  }

  getMemberPTPlans(gymId: string): Observable<MemberPTPlan[]> {
    return from(getDocs(getBranchFilteredQuery(this.injector, this.firebaseService, 'memberPTPlans', gymId))).pipe(
      map(snap => snap.docs.map(d => d.data() as MemberPTPlan)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get member PT plans.')))
    );
  }

  getMemberPTPlanById(gymId: string, id: string): Observable<MemberPTPlan | null> {
    const db = this.firebaseService.getDb();
    return from(getDoc(doc(db, 'memberPTPlans', id))).pipe(
      map(snap => {
        if (snap.exists()) {
          const m = snap.data() as MemberPTPlan;
          return m.gymId === gymId ? m : null;
        }
        return null;
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get member PT plan.')))
    );
  }

  addMemberPTPlan(gymId: string, memberPlan: Omit<MemberPTPlan, 'id'>): Observable<MemberPTPlan> {
    const db = this.firebaseService.getDb();
    const id = 'mpt_' + Math.random().toString(36).substring(2, 9);
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = (memberPlan as any).branchId || tenantContext.getBranchId() || '';
    const newMP: MemberPTPlan = {
      ...memberPlan,
      id,
      gymId,
      branchId
    };
    return from(setDoc(doc(db, 'memberPTPlans', id), newMP)).pipe(
      map(() => newMP),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add member PT plan.')))
    );
  }

  updateMemberPTPlan(gymId: string, memberPlan: MemberPTPlan): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'memberPTPlans', memberPlan.id), memberPlan)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update member PT plan.')))
    );
  }
}
