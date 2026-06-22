import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, Inject } from '@angular/core';
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
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject, forkJoin, Observable } from 'rxjs';
import { takeUntil, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { PAYMENT_SETTINGS_REPOSITORY_TOKEN, IPaymentSettingsRepository } from '../../../core/interfaces/repository.interfaces';
import { PaymentSettings } from '../../../core/models/payment-settings.model';
import { GymState } from '../../../presentation/state/gym.state';
import { Gym } from '../../../core/models/gym.entity';
import { SubscriptionService, PLAN_PRICES, PLAN_FEATURES } from '../../../domain/subscription/subscription.service';
import { MemberState } from '../../../presentation/state/member.state';
import { TrainerState } from '../../../presentation/state/trainer.state';
import { SaaSPayment, SubscriptionStatus } from '../../../core/models/subscription.model';
import { SubscriptionPlan } from '../../../core/enums/subscription-plans.enum';
import { CheckoutDialogComponent } from '../checkout-dialog.component';

const PLAN_LABEL_MAP: Record<SubscriptionPlan, string> = {
  [SubscriptionPlan.FreeTrial]: 'Free Trial',
  [SubscriptionPlan.Basic]: 'Basic',
  [SubscriptionPlan.Pro]: 'Pro',
  [SubscriptionPlan.Enterprise]: 'Enterprise'
};

@Component({
  selector: 'app-payment-settings',
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
    MatTableModule,
    MatProgressBarModule,
    MatDividerModule,
    MatTabsModule,
    MatDialogModule
  ],
  template: `
    <div class="settings-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="title-area">
          <h1>Payment Settings</h1>
          <p>Configure bank transfer details, adjust payment options, and manage your Apex Fit SaaS account subscription.</p>
        </div>
      </div>

      <mat-tab-group class="payment-tabs" animationDuration="250ms">
        
        <!-- TAB 1: BANK ACCOUNTS & GATEWAY CONFIG -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">account_balance</mat-icon>
            <span>Payment Gateways &amp; Banking</span>
          </ng-template>
          
          <div class="tab-content" *ngIf="activeGym; else loading">
            <form [formGroup]="paymentForm" (ngSubmit)="onSavePaymentSettings()" class="settings-form-layout">
              <div class="settings-grid">
                
                <!-- Left: Payment Methods -->
                <div class="settings-col">
                  <div class="mat-card settings-card">
                    <div class="card-title-row">
                      <mat-icon class="title-icon">credit_card</mat-icon>
                      <h2>Accepted Payment Options</h2>
                    </div>
                    <p class="section-desc">Toggle payment modes that members can use during invoice checkout sheets.</p>
                    
                    <div class="toggles-list">
                      <!-- UPI -->
                      <div class="toggle-item">
                        <div class="toggle-info">
                          <span class="toggle-title">Accept UPI Payments</span>
                          <span class="toggle-desc">Enable QR codes and UPI Intent apps checkouts.</span>
                        </div>
                        <mat-slide-toggle formControlName="enableUPI"></mat-slide-toggle>
                      </div>

                      <!-- Credit/Debit Card -->
                      <div class="toggle-item">
                        <div class="toggle-info">
                          <span class="toggle-title">Accept Credit / Debit Cards</span>
                          <span class="toggle-desc">Permit VISA, Mastercard, and Rupay checkouts.</span>
                        </div>
                        <mat-slide-toggle formControlName="enableCard"></mat-slide-toggle>
                      </div>

                      <!-- Cash -->
                      <div class="toggle-item">
                        <div class="toggle-info">
                          <span class="toggle-title">Accept Cash / Manual Payments</span>
                          <span class="toggle-desc">Log manual physical counter-top cash transactions.</span>
                        </div>
                        <mat-slide-toggle formControlName="enableCash"></mat-slide-toggle>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Right: Bank Transfer Details -->
                <div class="settings-col">
                  <div class="mat-card settings-card">
                    <div class="card-title-row">
                      <mat-icon class="title-icon">account_balance_wallet</mat-icon>
                      <h2>Bank Account Details</h2>
                    </div>
                    <p class="section-desc">Specify banking credentials printed directly on member PDF invoices for manual IMPS/NEFT transfers.</p>
                    
                    <div class="fields-stack">
                      <!-- Holder Name -->
                      <mat-form-field appearance="outline">
                        <mat-label>Account Holder Name</mat-label>
                        <input matInput formControlName="bankHolderName" placeholder="e.g. Apex Fit Downtown Private Limited">
                      </mat-form-field>

                      <!-- Bank Name -->
                      <mat-form-field appearance="outline">
                        <mat-label>Bank Name</mat-label>
                        <input matInput formControlName="bankName" placeholder="e.g. HDFC Bank">
                      </mat-form-field>

                      <div class="form-row">
                        <!-- Account No -->
                        <mat-form-field appearance="outline">
                          <mat-label>Account Number</mat-label>
                          <input matInput formControlName="bankAccountNo" placeholder="50100223344556">
                        </mat-form-field>

                        <!-- IFSC -->
                        <mat-form-field appearance="outline">
                          <mat-label>IFSC Code</mat-label>
                          <input matInput formControlName="bankIfsc" placeholder="HDFC0000123">
                        </mat-form-field>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="settings-col full-width" formGroupName="providers">
                  <div class="mat-card settings-card mt-4">
                    <div class="card-title-row">
                      <mat-icon class="title-icon">settings_input_component</mat-icon>
                      <h2>Enterprise Payment Gateway Configurations</h2>
                    </div>
                    <p class="section-desc">Manage keys, credentials, and custom parameters for the runtime Provider Factory.</p>
                    
                    <div class="providers-grid">
                      <!-- 1. Manual UPI -->
                      <div class="provider-card" formGroupName="manualUPI" [class.enabled]="paymentForm.get('providers.manualUPI.enabled')?.value">
                        <div class="provider-header">
                          <div class="provider-info-row">
                            <mat-icon class="provider-logo manual-upi-icon">qr_code_2</mat-icon>
                            <div>
                              <h3>Manual UPI QR Code</h3>
                              <p>Direct peer-to-peer bank transfers via UPI QR</p>
                            </div>
                          </div>
                          <mat-slide-toggle formControlName="enabled"></mat-slide-toggle>
                        </div>
                        
                        <div class="provider-fields" *ngIf="paymentForm.get('providers.manualUPI.enabled')?.value">
                          <mat-divider class="my-3"></mat-divider>
                          <div class="fields-stack">
                            <mat-form-field appearance="outline">
                              <mat-label>UPI ID (VPA)</mat-label>
                              <input matInput formControlName="upiId" placeholder="e.g. apexfit@upi">
                            </mat-form-field>
                            
                            <mat-form-field appearance="outline">
                              <mat-label>Business Name (Payee Name)</mat-label>
                              <input matInput formControlName="businessName" placeholder="e.g. ApexFit Gym Downtown">
                            </mat-form-field>
                            
                            <div class="form-row">
                              <mat-form-field appearance="outline">
                                <mat-label>Support Contact (WhatsApp/Phone)</mat-label>
                                <input matInput formControlName="supportContact" placeholder="e.g. +91 99887 76655">
                              </mat-form-field>
                              
                              <div class="toggle-inside-field">
                                <span class="lbl">Auto-generate Dynamic QR</span>
                                <mat-slide-toggle formControlName="autoGenerateQR"></mat-slide-toggle>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <!-- 2. Razorpay -->
                      <div class="provider-card" formGroupName="razorpay" [class.enabled]="paymentForm.get('providers.razorpay.enabled')?.value">
                        <div class="provider-header">
                          <div class="provider-info-row">
                            <mat-icon class="provider-logo razorpay-icon">payment</mat-icon>
                            <div>
                              <h3>Razorpay Gateway</h3>
                              <p>Cards, Netbanking, UPI, and Auto-debits (Sandbox Mock)</p>
                            </div>
                          </div>
                          <mat-slide-toggle formControlName="enabled"></mat-slide-toggle>
                        </div>
                        
                        <div class="provider-fields" *ngIf="paymentForm.get('providers.razorpay.enabled')?.value">
                          <mat-divider class="my-3"></mat-divider>
                          <div class="fields-stack">
                            <mat-form-field appearance="outline">
                              <mat-label>Key ID</mat-label>
                              <input matInput formControlName="keyId" placeholder="rzp_test_...">
                            </mat-form-field>
                            
                            <mat-form-field appearance="outline">
                              <mat-label>Key Secret</mat-label>
                              <input matInput type="password" formControlName="keySecret" placeholder="••••••••••••••••">
                            </mat-form-field>
                          </div>
                        </div>
                      </div>

                      <!-- 3. Cashfree -->
                      <div class="provider-card" formGroupName="cashfree" [class.enabled]="paymentForm.get('providers.cashfree.enabled')?.value">
                        <div class="provider-header">
                          <div class="provider-info-row">
                            <mat-icon class="provider-logo cashfree-icon">account_balance_wallet</mat-icon>
                            <div>
                              <h3>Cashfree Payments</h3>
                              <p>Instant UPI, Cards, and Netbanking settlements (Sandbox Mock)</p>
                            </div>
                          </div>
                          <mat-slide-toggle formControlName="enabled"></mat-slide-toggle>
                        </div>
                        
                        <div class="provider-fields" *ngIf="paymentForm.get('providers.cashfree.enabled')?.value">
                          <mat-divider class="my-3"></mat-divider>
                          <div class="fields-stack">
                            <mat-form-field appearance="outline">
                              <mat-label>App ID (Client ID)</mat-label>
                              <input matInput formControlName="keyId" placeholder="cf_test_...">
                            </mat-form-field>
                            
                            <mat-form-field appearance="outline">
                              <mat-label>Secret Key</mat-label>
                              <input matInput type="password" formControlName="keySecret" placeholder="••••••••••••••••">
                            </mat-form-field>
                          </div>
                        </div>
                      </div>

                      <!-- 4. Stripe -->
                      <div class="provider-card" formGroupName="stripe" [class.enabled]="paymentForm.get('providers.stripe.enabled')?.value">
                        <div class="provider-header">
                          <div class="provider-info-row">
                            <mat-icon class="provider-logo stripe-icon">account_balance</mat-icon>
                            <div>
                              <h3>Stripe Checkout</h3>
                              <p>International credit card processing and auto-renewals (Sandbox Mock)</p>
                            </div>
                          </div>
                          <mat-slide-toggle formControlName="enabled"></mat-slide-toggle>
                        </div>
                        
                        <div class="provider-fields" *ngIf="paymentForm.get('providers.stripe.enabled')?.value">
                          <mat-divider class="my-3"></mat-divider>
                          <div class="fields-stack">
                            <mat-form-field appearance="outline">
                              <mat-label>Publishable Key</mat-label>
                              <input matInput formControlName="keyId" placeholder="pk_test_...">
                            </mat-form-field>
                            
                            <mat-form-field appearance="outline">
                              <mat-label>Secret Key</mat-label>
                              <input matInput type="password" formControlName="keySecret" placeholder="••••••••••••••••">
                            </mat-form-field>
                          </div>
                        </div>
                      </div>

                      <!-- 5. Paytm -->
                      <div class="provider-card" formGroupName="paytm" [class.enabled]="paymentForm.get('providers.paytm.enabled')?.value">
                        <div class="provider-header">
                          <div class="provider-info-row">
                            <mat-icon class="provider-logo paytm-icon">account_box</mat-icon>
                            <div>
                              <h3>Paytm Gateway</h3>
                              <p>Direct Paytm wallet and UPI integration (Sandbox Mock)</p>
                            </div>
                          </div>
                          <mat-slide-toggle formControlName="enabled"></mat-slide-toggle>
                        </div>
                        
                        <div class="provider-fields" *ngIf="paymentForm.get('providers.paytm.enabled')?.value">
                          <mat-divider class="my-3"></mat-divider>
                          <div class="fields-stack">
                            <mat-form-field appearance="outline">
                              <mat-label>Merchant ID</mat-label>
                              <input matInput formControlName="merchantId" placeholder="MID_...">
                            </mat-form-field>
                            
                            <mat-form-field appearance="outline">
                              <mat-label>Merchant Key</mat-label>
                              <input matInput type="password" formControlName="keySecret" placeholder="••••••••••••••••">
                            </mat-form-field>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <!-- Save Payment Details -->
              <div class="action-bar-footer">
                <button mat-raised-button color="primary" type="submit" [disabled]="paymentForm.invalid" class="save-settings-btn">
                  <mat-icon>save</mat-icon>
                  <span>Save Payment Settings</span>
                </button>
              </div>
            </form>
          </div>
        </mat-tab>

        <!-- TAB 2: SAAS SUBSCRIPTION (Preserving original functionality!) -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">workspace_premium</mat-icon>
            <span>SaaS Suite Subscription</span>
          </ng-template>

          <div class="tab-content subscription-tab-content" *ngIf="activeGym; else loading">
            <!-- Active Plan Metrics Summary -->
            <div class="mat-card active-subscription-card" *ngIf="activePlanStatus">
              <div class="status-summary-section">
                <div class="plan-header">
                  <div class="badge-pill" [ngClass]="getPlanBadgeClass(activePlanStatus.activePlan)">
                    <mat-icon>stars</mat-icon>
                    <span>{{ planLabels[activePlanStatus.activePlan] }} Plan</span>
                  </div>
                  <span class="status-indicator active">Active</span>
                </div>
                
                <div class="dates-row">
                  <div class="date-item">
                    <span class="lbl">Activated On</span>
                    <span class="val">{{ activePlanStatus.startDate | date:'mediumDate' }}</span>
                  </div>
                  <div class="date-item">
                    <span class="lbl">Next Renewal Invoice</span>
                    <span class="val">{{ activePlanStatus.endDate | date:'mediumDate' }}</span>
                  </div>
                </div>
              </div>

              <div class="limits-usage-section">
                <h3 class="limits-title">Tenant Workspace Resource Usage</h3>
                
                <!-- Members count -->
                <div class="limit-metric">
                  <div class="metric-info">
                    <span class="lbl">Members Enrolled</span>
                    <span class="val">
                      <strong>{{ activePlanStatus.memberCount }}</strong>
                      / {{ isUnlimited(activePlanStatus.memberLimit) ? 'Unlimited' : activePlanStatus.memberLimit }}
                    </span>
                  </div>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="getMemberProgressValue()"
                    [color]="getMemberProgressColor()">
                  </mat-progress-bar>
                </div>

                <!-- Trainers count -->
                <div class="limit-metric mt-3">
                  <div class="metric-info">
                    <span class="lbl">Staff &amp; Trainers Directory</span>
                    <span class="val">
                      <strong>{{ activePlanStatus.trainerCount }}</strong>
                      / {{ isUnlimited(activePlanStatus.trainerLimit) ? 'Unlimited' : activePlanStatus.trainerLimit }}
                    </span>
                  </div>
                  <mat-progress-bar
                    mode="determinate"
                    [value]="getTrainerProgressValue()"
                    [color]="getTrainerProgressColor()">
                  </mat-progress-bar>
                </div>
              </div>
            </div>

            <!-- Billing Cycle Selection -->
            <div class="cycle-selector-row">
              <h2>Select Workspace Plan Tier</h2>
              <div class="cycle-toggles">
                <button mat-button class="cycle-btn" [class.active]="billingCycle === 'monthly'" (click)="onBillingCycleChange('monthly')">
                  Monthly
                </button>
                <button mat-button class="cycle-btn" [class.active]="billingCycle === 'yearly'" (click)="onBillingCycleChange('yearly')">
                  Yearly <span class="discount-badge">Save 20%</span>
                </button>
              </div>
            </div>

            <!-- SaaS Subscription Tiers Comparisons -->
            <div class="plans-comparison-grid">
              <div class="mat-card plan-tier-card"
                   *ngFor="let plan of subscriptionPlans"
                   [class.active-tier]="activeGym.subscriptionPlan === plan">
                
                <div class="current-badge" *ngIf="activeGym.subscriptionPlan === plan">Current Tier</div>
                
                <h3 class="tier-name">{{ planLabels[plan] }}</h3>
                <div class="price-container">
                  <span class="price-txt">{{ planPriceTexts[plan] }}</span>
                </div>

                <ul class="features-list">
                  <li>
                    <mat-icon class="feature-icon check">check_circle</mat-icon>
                    <span>Members Limit (Max {{ isUnlimited(planFeatures[plan].maxMembers) ? 'Unlimited' : planFeatures[plan].maxMembers }})</span>
                  </li>
                  <li>
                    <mat-icon class="feature-icon check">check_circle</mat-icon>
                    <span>Employees Limit (Max {{ isUnlimited(planFeatures[plan].maxEmployees) ? 'Unlimited' : planFeatures[plan].maxEmployees }})</span>
                  </li>
                  <li>
                    <mat-icon class="feature-icon" [class.check]="planFeatures[plan].canExportReports" [class.cross]="!planFeatures[plan].canExportReports">
                      {{ planFeatures[plan].canExportReports ? 'check_circle' : 'cancel' }}
                    </mat-icon>
                    <span>Advanced Reports Export</span>
                  </li>
                  <li>
                    <mat-icon class="feature-icon" [class.check]="planFeatures[plan].canManageBranches" [class.cross]="!planFeatures[plan].canManageBranches">
                      {{ planFeatures[plan].canManageBranches ? 'check_circle' : 'cancel' }}
                    </mat-icon>
                    <span>Multi Branch Operations</span>
                  </li>
                  <li>
                    <mat-icon class="feature-icon" [class.check]="planFeatures[plan].canAccessAnalytics" [class.cross]="!planFeatures[plan].canAccessAnalytics">
                      {{ planFeatures[plan].canAccessAnalytics ? 'check_circle' : 'cancel' }}
                    </mat-icon>
                    <span>Advanced Analytics Suite</span>
                  </li>
                </ul>

                <button mat-raised-button
                        [color]="activeGym.subscriptionPlan === plan ? 'accent' : 'primary'"
                        [disabled]="activeGym.subscriptionPlan === plan"
                        (click)="onUpgradePlan(plan)"
                        class="action-btn-tier">
                  <span>{{ activeGym.subscriptionPlan === plan ? 'Current Tier' : 'Upgrade to ' + planLabels[plan] }}</span>
                </button>
              </div>
            </div>

            <!-- Invoices Ledger -->
            <div class="mat-card saas-invoices-card">
              <div class="card-header-row">
                <mat-icon>receipt_long</mat-icon>
                <h2>SaaS Account Invoice Statements</h2>
              </div>
              <p class="section-desc">Review and download past invoice statements generated for your Apex Fit SaaS subscription.</p>

              <div class="table-scroll-wrapper mt-3">
                <table mat-table [dataSource]="activeGymBillingHistory" class="w-100">
                  <ng-container matColumnDef="invoiceNumber">
                    <th mat-header-cell *matHeaderCellDef>Invoice #</th>
                    <td mat-cell *matCellDef="let element" class="invoice-num">{{ element.invoiceNumber }}</td>
                  </ng-container>

                  <ng-container matColumnDef="date">
                    <th mat-header-cell *matHeaderCellDef>Billing Date</th>
                    <td mat-cell *matCellDef="let element">{{ element.date | date:'mediumDate' }}</td>
                  </ng-container>

                  <ng-container matColumnDef="plan">
                    <th mat-header-cell *matHeaderCellDef>SaaS Plan</th>
                    <td mat-cell *matCellDef="let element">
                      <span class="status-badge" [ngClass]="getPlanBadgeClass(element.plan)">{{ getPlanLabel(element.plan) }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="paymentMethod">
                    <th mat-header-cell *matHeaderCellDef>Payment Method</th>
                    <td mat-cell *matCellDef="let element">{{ element.paymentMethod }}</td>
                  </ng-container>

                  <ng-container matColumnDef="amount">
                    <th mat-header-cell *matHeaderCellDef>Amount Paid</th>
                    <td mat-cell *matCellDef="let element" class="text-success font-semibold">₹{{ element.amount.toLocaleString('en-IN') }}</td>
                  </ng-container>

                  <ng-container matColumnDef="status">
                    <th mat-header-cell *matHeaderCellDef>Status</th>
                    <td mat-cell *matCellDef="let element">
                      <span class="status-badge paid">{{ element.status }}</span>
                    </td>
                  </ng-container>

                  <ng-container matColumnDef="actions">
                    <th mat-header-cell *matHeaderCellDef style="text-align:center;width:90px">Download</th>
                    <td mat-cell *matCellDef="let element" style="text-align:center">
                      <button mat-icon-button color="accent" (click)="printInvoice(element)" matTooltip="Download PDF Receipt">
                        <mat-icon>download</mat-icon>
                      </button>
                    </td>
                  </ng-container>

                  <tr mat-header-row *matHeaderRowDef="invoiceColumns"></tr>
                  <tr mat-row *matRowDef="let row; columns: invoiceColumns;"></tr>
                </table>

                <div class="empty-table-state" *ngIf="activeGymBillingHistory.length === 0">
                  <mat-icon>receipt</mat-icon>
                  <h3>No SaaS invoice records found</h3>
                  <p>Your subscription statement ledger is currently empty.</p>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>

      </mat-tab-group>

      <ng-template #loading>
        <div class="loading-state">
          <mat-icon class="spin-icon">sync</mat-icon>
          <p>Fetching billing data...</p>
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
    .payment-tabs {
      width: 100%;
    }
    .tab-icon {
      margin-right: 8px;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .tab-content {
      padding: 24px 0;
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
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
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

    /* SaaS Styles */
    .subscription-tab-content {
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .active-subscription-card {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      padding: 28px !important;
      background: rgba(255, 255, 255, 0.02) !important;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.08) !important;
      border-radius: 16px !important;
      box-shadow: var(--shadow-md);

      body.light-theme & {
        background: rgba(99, 102, 241, 0.03) !important;
        border-color: rgba(99, 102, 241, 0.1) !important;
      }
    }
    .status-summary-section {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 24px;
      border-right: 1px solid var(--border-color);
      padding-right: 32px;
    }
    .plan-header {
      display: flex;
      align-items: center;
      gap: 16px;
      .badge-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 16px;
        font-weight: 800;
        padding: 8px 16px;
        border-radius: 30px;
        &.badge-free { background: rgba(148, 163, 184, 0.1); color: #94a3b8; }
        &.badge-basic { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        &.badge-pro { background: rgba(168, 85, 247, 0.1); color: #a855f7; box-shadow: 0 0 15px rgba(168, 85, 247, 0.1); }
        &.badge-enterprise { background: rgba(236, 72, 153, 0.1); color: #ec4899; box-shadow: 0 0 15px rgba(236, 72, 153, 0.1); }
      }
      .status-indicator.active {
        font-size: 11px;
        font-weight: 800;
        background: var(--success-glow);
        color: var(--success);
        padding: 3px 8px;
        border-radius: 4px;
      }
    }
    .dates-row {
      display: flex;
      gap: 32px;
      .date-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
        .lbl { font-size: 11px; text-transform: uppercase; color: var(--text-muted); font-weight: 700; }
        .val { font-size: 15px; font-weight: 600; color: var(--text-primary); }
      }
    }
    .limits-usage-section {
      display: flex;
      flex-direction: column;
      justify-content: center;
      .limits-title { font-size: 14px; font-weight: 700; margin-bottom: 16px; }
      .limit-metric {
        .metric-info {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 8px;
          .lbl { font-weight: 600; color: var(--text-secondary); }
          .val { color: var(--text-muted); strong { color: var(--text-primary); } }
        }
        mat-progress-bar { height: 8px; border-radius: 4px; }
      }
    }
    .cycle-selector-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 16px;
      margin-top: 12px;
      h2 { font-size: 20px; font-weight: 800; margin: 0; }
      .cycle-toggles {
        display: flex;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-color);
        border-radius: 30px;
        padding: 4px;
        .cycle-btn {
          border-radius: 20px !important;
          padding: 0 16px !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          color: var(--text-secondary);
          height: 32px !important;
          &.active { background: var(--accent-gradient); color: #ffffff; }
          .discount-badge { font-size: 9px; background: var(--success); color: #ffffff; padding: 1px 6px; border-radius: 10px; margin-left: 6px; }
        }
      }
    }
    .plans-comparison-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }
    .plan-tier-card {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: 28px 24px !important;
      border: 1px solid var(--border-color) !important;
      border-radius: 16px !important;
      height: 100%;
      &.active-tier {
        border: 2px solid var(--accent-color) !important;
        box-shadow: 0 8px 30px rgba(99, 102, 241, 0.15);
      }
      .current-badge {
        position: absolute;
        top: -12px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--accent-gradient);
        color: #ffffff;
        font-size: 10px;
        font-weight: 800;
        padding: 3px 12px;
        border-radius: 20px;
      }
      .tier-name { font-size: 20px; font-weight: 800; text-align: center; margin-bottom: 12px; }
      .price-container { text-align: center; margin-bottom: 24px; min-height: 48px; display: flex; align-items: center; justify-content: center; }
      .price-txt { font-size: 14px; font-weight: 700; }
      .features-list {
        list-style: none;
        padding: 0;
        margin: 0 0 28px 0;
        display: flex;
        flex-direction: column;
        gap: 14px;
        flex: 1;
        li {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: var(--text-secondary);
          line-height: 1.4;
          .feature-icon {
            font-size: 18px !important;
            width: 18px !important;
            height: 18px !important;
            line-height: 18px !important;
            display: inline-flex !important;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            &.check { color: #22c55e !important; }
            &.cross { color: #ef4444 !important; opacity: 0.7; }
          }
        }
      }
      .action-btn-tier {
        width: 100% !important;
        border-radius: 8px !important;
        font-weight: 700 !important;
        font-size: 12px !important;
        padding: 0 8px !important;
        white-space: normal !important;
        line-height: 1.2 !important;
        height: 42px !important;
        display: inline-flex !important;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
    }
    .saas-invoices-card {
      padding: 24px !important;
      .card-header-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 6px;
        color: var(--accent-color);
        h2 { font-size: 18px; font-weight: 700; margin: 0; color: var(--text-primary); }
      }
    }
    .table-scroll-wrapper {
      width: 100%;
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      table { width: 100%; background: transparent !important; }
      th { font-weight: 700 !important; color: var(--text-secondary); }
      td { color: var(--text-primary); }
      .invoice-num { font-family: monospace; font-size: 13px; }
    }
    .status-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      &.paid { background: rgba(34, 197, 94, 0.12); color: #22c55e; }
      &.badge-free { background: rgba(148, 163, 184, 0.12); color: #94a3b8; }
      &.badge-basic { background: rgba(59, 130, 246, 0.12); color: #3b82f6; }
      &.badge-pro { background: rgba(168, 85, 247, 0.12); color: #a855f7; }
      &.badge-enterprise { background: rgba(236, 72, 153, 0.12); color: #ec4899; }
    }
    .empty-table-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 12px;
      color: var(--text-muted);
      mat-icon { font-size: 48px; width: 48px; height: 48px; opacity: 0.3; }
      h3 { font-size: 16px; font-weight: 700; margin: 0; color: var(--text-secondary); }
      p { font-size: 13px; margin: 0; }
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
    @media (max-width: 1199.98px) {
      .active-subscription-card {
        grid-template-columns: 1fr;
        gap: 24px;
        .status-summary-section { border-right: none; border-bottom: 1px solid var(--border-color); padding-right: 0; padding-bottom: 24px; }
      }
      .plans-comparison-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 959.98px) {
      .settings-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 599.98px) {
      .plans-comparison-grid { grid-template-columns: 1fr; }
      .form-row { grid-template-columns: 1fr; }
    }

    .full-width {
      grid-column: 1 / -1;
    }
    .providers-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
      margin-top: 20px;
    }
    @media (max-width: 959.98px) {
      .providers-grid {
        grid-template-columns: 1fr;
      }
    }
    .provider-card {
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.01);
      transition: all 0.25s ease;
      display: flex;
      flex-direction: column;
      &.enabled {
        border-color: var(--accent-color);
        background: rgba(99, 102, 241, 0.02);
        box-shadow: 0 4px 20px rgba(99, 102, 241, 0.05);
      }
      &:hover {
        border-color: rgba(99, 102, 241, 0.4);
      }
    }
    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .provider-info-row {
      display: flex;
      align-items: center;
      gap: 12px;
      h3 {
        font-size: 15px;
        font-weight: 700;
        margin: 0;
        color: var(--text-primary);
      }
      p {
        font-size: 11.5px;
        margin: 0;
        color: var(--text-muted);
        line-height: 1.3;
      }
    }
    .provider-logo {
      font-size: 28px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      &.manual-upi-icon { color: #22c55e; }
      &.razorpay-icon { color: #3b82f6; }
      &.cashfree-icon { color: #a855f7; }
      &.stripe-icon { color: #635bff; }
      &.paytm-icon { color: #00baf2; }
    }
    .toggle-inside-field {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 0 16px;
      height: 56px;
      .lbl {
        font-size: 13.5px;
        font-weight: 500;
        color: var(--text-secondary);
      }
    }
    .my-3 {
      margin-top: 16px !important;
      margin-bottom: 16px !important;
    }
  `]
})
export class PaymentSettingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  paymentForm!: FormGroup;
  activeGym: Gym | null = null;

  // SaaS Billing Parameters (Preserved)
  activeGymBillingHistory: SaaSPayment[] = [];
  activePlanStatus: SubscriptionStatus | null = null;
  billingCycle: 'monthly' | 'yearly' = 'monthly';
  invoiceColumns = ['invoiceNumber', 'date', 'plan', 'paymentMethod', 'amount', 'status', 'actions'];

  readonly planPrices: Record<any, any> = PLAN_PRICES;
  readonly planFeatures: Record<any, any> = PLAN_FEATURES;
  readonly subscriptionPlans: SubscriptionPlan[] = [
    SubscriptionPlan.FreeTrial,
    SubscriptionPlan.Basic,
    SubscriptionPlan.Pro,
    SubscriptionPlan.Enterprise
  ];
  readonly planLabels: Record<any, any> = PLAN_LABEL_MAP;
  planPriceTexts: Record<string, string> = {};
  providerSettings: PaymentSettings[] = [];

  constructor(
    private fb: FormBuilder,
    private gymState: GymState,
    private subscriptionService: SubscriptionService,
    private memberState: MemberState,
    private trainerState: TrainerState,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    @Inject(PAYMENT_SETTINGS_REPOSITORY_TOKEN) private settingsRepo: IPaymentSettingsRepository
  ) { }

  ngOnInit(): void {
    this.computePlanPriceTexts();

    this.paymentForm = this.fb.group({
      enableCard: [true],
      enableUPI: [true],
      enableCash: [true],
      bankHolderName: [''],
      bankName: [''],
      bankAccountNo: [''],
      bankIfsc: [''],
      providers: this.fb.group({
        manualUPI: this.fb.group({
          enabled: [true],
          upiId: [''],
          businessName: [''],
          autoGenerateQR: [true],
          supportContact: ['']
        }),
        razorpay: this.fb.group({
          enabled: [false],
          keyId: [''],
          keySecret: ['']
        }),
        cashfree: this.fb.group({
          enabled: [false],
          keyId: [''],
          keySecret: ['']
        }),
        stripe: this.fb.group({
          enabled: [false],
          keyId: [''],
          keySecret: ['']
        }),
        paytm: this.fb.group({
          enabled: [false],
          merchantId: [''],
          keySecret: ['']
        })
      })
    });

    this.gymState.activeGym$.pipe(
      takeUntil(this.destroy$),
      distinctUntilChanged((a, b) => a?.gymId === b?.gymId && a?.subscriptionPlan === b?.subscriptionPlan)
    ).subscribe(gym => {
      if (gym) {
        this.activeGym = gym;
        this.paymentForm.patchValue({
          enableCard: gym.paymentSettings ? gym.paymentSettings.enableCard : true,
          enableUPI: gym.paymentSettings ? gym.paymentSettings.enableUPI : true,
          enableCash: gym.paymentSettings ? gym.paymentSettings.enableCash : true,
          bankHolderName: gym.paymentSettings?.bankHolderName || '',
          bankName: gym.paymentSettings?.bankName || '',
          bankAccountNo: gym.paymentSettings?.bankAccountNo || '',
          bankIfsc: gym.paymentSettings?.bankIfsc || ''
        });

        this.settingsRepo.getSettings(gym.gymId).subscribe(settings => {
          this.providerSettings = settings;
          this.patchProviderForms();
          this.cdr.markForCheck();
        });

        this.refreshPlanStatus(null, null);
        this.cdr.markForCheck();
      }
    });

    // SaaS Subscriptions & Billing history loading
    this.gymState.activeGymBillingHistory$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(history => {
      this.activeGymBillingHistory = history;
      this.cdr.markForCheck();
    });

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

  patchProviderForms(): void {
    const providersGroup = this.paymentForm.get('providers') as FormGroup;
    if (!providersGroup) return;

    const providersMap: Record<string, string> = {
      'Manual UPI': 'manualUPI',
      'Razorpay': 'razorpay',
      'Cashfree': 'cashfree',
      'Stripe': 'stripe',
      'Paytm': 'paytm'
    };

    this.providerSettings.forEach(s => {
      const groupName = providersMap[s.provider];
      if (groupName) {
        const group = providersGroup.get(groupName) as FormGroup;
        if (group) {
          group.patchValue({
            enabled: s.enabled,
            ...s.gatewayConfig
          });
        }
      }
    });
  }

  onSavePaymentSettings(): void {
    if (this.paymentForm.valid && this.activeGym) {
      const updated: Gym = {
        ...this.activeGym,
        paymentSettings: {
          currency: this.activeGym.paymentSettings?.currency || '₹',
          enableCard: !!this.paymentForm.value.enableCard,
          enableUPI: !!this.paymentForm.value.enableUPI,
          enableCash: !!this.paymentForm.value.enableCash,
          bankHolderName: this.paymentForm.value.bankHolderName || undefined,
          bankName: this.paymentForm.value.bankName || undefined,
          bankAccountNo: this.paymentForm.value.bankAccountNo || undefined,
          bankIfsc: this.paymentForm.value.bankIfsc || undefined
        }
      };

      const providersGroup = this.paymentForm.get('providers') as FormGroup;
      const saveOps: Observable<void>[] = [];

      const providersMap: Record<string, { name: 'Manual UPI' | 'Razorpay' | 'Cashfree' | 'Stripe' | 'Paytm', keys: string[] }> = {
        manualUPI: { name: 'Manual UPI', keys: ['upiId', 'businessName', 'autoGenerateQR', 'supportContact'] },
        razorpay: { name: 'Razorpay', keys: ['keyId', 'keySecret'] },
        cashfree: { name: 'Cashfree', keys: ['keyId', 'keySecret'] },
        stripe: { name: 'Stripe', keys: ['keyId', 'keySecret'] },
        paytm: { name: 'Paytm', keys: ['merchantId', 'keySecret'] }
      };

      for (const key of Object.keys(providersMap)) {
        const group = providersGroup.get(key) as FormGroup;
        if (group) {
          const config = providersMap[key];
          const formValue = group.value;
          
          const existing = this.providerSettings.find(s => s.provider === config.name);
          const gatewayConfig: any = {};
          config.keys.forEach(k => {
            gatewayConfig[k] = formValue[k];
          });

          const updatedSettings: PaymentSettings = {
            id: existing?.id,
            gymId: this.activeGym.gymId,
            provider: config.name,
            enabled: !!formValue.enabled,
            gatewayConfig,
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          saveOps.push(this.settingsRepo.saveSettings(this.activeGym.gymId, updatedSettings));
        }
      }

      this.gymState.updateGym(updated).pipe(
        switchMap(() => forkJoin(saveOps)),
        takeUntil(this.destroy$)
      ).subscribe({
        next: () => {
          this.snackBar.open('Payment configurations and bank details updated successfully!', 'Dismiss', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(`Failed to save settings: ${err.message || err}`, 'Dismiss', { duration: 4000 });
        }
      });
    }
  }

  // SaaS plan action handler (handles both upgrade & downgrade)
  onUpgradePlan(plan: SubscriptionPlan): void {
    if (!this.activeGym) return;

    if (this.activeGym.subscriptionPlan === plan) {
      this.snackBar.open('This plan is already active for your workspace.', 'Dismiss', { duration: 3000 });
      return;
    }

    if (plan === SubscriptionPlan.FreeTrial) {
      this.snackBar.open('Free Trial can only be activated at initial registration.', 'Dismiss', { duration: 3000 });
      return;
    }

    // Check if plan action is a downgrade
    const order = [SubscriptionPlan.FreeTrial, SubscriptionPlan.Basic, SubscriptionPlan.Pro, SubscriptionPlan.Enterprise];
    const isDowngrade = order.indexOf(this.activeGym.subscriptionPlan) > order.indexOf(plan);

    if (isDowngrade) {
      const dialogRef = this.dialog.open(DowngradeDialogComponent, {
        width: '450px',
        data: { planLabel: this.planLabels[plan] }
      });

      dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(confirmed => {
        if (confirmed && this.activeGym) {
          // Process Downgrade immediately (adds zero amount statement for transparency)
          this.gymState.upgradeActiveGymSubscription(plan, 'SaaS Plan Downgrade', 0)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => {
              this.snackBar.open(`Workspace plan downgraded to ${this.planLabels[plan]} successfully.`, 'Dismiss', { duration: 4000 });
              this.computePlanPriceTexts();
              this.cdr.markForCheck();
            });
        }
      });
    } else {
      // Process Upgrade
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
    if (!this.activeGym) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this.snackBar.open('Pop-up blocked! Please allow pop-ups to print invoices.', 'Dismiss', { duration: 4000 });
      return;
    }

    const basePrice = invoice.amount;
    const tax = Math.round(basePrice * 0.18);
    const total = basePrice + tax;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; background-color: #ffffff; }
            .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 24px; }
            .logo { font-size: 26px; font-weight: 800; color: #6366f1; letter-spacing: -0.5px; }
            .company-info { text-align: right; font-size: 13px; color: #64748b; line-height: 1.4; }
            .invoice-details { display: flex; justify-content: space-between; margin-top: 32px; font-size: 14px; }
            .bill-to { display: flex; flex-direction: column; gap: 4px; }
            .bill-meta { text-align: right; display: flex; flex-direction: column; gap: 4px; }
            .table { width: 100%; border-collapse: collapse; margin-top: 40px; font-size: 14px; }
            .table th { background: #f8fafc; text-align: left; padding: 12px 16px; font-weight: 600; border-bottom: 1px solid #e2e8f0; color: #475569; }
            .table td { padding: 16px; border-bottom: 1px solid #f1f5f9; }
            .totals-container { margin-top: 32px; display: flex; justify-content: flex-end; }
            .totals-table { width: 300px; border-collapse: collapse; font-size: 14px; }
            .totals-table td { padding: 8px 12px; }
            .totals-table tr.total { font-weight: 700; border-top: 1px solid #e2e8f0; font-size: 16px; color: #6366f1; }
            .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 6px; background: #dcfce7; color: #166534; text-transform: uppercase; }
            .footer { margin-top: 60px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 24px; }
            @media print {
              body { padding: 0; background-color: #ffffff; }
              .invoice-container { border: none; padding: 0; box-shadow: none; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="logo">APEXFIT SaaS Suite</div>
              <div class="company-info">
                <strong>APEXFIT Technologies Pvt Ltd</strong><br>
                100 Indiranagar Double Rd<br>
                Bangalore, KA 560038<br>
                support@apexfit.com
              </div>
            </div>
            
            <div class="invoice-details">
              <div class="bill-to">
                <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #94a3b8;">Billed To</span>
                <strong>${this.activeGym.gymName}</strong>
                <span>Owner: ${this.activeGym.ownerName}</span>
                <span>Email: ${this.activeGym.email}</span>
                <span>Phone: ${this.activeGym.phone}</span>
                ${this.activeGym.gstNumber ? `<span>GSTIN: ${this.activeGym.gstNumber}</span>` : ''}
              </div>
              <div class="bill-meta">
                <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #94a3b8;">Invoice Info</span>
                <strong>Invoice #${invoice.invoiceNumber}</strong>
                <span>Date: ${new Date(invoice.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span>Payment Method: ${invoice.paymentMethod}</span>
                <span>Status: <span class="badge">${invoice.status}</span></span>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>Subscription Service Description</th>
                  <th style="text-align: right;">Billing Base</th>
                  <th style="text-align: right;">Total Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>APEXFIT Gym SaaS Management Plan - ${this.getPlanLabel(invoice.plan)} Tier</strong><br>
                    <span style="font-size: 12px; color: #64748b;">Annual/Monthly billing subscription for multi-tenant gym workspace management portal. Includes full client roster database, staff accounts directory, check-in tracking, WhatsApp reminder tools.</span>
                  </td>
                  <td style="text-align: right; vertical-align: top;">₹${basePrice.toLocaleString('en-IN')}</td>
                  <td style="text-align: right; vertical-align: top; font-weight: 600;">₹${basePrice.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
            </table>

            <div class="totals-container">
              <table class="totals-table">
                <tr>
                  <td>Subtotal</td>
                  <td style="text-align: right;">₹${basePrice.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td>Estimated Tax (18% GST)</td>
                  <td style="text-align: right;">₹${tax.toLocaleString('en-IN')}</td>
                </tr>
                <tr class="total">
                  <td>Amount Charged</td>
                  <td style="text-align: right;">₹${total.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <div class="footer">
              <p>Thank you for partnering with APEXFIT! Your subscription helps us power a healthier world.</p>
              <p>For support, please write to billing@apexfit.com.</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}

@Component({
  selector: 'app-downgrade-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="downgrade-dialog-container">
      <div class="dialog-header text-warning">
        <mat-icon class="warn-icon">warning</mat-icon>
        <h2>Confirm Downgrade Plan</h2>
      </div>
      <div class="dialog-content">
        <p>Are you sure you want to downgrade your subscription plan to <strong>{{ data.planLabel }}</strong>?</p>
        <div class="warning-box glass-panel mt-3">
          <p class="font-bold text-warn" style="color: #f59e0b; font-weight: 700; margin-bottom: 8px;">Please Note:</p>
          <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary); line-height: 1.6;">
            <li>Your current resource usage limits will be reduced according to the target plan features.</li>
            <li>No data will be deleted, but you will be unable to add new members or staff if you exceed the new limits.</li>
          </ul>
        </div>
      </div>
      <div class="actions-row">
        <button mat-button (click)="onCancel()" class="cancel-btn">Cancel</button>
        <button mat-raised-button color="warn" (click)="onConfirm()" class="confirm-btn">
          Confirm & Downgrade
        </button>
      </div>
    </div>
  `,
  styles: [`
    .downgrade-dialog-container {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f59e0b;
      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
        color: var(--text-primary);
      }
      .warn-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: #f59e0b;
      }
    }
    .dialog-content {
      color: var(--text-primary);
      p { margin: 0; font-size: 14px; }
    }
    .warning-box {
      padding: 14px;
      background: rgba(245, 158, 11, 0.05);
      border: 1px solid rgba(245, 158, 11, 0.2) !important;
      border-radius: 8px;
      font-size: 13px;
    }
    .actions-row {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 16px;
      border-top: 1px solid var(--border-color);
      padding-top: 12px;
      button {
        border-radius: 8px !important;
        font-weight: 600 !important;
      }
    }
  `]
})
export class DowngradeDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<DowngradeDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { planLabel: string }
  ) {}
  onCancel(): void { this.dialogRef.close(false); }
  onConfirm(): void { this.dialogRef.close(true); }
}
