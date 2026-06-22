import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { switchMap, tap, take, map, catchError } from 'rxjs/operators';
import {
  IPersonalTrainingRepository,
  PERSONAL_TRAINING_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { PTPlan } from '../../core/models/pt-plan.entity';
import { PTSession } from '../../core/models/pt-session.entity';
import { TrainerAssignment } from '../../core/models/trainer-assignment.entity';
import { SessionHistory } from '../../core/models/session-history.entity';
import { TrainerRevenue } from '../../core/models/trainer-revenue.entity';
import { MemberPTPlan } from '../../core/models/member-pt-plan.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { PaymentState } from './payment.state';
import { MemberState } from './member.state';

@Injectable({
  providedIn: 'root'
})
export class PTState {
  private ptPlansSubject = new BehaviorSubject<PTPlan[]>([]);
  ptPlans$ = this.ptPlansSubject.asObservable();

  private ptSessionsSubject = new BehaviorSubject<PTSession[]>([]);
  ptSessions$ = this.ptSessionsSubject.asObservable();

  private trainerAssignmentsSubject = new BehaviorSubject<TrainerAssignment[]>([]);
  trainerAssignments$ = this.trainerAssignmentsSubject.asObservable();

  private sessionHistorySubject = new BehaviorSubject<SessionHistory[]>([]);
  sessionHistory$ = this.sessionHistorySubject.asObservable();

  private trainerRevenueSubject = new BehaviorSubject<TrainerRevenue[]>([]);
  trainerRevenue$ = this.trainerRevenueSubject.asObservable();

  private memberPTPlansSubject = new BehaviorSubject<MemberPTPlan[]>([]);
  memberPTPlans$ = this.memberPTPlansSubject.asObservable();

  constructor(
    @Inject(PERSONAL_TRAINING_REPOSITORY_TOKEN) private ptRepository: IPersonalTrainingRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService,
    private paymentState: PaymentState,
    private memberState: MemberState
  ) {
    combineLatest([
      this.tenantContext.activeGymId$,
      this.tenantContext.activeBranchId$
    ]).pipe(
      switchMap(([gymId, branchId]) => {
        if (!gymId) return of(null);
        return combineLatest([
          this.ptRepository.getPTPlans(gymId).pipe(
            catchError(err => {
              console.error('Error fetching PT plans:', err);
              return of([]);
            })
          ),
          this.ptRepository.getPTSessions(gymId).pipe(
            catchError(err => {
              console.error('Error fetching PT sessions:', err);
              return of([]);
            })
          ),
          this.ptRepository.getTrainerAssignments(gymId).pipe(
            catchError(err => {
              console.error('Error fetching trainer assignments:', err);
              return of([]);
            })
          ),
          this.ptRepository.getSessionHistory(gymId).pipe(
            catchError(err => {
              console.error('Error fetching session history:', err);
              return of([]);
            })
          ),
          this.ptRepository.getTrainerRevenue(gymId).pipe(
            catchError(err => {
              console.error('Error fetching trainer revenue:', err);
              return of([]);
            })
          ),
          this.ptRepository.getMemberPTPlans(gymId).pipe(
            catchError(err => {
              console.error('Error fetching member PT plans:', err);
              return of([]);
            })
          )
        ]);
      })
    ).subscribe(data => {
      if (data) {
        const [plans, sessions, assignments, history, revenue, memberPlans] = data;
        this.ptPlansSubject.next(plans);
        this.ptSessionsSubject.next(sessions);
        this.trainerAssignmentsSubject.next(assignments);
        this.sessionHistorySubject.next(history);
        this.trainerRevenueSubject.next(revenue);
        this.memberPTPlansSubject.next(memberPlans);
      } else {
        this.ptPlansSubject.next([]);
        this.ptSessionsSubject.next([]);
        this.trainerAssignmentsSubject.next([]);
        this.sessionHistorySubject.next([]);
        this.trainerRevenueSubject.next([]);
        this.memberPTPlansSubject.next([]);
      }
    });
  }

  loadAll(): void {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) return;

    this.ptRepository.getPTPlans(gymId).subscribe(plans => this.ptPlansSubject.next(plans));
    this.ptRepository.getPTSessions(gymId).subscribe(sessions => this.ptSessionsSubject.next(sessions));
    this.ptRepository.getTrainerAssignments(gymId).subscribe(assignments => this.trainerAssignmentsSubject.next(assignments));
    this.ptRepository.getSessionHistory(gymId).subscribe(history => this.sessionHistorySubject.next(history));
    this.ptRepository.getTrainerRevenue(gymId).subscribe(revenue => this.trainerRevenueSubject.next(revenue));
    this.ptRepository.getMemberPTPlans(gymId).subscribe(memberPlans => this.memberPTPlansSubject.next(memberPlans));
  }

  // PT Plans
  addPTPlan(plan: Omit<PTPlan, 'id' | 'gymId' | 'branchId'>): Observable<PTPlan> {
    const gymId = this.tenantContext.getTenantId();
    const branchId = this.tenantContext.getBranchId() || 'br-1';
    if (!gymId) throw new Error('No active tenant selected');

    return this.ptRepository.addPTPlan(gymId, { ...plan, gymId, branchId }).pipe(
      tap(() => {
        this.loadAll();
        this.logRepository.addLog(gymId, `Created PT plan package: ${plan.name}`, 'plan-change').subscribe();
      })
    );
  }

  updatePTPlan(plan: PTPlan): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.ptRepository.updatePTPlan(gymId, plan).pipe(
      tap(() => {
        this.loadAll();
        this.logRepository.addLog(gymId, `Updated PT plan details: ${plan.name}`, 'plan-change').subscribe();
      })
    );
  }

  deletePTPlan(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const name = this.ptPlansSubject.value.find(p => p.id === id)?.name || 'PT Package';

    return this.ptRepository.deletePTPlan(gymId, id).pipe(
      tap(() => {
        this.loadAll();
        this.logRepository.addLog(gymId, `Deleted PT plan package: ${name}`, 'plan-change').subscribe();
      })
    );
  }

  // PT Sessions
  addPTSession(session: Omit<PTSession, 'id' | 'gymId' | 'branchId'>): Observable<PTSession> {
    const gymId = this.tenantContext.getTenantId();
    const branchId = this.tenantContext.getBranchId() || 'br-1';
    if (!gymId) throw new Error('No active tenant selected');

    return this.ptRepository.addPTSession(gymId, { ...session, gymId, branchId }).pipe(
      tap(() => {
        this.loadAll();
        this.logRepository.addLog(gymId, `Scheduled PT session for ${session.memberName} with trainer ${session.trainerName}`, 'attendance').subscribe();
      })
    );
  }

  updatePTSession(session: PTSession): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.ptRepository.updatePTSession(gymId, session).pipe(
      tap(() => {
        this.loadAll();
        this.logRepository.addLog(gymId, `Updated PT session details/status for ${session.memberName}`, 'attendance').subscribe();
        this.memberState.loadMembers();
      })
    );
  }

  completePTSession(session: PTSession, notes?: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const updatedSession: PTSession = {
      ...session,
      status: 'completed',
      attendanceStatus: 'present',
      notes: notes || session.notes
    };

    const auditObs = this.ptRepository.addSessionHistory(gymId, {
      gymId,
      branchId: session.branchId,
      sessionId: session.id,
      memberId: session.memberId,
      trainerId: session.trainerId,
      action: 'complete',
      timestamp: new Date().toISOString(),
      performedBy: session.trainerName,
      notes: notes || 'Session marked as completed'
    });

    // Find member's active PT wallet
    const walletObs = this.ptRepository.getMemberPTPlans(gymId).pipe(
      take(1),
      switchMap(wallets => {
        const wallet = wallets.find(w => w.memberId === session.memberId && w.status === 'active');
        if (wallet) {
          const completed = wallet.completedSessions + 1;
          const remaining = Math.max(0, wallet.totalSessions - completed);
          const status = remaining === 0 ? 'completed' : 'active';
          
          const updatedWallet: MemberPTPlan = {
            ...wallet,
            completedSessions: completed,
            remainingSessions: remaining,
            status
          };

          return combineLatest([
            this.ptRepository.updateMemberPTPlan(gymId, updatedWallet),
            this.memberState.getMemberById(session.memberId).pipe(
              take(1),
              switchMap(m => {
                if (m) {
                  return this.memberState.updateMember({
                    ...m,
                    ptSessionsCompleted: completed,
                    ptSessionsRemaining: remaining
                  });
                }
                return of(null);
              })
            )
          ]);
        }
        return of(null);
      })
    );

    return combineLatest([
      this.ptRepository.updatePTSession(gymId, updatedSession),
      auditObs,
      walletObs
    ]).pipe(
      tap(() => {
        this.loadAll();
        this.logRepository.addLog(gymId, `PT session for ${session.memberName} marked as completed (Trainer: ${session.trainerName})`, 'attendance').subscribe();
      }),
      map(() => undefined)
    );
  }

  cancelPTSession(session: PTSession, notes?: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const updatedSession: PTSession = {
      ...session,
      status: 'cancelled',
      attendanceStatus: 'absent',
      notes: notes || session.notes
    };

    const auditObs = this.ptRepository.addSessionHistory(gymId, {
      gymId,
      branchId: session.branchId,
      sessionId: session.id,
      memberId: session.memberId,
      trainerId: session.trainerId,
      action: 'cancel',
      timestamp: new Date().toISOString(),
      performedBy: session.trainerName,
      notes: notes || 'Session marked as cancelled'
    });

    return combineLatest([
      this.ptRepository.updatePTSession(gymId, updatedSession),
      auditObs
    ]).pipe(
      tap(() => {
        this.loadAll();
        this.logRepository.addLog(gymId, `PT session for ${session.memberName} was cancelled (Trainer: ${session.trainerName})`, 'attendance').subscribe();
      }),
      map(() => undefined)
    );
  }

  reschedulePTSession(session: PTSession, date: string, time: string, notes?: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const updatedSession: PTSession = {
      ...session,
      status: 'rescheduled',
      date,
      time,
      notes: notes || session.notes
    };

    const auditObs = this.ptRepository.addSessionHistory(gymId, {
      gymId,
      branchId: session.branchId,
      sessionId: session.id,
      memberId: session.memberId,
      trainerId: session.trainerId,
      action: 'reschedule',
      timestamp: new Date().toISOString(),
      performedBy: session.trainerName,
      notes: notes || `Rescheduled to ${date} at ${time}`
    });

    return combineLatest([
      this.ptRepository.updatePTSession(gymId, updatedSession),
      auditObs
    ]).pipe(
      tap(() => {
        this.loadAll();
        this.logRepository.addLog(gymId, `PT session for ${session.memberName} rescheduled to ${date} ${time}`, 'attendance').subscribe();
      }),
      map(() => undefined)
    );
  }

  deletePTSession(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.ptRepository.deletePTSession(gymId, id).pipe(
      tap(() => this.loadAll())
    );
  }

  // Member PT Wallet operations
  addMemberPTPlan(
    memberPlan: Omit<MemberPTPlan, 'id' | 'gymId' | 'branchId'>,
    paymentStatus: 'paid' | 'partially_paid' | 'pending' | 'overdue',
    paymentMethod: string,
    paidAmount?: number,
    dueAmount?: number,
    discountType?: 'flat' | 'percentage' | 'none',
    discountValue?: number,
    originalAmount?: number
  ): Observable<MemberPTPlan> {
    const gymId = this.tenantContext.getTenantId();
    const branchId = this.tenantContext.getBranchId() || 'br-1';
    if (!gymId) throw new Error('No active tenant selected');

    const newPlanWithTenant = {
      ...memberPlan,
      gymId,
      branchId
    };

    return this.ptRepository.addMemberPTPlan(gymId, newPlanWithTenant).pipe(
      tap((newMP) => {
        this.loadAll();
        
        // Auto-assign trainer and goals in member object
        this.memberState.members$.pipe(take(1)).subscribe(members => {
          const member = members.find(m => m.id === memberPlan.memberId);
          if (member) {
            this.memberState.updateMember({
              ...member,
              ptPlanId: newMP.planId,
              ptPlanName: newMP.planName,
              trainerId: newMP.trainerId,
              trainerName: newMP.trainerName,
              ptGoal: newMP.ptGoal,
              ptStartDate: newMP.startDate,
              ptEndDate: newMP.endDate,
              ptSessionsTotal: newMP.totalSessions,
              ptSessionsCompleted: newMP.completedSessions,
              ptSessionsRemaining: newMP.remainingSessions
            }).subscribe();
          }
        });

        // Save assignments
        this.ptRepository.addTrainerAssignment(gymId, {
          gymId,
          branchId,
          memberId: memberPlan.memberId,
          memberName: memberPlan.memberName,
          trainerId: memberPlan.trainerId,
          trainerName: memberPlan.trainerName,
          assignedDate: memberPlan.startDate,
          status: 'active',
          ptGoal: memberPlan.ptGoal
        }).subscribe();

        // Create Payment Ledger entry
        this.paymentState.addPayment({
          memberId: memberPlan.memberId,
          memberName: memberPlan.memberName,
          amount: originalAmount !== undefined ? originalAmount : memberPlan.price,
          paidAmount: paidAmount !== undefined ? paidAmount : (paymentStatus === 'paid' ? memberPlan.price : 0),
          dueAmount: dueAmount !== undefined ? dueAmount : (paymentStatus === 'paid' ? 0 : memberPlan.price),
          dueDate: memberPlan.startDate,
          date: new Date().toISOString().split('T')[0],
          status: paymentStatus,
          planName: memberPlan.planName,
          paymentMethod: paymentMethod,
          type: 'pt',
          trainerId: memberPlan.trainerId,
          trainerName: memberPlan.trainerName,
          originalAmount: originalAmount !== undefined ? originalAmount : memberPlan.price,
          discountType: discountType,
          discountValue: discountValue,
          finalAmount: memberPlan.price
        }).subscribe(newPayment => {
          const actualPaid = paidAmount !== undefined ? paidAmount : (paymentStatus === 'paid' ? memberPlan.price : 0);
          if (actualPaid > 0) {
            this.ptRepository.addTrainerRevenue(gymId, {
              gymId,
              branchId,
              trainerId: memberPlan.trainerId,
              trainerName: memberPlan.trainerName,
              memberId: memberPlan.memberId,
              memberName: memberPlan.memberName,
              amount: actualPaid,
              date: new Date().toISOString().split('T')[0],
              invoiceId: newPayment.id,
              ptPlanName: memberPlan.planName,
              salespersonId: (memberPlan as any).salespersonId || '',
              salespersonName: (memberPlan as any).salespersonName || ''
            }).subscribe();
          }
        });

        this.logRepository.addLog(gymId, `Assigned PT plan ${memberPlan.planName} to member ${memberPlan.memberName} with trainer ${memberPlan.trainerName}`, 'join').subscribe();
      })
    );
  }

  // Change Trainer (Transfer Trainer)
  transferTrainer(memberPTPlanId: string, newTrainerId: string, newTrainerName: string, notes?: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.ptRepository.getMemberPTPlans(gymId).pipe(
      take(1),
      switchMap(plans => {
        const wallet = plans.find(p => p.id === memberPTPlanId);
        if (!wallet) throw new Error('Wallet not found');

        const oldTrainerId = wallet.trainerId;
        const oldTrainerName = wallet.trainerName;
        const date = new Date().toISOString().split('T')[0];

        const updatedWallet: MemberPTPlan = {
          ...wallet,
          trainerId: newTrainerId,
          trainerName: newTrainerName,
          history: [
            ...(wallet.history || []),
            {
              action: 'transfer_trainer',
              date,
              trainerId: newTrainerId,
              trainerName: newTrainerName,
              notes: notes || `Transferred from ${oldTrainerName} to ${newTrainerName}`
            }
          ]
        };

        return combineLatest([
          this.ptRepository.updateMemberPTPlan(gymId, updatedWallet),
          this.ptRepository.addTrainerAssignment(gymId, {
            gymId,
            branchId: wallet.branchId,
            memberId: wallet.memberId,
            memberName: wallet.memberName,
            trainerId: newTrainerId,
            trainerName: newTrainerName,
            assignedDate: date,
            status: 'active',
            ptGoal: wallet.ptGoal,
            notes: `Transferred from ${oldTrainerName}`
          })
        ]).pipe(
          tap(() => {
            this.memberState.members$.pipe(take(1)).subscribe(members => {
              const m = members.find(mem => mem.id === wallet.memberId);
              if (m) {
                this.memberState.updateMember({
                  ...m,
                  trainerId: newTrainerId,
                  trainerName: newTrainerName
                }).subscribe();
              }
            });

            this.loadAll();
            this.logRepository.addLog(gymId, `Transferred member ${wallet.memberName} from trainer ${oldTrainerName} to trainer ${newTrainerName}`, 'plan-change').subscribe();
          }),
          map(() => undefined)
        );
      })
    );
  }

  // Add extra sessions
  addExtraSessions(
    memberPTPlanId: string,
    additionalSessions: number,
    price: number,
    paymentMethod: string,
    paidAmount?: number,
    dueAmount?: number,
    discountType?: 'flat' | 'percentage' | 'none',
    discountValue?: number,
    originalAmount?: number,
    paymentStatus?: 'paid' | 'partially_paid' | 'pending' | 'overdue'
  ): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.ptRepository.getMemberPTPlans(gymId).pipe(
      take(1),
      switchMap(plans => {
        const wallet = plans.find(p => p.id === memberPTPlanId);
        if (!wallet) throw new Error('Wallet not found');

        const date = new Date().toISOString().split('T')[0];
        const newTotal = wallet.totalSessions + additionalSessions;
        const newRemaining = wallet.remainingSessions + additionalSessions;

        const updatedWallet: MemberPTPlan = {
          ...wallet,
          totalSessions: newTotal,
          remainingSessions: newRemaining,
          status: 'active',
          history: [
            ...(wallet.history || []),
            {
              action: 'add_sessions',
              date,
              sessionsAdded: additionalSessions,
              notes: `Purchased ${additionalSessions} extra sessions for ₹${price}`
            }
          ]
        };

        return combineLatest([
          this.ptRepository.updateMemberPTPlan(gymId, updatedWallet),
          this.paymentState.addPayment({
            memberId: wallet.memberId,
            memberName: wallet.memberName,
            amount: originalAmount !== undefined ? originalAmount : price,
            paidAmount: paidAmount !== undefined ? paidAmount : price,
            dueAmount: dueAmount !== undefined ? dueAmount : 0,
            dueDate: date,
            date,
            status: paymentStatus as any || 'paid',
            planName: `Extra Sessions (${additionalSessions})`,
            paymentMethod,
            type: 'pt',
            trainerId: wallet.trainerId,
            trainerName: wallet.trainerName,
            originalAmount: originalAmount !== undefined ? originalAmount : price,
            discountType: discountType,
            discountValue: discountValue,
            finalAmount: price
          })
        ]).pipe(
          switchMap(([_, newPayment]) => {
            const actualPaid = paidAmount !== undefined ? paidAmount : price;
            if (actualPaid > 0) {
              return this.ptRepository.addTrainerRevenue(gymId, {
                gymId,
                branchId: wallet.branchId,
                trainerId: wallet.trainerId,
                trainerName: wallet.trainerName,
                memberId: wallet.memberId,
                memberName: wallet.memberName,
                amount: actualPaid,
                date,
                invoiceId: newPayment.id,
                ptPlanName: `Extra Sessions (${additionalSessions})`
              });
            }
            return of(undefined);
          }),
          tap(() => {
            this.memberState.members$.pipe(take(1)).subscribe(members => {
              const m = members.find(mem => mem.id === wallet.memberId);
              if (m) {
                this.memberState.updateMember({
                  ...m,
                  ptSessionsTotal: newTotal,
                  ptSessionsRemaining: newRemaining
                }).subscribe();
              }
            });

            this.loadAll();
            this.logRepository.addLog(gymId, `Added ${additionalSessions} extra sessions to member ${wallet.memberName} wallet (Trainer: ${wallet.trainerName})`, 'payment').subscribe();
          }),
          map(() => undefined)
        );
      })
    );
  }

  // Upgrade Plan
  upgradePTPlan(
    memberPTPlanId: string,
    newPlanId: string,
    newPlanName: string,
    priceDifference: number,
    paymentMethod: string,
    paidAmount?: number,
    dueAmount?: number,
    discountType?: 'flat' | 'percentage' | 'none',
    discountValue?: number,
    originalAmount?: number,
    paymentStatus?: 'paid' | 'partially_paid' | 'pending' | 'overdue'
  ): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return combineLatest([
      this.ptPlansSubject,
      this.ptRepository.getMemberPTPlans(gymId)
    ]).pipe(
      take(1),
      switchMap(([ptPlans, wallets]) => {
        const wallet = wallets.find(p => p.id === memberPTPlanId);
        if (!wallet) throw new Error('Wallet not found');

        const newPlan = ptPlans.find(p => p.id === newPlanId);
        if (!newPlan) throw new Error('New PT Plan not found');

        const date = new Date().toISOString().split('T')[0];
        const newTotal = newPlan.numberOfSessions;
        const newRemaining = Math.max(0, newTotal - wallet.completedSessions);
        const newStatus = newRemaining === 0 ? 'completed' : 'active';

        const upgradedEndDate = this.addMonths(date, newPlan.duration);

        const updatedWallet: MemberPTPlan = {
          ...wallet,
          planId: newPlanId,
          planName: newPlanName,
          price: newPlan.price,
          totalSessions: newTotal,
          remainingSessions: newRemaining,
          endDate: upgradedEndDate,
          status: newStatus,
          history: [
            ...(wallet.history || []),
            {
              action: 'upgrade_plan',
              date,
              planId: newPlanId,
              planName: newPlanName,
              notes: `Upgraded to ${newPlanName}. Price difference paid: ₹${priceDifference}`
            }
          ]
        };

        const paymentObs = priceDifference > 0 ? this.paymentState.addPayment({
          memberId: wallet.memberId,
          memberName: wallet.memberName,
          amount: originalAmount !== undefined ? originalAmount : priceDifference,
          paidAmount: paidAmount !== undefined ? paidAmount : priceDifference,
          dueAmount: dueAmount !== undefined ? dueAmount : 0,
          dueDate: date,
          date,
          status: paymentStatus as any || 'paid',
          planName: `PT Upgrade: ${newPlanName}`,
          paymentMethod,
          type: 'pt',
          trainerId: wallet.trainerId,
          trainerName: wallet.trainerName,
          originalAmount: originalAmount !== undefined ? originalAmount : priceDifference,
          discountType: discountType,
          discountValue: discountValue,
          finalAmount: priceDifference
        }) : of(null);

        return combineLatest([
          this.ptRepository.updateMemberPTPlan(gymId, updatedWallet),
          paymentObs
        ]).pipe(
          switchMap(([_, newPayment]) => {
            const actualPaid = paidAmount !== undefined ? paidAmount : priceDifference;
            if (newPayment && actualPaid > 0) {
              return this.ptRepository.addTrainerRevenue(gymId, {
                gymId,
                branchId: wallet.branchId,
                trainerId: wallet.trainerId,
                trainerName: wallet.trainerName,
                memberId: wallet.memberId,
                memberName: wallet.memberName,
                amount: actualPaid,
                date,
                invoiceId: newPayment.id,
                ptPlanName: `PT Upgrade: ${newPlanName}`
              });
            }
            return of(null);
          }),
          tap(() => {
            this.memberState.members$.pipe(take(1)).subscribe(members => {
              const m = members.find(mem => mem.id === wallet.memberId);
              if (m) {
                this.memberState.updateMember({
                  ...m,
                  ptPlanId: newPlanId,
                  ptPlanName: newPlanName,
                  ptSessionsTotal: newTotal,
                  ptSessionsRemaining: newRemaining,
                  ptEndDate: upgradedEndDate
                }).subscribe();
              }
            });

            this.loadAll();
            this.logRepository.addLog(gymId, `Upgraded member ${wallet.memberName} to PT package ${newPlanName} (Trainer: ${wallet.trainerName})`, 'plan-change').subscribe();
          }),
          map(() => undefined)
        );
      })
    );
  }

  private addMonths(dateStr: string, months: number): string {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  }
}
