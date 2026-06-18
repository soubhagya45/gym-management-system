import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, tap, map } from 'rxjs/operators';
import {
  ILeadRepository,
  LEAD_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN,
  IMembershipPlanRepository,
  MEMBERSHIP_PLAN_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { Lead, LeadConversionPayload } from '../../core/models/lead.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { MemberState } from './member.state';
import { Member } from '../../core/models/member.entity';
import { PaymentState } from './payment.state';
import { PTState } from './pt.state';
import { FinanceState } from './finance.state';

@Injectable({
  providedIn: 'root'
})
export class LeadState {
  private leadsSubject = new BehaviorSubject<Lead[]>([]);
  leads$ = this.leadsSubject.asObservable();

  constructor(
    @Inject(LEAD_REPOSITORY_TOKEN) private leadRepository: ILeadRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    @Inject(MEMBERSHIP_PLAN_REPOSITORY_TOKEN) private planRepository: IMembershipPlanRepository,
    private tenantContext: TenantContextService,
    private memberState: MemberState,
    private paymentState: PaymentState,
    private ptState: PTState,
    private financeState: FinanceState
  ) {
    this.tenantContext.activeGymId$.pipe(
      switchMap(gymId => {
        if (!gymId) return of([]);
        return this.leadRepository.getLeads(gymId);
      })
    ).subscribe(leads => {
      this.leadsSubject.next(leads);
    });
  }

  loadLeads(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.leadRepository.getLeads(gymId).subscribe(leads => {
        this.leadsSubject.next(leads);
      });
    }
  }

  addLead(lead: Omit<Lead, 'id' | 'gymId'>): Observable<Lead> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const leadWithDefaults = {
      ...lead,
      createdAt: lead.createdAt || new Date().toISOString().split('T')[0]
    };

    return this.leadRepository.addLead(gymId, { ...leadWithDefaults, gymId }).pipe(
      tap(() => {
        this.loadLeads();
        this.logRepository.addLog(gymId, `New trial lead registered: ${lead.name} via ${lead.leadSource}`, 'join').subscribe();
      })
    );
  }

  updateLead(lead: Lead): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.leadRepository.updateLead(gymId, lead).pipe(
      tap(() => {
        this.loadLeads();
        this.logRepository.addLog(gymId, `Updated lead file for: ${lead.name}`, 'plan-change').subscribe();
      })
    );
  }

  deleteLead(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const leadName = this.leadsSubject.value.find(l => l.id === id)?.name || 'Lead';

    return this.leadRepository.deleteLead(gymId, id).pipe(
      tap(() => {
        this.loadLeads();
        this.logRepository.addLog(gymId, `Removed lead profile: ${leadName}`, 'plan-change').subscribe();
      })
    );
  }

  updateLeadStage(leadId: string, stage: Lead['status']): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const lead = this.leadsSubject.value.find(l => l.id === leadId);
    if (!lead) return of(undefined);

    const updatedLead: Lead = {
      ...lead,
      status: stage,
      lastFollowUp: new Date().toISOString().split('T')[0]
    };

    return this.leadRepository.updateLead(gymId, updatedLead).pipe(
      tap(() => {
        this.loadLeads();
        this.logRepository.addLog(gymId, `Moved lead ${lead.name} to stage: ${stage}`, 'plan-change').subscribe();
      })
    );
  }

  /**
   * Converts a Lead to a Member using an atomic Firestore WriteBatch.
   *
   * Step 1: Pre-fetches the membership plan price (single read).
   * Step 2: Builds LeadConversionPayload and calls leadRepository.convertLeadToMember().
   * Step 3: The repository executes a single WriteBatch — either ALL documents
   *         are written or NONE are. No partial state is possible.
   * Step 4: On success, refresh all affected state caches and log the activity.
   */
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
    const gymId = this.tenantContext.getTenantId();
    const branchId = this.tenantContext.getBranchId() || '';
    if (!gymId) throw new Error('No active tenant selected');

    const lead = this.leadsSubject.value.find(l => l.id === leadId);
    if (!lead) return of(undefined);

    const today = new Date().toISOString().split('T')[0];

    // Step 1: Pre-fetch membership plan price (single read before batch)
    return this.planRepository.getPlans(gymId).pipe(
      switchMap(plans => {
        const plan = plans.find(p => p.id === memberDetails.planId);
        const planPrice = plan?.price ?? 0;

        // Step 2: Build full atomic payload
        const payload: LeadConversionPayload = {
          lead,
          memberData: {
            ...memberDetails,
            gymId,
            branchId: memberDetails.branchId || branchId
          },
          membershipPlanPrice: planPrice,
          conversionDetails: {
            convertedBy: conversionDetails.convertedBy,
            revenueGenerated: conversionDetails.revenueGenerated,
            paymentStatus: conversionDetails.paymentStatus,
            paymentMethod: conversionDetails.paymentMethod,
            paidAmount: conversionDetails.paidAmount,
            interestedInPT: conversionDetails.interestedInPT === 'Yes',
            ptPlanId: conversionDetails.ptPlanId,
            ptPlanName: conversionDetails.ptPlanName,
            ptPlanPrice: conversionDetails.ptPlanPrice,
            ptPlanDuration: conversionDetails.ptPlanDuration,
            ptSessionsTotal: conversionDetails.ptSessionsTotal,
            preferredTrainerId: conversionDetails.preferredTrainerId,
            trainerName: conversionDetails.trainerName,
            ptGoal: conversionDetails.ptGoal,
            salespersonId: lead.assignedEmployee || lead.leadOwner || '',
            salespersonName: conversionDetails.convertedBy || lead.assignedEmployeeName || '',
            discountType: conversionDetails.discountType,
            discountValue: conversionDetails.discountValue,
            discountGivenBy: conversionDetails.convertedBy,
            discountDate: today
          },
          gymId,
          branchId: memberDetails.branchId || branchId,
          today
        };

        // Step 3: Execute atomic WriteBatch — all or nothing
        return this.leadRepository.convertLeadToMember(payload);
      }),
      tap(result => {
        // Step 4: Refresh all affected caches after successful batch commit
        this.loadLeads();
        this.memberState.loadMembers();
        this.paymentState.loadPayments();
        this.ptState.loadAll();
        this.financeState.loadFinanceData();

        // Audit log (non-critical, fire-and-forget is acceptable here)
        this.logRepository.addLog(
          gymId,
          `Lead ${lead.name} atomically converted to Member (ID: ${result.memberId}). Revenue: ₹${conversionDetails.revenueGenerated}. Converted by: ${conversionDetails.convertedBy}.`,
          'plan-change'
        ).subscribe();
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
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const leads = this.leadsSubject.value;
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return of(undefined);

    const followUpId = 'fup_' + Math.random().toString(36).substring(2, 9);
    const newItem = {
      ...item,
      id: followUpId
    };

    const history = lead.followUpHistory || [];
    const updatedLead: Lead = {
      ...lead,
      followUpHistory: [...history, newItem],
      lastFollowUp: item.date,
      nextFollowUp: item.nextFollowUpDate,
      followUpDate: item.nextFollowUpDate || lead.followUpDate
    };

    return this.leadRepository.updateLead(gymId, updatedLead).pipe(
      tap(() => {
        this.loadLeads();
        this.logRepository.addLog(
          gymId,
          `Logged follow-up interaction for lead: ${lead.name} by ${item.employeeName}`,
          'plan-change'
        ).subscribe();
      })
    );
  }
}

