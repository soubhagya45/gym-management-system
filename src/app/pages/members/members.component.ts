import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
import { MemberState } from '../../presentation/state/member.state';
import { MembershipPlanState } from '../../presentation/state/membership-plan.state';
import { GymState } from '../../presentation/state/gym.state';
import { SubscriptionService } from '../../domain/subscription/subscription.service';
import { Member } from '../../core/models/member.entity';
import { MembershipPlan } from '../../core/models/membership-plan.entity';
import { MemberDialogComponent } from './member-dialog.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { WhatsAppPreviewModalComponent } from '../whatsapp/whatsapp-preview-modal.component';
import { take } from 'rxjs/operators';
import { ExportService } from '../../domain/export/export.service';
import { SubmissionGuardService } from '../../services/submission-guard.service';
import { MatMenuModule } from '@angular/material/menu';


@Component({
  selector: 'app-members',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
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
    MatMenuModule
  ],
  templateUrl: './members.component.html',
  styleUrls: ['./members.component.scss']
})
export class MembersComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['id', 'photo', 'name', 'phone', 'email', 'planName', 'startDate', 'endDate', 'status', 'actions'];
  dataSource = new MatTableDataSource<Member>();
  
  plans: MembershipPlan[] = [];
  
  // Filters state
  searchQuery = '';
  selectedStatus = 'all';
  selectedPlan = 'all';

  // Server-side pagination state
  pageIndex = 0;
  pageSize = 10;
  totalCount = 0;
  lastVisibleDoc: any = null;
  prevCursors: any[] = [];

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private memberState: MemberState,
    private planState: MembershipPlanState,
    private gymState: GymState,
    private subscriptionService: SubscriptionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    private exportService: ExportService,
    public submissionGuard: SubmissionGuardService
  ) {}

  viewProfile(member: Member) {
    this.router.navigate(['/members', member.id]);
  }

  loadMembersPage() {
    this.memberState.getMembersPaged({
      pageIndex: this.pageIndex,
      pageSize: this.pageSize,
      sort: { column: this.sort?.active || 'name', direction: (this.sort?.direction || 'asc') as any },
      searchTerm: this.searchQuery ? this.searchQuery : undefined,
      startAfter: this.lastVisibleDoc
    }).subscribe({
      next: (res) => {
        this.dataSource.data = res.items;
        this.totalCount = res.totalCount;
        this.lastVisibleDoc = res.lastVisible;
      },
      error: (err) => {
        this.snackBar.open('Failed to load members page: ' + err.message, 'Dismiss', { duration: 3000 });
      }
    });
  }

  onPageChange(event: any) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    if (event.pageIndex === 0) {
      this.lastVisibleDoc = null;
      this.prevCursors = [];
    } else if (event.pageIndex > (event.previousPageIndex || 0)) {
      this.prevCursors.push(this.lastVisibleDoc);
    } else {
      this.prevCursors.pop();
      this.lastVisibleDoc = this.prevCursors[this.prevCursors.length - 1] || null;
    }
    this.loadMembersPage();
  }

  ngOnInit(): void {
    // 2. Fetch plans for filter dropdown
    this.planState.plans$.subscribe(plans => {
      this.plans = plans;
    });

    // 3. Listen to query params to apply external filters
    this.route.queryParams.subscribe(params => {
      if (params['status']) {
        this.selectedStatus = params['status'];
      }
      if (params['plan']) {
        this.selectedPlan = params['plan'];
      }
    });

    this.loadMembersPage();
  }

  ngAfterViewInit() {
    this.dataSource.sort = this.sort;
    this.sort.sortChange.subscribe(() => {
      this.lastVisibleDoc = null;
      this.prevCursors = [];
      this.pageIndex = 0;
      this.loadMembersPage();
    });
  }

  applyFilters() {
    this.lastVisibleDoc = null;
    this.prevCursors = [];
    this.pageIndex = 0;
    this.loadMembersPage();
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.selectedPlan = 'all';
    this.applyFilters();
  }

  // --- Add Member ---
  openAddMemberDialog() {
    this.gymState.activeGym$.pipe(take(1)).subscribe(gym => {
      if (gym) {
        const isLimitReached = this.subscriptionService.hasReachedLimit(
          gym.subscriptionPlan,
          'maxMembers',
          this.totalCount
        );
        if (isLimitReached) {
          this.snackBar.open(`Member limit reached for plan: ${gym.subscriptionPlan}. Please upgrade to register more members.`, 'Upgrade Plan', {
            duration: 5000
          }).onAction().subscribe(() => {
            this.router.navigate(['/settings']);
          });
          return;
        }
      }

      const dialogRef = this.dialog.open(MemberDialogComponent, {
        width: '600px',
        data: null
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          if (!this.submissionGuard.start('member-create')) {
            return;
          }
          this.memberState.registerMember(result).subscribe({
            next: () => {
              this.submissionGuard.end('member-create');
              this.snackBar.open('Member registered successfully!', 'Dismiss', {
                duration: 3000,
                panelClass: ['premium-snack']
              });
            },
            error: (err) => {
              this.submissionGuard.end('member-create');
              this.snackBar.open(err.message || 'Failed to register member', 'Dismiss', {
                duration: 3000
              });
            }
          });
        }
      });
    });
  }

  // --- Edit Member ---
  openEditMemberDialog(member: Member) {
    const dialogRef = this.dialog.open(MemberDialogComponent, {
      width: '600px',
      data: member
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (!this.submissionGuard.start('member-update')) {
          return;
        }
        this.memberState.updateMember(result).subscribe({
          next: () => {
            this.submissionGuard.end('member-update');
            this.snackBar.open('Member profile updated!', 'Dismiss', {
              duration: 3000,
              panelClass: ['premium-snack']
            });
          },
          error: (err) => {
            this.submissionGuard.end('member-update');
            this.snackBar.open(err.message || 'Failed to update member', 'Dismiss', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  // --- Delete Member ---
  confirmDeleteMember(member: Member) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Member Account',
        message: `Are you sure you want to permanently delete the profile of "${member.name}"? This action cannot be undone.`,
        confirmText: 'Delete Profile',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.memberState.deleteMember(member.id).subscribe(() => {
          this.snackBar.open('Member profile deleted.', 'Dismiss', {
            duration: 3000,
            panelClass: ['premium-snack']
          });
        });
      }
    });
  }

  openWhatsAppDialog(member: Member) {
    this.dialog.open(WhatsAppPreviewModalComponent, {
      width: '800px',
      data: {
        name: member.name,
        phone: member.phone,
        recipientType: member.status === 'expiring' ? 'renewal' : 'member',
        variables: {
          planName: member.planName,
          dueDate: member.endDate,
          amount: member.balance,
          gymName: 'Apex Fit Downtown'
        }
      }
    });
  }

  exportData(format: 'csv' | 'excel') {
    this.gymState.activeGymFeatures$.pipe(take(1)).subscribe(features => {
      if (!features || !features.canExportReports) {
        this.snackBar.open('Export Reports feature is locked on your current plan. Please upgrade to Pro or Enterprise.', 'Upgrade Plan', {
          duration: 5000
        }).onAction().subscribe(() => {
          this.router.navigate(['/settings']);
        });
        return;
      }

      this.snackBar.open(`Directory report generated! Downloading ${format.toUpperCase()}...`, 'Dismiss', {
        duration: 3000
      });

      const exportData = this.dataSource.data.map(m => ({
        ID: m.id,
        Name: m.name,
        Phone: m.phone,
        Email: m.email,
        Plan: m.planName,
        StartDate: m.startDate,
        EndDate: m.endDate,
        Status: m.status,
        Balance: m.balance
      }));

      const filename = `members_report_${new Date().toISOString().split('T')[0]}`;
      if (format === 'csv') {
        this.exportService.exportToCsv(filename, exportData);
      } else {
        this.exportService.exportToExcel(filename, exportData);
      }
    });
  }
}

