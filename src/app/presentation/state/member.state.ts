import { Injectable, Inject, Injector } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import {
  IMemberRepository,
  MEMBER_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN,
  IPaymentRepository,
  PAYMENT_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { Member } from '../../core/models/member.entity';
import { LeadConversionPayload } from '../../core/models/lead.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { PaymentState } from './payment.state';
import { FinanceState } from './finance.state';
import { PTState } from './pt.state';

@Injectable({
  providedIn: 'root'
})
export class MemberState {
  private membersSubject = new BehaviorSubject<Member[]>([]);
  members$ = this.membersSubject.asObservable();

  constructor(
    @Inject(MEMBER_REPOSITORY_TOKEN) private memberRepository: IMemberRepository,
    @Inject(PAYMENT_REPOSITORY_TOKEN) private paymentRepository: IPaymentRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService,
    private paymentState: PaymentState,
    private financeState: FinanceState,
    private injector: Injector
  ) {
    this.tenantContext.activeGymId$.pipe(
      switchMap(gymId => {
        if (!gymId) return of([]);
        return this.memberRepository.getMembers(gymId);
      })
    ).subscribe(members => {
      this.membersSubject.next(members);
    });
  }

  loadMembers(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.memberRepository.getMembers(gymId).subscribe(members => {
        this.membersSubject.next(members);
      });
    }
  }

  getMemberById(id: string): Observable<Member | null> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) return of(null);
    return this.memberRepository.getMemberById(gymId, id);
  }

  addMember(member: Omit<Member, 'id' | 'attendanceCount' | 'balance' | 'gymId'>): Observable<Member> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.memberRepository.addMember(gymId, { ...member, gymId }).pipe(
      tap((newMember) => {
        this.loadMembers();
        this.logRepository.addLog(gymId, `New member ${member.name} joined the club!`, 'join').subscribe();

        // Auto-create payment invoice for non-inactive members
        if (newMember.status !== 'inactive') {
          this.paymentRepository.addPayment(gymId, {
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
          }).subscribe(() => {
            this.paymentState.loadPayments();
            this.financeState.loadFinanceData();
          });
        }
      })
    );
  }

  updateMember(member: Member): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.memberRepository.updateMember(gymId, member).pipe(
      tap(() => {
        this.loadMembers();
        this.logRepository.addLog(gymId, `Updated details for member: ${member.name}`, 'plan-change').subscribe();
      })
    );
  }

  deleteMember(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const memberName = this.membersSubject.value.find(m => m.id === id)?.name || 'Member';

    return this.memberRepository.deleteMember(gymId, id).pipe(
      tap(() => {
        this.loadMembers();
        this.logRepository.addLog(gymId, `Removed member profile: ${memberName}`, 'plan-change').subscribe();
      })
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
    paymentStatus: 'paid' | 'pending'
  ): void {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) return;

    this.getMemberById(memberId).subscribe(member => {
      if (member) {
        const updated: Member = {
          ...member,
          planId,
          planName,
          startDate,
          endDate,
          status: 'active',
          balance: dueAmount
        };

        this.memberRepository.updateMember(gymId, updated).subscribe(() => {
          this.loadMembers();
          this.logRepository.addLog(gymId, `Renewed membership for ${member.name} (Plan: ${planName})`, 'plan-change').subscribe();
        });

        this.paymentRepository.addPayment(gymId, {
          gymId,
          memberId,
          memberName: member.name,
          amount: price,
          paidAmount,
          dueAmount,
          dueDate,
          date: new Date().toISOString().split('T')[0],
          status: paymentStatus,
          planName
        }).subscribe(() => {
          this.paymentState.loadPayments();
          this.financeState.loadFinanceData();
        });
      }
    });
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
      tap(() => {
        this.loadMembers();
        this.paymentState.loadPayments();
        this.financeState.loadFinanceData();
        
        // Dynamic load PTState to avoid circular import constructor issues
        try {
          const ptState = this.injector.get(PTState);
          ptState.loadAll();
        } catch (e) {
          console.error('Failed to reload PTState:', e);
        }
        
        this.logRepository.addLog(gymId, `Registered new member: ${payload.memberData.name}`, 'join').subscribe();
      })
    );
  }
}
