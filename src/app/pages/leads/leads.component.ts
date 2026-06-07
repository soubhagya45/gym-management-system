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
import { GymService } from '../../services/gym.service';
import { Lead } from '../../interfaces/gym.model';
import { LeadDialogComponent } from './lead-dialog.component';
import { ConfirmDialogComponent } from '../members/confirm-dialog.component';
import { ConvertDialogComponent } from './convert-dialog.component';

interface LeadStats {
  total: number;
  newLeads: number;
  converted: number;
  conversionRate: number;
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
    MatCardModule
  ],
  templateUrl: './leads.component.html',
  styleUrls: ['./leads.component.scss']
})
export class LeadsComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['name', 'phone', 'trialDate', 'leadSource', 'interestedPlan', 'assignedStaff', 'status', 'actions'];
  dataSource = new MatTableDataSource<Lead>();

  searchQuery = '';
  selectedStatus = 'all';
  selectedSource = 'all';

  stats: LeadStats = {
    total: 0,
    newLeads: 0,
    converted: 0,
    conversionRate: 0
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private gymService: GymService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1. Subscribe to Leads list
    this.gymService.leads$.subscribe(leads => {
      this.dataSource.data = leads;
      this.calculateStats(leads);
      this.applyFilters();
    });

    // Custom filtering algorithm that handles name, phone, source, status, plan, notes, staff
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
        (data.assignedStaff && data.assignedStaff.toLowerCase().includes(query));
        
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

    // Custom sort accessor to handle case insensitivity
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch(property) {
        case 'name': return item.name.toLowerCase();
        case 'leadSource': return item.leadSource.toLowerCase();
        case 'interestedPlan': return item.interestedPlan.toLowerCase();
        case 'assignedStaff': return (item.assignedStaff || '').toLowerCase();
        case 'status': return item.status.toLowerCase();
        default: return (item as any)[property];
      }
    };
  }

  calculateStats(leads: Lead[]): void {
    const total = leads.length;
    const newLeads = leads.filter(l => l.status === 'New').length;
    const converted = leads.filter(l => l.status === 'Converted').length;
    const conversionRate = total > 0 ? Math.round((converted / total) * 100) : 0;

    this.stats = {
      total,
      newLeads,
      converted,
      conversionRate
    };
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

  // --- Add Lead ---
  openAddLeadDialog(): void {
    // Navigate to dedicated Add Lead Page
    this.router.navigate(['/leads/add']);
  }

  // --- Edit Lead ---
  openEditLeadDialog(lead: Lead): void {
    const dialogRef = this.dialog.open(LeadDialogComponent, {
      width: '600px',
      data: lead
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.gymService.updateLead(result);
        this.snackBar.open('Lead details updated!', 'Dismiss', {
          duration: 3000,
          panelClass: ['premium-snack']
        });
      }
    });
  }

  // --- Delete Lead ---
  confirmDeleteLead(lead: Lead): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Trial Lead',
        message: `Are you sure you want to delete the lead file of "${lead.name}"? This action cannot be undone.`,
        confirmText: 'Delete Lead',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.gymService.deleteLead(lead.id);
        this.snackBar.open('Lead profile deleted.', 'Dismiss', {
          duration: 3000,
          panelClass: ['premium-snack']
        });
      }
    });
  }

  // --- Convert Lead to Member ---
  openConvertDialog(lead: Lead): void {
    const dialogRef = this.dialog.open(ConvertDialogComponent, {
      width: '650px',
      data: lead
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.gymService.convertLeadToMember(lead.id, result);
        this.snackBar.open(`Successfully converted ${lead.name} to a member!`, 'Dismiss', {
          duration: 3000,
          panelClass: ['premium-snack']
        });
      }
    });
  }

  // Helper method for status CSS classes
  getStatusClass(status: string): string {
    switch (status) {
      case 'New': return 'new-badge';
      case 'Contacted': return 'contacted-badge';
      case 'Trial Scheduled': return 'trial-scheduled-badge';
      case 'Follow Up': return 'follow-up-badge';
      case 'Converted': return 'converted-badge';
      case 'Lost': return 'lost-badge';
      default: return '';
    }
  }
}
