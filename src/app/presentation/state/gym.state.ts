import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
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
    this.loadGyms();

    // Automatically synchronize active Gym details whenever Tenant ID changes
    this.tenantContext.activeGymId$.pipe(
      switchMap(gymId => {
        if (!gymId) return of(null);
        return this.gymRepository.getGymById(gymId);
      })
    ).subscribe(gym => {
      this.activeGymSubject.next(gym);
    });
  }

  loadGyms(): void {
    this.gymRepository.getGyms().subscribe(gyms => {
      this.gymsSubject.next(gyms);
      
      const activeId = this.tenantContext.getTenantId();
      if (activeId) {
        const active = gyms.find(g => g.gymId === activeId);
        if (active) this.activeGymSubject.next(active);
      }
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

