import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import {
  IMembershipPlanRepository,
  MEMBERSHIP_PLAN_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { MembershipPlan } from '../../core/models/membership-plan.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';

@Injectable({
  providedIn: 'root'
})
export class MembershipPlanState {
  private plansSubject = new BehaviorSubject<MembershipPlan[]>([]);
  plans$ = this.plansSubject.asObservable();

  constructor(
    @Inject(MEMBERSHIP_PLAN_REPOSITORY_TOKEN) private planRepository: IMembershipPlanRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService
  ) {
    this.tenantContext.activeGymId$.pipe(
      switchMap(gymId => {
        if (!gymId) return of([]);
        return this.planRepository.getPlans(gymId);
      })
    ).subscribe(plans => {
      this.plansSubject.next(plans);
    });
  }

  loadPlans(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.planRepository.getPlans(gymId).subscribe(plans => {
        this.plansSubject.next(plans);
      });
    }
  }

  addPlan(plan: Omit<MembershipPlan, 'id' | 'activeMembersCount' | 'gymId'>): Observable<MembershipPlan> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.planRepository.addPlan(gymId, { ...plan, gymId }).pipe(
      tap(() => {
        this.loadPlans();
        this.logRepository.addLog(gymId, `Created new membership plan: ${plan.name}`, 'plan-change').subscribe();
      })
    );
  }

  updatePlan(plan: MembershipPlan): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.planRepository.updatePlan(gymId, plan).pipe(
      tap(() => {
        this.loadPlans();
        this.logRepository.addLog(gymId, `Updated details for membership plan: ${plan.name}`, 'plan-change').subscribe();
      })
    );
  }

  deletePlan(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const planName = this.plansSubject.value.find(p => p.id === id)?.name || 'Plan';

    return this.planRepository.deletePlan(gymId, id).pipe(
      tap(() => {
        this.loadPlans();
        this.logRepository.addLog(gymId, `Deleted membership plan: ${planName}`, 'plan-change').subscribe();
      })
    );
  }
}
