import { Injectable } from '@angular/core';

export interface BillingCalculationInput {
  originalAmount: number;
  discountType: 'flat' | 'percentage' | 'none';
  discountValue: number;
  paidAmount: number;
  dueDate?: string;
  taxPercent?: number; // default 18
}

export interface BillingCalculationResult {
  originalAmount: number;
  discountType: 'flat' | 'percentage' | 'none';
  discountValue: number;
  discountAmount: number;
  subtotal: number;
  taxAmount: number;
  finalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  paymentStatus: 'paid' | 'partially_paid' | 'pending' | 'overdue';
}

@Injectable({
  providedIn: 'root'
})
export class BillingCalculationService {
  calculate(input: BillingCalculationInput): BillingCalculationResult {
    const originalAmount = Number(input.originalAmount) || 0;
    const discountType = input.discountType || 'none';
    const discountValue = Number(input.discountValue) || 0;
    const paidAmount = Number(input.paidAmount) || 0;
    const taxPercent = input.taxPercent !== undefined ? input.taxPercent : 18;

    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = originalAmount * (discountValue / 100);
    } else if (discountType === 'flat') {
      discountAmount = discountValue;
    }

    discountAmount = Math.round(discountAmount * 100) / 100;
    const finalAmount = Math.max(0, Math.round((originalAmount - discountAmount) * 100) / 100);

    // Mathematically accurate GST inclusive calculation:
    // finalAmount = subtotal + taxAmount
    // subtotal = finalAmount / (1 + taxPercent/100)
    // taxAmount = finalAmount - subtotal
    const subtotal = Math.round((finalAmount / (1 + taxPercent / 100)) * 100) / 100;
    const taxAmount = Math.round((finalAmount - subtotal) * 100) / 100;

    const actualPaid = Math.min(finalAmount, paidAmount);
    const pendingAmount = Math.round((finalAmount - actualPaid) * 100) / 100;

    let paymentStatus: 'paid' | 'partially_paid' | 'pending' | 'overdue' = 'pending';
    if (actualPaid === finalAmount && finalAmount > 0) {
      paymentStatus = 'paid';
    } else if (actualPaid > 0) {
      paymentStatus = 'partially_paid';
    } else {
      paymentStatus = 'pending';
    }

    // Overdue check if there is a pending balance and due date is in the past
    if (paymentStatus !== 'paid' && input.dueDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const due = new Date(input.dueDate);
      due.setHours(0, 0, 0, 0);
      if (due < today) {
        paymentStatus = 'overdue';
      }
    }

    return {
      originalAmount,
      discountType,
      discountValue,
      discountAmount,
      subtotal,
      taxAmount,
      finalAmount,
      paidAmount: actualPaid,
      pendingAmount,
      paymentStatus
    };
  }
}
