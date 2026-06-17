import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { combineLatest, take } from 'rxjs';
import { ExportService } from '../../domain/export/export.service';

import { LeadState } from '../../presentation/state/lead.state';
import { PTState } from '../../presentation/state/pt.state';
import { EmployeeState } from '../../presentation/state/employee.state';
import { Lead } from '../../core/models/lead.entity';
import { Employee } from '../../core/models/employee.entity';
import { MemberPTPlan } from '../../core/models/member-pt-plan.entity';

interface LeaderboardItem {
  id: string;
  name: string;
  role: string;
  assigned: number;
  followups: number;
  converted: number;
  membershipRevenue: number;
  ptRevenue: number;
  totalRevenue: number;
  conversionRate: number;
}

interface TrainerSalesItem {
  trainerId: string;
  trainerName: string;
  planName: string;
  ptAmount: number;
  salespersonName: string;
  date: string;
}

@Component({
  selector: 'app-crm-sales',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTabsModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTooltipModule,
    MatDividerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule
  ],
  templateUrl: './crm-sales.component.html',
  styleUrls: ['./crm-sales.component.scss']
})
export class CrmSalesComponent implements OnInit, AfterViewInit {
  activeTab = 0;
  Math = Math;

  // Stats
  totalRevenue = 0;
  ptRevenue = 0;
  membershipRevenue = 0;

  // Targets
  monthlyTarget = 100000;
  employeeTargets: { [empId: string]: number } = {};
  employeeTargetList: any[] = [];
  targetAchievementPct = 0;

  // Leaderboard
  leaderboardData = new MatTableDataSource<LeaderboardItem>();
  leaderboardColumns: string[] = ['name', 'assigned', 'followups', 'converted', 'membershipRevenue', 'ptRevenue', 'totalRevenue', 'conversionRate'];
  topPerformer: any = null;
  highestRevenueGenerator: any = null;
  highestConversionRate: any = null;

  // Trainer Tracking
  trainerSalesData = new MatTableDataSource<TrainerSalesItem>();
  trainerSalesColumns: string[] = ['trainerName', 'planName', 'ptAmount', 'salespersonName', 'date'];
  trainerReferralSummary: { name: string; count: number; total: number }[] = [];

  // SVG Chart Data Sources
  revenueChartMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  revenueChartValues = [5000, 10000, 12000, 8000, 21500, 0];

  @ViewChild('leadPaginator') leadPaginator!: MatPaginator;
  @ViewChild('leadSort') leadSort!: MatSort;
  @ViewChild('trainerPaginator') trainerPaginator!: MatPaginator;
  @ViewChild('trainerSort') trainerSort!: MatSort;

  constructor(
    private leadState: LeadState,
    private ptState: PTState,
    private employeeState: EmployeeState,
    private router: Router,
    private snackBar: MatSnackBar,
    private exportService: ExportService
  ) {}

  ngOnInit(): void {
    this.loadTargets();
    combineLatest([
      this.leadState.leads$,
      this.employeeState.employees$,
      this.ptState.memberPTPlans$
    ]).subscribe(([leads, employees, ptPlans]) => {
      this.calculateOverviewStats(leads, ptPlans);
      this.buildLeaderboard(leads, employees, ptPlans);
      this.calculateTargetsProgress(employees);
      this.buildTrainerSalesTracking(ptPlans);
      this.calculateRevenueChartValues(leads);
    });
  }

  ngAfterViewInit(): void {
    this.leaderboardData.paginator = this.leadPaginator;
    this.leaderboardData.sort = this.leadSort;
    this.trainerSalesData.paginator = this.trainerPaginator;
    this.trainerSalesData.sort = this.trainerSort;
  }

  private calculateOverviewStats(leads: Lead[], ptPlans: MemberPTPlan[]): void {
    // Revenue calculations
    this.totalRevenue = leads
      .filter(l => l.status === 'Converted')
      .reduce((sum, l) => sum + (l.revenueGenerated || 0), 0);

    // Sum of assigned member PT plan prices
    this.ptRevenue = ptPlans
      .reduce((sum, p) => sum + (p.price || 0), 0);

    // Membership Revenue is total minus PT revenue
    this.membershipRevenue = Math.max(0, this.totalRevenue - this.ptRevenue);
  }

  private buildLeaderboard(leads: Lead[], employees: Employee[], ptPlans: MemberPTPlan[]): void {
    const activeStaff = employees.filter(e => e.accountStatus === 'Active');

    const leaderboard: LeaderboardItem[] = activeStaff.map(emp => {
      // Find leads owned by this employee
      const empLeads = leads.filter(l => 
        l.leadOwner === emp.id || 
        l.assignedEmployee === emp.id || 
        l.assignedStaff?.toLowerCase() === emp.fullName.toLowerCase() ||
        l.assignedEmployeeName?.toLowerCase() === emp.fullName.toLowerCase()
      );

      const converted = empLeads.filter(l => l.status === 'Converted');
      const totalRevenue = converted.reduce((sum, l) => sum + (l.revenueGenerated || 0), 0);

      // Sum of PT plans where salesperson matches this employee
      const empPtRevenue = ptPlans
        .filter(p => p.salespersonId === emp.id || p.salespersonName?.toLowerCase() === emp.fullName.toLowerCase())
        .reduce((sum, p) => sum + (p.price || 0), 0);

      const membershipRevenue = Math.max(0, totalRevenue - empPtRevenue);

      // Count of all follow-ups logged by this employee
      let followups = 0;
      leads.forEach(l => {
        if (l.followUpHistory) {
          followups += l.followUpHistory.filter(h => h.employeeId === emp.id).length;
        }
      });

      const conversionRate = empLeads.length > 0 
        ? Math.round((converted.length / empLeads.length) * 100) 
        : 0;

      return {
        id: emp.id,
        name: emp.fullName,
        role: emp.role,
        assigned: empLeads.length,
        followups,
        converted: converted.length,
        membershipRevenue,
        ptRevenue: empPtRevenue,
        totalRevenue,
        conversionRate
      };
    });

    // Sort by converted count desc, then total revenue desc
    this.leaderboardData.data = leaderboard.sort((a, b) => b.converted - a.converted || b.totalRevenue - a.totalRevenue);

    // Leaderboard awards logic
    if (this.leaderboardData.data.length > 0) {
      this.topPerformer = [...this.leaderboardData.data].sort((a, b) => b.converted - a.converted)[0];
      if (this.topPerformer.converted === 0) this.topPerformer = null;

      this.highestRevenueGenerator = [...this.leaderboardData.data].sort((a, b) => b.totalRevenue - a.totalRevenue)[0];
      if (this.highestRevenueGenerator.totalRevenue === 0) this.highestRevenueGenerator = null;

      const eligibleForConvRate = this.leaderboardData.data.filter(a => a.assigned >= 2);
      if (eligibleForConvRate.length > 0) {
        this.highestConversionRate = [...eligibleForConvRate].sort((a, b) => b.conversionRate - a.conversionRate)[0];
        if (this.highestConversionRate.converted === 0) this.highestConversionRate = null;
      } else {
        this.highestConversionRate = null;
      }
    }
  }

  private buildTrainerSalesTracking(ptPlans: MemberPTPlan[]): void {
    const sales: TrainerSalesItem[] = ptPlans.map(p => ({
      trainerId: p.trainerId,
      trainerName: p.trainerName || 'Unassigned Trainer',
      planName: p.planName,
      ptAmount: p.price,
      salespersonName: p.salespersonName || 'Direct Sale',
      date: p.startDate
    }));

    this.trainerSalesData.data = sales;

    // Group referrals by Trainer
    const trainerGroups = new Map<string, { count: number; total: number }>();
    sales.forEach(s => {
      const key = s.trainerName;
      const existing = trainerGroups.get(key) || { count: 0, total: 0 };
      trainerGroups.set(key, {
        count: existing.count + 1,
        total: existing.total + s.ptAmount
      });
    });

    this.trainerReferralSummary = Array.from(trainerGroups.entries()).map(([name, val]) => ({
      name,
      count: val.count,
      total: val.total
    })).sort((a, b) => b.total - a.total);
  }

  private calculateRevenueChartValues(leads: Lead[]): void {
    // Update charts data values (specifically for June 2026 dynamic conversions)
    const juneRev = leads
      .filter(l => l.status === 'Converted' && (l.trialDate?.startsWith('2026-06') || (l.createdAt && l.createdAt.startsWith('2026-06'))))
      .reduce((sum, l) => sum + (l.revenueGenerated || 0), 0);
    this.revenueChartValues[5] = juneRev;
  }

  // --- SVG Charts Helpers ---
  getRevenueSVGPoints(): string {
    const maxVal = Math.max(...this.revenueChartValues, 30000);
    const width = 500;
    const height = 150;
    const padding = 20;
    const stepX = (width - padding * 2) / 5;
    
    return this.revenueChartValues.map((val, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((val / maxVal) * (height - padding * 2));
      return `${x},${y}`;
    }).join(' ');
  }

  getRevenueSVGFillPoints(): string {
    const maxVal = Math.max(...this.revenueChartValues, 30000);
    const width = 500;
    const height = 150;
    const padding = 20;
    const stepX = (width - padding * 2) / 5;
    
    const linePoints = this.revenueChartValues.map((val, i) => {
      const x = padding + i * stepX;
      const y = height - padding - ((val / maxVal) * (height - padding * 2));
      return `${x},${y}`;
    });

    const startPoint = `${padding},${height - padding}`;
    const endPoint = `${padding + 5 * stepX},${height - padding}`;

    return `M ${startPoint} L ${linePoints.join(' L ')} L ${endPoint} Z`;
  }

  // Target Settings Management
  loadTargets(): void {
    const saved = localStorage.getItem('gym_crm_monthly_targets');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.monthlyTarget = parsed.monthlyTarget || 100000;
        this.employeeTargets = parsed.employeeTargets || {};
      } catch (e) {
        console.error(e);
      }
    }
  }

  saveTargets(): void {
    localStorage.setItem('gym_crm_monthly_targets', JSON.stringify({
      monthlyTarget: this.monthlyTarget,
      employeeTargets: this.employeeTargets
    }));
    this.snackBar.open('Targets saved successfully!', 'Dismiss', {
      duration: 3000
    });
    // Trigger recalculation on current employee lists
    this.employeeState.employees$.pipe(take(1)).subscribe(employees => {
      this.calculateTargetsProgress(employees);
    });
  }

  updateEmployeeTarget(empId: string, val: any): void {
    const num = Number(val);
    if (!isNaN(num) && num >= 0) {
      this.employeeTargets[empId] = num;
    }
  }

  private calculateTargetsProgress(employees: Employee[]): void {
    this.targetAchievementPct = this.monthlyTarget > 0 
      ? Math.round((this.totalRevenue / this.monthlyTarget) * 100)
      : 0;

    const activeStaff = employees.filter(e => e.accountStatus === 'Active');
    this.employeeTargetList = activeStaff.map(emp => {
      if (this.employeeTargets[emp.id] === undefined) {
        this.employeeTargets[emp.id] = 20000; // default initial target
      }
      
      const target = this.employeeTargets[emp.id];
      const empLeaderboardItem = this.leaderboardData.data.find(item => item.id === emp.id);
      const actual = empLeaderboardItem ? empLeaderboardItem.totalRevenue : 0;
      const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
      
      return {
        id: emp.id,
        name: emp.fullName,
        target,
        actual,
        pct
      };
    });
  }

  // Export Data Engine
  exportReport(type: 'membership' | 'pt' | 'referrals'): void {
    let reportData: any[] = [];
    let filename = '';

    if (type === 'membership') {
      filename = `membership_sales_${new Date().toISOString().split('T')[0]}`;
      reportData = this.leaderboardData.data.map(item => ({
        'Employee Name': item.name,
        'Role': this.getRoleLabel(item.role),
        'Membership Conversions': item.converted,
        'Membership Revenue': '₹' + item.membershipRevenue
      }));
    } else if (type === 'pt') {
      filename = `pt_sales_log_${new Date().toISOString().split('T')[0]}`;
      reportData = this.trainerSalesData.data.map(item => ({
        'Trainer Name': item.trainerName,
        'PT Package': item.planName,
        'Amount': '₹' + item.ptAmount,
        'Credited Salesperson': item.salespersonName,
        'Date': item.date
      }));
    } else if (type === 'referrals') {
      filename = `trainer_referrals_${new Date().toISOString().split('T')[0]}`;
      reportData = this.trainerReferralSummary.map(item => ({
        'Trainer Name': item.name,
        'Packages Referred': item.count,
        'Total Referred Revenue': '₹' + item.total
      }));
    }

    if (reportData.length === 0) {
      this.snackBar.open('No sales records to export.', 'Dismiss', { duration: 3000 });
      return;
    }

    this.exportService.exportToCsv(filename, reportData);
    this.snackBar.open(`Downloading CSV file: ${filename}.csv`, 'Dismiss', { duration: 3000 });
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'gym_owner': return 'Owner';
      case 'branch_manager': return 'Branch Manager';
      case 'staff': return 'Staff';
      case 'trainer': return 'Trainer';
      default: return role;
    }
  }
}
