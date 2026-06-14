import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppConfigService } from '../../../core/config/app-config';
import { BaseApiRepository } from '../../../core/repositories/base-api.repository';
import { IOnboardingRepository } from '../../../core/interfaces/onboarding-repository.interface';
import { Gym } from '../../../core/models/gym.entity';
import { UserProfile } from '../../../core/models/user.model';
import { OnboardingData } from '../../../core/models/onboarding.model';

@Injectable({ providedIn: 'root' })
export class ApiOnboardingRepository extends BaseApiRepository implements IOnboardingRepository {
  protected get endpoint(): string {
    return '/onboarding';
  }

  constructor(
    http: HttpClient,
    configService: AppConfigService
  ) {
    super(http, configService);
  }

  sendVerificationCode(email: string): Observable<boolean> {
    return this.post<boolean>('/send-code', { email });
  }

  verifyEmailCode(email: string, code: string): Observable<boolean> {
    return this.post<boolean>('/verify-code', { email, code });
  }

  onboardWorkspace(payload: OnboardingData): Observable<{ gym: Gym; owner: UserProfile }> {
    return this.post<{ gym: Gym; owner: UserProfile }>('/workspace', payload);
  }
}
