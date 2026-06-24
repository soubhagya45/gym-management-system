import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { switchMap, tap, map, catchError } from 'rxjs/operators';
import { Lead } from '../../core/models/lead.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { MemberState } from './member.state';
import { Member } from '../../core/models/member.entity';
import { PaymentState } from './payment.state';
import { PTState } from './pt.state';
import { FinanceState } from './finance.state';
import { LeadService } from '../../services/lead.service';

@Injectable({
  providedIn: 'root'
})
export class LeadState {
  private leadsSubject = new BehaviorSubject<Lead[]>([]);
  leads$ = this.leadsSubject.asObservable();

  constructor(
    private leadService: LeadService,
    private tenantContext: TenantContextService,
    private memberState: MemberState,
    private paymentState: PaymentState,
    private ptState: PTState,
    private financeState: FinanceState,
    private injector: Injector
  ) {
    combineLatest([
      this.tenantContext.activeGymId$,
      this.tenantContext.activeBranchId$
    ]).pipe(
      switchMap(([gymId, branchId]) => {
        if (!gymId) return of([]);
        return this.leadService.getLeads().pipe(
          catchError(err => {
            console.error('Error fetching leads:', err);
            return of([]);
          })
        );
      })
    ).subscribe(leads => {
      this.leadsSubject.next(leads);
    });
  }

  loadLeads(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.leadService.getLeads().subscribe(leads => {
        this.leadsSubject.next(leads);
      });
    }
  }

  addLead(lead: Omit<Lead, 'id' | 'gymId'>): Observable<Lead> {
    return this.leadService.addLead(lead).pipe(
      tap(() => {
        this.loadLeads();
      })
    );
  }

  updateLead(lead: Lead): Observable<void> {
    return this.leadService.updateLead(lead).pipe(
      tap(() => {
        this.loadLeads();
      })
    );
  }

  deleteLead(id: string): Observable<void> {
    return this.leadService.deleteLead(id).pipe(
      tap(() => {
        this.loadLeads();
      })
    );
  }

  updateLeadStage(leadId: string, stage: Lead['status']): Observable<void> {
    const lead = this.leadsSubject.value.find(l => l.id === leadId);
    if (!lead) return of(undefined);

    return this.leadService.updateLeadStage(lead, stage).pipe(
      tap(() => {
        this.loadLeads();
      })
    );
  }

  convertLeadToMember(
    leadId: string,
    memberDetails: Omit<Member, 'id' | 'attendanceCount' | 'balance' | 'gymId'>,
    conversionDetails: {
      convertedBy: string;
      revenueGenerated: number;
      commissionPercent?: number;
      paymentStatus: 'paid' | 'partially_paid' | 'pending' | 'overdue';
      paymentMethod: string;
      paidAmount: number;
      interestedInPT?: 'Yes' | 'No';
      ptPlanId?: string;
      preferredTrainerId?: string;
      ptGoal?: string;
      ptPlanPrice?: number;
      ptPlanName?: string;
      trainerName?: string;
      ptPlanDuration?: number;
      ptSessionsTotal?: number;
      discountType?: 'flat' | 'percentage' | 'none';
      discountValue?: number;
    }
  ): Observable<void> {
    const lead = this.leadsSubject.value.find(l => l.id === leadId);
    if (!lead) return of(undefined);

    return this.leadService.convertLeadToMember(lead, memberDetails, conversionDetails).pipe(
      tap(() => {
        this.loadLeads();
        this.memberState.loadMembers();
        this.paymentState.loadPayments();
        this.ptState.loadAll();
        this.financeState.loadFinanceData();
      }),
      map(() => undefined)
    );
  }

  logFollowUp(
    leadId: string,
    item: {
      date: string;
      employeeId: string;
      employeeName: string;
      notes: string;
      nextFollowUpDate?: string;
    }
  ): Observable<void> {
    const lead = this.leadsSubject.value.find(l => l.id === leadId);
    if (!lead) return of(undefined);

    return this.leadService.logFollowUp(lead, item).pipe(
      tap(() => {
        this.loadLeads();
      })
    );
  }
}
