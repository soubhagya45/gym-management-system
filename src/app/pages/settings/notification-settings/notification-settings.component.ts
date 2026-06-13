import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GymState } from '../../../presentation/state/gym.state';
import { Gym } from '../../../core/models/gym.entity';

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="settings-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="title-area">
          <h1>Notification Settings</h1>
          <p>Configure automated messaging triggers, alert rules, and select broadcast channels for members and staff.</p>
        </div>
      </div>

      <div class="content-body" *ngIf="activeGym; else loading">
        <form [formGroup]="notificationForm" (ngSubmit)="onSave()" class="settings-form-layout">
          <div class="settings-grid">
            
            <!-- Left Card: Customer Message Toggles -->
            <div class="settings-col">
              <div class="mat-card settings-card">
                <div class="card-title-row">
                  <mat-icon class="title-icon">message</mat-icon>
                  <h2>Member Alerts Configuration</h2>
                </div>
                <p class="section-desc">Enable or disable automatic reminders sent to customers regarding their accounts.</p>

                <div class="toggles-list">
                  <!-- Renewal Reminders -->
                  <div class="toggle-item">
                    <div class="toggle-info">
                      <span class="toggle-title">Renewal Reminders</span>
                      <span class="toggle-desc">Notify members when their membership plan is nearing its expiration date.</span>
                    </div>
                    <mat-slide-toggle formControlName="renewalRemindersEnabled"></mat-slide-toggle>
                  </div>

                  <mat-divider></mat-divider>

                  <!-- Payment Reminders -->
                  <div class="toggle-item">
                    <div class="toggle-info">
                      <span class="toggle-title">Payment Due Reminders</span>
                      <span class="toggle-desc">Remind members of unpaid or pending membership invoices.</span>
                    </div>
                    <mat-slide-toggle formControlName="paymentRemindersEnabled"></mat-slide-toggle>
                  </div>

                  <mat-divider></mat-divider>

                  <!-- Attendance Reminders -->
                  <div class="toggle-item">
                    <div class="toggle-info">
                      <span class="toggle-title">Attendance Check-in Greetings</span>
                      <span class="toggle-desc">Send automated messages confirming attendance or encouraging workout consistency.</span>
                    </div>
                    <mat-slide-toggle formControlName="attendanceRemindersEnabled"></mat-slide-toggle>
                  </div>
                </div>
              </div>
            </div>

            <!-- Right Card: Operations Alerts -->
            <div class="settings-col">
              <div class="mat-card settings-card">
                <div class="card-title-row">
                  <mat-icon class="title-icon">support_agent</mat-icon>
                  <h2>Staff &amp; Operations Alerts</h2>
                </div>
                <p class="section-desc">Configure notifications triggered for internal staff duties and workflow automations.</p>

                <div class="toggles-list">
                  <!-- Lead Follow-ups -->
                  <div class="toggle-item">
                    <div class="toggle-info">
                      <span class="toggle-title">Lead Follow-ups Alert</span>
                      <span class="toggle-desc">Automatically alert assigned trainers/receptionists to call back new leads.</span>
                    </div>
                    <mat-slide-toggle formControlName="leadFollowUpsEnabled"></mat-slide-toggle>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Bottom Save Actions -->
          <div class="action-bar-footer">
            <button mat-raised-button color="primary" type="submit" class="save-settings-btn">
              <mat-icon>save</mat-icon>
              <span>Save Alert Preferences</span>
            </button>
          </div>
        </form>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <mat-icon class="spin-icon">sync</mat-icon>
          <p>Fetching alert configurations...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .settings-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .settings-form-layout {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .settings-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }
    .settings-col {
      display: flex;
      flex-direction: column;
    }
    .settings-card {
      display: flex;
      flex-direction: column;
      flex: 1;
    }
    .card-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      .title-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--accent-color);
      }
      h2 {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
      }
    }
    .section-desc {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
      margin: 0 0 24px 0;
    }
    .toggles-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .toggle-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      
      .toggle-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        
        .toggle-title {
          font-size: 14.5px;
          font-weight: 600;
          color: var(--text-primary);
        }
        
        .toggle-desc {
          font-size: 12px;
          color: var(--text-muted);
        }
      }
    }
    .action-bar-footer {
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid var(--border-color);
      padding-top: 20px;
      margin-top: 16px;
      
      .save-settings-btn {
        height: 46px !important;
        line-height: 46px !important;
        font-weight: 600 !important;
        border-radius: 8px !important;
        padding: 0 24px !important;
        box-shadow: var(--shadow-md) !important;
      }
    }
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--text-muted);
      .spin-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        animation: spin 1.5s infinite linear;
        margin-bottom: 16px;
        color: var(--accent-color);
      }
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    @media (max-width: 959.98px) {
      .settings-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class NotificationSettingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  notificationForm!: FormGroup;
  activeGym: Gym | null = null;

  constructor(
    private fb: FormBuilder,
    private gymState: GymState,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.notificationForm = this.fb.group({
      renewalRemindersEnabled: [true],
      paymentRemindersEnabled: [true],
      leadFollowUpsEnabled: [true],
      attendanceRemindersEnabled: [false]
    });

    this.gymState.activeGym$.pipe(takeUntil(this.destroy$)).subscribe(gym => {
      if (gym) {
        this.activeGym = gym;
        this.notificationForm.patchValue({
          renewalRemindersEnabled: gym.notificationSettings ? gym.notificationSettings.renewalRemindersEnabled : true,
          paymentRemindersEnabled: gym.notificationSettings ? gym.notificationSettings.paymentRemindersEnabled : true,
          leadFollowUpsEnabled: gym.notificationSettings ? gym.notificationSettings.leadFollowUpsEnabled : true,
          attendanceRemindersEnabled: gym.notificationSettings ? gym.notificationSettings.attendanceRemindersEnabled : false
        });
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSave(): void {
    if (this.activeGym) {
      const updated: Gym = {
        ...this.activeGym,
        notificationSettings: {
          renewalRemindersEnabled: !!this.notificationForm.value.renewalRemindersEnabled,
          paymentRemindersEnabled: !!this.notificationForm.value.paymentRemindersEnabled,
          leadFollowUpsEnabled: !!this.notificationForm.value.leadFollowUpsEnabled,
          attendanceRemindersEnabled: !!this.notificationForm.value.attendanceRemindersEnabled
        }
      };

      this.gymState.updateGym(updated).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.snackBar.open('Notification alert preferences saved successfully!', 'Dismiss', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(`Failed to save settings: ${err.message || err}`, 'Dismiss', { duration: 4000 });
        }
      });
    }
  }
}
