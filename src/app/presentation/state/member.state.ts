import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { Member } from '../../core/models/member.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { PaymentState } from './payment.state';
import { FinanceState } from './finance.state';
import { PTState } from './pt.state';
import { MemberService } from '../../services/member.service';
import { LeadConversionPayload } from '../../core/models/lead.entity';

@Injectable({
  providedIn: 'root'
})
export class MemberState {
  private membersSubject = new BehaviorSubject<Member[]>([]);
  members$ = this.membersSubject.asObservable();

  constructor(
    private memberService: MemberService,
    private tenantContext: TenantContextService,
    private paymentState: PaymentState,
    private financeState: FinanceState,
    private injector: Injector
  ) {
    combineLatest([
      this.tenantContext.activeGymId$,
      this.tenantContext.activeBranchId$
    ]).pipe(
      switchMap(([gymId, branchId]) => {
        if (!gymId) return of([]);
        return this.memberService.getMembers().pipe(
          catchError(err => {
            console.error('Error fetching members:', err);
            return of([]);
          })
        );
      })
    ).subscribe(members => {
      this.membersSubject.next(members);
    });
  }

  loadMembers(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.memberService.getMembers().subscribe(members => {
        this.membersSubject.next(members);
      });
    }
  }

  getMemberById(id: string): Observable<Member | null> {
    return this.memberService.getMemberById(id);
  }

  addMember(member: Omit<Member, 'id' | 'attendanceCount' | 'balance' | 'gymId'>): Observable<Member> {
    return this.memberService.addMember(member).pipe(
      tap(() => {
        this.loadMembers();
        this.paymentState.loadPayments();
        this.financeState.loadFinanceData();
      })
    );
  }

  updateMember(member: Member): Observable<void> {
    return this.memberService.updateMember(member).pipe(
      tap(() => {
        this.loadMembers();
      })
    );
  }

  deleteMember(id: string): Observable<void> {
    return this.memberService.deleteMember(id).pipe(
      tap(() => {
        this.loadMembers();
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
    paymentStatus: 'paid' | 'pending' | 'partially_paid' | 'overdue',
    paymentMethod: string = 'Cash',
    discountType: 'none' | 'flat' | 'percentage' = 'none',
    discountValue: number = 0,
    originalAmount: number = price
  ): Observable<any> {
    return this.memberService.renewMembership(
      memberId,
      planId,
      planName,
      startDate,
      endDate,
      price,
      paidAmount,
      dueAmount,
      dueDate,
      paymentStatus,
      paymentMethod,
      discountType,
      discountValue,
      originalAmount
    ).pipe(
      tap(() => {
        this.loadMembers();
        this.paymentState.loadPayments();
        this.financeState.loadFinanceData();
      })
    );
  }

  registerMember(payload: Omit<LeadConversionPayload, 'gymId' | 'branchId' | 'today'>): Observable<any> {
    return this.memberService.registerMember(payload).pipe(
      tap(() => {
        this.loadMembers();
        this.paymentState.loadPayments();
        this.financeState.loadFinanceData();
        
        try {
          const ptState = this.injector.get(PTState);
          ptState.loadAll();
        } catch (e) {
          console.error('Failed to reload PTState:', e);
        }
      })
    );
  }
}
