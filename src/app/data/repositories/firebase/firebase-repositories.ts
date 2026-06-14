import { Injectable } from '@angular/core';
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
  IEmployeeRepository
} from '../../../core/interfaces/repository.interfaces';

import {
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updatePassword,
  sendPasswordResetEmail
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

@Injectable({ providedIn: 'root' })
export class FirebaseAuthRepository implements IAuthRepository {
  constructor(private firebaseService: FirebaseService) { }

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
              return of(userSnap.data() as UserProfile);
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
    return from(signOut(this.firebaseService.getAuth()));
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
        const today = new Date().toISOString().split('T')[0];

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
          branches: [
            {
              id: 'branch_' + Math.random().toString(36).substring(2, 9),
              name: 'Main Branch',
              code: 'MAIN',
              address: address || 'Not Specified',
              manager: ownerName,
              phone: phone
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

        const userDoc: UserProfile = {
          id: uid,
          name: ownerName,
          email,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(ownerName)}`,
          role: UserRole.Owner,
          gymId,
          isFirstLogin: false,
          permissions: [],
          lastLogin: new Date().toISOString(),
          sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
        };

        return forkJoin([
          from(setDoc(doc(db, 'gyms', gymId), newGym)),
          from(setDoc(doc(db, 'users', uid), userDoc))
        ]).pipe(
          map(() => userDoc)
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
  constructor(private firebaseService: FirebaseService) { }

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
    return from(setDoc(doc(db, 'gyms', gym.gymId), gym)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update gym.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseMemberRepository implements IMemberRepository {
  constructor(private firebaseService: FirebaseService) { }

  getMembers(gymId: string): Observable<Member[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'members'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
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

    const planRef = doc(db, 'membership_plans', member.planId);
    return from(getDoc(planRef)).pipe(
      switchMap(planSnap => {
        const price = planSnap.exists() ? (planSnap.data() as MembershipPlan).price : 0;
        const newMember: Member = {
          ...member,
          id,
          gymId,
          attendanceCount: 0,
          balance: member.status === 'inactive' ? 0 : price
        };
        return from(setDoc(doc(db, 'members', id), newMember)).pipe(
          map(() => newMember)
        );
      }),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add member.')))
    );
  }

  updateMember(gymId: string, member: Member): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'members', member.id), member)).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update member.')))
    );
  }

  deleteMember(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(deleteDoc(doc(db, 'members', id))).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete member.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebasePaymentRepository implements IPaymentRepository {
  constructor(private firebaseService: FirebaseService) { }

  getPayments(gymId: string): Observable<Payment[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'payments'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as Payment)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get payments.')))
    );
  }

  addPayment(gymId: string, payment: Omit<Payment, 'id'>): Observable<Payment> {
    const db = this.firebaseService.getDb();
    const id = 'pay_' + Math.random().toString(36).substring(2, 9);
    const newPayment: Payment = {
      ...payment,
      id,
      gymId
    };

    const memberRef = doc(db, 'members', payment.memberId);
    return from(setDoc(doc(db, 'payments', id), newPayment)).pipe(
      switchMap(() => from(updateDoc(memberRef, { balance: payment.dueAmount }))),
      map(() => newPayment),
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
  constructor(private firebaseService: FirebaseService) { }

  getLeads(gymId: string): Observable<Lead[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'leads'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as Lead)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get leads.')))
    );
  }

  addLead(gymId: string, lead: Omit<Lead, 'id'>): Observable<Lead> {
    const db = this.firebaseService.getDb();
    const id = 'lead_' + Math.random().toString(36).substring(2, 9);
    const newLead: Lead = {
      ...lead,
      id,
      gymId
    };
    return from(setDoc(doc(db, 'leads', id), newLead)).pipe(
      map(() => newLead),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add lead.')))
    );
  }

  updateLead(gymId: string, lead: Lead): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'leads', lead.id), lead)).pipe(
      map(() => undefined),
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
  constructor(private firebaseService: FirebaseService) { }

  getTrainers(gymId: string): Observable<Trainer[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'trainers'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as Trainer)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get trainers.')))
    );
  }

  addTrainer(gymId: string, trainer: Omit<Trainer, 'id' | 'membersCount'>): Observable<Trainer> {
    const db = this.firebaseService.getDb();
    const id = 'trainer_' + Math.random().toString(36).substring(2, 9);
    const newTrainer: Trainer = {
      ...trainer,
      id,
      gymId,
      membersCount: 0
    };
    return from(setDoc(doc(db, 'trainers', id), newTrainer)).pipe(
      map(() => newTrainer),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add trainer.')))
    );
  }

  updateTrainer(gymId: string, trainer: Trainer): Observable<void> {
    const db = this.firebaseService.getDb();
    return from(setDoc(doc(db, 'trainers', trainer.id), trainer)).pipe(
      map(() => undefined),
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
  constructor(private firebaseService: FirebaseService) { }

  getAttendance(gymId: string): Observable<Attendance[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'attendance'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
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
              const id = 'att_' + Math.random().toString(36).substring(2, 9);
              const newAttendance: Attendance = {
                id,
                gymId,
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
  constructor(private firebaseService: FirebaseService) { }

  getExpenses(gymId: string): Observable<Expense[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'expenses'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as Expense)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get expenses.')))
    );
  }

  addExpense(gymId: string, expense: Omit<Expense, 'id'>): Observable<Expense> {
    const db = this.firebaseService.getDb();
    const id = 'exp_' + Math.random().toString(36).substring(2, 9);
    const newExpense: Expense = {
      ...expense,
      id,
      gymId
    };
    return from(setDoc(doc(db, 'expenses', id), newExpense)).pipe(
      map(() => newExpense),
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
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'invoices'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as Invoice)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get invoices.')))
    );
  }

  addInvoice(gymId: string, invoice: Omit<Invoice, 'id'>): Observable<Invoice> {
    const db = this.firebaseService.getDb();
    const id = 'inv_' + Math.random().toString(36).substring(2, 9);
    const newInvoice: Invoice = {
      ...invoice,
      id,
      gymId
    };
    return from(setDoc(doc(db, 'invoices', id), newInvoice)).pipe(
      map(() => newInvoice),
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
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'collections'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as Collection)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get collections.')))
    );
  }

  addCollection(gymId: string, collection: Omit<Collection, 'id'>): Observable<Collection> {
    const db = this.firebaseService.getDb();
    const id = 'col_' + Math.random().toString(36).substring(2, 9);
    const newCollection: Collection = {
      ...collection,
      id,
      gymId
    };
    return from(setDoc(doc(db, 'collections', id), newCollection)).pipe(
      map(() => newCollection),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add collection.')))
    );
  }
}

@Injectable({ providedIn: 'root' })
export class FirebaseEmployeeRepository implements IEmployeeRepository {
  constructor(private firebaseService: FirebaseService) { }

  getEmployees(gymId: string): Observable<Employee[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'employees'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
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
    const id = 'emp_' + Math.random().toString(36).substring(2, 9);
    const newEmp: Employee = {
      ...employee,
      id,
      gymId
    };

    const ops = [from(setDoc(doc(db, 'employees', id), newEmp))];

    if (newEmp.email) {
      const cleanEmail = newEmp.email.toLowerCase().trim();
      const inviteId = 'invited_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
      const invitedUser: UserProfile = {
        id: inviteId,
        name: newEmp.fullName,
        email: cleanEmail,
        avatarUrl: newEmp.photoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(newEmp.fullName)}`,
        role: newEmp.role,
        gymId,
        isFirstLogin: true,
        permissions: [],
        lastLogin: new Date().toISOString(),
        sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
      };
      ops.push(from(setDoc(doc(db, 'users', inviteId), invitedUser)));
    }

    return forkJoin(ops).pipe(
      map(() => newEmp),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add employee.')))
    );
  }

  updateEmployee(gymId: string, employee: Employee): Observable<void> {
    const db = this.firebaseService.getDb();
    const empRef = doc(db, 'employees', employee.id);

    const ops = [from(setDoc(empRef, employee))];

    if (employee.email) {
      const cleanEmail = employee.email.toLowerCase().trim();
      const usersQ = query(collection(db, 'users'), where('email', '==', cleanEmail));
      ops.push(
        from(getDocs(usersQ)).pipe(
          switchMap(snap => {
            if (!snap.empty) {
              const userDoc = snap.docs[0];
              const updatedUser = {
                ...userDoc.data(),
                name: employee.fullName,
                role: employee.role,
                avatarUrl: employee.photoUrl || userDoc.data()['avatarUrl']
              };
              return from(setDoc(doc(db, 'users', userDoc.id), updatedUser));
            }
            return of(undefined);
          })
        )
      );
    }

    return forkJoin(ops).pipe(
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to update employee.')))
    );
  }

  deleteEmployee(gymId: string, id: string): Observable<void> {
    const db = this.firebaseService.getDb();

    return from(getDoc(doc(db, 'employees', id))).pipe(
      switchMap(empSnap => {
        if (!empSnap.exists()) {
          return of(undefined);
        }
        const emp = empSnap.data() as Employee;
        const ops = [from(deleteDoc(doc(db, 'employees', id)))];

        if (emp.email) {
          const cleanEmail = emp.email.toLowerCase().trim();
          const usersQ = query(collection(db, 'users'), where('email', '==', cleanEmail));
          ops.push(
            from(getDocs(usersQ)).pipe(
              switchMap(snap => {
                if (!snap.empty) {
                  return from(deleteDoc(doc(db, 'users', snap.docs[0].id)));
                }
                return of(undefined);
              })
            )
          );
        }

        return forkJoin(ops);
      }),
      map(() => undefined),
      catchError(err => throwError(() => new Error(err.message || 'Failed to delete employee.')))
    );
  }

  getAttendance(gymId: string): Observable<EmployeeAttendance[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'employee_attendance'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as EmployeeAttendance)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get employee attendance.')))
    );
  }

  markAttendance(gymId: string, record: Omit<EmployeeAttendance, 'id'>): Observable<EmployeeAttendance> {
    const db = this.firebaseService.getDb();
    const id = 'att_emp_' + Math.random().toString(36).substring(2, 9);
    const newRecord: EmployeeAttendance = {
      ...record,
      id,
      gymId
    };
    return from(setDoc(doc(db, 'employee_attendance', id), newRecord)).pipe(
      map(() => newRecord),
      catchError(err => throwError(() => new Error(err.message || 'Failed to mark employee attendance.')))
    );
  }

  getPayroll(gymId: string): Observable<EmployeePayroll[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'employee_payroll'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as EmployeePayroll)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get employee payroll.')))
    );
  }

  addPayroll(gymId: string, payroll: Omit<EmployeePayroll, 'id'>): Observable<EmployeePayroll> {
    const db = this.firebaseService.getDb();
    const id = 'pay_emp_' + Math.random().toString(36).substring(2, 9);
    const newPayroll: EmployeePayroll = {
      ...payroll,
      id,
      gymId
    };
    return from(setDoc(doc(db, 'employee_payroll', id), newPayroll)).pipe(
      map(() => newPayroll),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add payroll record.')))
    );
  }

  getPerformance(gymId: string): Observable<EmployeePerformance[]> {
    const db = this.firebaseService.getDb();
    const q = query(collection(db, 'employee_performance'), where('gymId', '==', gymId));
    return from(getDocs(q)).pipe(
      map(snap => snap.docs.map(d => d.data() as EmployeePerformance)),
      catchError(err => throwError(() => new Error(err.message || 'Failed to get performance reviews.')))
    );
  }

  addPerformance(gymId: string, performance: Omit<EmployeePerformance, 'id'>): Observable<EmployeePerformance> {
    const db = this.firebaseService.getDb();
    const id = 'perf_' + Math.random().toString(36).substring(2, 9);
    const newPerformance: EmployeePerformance = {
      ...performance,
      id,
      gymId
    };
    return from(setDoc(doc(db, 'employee_performance', id), newPerformance)).pipe(
      map(() => newPerformance),
      catchError(err => throwError(() => new Error(err.message || 'Failed to add performance review.')))
    );
  }
}
