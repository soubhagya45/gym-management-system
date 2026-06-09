import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil, filter, map, distinctUntilChanged } from 'rxjs/operators';
import { GymState } from '../../presentation/state/gym.state';
import { Gym } from '../../core/models/gym.entity';
import { SubscriptionService, PLAN_PRICES, PLAN_FEATURES } from '../../domain/subscription/subscription.service';
import { MemberState } from '../../presentation/state/member.state';
import { TrainerState } from '../../presentation/state/trainer.state';
import { SaaSPayment, SubscriptionStatus, FeatureFlags } from '../../core/models/subscription.model';
import { SubscriptionPlan } from '../../core/enums/subscription-plans.enum';
import { CheckoutDialogComponent } from './checkout-dialog.component';

const PLAN_LABEL_MAP: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.FreeTrial]: 'Free Trial',
  [SubscriptionPlan.Basic]: 'Basic',
  [SubscriptionPlan.Pro]: 'Pro',
  [SubscriptionPlan.Enterprise]: 'Enterprise'
};

@Component({
  selector: 'app-settings',
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
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTabsModule,
    MatTableModule,
    MatProgressBarModule,
    MatDividerModule,
    MatDialogModule,
    CheckoutDialogComponent
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // General Gym Settings
  settingsForm!: FormGroup;
  isDarkMode = true;
  activeGym: Gym | null = null;

  // SaaS Subscription Settings
  activeGymBillingHistory: SaaSPayment[] = [];
  activePlanStatus: SubscriptionStatus | null = null;
  billingCycle: 'monthly' | 'yearly' = 'monthly';
  invoiceColumns = ['invoiceNumber', 'date', 'plan', 'paymentMethod', 'amount', 'status', 'actions'];

  readonly planPrices = PLAN_PRICES;
  readonly planFeatures = PLAN_FEATURES;
  readonly subscriptionPlans: SubscriptionPlan[] = [
    SubscriptionPlan.FreeTrial,
    SubscriptionPlan.Basic,
    SubscriptionPlan.Pro,
    SubscriptionPlan.Enterprise
  ];

  // Pre-computed plan labels map (no function calls in template loops)
  readonly planLabels = PLAN_LABEL_MAP;

  // Computed plan price texts (updated when billingCycle changes)
  planPriceTexts: Record<string, string> = {};

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private gymState: GymState,
    private subscriptionService: SubscriptionService,
    private memberState: MemberState,
    private trainerState: TrainerState,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.isDarkMode = document.body.classList.contains('dark-theme');
    this.computePlanPriceTexts();

    this.settingsForm = this.fb.group({
      gymName: ['', [Validators.required]],
      ownerName: ['', [Validators.required]],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: ['', [Validators.required]],
      address: ['742 Luxury Boulevard, Suite 100, Beverly Hills, CA 90210', [Validators.required]],
      currency: ['₹', [Validators.required]],
      taxRate: [8.5, [Validators.required, Validators.min(0), Validators.max(100)]],
      allowGuestPass: [true],
      sendExpiryAlerts: [true]
    });

    // Subscribe to active gym
    this.gymState.activeGym$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((a, b) => a?.gymId === b?.gymId && a?.subscriptionPlan === b?.subscriptionPlan)
    ).subscribe(gym => {
      this.activeGym = gym;
      if (gym) {
        this.settingsForm.patchValue({
          gymName: gym.gymName,
          ownerName: gym.ownerName,
          contactEmail: gym.email,
          contactPhone: gym.phone
        }, { emitEvent: false });
      }
      this.cdr.markForCheck();
    });

    // Subscribe to billing history separately
    this.gymState.activeGymBillingHistory$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(history => {
      this.activeGymBillingHistory = history;
      this.cdr.markForCheck();
    });

    // Compute usage counters — use separate subscriptions to avoid triple-emit combineLatest
    this.memberState.members$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(members => {
      if (this.activeGym) {
        this.refreshPlanStatus(members.length, null);
      }
      this.cdr.markForCheck();
    });

    this.trainerState.trainers$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(trainers => {
      if (this.activeGym) {
        this.refreshPlanStatus(null, trainers.length);
      }
      this.cdr.markForCheck();
    });
  }

  private _lastMemberCount = 0;
  private _lastTrainerCount = 0;

  private refreshPlanStatus(memberCount: number | null, trainerCount: number | null): void {
    if (memberCount !== null) this._lastMemberCount = memberCount;
    if (trainerCount !== null) this._lastTrainerCount = trainerCount;

    if (!this.activeGym) return;

    this.activePlanStatus = this.subscriptionService.getSubscriptionStatus(
      this.activeGym.subscriptionPlan,
      this.activeGym.createdAt,
      this._lastMemberCount,
      this._lastTrainerCount
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  computePlanPriceTexts(): void {
    const texts: Record<string, string> = {};
    for (const plan of this.subscriptionPlans) {
      texts[plan] = this.buildPriceText(plan);
    }
    this.planPriceTexts = texts;
  }

  private buildPriceText(plan: SubscriptionPlan): string {
    const prices = PLAN_PRICES[plan];
    if (plan === SubscriptionPlan.FreeTrial) return 'Free';
    if (this.billingCycle === 'yearly') {
      const monthly = Math.round(prices.yearly / 12);
      return `₹${monthly.toLocaleString('en-IN')}/mo · billed ₹${prices.yearly.toLocaleString('en-IN')}/yr`;
    }
    return `₹${prices.monthly.toLocaleString('en-IN')}/mo`;
  }

  onBillingCycleChange(cycle: 'monthly' | 'yearly'): void {
    this.billingCycle = cycle;
    this.computePlanPriceTexts();
    this.cdr.markForCheck();
  }

  // Handle global theme change
  onThemeToggle(checked: boolean): void {
    this.isDarkMode = checked;
    if (checked) {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    }
    this.snackBar.open(`Switched to ${checked ? 'Dark' : 'Light'} Mode`, 'Dismiss', { duration: 2000 });
    this.cdr.markForCheck();
  }

  onSaveSettings(): void {
    if (this.settingsForm.valid && this.activeGym) {
      const updated: Gym = {
        ...this.activeGym,
        gymName: this.settingsForm.value.gymName,
        ownerName: this.settingsForm.value.ownerName,
        email: this.settingsForm.value.contactEmail,
        phone: this.settingsForm.value.contactPhone
      };

      this.gymState.updateGym(updated).pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.snackBar.open('Gym configurations updated successfully!', 'Dismiss', { duration: 3000 });
      });
    }
  }

  // SaaS Upgrades Handlers
  onUpgradePlan(plan: SubscriptionPlan): void {
    if (!this.activeGym) return;

    if (this.activeGym.subscriptionPlan === plan) {
      this.snackBar.open('This plan is already active for your gym.', 'Dismiss', { duration: 3000 });
      return;
    }

    if (plan === SubscriptionPlan.FreeTrial) {
      this.snackBar.open('Free Trial can only be activated at initial registration.', 'Dismiss', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(CheckoutDialogComponent, {
      width: '550px',
      data: { plan, billingCycle: this.billingCycle }
    });

    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(result => {
      if (result) {
        const priceObj = PLAN_PRICES[plan];
        const finalPrice = this.billingCycle === 'yearly' ? priceObj.yearly : priceObj.monthly;

        this.gymState.upgradeActiveGymSubscription(plan, result.paymentMethod, finalPrice)
          .pipe(takeUntil(this.destroy$))
          .subscribe(() => {
            this.snackBar.open(`Successfully upgraded to ${this.planLabels[plan]} plan!`, 'Dismiss', { duration: 4000 });
            this.computePlanPriceTexts();
            this.cdr.markForCheck();
          });
      }
    });
  }

  getPlanLabel(plan: SubscriptionPlan): string {
    return PLAN_LABEL_MAP[plan] ?? 'Tier';
  }

  isUnlimited(val: number): boolean {
    return val === Infinity || val > 10000;
  }

  getMemberProgressValue(): number {
    if (!this.activePlanStatus) return 0;
    if (this.isUnlimited(this.activePlanStatus.memberLimit)) return 0;
    return Math.min((this.activePlanStatus.memberCount / this.activePlanStatus.memberLimit) * 100, 100);
  }

  getTrainerProgressValue(): number {
    if (!this.activePlanStatus) return 0;
    if (this.isUnlimited(this.activePlanStatus.trainerLimit)) return 0;
    return Math.min((this.activePlanStatus.trainerCount / this.activePlanStatus.trainerLimit) * 100, 100);
  }

  getMemberProgressColor(): 'primary' | 'warn' {
    if (!this.activePlanStatus || this.isUnlimited(this.activePlanStatus.memberLimit)) return 'primary';
    return (this.activePlanStatus.memberCount / this.activePlanStatus.memberLimit) >= 0.9 ? 'warn' : 'primary';
  }

  getTrainerProgressColor(): 'primary' | 'warn' {
    if (!this.activePlanStatus || this.isUnlimited(this.activePlanStatus.trainerLimit)) return 'primary';
    return (this.activePlanStatus.trainerCount / this.activePlanStatus.trainerLimit) >= 0.9 ? 'warn' : 'primary';
  }

  getPlanBadgeClass(plan: SubscriptionPlan): string {
    switch (plan) {
      case SubscriptionPlan.FreeTrial: return 'badge-free';
      case SubscriptionPlan.Basic: return 'badge-basic';
      case SubscriptionPlan.Pro: return 'badge-pro';
      case SubscriptionPlan.Enterprise: return 'badge-enterprise';
      default: return '';
    }
  }

  printInvoice(invoice: SaaSPayment): void {
    this.snackBar.open(`Generating PDF receipt for Invoice #${invoice.invoiceNumber}...`, 'Dismiss', { duration: 3000 });
  }
}
