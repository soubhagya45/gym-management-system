import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import {
  IFinanceRepository,
  FINANCE_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { Expense, Invoice, Collection } from '../../core/models/finance.entity';
import { Payment } from '../../core/models/payment.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { PaymentState } from './payment.state';
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
    private paymentState: PaymentState,
    private authState: AuthState
  ) {
    // Combine active gym loading with payment state updates to keep everything fully synced.
    combineLatest([
      this.tenantContext.activeGymId$.pipe(
        switchMap(gymId => {
          if (!gymId) return of({ invoices: [], expenses: [], collections: [] });
          return combineLatest([
            this.financeRepository.getInvoices(gymId),
            this.financeRepository.getExpenses(gymId),
            this.financeRepository.getCollections(gymId)
          ]).pipe(
            map(([invoices, expenses, collections]) => ({ invoices, expenses, collections }))
          );
        })
      ),
      this.paymentState.payments$
    ]).subscribe(([{ invoices, expenses, collections }, payments]) => {
      const gymId = this.tenantContext.getTenantId();
      if (!gymId) return;

      const reconciledInvoices = [...invoices];
      const reconciledCollections = [...collections];
      let hasChanges = false;

      payments.forEach(payment => {
        // Reconcile Invoice
        const matchingInvIdx = reconciledInvoices.findIndex(inv => 
          inv.memberId === payment.memberId &&
          Math.abs(inv.finalAmount - payment.amount) < 0.01 &&
          (inv.invoiceDate === payment.date || inv.invoiceDate === payment.dueDate)
        );

        if (matchingInvIdx === -1) {
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
            paymentMethod: payment.status === 'paid' ? (payment.paymentMethod || 'UPI') : 'Pending',
            invoiceDate: payment.date || new Date().toISOString().split('T')[0],
            status: payment.status === 'overdue' ? 'pending' : (payment.status === 'paid' ? 'paid' : 'pending'),
            collectedBy: payment.collectedBy || 'Sophia Chen',
            createdBy: payment.collectedBy || 'Sophia Chen',
            type: payment.type || 'membership',
            trainerId: payment.trainerId,
            trainerName: payment.trainerName
          };

          this.financeRepository.addInvoice(gymId, newInvoice).subscribe();
          reconciledInvoices.push(newInvoice);
          hasChanges = true;
        } else {
          // Reconcile status
          const invoice = reconciledInvoices[matchingInvIdx];
          const expectedStatus = payment.status === 'overdue' ? 'pending' : (payment.status === 'paid' ? 'paid' : 'pending');
          if (invoice.status !== expectedStatus) {
            invoice.status = expectedStatus as any;
            if (expectedStatus === 'paid') {
              invoice.paymentMethod = payment.paymentMethod || 'UPI';
              invoice.collectedBy = payment.collectedBy || 'Sophia Chen';
            }
            this.financeRepository.updateInvoice(gymId, invoice).subscribe();
            hasChanges = true;
          }
        }

        // Reconcile Collection: Only if payment is 'paid'
        if (payment.status === 'paid') {
          const matchingColIdx = reconciledCollections.findIndex(col => 
            col.memberId === payment.memberId &&
            Math.abs(col.amount - payment.paidAmount) < 0.01 &&
            col.date === payment.date
          );

          if (matchingColIdx === -1) {
            // Automatically generate a collection entry
            const year = new Date().getFullYear();
            const rand = Math.floor(1000 + Math.random() * 9000);
            const receiptNo = `REC-${year}-${rand}`;

            const newCollection: Collection = {
              id: 'col-' + Math.random().toString(36).substring(2, 9),
              gymId,
              receiptNo,
              memberId: payment.memberId,
              memberName: payment.memberName,
              membershipPlan: payment.planName,
              amount: payment.paidAmount,
              paymentMethod: payment.paymentMethod || 'UPI',
              date: payment.date || new Date().toISOString().split('T')[0],
              collectedBy: payment.collectedBy || 'Sophia Chen',
              type: payment.type || 'membership',
              trainerId: payment.trainerId,
              trainerName: payment.trainerName
            };

            this.financeRepository.addCollection(gymId, newCollection).subscribe();
            reconciledCollections.push(newCollection);
            hasChanges = true;
          }
        }
      });

      this.invoicesSubject.next(reconciledInvoices);
      this.expensesSubject.next(expenses);
      this.collectionsSubject.next(reconciledCollections);
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
