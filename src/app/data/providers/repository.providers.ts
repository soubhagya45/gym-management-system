import { Provider, Injector } from '@angular/core';
import { AppConfigService, ProviderType } from '../../core/config/app-config';

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
  AUTH_REPOSITORY_TOKEN,
  GYM_REPOSITORY_TOKEN,
  MEMBER_REPOSITORY_TOKEN,
  PAYMENT_REPOSITORY_TOKEN,
  LEAD_REPOSITORY_TOKEN,
  TRAINER_REPOSITORY_TOKEN,
  ATTENDANCE_REPOSITORY_TOKEN,
  MEMBERSHIP_PLAN_REPOSITORY_TOKEN,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';

import {
  MockAuthRepository,
  MockGymRepository,
  MockMemberRepository,
  MockPaymentRepository,
  MockLeadRepository,
  MockTrainerRepository,
  MockAttendanceRepository,
  MockMembershipPlanRepository,
  MockActivityLogRepository
} from '../repositories/mock/mock-repositories';

import {
  FirebaseAuthRepository,
  FirebaseGymRepository,
  FirebaseMemberRepository,
  FirebasePaymentRepository,
  FirebaseLeadRepository,
  FirebaseTrainerRepository,
  FirebaseAttendanceRepository,
  FirebaseMembershipPlanRepository,
  FirebaseActivityLogRepository
} from '../repositories/firebase/firebase-repositories';

import {
  SupabaseAuthRepository,
  SupabaseGymRepository,
  SupabaseMemberRepository,
  SupabasePaymentRepository,
  SupabaseLeadRepository,
  SupabaseTrainerRepository,
  SupabaseAttendanceRepository,
  SupabaseMembershipPlanRepository,
  SupabaseActivityLogRepository
} from '../repositories/supabase/supabase-repositories';

import {
  ApiAuthRepository,
  ApiGymRepository,
  ApiMemberRepository,
  ApiPaymentRepository,
  ApiLeadRepository,
  ApiTrainerRepository,
  ApiAttendanceRepository,
  ApiMembershipPlanRepository,
  ApiActivityLogRepository
} from '../repositories/api/api-repositories';

// Helper factory functions

export function authRepositoryFactory(configService: AppConfigService, injector: Injector): IAuthRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseAuthRepository);
    case ProviderType.Supabase: return injector.get(SupabaseAuthRepository);
    case ProviderType.REST: return injector.get(ApiAuthRepository);
    case ProviderType.Mock:
    default: return injector.get(MockAuthRepository);
  }
}

export function gymRepositoryFactory(configService: AppConfigService, injector: Injector): IGymRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseGymRepository);
    case ProviderType.Supabase: return injector.get(SupabaseGymRepository);
    case ProviderType.REST: return injector.get(ApiGymRepository);
    case ProviderType.Mock:
    default: return injector.get(MockGymRepository);
  }
}

export function memberRepositoryFactory(configService: AppConfigService, injector: Injector): IMemberRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseMemberRepository);
    case ProviderType.Supabase: return injector.get(SupabaseMemberRepository);
    case ProviderType.REST: return injector.get(ApiMemberRepository);
    case ProviderType.Mock:
    default: return injector.get(MockMemberRepository);
  }
}

export function paymentRepositoryFactory(configService: AppConfigService, injector: Injector): IPaymentRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebasePaymentRepository);
    case ProviderType.Supabase: return injector.get(SupabasePaymentRepository);
    case ProviderType.REST: return injector.get(ApiPaymentRepository);
    case ProviderType.Mock:
    default: return injector.get(MockPaymentRepository);
  }
}

export function leadRepositoryFactory(configService: AppConfigService, injector: Injector): ILeadRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseLeadRepository);
    case ProviderType.Supabase: return injector.get(SupabaseLeadRepository);
    case ProviderType.REST: return injector.get(ApiLeadRepository);
    case ProviderType.Mock:
    default: return injector.get(MockLeadRepository);
  }
}

export function trainerRepositoryFactory(configService: AppConfigService, injector: Injector): ITrainerRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseTrainerRepository);
    case ProviderType.Supabase: return injector.get(SupabaseTrainerRepository);
    case ProviderType.REST: return injector.get(ApiTrainerRepository);
    case ProviderType.Mock:
    default: return injector.get(MockTrainerRepository);
  }
}

export function attendanceRepositoryFactory(configService: AppConfigService, injector: Injector): IAttendanceRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseAttendanceRepository);
    case ProviderType.Supabase: return injector.get(SupabaseAttendanceRepository);
    case ProviderType.REST: return injector.get(ApiAttendanceRepository);
    case ProviderType.Mock:
    default: return injector.get(MockAttendanceRepository);
  }
}

export function membershipPlanRepositoryFactory(configService: AppConfigService, injector: Injector): IMembershipPlanRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseMembershipPlanRepository);
    case ProviderType.Supabase: return injector.get(SupabaseMembershipPlanRepository);
    case ProviderType.REST: return injector.get(ApiMembershipPlanRepository);
    case ProviderType.Mock:
    default: return injector.get(MockMembershipPlanRepository);
  }
}

export function activityLogRepositoryFactory(configService: AppConfigService, injector: Injector): IActivityLogRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseActivityLogRepository);
    case ProviderType.Supabase: return injector.get(SupabaseActivityLogRepository);
    case ProviderType.REST: return injector.get(ApiActivityLogRepository);
    case ProviderType.Mock:
    default: return injector.get(MockActivityLogRepository);
  }
}

export const REPOSITORY_PROVIDERS = [
  {
    provide: AUTH_REPOSITORY_TOKEN,
    useFactory: authRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: GYM_REPOSITORY_TOKEN,
    useFactory: gymRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: MEMBER_REPOSITORY_TOKEN,
    useFactory: memberRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: PAYMENT_REPOSITORY_TOKEN,
    useFactory: paymentRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: LEAD_REPOSITORY_TOKEN,
    useFactory: leadRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: TRAINER_REPOSITORY_TOKEN,
    useFactory: trainerRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: ATTENDANCE_REPOSITORY_TOKEN,
    useFactory: attendanceRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: MEMBERSHIP_PLAN_REPOSITORY_TOKEN,
    useFactory: membershipPlanRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: ACTIVITY_LOG_REPOSITORY_TOKEN,
    useFactory: activityLogRepositoryFactory,
    deps: [AppConfigService, Injector]
  }
];
