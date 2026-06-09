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
import { RenewDialogComponent } from '../payments/renew-dialog.component';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { WhatsAppPreviewModalComponent } from '../whatsapp/whatsapp-preview-modal.component';

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
    MatSnackBarModule,
    WhatsAppPreviewModalComponent
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

  // New Widgets Observables
  paymentsDueToday$: Observable<Payment[]> | undefined;
  overduePaymentsList$: Observable<Payment[]> | undefined;
  renewalsThisWeek$: Observable<Member[]> | undefined;
  upcomingReminders$: Observable<WhatsAppReminder[]> | undefined;
  canAccessAnalytics$: Observable<boolean>;
  
  displayedColumns = ['avatar', 'name', 'time', 'status'];

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
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.canAccessAnalytics$ = this.gymState.activeGymFeatures$.pipe(
      map(features => features ? features.canAccessAnalytics : false)
    );
  }

  ngOnInit(): void {
    const todayStr = new Date().toISOString().split('T')[0];

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
      width: '550px',
      data: { member }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.memberState.renewMembership(
          result.memberId,
          result.planId,
          result.planName,
          result.startDate,
          this.addMonths(result.startDate, result.durationMonths || 1),
          result.price,
          result.paidAmount,
          result.dueAmount,
          result.dueDate,
          result.paymentStatus
        );
        this.snackBar.open(`Membership renewed for ${member.name}!`, 'Dismiss', { duration: 3000 });
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
}
