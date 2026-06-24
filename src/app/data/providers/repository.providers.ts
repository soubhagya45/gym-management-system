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
  IWhatsAppRepository,
  IBodyProgressRepository,
  AUTH_REPOSITORY_TOKEN,
  GYM_REPOSITORY_TOKEN,
  MEMBER_REPOSITORY_TOKEN,
  PAYMENT_REPOSITORY_TOKEN,
  LEAD_REPOSITORY_TOKEN,
  TRAINER_REPOSITORY_TOKEN,
  ATTENDANCE_REPOSITORY_TOKEN,
  MEMBERSHIP_PLAN_REPOSITORY_TOKEN,
  ACTIVITY_LOG_REPOSITORY_TOKEN,
  WHATSAPP_REPOSITORY_TOKEN,
  BODY_PROGRESS_REPOSITORY_TOKEN,
  IFinanceRepository,
  FINANCE_REPOSITORY_TOKEN,
  IEmployeeRepository,
  EMPLOYEE_REPOSITORY_TOKEN,
  IPersonalTrainingRepository,
  PERSONAL_TRAINING_REPOSITORY_TOKEN,
  IAuditLogRepository,
  AUDIT_LOG_REPOSITORY_TOKEN,
  IPaymentSettingsRepository,
  PAYMENT_SETTINGS_REPOSITORY_TOKEN,
  IProductRepository,
  PRODUCT_REPOSITORY_TOKEN,
  IImportProfileRepository,
  IMPORT_PROFILE_REPOSITORY_TOKEN,
  IImportHistoryRepository,
  IMPORT_HISTORY_REPOSITORY_TOKEN,
  IUnitOfWork,
  UNIT_OF_WORK_TOKEN,
  BACKGROUND_JOB_PROVIDER_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { IOnboardingRepository, ONBOARDING_REPOSITORY_TOKEN } from '../../core/interfaces/onboarding-repository.interface';
import { MockOnboardingRepository } from '../repositories/mock/mock-onboarding.repository';
import { FirebaseOnboardingRepository } from '../repositories/firebase/firebase-onboarding.repository';
import { SupabaseOnboardingRepository } from '../repositories/supabase/supabase-onboarding.repository';
import { ApiOnboardingRepository } from '../repositories/api/api-onboarding.repository';

import { IFileStorageRepository, FILE_STORAGE_REPOSITORY_TOKEN } from '../../core/interfaces/file-storage-repository.interface';
import { MockFileStorageRepository } from '../repositories/mock/mock-file-storage.repository';
import { FirebaseStorageRepository } from '../repositories/firebase/firebase-file-storage.repository';
import { ApiFileStorageRepository } from '../repositories/api/api-file-storage.repository';
import { ClientBackgroundJobProvider } from '../../services/client-background-job.provider';


import {
  MockAuthRepository,
  MockGymRepository,
  MockMemberRepository,
  MockPaymentRepository,
  MockLeadRepository,
  MockTrainerRepository,
  MockAttendanceRepository,
  MockMembershipPlanRepository,
  MockActivityLogRepository,
  MockWhatsAppRepository,
  MockBodyProgressRepository,
  MockFinanceRepository,
  MockEmployeeRepository,
  MockPersonalTrainingRepository,
  MockAuditLogRepository,
  MockPaymentSettingsRepository,
  MockProductRepository,
  MockImportProfileRepository,
  MockImportHistoryRepository,
  MockUnitOfWork
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
  FirebaseActivityLogRepository,
  FirebaseWhatsAppRepository,
  FirebaseBodyProgressRepository,
  FirebaseFinanceRepository,
  FirebaseEmployeeRepository,
  FirebasePersonalTrainingRepository,
  FirebaseAuditLogRepository,
  FirebasePaymentSettingsRepository,
  FirebaseProductRepository,
  FirebaseImportProfileRepository,
  FirebaseImportHistoryRepository,
  FirebaseUnitOfWork
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
  SupabaseActivityLogRepository,
  SupabaseWhatsAppRepository,
  SupabaseBodyProgressRepository,
  SupabaseFinanceRepository,
  SupabaseEmployeeRepository,
  SupabaseAuditLogRepository,
  SupabasePaymentSettingsRepository,
  SupabaseProductRepository,
  SupabaseImportProfileRepository,
  SupabaseImportHistoryRepository,
  SupabaseUnitOfWork
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
  ApiActivityLogRepository,
  ApiWhatsAppRepository,
  ApiBodyProgressRepository,
  ApiFinanceRepository,
  ApiEmployeeRepository,
  ApiAuditLogRepository,
  ApiPaymentSettingsRepository,
  ApiProductRepository,
  ApiImportProfileRepository,
  ApiImportHistoryRepository,
  ApiUnitOfWork
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

export function whatsAppRepositoryFactory(configService: AppConfigService, injector: Injector): IWhatsAppRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseWhatsAppRepository);
    case ProviderType.Supabase: return injector.get(SupabaseWhatsAppRepository);
    case ProviderType.REST: return injector.get(ApiWhatsAppRepository);
    case ProviderType.Mock:
    default: return injector.get(MockWhatsAppRepository);
  }
}

export function bodyProgressRepositoryFactory(configService: AppConfigService, injector: Injector): IBodyProgressRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseBodyProgressRepository);
    case ProviderType.Supabase: return injector.get(SupabaseBodyProgressRepository);
    case ProviderType.REST: return injector.get(ApiBodyProgressRepository);
    case ProviderType.Mock:
    default: return injector.get(MockBodyProgressRepository);
  }
}

export function financeRepositoryFactory(configService: AppConfigService, injector: Injector): IFinanceRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseFinanceRepository);
    case ProviderType.Supabase: return injector.get(SupabaseFinanceRepository);
    case ProviderType.REST: return injector.get(ApiFinanceRepository);
    case ProviderType.Mock:
    default: return injector.get(MockFinanceRepository);
  }
}

export function employeeRepositoryFactory(configService: AppConfigService, injector: Injector): IEmployeeRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseEmployeeRepository);
    case ProviderType.Supabase: return injector.get(SupabaseEmployeeRepository);
    case ProviderType.REST: return injector.get(ApiEmployeeRepository);
    case ProviderType.Mock:
    default: return injector.get(MockEmployeeRepository);
  }
}

export function personalTrainingRepositoryFactory(configService: AppConfigService, injector: Injector): IPersonalTrainingRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebasePersonalTrainingRepository);
    // Fallback to Mock for other providers as REST/Supabase aren't explicitly requested for PT
    default: return injector.get(MockPersonalTrainingRepository);
  }
}

export function auditLogRepositoryFactory(configService: AppConfigService, injector: Injector): IAuditLogRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseAuditLogRepository);
    case ProviderType.Supabase: return injector.get(SupabaseAuditLogRepository);
    case ProviderType.REST: return injector.get(ApiAuditLogRepository);
    case ProviderType.Mock:
    default: return injector.get(MockAuditLogRepository);
  }
}


export function onboardingRepositoryFactory(configService: AppConfigService, injector: Injector): IOnboardingRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseOnboardingRepository);
    case ProviderType.Supabase: return injector.get(SupabaseOnboardingRepository);
    case ProviderType.REST: return injector.get(ApiOnboardingRepository);
    case ProviderType.Mock:
    default: return injector.get(MockOnboardingRepository);
  }
}

export function fileStorageRepositoryFactory(configService: AppConfigService, injector: Injector): IFileStorageRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseStorageRepository);
    case ProviderType.REST: return injector.get(ApiFileStorageRepository);
    case ProviderType.Mock:
    default: return injector.get(MockFileStorageRepository);
  }
}

export function paymentSettingsRepositoryFactory(configService: AppConfigService, injector: Injector): IPaymentSettingsRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebasePaymentSettingsRepository);
    case ProviderType.Supabase: return injector.get(SupabasePaymentSettingsRepository);
    case ProviderType.REST: return injector.get(ApiPaymentSettingsRepository);
    case ProviderType.Mock:
    default: return injector.get(MockPaymentSettingsRepository);
  }
}

export function productRepositoryFactory(configService: AppConfigService, injector: Injector): IProductRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseProductRepository);
    case ProviderType.Supabase: return injector.get(SupabaseProductRepository);
    case ProviderType.REST: return injector.get(ApiProductRepository);
    case ProviderType.Mock:
    default: return injector.get(MockProductRepository);
  }
}

export function importProfileRepositoryFactory(configService: AppConfigService, injector: Injector): IImportProfileRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseImportProfileRepository);
    case ProviderType.Supabase: return injector.get(SupabaseImportProfileRepository);
    case ProviderType.REST: return injector.get(ApiImportProfileRepository);
    case ProviderType.Mock:
    default: return injector.get(MockImportProfileRepository);
  }
}

export function importHistoryRepositoryFactory(configService: AppConfigService, injector: Injector): IImportHistoryRepository {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseImportHistoryRepository);
    case ProviderType.Supabase: return injector.get(SupabaseImportHistoryRepository);
    case ProviderType.REST: return injector.get(ApiImportHistoryRepository);
    case ProviderType.Mock:
    default: return injector.get(MockImportHistoryRepository);
  }
}

export function unitOfWorkFactory(configService: AppConfigService, injector: Injector): IUnitOfWork {
  switch (configService.provider) {
    case ProviderType.Firebase: return injector.get(FirebaseUnitOfWork);
    case ProviderType.Supabase: return injector.get(SupabaseUnitOfWork);
    case ProviderType.REST: return injector.get(ApiUnitOfWork);
    case ProviderType.Mock:
    default: return injector.get(MockUnitOfWork);
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
  },
  {
    provide: WHATSAPP_REPOSITORY_TOKEN,
    useFactory: whatsAppRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: BODY_PROGRESS_REPOSITORY_TOKEN,
    useFactory: bodyProgressRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: FINANCE_REPOSITORY_TOKEN,
    useFactory: financeRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: EMPLOYEE_REPOSITORY_TOKEN,
    useFactory: employeeRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: PERSONAL_TRAINING_REPOSITORY_TOKEN,
    useFactory: personalTrainingRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: ONBOARDING_REPOSITORY_TOKEN,
    useFactory: onboardingRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: FILE_STORAGE_REPOSITORY_TOKEN,
    useFactory: fileStorageRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: AUDIT_LOG_REPOSITORY_TOKEN,
    useFactory: auditLogRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: PAYMENT_SETTINGS_REPOSITORY_TOKEN,
    useFactory: paymentSettingsRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: PRODUCT_REPOSITORY_TOKEN,
    useFactory: productRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: IMPORT_PROFILE_REPOSITORY_TOKEN,
    useFactory: importProfileRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: IMPORT_HISTORY_REPOSITORY_TOKEN,
    useFactory: importHistoryRepositoryFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: UNIT_OF_WORK_TOKEN,
    useFactory: unitOfWorkFactory,
    deps: [AppConfigService, Injector]
  },
  {
    provide: BACKGROUND_JOB_PROVIDER_TOKEN,
    useClass: ClientBackgroundJobProvider
  }
];

