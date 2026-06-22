import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Member } from '../../core/models/member.entity';
import { PTPlan } from '../../core/models/pt-plan.entity';
import { Trainer } from '../../core/models/trainer.entity';
import { MemberPTPlan } from '../../core/models/member-pt-plan.entity';
import { PTState } from '../../presentation/state/pt.state';
import { TrainerState } from '../../presentation/state/trainer.state';
import { PAYMENT_SETTINGS_REPOSITORY_TOKEN, IPaymentSettingsRepository } from '../../core/interfaces/repository.interfaces';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { BillingCalculationService } from '../../services/billing-calculation.service';
import { PaymentGatewayModalComponent } from '../../shared/components/payment-gateway-modal/payment-gateway-modal.component';

export interface PTActionDialogData {
  action: 'purchase' | 'change_trainer' | 'upgrade' | 'add_sessions';
  member: Member;
  currentWallet?: MemberPTPlan;
}

@Component({
  selector: 'app-pt-action-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  template: `
    <h2 mat-dialog-title class="gradient-text dialogue-title">
      {{ getTitle() }}
    </h2>
    
    <form [formGroup]="actionForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        <p class="dialog-desc">{{ getDescription() }}</p>
        
        <div class="form-grid">
          <!-- Action: purchase -->
          <ng-container *ngIf="data.action === 'purchase'">
            <mat-form-field appearance="outline">
              <mat-label>PT Plan</mat-label>
              <mat-select formControlName="ptPlanId">
                <mat-option *ngFor="let plan of ptPlans" [value]="plan.id">
                  {{ plan.name }} ({{ plan.numberOfSessions }} sessions - ₹{{ plan.price }})
                </mat-option>
              </mat-select>
              <mat-error *ngIf="actionForm.get('ptPlanId')?.hasError('required')">PT Plan is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Assign Trainer</mat-label>
              <mat-select formControlName="trainerId">
                <mat-option *ngFor="let trainer of trainers" [value]="trainer.id">
                  {{ trainer.name }} ({{ trainer.specialty }})
                </mat-option>
              </mat-select>
              <mat-error *ngIf="actionForm.get('trainerId')?.hasError('required')">Trainer is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>PT Goal</mat-label>
              <mat-select formControlName="ptGoal">
                <mat-option *ngFor="let goal of ptGoalOptions" [value]="goal">{{ goal }}</mat-option>
              </mat-select>
            </mat-form-field>
          </ng-container>

          <!-- Action: change_trainer -->
          <ng-container *ngIf="data.action === 'change_trainer'">
            <mat-form-field appearance="outline">
              <mat-label>New Trainer</mat-label>
              <mat-select formControlName="trainerId">
                <mat-option *ngFor="let trainer of trainers" [value]="trainer.id">
                  {{ trainer.name }} ({{ trainer.specialty }})
                </mat-option>
              </mat-select>
              <mat-error *ngIf="actionForm.get('trainerId')?.hasError('required')">Trainer selection is required</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-100-field">
              <mat-label>Transfer Reason / Notes</mat-label>
              <textarea matInput formControlName="notes" rows="3" placeholder="Explain reason for trainer transfer..."></textarea>
            </mat-form-field>
          </ng-container>

          <!-- Action: upgrade -->
          <ng-container *ngIf="data.action === 'upgrade'">
            <mat-form-field appearance="outline">
              <mat-label>Upgrade to PT Plan</mat-label>
              <mat-select formControlName="ptPlanId">
                <mat-option *ngFor="let plan of upgradePlans" [value]="plan.id">
                  {{ plan.name }} ({{ plan.numberOfSessions }} sessions - ₹{{ plan.price }})
                </mat-option>
              </mat-select>
              <mat-error *ngIf="actionForm.get('ptPlanId')?.hasError('required')">Plan selection is required</mat-error>
            </mat-form-field>
          </ng-container>

          <!-- Action: add_sessions -->
          <ng-container *ngIf="data.action === 'add_sessions'">
            <mat-form-field appearance="outline">
              <mat-label>Number of Sessions</mat-label>
              <input matInput type="number" formControlName="additionalSessions">
              <mat-error *ngIf="actionForm.get('additionalSessions')?.hasError('required')">Required</mat-error>
              <mat-error *ngIf="actionForm.get('additionalSessions')?.hasError('min')">Must be at least 1</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Price to Charge (₹)</mat-label>
              <input matInput type="number" formControlName="price">
              <mat-error *ngIf="actionForm.get('price')?.hasError('required')">Price is required</mat-error>
              <mat-error *ngIf="actionForm.get('price')?.hasError('min')">Must be at least 0</mat-error>
            </mat-form-field>
          </ng-container>

          <!-- Shared Billing Form Fields (only if action is not change_trainer) -->
          <ng-container *ngIf="data.action !== 'change_trainer'">
            <mat-form-field appearance="outline">
              <mat-label>Discount Type</mat-label>
              <mat-select formControlName="discountType">
                <mat-option value="none">No Discount</mat-option>
                <mat-option value="flat">Flat Discount (₹)</mat-option>
                <mat-option value="percentage">Percentage Discount (%)</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" *ngIf="actionForm.get('discountType')?.value !== 'none'">
              <mat-label>{{ actionForm.get('discountType')?.value === 'flat' ? 'Discount Amount (₹)' : 'Discount Percentage (%)' }}</mat-label>
              <input matInput type="number" formControlName="discountValue">
              <mat-error *ngIf="actionForm.get('discountValue')?.hasError('min')">Value must be greater than 0</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Paid Amount (₹)</mat-label>
              <input matInput type="number" formControlName="paidAmount">
              <mat-error *ngIf="actionForm.get('paidAmount')?.hasError('required')">Paid amount is required</mat-error>
              <mat-error *ngIf="actionForm.get('paidAmount')?.hasError('min')">Paid amount cannot be negative</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" *ngIf="actionForm.get('paidAmount')?.value > 0">
              <mat-label>Payment Method</mat-label>
              <mat-select formControlName="paymentMethod">
                <mat-option *ngFor="let method of availablePaymentMethods" [value]="method">{{ method }}</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" *ngIf="calculations.pendingAmount > 0">
              <mat-label>Outstanding Due Status</mat-label>
              <mat-select formControlName="paymentStatus">
                <mat-option value="pending">Pending (Standard)</mat-option>
                <mat-option value="overdue">Overdue (Immediate Action)</mat-option>
              </mat-select>
            </mat-form-field>
          </ng-container>
        </div>

        <!-- Live Billing Summary -->
        <div class="billing-summary" *ngIf="showSummary()">
          <h4>Live Billing Summary</h4>
          <div class="summary-row" *ngIf="data.action === 'purchase' && selectedPlan">
            <span>PT Package:</span>
            <strong>{{ selectedPlan.name }}</strong>
          </div>
          <div class="summary-row" *ngIf="data.action === 'upgrade' && selectedUpgradePlan && data.currentWallet">
            <span>Upgrade Difference:</span>
            <span>₹{{ selectedUpgradePlan.price }} - ₹{{ data.currentWallet.price }}</span>
          </div>
          <div class="summary-row" *ngIf="data.action === 'add_sessions'">
            <span>Extra Sessions:</span>
            <strong>{{ actionForm.get('additionalSessions')?.value }} sessions</strong>
          </div>

          <div class="summary-row">
            <span>Original Amount:</span>
            <span>₹{{ calculations.originalAmount | number:'1.2-2' }}</span>
          </div>

          <div class="summary-row" *ngIf="calculations.discountAmount > 0">
            <span>Discount:</span>
            <span class="danger-text">-₹{{ calculations.discountAmount | number:'1.2-2' }}</span>
          </div>

          <div class="summary-row">
            <span>Subtotal:</span>
            <span>₹{{ calculations.subtotal | number:'1.2-2' }}</span>
          </div>

          <div class="summary-row">
            <span>Tax (GST 18% inclusive):</span>
            <span>₹{{ calculations.taxAmount | number:'1.2-2' }}</span>
          </div>

          <mat-divider></mat-divider>

          <div class="summary-row total">
            <span>Final Amount (Payable):</span>
            <strong>₹{{ calculations.finalAmount | number:'1.2-2' }}</strong>
          </div>

          <div class="summary-row paid-row">
            <span>Paid Amount Now:</span>
            <span class="success-text">₹{{ calculations.paidAmount | number:'1.2-2' }}</span>
          </div>

          <div class="summary-row pending-row">
            <span>Outstanding Balance:</span>
            <strong [class.danger-text]="calculations.pendingAmount > 0" [class.success-text]="calculations.pendingAmount === 0">
              ₹{{ calculations.pendingAmount | number:'1.2-2' }}
            </strong>
          </div>

          <div class="summary-row">
            <span>Invoice Status:</span>
            <strong style="text-transform: capitalize;">{{ calculations.paymentStatus }}</strong>
          </div>

          <div class="summary-row commission" *ngIf="getTrainerName() && data.action === 'purchase'">
            <span>Trainer Commission (10%):</span>
            <span class="success-text">₹{{ (calculations.finalAmount * 0.10) | number:'1.2-2' }}</span>
          </div>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="actionForm.invalid">
          <mat-icon>{{ getSubmitIcon() }}</mat-icon>
          <span>{{ getSubmitText() }}</span>
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .dialogue-title {
      font-weight: 700;
      font-size: 22px;
      margin-bottom: 8px;
    }
    .dialog-desc {
      color: var(--text-secondary);
      font-size: 14px;
      margin-bottom: 20px;
    }
    .dialog-form-content {
      display: flex;
      flex-direction: column;
      padding-top: 10px !important;
      max-height: 60vh;
      overflow-y: auto;
      gap: 16px;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .w-100-field {
      grid-column: span 2;
    }
    .billing-summary {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      padding: 16px;
      border-radius: 12px;
      margin-top: 8px;

      h4 {
        margin-bottom: 12px;
        color: var(--accent-hover);
        font-size: 15px;
      }
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 13.5px;
      margin-bottom: 8px;
      color: var(--text-secondary);

      &.total {
        margin-top: 8px;
        padding-top: 8px;
        font-size: 15px;
        color: var(--text-primary);
      }
      &.commission {
        color: var(--success);
      }
    }
    .success-text {
      color: var(--success);
      font-weight: 600;
    }
    .danger-text {
      color: var(--warn, #f43f5e);
      font-weight: 600;
    }
    .dialog-actions {
      padding: 16px 0 0 0 !important;
      gap: 8px;
    }
    
    @media (max-width: 599.98px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      .w-100-field {
        grid-column: span 1;
      }
    }
  `]
})
export class PTActionDialogComponent implements OnInit {
  actionForm!: FormGroup;
  ptPlans: PTPlan[] = [];
  trainers: Trainer[] = [];
  upgradePlans: PTPlan[] = [];
  availablePaymentMethods: string[] = ['Cash'];
  private _matDialog!: MatDialog;

  selectedPlan: PTPlan | undefined;
  selectedUpgradePlan: PTPlan | undefined;

  ptGoalOptions: string[] = [
    'Weight Loss',
    'Muscle Gain',
    'Competition Prep',
    'Strength Training',
    'General Fitness',
    'Rehabilitation'
  ];

  constructor(
    private fb: FormBuilder,
    private ptState: PTState,
    private trainerState: TrainerState,
    private dialogRef: MatDialogRef<PTActionDialogComponent>,
    private billingCalc: BillingCalculationService,
    private tenantContext: TenantContextService,
    private snackBar: MatSnackBar,
    @Inject(PAYMENT_SETTINGS_REPOSITORY_TOKEN) private settingsRepo: IPaymentSettingsRepository,
    @Inject(MAT_DIALOG_DATA) public data: PTActionDialogData,
    matDialog: MatDialog
  ) {
    this._matDialog = matDialog;
  }

  ngOnInit(): void {
    this.ptState.ptPlans$.subscribe(plans => {
      this.ptPlans = plans.filter(p => p.isActive);
      if (this.data.action === 'upgrade' && this.data.currentWallet) {
        const currentPrice = this.data.currentWallet.price;
        this.upgradePlans = this.ptPlans.filter(p => p.price > currentPrice);
      }
    });

    this.trainerState.trainers$.subscribe(trainers => {
      // Exclude current trainer from Change Trainer list if applicable
      if (this.data.action === 'change_trainer' && this.data.currentWallet) {
        this.trainers = trainers.filter(t => t.status === 'active' && t.id !== this.data.currentWallet?.trainerId);
      } else {
        this.trainers = trainers.filter(t => t.status === 'active');
      }
    });

    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.settingsRepo.getSettings(gymId).subscribe(settings => {
        const enabled = settings.filter(s => s.enabled).map(s => s.provider as string);
        this.availablePaymentMethods = ['Cash', ...enabled.filter(p => p !== 'Cash')];
      });
    }

    this.initForm();
  }

  private initForm(): void {
    if (this.data.action === 'purchase') {
      this.actionForm = this.fb.group({
        ptPlanId: ['', Validators.required],
        trainerId: ['', Validators.required],
        ptGoal: ['General Fitness', Validators.required],
        discountType: ['none', Validators.required],
        discountValue: [0, [Validators.min(0)]],
        paidAmount: [0, [Validators.required, Validators.min(0)]],
        paymentStatus: ['pending', Validators.required],
        paymentMethod: ['Cash', Validators.required]
      });

      this.actionForm.get('ptPlanId')?.valueChanges.subscribe(planId => {
        this.selectedPlan = this.ptPlans.find(p => p.id === planId);
        setTimeout(() => {
          this.actionForm.get('paidAmount')?.setValue(this.calculations.finalAmount, { emitEvent: false });
        });
      });
    } else if (this.data.action === 'change_trainer') {
      this.actionForm = this.fb.group({
        trainerId: ['', Validators.required],
        notes: ['']
      });
    } else if (this.data.action === 'upgrade') {
      this.actionForm = this.fb.group({
        ptPlanId: ['', Validators.required],
        discountType: ['none', Validators.required],
        discountValue: [0, [Validators.min(0)]],
        paidAmount: [0, [Validators.required, Validators.min(0)]],
        paymentStatus: ['pending', Validators.required],
        paymentMethod: ['Cash', Validators.required]
      });

      this.actionForm.get('ptPlanId')?.valueChanges.subscribe(planId => {
        this.selectedUpgradePlan = this.ptPlans.find(p => p.id === planId);
        setTimeout(() => {
          this.actionForm.get('paidAmount')?.setValue(this.calculations.finalAmount, { emitEvent: false });
        });
      });
    } else if (this.data.action === 'add_sessions') {
      this.actionForm = this.fb.group({
        additionalSessions: [5, [Validators.required, Validators.min(1)]],
        price: [2500, [Validators.required, Validators.min(0)]],
        discountType: ['none', Validators.required],
        discountValue: [0, [Validators.min(0)]],
        paidAmount: [2500, [Validators.required, Validators.min(0)]],
        paymentStatus: ['pending', Validators.required],
        paymentMethod: ['Cash', Validators.required]
      });

      this.actionForm.get('price')?.valueChanges.subscribe(() => {
        setTimeout(() => {
          this.actionForm.get('paidAmount')?.setValue(this.calculations.finalAmount, { emitEvent: false });
        });
      });
    }

    if (this.data.action !== 'change_trainer') {
      this.actionForm.get('paidAmount')?.valueChanges.subscribe(val => {
        const finalTotal = this.calculations.finalAmount;
        if (val > finalTotal) {
          this.actionForm.get('paidAmount')?.setValue(finalTotal, { emitEvent: false });
        }
      });

      this.actionForm.get('discountType')?.valueChanges.subscribe(type => {
        const discountValCtrl = this.actionForm.get('discountValue');
        if (type === 'none') {
          discountValCtrl?.setValue(0);
          discountValCtrl?.clearValidators();
        } else {
          discountValCtrl?.setValidators([Validators.required, Validators.min(0.01)]);
        }
        discountValCtrl?.updateValueAndValidity();
        
        setTimeout(() => {
          const finalTotal = this.calculations.finalAmount;
          if (this.actionForm.get('paidAmount')?.value > finalTotal) {
            this.actionForm.get('paidAmount')?.setValue(finalTotal, { emitEvent: false });
          }
        });
      });

      this.actionForm.get('discountValue')?.valueChanges.subscribe(() => {
        setTimeout(() => {
          const finalTotal = this.calculations.finalAmount;
          if (this.actionForm.get('paidAmount')?.value > finalTotal) {
            this.actionForm.get('paidAmount')?.setValue(finalTotal, { emitEvent: false });
          }
        });
      });
    }
  }

  getTitle(): string {
    switch (this.data.action) {
      case 'purchase': return 'Purchase Personal Training';
      case 'change_trainer': return 'Transfer PT Trainer';
      case 'upgrade': return 'Upgrade PT Package';
      case 'add_sessions': return 'Add Extra Sessions';
    }
  }

  getDescription(): string {
    switch (this.data.action) {
      case 'purchase': return `Enroll ${this.data.member.name} in a personal training membership package.`;
      case 'change_trainer': return `Change trainer assignments for ${this.data.member.name}. Current Trainer: ${this.data.currentWallet?.trainerName || 'None'}`;
      case 'upgrade': return `Upgrade ${this.data.member.name}'s PT Package to a higher duration/tier.`;
      case 'add_sessions': return `Purchase top-up training sessions for ${this.data.member.name}.`;
    }
  }

  getSubmitText(): string {
    switch (this.data.action) {
      case 'purchase': return 'Purchase Package';
      case 'change_trainer': return 'Assign Trainer';
      case 'upgrade': return 'Confirm Upgrade';
      case 'add_sessions': return 'Add Sessions';
    }
  }

  getSubmitIcon(): string {
    switch (this.data.action) {
      case 'purchase': return 'shopping_cart';
      case 'change_trainer': return 'swap_horiz';
      case 'upgrade': return 'upgrade';
      case 'add_sessions': return 'add';
    }
  }

  showSummary(): boolean {
    if (this.data.action === 'change_trainer') return false;
    if (this.data.action === 'purchase' && !this.selectedPlan) return false;
    if (this.data.action === 'upgrade' && !this.selectedUpgradePlan) return false;
    return true;
  }

  getAmount(): number {
    if (this.data.action === 'purchase') {
      return this.selectedPlan ? this.selectedPlan.price : 0;
    }
    if (this.data.action === 'upgrade') {
      if (this.selectedUpgradePlan && this.data.currentWallet) {
        return Math.max(0, this.selectedUpgradePlan.price - this.data.currentWallet.price);
      }
      return 0;
    }
    if (this.data.action === 'add_sessions') {
      return this.actionForm ? (this.actionForm.get('price')?.value || 0) : 2500;
    }
    return 0;
  }

  get calculations() {
    const basePrice = this.getAmount();

    if (!this.actionForm) {
      return {
        originalAmount: basePrice,
        discountType: 'none' as const,
        discountValue: 0,
        discountAmount: 0,
        subtotal: basePrice,
        taxAmount: 0,
        finalAmount: basePrice,
        paidAmount: basePrice,
        pendingAmount: 0,
        paymentStatus: 'paid' as const
      };
    }

    const formValue = this.actionForm.value;
    return this.billingCalc.calculate({
      originalAmount: basePrice,
      discountType: formValue.discountType || 'none',
      discountValue: formValue.discountValue || 0,
      paidAmount: formValue.paidAmount || 0,
      dueDate: new Date().toISOString().split('T')[0]
    });
  }

  getTrainerName(): string {
    if (this.data.action === 'purchase') {
      const tId = this.actionForm.get('trainerId')?.value;
      return this.trainers.find(t => t.id === tId)?.name || '';
    }
    return this.data.currentWallet?.trainerName || '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.actionForm.invalid) return;

    const formValue = this.actionForm.value;

    // change_trainer has no payment — close directly
    if (this.data.action === 'change_trainer') {
      const trainer = this.trainers.find(t => t.id === formValue.trainerId)!;
      this.dialogRef.close({ trainer, notes: formValue.notes });
      return;
    }

    const paidNow = Number(this.calculations.paidAmount) || 0;
    const paymentMethod = paidNow > 0 ? formValue.paymentMethod : 'Cash';
    const gymId = this.tenantContext.getTenantId() || undefined;
    const memberName = this.data.member.name;

    const buildPayload = (gatewayTransactionId?: string) => {
      const base = {
        paymentMethod: paidNow > 0 ? paymentMethod : 'Pending',
        paidAmount: this.calculations.paidAmount,
        pendingAmount: this.calculations.pendingAmount,
        discountType: formValue.discountType,
        discountValue: formValue.discountValue,
        originalAmount: this.calculations.originalAmount,
        finalAmount: this.calculations.finalAmount,
        paymentStatus: this.calculations.paymentStatus,
        gatewayTransactionId: gatewayTransactionId || ''
      };

      if (this.data.action === 'purchase') {
        const plan = this.ptPlans.find(p => p.id === formValue.ptPlanId)!;
        const trainer = this.trainers.find(t => t.id === formValue.trainerId)!;
        return { ...base, plan, trainer, ptGoal: formValue.ptGoal };
      } else if (this.data.action === 'upgrade') {
        const plan = this.ptPlans.find(p => p.id === formValue.ptPlanId)!;
        return { ...base, plan, priceDifference: this.calculations.finalAmount };
      } else if (this.data.action === 'add_sessions') {
        return { ...base, additionalSessions: formValue.additionalSessions, price: this.calculations.finalAmount };
      }
      return base;
    };

    if (paidNow > 0) {
      const planName = this.data.action === 'purchase'
        ? (this.selectedPlan?.name || 'PT Plan')
        : this.data.action === 'upgrade'
          ? (this.selectedUpgradePlan?.name || 'PT Upgrade')
          : 'Extra PT Sessions';

      const gwRef = this._matDialog.open(PaymentGatewayModalComponent, {
        width: '500px',
        maxWidth: '98vw',
        disableClose: true,
        data: {
          amount: paidNow,
          paymentMethod,
          memberName,
          planName,
          invoiceRef: `PT-${Date.now()}`,
          gymId
        }
      });

      gwRef.afterClosed().subscribe(gwResult => {
        if (!gwResult || !gwResult.success) {
          this.snackBar.open('Payment cancelled. PT action not completed.', 'Dismiss', { duration: 4000 });
          return;
        }
        this.dialogRef.close(buildPayload(gwResult.transactionId));
      });
    } else {
      // No payment needed
      this.dialogRef.close(buildPayload());
    }
  }
}
