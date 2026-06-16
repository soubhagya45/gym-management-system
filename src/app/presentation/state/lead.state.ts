import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, tap, take } from 'rxjs/operators';
import {
  ILeadRepository,
  LEAD_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { Lead } from '../../core/models/lead.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { MemberState } from './member.state';
import { Member } from '../../core/models/member.entity';
import { PaymentState } from './payment.state';

@Injectable({
  providedIn: 'root'
})
export class LeadState {
  private leadsSubject = new BehaviorSubject<Lead[]>([]);
  leads$ = this.leadsSubject.asObservable();

  constructor(
    @Inject(LEAD_REPOSITORY_TOKEN) private leadRepository: ILeadRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService,
    private memberState: MemberState,
    private paymentState: PaymentState
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

  convertLeadToMember(
    leadId: string,
    memberDetails: Omit<Member, 'id' | 'attendanceCount' | 'balance' | 'gymId'>,
    conversionDetails: {
      convertedBy: string;
      revenueGenerated: number;
      commissionPercent?: number;
      paymentStatus: 'paid' | 'pending';
      paymentMethod: string;
      paidAmount: number;
    }
  ): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.memberState.addMember(memberDetails).pipe(
      switchMap((newMember) => {
        const lead = this.leadsSubject.value.find(l => l.id === leadId);
        if (lead) {
          const commissionPercent = 10; // Standard automatic commission of 10%
          const commissionEarned = Math.round((conversionDetails.revenueGenerated * commissionPercent / 100) * 100) / 100;

          const updatedLead: Lead = {
            ...lead,
            status: 'Converted' as const,
            convertedBy: conversionDetails.convertedBy,
            revenueGenerated: conversionDetails.revenueGenerated,
            commissionPercent: commissionPercent,
            commissionEarned: commissionEarned,
            nextFollowUp: undefined // Clear follow-ups
          };

          return this.leadRepository.updateLead(gymId, updatedLead).pipe(
            tap(() => {
              this.loadLeads();
              this.logRepository.addLog(
                gymId,
                `Lead ${lead.name} converted to Member! Converted by ${conversionDetails.convertedBy}. Revenue: ₹${conversionDetails.revenueGenerated}.`,
                'plan-change'
              ).subscribe();

              if (conversionDetails.paymentStatus === 'paid') {
                // Give state and repository a brief tick to register the payment record, then confirm it
                setTimeout(() => {
                  this.paymentState.payments$.pipe(take(1)).subscribe(payments => {
                    const pendingPay = payments.find(p => p.memberId === newMember.id && p.status === 'pending');
                    if (pendingPay) {
                      pendingPay.paymentMethod = conversionDetails.paymentMethod;
                      pendingPay.collectedBy = conversionDetails.convertedBy;
                      this.paymentState.confirmPayment(pendingPay.id).subscribe();
                    }
                  });
                }, 500);
              }
            })
          );
        }
        return of(undefined);
      })
    );
  }
}
