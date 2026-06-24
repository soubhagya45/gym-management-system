import { Injectable, Inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';
import { 
  ILeadRepository, 
  LEAD_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN,
  IMembershipPlanRepository,
  MEMBERSHIP_PLAN_REPOSITORY_TOKEN
} from '../core/interfaces/repository.interfaces';
import { Lead, LeadConversionPayload, LeadConversionResult } from '../core/models/lead.entity';
import { TenantContextService } from '../domain/tenancy/tenant-context.service';
import { Member } from '../core/models/member.entity';

@Injectable({
  providedIn: 'root'
})
export class LeadService {
  constructor(
    @Inject(LEAD_REPOSITORY_TOKEN) private leadRepository: ILeadRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    @Inject(MEMBERSHIP_PLAN_REPOSITORY_TOKEN) private planRepository: IMembershipPlanRepository,
    private tenantContext: TenantContextService
  ) {}

  getLeads(): Observable<Lead[]> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.leadRepository.getLeads(gymId);
  }

  addLead(lead: Omit<Lead, 'id' | 'gymId'>): Observable<Lead> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const leadWithDefaults = {
      ...lead,
      createdAt: lead.createdAt || new Date().toISOString().split('T')[0]
    };

    return this.leadRepository.addLead(gymId, { ...leadWithDefaults, gymId }).pipe(
      switchMap(newLead => {
        return this.logRepository.addLog(gymId, `New trial lead registered: ${lead.name} via ${lead.leadSource}`, 'join').pipe(
          map(() => newLead)
        );
      })
    );
  }

  updateLead(lead: Lead): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.leadRepository.updateLead(gymId, lead).pipe(
      switchMap(() => {
        return this.logRepository.addLog(gymId, `Updated lead file for: ${lead.name}`, 'plan-change');
      }),
      map(() => undefined)
    );
  }

  deleteLead(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.leadRepository.deleteLead(gymId, id);
  }

  updateLeadStage(lead: Lead, stage: Lead['status']): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const updatedLead: Lead = {
      ...lead,
      status: stage,
      lastFollowUp: new Date().toISOString().split('T')[0]
    };

    return this.leadRepository.updateLead(gymId, updatedLead).pipe(
      switchMap(() => {
        return this.logRepository.addLog(gymId, `Moved lead ${lead.name} to stage: ${stage}`, 'plan-change');
      }),
      map(() => undefined)
    );
  }

  convertLeadToMember(
    lead: Lead,
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
  ): Observable<LeadConversionResult> {
    const gymId = this.tenantContext.getTenantId();
    const branchId = this.tenantContext.getBranchId() || '';
    if (!gymId) throw new Error('No active tenant selected');

    const today = new Date().toISOString().split('T')[0];

    return this.planRepository.getPlans(gymId).pipe(
      switchMap(plans => {
        const plan = plans.find(p => p.id === memberDetails.planId);
        const planPrice = plan?.price ?? 0;

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

        return this.leadRepository.convertLeadToMember(payload);
      }),
      switchMap(result => {
        return this.logRepository.addLog(
          gymId,
          `Lead ${lead.name} atomically converted to Member (ID: ${result.memberId}). Revenue: ₹${conversionDetails.revenueGenerated}. Converted by: ${conversionDetails.convertedBy}.`,
          'plan-change'
        ).pipe(
          map(() => result)
        );
      })
    );
  }

  logFollowUp(
    lead: Lead,
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
      switchMap(() => {
        return this.logRepository.addLog(
          gymId,
          `Logged follow-up interaction for lead: ${lead.name} by ${item.employeeName}`,
          'plan-change'
        );
      }),
      map(() => undefined)
    );
  }
}
