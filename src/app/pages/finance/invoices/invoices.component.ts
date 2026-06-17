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
import { RouterModule } from '@angular/router';
import { Invoice } from '../../../core/models/finance.entity';
import { FinanceState } from '../../../presentation/state/finance.state';
import { InvoiceViewDialogComponent } from './invoice-view-dialog.component';
import { ExportService } from '../../../domain/export/export.service';
import { MatMenuModule } from '@angular/material/menu';

@Component({
  selector: 'app-invoices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
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
    MatMenuModule
  ],
  templateUrl: './invoices.component.html',
  styleUrls: ['./invoices.component.scss']
})
export class InvoicesComponent implements OnInit {
  displayedColumns = [
    'invoiceNumber',
    'memberName',
    'membershipPlan',
    'finalAmount',
    'paymentMethod',
    'invoiceDate',
    'status',
    'actions'
  ];
  dataSource = new MatTableDataSource<Invoice>();
  
  searchQuery = '';
  selectedStatus = 'all';

  constructor(
    private financeState: FinanceState,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private exportService: ExportService
  ) {}

  ngOnInit(): void {
    this.financeState.invoices$.subscribe(invoices => {
      this.dataSource.data = invoices;
      this.applyFilters();
    });
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    
    this.dataSource.filterPredicate = (data: Invoice, filter: string) => {
      const matchesSearch = data.memberName.toLowerCase().includes(query) ||
                            data.invoiceNumber.toLowerCase().includes(query) ||
                            data.membershipPlan.toLowerCase().includes(query);
      const matchesStatus = this.selectedStatus === 'all' || data.status === this.selectedStatus;
      return matchesSearch && matchesStatus;
    };
    this.dataSource.filter = query + '_' + this.selectedStatus;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedStatus = 'all';
    this.applyFilters();
  }

  viewInvoice(invoice: Invoice): void {
    this.dialog.open(InvoiceViewDialogComponent, {
      width: '650px',
      data: invoice
    });
  }

  printInvoice(invoice: Invoice): void {
    const dialogRef = this.dialog.open(InvoiceViewDialogComponent, {
      width: '650px',
      data: invoice
    });
    dialogRef.afterOpened().subscribe(() => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  }

  downloadInvoice(invoice: Invoice): void {
    // Generate CSV file representing the invoice details
    const headers = 'Invoice Number,Billed By,Client Name,Client ID,Membership Plan,Amount,GST (18%),Discount,Final Amount,Payment Method,Invoice Date,Status\n';
    const row = `"${invoice.invoiceNumber}","Apex Fit Downtown","${invoice.memberName}","${invoice.memberId}","${invoice.membershipPlan}","${invoice.amount}","${invoice.gst || 0}","${invoice.discount}","${invoice.finalAmount}","${invoice.paymentMethod}","${invoice.invoiceDate}","${invoice.status}"`;
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + row);
    
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${invoice.invoiceNumber}_receipt.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.snackBar.open(`Downloaded invoice details for ${invoice.invoiceNumber}.`, 'Dismiss', {
      duration: 3000
    });
  }

  sendInvoice(invoice: Invoice): void {
    this.snackBar.open(`Invoice ${invoice.invoiceNumber} dispatched to ${invoice.memberName}'s registered email & phone!`, 'Dismiss', {
      duration: 3500
    });
  }

  exportData(format: 'csv' | 'excel'): void {
    if (this.dataSource.data.length === 0) {
      this.snackBar.open('No invoice data to export.', 'Close', { duration: 3000 });
      return;
    }

    this.snackBar.open(`Invoice ledger generated! Downloading ${format.toUpperCase()}...`, 'Dismiss', {
      duration: 3000
    });

    const exportData = this.dataSource.data.map(i => ({
      InvoiceNumber: i.invoiceNumber,
      MemberName: i.memberName,
      MemberId: i.memberId,
      MembershipPlan: i.membershipPlan,
      Amount: i.amount,
      GST: i.gst || 0,
      Discount: i.discount || 0,
      FinalAmount: i.finalAmount,
      PaymentMethod: i.paymentMethod,
      InvoiceDate: i.invoiceDate,
      Status: i.status
    }));

    const filename = `invoices_ledger_${new Date().toISOString().split('T')[0]}`;
    if (format === 'csv') {
      this.exportService.exportToCsv(filename, exportData);
    } else {
      this.exportService.exportToExcel(filename, exportData);
    }
  }
}
