import { Injectable } from '@angular/core';
import { Observable, from, of, throwError, forkJoin } from 'rxjs';
import { map, switchMap, catchError } from 'rxjs/operators';
import { FirebaseService } from './firebase.service';
import { IOnboardingRepository } from '../../../core/interfaces/onboarding-repository.interface';
import { Gym } from '../../../core/models/gym.entity';
import { UserProfile } from '../../../core/models/user.model';
import { OnboardingData } from '../../../core/models/onboarding.model';
import { UserRole } from '../../../core/enums/roles.enum';
import { SubscriptionPlan } from '../../../core/enums/subscription-plans.enum';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

@Injectable({ providedIn: 'root' })
export class FirebaseOnboardingRepository implements IOnboardingRepository {
  constructor(private firebaseService: FirebaseService) {}

  sendVerificationCode(email: string): Observable<boolean> {
    console.log(`[FirebaseOnboardingRepository] Mock sending verification code to ${email}`);
    return of(true);
  }

  verifyEmailCode(email: string, code: string): Observable<boolean> {
    const isValid = code.length === 6;
    return of(isValid);
  }

  onboardWorkspace(payload: OnboardingData): Observable<{ gym: Gym; owner: UserProfile }> {
    const auth = this.firebaseService.getAuth();
    const db = this.firebaseService.getDb();

    return from(createUserWithEmailAndPassword(auth, payload.ownerEmail, payload.ownerPassword || 'password')).pipe(
      switchMap(cred => {
        const uid = cred.user.uid;
        const gymId = 'gym_' + Math.random().toString(36).substring(2, 9);
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
          address: payload.gymAddress || 'Not Specified',
          city: payload.gymCity,
          state: payload.gymState,
          country: payload.gymCountry,
          trialExpiryDate: trialExpiry.toISOString().split('T')[0],
          subscriptionStatus: 'trialing',
          branches: [
            {
              id: 'branch_' + Math.random().toString(36).substring(2, 9),
              name: payload.branchName || 'Main Branch',
              code: (payload.branchName || 'MAIN').toUpperCase().replace(/\s+/g, '-').substring(0, 5),
              address: payload.branchAddress || payload.gymAddress || 'Not Specified',
              manager: payload.ownerFullName,
              phone: payload.branchPhone || payload.gymPhone
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

        const ownerProfile: UserProfile = {
          id: uid,
          name: payload.ownerFullName,
          email: payload.ownerEmail,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(payload.ownerFullName)}`,
          role: UserRole.Owner,
          gymId,
          isFirstLogin: true,
          permissions: [],
          lastLogin: new Date().toISOString(),
          sessionExpiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString()
        };

        const ops: Observable<any>[] = [
          from(setDoc(doc(db, 'gyms', gymId), newGym)),
          from(setDoc(doc(db, 'users', uid), ownerProfile))
        ];

        // Seed initial plans if enabled in onboarding
        if (payload.plans && payload.plans.length > 0) {
          payload.plans.forEach(planConfig => {
            if (planConfig.enabled) {
              const planId = 'plan_' + Math.random().toString(36).substring(2, 9);
              const newPlan = {
                id: planId,
                gymId,
                name: planConfig.name,
                durationMonths: planConfig.durationMonths,
                price: planConfig.price,
                description: planConfig.description,
                features: planConfig.features,
                activeMembersCount: 0
              };
              ops.push(from(setDoc(doc(db, 'membership_plans', planId), newPlan)));
            }
          });
        }

        return forkJoin(ops).pipe(
          map(() => ({ gym: newGym, owner: ownerProfile }))
        );
      }),
      catchError(err => throwError(() => new Error(err.message || 'Workspace onboarding failed.')))
    );
  }
}
