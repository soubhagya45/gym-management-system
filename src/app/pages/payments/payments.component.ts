import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { GymService } from '../../services/gym.service';
import { Payment, Member } from '../../interfaces/gym.model';
import { PaymentDialogComponent } from './payment-dialog.component';
import { RenewDialogComponent } from './renew-dialog.component';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface PaymentStats {
  totalCollected: number;
  outstandingDues: number;
  pendingCount: number;
}

@Component({
  selector: 'app-payments',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatTabsModule,
    MatProgressBarModule
  ],
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss']
})
export class PaymentsComponent implements OnInit {
  // Columns definition
  historyColumns = ['name', 'plan', 'amount', 'paidAmount', 'dueAmount', 'date', 'dueDate', 'status', 'actions'];
  pendingColumns = ['name', 'plan', 'amount', 'dueAmount', 'dueDate', 'status', 'actions'];
  renewalColumns = ['name', 'plan', 'endDate', 'daysRemaining', 'status', 'actions'];

  // Data Sources
  dataSource = new MatTableDataSource<Payment>();
  pendingDataSource = new MatTableDataSource<Payment>();
  membersDataSource = new MatTableDataSource<Member>();

  // Metrics
  stats$: Observable<PaymentStats> | undefined;

  // Filter properties
  searchQuery = '';
  selectedStatus = 'all';
  selectedPendingStatus = 'all';
  selectedRenewalStatus = 'all';

  constructor(
    private gymService: GymService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // 1. Subscribe to payments list
    this.gymService.payments$.subscribe(payments => {
      this.dataSource.data = payments;
      this.pendingDataSource.data = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
      this.applyFilters();
    });

    // 2. Subscribe to members list for renewal tracking
    this.gymService.members$.subscribe(members => {
      this.membersDataSource.data = members;
      this.applyFilters();
    });

    // 3. Compute dynamic stats
    this.stats$ = this.gymService.payments$.pipe(
      map(payments => {
        const totalCollected = payments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.paidAmount, 0);

        const outstandingDues = payments
          .filter(p => p.status === 'pending' || p.status === 'overdue')
          .reduce((sum, p) => sum + p.dueAmount, 0);

        const pendingCount = payments.filter(p => p.status === 'pending').length;

        return {
          totalCollected,
          outstandingDues,
          pendingCount
        };
      })
    );
  }

  applyFilters() {
    const query = this.searchQuery.trim().toLowerCase();
    
    // 1. History Filter Predicate
    this.dataSource.filterPredicate = (data: Payment, filter: string) => {
      const matchesSearch = data.memberName.toLowerCase().includes(query) ||
                            data.planName.toLowerCase().includes(query);
      const matchesStatus = this.selectedStatus === 'all' || data.status === this.selectedStatus;
      return matchesSearch && matchesStatus;
    };
    this.dataSource.filter = query + '_' + this.selectedStatus;

    // 2. Pending/Overdue Filter Predicate
    this.pendingDataSource.filterPredicate = (data: Payment, filter: string) => {
      const matchesSearch = data.memberName.toLowerCase().includes(query) ||
                            data.planName.toLowerCase().includes(query);
      const matchesStatus = this.selectedPendingStatus === 'all' ?
                            (data.status === 'pending' || data.status === 'overdue') :
                            data.status === this.selectedPendingStatus;
      return matchesSearch && matchesStatus;
    };
    this.pendingDataSource.filter = query + '_' + this.selectedPendingStatus;

    // 3. Renewal Tracking Filter Predicate
    this.membersDataSource.filterPredicate = (data: Member, filter: string) => {
      const matchesSearch = data.name.toLowerCase().includes(query) ||
                            data.planName.toLowerCase().includes(query);
      const matchesStatus = this.selectedRenewalStatus === 'all' || data.status === this.selectedRenewalStatus;
      return matchesSearch && matchesStatus;
    };
    this.membersDataSource.filter = query + '_' + this.selectedRenewalStatus;
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.selectedPendingStatus = 'all';
    this.selectedRenewalStatus = 'all';
    this.applyFilters();
  }

  // Action: Record Manual Payment
  openRecordPaymentDialog() {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '550px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.gymService.addPayment(result);
        this.snackBar.open('Invoice recorded successfully!', 'Dismiss', {
          duration: 3000
        });
      }
    });
  }

  // Action: Mark Paid
  markAsPaid(payment: Payment) {
    this.gymService.confirmPayment(payment.id);
    this.snackBar.open(`Payment of ₹${payment.amount} from ${payment.memberName} marked as PAID.`, 'Dismiss', {
      duration: 3000
    });
  }

  // Action: Send Reminder
  sendReminder(payment: Payment) {
    this.gymService.sendPaymentReminder(payment.id);
    this.snackBar.open(`Reminder message sent to ${payment.memberName} successfully.`, 'Dismiss', {
      duration: 3000
    });
  }

  // Action: Renew Membership
  openRenewDialog(member: Member) {
    const dialogRef = this.dialog.open(RenewDialogComponent, {
      width: '550px',
      data: { member }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.gymService.renewMembership(
          result.memberId,
          result.planId,
          result.startDate,
          result.price,
          result.paidAmount,
          result.dueAmount,
          result.dueDate,
          result.paymentStatus
        );
        this.snackBar.open(`Membership renewed successfully for ${member.name}!`, 'Dismiss', {
          duration: 3000
        });
      }
    });
  }

  // Helper date calculations for renewal tracking
  getDaysRemaining(member: Member): number {
    const end = new Date(member.endDate).getTime();
    const now = new Date();
    // Midnight of today
    now.setHours(0,0,0,0);
    const diff = end - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getDaysPercent(member: Member): number {
    const start = new Date(member.startDate).getTime();
    const end = new Date(member.endDate).getTime();
    const now = new Date().getTime();
    const total = end - start;
    if (total <= 0) return 100;
    const elapsed = now - start;
    const percent = Math.round((elapsed / total) * 100);
    return Math.min(100, Math.max(0, percent));
  }

  printInvoice(payment: Payment) {
    this.snackBar.open(`Generating invoice slip for ${payment.memberName}...`, 'Dismiss', {
      duration: 2000
    });
  }
}
