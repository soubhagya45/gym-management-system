import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
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
    private memberState: MemberState
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

    return this.leadRepository.addLead(gymId, { ...lead, gymId }).pipe(
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

  convertLeadToMember(leadId: string, memberDetails: Omit<Member, 'id' | 'attendanceCount' | 'balance' | 'gymId'>): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.memberState.addMember(memberDetails).pipe(
      switchMap(() => {
        const lead = this.leadsSubject.value.find(l => l.id === leadId);
        if (lead) {
          const updatedLead = { ...lead, status: 'Converted' as const };
          return this.leadRepository.updateLead(gymId, updatedLead).pipe(
            tap(() => {
              this.loadLeads();
              this.logRepository.addLog(gymId, `Lead ${lead.name} converted to Member!`, 'plan-change').subscribe();
            })
          );
        }
        return of(undefined);
      })
    );
  }
}
