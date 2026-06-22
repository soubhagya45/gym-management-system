import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { Member } from '../../core/models/member.entity';
import { Attendance } from '../../core/models/attendance.entity';
import { ActivityLog } from '../../core/models/activity-log.entity';
import { Payment } from '../../core/models/payment.entity';
import { Lead } from '../../core/models/lead.entity';
import { WhatsAppReminder } from '../../core/models/whatsapp-reminder.entity';

import { MemberState } from '../../presentation/state/member.state';
import { PaymentState } from '../../presentation/state/payment.state';
import { LeadState } from '../../presentation/state/lead.state';
import { AttendanceState } from '../../presentation/state/attendance.state';
import { ActivityLogState } from '../../presentation/state/activity-log.state';
import { MembershipPlanState } from '../../presentation/state/membership-plan.state';
import { WhatsAppState } from '../../presentation/state/whatsapp.state';

import { GymState } from '../../presentation/state/gym.state';
import { TrainerState } from '../../presentation/state/trainer.state';
import { AuthState } from '../../presentation/state/auth.state';
import { PTState } from '../../presentation/state/pt.state';
import { UserRole } from '../../core/enums/roles.enum';
import { SubscriptionService } from '../../domain/subscription/subscription.service';
import { SubscriptionStatus } from '../../core/models/subscription.model';
import { RenewDialogComponent } from '../payments/renew-dialog.component';
import { Observable, combineLatest, of } from 'rxjs';
import { map, take, switchMap } from 'rxjs/operators';
import { SubmissionGuardService } from '../../services/submission-guard.service';
import { AttendanceSyncService } from '../../services/attendance-sync.service';
import { DeviceConfiguration } from '../../core/models/device-configuration.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    MatTabsModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats$: Observable<any> | undefined;
  todayAttendance$: Observable<Attendance[]> | undefined;
  recentLogs$: Observable<ActivityLog[]> | undefined;
  
  attendanceSummary$: Observable<{ present: number; total: number; percentage: number }> | undefined;
  
  expiringMembers$: Observable<Member[]> | undefined;
  pendingPayments$: Observable<Payment[]> | undefined;
  newMembers$: Observable<Member[]> | undefined;
  leadFollowUps$: Observable<Lead[]> | undefined;
  planDistribution$: Observable<any[]> | undefined;

  // Trainer Dashboard Observables
  currentUser$: Observable<any> | undefined;
  isTrainer$: Observable<boolean> | undefined;
  trainerStats$: Observable<any> | undefined;
  trainerSessionsToday$: Observable<any[]> | undefined;
  trainerClients$: Observable<any[]> | undefined;
  ptKPIs$: Observable<any> | undefined;

  // New Widgets Observables
  paymentsDueToday$: Observable<Payment[]> | undefined;
  overduePaymentsList$: Observable<Payment[]> | undefined;
  renewalsThisWeek$: Observable<Member[]> | undefined;
  upcomingReminders$: Observable<WhatsAppReminder[]> | undefined;
  canAccessAnalytics$: Observable<boolean>;

  // Attendance Devices Widgets
  attendanceDevices$: Observable<DeviceConfiguration[]> | undefined;
  deviceStats$: Observable<{ online: number; offline: number; lastSync: string; pendingLogs: number }> | undefined;
  
  displayedColumns = ['avatar', 'name', 'time', 'status'];
  subscriptionStatus$: Observable<SubscriptionStatus | null> | undefined;

  // Mock revenue chart points (months and amounts in ₹)
  revenueChartData = [
    { label: 'Jan', value: 45000, percent: 36 },
    { label: 'Feb', value: 60000, percent: 48 },
    { label: 'Mar', value: 75000, percent: 60 },
    { label: 'Apr', value: 90000, percent: 72 },
    { label: 'May', value: 110000, percent: 88 },
    { label: 'Jun', value: 125000, percent: 100 }
  ];

  constructor(
    private memberState: MemberState,
    private paymentState: PaymentState,
    private leadState: LeadState,
    private attendanceState: AttendanceState,
    private logState: ActivityLogState,
    private planState: MembershipPlanState,
    private whatsappState: WhatsAppState,
    private gymState: GymState,
    private trainerState: TrainerState,
    private authState: AuthState,
    private ptState: PTState,
    private subscriptionService: SubscriptionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public submissionGuard: SubmissionGuardService,
    private syncService: AttendanceSyncService
  ) {
    this.canAccessAnalytics$ = this.gymState.activeGymFeatures$.pipe(
      map(features => features ? features.canAccessAnalytics : false)
    );
  }

  ngOnInit(): void {
    const todayStr = new Date().toISOString().split('T')[0];

    // Check if user is a Trainer
    this.currentUser$ = this.authState.currentUser$;
    this.isTrainer$ = this.authState.currentUser$.pipe(
      map(user => user?.role === UserRole.Trainer)
    );

    // Trainer Specific Stats & Data
    this.trainerStats$ = combineLatest([
      this.authState.currentUser$,
      this.ptState.memberPTPlans$,
      this.ptState.ptSessions$,
      this.ptState.trainerRevenue$
    ]).pipe(
      map(([user, wallets, sessions, revenues]) => {
        if (!user || user.role !== UserRole.Trainer) return null;
        
        const trainerId = user.id;
        const activeClients = wallets.filter(w => w.trainerId === trainerId && w.status === 'active').length;
        
        // Sessions Today
        const todaySessions = sessions.filter(s => s.trainerId === trainerId && s.date === todayStr);
        const scheduledToday = todaySessions.filter(s => s.status === 'scheduled' || s.status === 'rescheduled').length;
        
        // Sessions Completed This Month
        const currentMonthStr = new Date().toISOString().substring(0, 7);
        const completedThisMonth = sessions.filter(s => 
          s.trainerId === trainerId && 
          s.status === 'completed' && 
          s.date.startsWith(currentMonthStr)
        ).length;
        
        // Trainer Revenue
        const trainerRevenue = revenues
          .filter(r => r.trainerId === trainerId)
          .reduce((sum, r) => sum + r.amount, 0);
          
        // Completion Rate
        const trainerSessions = sessions.filter(s => s.trainerId === trainerId);
        const total = trainerSessions.length;
        const completed = trainerSessions.filter(s => s.status === 'completed').length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        return {
          activeClients,
          scheduledToday,
          completedThisMonth,
          trainerRevenue,
          completionRate
        };
      })
    );

    this.trainerSessionsToday$ = combineLatest([
      this.authState.currentUser$,
      this.ptState.ptSessions$
    ]).pipe(
      map(([user, sessions]) => {
        if (!user || user.role !== UserRole.Trainer) return [];
        return sessions.filter(s => s.trainerId === user.id && s.date === todayStr);
      })
    );

    this.trainerClients$ = combineLatest([
      this.authState.currentUser$,
      this.ptState.memberPTPlans$
    ]).pipe(
      map(([user, wallets]) => {
        if (!user || user.role !== UserRole.Trainer) return [];
        return wallets.filter(w => w.trainerId === user.id && w.status === 'active');
      })
    );

    // General Owner/Manager PT KPIs
    this.ptKPIs$ = combineLatest([
      this.ptState.memberPTPlans$,
      this.ptState.ptSessions$,
      this.ptState.trainerRevenue$,
      this.trainerState.trainers$
    ]).pipe(
      map(([wallets, sessions, revenues, trainers]) => {
        const totalClients = wallets.filter(w => w.status === 'active').length;
        const activeTrainers = trainers.filter(t => t.status === 'active').length;
        
        // Monthly PT Revenue
        const currentMonthStr = new Date().toISOString().substring(0, 7);
        const monthlyRevenue = revenues
          .filter(r => r.date.startsWith(currentMonthStr))
          .reduce((sum, r) => sum + r.amount, 0);
          
        // Session completion stats
        const scheduledToday = sessions.filter(s => s.date === todayStr && (s.status === 'scheduled' || s.status === 'rescheduled')).length;
        const completedToday = sessions.filter(s => s.date === todayStr && s.status === 'completed').length;
        
        // Top Trainer (highest session count this month)
        const trainerCompletedCounts: Record<string, { name: string, count: number }> = {};
        sessions.forEach(s => {
          if (s.status === 'completed' && s.date.startsWith(currentMonthStr)) {
            if (!trainerCompletedCounts[s.trainerId]) {
              trainerCompletedCounts[s.trainerId] = { name: s.trainerName, count: 0 };
            }
            trainerCompletedCounts[s.trainerId].count++;
          }
        });
        let topTrainerName = 'None';
        let maxSessions = 0;
        Object.values(trainerCompletedCounts).forEach(tc => {
          if (tc.count > maxSessions) {
            maxSessions = tc.count;
            topTrainerName = tc.name;
          }
        });

        // Top PT Package
        const planCounts: Record<string, number> = {};
        wallets.forEach(w => {
          if (w.status === 'active') {
            planCounts[w.planName] = (planCounts[w.planName] || 0) + 1;
          }
        });
        let topPlanName = 'None';
        let maxPlans = 0;
        Object.entries(planCounts).forEach(([name, count]) => {
          if (count > maxPlans) {
            maxPlans = count;
            topPlanName = name;
          }
        });

        return {
          totalClients,
          activeTrainers,
          monthlyRevenue,
          scheduledToday,
          completedToday,
          topTrainerName,
          topPlanName
        };
      })
    );

    // Load active subscription status
    this.subscriptionStatus$ = combineLatest([
      this.gymState.activeGym$,
      this.memberState.members$,
      this.trainerState.trainers$
    ]).pipe(
      map(([gym, members, trainers]) => {
        if (!gym) return null;
        return this.subscriptionService.getSubscriptionStatus(
          gym.subscriptionPlan,
          gym.createdAt,
          members.length,
          trainers.length
        );
      })
    );

    // 1. Calculate stats dynamically based on active member lists
    this.stats$ = combineLatest([
      this.memberState.members$,
      this.paymentState.payments$,
      this.leadState.leads$
    ]).pipe(
      map(([members, payments, leads]) => {
        const totalMembers = members.length;
        const activeMembers = members.filter(m => m.status === 'active').length;
        const activePercentage = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;
        const expiringMemberships = members.filter(m => m.status === 'expiring').length;
        const pendingPaymentsCount = payments.filter(p => p.status === 'pending' || p.status === 'overdue').length;
        
        // Total monthly revenue (paid payments)
        const monthlyRevenue = payments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.paidAmount, 0);

        const totalLeads = leads.length;

        // Dynamic widget counts
        const dueTodayCount = payments.filter(p => p.status !== 'paid' && p.dueDate === todayStr).length;
        const overdueCount = payments.filter(p => p.status === 'overdue' || (p.status === 'pending' && p.dueDate < todayStr)).length;
        
        const { start, end } = this.getStartAndEndOfWeek();
        const renewalsThisWeekCount = members.filter(m => {
          const expiry = new Date(m.endDate);
          return expiry >= start && expiry <= end;
        }).length;

        return {
          totalMembers,
          activeMembers,
          activePercentage,
          expiringMemberships,
          pendingPaymentsCount,
          monthlyRevenue,
          totalLeads,
          dueTodayCount,
          overdueCount,
          renewalsThisWeekCount
        };
      })
    );

    // 2. Fetch today's attendance roster
    this.todayAttendance$ = this.attendanceState.attendance$.pipe(
      map(list => list.filter(a => a.date === todayStr))
    );

    // 3. Fetch attendance stats summary
    this.attendanceSummary$ = combineLatest([
      this.memberState.members$,
      this.todayAttendance$
    ]).pipe(
      map(([members, todayAtt]) => {
        const eligibleCount = members.filter(m => m.status !== 'inactive').length;
        const presentCount = todayAtt.filter(a => a.status === 'present').length;
        const percentage = eligibleCount > 0 ? Math.round((presentCount / eligibleCount) * 100) : 0;
        
        return {
          present: presentCount,
          total: eligibleCount,
          percentage
        };
      })
    );

    // 4. Fetch last 5 logs
    this.recentLogs$ = this.logState.logs$.pipe(
      map(logs => logs.slice(0, 5))
    );

    // 5. Fetch expiring members list (top 5)
    this.expiringMembers$ = this.memberState.members$.pipe(
      map(list => list.filter(m => m.status === 'expiring').slice(0, 5))
    );

    // 6. Fetch pending payments list (top 5)
    this.pendingPayments$ = this.paymentState.payments$.pipe(
      map(list => list.filter(p => p.status === 'pending' || p.status === 'overdue').slice(0, 5))
    );

    // 7. Fetch new members list (sorted by startDate desc, top 5)
    this.newMembers$ = this.memberState.members$.pipe(
      map(list => [...list].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).slice(0, 5))
    );

    // 8. Fetch lead follow ups (top 5)
    this.leadState.leads$.subscribe(); // Ensure trigger
    this.leadFollowUps$ = this.leadState.leads$.pipe(
      map(list => list.filter(l => l.status === 'Follow Up').slice(0, 5))
    );

    // 9. Fetch active plan distribution details
    this.planDistribution$ = combineLatest([
      this.memberState.members$,
      this.planState.plans$
    ]).pipe(
      map(([members, plans]) => {
        const activeMembers = members.filter(m => m.status === 'active');
        const totalActive = activeMembers.length;
        const colors = ['primary', 'success', 'warning', 'info'];

        return plans.map((plan, index) => {
          const count = activeMembers.filter(m => m.planId === plan.id).length;
          const percentage = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;
          return {
            name: plan.name,
            count,
            percentage,
            colorClass: colors[index % colors.length]
          };
        });
      })
    );

    // 10. Load Specific Widgets Lists
    this.paymentsDueToday$ = this.paymentState.payments$.pipe(
      map(payments => payments.filter(p => p.status !== 'paid' && p.dueDate === todayStr))
    );

    this.overduePaymentsList$ = this.paymentState.payments$.pipe(
      map(payments => payments.filter(p => p.status === 'overdue' || (p.status === 'pending' && p.dueDate < todayStr)))
    );

    const { start, end } = this.getStartAndEndOfWeek();
    this.renewalsThisWeek$ = this.memberState.members$.pipe(
      map(members => members.filter(m => {
        const expiry = new Date(m.endDate);
        return expiry >= start && expiry <= end;
      }))
    );

    this.upcomingReminders$ = this.whatsappState.reminders$.pipe(
      map(list => list.filter(r => r.status === 'scheduled' || r.status === 'pending').slice(0, 5))
    );
    this.whatsappState.loadReminders();

    // Load Attendance Devices for the active gym
    this.attendanceDevices$ = this.gymState.activeGym$.pipe(
      switchMap(gym => {
        if (!gym) return of([]);
        return this.syncService.getDevices(gym.gymId);
      })
    );

    this.deviceStats$ = this.attendanceDevices$.pipe(
      map(devices => {
        let online = 0;
        let offline = 0;
        let lastSync = 'Never';
        let latestSyncTime = 0;

        devices.forEach(d => {
          if (d.status === 'Active') {
            online++;
          } else {
            offline++;
          }

          if (d.lastSyncTime) {
            const time = new Date(d.lastSyncTime).getTime();
            if (time > latestSyncTime) {
              latestSyncTime = time;
              lastSync = new Date(d.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(d.lastSyncTime).toLocaleDateString([], { month: 'short', day: 'numeric' });
            }
          }
        });

        const pendingLogs = latestSyncTime > 0 ? 0 : (devices.length > 0 ? 3 : 0);

        return {
          online,
          offline,
          lastSync,
          pendingLogs
        };
      })
    );
  }

  // Quick Action to confirm a pending payment from dashboard
  onConfirmPayment(paymentId: string): void {
    this.paymentState.confirmPayment(paymentId).subscribe(() => {
      this.snackBar.open('Invoice marked as paid.', 'Dismiss', { duration: 3000 });
    });
  }

  onMarkPaid(payment: Payment): void {
    this.paymentState.confirmPayment(payment.id).subscribe(() => {
      this.snackBar.open(`Invoice of ₹${payment.amount} from ${payment.memberName} marked as PAID.`, 'Dismiss', { duration: 3000 });
    });
  }

  onSendReminder(payment: Payment): void {
    this.paymentState.sendPaymentReminder(payment.id);
    this.snackBar.open(`Reminder dispatch logged for ${payment.memberName}.`, 'Dismiss', { duration: 3000 });
  }

  onSendReminderNow(reminder: WhatsAppReminder): void {
    this.whatsappState.sendScheduledNow(reminder).subscribe(() => {
      this.snackBar.open(`WhatsApp reminder sent to ${reminder.recipientName}!`, 'Dismiss', { duration: 3000 });
    });
  }

  onCancelReminder(reminder: WhatsAppReminder): void {
    this.whatsappState.cancelReminder(reminder.id).subscribe(() => {
      this.snackBar.open(`Scheduled reminder for ${reminder.recipientName} cancelled.`, 'Dismiss', { duration: 3000 });
    });
  }

  onRenewMembership(member: Member): void {
    const dialogRef = this.dialog.open(RenewDialogComponent, {
      width: '600px',
      data: { member }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (!this.submissionGuard.start('membership-renew')) {
          return;
        }
        this.memberState.renewMembership(
          result.memberId,
          result.planId,
          result.planName || 'Membership Plan',
          result.startDate,
          result.endDate || result.startDate,
          result.price,
          result.paidAmount,
          result.dueAmount,
          result.dueDate,
          result.paymentStatus,
          result.paymentMethod,
          result.discountType,
          result.discountValue,
          result.originalAmount
        ).subscribe({
          next: () => {
            this.submissionGuard.end('membership-renew');
            this.snackBar.open(`Membership renewed for ${member.name}!`, 'Dismiss', { duration: 3000 });
          },
          error: (err) => {
            this.submissionGuard.end('membership-renew');
            this.snackBar.open(err.message || 'Failed to renew membership', 'Dismiss', { duration: 3000 });
          }
        });
      }
    });
  }

  private addMonths(dateStr: string, months: number): string {
    const date = new Date(dateStr);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  }

  // Week calculation helper
  private getStartAndEndOfWeek(): { start: Date; end: Date } {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const startOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const start = new Date(today);
    start.setDate(today.getDate() + startOffset);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
  }

  // Get SVG polyline points for the revenue chart
  getSVGPath(): string {
    const width = 500;
    const height = 150;
    const padding = 20;
    const pointsCount = this.revenueChartData.length;
    const stepX = (width - padding * 2) / (pointsCount - 1);
    
    return this.revenueChartData.map((data, index) => {
      const x = padding + index * stepX;
      const y = height - padding - ((data.percent / 100) * (height - padding * 2));
      return `${x},${y}`;
    }).join(' ');
  }

  getSVGFillPath(): string {
    const width = 500;
    const height = 150;
    const padding = 20;
    const pointsCount = this.revenueChartData.length;
    const stepX = (width - padding * 2) / (pointsCount - 1);
    
    const linePoints = this.revenueChartData.map((data, index) => {
      const x = padding + index * stepX;
      const y = height - padding - ((data.percent / 100) * (height - padding * 2));
      return `${x},${y}`;
    });

    const startPoint = `${padding},${height - padding}`;
    const endPoint = `${padding + (pointsCount - 1) * stepX},${height - padding}`;

    return `M ${startPoint} L ${linePoints.join(' L ')} L ${endPoint} Z`;
  }

  getPlanLabel(plan: string): string {
    switch (plan) {
      case 'FREE_TRIAL': return 'Free Trial';
      case 'BASIC': return 'Basic';
      case 'PRO': return 'Pro';
      case 'ENTERPRISE': return 'Enterprise';
      default: return plan;
    }
  }
}
