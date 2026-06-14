import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IOnboardingRepository, ONBOARDING_REPOSITORY_TOKEN } from '../../core/interfaces/onboarding-repository.interface';
import { Gym } from '../../core/models/gym.entity';
import { UserProfile } from '../../core/models/user.model';
import { OnboardingData, DefaultPlanConfig } from '../../core/models/onboarding.model';

@Injectable({
  providedIn: 'root'
})
export class OnboardingService {
  constructor(
    @Inject(ONBOARDING_REPOSITORY_TOKEN) private onboardingRepository: IOnboardingRepository
  ) {}

  sendVerificationCode(email: string): Observable<boolean> {
    return this.onboardingRepository.sendVerificationCode(email);
  }

  verifyEmailCode(email: string, code: string): Observable<boolean> {
    return this.onboardingRepository.verifyEmailCode(email, code);
  }

  onboardWorkspace(payload: OnboardingData): Observable<{ gym: Gym; owner: UserProfile }> {
    return this.onboardingRepository.onboardWorkspace(payload);
  }

  getDefaultPlans(): DefaultPlanConfig[] {
    return [
      {
        name: 'Essential Monthly',
        durationMonths: 1,
        price: 1500,
        description: 'Perfect for beginners starting their fitness journey. Access to cardio and strength sections.',
        features: ['Cardio & Strength Area Access', 'Standard Gym Equipments', 'Locker Room Access', '1 Trainer Consultation/mo'],
        enabled: true
      },
      {
        name: 'Premium Quarterly',
        durationMonths: 3,
        price: 4000,
        description: 'Our most popular tier. Includes access to group classes and steam room facilities.',
        features: ['All Essential Features', 'Group HIIT & Yoga Classes', 'Steam Room & Spa Access', 'Diet Consultation', '3 Guest Passes/mo'],
        enabled: true
      },
      {
        name: 'Elite Annual Platinum',
        durationMonths: 12,
        price: 15000,
        description: 'Complete year-round package with direct personal training vouchers and premium drinks.',
        features: ['All Premium Features', 'Free Personal Trainer (2 sessions/mo)', 'Unlimited Towel & Beverage Service', 'Priority Locker Booking', '10 Guest Passes/yr', 'Free Gym Merch Kit'],
        enabled: true
      }
    ];
  }
}
