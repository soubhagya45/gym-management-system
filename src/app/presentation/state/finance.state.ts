import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import {
  IFinanceRepository,
  FINANCE_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { Expense, Invoice, Collection } from '../../core/models/finance.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { AuthState } from './auth.state';

@Injectable({
  providedIn: 'root'
})
export class FinanceState {
  private invoicesSubject = new BehaviorSubject<Invoice[]>([]);
  invoices$ = this.invoicesSubject.asObservable();

  private expensesSubject = new BehaviorSubject<Expense[]>([]);
  expenses$ = this.expensesSubject.asObservable();

  private collectionsSubject = new BehaviorSubject<Collection[]>([]);
  collections$ = this.collectionsSubject.asObservable();

  constructor(
    @Inject(FINANCE_REPOSITORY_TOKEN) private financeRepository: IFinanceRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService,
    private authState: AuthState
  ) {
    // Listen to active gym and branch changes and load raw finance data.
    combineLatest([
      this.tenantContext.activeGymId$,
      this.tenantContext.activeBranchId$
    ]).pipe(
      switchMap(([gymId, branchId]) => {
        if (!gymId) return of({ invoices: [], expenses: [], collections: [] });
        return combineLatest([
          this.financeRepository.getInvoices(gymId).pipe(
            catchError(err => {
              console.error('Error fetching invoices:', err);
              return of([]);
            })
          ),
          this.financeRepository.getExpenses(gymId).pipe(
            catchError(err => {
              console.error('Error fetching expenses:', err);
              return of([]);
            })
          ),
          this.financeRepository.getCollections(gymId).pipe(
            catchError(err => {
              console.error('Error fetching collections:', err);
              return of([]);
            })
          )
        ]).pipe(
          map(([invoices, expenses, collections]) => ({ invoices, expenses, collections }))
        );
      })
    ).subscribe(({ invoices, expenses, collections }) => {
      this.invoicesSubject.next(invoices);
      this.expensesSubject.next(expenses);
      this.collectionsSubject.next(collections);
    });
  }

  loadFinanceData(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      combineLatest([
        this.financeRepository.getInvoices(gymId),
        this.financeRepository.getExpenses(gymId),
        this.financeRepository.getCollections(gymId)
      ]).subscribe(([invoices, expenses, collections]) => {
        this.invoicesSubject.next(invoices);
        this.expensesSubject.next(expenses);
        this.collectionsSubject.next(collections);
      });
    }
  }

  // --- Expenses Operations ---

  addExpense(expense: Omit<Expense, 'id' | 'gymId' | 'createdBy'>): Observable<Expense> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    const createdBy = this.authState.currentUserValue?.name || 'Rahul Sharma';

    return this.financeRepository.addExpense(gymId, { ...expense, gymId, createdBy }).pipe(
      tap(newExp => {
        this.loadFinanceData();
        this.logRepository.addLog(gymId, `Recorded expense: ${newExp.title} (₹${newExp.amount}) under ${newExp.category}`, 'payment').subscribe();
      })
    );
  }

  updateExpense(expense: Expense): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.financeRepository.updateExpense(gymId, expense).pipe(
      tap(() => {
        this.loadFinanceData();
        this.logRepository.addLog(gymId, `Updated expense details: ${expense.title} (₹${expense.amount})`, 'payment').subscribe();
      })
    );
  }

  deleteExpense(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const expense = this.expensesSubject.value.find(e => e.id === id);
    const title = expense ? expense.title : 'Expense';

    return this.financeRepository.deleteExpense(gymId, id).pipe(
      tap(() => {
        this.loadFinanceData();
        this.logRepository.addLog(gymId, `Deleted expense: ${title}`, 'payment').subscribe();
      })
    );
  }

  // --- Invoices Operations ---

  addInvoice(invoice: Omit<Invoice, 'id' | 'gymId'>): Observable<Invoice> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.financeRepository.addInvoice(gymId, { ...invoice, gymId }).pipe(
      tap(() => this.loadFinanceData())
    );
  }

  updateInvoice(invoice: Invoice): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.financeRepository.updateInvoice(gymId, invoice).pipe(
      tap(() => this.loadFinanceData())
    );
  }
}
