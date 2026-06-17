import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MemberState } from '../../presentation/state/member.state';
import { AttendanceState } from '../../presentation/state/attendance.state';
import { PaymentState } from '../../presentation/state/payment.state';
import { BodyProgressState } from '../../presentation/state/body-progress.state';
import { FinanceState } from '../../presentation/state/finance.state';
import { PTState } from '../../presentation/state/pt.state';
import { Member } from '../../core/models/member.entity';
import { Attendance } from '../../core/models/attendance.entity';
import { Payment } from '../../core/models/payment.entity';
import { BodyProgressEntry } from '../../core/models/body-progress.entity';
import { Invoice } from '../../core/models/finance.entity';
import { MemberPTPlan } from '../../core/models/member-pt-plan.entity';
import { PTSession } from '../../core/models/pt-session.entity';
import { TrainerAssignment } from '../../core/models/trainer-assignment.entity';
import { TrainerState } from '../../presentation/state/trainer.state';
import { Trainer } from '../../core/models/trainer.entity';
import { MemberDialogComponent } from './member-dialog.component';
import { LogBodyProgressDialogComponent } from './log-body-progress-dialog.component';
import { PTActionDialogComponent } from './pt-action-dialog.component';

@Component({
  selector: 'app-member-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './member-profile.component.html',
  styleUrls: ['./member-profile.component.scss']
})
export class MemberProfileComponent implements OnInit {
  memberId: string = '';
  member: Member | undefined;
  attendance: Attendance[] = [];
  payments: Payment[] = [];
  invoices: Invoice[] = [];
  progressEntries: BodyProgressEntry[] = [];
  
  // PT properties
  ptWallet: MemberPTPlan | undefined;
  ptSessions: PTSession[] = [];
  trainerAssignments: TrainerAssignment[] = [];
  trainersList: Trainer[] = [];
  assignedTrainer: Trainer | undefined;

  attendanceColumns = ['date', 'timeIn', 'status'];
  paymentColumns = ['id', 'planName', 'date', 'amount', 'status'];
  invoiceColumns = ['invoiceNumber', 'invoiceDate', 'finalAmount', 'paymentMethod', 'status'];
  progressColumns = ['date', 'weight', 'bodyFat', 'bmi', 'notes', 'actions'];
  
  // PT columns
  ptSessionColumns = ['date', 'time', 'trainerName', 'status', 'attendanceStatus', 'notes'];
  assignmentColumns = ['assignedDate', 'trainerName', 'status', 'ptGoal', 'notes'];

  weightHistory: { label: string; value: number }[] = [];
  fatHistory: { label: string; value: number }[] = [];
  selectedPhotoTab: 'front' | 'side' | 'back' = 'front';

  constructor(
    private route: ActivatedRoute,
    private memberState: MemberState,
    private attendanceState: AttendanceState,
    private paymentState: PaymentState,
    private progressState: BodyProgressState,
    private financeState: FinanceState,
    private ptState: PTState,
    private trainerState: TrainerState,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // 1. Get ID from Route Params
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.memberId = id;
        this.loadProfileData();
      }
    });
  }

  loadProfileData(): void {
    // 2. Fetch Member Profile details
    this.memberState.members$.subscribe(members => {
      this.member = members.find(m => m.id === this.memberId);
    });

    // Fetch PT Wallet
    this.ptState.memberPTPlans$.subscribe(wallets => {
      this.ptWallet = wallets.find(w => w.memberId === this.memberId);
      this.fetchAssignedTrainer();
    });

    // Fetch Trainers
    this.trainerState.trainers$.subscribe(trainers => {
      this.trainersList = trainers;
      this.fetchAssignedTrainer();
    });
    this.trainerState.loadTrainers();

    // Fetch PT Sessions
    this.ptState.ptSessions$.subscribe(sessions => {
      this.ptSessions = sessions.filter(s => s.memberId === this.memberId);
    });

    // Fetch Trainer Assignments
    this.ptState.trainerAssignments$.subscribe(assignments => {
      this.trainerAssignments = assignments.filter(a => a.memberId === this.memberId);
    });

    // 3. Fetch Attendance History for Member
    this.attendanceState.attendance$.subscribe(attList => {
      this.attendance = attList.filter(a => a.memberId === this.memberId);
    });

    // 4. Fetch Payment History for Member
    this.paymentState.payments$.subscribe(payList => {
      this.payments = payList.filter(p => p.memberId === this.memberId);
    });

    // Fetch Invoices History for Member
    this.financeState.invoices$.subscribe(invoiceList => {
      this.invoices = invoiceList.filter(inv => inv.memberId === this.memberId);
    });

    // 5. Fetch Fitness Progress Entries for Member
    this.progressState.entries$.subscribe(entries => {
      this.progressEntries = entries;
      const chronological = [...entries].reverse();
      this.weightHistory = chronological.map(e => ({
        label: this.formatDateLabel(e.date),
        value: e.weight
      }));
      this.fatHistory = chronological
        .filter(e => e.bodyFat !== undefined && e.bodyFat > 0)
        .map(e => ({
          label: this.formatDateLabel(e.date),
          value: e.bodyFat!
        }));
    });
    this.progressState.loadEntries(this.memberId);
  }

  openEditDialog(): void {
    if (!this.member) return;
    
    const dialogRef = this.dialog.open(MemberDialogComponent, {
      width: '600px',
      data: this.member
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.memberState.updateMember(result).subscribe(() => {
          this.snackBar.open('Member profile updated successfully!', 'Dismiss', {
            duration: 3000,
            panelClass: ['premium-snack']
          });
        });
      }
    });
  }

  // Helper metric calculations
  getDaysRemaining(): number {
    if (!this.member) return 0;
    const end = new Date(this.member.endDate).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  getDaysPercent(): number {
    if (!this.member) return 0;
    const start = new Date(this.member.startDate).getTime();
    const end = new Date(this.member.endDate).getTime();
    const now = new Date().getTime();
    const total = end - start;
    if (total <= 0) return 100;
    const elapsed = now - start;
    const percent = Math.round((elapsed / total) * 100);
    return Math.min(100, Math.max(0, percent));
  }

  // Weight progression generator
  generateWeightHistory(): { label: string; value: number }[] {
    if (!this.member) return [];
    const current = this.member.weight;
    const goal = this.member.fitnessGoal;
    let start = current;
    let step = 0;
    
    if (goal === 'Weight Loss') {
      start = current + 5.5;
      step = -1.1;
    } else if (goal === 'Muscle Gain' || goal === 'Strength Training') {
      start = current - 3.5;
      step = 0.7;
    } else {
      start = current + 1.5;
      step = -0.3;
    }
    
    return [
      { label: 'Jan', value: Number(start.toFixed(1)) },
      { label: 'Feb', value: Number((start + step).toFixed(1)) },
      { label: 'Mar', value: Number((start + 2 * step).toFixed(1)) },
      { label: 'Apr', value: Number((start + 3 * step).toFixed(1)) },
      { label: 'May', value: current }
    ];
  }

  getBMI(): number {
    if (!this.member || !this.member.height || !this.member.weight) return 0;
    const heightInMeters = this.member.height / 100;
    return Number((this.member.weight / (heightInMeters * heightInMeters)).toFixed(1));
  }

  getBMICategory(): string {
    const bmi = this.getBMI();
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal Weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  }

  // SVG Chart builders
  getSVGPath(data: { value: number }[]): string {
    if (!data.length) return '';
    const width = 450;
    const height = 150;
    const padding = 20;
    const values = data.map(d => d.value);
    const minVal = Math.min(...values) - 2;
    const maxVal = Math.max(...values) + 2;
    const valRange = maxVal - minVal || 1;
    const stepX = (width - padding * 2) / (data.length - 1);
    
    return data.map((d, index) => {
      const x = padding + index * stepX;
      const percent = (d.value - minVal) / valRange;
      const y = height - padding - (percent * (height - padding * 2));
      return `${x},${y}`;
    }).join(' ');
  }

  getSVGFillPath(data: { value: number }[]): string {
    if (!data.length) return '';
    const width = 450;
    const height = 150;
    const padding = 20;
    const values = data.map(d => d.value);
    const minVal = Math.min(...values) - 2;
    const maxVal = Math.max(...values) + 2;
    const valRange = maxVal - minVal || 1;
    const stepX = (width - padding * 2) / (data.length - 1);
    
    const linePoints = data.map((d, index) => {
      const x = padding + index * stepX;
      const percent = (d.value - minVal) / valRange;
      const y = height - padding - (percent * (height - padding * 2));
      return `${x},${y}`;
    });

    const startPoint = `${padding},${height - padding}`;
    const endPoint = `${padding + (data.length - 1) * stepX},${height - padding}`;

    return `M ${startPoint} L ${linePoints.join(' L ')} L ${endPoint} Z`;
  }

  formatDateLabel(dateStr: string): string {
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[parseInt(parts[1], 10) - 1];
        const day = parseInt(parts[2], 10);
        return `${month} ${day}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  }

  getWeightChange(): number {
    if (!this.member || this.member.startingWeight === undefined) return 0;
    const change = this.member.startingWeight - this.member.weight;
    return Math.round(change * 10) / 10;
  }

  getGoalCompletionPercentage(): number {
    if (!this.member || this.member.startingWeight === undefined) return 0;
    const start = this.member.startingWeight;
    const current = this.member.weight;
    const goal = this.member.goalWeight || start;

    const lost = start - current;
    const targetLoss = start - goal;

    let completion = 0;
    if (targetLoss > 0) {
      completion = (lost / targetLoss) * 100;
    } else if (targetLoss < 0) {
      const gained = current - start;
      const targetGain = goal - start;
      completion = (gained / targetGain) * 100;
    } else {
      completion = current === goal ? 100 : 0;
    }
    return Math.round(Math.max(0, Math.min(100, completion)));
  }

  getMeasurementStats(): any[] {
    if (this.progressEntries.length === 0) return [];

    // Sort oldest first to find start values
    const sorted = [...this.progressEntries].sort((a, b) => a.date.localeCompare(b.date));
    const start = sorted[0];
    const latest = sorted[sorted.length - 1];

    const keys: ('chest' | 'waist' | 'arms' | 'thighs' | 'shoulder')[] = ['chest', 'waist', 'arms', 'thighs', 'shoulder'];
    const names = { chest: 'Chest', waist: 'Waist', arms: 'Arms', thighs: 'Thighs', shoulder: 'Shoulder' };

    return keys.map(k => {
      const sVal = start[k];
      const cVal = latest[k];
      const diff = (sVal !== undefined && cVal !== undefined) ? (cVal - sVal) : 0;
      return {
        name: names[k],
        start: sVal,
        current: cVal,
        diff: Math.round(diff * 10) / 10
      };
    }).filter(s => s.start !== undefined || s.current !== undefined);
  }

  openLogProgressDialog(): void {
    if (!this.member) return;

    const dialogRef = this.dialog.open(LogBodyProgressDialogComponent, {
      width: '600px',
      data: { member: this.member },
      panelClass: 'glass-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.progressState.addEntry(result).subscribe({
          next: () => {
            this.snackBar.open('Fitness progress entry logged successfully!', 'Close', { duration: 3000 });
          },
          error: (err) => {
            this.snackBar.open(err.message || 'Error logging progress', 'Close', { duration: 3000 });
          }
        });
      }
    });
  }

  deleteProgressEntry(id: string): void {
    if (confirm('Are you sure you want to delete this progress entry?')) {
      this.progressState.deleteEntry(id, this.memberId).subscribe({
        next: () => {
          this.snackBar.open('Progress entry deleted', 'Close', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(err.message || 'Error deleting entry', 'Close', { duration: 3000 });
        }
      });
    }
  }

  openPTActionDialog(action: 'purchase' | 'change_trainer' | 'upgrade' | 'add_sessions'): void {
    if (!this.member) return;

    const dialogRef = this.dialog.open(PTActionDialogComponent, {
      width: '600px',
      data: {
        action,
        member: this.member,
        currentWallet: this.ptWallet
      },
      panelClass: 'glass-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;

      if (action === 'purchase') {
        const todayStr = new Date().toISOString().split('T')[0];
        const duration = result.plan.duration || 1;
        const end = new Date();
        end.setMonth(end.getMonth() + duration);
        const endStr = end.toISOString().split('T')[0];

        this.ptState.addMemberPTPlan({
          memberId: this.memberId,
          memberName: this.member!.name,
          trainerId: result.trainer.id,
          trainerName: result.trainer.name,
          planId: result.plan.id,
          planName: result.plan.name,
          price: result.plan.price,
          totalSessions: result.plan.numberOfSessions,
          completedSessions: 0,
          remainingSessions: result.plan.numberOfSessions,
          expiredSessions: 0,
          ptGoal: result.ptGoal || 'General Fitness',
          startDate: todayStr,
          endDate: endStr,
          status: 'active',
          history: [{
            action: 'assign',
            date: todayStr,
            trainerId: result.trainer.id,
            trainerName: result.trainer.name,
            planId: result.plan.id,
            planName: result.plan.name,
            notes: 'PT Package Purchased manually from profile'
          }]
        }, result.paymentStatus, result.paymentMethod).subscribe(() => {
          this.snackBar.open('PT package purchased successfully!', 'Close', { duration: 3000 });
        });
      } else if (action === 'change_trainer') {
        this.ptState.transferTrainer(
          this.ptWallet!.id,
          result.trainer.id,
          result.trainer.name,
          result.notes
        ).subscribe(() => {
          this.snackBar.open(`Successfully transferred trainer to ${result.trainer.name}`, 'Close', { duration: 3000 });
        });
      } else if (action === 'upgrade') {
        this.ptState.upgradePTPlan(
          this.ptWallet!.id,
          result.plan.id,
          result.plan.name,
          result.priceDifference,
          result.paymentMethod
        ).subscribe(() => {
          this.snackBar.open(`PT package upgraded to ${result.plan.name} successfully!`, 'Close', { duration: 3000 });
        });
      } else if (action === 'add_sessions') {
        this.ptState.addExtraSessions(
          this.ptWallet!.id,
          result.additionalSessions,
          result.price,
          result.paymentMethod
        ).subscribe(() => {
          this.snackBar.open(`Added ${result.additionalSessions} extra sessions to wallet.`, 'Close', { duration: 3000 });
        });
      }
    });
  }

  fetchAssignedTrainer(): void {
    if (this.ptWallet && this.ptWallet.trainerId) {
      this.assignedTrainer = this.trainersList.find(t => t.id === this.ptWallet!.trainerId);
    } else {
      this.assignedTrainer = undefined;
    }
  }
}
