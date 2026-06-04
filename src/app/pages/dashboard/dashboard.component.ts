import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GymService } from '../../services/gym.service';
import { Member, Attendance, ActivityLog } from '../../interfaces/gym.model';
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
    MatTooltipModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  stats$: Observable<DashboardStats> | undefined;
  todayAttendance$: Observable<Attendance[]> | undefined;
  recentLogs$: Observable<ActivityLog[]> | undefined;
  
  attendanceSummary$: Observable<{ present: number; total: number; percentage: number }> | undefined;
  
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
      this.gymService.payments$
    ]).pipe(
      map(([members, payments]) => {
        const totalMembers = members.length;
        const activeMembers = members.filter(m => m.status === 'active').length;
        const expiringCount = members.filter(m => m.status === 'expiring').length;
        const activePercentage = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;
        
        // Sum paid amounts in the current month/year (or total revenue for simple demo)
        const monthlyRevenue = payments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0);

        return {
          totalMembers,
          activeMembers,
          activePercentage,
          monthlyRevenue,
          expiringCount
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
        // eligible members for attendance (exclude inactive)
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
