import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { GymService } from '../../services/gym.service';
import { Member, Attendance, ActivityLog, Payment, Lead } from '../../interfaces/gym.model';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

interface DashboardStats {
  totalMembers: number;
  activeMembers: number;
  activePercentage: number;
  monthlyRevenue: number;
  expiringCount: number;
}

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
    MatTabsModule
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
  
  displayedColumns = ['avatar', 'name', 'time', 'status'];

  // Mock revenue chart points (months and amounts)
  revenueChartData = [
    { label: 'Jan', value: 1800, percent: 35 },
    { label: 'Feb', value: 2400, percent: 48 },
    { label: 'Mar', value: 2900, percent: 58 },
    { label: 'Apr', value: 3500, percent: 70 },
    { label: 'May', value: 4200, percent: 84 },
    { label: 'Jun', value: 5000, percent: 100 }
  ];

  // Mock growth data (bars)
  growthChartData = [
    { month: 'Jan', members: 45, height: 40 },
    { month: 'Feb', members: 58, height: 52 },
    { month: 'Mar', members: 72, height: 64 },
    { month: 'Apr', members: 85, height: 75 },
    { month: 'May', members: 98, height: 87 },
    { month: 'Jun', members: 112, height: 100 }
  ];

  constructor(private gymService: GymService) {}

  ngOnInit(): void {
    // 1. Calculate stats dynamically based on active member lists
    this.stats$ = combineLatest([
      this.gymService.members$,
      this.gymService.payments$,
      this.gymService.leads$
    ]).pipe(
      map(([members, payments, leads]) => {
        const totalMembers = members.length;
        const activeMembers = members.filter(m => m.status === 'active').length;
        const activePercentage = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;
        
        // Expiring this week: endDate within 7 days
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const expiringThisWeek = members.filter(m => {
          if (m.status === 'inactive') return false;
          const end = new Date(m.endDate);
          return end >= now && end <= nextWeek;
        }).length;

        const pendingPaymentsCount = payments.filter(p => p.status === 'pending').length;
        
        // Total monthly revenue (paid payments)
        const monthlyRevenue = payments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0);

        // Lead conversion rate
        const totalLeads = leads.length;
        const converted = leads.filter(l => l.status === 'Converted').length;
        const leadsConversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

        return {
          totalMembers,
          activeMembers,
          activePercentage,
          expiringThisWeek,
          pendingPaymentsCount,
          monthlyRevenue,
          leadsConversionRate
        };
      })
    );

    // 2. Fetch today's attendance roster
    const todayStr = new Date().toISOString().split('T')[0];
    this.todayAttendance$ = this.gymService.attendance$.pipe(
      map(list => list.filter(a => a.date === todayStr))
    );

    // 3. Fetch attendance stats summary
    this.attendanceSummary$ = combineLatest([
      this.gymService.members$,
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
    this.recentLogs$ = this.gymService.logs$.pipe(
      map(logs => logs.slice(0, 5))
    );

    // 5. Fetch expiring members list (top 5)
    this.expiringMembers$ = this.gymService.members$.pipe(
      map(list => list.filter(m => m.status === 'expiring').slice(0, 5))
    );

    // 6. Fetch pending payments list (top 5)
    this.pendingPayments$ = this.gymService.payments$.pipe(
      map(list => list.filter(p => p.status === 'pending').slice(0, 5))
    );

    // 7. Fetch new members list (sorted by startDate desc, top 5)
    this.newMembers$ = this.gymService.members$.pipe(
      map(list => [...list].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()).slice(0, 5))
    );

    // 8. Fetch lead follow ups (top 5)
    this.leadFollowUps$ = this.gymService.leads$.pipe(
      map(list => list.filter(l => l.status === 'Follow Up').slice(0, 5))
    );
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
      // High value means low y coordinate (invert chart)
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
