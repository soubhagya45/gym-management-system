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
import { Member } from '../../core/models/member.entity';
import { Attendance } from '../../core/models/attendance.entity';
import { Payment } from '../../core/models/payment.entity';
import { MemberDialogComponent } from './member-dialog.component';

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
  
  attendanceColumns = ['date', 'timeIn', 'status'];
  paymentColumns = ['id', 'planName', 'date', 'amount', 'status'];
  
  weightHistory: { label: string; value: number }[] = [];

  constructor(
    private route: ActivatedRoute,
    private memberState: MemberState,
    private attendanceState: AttendanceState,
    private paymentState: PaymentState,
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
      if (this.member) {
        this.weightHistory = this.generateWeightHistory();
      }
    });

    // 3. Fetch Attendance History for Member
    this.attendanceState.attendance$.subscribe(attList => {
      this.attendance = attList.filter(a => a.memberId === this.memberId);
    });

    // 4. Fetch Payment History for Member
    this.paymentState.payments$.subscribe(payList => {
      this.payments = payList.filter(p => p.memberId === this.memberId);
    });
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
}
