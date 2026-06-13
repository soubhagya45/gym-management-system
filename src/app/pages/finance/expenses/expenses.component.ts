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
import { Expense, ExpenseCategory } from '../../../core/models/finance.entity';
import { FinanceState } from '../../../presentation/state/finance.state';
import { ExpenseDialogComponent } from './expense-dialog.component';

@Component({
  selector: 'app-expenses',
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
    MatTooltipModule
  ],
  templateUrl: './expenses.component.html',
  styleUrls: ['./expenses.component.scss']
})
export class ExpensesComponent implements OnInit {
  displayedColumns = ['title', 'category', 'amount', 'date', 'createdBy', 'notes', 'actions'];
  dataSource = new MatTableDataSource<Expense>();

  searchQuery = '';
  selectedCategory = 'all';

  categories: ExpenseCategory[] = [
    'Rent',
    'Electricity',
    'Water',
    'Equipment',
    'Maintenance',
    'Salaries',
    'Marketing',
    'Software',
    'Miscellaneous'
  ];

  constructor(
    private financeState: FinanceState,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.financeState.expenses$.subscribe(expenses => {
      this.dataSource.data = expenses;
      this.applyFilters();
    });
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();

    this.dataSource.filterPredicate = (data: Expense, filter: string) => {
      const matchesSearch = data.title.toLowerCase().includes(query) ||
                            (data.notes || '').toLowerCase().includes(query);
      const matchesCategory = this.selectedCategory === 'all' || data.category === this.selectedCategory;
      return matchesSearch && matchesCategory;
    };
    this.dataSource.filter = query + '_' + this.selectedCategory;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = 'all';
    this.applyFilters();
  }

  openAddExpenseDialog(): void {
    const dialogRef = this.dialog.open(ExpenseDialogComponent, {
      width: '550px',
      data: { mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.financeState.addExpense(result).subscribe(() => {
          this.snackBar.open('Expense recorded successfully!', 'Dismiss', {
            duration: 3000
          });
        });
      }
    });
  }

  openEditExpenseDialog(expense: Expense): void {
    const dialogRef = this.dialog.open(ExpenseDialogComponent, {
      width: '550px',
      data: { expense, mode: 'edit' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.financeState.updateExpense({ ...expense, ...result }).subscribe(() => {
          this.snackBar.open('Expense details updated successfully!', 'Dismiss', {
            duration: 3000
          });
        });
      }
    });
  }

  deleteExpense(expense: Expense): void {
    if (confirm(`Are you sure you want to delete the expense "${expense.title}" for ₹${expense.amount}?`)) {
      this.financeState.deleteExpense(expense.id).subscribe(() => {
        this.snackBar.open('Expense deleted successfully.', 'Dismiss', {
          duration: 3000
        });
      });
    }
  }

  getCategoryColorClass(cat: ExpenseCategory): string {
    const colors: Record<ExpenseCategory, string> = {
      'Rent': 'danger',
      'Electricity': 'warning',
      'Water': 'info',
      'Equipment': 'success',
      'Maintenance': 'accent',
      'Salaries': 'primary',
      'Marketing': 'info',
      'Software': 'success',
      'Miscellaneous': 'muted'
    };
    return colors[cat] || 'muted';
  }
}
