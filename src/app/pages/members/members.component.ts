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
import { Member } from '../../core/models/member.entity';
import { MembershipPlan } from '../../core/models/membership-plan.entity';
import { MemberDialogComponent } from './member-dialog.component';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { WhatsAppPreviewModalComponent } from '../whatsapp/whatsapp-preview-modal.component';

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
    WhatsAppPreviewModalComponent
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

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private memberState: MemberState,
    private planState: MembershipPlanState,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  viewProfile(member: Member) {
    this.router.navigate(['/members', member.id]);
  }

  ngOnInit(): void {
    // 1. Subscribe to members list
    this.memberState.members$.subscribe(members => {
      this.dataSource.data = members;
      this.applyFilters();
    });

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
      this.applyFilters();
    });

    // Custom filtering algorithm that handles name, email, plan, and status
    this.dataSource.filterPredicate = (data: Member, filter: string) => {
      const searchTerms = JSON.parse(filter);
      
      const matchesSearch = 
        data.id.toLowerCase().includes(searchTerms.query) ||
        data.name.toLowerCase().includes(searchTerms.query) ||
        data.email.toLowerCase().includes(searchTerms.query) ||
        data.phone.includes(searchTerms.query);
        
      const matchesStatus = 
        searchTerms.status === 'all' || 
        data.status === searchTerms.status;
        
      const matchesPlan = 
        searchTerms.plan === 'all' || 
        data.planId === searchTerms.plan;

      return matchesSearch && matchesStatus && matchesPlan;
    };
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
    
    // Custom sort accessor to sort by nested elements if needed
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch(property) {
        case 'id': return item.id.toLowerCase();
        case 'name': return item.name.toLowerCase();
        case 'phone': return item.phone.toLowerCase();
        case 'email': return item.email.toLowerCase();
        case 'planName': return item.planName.toLowerCase();
        case 'startDate': return item.startDate;
        case 'endDate': return item.endDate;
        case 'status': return item.status.toLowerCase();
        default: return (item as any)[property];
      }
    };
  }

  applyFilters() {
    const filterValues = {
      query: this.searchQuery.trim().toLowerCase(),
      status: this.selectedStatus,
      plan: this.selectedPlan
    };
    this.dataSource.filter = JSON.stringify(filterValues);
    
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.selectedPlan = 'all';
    this.applyFilters();
  }

  // --- Add Member ---
  openAddMemberDialog() {
    const dialogRef = this.dialog.open(MemberDialogComponent, {
      width: '600px',
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.memberState.addMember(result).subscribe(() => {
          this.snackBar.open('Member registered successfully!', 'Dismiss', {
            duration: 3000,
            panelClass: ['premium-snack']
          });
        });
      }
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
        this.memberState.updateMember(result).subscribe(() => {
          this.snackBar.open('Member profile updated!', 'Dismiss', {
            duration: 3000,
            panelClass: ['premium-snack']
          });
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
}
