import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import {
  IFinanceRepository,
  FINANCE_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { Expense, Invoice } from '../../core/models/finance.entity';
import { Payment } from '../../core/models/payment.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { PaymentState } from './payment.state';

@Injectable({
  providedIn: 'root'
})
export class FinanceState {
  private invoicesSubject = new BehaviorSubject<Invoice[]>([]);
  invoices$ = this.invoicesSubject.asObservable();

  private expensesSubject = new BehaviorSubject<Expense[]>([]);
  expenses$ = this.expensesSubject.asObservable();

  constructor(
    @Inject(FINANCE_REPOSITORY_TOKEN) private financeRepository: IFinanceRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService,
    private paymentState: PaymentState
  ) {
    // Combine active gym loading with payment state updates to keep everything fully synced.
    combineLatest([
      this.tenantContext.activeGymId$.pipe(
        switchMap(gymId => {
          if (!gymId) return of({ invoices: [], expenses: [] });
          return combineLatest([
            this.financeRepository.getInvoices(gymId),
            this.financeRepository.getExpenses(gymId)
          ]).pipe(
            map(([invoices, expenses]) => ({ invoices, expenses }))
          );
        })
      ),
      this.paymentState.payments$
    ]).subscribe(([{ invoices, expenses }, payments]) => {
      const gymId = this.tenantContext.getTenantId();
      if (!gymId) return;

      const reconciledInvoices = [...invoices];
      let hasChanges = false;

      payments.forEach(payment => {
        // Match invoice by memberId, amount, and date
        const matchingIdx = reconciledInvoices.findIndex(inv => 
          inv.memberId === payment.memberId &&
          Math.abs(inv.finalAmount - payment.amount) < 0.01 &&
          (inv.invoiceDate === payment.date || inv.invoiceDate === payment.dueDate)
        );

        if (matchingIdx === -1) {
          // Automatically generate an invoice
          const year = new Date().getFullYear();
          const rand = Math.floor(1000 + Math.random() * 9000);
          const invoiceNumber = `INV-${year}-${rand}`;
          
          const discount = 0;
          const finalAmount = payment.amount;
          const gst = Math.round((finalAmount * 0.18) * 100) / 100;
          const baseAmount = finalAmount - gst;

          const newInvoice: Invoice = {
            id: 'inv-' + Math.random().toString(36).substring(2, 9),
            gymId,
            invoiceNumber,
            memberId: payment.memberId,
            memberName: payment.memberName,
            membershipPlan: payment.planName,
            amount: Number(baseAmount.toFixed(2)),
            gst: Number(gst.toFixed(2)),
            discount,
            finalAmount,
            paymentMethod: payment.status === 'paid' ? 'UPI' : 'Pending',
            invoiceDate: payment.date || new Date().toISOString().split('T')[0],
            status: payment.status === 'overdue' ? 'pending' : (payment.status === 'paid' ? 'paid' : 'pending')
          };

          this.financeRepository.addInvoice(gymId, newInvoice).subscribe();
          reconciledInvoices.push(newInvoice);
          hasChanges = true;
        } else {
          // Reconcile status
          const invoice = reconciledInvoices[matchingIdx];
          const expectedStatus = payment.status === 'overdue' ? 'pending' : (payment.status === 'paid' ? 'paid' : 'pending');
          if (invoice.status !== expectedStatus) {
            invoice.status = expectedStatus as any;
            if (expectedStatus === 'paid') {
              invoice.paymentMethod = 'UPI';
            }
            this.financeRepository.updateInvoice(gymId, invoice).subscribe();
            hasChanges = true;
          }
        }
      });

      this.invoicesSubject.next(reconciledInvoices);
      this.expensesSubject.next(expenses);
    });
  }

  loadFinanceData(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      combineLatest([
        this.financeRepository.getInvoices(gymId),
        this.financeRepository.getExpenses(gymId)
      ]).subscribe(([invoices, expenses]) => {
        this.invoicesSubject.next(invoices);
        this.expensesSubject.next(expenses);
      });
    }
  }

  // --- Expenses Operations ---

  addExpense(expense: Omit<Expense, 'id' | 'gymId'>): Observable<Expense> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.financeRepository.addExpense(gymId, { ...expense, gymId }).pipe(
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
