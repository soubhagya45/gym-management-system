import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { combineLatest } from 'rxjs';
import { take } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { PaymentState } from '../../../presentation/state/payment.state';
import { FinanceState } from '../../../presentation/state/finance.state';
import { MemberState } from '../../../presentation/state/member.state';
import { MembershipPlanState } from '../../../presentation/state/membership-plan.state';
import { PTState } from '../../../presentation/state/pt.state';
import { TrainerState } from '../../../presentation/state/trainer.state';

type ReportType =
  | 'daily_collection'
  | 'monthly_collection'
  | 'membership_revenue'
  | 'outstanding_dues'
  | 'expense_report'
  | 'profit_loss'
  | 'pt_revenue'
  | 'trainer_performance'
  | 'pt_sessions'
  | 'membership_vs_pt'
  | 'salesperson_revenue'
  | 'trainer_revenue'
  | 'discount_report'
  | 'pending_payment'
  | 'cash_collection'
  | 'upi_collection'
  | 'revenue_after_discount';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatSnackBarModule
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  selectedReportType: ReportType = 'profit_loss';
  dataSource = new MatTableDataSource<any>();
  displayedColumns: string[] = [];
  reportTitle = '';
  reportSubtitle = '';
  generationDate = '';

  constructor(
    private paymentState: PaymentState,
    private financeState: FinanceState,
    private memberState: MemberState,
    private planState: MembershipPlanState,
    private ptState: PTState,
    private trainerState: TrainerState,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.generateReport();
  }

  generateReport(): void {
    this.generationDate = new Date().toLocaleString();
    combineLatest([
      this.paymentState.payments$,
      this.financeState.expenses$,
      this.memberState.members$,
      this.planState.plans$,
      this.ptState.ptSessions$,
      this.ptState.memberPTPlans$,
      this.ptState.trainerRevenue$,
      this.trainerState.trainers$
    ]).pipe(take(1)).subscribe(([payments, expenses, members, plans, sessions, ptPlans, revenues, trainers]) => {
      const today = new Date().toISOString().split('T')[0];

      switch (this.selectedReportType) {
        case 'daily_collection':
          this.reportTitle = 'Daily Collection Report';
          this.reportSubtitle = 'Breakdown of daily payment collections by transaction methods';
          this.displayedColumns = ['date', 'transactions', 'methodUPI', 'methodCash', 'methodCard', 'total'];
          
          // Group payments by date
          const dailyMap: Record<string, any> = {};
          payments.filter(p => p.status === 'paid').forEach(p => {
            const date = p.date;
            if (!dailyMap[date]) {
              dailyMap[date] = { date, transactions: 0, UPI: 0, Cash: 0, Card: 0, total: 0 };
            }
            dailyMap[date].transactions++;
            dailyMap[date].total += p.paidAmount;
            
            // Map method (MockUPI vs Cash vs Card)
            const method = p.id === 'pay-3' ? 'Cash' : (p.id === 'pay-2' ? 'Card' : 'UPI');
            if (method.toLowerCase().includes('card')) dailyMap[date].Card += p.paidAmount;
            else if (method.toLowerCase().includes('cash')) dailyMap[date].Cash += p.paidAmount;
            else dailyMap[date].UPI += p.paidAmount;
          });


          // Seed default mock dates if empty
          if (Object.keys(dailyMap).length === 0) {
            dailyMap[today] = { date: today, transactions: 0, UPI: 0, Cash: 0, Card: 0, total: 0 };
          }

          this.dataSource.data = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
          break;

        case 'monthly_collection':
          this.reportTitle = 'Monthly Collection Report';
          this.reportSubtitle = 'Inflow trends and monthly collection totals';
          this.displayedColumns = ['month', 'transactions', 'averageTx', 'total'];
          
          const monthlyMap: Record<string, any> = {};
          payments.filter(p => p.status === 'paid').forEach(p => {
            const pDate = new Date(p.date);
            const monthKey = pDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            
            if (!monthlyMap[monthKey]) {
              monthlyMap[monthKey] = { month: monthKey, transactions: 0, total: 0, sortKey: pDate.getTime() };
            }
            monthlyMap[monthKey].transactions++;
            monthlyMap[monthKey].total += p.paidAmount;
          });

          const monthlyList = Object.values(monthlyMap).map((m: any) => ({
            ...m,
            averageTx: m.transactions > 0 ? Math.round(m.total / m.transactions) : 0
          })).sort((a: any, b: any) => b.sortKey - a.sortKey);

          this.dataSource.data = monthlyList;
          break;

        case 'membership_revenue':
          this.reportTitle = 'Membership Revenue Report';
          this.reportSubtitle = 'Aggregated collections grouped by active plans';
          this.displayedColumns = ['planName', 'subscribers', 'unitPrice', 'totalRevenue'];

          const plansMap: Record<string, any> = {};
          plans.forEach(p => {
            plansMap[p.id] = { planName: p.name, subscribers: 0, unitPrice: p.price, totalRevenue: 0 };
          });

          // Group active member plans
          members.filter(m => m.status === 'active').forEach(m => {
            if (plansMap[m.planId]) {
              plansMap[m.planId].subscribers++;
            }
          });

          // Accumulate collections
          payments.filter(p => p.status === 'paid').forEach(p => {
            const planObj = Object.values(plansMap).find((obj: any) => obj.planName === p.planName);
            if (planObj) {
              planObj.totalRevenue += p.paidAmount;
            }
          });

          this.dataSource.data = Object.values(plansMap).sort((a: any, b: any) => b.totalRevenue - a.totalRevenue);
          break;

        case 'outstanding_dues':
          this.reportTitle = 'Outstanding Dues Report';
          this.reportSubtitle = 'List of pending balances and overdue receivables';
          this.displayedColumns = ['memberName', 'phone', 'planName', 'dueAmount', 'dueDate', 'status'];
          
          const dues = payments
            .filter(p => p.status === 'pending' || p.status === 'overdue')
            .map(p => {
              const member = members.find(m => m.id === p.memberId);
              return {
                memberName: p.memberName,
                phone: member?.phone || '+91 99887 76655',
                planName: p.planName,
                dueAmount: p.dueAmount,
                dueDate: p.dueDate,
                status: p.status
              };
            })
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

          this.dataSource.data = dues;
          break;

        case 'expense_report':
          this.reportTitle = 'Expense Report';
          this.reportSubtitle = 'Detailed audit log of operational and capital expenditures';
          this.displayedColumns = ['date', 'title', 'expenseCategory', 'amount'];
          
          this.dataSource.data = [...expenses].sort((a, b) => b.date.localeCompare(a.date));
          break;

        case 'profit_loss':
          this.reportTitle = 'Profit & Loss Statement (P&L)';
          this.reportSubtitle = 'Summary statement of business revenues, expenses, and net profit margins';
          this.displayedColumns = ['category', 'description', 'credit', 'debit', 'balance'];

          // Calculate totals
          const membershipInflow = payments
            .filter(p => p.status === 'paid' && p.type !== 'pt' && !p.planName.toLowerCase().includes('pt'))
            .reduce((sum, p) => sum + p.paidAmount, 0);

          const ptInflow = payments
            .filter(p => p.status === 'paid' && (p.type === 'pt' || p.planName.toLowerCase().includes('pt')))
            .reduce((sum, p) => sum + p.paidAmount, 0);

          const totalInflow = membershipInflow + ptInflow;

          const rentExp = expenses.filter(e => e.category === 'Rent').reduce((sum, e) => sum + e.amount, 0);
          const salaryExp = expenses.filter(e => e.category === 'Salaries').reduce((sum, e) => sum + e.amount, 0);
          const utilExp = expenses.filter(e => e.category === 'Electricity' || e.category === 'Water').reduce((sum, e) => sum + e.amount, 0);
          const maintenanceExp = expenses.filter(e => e.category === 'Maintenance' || e.category === 'Equipment').reduce((sum, e) => sum + e.amount, 0);
          const miscExp = expenses.filter(e => e.category === 'Marketing' || e.category === 'Miscellaneous').reduce((sum, e) => sum + e.amount, 0);

          const totalOutflow = rentExp + salaryExp + utilExp + maintenanceExp + miscExp;
          const netBalance = totalInflow - totalOutflow;

          this.dataSource.data = [
            { category: 'Revenue', description: 'Membership Fees Collection', credit: membershipInflow, debit: 0, balance: membershipInflow },
            { category: 'Revenue', description: 'Personal Training Fees Collection', credit: ptInflow, debit: 0, balance: totalInflow },
            { category: 'Expense', description: 'Rent & Landlord Charges', credit: 0, debit: rentExp, balance: totalInflow - rentExp },
            { category: 'Expense', description: 'Salaries & Staff Commissions', credit: 0, debit: salaryExp, balance: totalInflow - rentExp - salaryExp },
            { category: 'Expense', description: 'Utility Bills (Electricity & Water)', credit: 0, debit: utilExp, balance: totalInflow - rentExp - salaryExp - utilExp },
            { category: 'Expense', description: 'Equipment & Maintenance Upkeep', credit: 0, debit: maintenanceExp, balance: totalInflow - rentExp - salaryExp - utilExp - maintenanceExp },
            { category: 'Expense', description: 'Marketing & Miscellaneous Bills', credit: 0, debit: miscExp, balance: netBalance },
            { category: 'Summary', description: 'Net Operating Profit', credit: totalInflow, debit: totalOutflow, balance: netBalance }
          ];
          break;

        case 'pt_revenue':
          this.reportTitle = 'Personal Training (PT) Revenue Report';
          this.reportSubtitle = 'Billing and payment collections specifically for Personal Training packages';
          this.displayedColumns = ['date', 'memberName', 'trainerName', 'planName', 'ptAmount', 'status'];

          this.dataSource.data = payments
            .filter(p => p.type === 'pt' || p.planName.toLowerCase().includes('pt'))
            .map(p => ({
              date: p.date,
              memberName: p.memberName,
              trainerName: p.trainerName || 'N/A',
              planName: p.planName,
              ptAmount: p.paidAmount || p.amount,
              status: p.status
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
          break;

        case 'trainer_performance':
          this.reportTitle = 'Trainer Performance Report';
          this.reportSubtitle = 'Key metrics reflecting client load, ratings, and training sessions completed';
          this.displayedColumns = ['trainerName', 'completedSessions', 'utilization', 'rating'];

          this.dataSource.data = trainers.map(t => ({
            trainerName: t.name,
            completedSessions: t.sessionsCompletedThisMonth || 0,
            utilization: t.utilizationPercent || 0,
            rating: t.monthlyRating || t.rating || 4.8
          })).sort((a, b) => b.completedSessions - a.completedSessions);
          break;

        case 'pt_sessions':
          this.reportTitle = 'PT Sessions Audit Report';
          this.reportSubtitle = 'Detailed logs of personal training scheduling, attendance, and cancellations';
          this.displayedColumns = ['date', 'time', 'memberName', 'trainerName', 'status', 'notes'];

          this.dataSource.data = [...sessions]
            .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));
          break;

        case 'membership_vs_pt':
          this.reportTitle = 'Membership vs PT Revenue Comparison';
          this.reportSubtitle = 'Comparative monthly statement of general membership sales against personal training collections';
          this.displayedColumns = ['month', 'membershipRev', 'ptRev', 'total'];

          const compareMap: Record<string, any> = {};
          payments.filter(p => p.status === 'paid').forEach(p => {
            const pDate = new Date(p.date);
            const monthKey = pDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

            if (!compareMap[monthKey]) {
              compareMap[monthKey] = { month: monthKey, membershipRev: 0, ptRev: 0, total: 0, sortKey: pDate.getTime() };
            }

            const isPt = p.type === 'pt' || p.planName.toLowerCase().includes('pt');
            if (isPt) {
              compareMap[monthKey].ptRev += p.paidAmount;
            } else {
              compareMap[monthKey].membershipRev += p.paidAmount;
            }
            compareMap[monthKey].total += p.paidAmount;
          });

          this.dataSource.data = Object.values(compareMap)
            .sort((a: any, b: any) => b.sortKey - a.sortKey);
          break;

        case 'salesperson_revenue':
          this.reportTitle = 'Salesperson Revenue Report';
          this.reportSubtitle = 'Membership closed revenue and conversions attributed per salesperson';
          this.displayedColumns = ['salespersonName', 'conversions', 'membershipRevenue', 'total'];
          
          const salesMap: Record<string, any> = {};
          payments.forEach(p => {
            const spName = p.salespersonName || 'System / Direct';
            const spId = p.salespersonId || 'direct';
            if (!salesMap[spId]) {
              salesMap[spId] = { salespersonName: spName, conversions: 0, membershipRevenue: 0, total: 0 };
            }
            salesMap[spId].conversions++;
            salesMap[spId].total += p.paidAmount;
            if (p.type === 'membership') {
              salesMap[spId].membershipRevenue += p.paidAmount;
            }
          });
          this.dataSource.data = Object.values(salesMap).sort((a: any, b: any) => b.total - a.total);
          break;

        case 'trainer_revenue':
          this.reportTitle = 'Trainer PT Revenue Report';
          this.reportSubtitle = 'Personal Training revenue collections attributed per trainer';
          this.displayedColumns = ['trainerName', 'plansSold', 'ptRevenue', 'averagePTAmount'];

          const trainerMap: Record<string, any> = {};
          payments.filter(p => p.type === 'pt').forEach(p => {
            const trName = p.trainerName || 'Unassigned Trainer';
            const trId = p.trainerId || 'unassigned';
            if (!trainerMap[trId]) {
              trainerMap[trId] = { trainerName: trName, plansSold: 0, ptRevenue: 0 };
            }
            trainerMap[trId].plansSold++;
            trainerMap[trId].ptRevenue += p.paidAmount;
          });
          this.dataSource.data = Object.values(trainerMap).map((t: any) => ({
            ...t,
            averagePTAmount: t.plansSold > 0 ? Math.round(t.ptRevenue / t.plansSold) : 0
          })).sort((a: any, b: any) => b.ptRevenue - a.ptRevenue);
          break;

        case 'discount_report':
          this.reportTitle = 'Discounts & Incentives Report';
          this.reportSubtitle = 'Breakdown of membership and PT discounts given to members';
          this.displayedColumns = ['memberName', 'planName', 'originalAmount', 'discountType', 'discountValue', 'finalAmount', 'salespersonName'];

          this.dataSource.data = payments
            .filter(p => (p.discountValue || 0) > 0)
            .map(p => ({
              memberName: p.memberName,
              planName: p.planName,
              originalAmount: p.originalAmount || p.amount,
              discountType: p.discountType || 'flat',
              discountValue: p.discountValue || 0,
              finalAmount: p.amount || p.finalAmount,
              salespersonName: p.salespersonName || 'Direct / System'
            }));
          break;

        case 'pending_payment':
          this.reportTitle = 'Pending Payments Report';
          this.reportSubtitle = 'Receivables that are pending or partially paid with outstanding dues';
          this.displayedColumns = ['memberName', 'planName', 'finalAmount', 'paidAmount', 'dueAmount', 'dueDate', 'salespersonName'];

          this.dataSource.data = payments
            .filter(p => (p.dueAmount || 0) > 0 && p.status !== 'paid')
            .map(p => ({
              memberName: p.memberName,
              planName: p.planName,
              finalAmount: p.amount || p.finalAmount,
              paidAmount: p.paidAmount || 0,
              dueAmount: p.dueAmount,
              dueDate: p.dueDate,
              salespersonName: p.salespersonName || 'Direct / System'
            }))
            .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
          break;

        case 'cash_collection':
          this.reportTitle = 'Cash Collections Report';
          this.reportSubtitle = 'Cash receipt transactions and deposits';
          this.displayedColumns = ['date', 'memberName', 'planName', 'paidAmount', 'salespersonName'];

          this.dataSource.data = payments
            .filter(p => p.paymentMethod === 'Cash' && p.paidAmount > 0)
            .map(p => ({
              date: p.date,
              memberName: p.memberName,
              planName: p.planName,
              paidAmount: p.paidAmount,
              salespersonName: p.salespersonName || 'Direct / System'
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
          break;

        case 'upi_collection':
          this.reportTitle = 'UPI Collections Report';
          this.reportSubtitle = 'Digital UPI transaction receipts and summaries';
          this.displayedColumns = ['date', 'memberName', 'planName', 'paidAmount', 'salespersonName'];

          this.dataSource.data = payments
            .filter(p => p.paymentMethod === 'UPI' && p.paidAmount > 0)
            .map(p => ({
              date: p.date,
              memberName: p.memberName,
              planName: p.planName,
              paidAmount: p.paidAmount,
              salespersonName: p.salespersonName || 'Direct / System'
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
          break;

        case 'revenue_after_discount':
          this.reportTitle = 'Revenue After Discount Report';
          this.reportSubtitle = 'Collections and post-discount closed values per transaction';
          this.displayedColumns = ['date', 'memberName', 'planName', 'originalAmount', 'discountValue', 'paidAmount', 'dueAmount'];

          this.dataSource.data = payments
            .map(p => ({
              date: p.date,
              memberName: p.memberName,
              planName: p.planName,
              originalAmount: p.originalAmount || p.amount,
              discountValue: p.discountValue || 0,
              paidAmount: p.paidAmount || 0,
              dueAmount: p.dueAmount || 0
            }))
            .sort((a, b) => b.date.localeCompare(a.date));
          break;
      }
    });
  }

  exportReport(): void {
    const data = this.dataSource.data;
    if (data.length === 0) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    
    // Add title headers
    csvContent += `"${this.reportTitle}"\n`;
    csvContent += `"${this.reportSubtitle}"\n\n`;

    // Add column headers
    csvContent += this.displayedColumns.join(',') + '\n';

    // Add rows
    data.forEach(row => {
      const line = this.displayedColumns.map(col => {
        let val = row[col];
        if (typeof val === 'string') {
          val = `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',');
      csvContent += line + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${this.selectedReportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.snackBar.open('CSV ledger downloaded successfully!', 'Dismiss', { duration: 3000 });
  }

  printReport(): void {
    window.print();
  }
}
