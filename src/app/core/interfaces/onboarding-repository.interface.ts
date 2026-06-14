import { InjectionToken } from '@angular/core';
import { Observable } from 'rxjs';
import { Gym } from '../models/gym.entity';
import { UserProfile } from '../models/user.model';
import { OnboardingData } from '../models/onboarding.model';

export interface IOnboardingRepository {
  sendVerificationCode(email: string): Observable<boolean>;
  verifyEmailCode(email: string, code: string): Observable<boolean>;
  onboardWorkspace(payload: OnboardingData): Observable<{ gym: Gym; owner: UserProfile }>;
}

export const ONBOARDING_REPOSITORY_TOKEN = new InjectionToken<IOnboardingRepository>('ONBOARDING_REPOSITORY_TOKEN');
