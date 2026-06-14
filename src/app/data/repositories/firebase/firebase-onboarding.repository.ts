import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { IOnboardingRepository } from '../../../core/interfaces/onboarding-repository.interface';
import { Gym } from '../../../core/models/gym.entity';
import { UserProfile } from '../../../core/models/user.model';
import { OnboardingData } from '../../../core/models/onboarding.model';

@Injectable({ providedIn: 'root' })
export class FirebaseOnboardingRepository implements IOnboardingRepository {
  sendVerificationCode(email: string): Observable<boolean> {
    return throwError(() => new Error('Firebase provider not fully configured.'));
  }
  verifyEmailCode(email: string, code: string): Observable<boolean> {
    return throwError(() => new Error('Firebase provider not fully configured.'));
  }
  onboardWorkspace(payload: OnboardingData): Observable<{ gym: Gym; owner: UserProfile }> {
    return throwError(() => new Error('Firebase provider not fully configured.'));
  }
}
