import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaymentState } from '../../../presentation/state/payment.state';
import { FinanceState } from '../../../presentation/state/finance.state';

import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-cash-flow',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './cash-flow.component.html',
  styleUrls: ['./cash-flow.component.scss']
})
export class CashFlowComponent implements OnInit {
  cashFlowSummary$: Observable<any> | undefined;
  cashFlowChart$: Observable<any> | undefined;
  revenueVsExpensesChart$: Observable<any> | undefined;

  constructor(
    private paymentState: PaymentState,
    private financeState: FinanceState
  ) {}

  ngOnInit(): void {
    const openingBalance = 150000; // Seed baseline opening balance

    // Cash flow stats summary
    this.cashFlowSummary$ = combineLatest([
      this.paymentState.payments$,
      this.financeState.expenses$
    ]).pipe(
      map(([payments, expenses]) => {
        const cashInflow = payments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.paidAmount, 0);

        const cashOutflow = expenses.reduce((sum, e) => sum + e.amount, 0);
        const closingBalance = openingBalance + cashInflow - cashOutflow;

        return {
          openingBalance,
          cashInflow,
          cashOutflow,
          closingBalance
        };
      })
    );

    // Monthly Cash Flow Chart (Running balance trend)
    this.cashFlowChart$ = combineLatest([
      this.paymentState.payments$,
      this.financeState.expenses$
    ]).pipe(
      map(([payments, expenses]) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        // Initial projections
        const values = [
          { month: 'Jan', balance: 184000 },
          { month: 'Feb', balance: 222000 },
          { month: 'Mar', balance: 277000 },
          { month: 'Apr', balance: 321000 },
          { month: 'May', balance: 377000 },
          { month: 'Jun', balance: 405000 }
        ];

        // Recalculate June running balance dynamically
        const junePaid = payments
          .filter(p => {
            if (p.status !== 'paid') return false;
            const d = new Date(p.date);
            return d.getMonth() === 5 && d.getFullYear() === 2026;
          })
          .reduce((sum, p) => sum + p.paidAmount, 0);

        const juneExpense = expenses
          .filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === 5 && d.getFullYear() === 2026;
          })
          .reduce((sum, e) => sum + e.amount, 0);

        // Compute running balances
        let runningBalance = openingBalance;
        const netInJune = junePaid - juneExpense;
        values[5].balance = runningBalance + (junePaid > 0 ? netInJune : 255000);

        const width = 600;
        const height = 200;
        const padding = 30;
        const stepX = (width - padding * 2) / 5;
        const maxVal = Math.max(...values.map(v => v.balance)) || 1;
        const minVal = Math.min(...values.map(v => v.balance)) || 0;
        const valueDiff = maxVal - minVal || 1;

        const linePoints = values.map((v, idx) => {
          const x = padding + idx * stepX;
          const y = height - padding - (((v.balance - minVal) / valueDiff) * (height - padding * 2));
          return `${x},${y}`;
        });

        const startPoint = `${padding},${height - padding}`;
        const endPoint = `${padding + 5 * stepX},${height - padding}`;
        const areaPath = `M ${startPoint} L ${linePoints.join(' L ')} L ${endPoint} Z`;

        const points = values.map((v, idx) => ({
          x: padding + idx * stepX,
          y: height - padding - (((v.balance - minVal) / valueDiff) * (height - padding * 2)),
          value: v.balance,
          month: v.month
        }));

        return {
          months,
          linePoints: linePoints.join(' '),
          areaPath,
          points
        };
      })
    );

    // Revenue vs Expenses side-by-side comparison chart
    this.revenueVsExpensesChart$ = combineLatest([
      this.paymentState.payments$,
      this.financeState.expenses$
    ]).pipe(
      map(([payments, expenses]) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const values = [
          { month: 'Jan', revenue: 49000, expenses: 15000 },
          { month: 'Feb', revenue: 60000, expenses: 22000 },
          { month: 'Mar', revenue: 90000, expenses: 35000 },
          { month: 'Apr', revenue: 84000, expenses: 40000 },
          { month: 'May', revenue: 110000, expenses: 54000 },
          { month: 'Jun', revenue: 125000, expenses: 97100 }
        ];

        // Recalculate June dynamically
        const junePaid = payments
          .filter(p => {
            if (p.status !== 'paid') return false;
            const d = new Date(p.date);
            return d.getMonth() === 5 && d.getFullYear() === 2026;
          })
          .reduce((sum, p) => sum + p.paidAmount, 0);

        const juneExpense = expenses
          .filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === 5 && d.getFullYear() === 2026;
          })
          .reduce((sum, e) => sum + e.amount, 0);

        if (junePaid > 0) values[5].revenue = junePaid;
        if (juneExpense > 0) values[5].expenses = juneExpense;

        const maxVal = Math.max(...values.map(v => Math.max(v.revenue, v.expenses))) || 1;
        const height = 180;
        
        // Map elements into coordinates for custom SVG bars
        // 6 months, width of month block is 80, spacing is 20
        const barWidth = 20;
        const spacing = 15;
        const monthWidth = barWidth * 2 + spacing;
        const leftPadding = 50;

        const bars = values.map((v, idx) => {
          const blockX = leftPadding + idx * (monthWidth + 30);
          
          const revHeight = (v.revenue / maxVal) * (height - 30);
          const revY = height - 20 - revHeight;

          const expHeight = (v.expenses / maxVal) * (height - 30);
          const expY = height - 20 - expHeight;

          return {
            month: v.month,
            revenueX: blockX,
            revenueY: revY,
            revenueHeight: revHeight,
            revenueVal: v.revenue,
            expenseX: blockX + barWidth + spacing,
            expenseY: expY,
            expenseHeight: expHeight,
            expenseVal: v.expenses,
            textX: blockX + (barWidth * 2 + spacing) / 2
          };
        });

        return {
          months,
          bars,
          height
        };
      })
    );
  }
}
