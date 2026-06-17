import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { DragDropModule, CdkDragDrop } from '@angular/cdk/drag-drop';
import { combineLatest } from 'rxjs';
import { take } from 'rxjs/operators';
import { ExportService } from '../../domain/export/export.service';
import { MatMenuModule } from '@angular/material/menu';

import { LeadState } from '../../presentation/state/lead.state';
import { EmployeeState } from '../../presentation/state/employee.state';
import { MembershipPlanState } from '../../presentation/state/membership-plan.state';
import { Lead } from '../../core/models/lead.entity';
import { Employee } from '../../core/models/employee.entity';
import { MembershipPlan } from '../../core/models/membership-plan.entity';
import { UserRole } from '../../core/enums/roles.enum';
import { LeadDialogComponent } from './lead-dialog.component';
import { ConfirmDialogComponent } from '../members/confirm-dialog.component';
import { ConvertDialogComponent } from './convert-dialog.component';
import { WhatsAppPreviewModalComponent } from '../whatsapp/whatsapp-preview-modal.component';

interface SalesCRMStats {
  total: number;
  newLeadsToday: number;
  followUpsDueToday: number;
  trialScheduled: number;
  trialAttended: number;
  converted: number;
  lost: number;
  conversionRate: number;
  revenueGenerated: number;
  estPipelineValue: number;
}

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatCardModule,
    MatTabsModule,
    MatDividerModule,
    DragDropModule,
    MatMenuModule
  ],
  templateUrl: './leads.component.html',
  styleUrls: ['./leads.component.scss']
})
export class LeadsComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['name', 'phone', 'trialDate', 'leadSource', 'interestedPlan', 'assignedStaff', 'leadTemperature', 'trialStatus', 'status', 'actions'];
  dataSource = new MatTableDataSource<Lead>();

  searchQuery = '';
  selectedStatus = 'all';
  selectedSource = 'all';

  // CRM Dashboard Metrics
  stats: SalesCRMStats = {
    total: 0,
    newLeadsToday: 0,
    followUpsDueToday: 0,
    trialScheduled: 0,
    trialAttended: 0,
    converted: 0,
    lost: 0,
    conversionRate: 0,
    revenueGenerated: 0,
    estPipelineValue: 0
  };

  // Pipeline Kanban Data
  pipelineColumns: { name: string; status: Lead['status']; leads: Lead[] }[] = [];

  // Leaderboard statistics
  leaderboard: any[] = [];
  topPerformer: any = null;
  highestRevenueGenerator: any = null;
  highestConversionRate: any = null;

  // Follow Up widgets lists
  dueTodayFollowUps: Lead[] = [];
  missedFollowUps: Lead[] = [];
  upcomingFollowUps: Lead[] = [];

  // Lead source performance
  sourceAnalytics: any[] = [];

  // Lost reasons analytics
  lostReasonsAnalytics: any[] = [];

  // Active Report
  activeReportType = 'conversion';
  reportData: any[] = [];
  reportHeaders: string[] = [];

  // SVG Chart Data Sources
  revenueChartMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  revenueChartValues = [5000, 10000, 12000, 8000, 21500, 0];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private leadState: LeadState,
    private employeeState: EmployeeState,
    private planState: MembershipPlanState,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private exportService: ExportService
  ) {}

  ngOnInit(): void {
    // Subscribe to Leads, Employees, and Plans simultaneously to compute leaderboard and dashboards reactively
    combineLatest([
      this.leadState.leads$,
      this.employeeState.employees$,
      this.planState.plans$
    ]).subscribe(([leads, employees, plans]) => {
      this.dataSource.data = leads;
      this.recalculateAll(leads, employees, plans);
      this.applyFilters();
    });

    // Custom filtering algorithm for the directory table
    this.dataSource.filterPredicate = (data: Lead, filter: string) => {
      const searchTerms = JSON.parse(filter);
      const query = searchTerms.query;
      
      const matchesSearch = 
        data.name.toLowerCase().includes(query) ||
        data.phone.includes(query) ||
        data.email?.toLowerCase().includes(query) ||
        data.leadSource.toLowerCase().includes(query) ||
        data.interestedPlan.toLowerCase().includes(query) ||
        (data.notes && data.notes.toLowerCase().includes(query)) ||
        (data.assignedEmployeeName && data.assignedEmployeeName.toLowerCase().includes(query)) ||
        (data.assignedStaff && data.assignedStaff.toLowerCase().includes(query)) ||
        (data.leadTemperature && data.leadTemperature.toLowerCase().includes(query)) ||
        (data.trialStatus && data.trialStatus.toLowerCase().includes(query));
        
      const matchesStatus = 
        searchTerms.status === 'all' || 
        data.status === searchTerms.status;
        
      const matchesSource = 
        searchTerms.source === 'all' || 
        data.leadSource === searchTerms.source;

      return !!(matchesSearch && matchesStatus && matchesSource);
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    this.dataSource.sortingDataAccessor = (item, property) => {
      switch(property) {
        case 'name': return item.name.toLowerCase();
        case 'leadSource': return item.leadSource.toLowerCase();
        case 'interestedPlan': return item.interestedPlan.toLowerCase();
        case 'assignedStaff': return (item.assignedEmployeeName || item.assignedStaff || '').toLowerCase();
        case 'status': return item.status.toLowerCase();
        case 'leadTemperature': return item.leadTemperature || 'Cold';
        case 'trialStatus': return item.trialStatus || 'Not Scheduled';
        default: return (item as any)[property];
      }
    };
  }

  recalculateAll(leads: Lead[], employees: Employee[], plans: MembershipPlan[] = []): void {
    const todayStr = new Date().toISOString().split('T')[0];

    // Create plan price mapping
    const planPriceMap = new Map<string, number>();
    plans.forEach(p => planPriceMap.set(p.name.toLowerCase(), p.price));
    // Hardcoded fallbacks in case plans$ is empty or loading
    const defaultPrices: { [key: string]: number } = {
      'monthly': 2000,
      'quarterly': 5000,
      'half yearly': 9000,
      'annual': 15000,
      'personal training': 8000,
      'group classes': 4000,
      'premium package': 20000
    };

    // 1. Calculate CRM KPI Cards
    const totalLeads = leads.length;
    const newLeadsToday = leads.filter(l => l.status === 'New' && (l.createdAt === todayStr || l.trialDate === todayStr)).length;
    const followUpsDueTodayCount = leads.filter(l => l.status === 'Follow Up' && (l.nextFollowUp === todayStr || l.followUpDate === todayStr) && l.followUpStatus === 'Pending').length;
    const trialScheduledCount = leads.filter(l => l.trialStatus === 'Scheduled').length;
    const trialAttendedCount = leads.filter(l => l.trialStatus === 'Attended').length;
    const convertedCount = leads.filter(l => l.status === 'Converted').length;
    const lostCount = leads.filter(l => l.status === 'Lost').length;
    const conversionRate = totalLeads > 0 ? Math.round((convertedCount / totalLeads) * 100) : 0;
    
    // Revenue and Pipeline
    const revenueGenerated = leads.filter(l => l.status === 'Converted').reduce((sum, l) => sum + (l.revenueGenerated || 0), 0);
    const estPipelineValue = leads
      .filter(l => l.status !== 'Converted' && l.status !== 'Lost')
      .reduce((sum, l) => {
        const planName = (l.preferredPlan || l.interestedPlan || '').toLowerCase();
        const price = planPriceMap.get(planName) || defaultPrices[planName] || 0;
        return sum + price;
      }, 0);

    this.stats = {
      total: totalLeads,
      newLeadsToday,
      followUpsDueToday: followUpsDueTodayCount,
      trialScheduled: trialScheduledCount,
      trialAttended: trialAttendedCount,
      converted: convertedCount,
      lost: lostCount,
      conversionRate,
      revenueGenerated,
      estPipelineValue
    };

    // 2. Build Pipeline Stages
    const stages: Lead['status'][] = ['New', 'Contacted', 'Follow Up', 'Trial Scheduled', 'Trial Attended', 'Negotiation', 'Converted', 'Lost'];
    this.pipelineColumns = stages.map(stage => ({
      name: this.getStageLabel(stage),
      status: stage,
      leads: leads.filter(l => l.status === stage)
    }));

    // 3. Build Follow Up Widgets Lists
    this.dueTodayFollowUps = leads.filter(l => l.status === 'Follow Up' && (l.nextFollowUp === todayStr || l.followUpDate === todayStr) && l.followUpStatus === 'Pending');
    this.missedFollowUps = leads.filter(l => l.status === 'Follow Up' && (l.nextFollowUp || l.followUpDate || '') < todayStr && l.followUpStatus === 'Pending');
    this.upcomingFollowUps = leads.filter(l => l.status === 'Follow Up' && (l.nextFollowUp || l.followUpDate || '') > todayStr && l.followUpStatus === 'Pending');

    // 4. Build Sales Performance Leaderboard
    const salesExecs = employees.filter(e => e.role === UserRole.Staff || e.role === UserRole.Manager);
    const board = salesExecs.map(emp => {
      const empLeads = leads.filter(l => l.leadOwner === emp.id || l.assignedEmployee === emp.id || l.assignedStaff?.toLowerCase() === emp.fullName.toLowerCase());
      const empConverted = empLeads.filter(l => l.status === 'Converted');
      const empRev = empConverted.reduce((sum, l) => sum + (l.revenueGenerated || 0), 0);
      const empComm = empConverted.reduce((sum, l) => sum + (l.commissionEarned || 0), 0);
      const empConvRate = empLeads.length > 0 ? Math.round((empConverted.length / empLeads.length) * 100) : 0;

      return {
        id: emp.id,
        name: emp.fullName,
        role: emp.role === UserRole.Staff ? 'Sales Executive' : 'Manager',
        assigned: empLeads.length,
        converted: empConverted.length,
        conversionRate: empConvRate,
        revenue: empRev,
        commission: empComm
      };
    });

    this.leaderboard = board.sort((a, b) => b.converted - a.converted || b.revenue - a.revenue);

    // Leaderboard awards logic
    if (this.leaderboard.length > 0) {
      this.topPerformer = [...this.leaderboard].sort((a, b) => b.converted - a.converted)[0];
      if (this.topPerformer.converted === 0) this.topPerformer = null;

      this.highestRevenueGenerator = [...this.leaderboard].sort((a, b) => b.revenue - a.revenue)[0];
      if (this.highestRevenueGenerator.revenue === 0) this.highestRevenueGenerator = null;

      const eligibleForConvRate = this.leaderboard.filter(a => a.assigned >= 2);
      if (eligibleForConvRate.length > 0) {
        this.highestConversionRate = [...eligibleForConvRate].sort((a, b) => b.conversionRate - a.conversionRate)[0];
        if (this.highestConversionRate.converted === 0) this.highestConversionRate = null;
      } else {
        this.highestConversionRate = null;
      }
    }

    // 5. Build Source Performance Analytics
    const sources: Lead['leadSource'][] = ['Walk-In', 'Website', 'Instagram', 'Facebook', 'Google Ads', 'WhatsApp', 'Referral', 'Existing Member Referral', 'Trainer Referral', 'Other'];
    this.sourceAnalytics = sources.map(src => {
      const srcLeads = leads.filter(l => l.leadSource === src);
      const srcConv = srcLeads.filter(l => l.status === 'Converted');
      const srcRev = srcConv.reduce((sum, l) => sum + (l.revenueGenerated || 0), 0);
      return {
        source: src,
        leads: srcLeads.length,
        conversions: srcConv.length,
        conversionRate: srcLeads.length > 0 ? Math.round((srcConv.length / srcLeads.length) * 100) : 0,
        revenue: srcRev
      };
    });

    // 6. Build Lost Reasons Analytics
    const lostLeads = leads.filter(l => l.status === 'Lost');
    const lostCountTotal = lostLeads.length;
    const reasons = [
      'Too Expensive',
      'Joined Another Gym',
      'Location Too Far',
      'No Time',
      'Not Interested',
      'Medical Reasons',
      'Moved Location',
      'Other'
    ];
    this.lostReasonsAnalytics = reasons.map(r => {
      const count = lostLeads.filter(l => l.reasonLost === r).length;
      const pct = lostCountTotal > 0 ? Math.round((count / lostCountTotal) * 100) : 0;
      return {
        reason: r,
        count,
        percentage: pct
      };
    }).sort((a, b) => b.count - a.count);

    // Update charts data values (specifically for June 2026 dynamic conversions)
    const juneRev = leads
      .filter(l => l.status === 'Converted' && (l.trialDate.startsWith('2026-06') || (l.createdAt && l.createdAt.startsWith('2026-06'))))
      .reduce((sum, l) => sum + (l.revenueGenerated || 0), 0);
    this.revenueChartValues[5] = juneRev;

    // Refresh reports
    this.generateReport();
  }

  applyFilters(): void {
    const filterValues = {
      query: this.searchQuery.trim().toLowerCase(),
      status: this.selectedStatus,
      source: this.selectedSource
    };
    this.dataSource.filter = JSON.stringify(filterValues);
    
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.selectedSource = 'all';
    this.applyFilters();
  }

  viewLead(lead: Lead): void {
    this.router.navigate(['/leads', lead.id]);
  }

  openAddLeadDialog(): void {
    this.router.navigate(['/leads/add']);
  }

  openEditLeadDialog(lead: Lead): void {
    const dialogRef = this.dialog.open(LeadDialogComponent, {
      width: '650px',
      data: lead
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.leadState.updateLead(result).subscribe(() => {
          this.snackBar.open('Lead details updated!', 'Dismiss', {
            duration: 3000,
            panelClass: ['premium-snack']
          });
        });
      }
    });
  }

  confirmDeleteLead(lead: Lead): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Trial Lead',
        message: `Are you sure you want to delete the lead profile of "${lead.name}"? This action cannot be undone.`,
        confirmText: 'Delete Lead',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.leadState.deleteLead(lead.id).subscribe(() => {
          this.snackBar.open('Lead profile deleted.', 'Dismiss', {
            duration: 3000,
            panelClass: ['premium-snack']
          });
        });
      }
    });
  }

  openConvertDialog(lead: Lead): void {
    const dialogRef = this.dialog.open(ConvertDialogComponent, {
      width: '650px',
      data: lead
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.memberDetails && result.conversionDetails) {
        this.leadState.convertLeadToMember(lead.id, result.memberDetails, result.conversionDetails).subscribe(() => {
          this.snackBar.open(`Successfully converted ${lead.name} to a member!`, 'Dismiss', {
            duration: 3000,
            panelClass: ['premium-snack']
          });
        });
      }
    });
  }

  openWhatsAppDialog(lead: Lead): void {
    this.dialog.open(WhatsAppPreviewModalComponent, {
      width: '800px',
      data: {
        name: lead.name,
        phone: lead.phone,
        recipientType: 'lead',
        variables: {
          trialDate: lead.trialDate,
          planName: lead.interestedPlan,
          gymName: 'Apex Fit Downtown'
        }
      }
    });
  }

  // Kanban drag and drop event
  onPipelineCardDrop(event: CdkDragDrop<Lead[]>, newStatus: Lead['status']): void {
    if (event.previousContainer === event.container) {
      // Reordering cards inside the column
      const columnLeads = event.container.data;
      const prevIdx = event.previousIndex;
      const currIdx = event.currentIndex;
      const movedItem = columnLeads[prevIdx];
      columnLeads.splice(prevIdx, 1);
      columnLeads.splice(currIdx, 0, movedItem);
    } else {
      // Transfer card to another column
      const lead = event.item.data as Lead;
      
      if (newStatus === 'Converted') {
        // Automatically pop open conversion details window!
        this.openConvertDialog(lead);
      } else {
        this.leadState.updateLeadStage(lead.id, newStatus).subscribe(() => {
          this.snackBar.open(`Moved ${lead.name} to stage: ${this.getStageLabel(newStatus)}`, 'Dismiss', {
            duration: 3000,
            panelClass: ['premium-snack']
          });
        });
      }
    }
  }

  // Reports Generation Engine
  selectReport(reportType: string): void {
    this.activeReportType = reportType;
    this.generateReport();
  }

  generateReport(): void {
    const leads = this.dataSource.data;
    switch (this.activeReportType) {
      case 'conversion':
        this.reportHeaders = ['Lead Name', 'Lead Source', 'Stage', 'Preferred Plan', 'Owner', 'Created At', 'Converted By', 'Revenue Generated', 'Commission Earned'];
        this.reportData = leads.map(l => ({
          name: l.name,
          source: l.leadSource,
          status: l.status,
          plan: l.preferredPlan || l.interestedPlan,
          owner: l.assignedEmployeeName || l.assignedStaff || 'Unassigned',
          createdAt: l.createdAt || l.trialDate,
          convertedBy: l.convertedBy || '-',
          revenue: l.revenueGenerated ? '₹' + l.revenueGenerated : '-',
          commission: l.commissionEarned ? '₹' + l.commissionEarned : '-'
        }));
        break;

      case 'performance':
        this.reportHeaders = ['Salesperson', 'Role', 'Assigned Leads', 'Converted Leads', 'Conversion %', 'Revenue Generated', 'Commissions Earned'];
        this.reportData = this.leaderboard.map(s => ({
          name: s.name,
          role: s.role,
          assigned: s.assigned,
          converted: s.converted,
          convRate: s.conversionRate + '%',
          revenue: '₹' + s.revenue,
          commission: '₹' + s.commission
        }));
        break;

      case 'revenue':
        this.reportHeaders = ['Salesperson', 'Role', 'Converted Sales', 'Revenue Generated', 'Commission Earned', 'Average Deal Size'];
        this.reportData = this.leaderboard.map(s => ({
          name: s.name,
          role: s.role,
          converted: s.converted,
          revenue: '₹' + s.revenue,
          commission: '₹' + s.commission,
          avgDeal: s.converted > 0 ? '₹' + Math.round(s.revenue / s.converted) : '₹0'
        }));
        break;

      case 'sources':
        this.reportHeaders = ['Lead Source', 'Total Leads', 'Converted Leads', 'Conversion Rate %', 'Total Revenue'];
        this.reportData = this.sourceAnalytics.map(s => ({
          source: s.source,
          leads: s.leads,
          conversions: s.conversions,
          convRate: s.conversionRate + '%',
          revenue: '₹' + s.revenue
        }));
        break;

      case 'followups':
        this.reportHeaders = ['Lead Name', 'Sales Owner', 'Last Activity Date', 'Next Follow Up Date', 'Current Stage'];
        this.reportData = leads.filter(l => l.status !== 'Converted' && l.status !== 'Lost').map(l => ({
          name: l.name,
          owner: l.assignedEmployeeName || l.assignedStaff || 'Unassigned',
          last: l.lastFollowUp || '-',
          next: l.nextFollowUp || l.followUpDate,
          status: l.status
        }));
        break;
    }
  }

  exportData(format: 'csv' | 'excel'): void {
    if (this.reportData.length === 0) return;

    this.snackBar.open(`Report generated! Downloading ${format.toUpperCase()}...`, 'Dismiss', {
      duration: 3000
    });

    const filename = `sales_crm_${this.activeReportType}_report_${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') {
      this.exportService.exportToCsv(filename, this.reportData);
    } else {
      this.exportService.exportToExcel(filename, this.reportData);
    }
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

  // UI styling helpers
  getStatusClass(status: string): string {
    switch (status) {
      case 'New': return 'new-badge';
      case 'Contacted': return 'contacted-badge';
      case 'Follow Up': return 'follow-up-badge';
      case 'Trial Scheduled': return 'trial-scheduled-badge';
      case 'Trial Attended': return 'trial-attended-badge';
      case 'Negotiation': return 'negotiation-badge';
      case 'Converted': return 'converted-badge';
      case 'Lost': return 'lost-badge';
      default: return '';
    }
  }

  getStageLabel(status: Lead['status']): string {
    switch(status) {
      case 'New': return 'New';
      case 'Contacted': return 'Contacted';
      case 'Follow Up': return 'Follow Up';
      case 'Trial Scheduled': return 'Trial Scheduled';
      case 'Trial Attended': return 'Trial Attended';
      case 'Negotiation': return 'Negotiation';
      case 'Converted': return 'Converted';
      case 'Lost': return 'Lost';
      default: return status;
    }
  }



  getFollowUpClass(dateStr: string): string {
    const todayStr = new Date().toISOString().split('T')[0];
    if (dateStr === todayStr) return 'due-today';
    if (dateStr < todayStr) return 'overdue';
    return 'upcoming';
  }
}
