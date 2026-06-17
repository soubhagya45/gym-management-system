import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IFinanceRepository, FINANCE_REPOSITORY_TOKEN } from '../core/interfaces/repository.interfaces';
import { Expense, Invoice, Collection } from '../core/models/finance.entity';

@Injectable({
  providedIn: 'root'
})
export class FinanceService {
  constructor(
    @Inject(FINANCE_REPOSITORY_TOKEN) private financeRepository: IFinanceRepository
  ) {}

  getExpenses(gymId: string): Observable<Expense[]> {
    return this.financeRepository.getExpenses(gymId);
  }

  addExpense(gymId: string, expense: Omit<Expense, 'id'>): Observable<Expense> {
    return this.financeRepository.addExpense(gymId, expense);
  }

  updateExpense(gymId: string, expense: Expense): Observable<void> {
    return this.financeRepository.updateExpense(gymId, expense);
  }

  deleteExpense(gymId: string, id: string): Observable<void> {
    return this.financeRepository.deleteExpense(gymId, id);
  }

  getInvoices(gymId: string): Observable<Invoice[]> {
    return this.financeRepository.getInvoices(gymId);
  }

  addInvoice(gymId: string, invoice: Omit<Invoice, 'id'>): Observable<Invoice> {
    return this.financeRepository.addInvoice(gymId, invoice);
  }

  updateInvoice(gymId: string, invoice: Invoice): Observable<void> {
    return this.financeRepository.updateInvoice(gymId, invoice);
  }

  getCollections(gymId: string): Observable<Collection[]> {
    return this.financeRepository.getCollections(gymId);
  }

  addCollection(gymId: string, collection: Omit<Collection, 'id'>): Observable<Collection> {
    return this.financeRepository.addCollection(gymId, collection);
  }
}
