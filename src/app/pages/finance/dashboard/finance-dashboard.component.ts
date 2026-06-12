import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaymentState } from '../../../presentation/state/payment.state';
import { MemberState } from '../../../presentation/state/member.state';
import { MembershipPlanState } from '../../../presentation/state/membership-plan.state';
import { FinanceState } from '../../../presentation/state/finance.state';

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './finance-dashboard.component.html',
  styleUrls: ['./finance-dashboard.component.scss']
})
export class FinanceDashboardComponent implements OnInit {
  kpis$: Observable<any> | undefined;
  planRevenue$: Observable<any[]> | undefined;
  durationRevenue$: Observable<any[]> | undefined;
  expenseCategories$: Observable<any[]> | undefined;
  profitTrendData$: Observable<any> | undefined;

  constructor(
    private paymentState: PaymentState,
    private memberState: MemberState,
    private planState: MembershipPlanState,
    private financeState: FinanceState
  ) {}

  ngOnInit(): void {
    const todayStr = new Date().toISOString().split('T')[0];
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    // KPI Metrics calculation
    this.kpis$ = combineLatest([
      this.paymentState.payments$,
      this.financeState.expenses$,
      this.memberState.members$
    ]).pipe(
      map(([payments, expenses, members]) => {
        // Today's collections
        const todayCollection = payments
          .filter(p => p.status === 'paid' && p.date === todayStr)
          .reduce((sum, p) => sum + p.paidAmount, 0);

        // Monthly collections (current calendar month)
        const monthlyCollection = payments
          .filter(p => {
            if (p.status !== 'paid') return false;
            const pDate = new Date(p.date);
            return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
          })
          .reduce((sum, p) => sum + p.paidAmount, 0);

        // Outstanding dues (all pending or overdue)
        const outstandingDues = payments
          .filter(p => p.status === 'pending' || p.status === 'overdue')
          .reduce((sum, p) => sum + p.dueAmount, 0);

        // Total expenses
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

        // Net Profit (total revenue ever - total expenses ever, or monthly-based)
        const totalRevenue = payments
          .filter(p => p.status === 'paid')
          .reduce((sum, p) => sum + p.paidAmount, 0);
        const netProfit = totalRevenue - totalExpenses;

        // Active Membership Revenue: monthly expected price sum of all active members
        const activeMembers = members.filter(m => m.status === 'active');
        const activeMembershipRevenue = activeMembers.reduce((sum, m) => {
          // Find standard duration price
          const price = m.balance > 0 ? 0 : (m.planName.includes('Annual') ? 15000 / 12 : m.planName.includes('Quarterly') ? 4000 / 3 : 1500);
          return sum + price;
        }, 0);

        return {
          todayCollection,
          monthlyCollection,
          outstandingDues,
          totalExpenses,
          netProfit,
          activeMembershipRevenue: Math.round(activeMembershipRevenue)
        };
      })
    );

    // Widget 1: Top Revenue Membership Plans
    this.planRevenue$ = combineLatest([
      this.paymentState.payments$,
      this.planState.plans$
    ]).pipe(
      map(([payments, plans]) => {
        const plansMap: Record<string, { name: string; value: number }> = {};
        
        plans.forEach(p => {
          plansMap[p.name] = { name: p.name, value: 0 };
        });

        payments.filter(p => p.status === 'paid').forEach(p => {
          if (!plansMap[p.planName]) {
            plansMap[p.planName] = { name: p.planName, value: 0 };
          }
          plansMap[p.planName].value += p.paidAmount;
        });

        const sorted = Object.values(plansMap)
          .sort((a, b) => b.value - a.value)
          .slice(0, 4);

        const maxVal = sorted.length > 0 ? Math.max(...sorted.map(s => s.value)) : 1;
        return sorted.map(s => ({
          ...s,
          percentage: Math.round((s.value / maxVal) * 100)
        }));
      })
    );

    // Widget 2: Revenue Breakdown by Duration (Monthly, Quarterly, Annual Plans)
    this.durationRevenue$ = this.paymentState.payments$.pipe(
      map(payments => {
        let monthly = 0;
        let quarterly = 0;
        let annual = 0;

        payments.filter(p => p.status === 'paid').forEach(p => {
          const name = p.planName.toLowerCase();
          if (name.includes('annual') || name.includes('year')) {
            annual += p.paidAmount;
          } else if (name.includes('quarterly') || name.includes('3 month')) {
            quarterly += p.paidAmount;
          } else {
            monthly += p.paidAmount;
          }
        });

        const total = monthly + quarterly + annual || 1;
        return [
          { name: 'Monthly Plan', value: monthly, pct: Math.round((monthly / total) * 100), color: 'primary' },
          { name: 'Quarterly Plan', value: quarterly, pct: Math.round((quarterly / total) * 100), color: 'warning' },
          { name: 'Annual Plan', value: annual, pct: Math.round((annual / total) * 100), color: 'success' }
        ];
      })
    );

    // Widget 3: Expense Breakdown by Category
    this.expenseCategories$ = this.financeState.expenses$.pipe(
      map(expenses => {
        const catMap: Record<string, number> = {};
        expenses.forEach(e => {
          catMap[e.category] = (catMap[e.category] || 0) + e.amount;
        });

        const total = expenses.reduce((sum, e) => sum + e.amount, 0) || 1;
        const colors: Record<string, string> = {
          'Rent': 'danger',
          'Electricity': 'warning',
          'Water': 'info',
          'Equipment': 'success',
          'Maintenance': 'accent',
          'Salaries': 'primary',
          'Marketing': 'info',
          'Miscellaneous': 'muted'
        };

        return Object.keys(catMap).map(key => ({
          name: key,
          value: catMap[key],
          pct: Math.round((catMap[key] / total) * 100),
          colorClass: colors[key] || 'muted'
        })).sort((a, b) => b.value - a.value);
      })
    );

    // Widget 4: Profit Trend Data (Last 6 months)
    this.profitTrendData$ = combineLatest([
      this.paymentState.payments$,
      this.financeState.expenses$
    ]).pipe(
      map(([payments, expenses]) => {
        // Build mock monthly timeline: Jan to Jun 2026
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        const values = [
          { month: 'Jan', revenue: 49000, expenses: 15000, profit: 34000 },
          { month: 'Feb', revenue: 60000, expenses: 22000, profit: 38000 },
          { month: 'Mar', revenue: 90000, expenses: 35000, profit: 55000 },
          { month: 'Apr', revenue: 84000, expenses: 40000, profit: 44000 },
          { month: 'May', revenue: 110000, expenses: 54000, profit: 56000 },
          { month: 'Jun', revenue: 125000, expenses: 97100, profit: 27900 }
        ];

        // Recalculate June 2026 dynamic values based on actual DB
        const junePaid = payments
          .filter(p => {
            if (p.status !== 'paid') return false;
            const d = new Date(p.date);
            return d.getMonth() === 5 && d.getFullYear() === 2026; // June 2026
          })
          .reduce((sum, p) => sum + p.paidAmount, 0);

        const juneExpense = expenses
          .filter(e => {
            const d = new Date(e.date);
            return d.getMonth() === 5 && d.getFullYear() === 2026;
          })
          .reduce((sum, e) => sum + e.amount, 0);

        values[5].revenue = junePaid > 0 ? junePaid : 125000;
        values[5].expenses = juneExpense > 0 ? juneExpense : 97100;
        values[5].profit = values[5].revenue - values[5].expenses;

        // Compute points for responsive SVG path plotting
        // Width: 600, Height: 200, padding: 20
        const maxVal = Math.max(...values.map(v => Math.max(v.revenue, v.expenses, v.profit))) || 1;
        const width = 600;
        const height = 200;
        const padding = 20;
        const stepX = (width - padding * 2) / 5;

        const getPoints = (key: 'revenue' | 'expenses' | 'profit') => {
          return values.map((v, i) => {
            const x = padding + i * stepX;
            const val = v[key];
            const y = height - padding - ((val / maxVal) * (height - padding * 2));
            return `${x},${y}`;
          }).join(' ');
        };

        const getAreaPath = (key: 'revenue' | 'expenses' | 'profit') => {
          const pts = values.map((v, i) => {
            const x = padding + i * stepX;
            const val = v[key];
            const y = height - padding - ((val / maxVal) * (height - padding * 2));
            return `${x},${y}`;
          });
          const start = `${padding},${height - padding}`;
          const end = `${padding + 5 * stepX},${height - padding}`;
          return `M ${start} L ${pts.join(' L ')} L ${end} Z`;
        };

        return {
          months,
          values,
          revenuePoints: getPoints('revenue'),
          expensePoints: getPoints('expenses'),
          profitPoints: getPoints('profit'),
          revenueArea: getAreaPath('revenue'),
          expenseArea: getAreaPath('expenses'),
          profitArea: getAreaPath('profit')
        };
      })
    );
  }
}
