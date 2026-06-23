import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class InvoiceStatusService {
  calculateInvoiceStatus(invoice: any): 'paid' | 'partially_paid' | 'pending' | 'overdue' | 'cancelled' | 'refunded' {
    if (invoice.status === 'cancelled') return 'cancelled';
    if (invoice.status === 'refunded') return 'refunded';

    const finalAmt = invoice.finalAmount !== undefined ? Number(invoice.finalAmount) : (invoice.amount !== undefined ? Number(invoice.amount) : 0);
    const paidAmt = invoice.amountPaid !== undefined ? Number(invoice.amountPaid) : (invoice.paidAmount !== undefined ? Number(invoice.paidAmount) : 0);
    const pendingAmt = invoice.pendingAmount !== undefined ? Number(invoice.pendingAmount) : (invoice.dueAmount !== undefined ? Number(invoice.dueAmount) : (finalAmt - paidAmt));
    const dueDate = invoice.dueDate;
    
    if (pendingAmt <= 0) {
      return 'paid';
    }

    if (dueDate) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (dueDate < todayStr) {
        return 'overdue';
      }
    }

    if (paidAmt > 0) {
      return 'partially_paid';
    }

    return 'pending';
  }

  calculateDaysOverdue(invoice: any): number {
    const status = this.calculateInvoiceStatus(invoice);
    if (status !== 'overdue' || !invoice.dueDate) return 0;
    const dueDate = new Date(invoice.dueDate);
    const today = new Date();
    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    const diff = today.getTime() - dueDate.getTime();
    if (diff <= 0) return 0;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  isOverdue(invoice: any): boolean {
    return this.calculateInvoiceStatus(invoice) === 'overdue';
  }

  isPending(invoice: any): boolean {
    return this.calculateInvoiceStatus(invoice) === 'pending';
  }

  isPartiallyPaid(invoice: any): boolean {
    return this.calculateInvoiceStatus(invoice) === 'partially_paid';
  }

  isPaid(invoice: any): boolean {
    return this.calculateInvoiceStatus(invoice) === 'paid';
  }
}
