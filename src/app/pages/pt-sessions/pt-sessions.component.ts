import { Component, Inject, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';

import { PTState } from '../../presentation/state/pt.state';
import { MemberState } from '../../presentation/state/member.state';
import { TrainerState } from '../../presentation/state/trainer.state';
import { PTSession } from '../../core/models/pt-session.entity';
import { MemberPTPlan } from '../../core/models/member-pt-plan.entity';
import { Trainer } from '../../core/models/trainer.entity';

@Component({
  selector: 'app-pt-sessions',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTabsModule,
    MatDividerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  templateUrl: './pt-sessions.component.html',
  styleUrls: ['./pt-sessions.component.scss']
})
export class PtSessionsComponent implements OnInit {
  sessions: PTSession[] = [];
  filteredSessions: PTSession[] = [];
  activeTab: 'all' | 'scheduled' | 'completed' | 'cancelled' = 'all';

  activeWallets: MemberPTPlan[] = [];
  trainers: Trainer[] = [];
  
  sessionColumns = ['date', 'time', 'memberName', 'trainerName', 'status', 'actions'];

  constructor(
    private ptState: PTState,
    private trainerState: TrainerState,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Subscribe to PT sessions
    this.ptState.ptSessions$.subscribe(sessions => {
      this.sessions = sessions;
      this.applyFilters();
    });

    // Subscribe to active wallets to let user schedule sessions
    this.ptState.memberPTPlans$.subscribe(wallets => {
      this.activeWallets = wallets.filter(w => w.status === 'active' && w.remainingSessions > 0);
    });

    // Subscribe to trainers
    this.trainerState.trainers$.subscribe(trainers => {
      this.trainers = trainers.filter(t => t.status === 'active');
    });
  }

  setTab(tab: 'all' | 'scheduled' | 'completed' | 'cancelled'): void {
    this.activeTab = tab;
    this.applyFilters();
  }

  applyFilters(): void {
    if (this.activeTab === 'all') {
      this.filteredSessions = [...this.sessions];
    } else {
      this.filteredSessions = this.sessions.filter(s => s.status === this.activeTab);
    }

    // Sort by date (latest first)
    this.filteredSessions.sort((a, b) => b.date.localeCompare(a.date));
  }

  openScheduleDialog(): void {
    if (this.activeWallets.length === 0) {
      this.snackBar.open('No active PT clients available with remaining sessions.', 'Dismiss', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(PTSessionScheduleDialogComponent, {
      width: '550px',
      data: {
        wallets: this.activeWallets,
        trainers: this.trainers
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const selectedWallet = this.activeWallets.find(w => w.memberId === result.memberId)!;
        
        this.ptState.addPTSession({
          memberId: selectedWallet.memberId,
          memberName: selectedWallet.memberName,
          trainerId: selectedWallet.trainerId,
          trainerName: selectedWallet.trainerName,
          date: result.date,
          time: result.time,
          status: 'scheduled',
          attendanceStatus: 'pending',
          notes: result.notes || ''
        }).subscribe(() => {
          this.snackBar.open('PT Session scheduled successfully!', 'Dismiss', { duration: 3000 });
        });
      }
    });
  }

  completeSession(session: PTSession): void {
    if (confirm(`Mark session for ${session.memberName} with trainer ${session.trainerName} as COMPLETED?`)) {
      this.ptState.completePTSession(session).subscribe(() => {
        this.snackBar.open('Session marked as completed. Wallet adjusted.', 'Dismiss', { duration: 3000 });
      });
    }
  }

  cancelSession(session: PTSession): void {
    const notes = prompt('Enter cancellation reason (optional):');
    if (notes !== null) {
      this.ptState.cancelPTSession(session, notes).subscribe(() => {
        this.snackBar.open('Session marked as cancelled.', 'Dismiss', { duration: 3000 });
      });
    }
  }

  rescheduleSession(session: PTSession): void {
    const dialogRef = this.dialog.open(PTSessionRescheduleDialogComponent, {
      width: '400px',
      data: { session }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.ptState.reschedulePTSession(session, result.date, result.time, result.notes).subscribe(() => {
          this.snackBar.open('Session rescheduled successfully.', 'Dismiss', { duration: 3000 });
        });
      }
    });
  }
}

// Dialog: Schedule PT Session
@Component({
  selector: 'app-pt-session-schedule-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title class="gradient-text">Schedule PT Session</h2>
    <form [formGroup]="scheduleForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        <div class="form-grid">
          <!-- Member Selection -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>PT Member (Active Wallet)</mat-label>
            <mat-select formControlName="memberId">
              <mat-option *ngFor="let w of data.wallets" [value]="w.memberId">
                {{ w.memberName }} ({{ w.planName }} - {{ w.remainingSessions }} left)
              </mat-option>
            </mat-select>
            <mat-error *ngIf="scheduleForm.get('memberId')?.hasError('required')">Member is required</mat-error>
          </mat-form-field>

          <!-- Assigned Trainer (Read-only reference) -->
          <div class="trainer-preview" *ngIf="assignedTrainerName">
            <span>Assigned Trainer:</span>
            <strong>{{ assignedTrainerName }}</strong>
          </div>

          <!-- Date -->
          <mat-form-field appearance="outline">
            <mat-label>Session Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="date">
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error *ngIf="scheduleForm.get('date')?.hasError('required')">Date is required</mat-error>
          </mat-form-field>

          <!-- Time -->
          <mat-form-field appearance="outline">
            <mat-label>Session Time</mat-label>
            <mat-select formControlName="time">
              <mat-option *ngFor="let slot of timeSlots" [value]="slot">{{ slot }}</mat-option>
            </mat-select>
            <mat-error *ngIf="scheduleForm.get('time')?.hasError('required')">Time is required</mat-error>
          </mat-form-field>

          <!-- Notes -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Focus / Notes</mat-label>
            <textarea matInput formControlName="notes" rows="2" placeholder="e.g. Leg workout, upper body strength..."></textarea>
          </mat-form-field>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="scheduleForm.invalid">Schedule</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .dialog-content {
      padding-top: 10px !important;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .w-100 {
      grid-column: span 2;
    }
    .trainer-preview {
      grid-column: span 2;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      padding: 12px;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13.5px;
      color: var(--text-secondary);
      
      strong {
        color: var(--text-primary);
        font-weight: 600;
      }
    }
  `]
})
export class PTSessionScheduleDialogComponent implements OnInit {
  scheduleForm!: FormGroup;
  assignedTrainerName = '';
  timeSlots: string[] = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PTSessionScheduleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { wallets: MemberPTPlan[], trainers: Trainer[] }
  ) {}

  ngOnInit(): void {
    this.scheduleForm = this.fb.group({
      memberId: ['', Validators.required],
      date: [new Date(), Validators.required],
      time: ['08:00 AM', Validators.required],
      notes: ['']
    });

    this.scheduleForm.get('memberId')?.valueChanges.subscribe(memberId => {
      const selected = this.data.wallets.find(w => w.memberId === memberId);
      this.assignedTrainerName = selected ? selected.trainerName : '';
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.scheduleForm.valid) {
      const val = this.scheduleForm.value;
      const formatted = {
        memberId: val.memberId,
        date: this.formatDate(val.date),
        time: val.time,
        notes: val.notes
      };
      this.dialogRef.close(formatted);
    }
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }
}

// Dialog: Reschedule PT Session
@Component({
  selector: 'app-pt-session-reschedule-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title class="gradient-text">Reschedule Session</h2>
    <form [formGroup]="rescheduleForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        <div class="form-grid">
          <!-- Date -->
          <mat-form-field appearance="outline">
            <mat-label>New Date</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="date">
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error *ngIf="rescheduleForm.get('date')?.hasError('required')">Date is required</mat-error>
          </mat-form-field>

          <!-- Time -->
          <mat-form-field appearance="outline">
            <mat-label>New Time</mat-label>
            <mat-select formControlName="time">
              <mat-option *ngFor="let slot of timeSlots" [value]="slot">{{ slot }}</mat-option>
            </mat-select>
            <mat-error *ngIf="rescheduleForm.get('time')?.hasError('required')">Time is required</mat-error>
          </mat-form-field>

          <!-- Notes -->
          <mat-form-field appearance="outline" class="w-100">
            <mat-label>Reschedule Notes</mat-label>
            <textarea matInput formControlName="notes" rows="2" placeholder="e.g. Member requested change..."></textarea>
          </mat-form-field>
        </div>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="rescheduleForm.invalid">Reschedule</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .dialog-content {
      padding-top: 10px !important;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }
  `]
})
export class PTSessionRescheduleDialogComponent implements OnInit {
  rescheduleForm!: FormGroup;
  timeSlots: string[] = [
    '06:00 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM',
    '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
    '06:00 PM', '07:00 PM', '08:00 PM', '09:00 PM'
  ];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PTSessionRescheduleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { session: PTSession }
  ) {}

  ngOnInit(): void {
    const s = this.data.session;
    this.rescheduleForm = this.fb.group({
      date: [new Date(s.date), Validators.required],
      time: [s.time, Validators.required],
      notes: ['']
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.rescheduleForm.valid) {
      const val = this.rescheduleForm.value;
      this.dialogRef.close({
        date: this.formatDate(val.date),
        time: val.time,
        notes: val.notes
      });
    }
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }
}
