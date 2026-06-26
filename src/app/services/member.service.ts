import { Injectable, Inject } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { switchMap, map, tap } from 'rxjs/operators';
import { 
  IMemberRepository, 
  MEMBER_REPOSITORY_TOKEN,
  IPaymentRepository,
  PAYMENT_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../core/interfaces/repository.interfaces';
import { Member } from '../core/models/member.entity';
import { TenantContextService } from '../domain/tenancy/tenant-context.service';
import { LeadConversionPayload } from '../core/models/lead.entity';
import { PagedRequest, PagedResponse } from '../core/models/pagination.contracts';

@Injectable({
  providedIn: 'root'
})
export class MemberService {
  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN) private memberRepository: IMemberRepository,
    @Inject(PAYMENT_REPOSITORY_TOKEN) private paymentRepository: IPaymentRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService
  ) {}

  getMembers(): Observable<Member[]> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.memberRepository.getMembers(gymId);
  }

  getMembersPaged(req: PagedRequest): Observable<PagedResponse<Member>> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.memberRepository.getMembersPaged(gymId, req);
  }

  getMemberById(id: string): Observable<Member | null> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.memberRepository.getMemberById(gymId, id);
  }

  addMember(member: Omit<Member, 'id' | 'attendanceCount' | 'balance' | 'gymId'>): Observable<Member> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.memberRepository.addMember(gymId, { ...member, gymId }).pipe(
      switchMap(newMember => {
        this.logRepository.addLog(gymId, `New member ${member.name} joined the club!`, 'join').subscribe();

        if (newMember.status !== 'inactive') {
          return this.paymentRepository.addPayment(gymId, {
            gymId,
            memberId: newMember.id,
            memberName: newMember.name,
            amount: newMember.balance,
            paidAmount: 0,
            dueAmount: newMember.balance,
            dueDate: new Date().toISOString().split('T')[0],
            date: new Date().toISOString().split('T')[0],
            status: 'pending',
            planName: newMember.planName
          }).pipe(
            map(() => newMember)
          );
        }
        return of(newMember);
      })
    );
  }

  updateMember(member: Member): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.memberRepository.updateMember(gymId, member).pipe(
      switchMap(() => {
        return this.logRepository.addLog(gymId, `Updated details for member: ${member.name}`, 'plan-change');
      }),
      map(() => undefined)
    );
  }

  deleteMember(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.memberRepository.getMemberById(gymId, id).pipe(
      switchMap(member => {
        const memberName = member ? member.name : 'Member';
        return this.memberRepository.deleteMember(gymId, id).pipe(
          switchMap(() => {
            return this.logRepository.addLog(gymId, `Removed member profile: ${memberName}`, 'plan-change');
          })
        );
      }),
      map(() => undefined)
    );
  }

  renewMembership(
    memberId: string,
    planId: string,
    planName: string,
    startDate: string,
    endDate: string,
    price: number,
    paidAmount: number,
    dueAmount: number,
    dueDate: string,
    paymentStatus: 'paid' | 'pending' | 'partially_paid' | 'overdue',
    paymentMethod: string = 'Cash',
    discountType: 'none' | 'flat' | 'percentage' = 'none',
    discountValue: number = 0,
    originalAmount: number = price
  ): Observable<any> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) return throwError(() => new Error('No active tenant selected'));

    return this.memberRepository.getMemberById(gymId, memberId).pipe(
      switchMap(member => {
        if (!member) return throwError(() => new Error('Member not found'));
        
        const updated: Member = {
          ...member,
          planId,
          planName,
          startDate,
          endDate,
          status: 'active',
          balance: dueAmount
        };

        return this.memberRepository.updateMember(gymId, updated).pipe(
          switchMap(() => {
            this.logRepository.addLog(gymId, `Renewed membership for ${member.name} (Plan: ${planName})`, 'plan-change').subscribe();

            return this.paymentRepository.addPayment(gymId, {
              gymId,
              memberId,
              memberName: member.name,
              amount: price,
              paidAmount,
              dueAmount,
              dueDate,
              date: new Date().toISOString().split('T')[0],
              status: paymentStatus as any,
              planName,
              paymentMethod,
              discountType: discountType as any,
              discountValue,
              originalAmount
            });
          })
        );
      })
    );
  }

  registerMember(payload: Omit<LeadConversionPayload, 'gymId' | 'branchId' | 'today'>): Observable<any> {
    const gymId = this.tenantContext.getTenantId();
    const branchId = this.tenantContext.getBranchId() || 'br-1';
    if (!gymId) throw new Error('No active tenant selected');

    const today = new Date().toISOString().split('T')[0];

    const fullPayload: LeadConversionPayload = {
      ...payload,
      gymId,
      branchId,
      today
    };

    return this.memberRepository.registerMember(fullPayload).pipe(
      switchMap(result => {
        return this.logRepository.addLog(gymId, `Registered new member: ${payload.memberData.name}`, 'join').pipe(
          map(() => result)
        );
      })
    );
  }
}
