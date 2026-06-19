import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { IGymRepository, GYM_REPOSITORY_TOKEN } from '../../core/interfaces/repository.interfaces';
import { Gym } from '../../core/models/gym.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { SubscriptionService } from '../../domain/subscription/subscription.service';
import { FeatureFlags, SaaSPayment } from '../../core/models/subscription.model';
import { SubscriptionPlan } from '../../core/enums/subscription-plans.enum';

@Injectable({
  providedIn: 'root'
})
export class GymState {
  private gymsSubject = new BehaviorSubject<Gym[]>([]);
  gyms$ = this.gymsSubject.asObservable();

  private activeGymSubject = new BehaviorSubject<Gym | null>(null);
  activeGym$ = this.activeGymSubject.asObservable();

  activeGymFeatures$: Observable<FeatureFlags | null> = this.activeGym$.pipe(
    map(gym => gym ? this.subscriptionService.getFeatureFlags(gym.subscriptionPlan) : null)
  );

  activeGymBillingHistory$: Observable<SaaSPayment[]> = this.activeGym$.pipe(
    switchMap(gym => {
      if (!gym) return of([]);
      return this.subscriptionService.getBillingHistory(gym.gymId);
    })
  );

  constructor(
    @Inject(GYM_REPOSITORY_TOKEN) private gymRepository: IGymRepository,
    private tenantContext: TenantContextService,
    private subscriptionService: SubscriptionService
  ) {
    // ── Reactive gym list hydration ─────────────────────────────────────────────
    // Mirrors the exact pattern used by MemberState, EmployeeState, LeadState,
    // PaymentState, and PTState. No query fires until activeGymId$ emits a non-null
    // value, which only happens AFTER APP_INITIALIZER (Firebase Auth resolution)
    // has completed — eliminating the permission-denied race condition on refresh.
    this.tenantContext.activeGymId$.pipe(
      switchMap(gymId => {
        if (!gymId) return of([]);
        return this.gymRepository.getGyms().pipe(
          catchError(err => {
            console.error('[GymState] Error fetching gym list:', err);
            return of([]);
          })
        );
      })
    ).subscribe(gyms => {
      this.gymsSubject.next(gyms);
      // Derive activeGym from the freshly-loaded list to keep gyms$ and activeGym$
      // always consistent without a second independent Firestore subscription.
      const activeId = this.tenantContext.getTenantId();
      const match = activeId ? gyms.find(g => g.gymId === activeId) : undefined;
      this.activeGymSubject.next(match ?? null);
    });
  }

  /**
   * Manual refresh — re-queries the gym list from Firestore.
   * Guards silently if no authenticated tenant context is present, consistent
   * with MemberState.loadMembers() and EmployeeState.loadEmployees().
   */
  loadGyms(): void {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) return;

    this.gymRepository.getGyms().pipe(
      catchError(err => {
        console.error('[GymState] Error refreshing gym list:', err);
        return of([]);
      })
    ).subscribe(gyms => {
      this.gymsSubject.next(gyms);
      const active = gyms.find(g => g.gymId === gymId);
      this.activeGymSubject.next(active ?? null);
    });
  }

  switchGym(gymId: string): void {
    this.tenantContext.setTenantId(gymId);
  }

  createGym(gym: Omit<Gym, 'gymId' | 'createdAt'>): Observable<Gym> {
    return this.gymRepository.createGym(gym).pipe(
      tap(() => this.loadGyms())
    );
  }

  updateGym(gym: Gym): Observable<void> {
    return this.gymRepository.updateGym(gym).pipe(
      tap(() => this.loadGyms())
    );
  }

  upgradeActiveGymSubscription(plan: SubscriptionPlan, paymentMethod: string, amount: number): Observable<void> {
    const gym = this.activeGymSubject.value;
    if (!gym) throw new Error('No active gym selected');

    const updatedGym: Gym = {
      ...gym,
      subscriptionPlan: plan
    };

    return this.subscriptionService.upgradeSubscription(gym.gymId, plan, paymentMethod, amount).pipe(
      switchMap(() => this.updateGym(updatedGym))
    );
  }
}
