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
import { GymService } from '../../services/gym.service';
import { Payment } from '../../interfaces/gym.model';
import { PaymentDialogComponent } from './payment-dialog.component';
import { Observable, combineLatest } from 'rxjs';
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
    MatTooltipModule
  ],
  templateUrl: './payments.component.html',
  styleUrls: ['./payments.component.scss']
})
export class PaymentsComponent implements OnInit {
  displayedColumns = ['name', 'plan', 'amount', 'date', 'status', 'actions'];
  dataSource = new MatTableDataSource<Payment>();

  // Metrics
  stats$: Observable<PaymentStats> | undefined;

  // Filter properties
  searchQuery = '';
  selectedStatus = 'all';

  constructor(
    private gymService: GymService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // 1. Subscribe to payments list
    this.gymService.payments$.subscribe(payments => {
      this.dataSource.data = payments;
      this.applyFilters();
    });

    // 2. Compute dynamic stats
    this.stats$ = this.gymService.payments$.pipe(
      map(payments => {
        const totalCollected = payments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.amount, 0);

        const outstandingDues = payments
          .filter(p => p.status === 'pending' || p.status === 'overdue')
          .reduce((sum, p) => sum + p.amount, 0);

        const pendingCount = payments.filter(p => p.status === 'pending').length;

        return {
          totalCollected,
          outstandingDues,
          pendingCount
        };
      })
    );

    // 3. Define filtering rules
    this.dataSource.filterPredicate = (data: Payment, filter: string) => {
      const searchTerms = JSON.parse(filter);
      
      const matchesSearch = data.memberName.toLowerCase().includes(searchTerms.query) ||
                            data.planName.toLowerCase().includes(searchTerms.query);
                            
      const matchesStatus = searchTerms.status === 'all' || data.status === searchTerms.status;
      
      return matchesSearch && matchesStatus;
    };
  }

  applyFilters() {
    const filterValues = {
      query: this.searchQuery.trim().toLowerCase(),
      status: this.selectedStatus
    };
    this.dataSource.filter = JSON.stringify(filterValues);
  }

  resetFilters() {
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.applyFilters();
  }

  // Record a payment manually
  openRecordPaymentDialog() {
    const dialogRef = this.dialog.open(PaymentDialogComponent, {
      width: '550px'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.gymService.addPayment(result);
        this.snackBar.open('Payment transaction recorded!', 'Dismiss', {
          duration: 3000
        });
      }
    });
  }

  // Verify / confirm a pending payment
  confirmPayment(payment: Payment) {
    this.gymService.confirmPayment(payment.id);
    this.snackBar.open(`Payment of ₹${payment.amount} from ${payment.memberName} confirmed.`, 'Dismiss', {
      duration: 3000
    });
  }

  // Print invoice mock action
  printInvoice(payment: Payment) {
    this.snackBar.open(`Generating invoice slip for ${payment.memberName}...`, 'Dismiss', {
      duration: 2000
    });
  }
}
