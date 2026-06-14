import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { SubscriptionPlan } from '../../core/enums/subscription-plans.enum';
import { FeatureFlags, SaaSPayment, SubscriptionStatus } from '../../core/models/subscription.model';

export const PLAN_FEATURES: Record<SubscriptionPlan, FeatureFlags> = {
  [SubscriptionPlan.FreeTrial]: {
    canManageTrainers: false,
    canExportReports: false,
    canAccessAnalytics: false,
    canManageBranches: false,
    maxMembers: 5,
    maxTrainers: 1,
    maxEmployees: 1
  },
  [SubscriptionPlan.Basic]: {
    canManageTrainers: true,
    canExportReports: false,
    canAccessAnalytics: false,
    canManageBranches: false,
    maxMembers: 200,
    maxTrainers: 5,
    maxEmployees: 5
  },
  [SubscriptionPlan.Pro]: {
    canManageTrainers: true,
    canExportReports: true,
    canAccessAnalytics: false,
    canManageBranches: false,
    maxMembers: Infinity,
    maxTrainers: Infinity,
    maxEmployees: Infinity
  },
  [SubscriptionPlan.Enterprise]: {
    canManageTrainers: true,
    canExportReports: true,
    canAccessAnalytics: true,
    canManageBranches: true,
    maxMembers: Infinity,
    maxTrainers: Infinity,
    maxEmployees: Infinity
  }
};

export const PLAN_PRICES: Record<SubscriptionPlan, { monthly: number; yearly: number }> = {
  [SubscriptionPlan.FreeTrial]: { monthly: 0, yearly: 0 },
  [SubscriptionPlan.Basic]: { monthly: 2499, yearly: 24990 },
  [SubscriptionPlan.Pro]: { monthly: 6499, yearly: 64990 },
  [SubscriptionPlan.Enterprise]: { monthly: 15999, yearly: 159990 }
};

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private billingHistorySubject = new BehaviorSubject<SaaSPayment[]>([]);
  billingHistory$ = this.billingHistorySubject.asObservable();

  constructor() {
    this.loadBillingHistory();
  }

  private loadBillingHistory(): void {
    const data = localStorage.getItem('apexfit_saas_billing');
    if (data) {
      this.billingHistorySubject.next(JSON.parse(data));
    } else {
      const initialHistory: SaaSPayment[] = [
        {
          id: 'saas-inv-001',
          gymId: 'gym-a',
          plan: SubscriptionPlan.FreeTrial,
          amount: 0,
          paymentMethod: 'System Provision',
          status: 'paid',
          date: '2026-01-01',
          invoiceNumber: 'INV-2026-001'
        },
        {
          id: 'saas-inv-002',
          gymId: 'gym-a',
          plan: SubscriptionPlan.Pro,
          amount: 6499,
          paymentMethod: 'Visa ending in 4242',
          status: 'paid',
          date: '2026-02-01',
          invoiceNumber: 'INV-2026-042'
        },
        {
          id: 'saas-inv-003',
          gymId: 'gym-b',
          plan: SubscriptionPlan.FreeTrial,
          amount: 0,
          paymentMethod: 'System Provision',
          status: 'paid',
          date: '2026-03-01',
          invoiceNumber: 'INV-2026-088'
        },
        {
          id: 'saas-inv-004',
          gymId: 'gym-b',
          plan: SubscriptionPlan.Basic,
          amount: 2499,
          paymentMethod: 'Mastercard ending in 8899',
          status: 'paid',
          date: '2026-04-01',
          invoiceNumber: 'INV-2026-129'
        }
      ];
      localStorage.setItem('apexfit_saas_billing', JSON.stringify(initialHistory));
      this.billingHistorySubject.next(initialHistory);
    }
  }

  getBillingHistory(gymId: string): Observable<SaaSPayment[]> {
    return this.billingHistory$.pipe(
      map(history => history.filter(h => h.gymId === gymId))
    );
  }

  addBillingRecord(record: Omit<SaaSPayment, 'id' | 'invoiceNumber'>): void {
    const current = this.billingHistorySubject.value;
    const newRecord: SaaSPayment = {
      ...record,
      id: 'saas-inv-' + Math.random().toString(36).substring(2, 9),
      invoiceNumber: 'INV-2026-' + Math.floor(100 + Math.random() * 900)
    };
    const updated = [newRecord, ...current];
    localStorage.setItem('apexfit_saas_billing', JSON.stringify(updated));
    this.billingHistorySubject.next(updated);
  }

  upgradeSubscription(gymId: string, plan: SubscriptionPlan, paymentMethod: string, amount: number): Observable<void> {
    this.addBillingRecord({
      gymId,
      plan,
      amount,
      paymentMethod,
      status: 'paid',
      date: new Date().toISOString().split('T')[0]
    });
    return of(undefined);
  }

  getFeatureFlags(plan: SubscriptionPlan): FeatureFlags {
    return PLAN_FEATURES[plan] || PLAN_FEATURES[SubscriptionPlan.FreeTrial];
  }

  isFeatureAllowed(plan: SubscriptionPlan, feature: keyof Omit<FeatureFlags, 'maxMembers' | 'maxTrainers' | 'maxEmployees'>): boolean {
    const flags = this.getFeatureFlags(plan);
    return !!flags[feature];
  }

  hasReachedLimit(plan: SubscriptionPlan, metric: 'maxMembers' | 'maxTrainers' | 'maxEmployees', currentCount: number): boolean {
    const flags = this.getFeatureFlags(plan);
    const limit = flags[metric];
    return currentCount >= limit;
  }

  getSubscriptionStatus(
    plan: SubscriptionPlan,
    createdAt: string,
    memberCount: number,
    trainerCount: number
  ): SubscriptionStatus {
    const flags = this.getFeatureFlags(plan);
    
    // Calculate end date based on created date or active subscription
    const start = new Date(createdAt || '2026-01-01');
    const end = new Date(start);
    if (plan === SubscriptionPlan.FreeTrial) {
      end.setDate(end.getDate() + 14); // 14-day Free Trial standard
    } else {
      end.setFullYear(end.getFullYear() + 1); // 1 year renewal cycle standard
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endMidnight = new Date(end);
    endMidnight.setHours(23, 59, 59, 999);
    
    let status: 'active' | 'trialing' | 'expired' | 'suspended' = 'active';
    if (plan === SubscriptionPlan.FreeTrial) {
      status = today > endMidnight ? 'expired' : 'trialing';
    } else {
      status = today > endMidnight ? 'expired' : 'active';
    }
    
    const diffTime = endMidnight.getTime() - today.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    return {
      activePlan: plan,
      status,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      memberCount,
      memberLimit: flags.maxMembers,
      trainerCount,
      trainerLimit: flags.maxTrainers,
      daysRemaining
    };
  }
}

