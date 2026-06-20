import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Gym, Branch } from '../../core/models/gym.entity';
import { SubscriptionPlan } from '../../core/enums/subscription-plans.enum';
import { FeatureFlags } from '../../core/models/subscription.model';
import { PLAN_FEATURES } from '../subscription/subscription.service';

@Injectable({
  providedIn: 'root'
})
export class TenantContextService {
  private activeGymIdSubject = new BehaviorSubject<string | null>(null);
  activeGymId$: Observable<string | null> = this.activeGymIdSubject.asObservable();

  private activeBranchIdSubject = new BehaviorSubject<string | null>(null);
  activeBranchId$: Observable<string | null> = this.activeBranchIdSubject.asObservable();

  private activeSubscriptionSubject = new BehaviorSubject<SubscriptionPlan | null>(null);
  activeSubscription$: Observable<SubscriptionPlan | null> = this.activeSubscriptionSubject.asObservable();

  private activeGymSubject = new BehaviorSubject<Gym | null>(null);
  activeGym$: Observable<Gym | null> = this.activeGymSubject.asObservable();

  private activeBranchSubject = new BehaviorSubject<Branch | null>(null);
  activeBranch$: Observable<Branch | null> = this.activeBranchSubject.asObservable();

  private activeFeatureFlagsSubject = new BehaviorSubject<FeatureFlags | null>(null);
  activeFeatureFlags$: Observable<FeatureFlags | null> = this.activeFeatureFlagsSubject.asObservable();

  setTenantId(gymId: string | null): void {
    this.activeGymIdSubject.next(gymId);
    if (gymId) {
      localStorage.setItem('apexfit_active_tenant', gymId);
    } else {
      localStorage.removeItem('apexfit_active_tenant');
      this.activeGymSubject.next(null);
      this.activeSubscriptionSubject.next(null);
      this.activeFeatureFlagsSubject.next(null);
      this.setBranchId(null);
    }
  }

  getTenantId(): string | null {
    return this.activeGymIdSubject.value;
  }

  setBranchId(branchId: string | null): void {
    this.activeBranchIdSubject.next(branchId);
    if (branchId) {
      localStorage.setItem(`apexfit_active_branch_${this.getTenantId()}`, branchId);
    }
    this.updateActiveBranchEntity();
  }

  getBranchId(): string | null {
    return this.activeBranchIdSubject.value;
  }

  setSubscription(plan: SubscriptionPlan | null): void {
    this.activeSubscriptionSubject.next(plan);
    if (plan) {
      this.activeFeatureFlagsSubject.next(PLAN_FEATURES[plan]);
    } else {
      this.activeFeatureFlagsSubject.next(null);
    }
  }

  getSubscription(): SubscriptionPlan | null {
    return this.activeSubscriptionSubject.value;
  }

  setActiveGym(gym: Gym | null): void {
    this.activeGymSubject.next(gym);
    if (gym) {
      this.activeGymIdSubject.next(gym.gymId);
      this.setSubscription(gym.subscriptionPlan);
      localStorage.setItem('apexfit_active_tenant', gym.gymId);
      
      // Auto-resolve branch
      const savedBranchId = localStorage.getItem(`apexfit_active_branch_${gym.gymId}`);
      const availableBranches = gym.branches || [];
      
      if (savedBranchId && availableBranches.some(b => b.id === savedBranchId)) {
        this.setBranchId(savedBranchId);
      } else if (availableBranches.length > 0) {
        this.setBranchId(availableBranches[0].id);
      } else {
        this.setBranchId(null);
      }
    } else {
      this.setTenantId(null);
    }
  }

  getActiveGym(): Gym | null {
    return this.activeGymSubject.value;
  }

  getActiveBranch(): Branch | null {
    return this.activeBranchSubject.value;
  }

  getFeatureFlags(): FeatureFlags | null {
    return this.activeFeatureFlagsSubject.value;
  }

  private updateActiveBranchEntity(): void {
    const gym = this.activeGymSubject.value;
    const branchId = this.activeBranchIdSubject.value;
    if (gym && branchId && gym.branches) {
      const branch = gym.branches.find(b => b.id === branchId) || null;
      this.activeBranchSubject.next(branch);
    } else {
      this.activeBranchSubject.next(null);
    }
  }
}

