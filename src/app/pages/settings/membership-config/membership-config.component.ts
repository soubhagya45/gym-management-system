import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GymState } from '../../../presentation/state/gym.state';
import { Gym } from '../../../core/models/gym.entity';

@Component({
  selector: 'app-membership-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSlideToggleModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="settings-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="title-area">
          <h1>Membership Configuration</h1>
          <p>Configure pricing models for standard recurring terms, auto-suspension thresholds, and renewal reminders.</p>
        </div>
      </div>

      <div class="content-body" *ngIf="activeGym; else loading">
        <form [formGroup]="membershipForm" (ngSubmit)="onSave()" class="settings-form-layout">
          <div class="settings-grid">
            <!-- Left Card: Plan Pricing Matrix -->
            <div class="settings-col">
              <div class="mat-card settings-card">
                <div class="card-title-row">
                  <mat-icon class="title-icon">local_offer</mat-icon>
                  <h2>Plan Pricing Tiers</h2>
                </div>
                <p class="section-desc">Specify default base pricing rates for members enrolling in recurring terms.</p>

                <div class="fields-stack">
                  <!-- Monthly -->
                  <mat-form-field appearance="outline">
                    <mat-label>Monthly Membership Rate (₹)</mat-label>
                    <input matInput type="number" formControlName="monthlyPrice">
                    <mat-icon matSuffix>event</mat-icon>
                    <mat-error *ngIf="membershipForm.get('monthlyPrice')?.hasError('required')">Monthly price is required</mat-error>
                  </mat-form-field>

                  <!-- Quarterly -->
                  <mat-form-field appearance="outline">
                    <mat-label>Quarterly Membership Rate (₹)</mat-label>
                    <input matInput type="number" formControlName="quarterlyPrice">
                    <mat-icon matSuffix>date_range</mat-icon>
                    <mat-error *ngIf="membershipForm.get('quarterlyPrice')?.hasError('required')">Quarterly price is required</mat-error>
                  </mat-form-field>

                  <!-- Half-Yearly -->
                  <mat-form-field appearance="outline">
                    <mat-label>Half-Yearly Membership Rate (₹)</mat-label>
                    <input matInput type="number" formControlName="halfYearlyPrice">
                    <mat-icon matSuffix>calendar_today</mat-icon>
                    <mat-error *ngIf="membershipForm.get('halfYearlyPrice')?.hasError('required')">Half-yearly price is required</mat-error>
                  </mat-form-field>

                  <!-- Annual -->
                  <mat-form-field appearance="outline">
                    <mat-label>Annual Membership Rate (₹)</mat-label>
                    <input matInput type="number" formControlName="annualPrice">
                    <mat-icon matSuffix>stars</mat-icon>
                    <mat-error *ngIf="membershipForm.get('annualPrice')?.hasError('required')">Annual price is required</mat-error>
                  </mat-form-field>
                </div>
              </div>
            </div>

            <!-- Right Card: Expiry & Reminders Rules -->
            <div class="settings-col">
              <div class="mat-card settings-card">
                <div class="card-title-row">
                  <mat-icon class="title-icon">rule</mat-icon>
                  <h2>Auto Expiry &amp; Renewal Rules</h2>
                </div>
                <p class="section-desc">Configure automated state-machine constraints and alert timelines for member profiles.</p>

                <div class="fields-stack">
                  <div class="toggles-list">
                    <!-- Auto Expiry Slide -->
                    <div class="toggle-item">
                      <div class="toggle-info">
                        <span class="toggle-title">Enable Automated Expiry</span>
                        <span class="toggle-desc">Automatically flag members as "expiring" or "inactive" on term end.</span>
                      </div>
                      <mat-slide-toggle formControlName="autoExpiryEnabled"></mat-slide-toggle>
                    </div>
                  </div>

                  <!-- Grace Days (conditional on autoExpiryEnabled) -->
                  <mat-form-field appearance="outline" *ngIf="membershipForm.get('autoExpiryEnabled')?.value">
                    <mat-label>Expiry Grace Period Buffer (Days)</mat-label>
                    <input matInput type="number" formControlName="autoExpiryGraceDays">
                    <mat-hint>Number of buffer days allowed to check-in post actual expiry date.</mat-hint>
                    <mat-error *ngIf="membershipForm.get('autoExpiryGraceDays')?.hasError('required')">Grace period is required</mat-error>
                  </mat-form-field>

                  <mat-divider class="my-3"></mat-divider>

                  <!-- Renewal Reminder days -->
                  <mat-form-field appearance="outline">
                    <mat-label>First Renewal Warning Alert (Days Before)</mat-label>
                    <input matInput type="number" formControlName="renewalReminderDays">
                    <mat-hint>Configure how many days prior to membership termination to trigger reminder lists.</mat-hint>
                    <mat-error *ngIf="membershipForm.get('renewalReminderDays')?.hasError('required')">Reminder timeline is required</mat-error>
                  </mat-form-field>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Actions Bar -->
          <div class="action-bar-footer">
            <button mat-raised-button color="primary" type="submit" [disabled]="membershipForm.invalid" class="save-settings-btn">
              <mat-icon>save</mat-icon>
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <mat-icon class="spin-icon">sync</mat-icon>
          <p>Fetching membership configurations...</p>
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
    .fields-stack {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .toggles-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 20px;
      margin-bottom: 8px;
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
    .my-3 {
      margin-top: 12px;
      margin-bottom: 12px;
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
export class MembershipConfigComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  membershipForm!: FormGroup;
  activeGym: Gym | null = null;

  constructor(
    private fb: FormBuilder,
    private gymState: GymState,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.membershipForm = this.fb.group({
      monthlyPrice: [0, [Validators.required, Validators.min(0)]],
      quarterlyPrice: [0, [Validators.required, Validators.min(0)]],
      halfYearlyPrice: [0, [Validators.required, Validators.min(0)]],
      annualPrice: [0, [Validators.required, Validators.min(0)]],
      autoExpiryEnabled: [true],
      autoExpiryGraceDays: [0, [Validators.required, Validators.min(0)]],
      renewalReminderDays: [7, [Validators.required, Validators.min(0)]]
    });

    // Handle expiry toggle disabling validator dynamically
    this.membershipForm.get('autoExpiryEnabled')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(enabled => {
        const graceCtrl = this.membershipForm.get('autoExpiryGraceDays');
        if (enabled) {
          graceCtrl?.setValidators([Validators.required, Validators.min(0)]);
        } else {
          graceCtrl?.clearValidators();
        }
        graceCtrl?.updateValueAndValidity();
        this.cdr.markForCheck();
      });

    this.gymState.activeGym$.pipe(takeUntil(this.destroy$)).subscribe(gym => {
      if (gym) {
        this.activeGym = gym;
        this.membershipForm.patchValue({
          monthlyPrice: gym.membershipSettings?.monthlyPrice || 1500,
          quarterlyPrice: gym.membershipSettings?.quarterlyPrice || 4000,
          halfYearlyPrice: gym.membershipSettings?.halfYearlyPrice || 7500,
          annualPrice: gym.membershipSettings?.annualPrice || 15000,
          autoExpiryEnabled: gym.membershipSettings ? gym.membershipSettings.autoExpiryEnabled : true,
          autoExpiryGraceDays: gym.membershipSettings ? gym.membershipSettings.autoExpiryGraceDays : 3,
          renewalReminderDays: gym.membershipSettings ? gym.membershipSettings.renewalReminderDays : 7
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
    if (this.membershipForm.valid && this.activeGym) {
      const updated: Gym = {
        ...this.activeGym,
        membershipSettings: {
          monthlyPrice: Number(this.membershipForm.value.monthlyPrice),
          quarterlyPrice: Number(this.membershipForm.value.quarterlyPrice),
          halfYearlyPrice: Number(this.membershipForm.value.halfYearlyPrice),
          annualPrice: Number(this.membershipForm.value.annualPrice),
          autoExpiryEnabled: !!this.membershipForm.value.autoExpiryEnabled,
          autoExpiryGraceDays: Number(this.membershipForm.value.autoExpiryGraceDays || 0),
          renewalReminderDays: Number(this.membershipForm.value.renewalReminderDays)
        }
      };

      this.gymState.updateGym(updated).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.snackBar.open('Membership configurations saved successfully!', 'Dismiss', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(`Failed to save settings: ${err.message || err}`, 'Dismiss', { duration: 4000 });
        }
      });
    }
  }
}
