import { Component, OnInit, ViewChild, AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Material Imports
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';

// Domain Core Imports
import { IAuditLogRepository, AUDIT_LOG_REPOSITORY_TOKEN } from '../../../core/interfaces/repository.interfaces';
import { AuditLog } from '../../../core/models/audit-log.model';
import { AuthState } from '../../../presentation/state/auth.state';
import { ExportService } from '../../../domain/export/export.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    MatMenuModule,
    MatTooltipModule,
    MatCardModule
  ],
  template: `
    <div class="settings-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="title-area">
          <h1>System Audit Logs</h1>
          <p>Monitor operations, access patterns, and security events. Data is isolated based on user role scope.</p>
        </div>
        <div class="actions-area">
          <button mat-raised-button color="accent" [matMenuTriggerFor]="exportMenu" [disabled]="dataSource.data.length === 0" class="export-btn">
            <mat-icon>download</mat-icon>
            <span>Export Logs</span>
          </button>
          <mat-menu #exportMenu="matMenu">
            <button mat-menu-item (click)="exportLogs('csv')">
              <mat-icon>insert_drive_file</mat-icon>
              <span>Export as CSV</span>
            </button>
            <button mat-menu-item (click)="exportLogs('excel')">
              <mat-icon>table_chart</mat-icon>
              <span>Export as Excel (XML)</span>
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- Filters panel -->
      <div class="mat-card filters-panel glass-panel">
        <div class="filters-grid">
          <!-- Search term -->
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Search logs...</mat-label>
            <input matInput [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()" placeholder="Search user, action, target entity, IP...">
            <mat-icon matPrefix>search</mat-icon>
            <button *ngIf="searchQuery" matSuffix mat-icon-button aria-label="Clear" (click)="searchQuery=''; applyFilters()">
              <mat-icon>close</mat-icon>
            </button>
          </mat-form-field>

          <!-- User Role Filter -->
          <mat-form-field appearance="outline">
            <mat-label>Filter by Role</mat-label>
            <mat-select [(ngModel)]="selectedRole" (selectionChange)="applyFilters()">
              <mat-option value="all">All Roles</mat-option>
              <mat-option value="super_admin">Super Admin</mat-option>
              <mat-option value="gym_owner">Gym Owner</mat-option>
              <mat-option value="branch_manager">Branch Manager</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Action Filter -->
          <mat-form-field appearance="outline">
            <mat-label>Filter by Action</mat-label>
            <mat-select [(ngModel)]="selectedAction" (selectionChange)="applyFilters()">
              <mat-option value="all">All Actions</mat-option>
              <mat-option *ngFor="let act of uniqueActions" [value]="act">{{ act }}</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- User Name Filter -->
          <mat-form-field appearance="outline">
            <mat-label>Filter by User</mat-label>
            <mat-select [(ngModel)]="selectedUser" (selectionChange)="applyFilters()">
              <mat-option value="all">All Users</mat-option>
              <mat-option *ngFor="let usr of uniqueUsers" [value]="usr">{{ usr }}</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Start Date filter -->
          <mat-form-field appearance="outline">
            <mat-label>Start Date</mat-label>
            <input matInput type="date" [(ngModel)]="startDate" (ngModelChange)="applyFilters()">
          </mat-form-field>

          <!-- End Date filter -->
          <mat-form-field appearance="outline">
            <mat-label>End Date</mat-label>
            <input matInput type="date" [(ngModel)]="endDate" (ngModelChange)="applyFilters()">
          </mat-form-field>

          <!-- Reset button -->
          <button mat-button class="reset-btn" (click)="resetFilters()" [disabled]="!searchQuery && selectedRole === 'all' && selectedAction === 'all' && selectedUser === 'all' && !startDate && !endDate">
            <mat-icon>filter_list_off</mat-icon>
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      <!-- Main Table Card -->
      <div class="table-container-card mat-card glass-panel">
        <div class="loading-overlay" *ngIf="loading">
          <mat-icon class="spin-icon">sync</mat-icon>
          <p>Loading audit logs...</p>
        </div>

        <div class="table-scroll-wrapper" *ngIf="!loading">
          <table mat-table [dataSource]="dataSource" matSort class="w-100">
            <!-- Timestamp -->
            <ng-container matColumnDef="timestamp">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Timestamp </th>
              <td mat-cell *matCellDef="let element" class="timestamp-cell">
                <div class="timestamp-wrapper">
                  <span class="date">{{ element.timestamp | date:'mediumDate' }}</span>
                  <span class="time text-secondary">{{ element.timestamp | date:'mediumTime' }}</span>
                </div>
              </td>
            </ng-container>

            <!-- User Name -->
            <ng-container matColumnDef="userName">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> User </th>
              <td mat-cell *matCellDef="let element" class="user-cell">
                <div class="user-info-wrapper">
                  <strong class="username">{{ element.userName || 'System' }}</strong>
                  <span class="user-role-badge" [ngClass]="element.role">{{ getRoleLabel(element.role) }}</span>
                </div>
              </td>
            </ng-container>

            <!-- Action -->
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Action </th>
              <td mat-cell *matCellDef="let element">
                <span class="action-badge" [ngClass]="getActionBadgeClass(element.action)">
                  {{ element.action }}
                </span>
              </td>
            </ng-container>

            <!-- Entity Type & Name -->
            <ng-container matColumnDef="entity">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Target Entity </th>
              <td mat-cell *matCellDef="let element" class="entity-cell">
                <div class="entity-wrapper" *ngIf="element.entityType">
                  <span class="entity-type">{{ element.entityType | titlecase }}</span>
                  <span class="entity-name font-bold text-accent" *ngIf="element.entityName">{{ element.entityName }}</span>
                  <span class="entity-id text-secondary" *ngIf="!element.entityName && element.entityId">{{ element.entityId }}</span>
                </div>
                <span *ngIf="!element.entityType" class="text-secondary">-</span>
              </td>
            </ng-container>

            <!-- Gym/Branch -->
            <ng-container matColumnDef="gymBranch">
              <th mat-header-cell *matHeaderCellDef mat-sort-header> Scope/Location </th>
              <td mat-cell *matCellDef="let element">
                <div class="location-wrapper">
                  <span class="gym-lbl" *ngIf="element.gymName">{{ element.gymName }}</span>
                  <span class="branch-lbl text-secondary" *ngIf="element.branchName">{{ element.branchName }}</span>
                  <span *ngIf="!element.gymName && !element.branchName" class="text-secondary">Global</span>
                </div>
              </td>
            </ng-container>

            <!-- IP Address -->
            <ng-container matColumnDef="ipAddress">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="hide-xs"> IP Address </th>
              <td mat-cell *matCellDef="let element" class="hide-xs text-secondary font-mono">
                {{ element.ipAddress || '-' }}
              </td>
            </ng-container>

            <!-- Header Row -->
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;" class="audit-row"></tr>
          </table>

          <!-- Empty state -->
          <div class="empty-table-state" *ngIf="dataSource.filteredData.length === 0">
            <mat-icon>search_off</mat-icon>
            <h3>No matching audit logs found</h3>
            <p>Try adjusting your search criteria, dates, or role filters.</p>
            <button mat-flat-button color="primary" (click)="resetFilters()">Clear Filters</button>
          </div>
        </div>

        <!-- Paginator -->
        <mat-paginator [pageSizeOptions]="[15, 30, 50]" showFirstLastButtons aria-label="Select page of audit logs"></mat-paginator>
      </div>
    </div>
  `,
  styles: [`
    .settings-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    
    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      
      .title-area {
        h1 {
          font-size: 24px;
          font-weight: 800;
          margin: 0 0 6px 0;
          background: linear-gradient(135deg, #ffffff 0%, rgba(255, 255, 255, 0.7) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        p {
          font-size: 13.5px;
          color: var(--text-secondary);
          margin: 0;
        }
      }

      .export-btn {
        height: 40px;
        font-weight: 600;
        border-radius: 8px;
        padding: 0 16px;
      }
    }
    
    .filters-panel {
      padding: 20px;
      border-radius: 14px;
    }
    
    .filters-grid {
      display: grid;
      grid-template-columns: 2fr repeat(5, 1fr) auto;
      gap: 16px;
      align-items: center;
      
      .search-field {
        grid-column: span 1;
      }

      mat-form-field {
        width: 100%;
      }

      ::ng-deep .mat-mdc-form-field-subscript-wrapper {
        display: none; /* Hide hints and errors space to keep alignment tight */
      }

      .reset-btn {
        height: 52px;
        line-height: 52px;
        border-radius: 8px;
        font-weight: 600;
        color: var(--text-secondary);
        border: 1px solid var(--border-color);
        transition: all 0.25s ease;
        
        &:hover:not([disabled]) {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }
      }
    }
    
    .table-container-card {
      border-radius: 16px;
      padding: 0;
      overflow: hidden;
      position: relative;
      min-height: 250px;
      
      .loading-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(18, 19, 26, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10;
        color: var(--text-secondary);
        
        .spin-icon {
          font-size: 36px;
          width: 36px;
          height: 36px;
          animation: spin 1.5s infinite linear;
          margin-bottom: 12px;
          color: var(--accent-color);
        }
      }
    }

    .table-scroll-wrapper {
      overflow-x: auto;
      width: 100%;
    }
    
    table {
      background: transparent;
      border-collapse: collapse;
      
      tr.mat-mdc-header-row {
        height: 56px;
        background: rgba(255, 255, 255, 0.02);
        
        body.light-theme & {
          background: rgba(0, 0, 0, 0.02);
        }
        
        th.mat-mdc-header-cell {
          color: var(--text-primary);
          font-weight: 700;
          font-size: 13px;
          border-bottom: 1px solid var(--border-color);
        }
      }
      
      tr.audit-row {
        height: 60px;
        transition: background 0.2s ease;
        
        &:hover {
          background: rgba(255, 255, 255, 0.015);
          body.light-theme & {
            background: rgba(0, 0, 0, 0.01);
          }
        }
        
        td.mat-mdc-cell {
          border-bottom: 1px solid var(--border-color);
          font-size: 13px;
          color: var(--text-primary);
        }
      }
    }
    
    .timestamp-cell {
      .timestamp-wrapper {
        display: flex;
        flex-direction: column;
        gap: 3px;
        
        .date {
          font-weight: 600;
        }
        
        .time {
          font-size: 11px;
        }
      }
    }
    
    .user-cell {
      .user-info-wrapper {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
        
        .username {
          font-weight: 700;
        }
        
        .user-role-badge {
          font-size: 9px;
          padding: 1px 6px;
          border-radius: 4px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          
          &.super_admin {
            background: rgba(99, 102, 241, 0.12);
            color: #818cf8;
            border: 1px solid rgba(99, 102, 241, 0.25);
          }
          
          &.gym_owner {
            background: rgba(16, 185, 129, 0.12);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.25);
          }
          
          &.branch_manager {
            background: rgba(245, 158, 11, 0.12);
            color: #fbbf24;
            border: 1px solid rgba(245, 158, 11, 0.25);
          }
        }
      }
    }
    
    .action-badge {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 6px;
      font-weight: 700;
      display: inline-block;
      white-space: nowrap;
      
      &.action-login {
        background: rgba(59, 130, 246, 0.12);
        color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.25);
      }
      
      &.action-logout {
        background: rgba(107, 114, 128, 0.12);
        color: #9ca3af;
        border: 1px solid rgba(107, 114, 128, 0.25);
      }
      
      &.action-create {
        background: rgba(16, 185, 129, 0.12);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.25);
      }
      
      &.action-update {
        background: rgba(245, 158, 11, 0.12);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.25);
      }
      
      &.action-delete {
        background: rgba(239, 68, 68, 0.12);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.25);
      }
      
      &.action-other {
        background: rgba(139, 92, 246, 0.12);
        color: #a78bfa;
        border: 1px solid rgba(139, 92, 246, 0.25);
      }
    }
    
    .entity-cell {
      .entity-wrapper {
        display: flex;
        flex-direction: column;
        gap: 3px;
        
        .entity-type {
          font-size: 11px;
          text-transform: uppercase;
          font-weight: 700;
          color: var(--text-secondary);
        }
        
        .entity-name {
          font-size: 13.5px;
        }

        .entity-id {
          font-size: 11px;
          font-family: var(--font-mono);
        }
      }
    }
    
    .location-wrapper {
      display: flex;
      flex-direction: column;
      gap: 3px;
      
      .gym-lbl {
        font-weight: 600;
      }
      
      .branch-lbl {
        font-size: 11.5px;
      }
    }
    
    .empty-table-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 20px;
      text-align: center;
      color: var(--text-secondary);
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: var(--text-muted);
        margin-bottom: 16px;
      }
      
      h3 {
        font-size: 18px;
        font-weight: 700;
        margin: 0 0 8px 0;
        color: var(--text-primary);
      }
      
      p {
        font-size: 13.5px;
        margin: 0 0 20px 0;
      }
      
      button {
        height: 38px;
        border-radius: 6px;
      }
    }
    
    ::ng-deep .mat-mdc-paginator {
      background: transparent !important;
      color: var(--text-secondary) !important;
      border-top: 1px solid var(--border-color);
      
      .mat-mdc-paginator-container {
        font-size: 12.5px;
      }
    }
    
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    
    @media (max-width: 1399.98px) {
      .filters-grid {
        grid-template-columns: 1fr 1fr 1fr;
      }
    }
    
    @media (max-width: 767.98px) {
      .filters-grid {
        grid-template-columns: 1fr;
      }
      
      .page-header {
        flex-direction: column;
        align-items: flex-start;
        
        .actions-area {
          width: 100%;
          button {
            width: 100%;
          }
        }
      }
    }
  `]
})
export class AuditLogsComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['timestamp', 'userName', 'action', 'entity', 'gymBranch', 'ipAddress'];
  dataSource = new MatTableDataSource<AuditLog>();
  loading = true;
  
  allLogs: AuditLog[] = [];
  uniqueActions: string[] = [];
  uniqueUsers: string[] = [];
  
  // Filter states
  searchQuery = '';
  selectedRole = 'all';
  selectedAction = 'all';
  selectedUser = 'all';
  startDate = '';
  endDate = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY_TOKEN) private auditLogRepo: IAuditLogRepository,
    private authState: AuthState,
    private exportService: ExportService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const user = this.authState.currentUserValue;
    if (!user || (user.role === 'trainer' || user.role === 'staff')) {
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    this.auditLogRepo.getAuditLogs(user.gymId || '').subscribe({
      next: (logs) => {
        this.allLogs = logs;
        this.populateFilterOptions(logs);
        this.applyFilters();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to load audit logs:', err);
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  populateFilterOptions(logs: AuditLog[]): void {
    const actionsSet = new Set<string>();
    const usersSet = new Set<string>();

    logs.forEach(l => {
      if (l.action) actionsSet.add(l.action);
      if (l.userName) usersSet.add(l.userName);
    });

    this.uniqueActions = Array.from(actionsSet).sort();
    this.uniqueUsers = Array.from(usersSet).sort();
  }

  applyFilters(): void {
    let filtered = [...this.allLogs];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      filtered = filtered.filter(l => 
        (l.userName && l.userName.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.entityType && l.entityType.toLowerCase().includes(q)) ||
        (l.entityName && l.entityName.toLowerCase().includes(q)) ||
        (l.gymName && l.gymName.toLowerCase().includes(q)) ||
        (l.branchName && l.branchName.toLowerCase().includes(q)) ||
        (l.ipAddress && l.ipAddress.toLowerCase().includes(q)) ||
        (l.role && l.role.toLowerCase().includes(q))
      );
    }

    if (this.selectedRole !== 'all') {
      filtered = filtered.filter(l => l.role === this.selectedRole);
    }

    if (this.selectedAction !== 'all') {
      filtered = filtered.filter(l => l.action === this.selectedAction);
    }

    if (this.selectedUser !== 'all') {
      filtered = filtered.filter(l => l.userName === this.selectedUser);
    }

    if (this.startDate) {
      const start = new Date(this.startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter(l => new Date(l.timestamp) >= start);
    }

    if (this.endDate) {
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(l => new Date(l.timestamp) <= end);
    }

    this.dataSource.data = filtered;
    if (this.paginator) {
      this.paginator.firstPage();
    }
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedRole = 'all';
    this.selectedAction = 'all';
    this.selectedUser = 'all';
    this.startDate = '';
    this.endDate = '';
    this.applyFilters();
  }

  exportLogs(format: 'csv' | 'excel'): void {
    const dataToExport = this.dataSource.filteredData;
    if (dataToExport.length === 0) return;

    const exportRows = dataToExport.map(l => ({
      'Timestamp': new Date(l.timestamp).toLocaleString(),
      'User Name': l.userName || 'System',
      'Role': this.getRoleLabel(l.role),
      'Action': l.action,
      'Entity Type': l.entityType || '-',
      'Entity Name': l.entityName || '-',
      'Gym': l.gymName || '-',
      'Branch': l.branchName || '-',
      'IP Address': l.ipAddress || '-'
    }));

    const filename = `audit_logs_${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') {
      this.exportService.exportToCsv(filename, exportRows);
    } else {
      this.exportService.exportToExcel(filename, exportRows);
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'super_admin': return 'Super Admin';
      case 'gym_owner': return 'Gym Owner';
      case 'branch_manager': return 'Branch Manager';
      case 'trainer': return 'Trainer';
      case 'staff': return 'Staff';
      default: return role || 'User';
    }
  }

  getActionBadgeClass(action: string): string {
    const act = action.toLowerCase();
    if (act.includes('login')) return 'action-login';
    if (act.includes('logout')) return 'action-logout';
    if (act.includes('create') || act.includes('add') || act.includes('assign') || act.includes('generate')) return 'action-create';
    if (act.includes('update') || act.includes('edit') || act.includes('convert') || act.includes('change')) return 'action-update';
    if (act.includes('delete') || act.includes('remove') || act.includes('disable')) return 'action-delete';
    return 'action-other';
  }
}
