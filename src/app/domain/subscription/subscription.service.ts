import { Injectable } from '@angular/core';
import { SubscriptionPlan } from '../../core/enums/subscription-plans.enum';
import { FeatureFlags } from '../../core/models/subscription.model';

export const PLAN_FEATURES: Record<SubscriptionPlan, FeatureFlags> = {
  [SubscriptionPlan.FreeTrial]: {
    canManageTrainers: false,
    canExportReports: false,
    canAccessAnalytics: false,
    maxMembers: 5,
    maxTrainers: 1
  },
  [SubscriptionPlan.Basic]: {
    canManageTrainers: true,
    canExportReports: false,
    canAccessAnalytics: false,
    maxMembers: 50,
    maxTrainers: 3
  },
  [SubscriptionPlan.Pro]: {
    canManageTrainers: true,
    canExportReports: true,
    canAccessAnalytics: true,
    maxMembers: 500,
    maxTrainers: 15
  },
  [SubscriptionPlan.Enterprise]: {
    canManageTrainers: true,
    canExportReports: true,
    canAccessAnalytics: true,
    maxMembers: Infinity,
    maxTrainers: Infinity
  }
};

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  getFeatureFlags(plan: SubscriptionPlan): FeatureFlags {
    return PLAN_FEATURES[plan] || PLAN_FEATURES[SubscriptionPlan.FreeTrial];
  }

  isFeatureAllowed(plan: SubscriptionPlan, feature: keyof Omit<FeatureFlags, 'maxMembers' | 'maxTrainers'>): boolean {
    const flags = this.getFeatureFlags(plan);
    return !!flags[feature];
  }

  hasReachedLimit(plan: SubscriptionPlan, metric: 'maxMembers' | 'maxTrainers', currentCount: number): boolean {
    const flags = this.getFeatureFlags(plan);
    const limit = flags[metric];
    return currentCount >= limit;
  }
}
