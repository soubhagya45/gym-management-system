import { Injectable, Injector } from '@angular/core';
import { Observable, from, of, throwError, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';
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
import { Expense, Invoice, Collection } from '../../../core/models/finance.entity';
import { Employee, EmployeeAttendance, EmployeePayroll, EmployeePerformance } from '../../../core/models/employee.entity';
import { SubscriptionPlan } from '../../../core/enums/subscription-plans.enum';
import { AuthState } from '../../../presentation/state/auth.state';
import { TenantContextService } from '../../../domain/tenancy/tenant-context.service';
import { AuditLoggerService } from '../../../services/audit-logger.service';
import { DeviceConfiguration } from '../../../core/models/device-configuration.model';
import { AttendanceMapping } from '../../../core/models/attendance-mapping.model';
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
  IEmployeeRepository,
  IPersonalTrainingRepository,
  IAuditLogRepository,
  IPaymentSettingsRepository,
  IProductRepository,
  IImportProfileRepository,
  IImportHistoryRepository,
  IUnitOfWork
} from '../../../core/interfaces/repository.interfaces';
import { AuditLog } from '../../../core/models/audit-log.model';
import { PaymentSettings } from '../../../core/models/payment-settings.model';

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
  where,
  writeBatch
} from 'firebase/firestore';

function getBranchFilteredQuery(injector: Injector, firebaseService: FirebaseService, collectionName: string, gymId: string) {
  const db = firebaseService.getDb();
  const authState = injector.get(AuthState);
  const tenantContext = injector.get(TenantContextService);
  const user = authState.currentUserValue;
  const colRef = collection(db, collectionName);

  if (!user) {
    // Defensive guard: APP_INITIALIZER should prevent queries from reaching here
    // without an authenticated user. If this warning appears, investigate whether
    // the initializer ran correctly or whether localStorage was corrupt on startup.
    console.warn(`[getBranchFilteredQuery] No authenticated user found when querying '${collectionName}'. Firestore rules will reject this request.`);
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

function logAudit(injector: Injector, action: string, entityType: string, entityId: string, entityName?: string) {
  try {
    const auditLogger = injector.get(AuditLoggerService);
    auditLogger.log(action, entityType, entityId, entityName);
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

              // ── ACCOUNT STATUS GATE ─────────────────────────────────────
              // For non-owner roles: read accountStatus from the employees
              // collection (authoritative source set by the gym owner).
              // For owners/super_admin: read from the users document itself.
              const checkStatus = (status: string | undefined, source: string): boolean => {
                if (status === 'Suspended' || status === 'Inactive') {
                  return false; // blocked
                }
                return true;
              };

              // First check users document status
              if (!checkStatus((profile as any).accountStatus, 'users')) {
                return from(signOut(auth)).pipe(
                  switchMap(() => throwError(() => new Error(
                    `ACCOUNT_DISABLED:${(profile as any).accountStatus}`
                  )))
                );
              }

              // For employee roles: cross-check with employees collection
              const isEmployeeRole = [
                'branch_manager', 'trainer', 'staff'
              ].includes(profile.role as string);

              const continueWithProfile = (enrichedProfile: UserProfile) => {
                // Enforce temporary employee password expiration (24h)
                if (enrichedProfile.isFirstLogin && (enrichedProfile as any).tempPasswordExpiresAt) {
                  const expiresAt = new Date((enrichedProfile as any).tempPasswordExpiresAt).getTime();
                  if (Date.now() > expiresAt) {
                    return throwError(() => new Error('Temporary employee password has expired. Please request a new password reset or contact the Gym Owner.'));
                  }
                }

                // Audit logging trigger
                const logId = 'audit_' + Math.random().toString(36).substring(2, 9);
                setDoc(doc(db, 'auditLogs', logId), {
                  id: logId,
                  userId: uid,
                  role: enrichedProfile.role,
                  action: 'User Login',
                  entityType: 'user',
                  entityId: uid,
                  timestamp: new Date().toISOString(),
                  gymId: enrichedProfile.gymId || ''
                }).catch(err => console.error('Login audit log failed:', err));

                return of(enrichedProfile);
              };

              if (isEmployeeRole) {
                // Check employee doc for authoritative status
                const empRef = doc(db, 'employees', uid);
                return from(getDoc(empRef)).pipe(
                  switchMap(empSnap => {
                    if (empSnap.exists()) {
                      const empData = empSnap.data();
                      const empStatus = empData['accountStatus'];
                      if (empStatus === 'Suspended' || empStatus === 'Inactive') {
                        return from(signOut(auth)).pipe(
                          switchMap(() => throwError(() => new Error(
                            `ACCOUNT_DISABLED:${empStatus}`
                          )))
                        );
                      }
                      // Enrich profile with employee-level accountStatus
                      const enriched: UserProfile = {
                        ...profile,
                        accountStatus: empStatus || 'Active'
                      };
                      return continueWithProfile(enriched);
                    }
                    // No employee doc found — continue with users profile
                    return continueWithProfile({ ...profile, accountStatus: (profile as any).accountStatus || 'Active' });
                  })
                );
              }

              return continueWithProfile({ ...profile, accountStatus: (profile as any).accountStatus || 'Active' });
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
                    isFirstLogin: true,
                    accountStatus: (inviteData as any).accountStatus || 'Active'
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
          sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
          accountStatus: 'Active'
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
    const db = this.firebaseService.getDb();
    const currentUser = auth.currentUser;
    if (currentUser && currentUser.email?.toLowerCase().trim() === email.toLowerCase().trim()) {
      return from(updatePassword(currentUser, newPassword)).pipe(
        switchMap(() => {
          return from(updateDoc(doc(db, 'users', currentUser.uid), { isFirstLogin: false }));
        }),
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
    const auth = this.firebaseService.getAuth();
    const currentUser = auth.currentUser;
    const cleanEmail = email.toLowerCase().trim();

    const authState = this.injector.get(AuthState);
    const activeUser = authState.currentUserValue;
    const userGymId = activeUser?.gymId;

    if (currentUser && currentUser.email?.toLowerCase().trim() === cleanEmail) {
      return from(updateDoc(doc(db, 'users', currentUser.uid), { isFirstLogin: false })).pipe(
        map(() => undefined),
        catchError(() => {
          const q = userGymId
            ? query(collection(db, 'users'), where('gymId', '==', userGymId), where('email', '==', cleanEmail))
            : query(collection(db, 'users'), where('email', '==', cleanEmail));
          return from(getDocs(q)).pipe(
            switchMap(snap => {
              if (!snap.empty) {
                const userDoc = snap.docs[0];
                return from(updateDoc(doc(db, 'users', userDoc.id), { isFirstLogin: false }));
              }
              return throwError(() => new Error('User not found in system.'));
            }),
            map(() => undefined)
          );
        }),
        catchError(err => throwError(() => new Error(err.message || 'Failed to clear first login flag.')))
      );
    }

    const q = userGymId
      ? query(collection(db, 'users'), where('gymId', '==', userGymId), where('email', '==', cleanEmail))
      : query(collection(db, 'users'), where('email', '==', cleanEmail));
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

  getUsers(): Observable<UserProfile[]> {
    const db = this.firebaseService.getDb();
    return from(getDocs(collection(db, 'users'))).pipe(
      map(snap => snap.docs.map(d => d.data() as UserProfile)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get users.')))
    );
  }

  updateUserRole(userId: string, role: UserRole): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(updateDoc(doc(db, 'users', userId), { role })).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update user role.')))
    );
  }

  waitForAuthResolution(): Promise<boolean> {
    const auth = this.firebaseService.getAuth();
    return new Promise<boolean>((resolve) => {
      import('firebase/auth').then(({ onAuthStateChanged }) => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          unsubscribe();
          resolve(!!firebaseUser);
        });
      }).catch(() => {
        resolve(false);
      });
    });
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
    const authState = this.injector.get(AuthState);
    const user = authState.currentUserValue;

    if (!user) {
      return of([]);
    }

    if (user.role === UserRole.SuperAdmin) {
      return from(getDocs(collection(db, 'gyms'))).pipe(
        map(snap => snap.docs.map(d => d.data() as Gym)),
        catchError(err => throwError(() => new Error(err.message || 'Failed to get gyms.')))
      );
    }

    const gymId = user.gymId;
    if (!gymId) {
      return of([]);
    }

    return from(getDoc(doc(db, 'gyms', gymId))).pipe(
      map(snap => snap.exists() ? [snap.data() as Gym] : []),
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
    const id = (member as any).id || 'mem_' + Math.random().toString(36).substring(2, 9);
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
            logAudit(this.injector, 'Member Created', 'member', id, member.name);
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
        logAudit(this.injector, 'Member Updated', 'member', member.id, member.name);
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

  registerMember(payload: LeadConversionPayload): Observable<LeadConversionResult> {
    const leadRepo = this.injector.get(FirebaseLeadRepository);
    return leadRepo.convertLeadToMember(payload);
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

    const today = new Date().toISOString().split('T')[0];

    return new Observable<Payment>(observer => {
      try {
        const batch = writeBatch(db);

        // 1. Create the Payment document
        batch.set(doc(db, 'payments', id), newPayment);

        // 2. Update Member's balance
        const memberRef = doc(db, 'members', payment.memberId);
        batch.update(memberRef, { balance: payment.dueAmount });

        // 3. Create Invoice document
        const invoiceId = 'inv_' + Math.random().toString(36).substring(2, 9);
        const year = new Date().getFullYear();
        const rand = Math.floor(1000 + Math.random() * 9000);
        const gst = Math.round(payment.amount * 0.18 * 100) / 100;
        const baseAmount = payment.amount - gst;

        batch.set(doc(db, 'invoices', invoiceId), {
          id: invoiceId,
          gymId,
          branchId,
          invoiceNumber: `INV-${year}-${rand}`,
          memberId: payment.memberId,
          memberName: payment.memberName,
          membershipPlan: payment.planName || '',
          amount: Number(baseAmount.toFixed(2)),
          gst: Number(gst.toFixed(2)),
          discount: 0,
          finalAmount: payment.amount,
          paymentMethod: payment.status === 'paid' ? (payment.paymentMethod || 'UPI') : 'Pending',
          invoiceDate: payment.date || today,
          status: payment.status === 'paid' ? 'paid' : 'pending',
          collectedBy: payment.collectedBy || '',
          createdBy: payment.collectedBy || '',
          type: (payment as any).type || 'membership',
          trainerId: (payment as any).trainerId,
          trainerName: (payment as any).trainerName
        });

        // 4. Create Collection document if status is paid
        if (payment.status === 'paid') {
          const collectionId = 'col_' + Math.random().toString(36).substring(2, 9);
          batch.set(doc(db, 'collections', collectionId), {
            id: collectionId,
            gymId,
            branchId,
            receiptNo: `REC-${year}-${rand}`,
            memberId: payment.memberId,
            memberName: payment.memberName,
            membershipPlan: payment.planName || '',
            amount: payment.paidAmount || payment.amount,
            paymentMethod: payment.paymentMethod || 'UPI',
            date: payment.date || today,
            collectedBy: payment.collectedBy || '',
            type: (payment as any).type || 'membership',
            trainerId: (payment as any).trainerId,
            trainerName: (payment as any).trainerName
          });
        }

        // Commit all writes atomically
        batch.commit().then(() => {
          logAudit(this.injector, 'Payment Entry (Atomic Batch)', 'payment', id);
          observer.next(newPayment);
          observer.complete();
        }).catch(err => {
          observer.error(new Error(err.message || 'Payment recording batch failed.'));
        });
      } catch (err: any) {
        observer.error(new Error(err.message || 'Payment recording batch setup failed.'));
      }
    });
  }

  /**
   * Confirms a pending payment using a Firestore WriteBatch.
   * Atomically:
   *   1. Updates payment status to 'paid'
   *   2. Clears member balance
   *   3. Creates Invoice (only if one does not already exist for this payment)
   *   4. Creates Collection (only if one does not already exist for this payment)
   *
   * Includes an idempotent guard — if already paid, returns immediately.
   * Duplicate prevention via pre-batch Firestore queries.
   */
  confirmPayment(gymId: string, paymentId: string): Observable<void> {
    const db = this.firebaseService.getDb();
    const tenantContext = this.injector.get(TenantContextService);
    const branchId = tenantContext.getBranchId() || '';
    const paymentRef = doc(db, 'payments', paymentId);

    return from(getDoc(paymentRef)).pipe(
      switchMap(snap => {
        if (!snap.exists()) {
          return throwError(() => new Error('Payment record not found.'));
        }
        const payment = snap.data() as Payment;

        // Idempotent guard — already confirmed, no-op
        if (payment.status === 'paid') {
          return from(Promise.resolve() as Promise<void>);
        }

        const today = new Date().toISOString().split('T')[0];

        // Pre-batch duplicate checks
        const existingInvoiceQuery = query(
          collection(db, 'invoices'),
          where('memberId', '==', payment.memberId),
          where('gymId', '==', gymId)
        );
        const existingCollectionQuery = query(
          collection(db, 'collections'),
          where('memberId', '==', payment.memberId),
          where('gymId', '==', gymId),
          where('date', '==', payment.date || today)
        );

        return from(Promise.all([
          getDocs(existingInvoiceQuery),
          getDocs(existingCollectionQuery)
        ])).pipe(
          switchMap(([invoiceSnap, collectionSnap]) => {
            const invoiceExists = invoiceSnap.docs.some(d => {
              const inv = d.data() as any;
              return Math.abs((inv.finalAmount ?? inv.amount ?? 0) - payment.amount) < 0.01;
            });
            const collectionExists = collectionSnap.docs.some(d => {
              const col = d.data() as any;
              return Math.abs((col.amount ?? 0) - (payment.paidAmount || payment.amount)) < 0.01;
            });

            const batch = writeBatch(db);

            // 1. Update payment → paid
            batch.set(paymentRef, {
              ...payment,
              status: 'paid' as const,
              paidAmount: payment.amount,
              dueAmount: 0,
              date: today
            });

            // 2. Clear member balance
            batch.update(doc(db, 'members', payment.memberId), { balance: 0 });

            // 2b. Add Trainer Revenue if confirming a PT payment
            if (payment.type === 'pt' && payment.trainerId && payment.trainerId !== 'unassigned') {
              const trId = 'trev_' + Math.random().toString(36).substring(2, 9);
              batch.set(doc(db, 'trainerRevenue', trId), {
                id: trId,
                gymId,
                branchId,
                trainerId: payment.trainerId,
                trainerName: payment.trainerName || 'Unassigned',
                memberId: payment.memberId,
                memberName: payment.memberName,
                amount: payment.dueAmount,
                date: today,
                invoiceId: paymentId,
                ptPlanName: payment.planName,
                salespersonId: payment.salespersonId || '',
                salespersonName: payment.salespersonName || ''
              });
            }

            // 3. Create Invoice if not exists
            if (!invoiceExists) {
              const invoiceId = 'inv_' + Math.random().toString(36).substring(2, 9);
              const year = new Date().getFullYear();
              const rand = Math.floor(1000 + Math.random() * 9000);
              const gst = Math.round(payment.amount * 0.18 * 100) / 100;
              const baseAmount = payment.amount - gst;
              batch.set(doc(db, 'invoices', invoiceId), {
                id: invoiceId, gymId, branchId,
                invoiceNumber: `INV-${year}-${rand}`,
                memberId: payment.memberId, memberName: payment.memberName,
                membershipPlan: payment.planName || '',
                amount: Number(baseAmount.toFixed(2)),
                gst: Number(gst.toFixed(2)),
                discount: 0,
                finalAmount: payment.amount,
                paymentMethod: payment.paymentMethod || 'UPI',
                invoiceDate: today,
                status: 'paid',
                collectedBy: payment.collectedBy || '',
                createdBy: payment.collectedBy || '',
                type: (payment as any).type || 'membership',
                trainerId: (payment as any).trainerId,
                trainerName: (payment as any).trainerName
              });
            }

            // 4. Create Collection if not exists
            if (!collectionExists) {
              const collectionId = 'col_' + Math.random().toString(36).substring(2, 9);
              const year = new Date().getFullYear();
              const rand = Math.floor(1000 + Math.random() * 9000);
              batch.set(doc(db, 'collections', collectionId), {
                id: collectionId, gymId, branchId,
                receiptNo: `REC-${year}-${rand}`,
                memberId: payment.memberId, memberName: payment.memberName,
                membershipPlan: payment.planName || '',
                amount: payment.paidAmount || payment.amount,
                paymentMethod: payment.paymentMethod || 'UPI',
                date: today,
                collectedBy: payment.collectedBy || '',
                type: (payment as any).type || 'membership',
                trainerId: (payment as any).trainerId,
                trainerName: (payment as any).trainerName
              });
            }

            // COMMIT — all or nothing
            return from(batch.commit()).pipe(
              map(() => {
                logAudit(this.injector, 'Payment Confirmed (Atomic Batch)', 'payment', paymentId);
                return undefined as void;
              })
            );
          })
        );
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to confirm payment.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebasePaymentSettingsRepository implements IPaymentSettingsRepository {
  constructor(
    private firebaseService: FirebaseService,
    private injector: Injector
  ) { }

  getSettings(gymId: string): Observable<PaymentSettings[]> {
    const db = this.firebaseService.getDb();
    const q = query(
      collection(db, 'paymentSettings'),
      where('gymId', '==', gymId)
    );
    return from(getDocs(q)).pipe(
      map(snap => {
        const list = snap.docs.map(d => d.data() as PaymentSettings);
        // Group by provider and take the latest one (updatedAt or createdAt) to filter out duplicates
        const map = new Map<string, PaymentSettings>();
        list.forEach(item => {
          const existing = map.get(item.provider);
          if (!existing || (item.updatedAt && existing.updatedAt && item.updatedAt > existing.updatedAt)) {
            map.set(item.provider, item);
          }
        });
        return Array.from(map.values());
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get payment settings.')))
    );
  }

  getSettingsByProvider(gymId: string, provider: string): Observable<PaymentSettings | null> {
    const db = this.firebaseService.getDb();
    const q = query(
      collection(db, 'paymentSettings'),
      where('gymId', '==', gymId),
      where('provider', '==', provider)
    );
    return from(getDocs(q)).pipe(
      map(snap => {
        if (snap.empty) return null;
        const list = snap.docs.map(d => d.data() as PaymentSettings);
        // Sort by updatedAt descending to retrieve the latest one
        list.sort((a, b) => {
          const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
          const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
          return timeB - timeA;
        });
        return list[0];
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get settings by provider.')))
    );
  }

  saveSettings(gymId: string, settings: PaymentSettings): Observable<void> {
    const db = this.firebaseService.getDb();
    const providerKey = settings.provider.replace(/[^a-zA-Z0-9]/g, '_');
    const id = settings.id || `ps_${gymId}_${providerKey}`;
    const updated: PaymentSettings = {
      ...settings,
      id,
      gymId,
      updatedAt: new Date().toISOString()
    };
    if (!settings.id) {
      updated.createdAt = new Date().toISOString();
    }
    return from(setDoc(doc(db, 'paymentSettings', id), updated)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to save payment settings.')))
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
    const id = (lead as any).id || 'lead_' + Math.random().toString(36).substring(2, 9);
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

  /**
   * Atomically converts a Lead to a Member using a Firestore WriteBatch.
   *
   * Documents written in one atomic commit:
   *   1. members/{memberId}               — new Member record
   *   2. leads/{leadId}                   — status → Converted
   *   3. payments/{paymentId}             — membership payment
   *   4. invoices/{invoiceId}             — membership invoice
   *   5. members/{memberId} (balance)     — balance field update
   *   --- IF interestedInPT ---
   *   6. memberPTPlans/{mptId}            — PT wallet
   *   7. trainerAssignments/{taId}        — trainer assignment
   *   8. members/{memberId} (PT fields)   — member PT metadata
   *   9. payments/{ptPayId}               — PT payment (if PT)
   *  10. trainerRevenue/{trId}            — revenue record (if paid)
   *
   * Either ALL succeed or ALL fail. No partial state is possible.
   */
  convertLeadToMember(payload: LeadConversionPayload): Observable<LeadConversionResult> {
    const db = this.firebaseService.getDb();
    const { lead, memberData, membershipPlanPrice, conversionDetails, gymId, branchId, today } = payload;

    // ── Pre-generate all IDs deterministically before building the batch ──
    const memberId        = 'mem_'  + Math.random().toString(36).substring(2, 9);
    const paymentId       = 'pay_'  + Math.random().toString(36).substring(2, 9);
    const invoiceId       = 'inv_'  + Math.random().toString(36).substring(2, 9);
    const mptId           = 'mpt_'  + Math.random().toString(36).substring(2, 9);
    const taId            = 'ta_'   + Math.random().toString(36).substring(2, 9);
    const ptPayId         = 'pay_'  + Math.random().toString(36).substring(2, 9);
    const trId            = 'trev_' + Math.random().toString(36).substring(2, 9);

    const hasPT   = conversionDetails.interestedInPT && !!conversionDetails.ptPlanId;
    const ptPlanPrice = hasPT ? (conversionDetails.ptPlanPrice || 0) : 0;

    // ── Proportional Discount Allocation ──
    const discountType = conversionDetails.discountType || 'none';
    const discountValue = conversionDetails.discountValue || 0;
    let mDiscount = 0;
    let ptDiscount = 0;

    if (discountType === 'percentage') {
      mDiscount = membershipPlanPrice * (discountValue / 100);
      if (hasPT) {
        ptDiscount = ptPlanPrice * (discountValue / 100);
      }
    } else if (discountType === 'flat') {
      const totalOrig = membershipPlanPrice + ptPlanPrice;
      if (totalOrig > 0) {
        mDiscount = discountValue * (membershipPlanPrice / totalOrig);
        ptDiscount = discountValue - mDiscount;
      }
    }

    mDiscount = Math.round(mDiscount * 100) / 100;
    ptDiscount = Math.round(ptDiscount * 100) / 100;

    const mFinal = Math.max(0, membershipPlanPrice - mDiscount);
    const ptFinal = Math.max(0, ptPlanPrice - ptDiscount);
    const totalFinal = mFinal + ptFinal;

    // ── Proportional Paid Allocation ──
    const paidAmount = conversionDetails.paidAmount || 0;
    let mPaid = 0;
    let ptPaid = 0;

    if (paidAmount >= totalFinal) {
      mPaid = mFinal;
      ptPaid = ptFinal;
    } else if (totalFinal > 0) {
      mPaid = paidAmount * (mFinal / totalFinal);
      ptPaid = paidAmount - mPaid;
    }

    mPaid = Math.round(mPaid * 100) / 100;
    ptPaid = Math.round(ptPaid * 100) / 100;

    const mDue = Math.max(0, mFinal - mPaid);
    const ptDue = Math.max(0, ptFinal - ptPaid);
    const totalDue = mDue + ptDue;

    // Individual statuses
    const mStatus = mDue === 0 ? 'paid' : (mPaid > 0 ? 'partially_paid' : (conversionDetails.paymentStatus === 'overdue' ? 'overdue' : 'pending'));
    const ptStatus = ptDue === 0 ? 'paid' : (ptPaid > 0 ? 'partially_paid' : (conversionDetails.paymentStatus === 'overdue' ? 'overdue' : 'pending'));
    
    // Overall status
    const overallStatus = totalDue === 0 ? 'paid' : (paidAmount > 0 ? 'partially_paid' : (conversionDetails.paymentStatus === 'overdue' ? 'overdue' : 'pending'));

    return new Observable<LeadConversionResult>(observer => {
      try {
        const batch = writeBatch(db);

        const cleanObject = (obj: any) => {
          const clean = { ...obj };
          Object.keys(clean).forEach(key => {
            if (clean[key] === undefined) {
              delete clean[key];
            }
          });
          return clean;
        };

        // ── 1. New Member document ─────────────────────────────────────────
        const defaultExpiry = new Date();
        defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 1);
        const memberDoc = {
          ...memberData,
          id: memberId,
          gymId,
          branchId: memberData.branchId || branchId,
          joinDate: memberData.joinDate || today,
          expiryDate: memberData.expiryDate || defaultExpiry.toISOString().split('T')[0],
          attendanceCount: 0,
          balance: totalDue
        };
        batch.set(doc(db, 'members', memberId), cleanObject(memberDoc));

        // ── 2. Update Lead → Converted ─────────────────────────────────────
        if (lead) {
          const updatedLead: Lead = {
            ...lead,
            status: 'Converted',
            convertedBy: conversionDetails.convertedBy,
            revenueGenerated: totalFinal,
            commissionPercent: 0,
            commissionEarned: 0
          };
          delete updatedLead.nextFollowUp;
          batch.set(doc(db, 'leads', lead.id), cleanObject(updatedLead));
        }

        // ── 3. Membership Payment record ───────────────────────────────────
        const membershipPayment = {
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
          status: mStatus,
          planName: memberData.planName,
          paymentMethod: mPaid > 0 ? conversionDetails.paymentMethod : 'Pending',
          type: 'membership',
          collectedBy: conversionDetails.convertedBy,
          membershipPlanId: memberData.planId,
          originalAmount: membershipPlanPrice,
          discountType,
          discountValue: mDiscount,
          finalAmount: mFinal,
          discountGivenBy: conversionDetails.convertedBy,
          discountDate: today,
          salespersonId: conversionDetails.salespersonId || lead?.assignedEmployee || lead?.leadOwner || '',
          salespersonName: conversionDetails.salespersonName || conversionDetails.convertedBy || ''
        };
        batch.set(doc(db, 'payments', paymentId), cleanObject(membershipPayment));

        // ── 4. Unified Invoice ─────────────────────────────────────────────
        const invoiceNumber = 'INV-' + Date.now().toString().slice(-6);
        const gst = Math.round(totalFinal * 0.18 * 100) / 100;
        const baseAmount = totalFinal - gst;

        const invoiceDoc = {
          id: invoiceId,
          gymId,
          branchId,
          invoiceNumber,
          memberId,
          memberName: memberData.name,
          membershipPlan: memberData.planName,
          amount: Number(baseAmount.toFixed(2)),
          gst: Number(gst.toFixed(2)),
          discount: mDiscount + ptDiscount,
          finalAmount: totalFinal,
          paymentMethod: paidAmount > 0 ? conversionDetails.paymentMethod : 'Pending',
          invoiceDate: today,
          status: overallStatus,
          collectedBy: conversionDetails.convertedBy,
          createdBy: conversionDetails.convertedBy,
          type: hasPT ? 'pt' : 'membership',
          membershipPlanId: memberData.planId,
          ptPlanId: conversionDetails.ptPlanId,
          originalAmount: membershipPlanPrice + ptPlanPrice,
          discountType,
          discountValue: mDiscount + ptDiscount,
          amountPaid: paidAmount,
          pendingAmount: totalDue,
          dueDate: today
        };
        batch.set(doc(db, 'invoices', invoiceId), cleanObject(invoiceDoc));

        // ── 4b. Membership Collection receipt (if paid portion > 0) ─────────
        if (mPaid > 0) {
          const collectionId = 'col_' + Math.random().toString(36).substring(2, 9);
          const randCol = Math.floor(1000 + Math.random() * 9000);
          const collectionDoc = {
            id: collectionId,
            gymId,
            branchId,
            receiptNo: `REC-${new Date().getFullYear()}-${randCol}`,
            memberId,
            memberName: memberData.name,
            membershipPlan: memberData.planName || '',
            amount: mPaid,
            paymentMethod: conversionDetails.paymentMethod || 'UPI',
            date: today,
            collectedBy: conversionDetails.convertedBy,
            type: 'membership',
            membershipPlanId: memberData.planId,
            originalAmount: membershipPlanPrice,
            discountType,
            discountValue: mDiscount,
            finalAmount: mFinal,
            salespersonId: conversionDetails.salespersonId || '',
            salespersonName: conversionDetails.salespersonName || ''
          };
          batch.set(doc(db, 'collections', collectionId), cleanObject(collectionDoc));
        }

        // ── 5. PT Wallet + Trainer Assignment + PT Payment (conditional) ───
        if (hasPT) {
          const ptDuration = conversionDetails.ptPlanDuration || 1;
          const ptEnd = new Date();
          ptEnd.setMonth(ptEnd.getMonth() + ptDuration);
          const endDate = ptEnd.toISOString().split('T')[0];

          // 5a. MemberPTPlan (PT wallet)
          const memberPTPlan = {
            id: mptId,
            gymId,
            branchId,
            memberId,
            memberName: memberData.name,
            trainerId: conversionDetails.preferredTrainerId || 'unassigned',
            trainerName: conversionDetails.trainerName || 'Unassigned',
            planId: conversionDetails.ptPlanId,
            planName: conversionDetails.ptPlanName || '',
            price: ptFinal,
            totalSessions: conversionDetails.ptSessionsTotal || 0,
            completedSessions: 0,
            remainingSessions: conversionDetails.ptSessionsTotal || 0,
            expiredSessions: 0,
            ptGoal: conversionDetails.ptGoal || 'General Fitness',
            startDate: today,
            endDate,
            status: 'active',
            salespersonId: conversionDetails.salespersonId || lead?.assignedEmployee || '',
            salespersonName: conversionDetails.salespersonName || conversionDetails.convertedBy || '',
            history: [{
              action: 'assign',
              date: today,
              trainerId: conversionDetails.preferredTrainerId,
              trainerName: conversionDetails.trainerName,
              planId: conversionDetails.ptPlanId,
              planName: conversionDetails.ptPlanName,
              notes: 'Initial assignment'
            }]
          };
          batch.set(doc(db, 'memberPTPlans', mptId), cleanObject(memberPTPlan));

          // 5b. Trainer Assignment
          batch.set(doc(db, 'trainerAssignments', taId), cleanObject({
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
          }));

          // 5c. Update member PT fields
          batch.update(doc(db, 'members', memberId), cleanObject({
            ptPlanId: conversionDetails.ptPlanId,
            ptPlanName: conversionDetails.ptPlanName,
            trainerId: conversionDetails.preferredTrainerId || 'unassigned',
            trainerName: conversionDetails.trainerName || 'Unassigned',
            ptGoal: conversionDetails.ptGoal,
            ptStartDate: today,
            ptEndDate: endDate,
            ptSessionsTotal: conversionDetails.ptSessionsTotal || 0,
            ptSessionsCompleted: 0,
            ptSessionsRemaining: conversionDetails.ptSessionsTotal || 0
          }));

          // 5d. PT Payment
          const ptPayment = {
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
            status: ptStatus,
            planName: conversionDetails.ptPlanName || 'PT Plan',
            paymentMethod: ptPaid > 0 ? conversionDetails.paymentMethod : 'Pending',
            type: 'pt',
            trainerId: conversionDetails.preferredTrainerId || 'unassigned',
            trainerName: conversionDetails.trainerName || 'Unassigned',
            collectedBy: conversionDetails.convertedBy,
            ptPlanId: conversionDetails.ptPlanId,
            originalAmount: ptPlanPrice,
            discountType,
            discountValue: ptDiscount,
            finalAmount: ptFinal,
            discountGivenBy: conversionDetails.convertedBy,
            discountDate: today,
            salespersonId: conversionDetails.salespersonId || '',
            salespersonName: conversionDetails.salespersonName || ''
          };
          batch.set(doc(db, 'payments', ptPayId), cleanObject(ptPayment));

          // 5e. Trainer Revenue (only if paid portion > 0)
          if (ptPaid > 0) {
            batch.set(doc(db, 'trainerRevenue', trId), cleanObject({
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
            }));
          }

          // 5f. PT Collection receipt (if paid portion > 0)
          if (ptPaid > 0) {
            const ptColId = 'col_' + Math.random().toString(36).substring(2, 9);
            const randCol = Math.floor(1000 + Math.random() * 9000);
            const ptCollection = {
              id: ptColId,
              gymId,
              branchId,
              receiptNo: `REC-${new Date().getFullYear()}-${randCol}`,
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
              discountType,
              discountValue: ptDiscount,
              finalAmount: ptFinal,
              salespersonId: conversionDetails.salespersonId || '',
              salespersonName: conversionDetails.salespersonName || ''
            };
            batch.set(doc(db, 'collections', ptColId), cleanObject(ptCollection));
          }
        }

        // ── COMMIT — single atomic operation ───────────────────────────────
        batch.commit().then(() => {
          logAudit(this.injector, lead ? 'Lead Conversion (Atomic Batch)' : 'Member Registration (Atomic Batch)', 'member', memberId);
          const result: LeadConversionResult = {
            memberId,
            membershipPaymentId: paymentId,
            invoiceId,
            ...(hasPT ? { memberPTPlanId: mptId, trainerAssignmentId: taId, ptPaymentId: ptPayId } : {})
          };
          observer.next(result);
          observer.complete();
        }).catch(err => {
          observer.error(new Error(err.message || 'Atomic registration batch failed. No changes were written.'));
        });
      } catch (err: any) {
        observer.error(new Error(err.message || 'Atomic registration batch setup failed.'));
      }
    });
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
    const id = (trainer as any).id || 'trainer_' + Math.random().toString(36).substring(2, 9);
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

  getDevices(gymId: string): Observable<DeviceConfiguration[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'deviceConfigurations'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as DeviceConfiguration)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get device configurations.')))
    );
  }

  saveDevice(gymId: string, device: DeviceConfiguration): Observable<void> {
    const db = this.firebaseService.getDb();
    const deviceRef = doc(db, 'deviceConfigurations', device.id);
    return from(setDoc(deviceRef, { ...device, gymId })).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to save device configuration.')))
    );
  }

  deleteDevice(gymId: string, deviceId: string): Observable<void> {
    const db = this.firebaseService.getDb();
    const deviceRef = doc(db, 'deviceConfigurations', deviceId);
    return from(deleteDoc(deviceRef)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete device configuration.')))
    );
  }

  getMappings(gymId: string): Observable<AttendanceMapping[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'attendanceMappings'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as AttendanceMapping)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get mappings.')))
    );
  }

  saveMapping(gymId: string, mapping: AttendanceMapping): Observable<void> {
    const db = this.firebaseService.getDb();
    const mapRef = doc(db, 'attendanceMappings', mapping.id);
    return from(setDoc(mapRef, { ...mapping, gymId })).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to save attendance mapping.')))
    );
  }

  deleteMapping(gymId: string, mappingId: string): Observable<void> {
    const db = this.firebaseService.getDb();
    const mapRef = doc(db, 'attendanceMappings', mappingId);
    return from(deleteDoc(mapRef)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete mapping.')))
    );
  }

  updateDeviceSyncTime(gymId: string, deviceId: string, syncTime: string): Observable<void> {
    const db = this.firebaseService.getDb();
    const deviceRef = doc(db, 'deviceConfigurations', deviceId);
    return from(updateDoc(deviceRef, { lastSyncTime: syncTime })).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update device sync time.')))
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
    const id = (plan as any).id || 'plan_' + Math.random().toString(36).substring(2, 9);
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

  addTemplate(gymId: string, template: Omit<WhatsAppTemplate, 'id'>): Observable<WhatsAppTemplate> {
    const db = this.firebaseService.getDb();
    const id = 'tpl_' + Math.random().toString(36).substring(2, 10);
    const newTemplate: WhatsAppTemplate = { ...template, id, gymId };
    return from(setDoc(doc(db, 'whatsapp_templates', id), newTemplate)).pipe(
      map(() => newTemplate),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add WhatsApp template.')))
    );
  }

  updateTemplate(gymId: string, template: WhatsAppTemplate): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'whatsapp_templates', template.id), template)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update template.')))
    );
  }

  deleteTemplate(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'whatsapp_templates', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete WhatsApp template.')))
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
    const id = (invoice as any).id || 'inv_' + Math.random().toString(36).substring(2, 9);
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
    const id = (collection as any).id || 'col_' + Math.random().toString(36).substring(2, 9);
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

  deleteInvoice(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'invoices', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete invoice.')))
    );
  }

  deleteCollection(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'collections', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete collection.')))
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
    
    // Restore mode check: if employee has predefined id, bypass Firebase Auth creation
    if ((employee as any).id) {
      const uid = (employee as any).id;
      const tenantContext = this.injector.get(TenantContextService);
      const branchId = employee.branchId || tenantContext.getBranchId() || '';
      const newEmp: Employee = {
        ...employee,
        id: uid,
        gymId,
        branchId
      };
      return from(setDoc(doc(db, 'employees', uid), newEmp)).pipe(
        map(() => newEmp),
        catchError(err => throwError(() => new Error(err.message || 'Failed to restore employee.')))
      );
    }

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

    // 1. Check for duplicate emails in Firestore collections first (scoped to this gym for tenant isolation)
    const empQ = query(collection(db, 'employees'), where('gymId', '==', gymId), where('email', '==', cleanEmail));
    return from(getDocs(empQ)).pipe(
      switchMap(empSnap => {
        if (!empSnap.empty) {
          return throwError(() => new Error('An employee with this email already exists in Firestore.'));
        }
        
        const userQ = query(collection(db, 'users'), where('gymId', '==', gymId), where('email', '==', cleanEmail));
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
                  sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
                  accountStatus: 'Active'
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
                  avatarUrl: employee.photoUrl || snap.data()['avatarUrl'],
                  // Sync account status to users collection — critical for session enforcement
                  accountStatus: employee.accountStatus || 'Active'
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
            if (oldEmp && oldEmp.accountStatus !== employee.accountStatus) {
              logAudit(this.injector, `Account Status Changed: ${employee.accountStatus}`, 'employee', employee.id);
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

@Injectable({ providedIn: 'root' })
export class FirebaseAuditLogRepository implements IAuditLogRepository {
  constructor(
    private firebaseService: FirebaseService,
    private injector: Injector
  ) {}

  getAuditLogs(gymId: string): Observable<AuditLog[]> {
    const db = this.firebaseService.getDb();
    const authState = this.injector.get(AuthState);
    const user = authState.currentUserValue;
    if (!user) return of([]);

    let q = query(collection(db, 'auditLogs'));

    if (user.role === 'super_admin') {
      // Super Admin: sees all gyms
    } else if (user.role === 'gym_owner') {
      // Owner: sees own gym logs
      q = query(collection(db, 'auditLogs'), where('gymId', '==', gymId));
    } else if (user.role === 'branch_manager') {
      // Branch Manager: sees own branch logs
      const branchId = user.branchId || '';
      q = query(collection(db, 'auditLogs'), where('gymId', '==', gymId), where('branchId', '==', branchId));
    } else {
      // Trainers and Staff: No access
      return of([]);
    }

    return from(getDocs(q)).pipe(
      map(snapshot => {
        const logs = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id
          } as AuditLog;
        });
        return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to fetch audit logs.')))
    );
  }

  addAuditLog(gymId: string, log: Omit<AuditLog, 'id'>): Observable<AuditLog> {
    const db = this.firebaseService.getDb();
    const id = 'audit_' + Math.random().toString(36).substring(2, 9);
    const newLog = {
      ...log,
      id,
      gymId
    } as AuditLog;

    return from(setDoc(doc(db, 'auditLogs', id), newLog)).pipe(
      map(() => newLog),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add audit log.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseProductRepository implements IProductRepository {
  constructor(private firebaseService: FirebaseService, private injector: Injector) {}

  getProducts(gymId: string): Observable<Product[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'products'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => ({ ...d.data(), id: d.id } as Product))),
      catchError(err => throwError(() => new Error(err.message || 'Failed to fetch products.')))
    );
  }

  getProductById(gymId: string, id: string): Observable<Product | null> {
    const db = this.firebaseService.getDb();
    return from(getDoc(doc(db, 'products', id))).pipe(
      map(d => d.exists() ? ({ ...d.data(), id: d.id } as Product) : null),
      catchError(err => throwError(() => new Error(err.message || 'Failed to fetch product.')))
    );
  }

  addProduct(gymId: string, product: Omit<Product, 'id'>): Observable<Product> {
    const db = this.firebaseService.getDb();
    const id = (product as any).id || 'prod_' + Math.random().toString(36).substring(2, 9);
    const newP = { ...product, id, gymId } as Product;

    return from(setDoc(doc(db, 'products', id), newP)).pipe(
      map(() => newP),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add product.')))
    );
  }

  updateProduct(gymId: string, product: Product): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'products', product.id), product)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update product.')))
    );
  }

  deleteProduct(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'products', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete product.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseImportProfileRepository implements IImportProfileRepository {
  constructor(private firebaseService: FirebaseService) {}

  getProfiles(gymId: string): Observable<ImportProfile[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'importProfiles'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => ({ ...d.data(), id: d.id } as ImportProfile))),
      catchError(err => throwError(() => new Error(err.message || 'Failed to fetch import profiles.')))
    );
  }

  getProfileById(gymId: string, id: string): Observable<ImportProfile | null> {
    const db = this.firebaseService.getDb();
    return from(getDoc(doc(db, 'importProfiles', id))).pipe(
      map(d => d.exists() ? ({ ...d.data(), id: d.id } as ImportProfile) : null),
      catchError(err => throwError(() => new Error(err.message || 'Failed to fetch import profile.')))
    );
  }

  saveProfile(gymId: string, profile: Omit<ImportProfile, 'id'> | ImportProfile): Observable<ImportProfile> {
    const db = this.firebaseService.getDb();
    const id = (profile as any).id || 'prof_' + Math.random().toString(36).substring(2, 9);
    const now = new Date().toISOString();
    
    const newProfile = {
      ...profile,
      id,
      gymId,
      createdAt: (profile as any).createdAt || now,
      updatedAt: now
    } as ImportProfile;

    return from(setDoc(doc(db, 'importProfiles', id), newProfile)).pipe(
      map(() => newProfile),
      catchError(err => throwError(() => new Error(err.message || 'Failed to save import profile.')))
    );
  }

  deleteProfile(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'importProfiles', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete import profile.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseImportHistoryRepository implements IImportHistoryRepository {
  constructor(private firebaseService: FirebaseService) {}

  getHistory(gymId: string): Observable<ImportHistory[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'importHistory'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => {
        const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as ImportHistory));
        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to fetch import history.')))
    );
  }

  getHistoryById(gymId: string, id: string): Observable<ImportHistory | null> {
    const db = this.firebaseService.getDb();
    return from(getDoc(doc(db, 'importHistory', id))).pipe(
      map(d => d.exists() ? ({ ...d.data(), id: d.id } as ImportHistory) : null),
      catchError(err => throwError(() => new Error(err.message || 'Failed to fetch import history record.')))
    );
  }

  addHistory(gymId: string, history: Omit<ImportHistory, 'id'>): Observable<ImportHistory> {
    const db = this.firebaseService.getDb();
    const id = 'hist_' + Math.random().toString(36).substring(2, 9);
    const newHist = { ...history, id, gymId } as ImportHistory;

    return from(setDoc(doc(db, 'importHistory', id), newHist)).pipe(
      map(() => newHist),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add import history record.')))
    );
  }

  updateHistory(gymId: string, history: ImportHistory): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'importHistory', history.id), history)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update import history record.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseUnitOfWork implements IUnitOfWork {
  private additions: { collectionName: string; id: string }[] = [];
  private inTransaction = false;

  constructor(private firebaseService: FirebaseService) {}

  begin(): void {
    this.additions = [];
    this.inTransaction = true;
  }

  commit(): Observable<void> {
    this.inTransaction = false;
    this.additions = [];
    return of(undefined);
  }

  rollback(): void {
    if (this.additions.length === 0) {
      this.inTransaction = false;
      return;
    }

    const db = this.firebaseService.getDb();
    
    // Perform standard sequential deletion in reverse order to undo additions
    const deleteOperations = this.additions.map(item => {
      let firestoreCollection = item.collectionName;
      if (firestoreCollection === 'membership-plans') firestoreCollection = 'membershipPlans';
      if (firestoreCollection === 'pt-plans') firestoreCollection = 'ptPlans';
      if (firestoreCollection === 'import-profiles') firestoreCollection = 'importProfiles';
      if (firestoreCollection === 'import-history') firestoreCollection = 'importHistory';
      
      const docRef = doc(db, firestoreCollection, item.id);
      return from(deleteDoc(docRef)).pipe(
        catchError(err => {
          console.warn(`[FirebaseUnitOfWork] Rollback failed to delete ${item.collectionName}/${item.id}:`, err);
          return of(undefined);
        })
      );
    });

    this.inTransaction = false;
    this.additions = [];

    // Run delete operations concurrently
    forkJoin(deleteOperations).subscribe({
      next: () => console.log('[FirebaseUnitOfWork] Rollback completed successfully.'),
      error: (e) => console.error('[FirebaseUnitOfWork] Rollback encountered errors:', e)
    });
  }

  registerAddition(collectionName: string, id: string): void {
    if (this.inTransaction) {
      this.additions.push({ collectionName, id });
    }
  }

  failure(error: Error): void {
    console.error('[FirebaseUnitOfWork] failure() called with error:', error.message);
    this.rollback();
  }
}

