import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GymState } from '../../../presentation/state/gym.state';
import { Gym } from '../../../core/models/gym.entity';

@Component({
  selector: 'app-integrations',
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
    MatSnackBarModule
  ],
  template: `
    <div class="settings-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="title-area">
          <h1>Integrations &amp; Add-ons</h1>
          <p>Prepare API credentials and endpoints for third-party services. Toggles enable modular data piping asynchronously.</p>
        </div>
      </div>

      <div class="content-body" *ngIf="activeGym; else loading">
        <form [formGroup]="integrationsForm" (ngSubmit)="onSave()" class="settings-form-layout">
          <div class="integrations-grid">
            
            <!-- Card 1: WhatsApp Cloud API -->
            <div class="mat-card integration-card glass-panel" [class.enabled]="integrationsForm.get('waEnabled')?.value">
              <div class="card-header-row">
                <div class="integration-brand">
                  <mat-icon class="brand-icon wa">chat</mat-icon>
                  <div class="brand-info">
                    <h3>WhatsApp Messaging</h3>
                    <span class="status-indicator" [class.active]="integrationsForm.get('waEnabled')?.value">
                      {{ integrationsForm.get('waEnabled')?.value ? 'Active' : 'Disabled' }}
                    </span>
                  </div>
                </div>
                <mat-slide-toggle formControlName="waEnabled"></mat-slide-toggle>
              </div>
              <p class="section-desc">Broadcast automated membership alerts, renewal invoices, and check-in greeting templates.</p>

              <div class="fields-stack" *ngIf="integrationsForm.get('waEnabled')?.value">
                <mat-form-field appearance="outline">
                  <mat-label>Cloud API Access Token</mat-label>
                  <input matInput [type]="showWaKey ? 'text' : 'password'" formControlName="waApiKey">
                  <button mat-icon-button matSuffix (click)="showWaKey = !showWaKey" type="button" class="eye-btn">
                    <mat-icon>{{ showWaKey ? 'visibility' : 'visibility_off' }}</mat-icon>
                  </button>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Sender Phone Number ID</mat-label>
                  <input matInput formControlName="waSenderPhone" placeholder="+91 90000 11111">
                </mat-form-field>
              </div>
            </div>

            <!-- Card 2: Razorpay Payment Gateway -->
            <div class="mat-card integration-card glass-panel" [class.enabled]="integrationsForm.get('rzpEnabled')?.value">
              <div class="card-header-row">
                <div class="integration-brand">
                  <mat-icon class="brand-icon rzp">payment</mat-icon>
                  <div class="brand-info">
                    <h3>Razorpay Payments</h3>
                    <span class="status-indicator" [class.active]="integrationsForm.get('rzpEnabled')?.value">
                      {{ integrationsForm.get('rzpEnabled')?.value ? 'Active' : 'Disabled' }}
                    </span>
                  </div>
                </div>
                <mat-slide-toggle formControlName="rzpEnabled"></mat-slide-toggle>
              </div>
              <p class="section-desc">Accept instant client payments via UPI, Credit/Debit cards, and Netbanking APIs inside India.</p>

              <div class="fields-stack" *ngIf="integrationsForm.get('rzpEnabled')?.value">
                <mat-form-field appearance="outline">
                  <mat-label>Merchant Account ID</mat-label>
                  <input matInput formControlName="rzpMerchantId" placeholder="acc_live_abc123">
                </mat-form-field>

                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Razorpay Key ID</mat-label>
                    <input matInput formControlName="rzpKeyId" placeholder="rzp_live_abc123">
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Razorpay Key Secret</mat-label>
                    <input matInput [type]="showRzpSecret ? 'text' : 'password'" formControlName="rzpKeySecret">
                    <button mat-icon-button matSuffix (click)="showRzpSecret = !showRzpSecret" type="button" class="eye-btn">
                      <mat-icon>{{ showRzpSecret ? 'visibility' : 'visibility_off' }}</mat-icon>
                    </button>
                  </mat-form-field>
                </div>
              </div>
            </div>

            <!-- Card 3: Stripe Subscriptions Gateway -->
            <div class="mat-card integration-card glass-panel" [class.enabled]="integrationsForm.get('stripeEnabled')?.value">
              <div class="card-header-row">
                <div class="integration-brand">
                  <mat-icon class="brand-icon stripe">account_balance_wallet</mat-icon>
                  <div class="brand-info">
                    <h3>Stripe Terminal</h3>
                    <span class="status-indicator" [class.active]="integrationsForm.get('stripeEnabled')?.value">
                      {{ integrationsForm.get('stripeEnabled')?.value ? 'Active' : 'Disabled' }}
                    </span>
                  </div>
                </div>
                <mat-slide-toggle formControlName="stripeEnabled"></mat-slide-toggle>
              </div>
              <p class="section-desc">Process recurring membership billing credit card subscriptions globally.</p>

              <div class="fields-stack" *ngIf="integrationsForm.get('stripeEnabled')?.value">
                <mat-form-field appearance="outline">
                  <mat-label>Stripe Publishable Key</mat-label>
                  <input matInput formControlName="stripePublishableKey" placeholder="pk_live_...">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Stripe Secret Key</mat-label>
                  <input matInput [type]="showStripeSecret ? 'text' : 'password'" formControlName="stripeSecretKey">
                  <button mat-icon-button matSuffix (click)="showStripeSecret = !showStripeSecret" type="button" class="eye-btn">
                    <mat-icon>{{ showStripeSecret ? 'visibility' : 'visibility_off' }}</mat-icon>
                  </button>
                </mat-form-field>
              </div>
            </div>

            <!-- Card 4: Firebase SDK Context -->
            <div class="mat-card integration-card glass-panel" [class.enabled]="integrationsForm.get('fbEnabled')?.value">
              <div class="card-header-row">
                <div class="integration-brand">
                  <mat-icon class="brand-icon fb">cloud_queue</mat-icon>
                  <div class="brand-info">
                    <h3>Firebase Storage</h3>
                    <span class="status-indicator" [class.active]="integrationsForm.get('fbEnabled')?.value">
                      {{ integrationsForm.get('fbEnabled')?.value ? 'Active' : 'Disabled' }}
                    </span>
                  </div>
                </div>
                <mat-slide-toggle formControlName="fbEnabled"></mat-slide-toggle>
              </div>
              <p class="section-desc">Store images, secure document receipts, backups, and user avatar logs directly on cloud databases.</p>

              <div class="fields-stack" *ngIf="integrationsForm.get('fbEnabled')?.value">
                <div class="form-row">
                  <mat-form-field appearance="outline">
                    <mat-label>API Key ID</mat-label>
                    <input matInput formControlName="fbApiKey" placeholder="AIzaSy...">
                  </mat-form-field>

                  <mat-form-field appearance="outline">
                    <mat-label>Project ID</mat-label>
                    <input matInput formControlName="fbProjectId" placeholder="apexfit-saas">
                  </mat-form-field>
                </div>

                <mat-form-field appearance="outline">
                  <mat-label>Auth Domain URL</mat-label>
                  <input matInput formControlName="fbAuthDomain" placeholder="apexfit-saas.firebaseapp.com">
                </mat-form-field>
              </div>
            </div>

            <!-- Card 5: REST API / Webhooks Sync -->
            <div class="mat-card integration-card glass-panel" [class.enabled]="integrationsForm.get('restEnabled')?.value">
              <div class="card-header-row">
                <div class="integration-brand">
                  <mat-icon class="brand-icon rest">sync_alt</mat-icon>
                  <div class="brand-info">
                    <h3>REST API Sync</h3>
                    <span class="status-indicator" [class.active]="integrationsForm.get('restEnabled')?.value">
                      {{ integrationsForm.get('restEnabled')?.value ? 'Active' : 'Disabled' }}
                    </span>
                  </div>
                </div>
                <mat-slide-toggle formControlName="restEnabled"></mat-slide-toggle>
              </div>
              <p class="section-desc">Synchronize active registries, payment logs, and check-in events to external endpoints.</p>

              <div class="fields-stack" *ngIf="integrationsForm.get('restEnabled')?.value">
                <mat-form-field appearance="outline">
                  <mat-label>Target Base Endpoint URL</mat-label>
                  <input matInput formControlName="restBaseUrl" placeholder="https://api.mygym.com/v1">
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Bearer Authorization Token</mat-label>
                  <input matInput [type]="showRestToken ? 'text' : 'password'" formControlName="restApiToken">
                  <button mat-icon-button matSuffix (click)="showRestToken = !showRestToken" type="button" class="eye-btn">
                    <mat-icon>{{ showRestToken ? 'visibility' : 'visibility_off' }}</mat-icon>
                  </button>
                </mat-form-field>
              </div>
            </div>

          </div>

          <!-- Bottom Save Actions -->
          <div class="action-bar-footer">
            <button mat-raised-button color="primary" type="submit" class="save-settings-btn">
              <mat-icon>save</mat-icon>
              <span>Save Integrations Configuration</span>
            </button>
          </div>
        </form>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <mat-icon class="spin-icon">sync</mat-icon>
          <p>Fetching integrations configurations...</p>
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
    .integrations-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 24px;
    }
    .integration-card {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 24px !important;
      border: 1px solid var(--border-color) !important;
      transition: all 0.3s ease;

      &.enabled {
        border-color: rgba(99, 102, 241, 0.35) !important;
        background: rgba(99, 102, 241, 0.02) !important;
      }
    }
    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .integration-brand {
      display: flex;
      align-items: center;
      gap: 16px;

      .brand-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        
        &.wa { color: #25d366; }
        &.rzp { color: #3396ff; }
        &.stripe { color: #6772e5; }
        &.fb { color: #ffca28; }
        &.rest { color: #10b981; }
      }
      
      .brand-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        
        h3 {
          font-size: 16px;
          font-weight: 700;
          margin: 0;
        }
        .status-indicator {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: var(--text-muted);
          letter-spacing: 0.05em;
          
          &.active {
            color: var(--success);
          }
        }
      }
    }
    .section-desc {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
      margin: 0;
    }
    .fields-stack {
      display: flex;
      flex-direction: column;
      gap: 12px;
      animation: expandHeight 0.25s ease;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .eye-btn {
      color: var(--text-muted);
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
    @keyframes expandHeight {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 959.98px) {
      .integrations-grid {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 599.98px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class IntegrationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  integrationsForm!: FormGroup;
  activeGym: Gym | null = null;

  showWaKey = false;
  showRzpSecret = false;
  showStripeSecret = false;
  showRestToken = false;

  constructor(
    private fb: FormBuilder,
    private gymState: GymState,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.integrationsForm = this.fb.group({
      waEnabled: [true],
      waApiKey: [''],
      waSenderPhone: [''],
      
      rzpEnabled: [true],
      rzpMerchantId: [''],
      rzpKeyId: [''],
      rzpKeySecret: [''],
      
      stripeEnabled: [false],
      stripePublishableKey: [''],
      stripeSecretKey: [''],
      
      fbEnabled: [false],
      fbApiKey: [''],
      fbProjectId: [''],
      fbAuthDomain: [''],
      
      restEnabled: [false],
      restBaseUrl: [''],
      restApiToken: ['']
    });

    this.gymState.activeGym$.pipe(takeUntil(this.destroy$)).subscribe(gym => {
      if (gym) {
        this.activeGym = gym;
        
        this.integrationsForm.patchValue({
          waEnabled: gym.integrations?.whatsapp?.isEnabled ?? false,
          waApiKey: gym.integrations?.whatsapp?.apiKey || '',
          waSenderPhone: gym.integrations?.whatsapp?.senderPhone || '',
          
          rzpEnabled: gym.integrations?.razorpay?.isEnabled ?? false,
          rzpMerchantId: gym.integrations?.razorpay?.merchantId || '',
          rzpKeyId: gym.integrations?.razorpay?.keyId || '',
          rzpKeySecret: gym.integrations?.razorpay?.keySecret || '',
          
          stripeEnabled: gym.integrations?.stripe?.isEnabled ?? false,
          stripePublishableKey: gym.integrations?.stripe?.publishableKey || '',
          stripeSecretKey: gym.integrations?.stripe?.secretKey || '',
          
          fbEnabled: gym.integrations?.firebase?.isEnabled ?? false,
          fbApiKey: gym.integrations?.firebase?.apiKey || '',
          fbProjectId: gym.integrations?.firebase?.projectId || '',
          fbAuthDomain: gym.integrations?.firebase?.authDomain || '',
          
          restEnabled: gym.integrations?.restApi?.isEnabled ?? false,
          restBaseUrl: gym.integrations?.restApi?.baseUrl || '',
          restApiToken: gym.integrations?.restApi?.apiToken || ''
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
        integrations: {
          whatsapp: {
            isEnabled: !!this.integrationsForm.value.waEnabled,
            apiKey: this.integrationsForm.value.waApiKey || undefined,
            senderPhone: this.integrationsForm.value.waSenderPhone || undefined
          },
          razorpay: {
            isEnabled: !!this.integrationsForm.value.rzpEnabled,
            merchantId: this.integrationsForm.value.rzpMerchantId || undefined,
            keyId: this.integrationsForm.value.rzpKeyId || undefined,
            keySecret: this.integrationsForm.value.rzpKeySecret || undefined
          },
          stripe: {
            isEnabled: !!this.integrationsForm.value.stripeEnabled,
            publishableKey: this.integrationsForm.value.stripePublishableKey || undefined,
            secretKey: this.integrationsForm.value.stripeSecretKey || undefined
          },
          firebase: {
            isEnabled: !!this.integrationsForm.value.fbEnabled,
            apiKey: this.integrationsForm.value.fbApiKey || undefined,
            projectId: this.integrationsForm.value.fbProjectId || undefined,
            authDomain: this.integrationsForm.value.fbAuthDomain || undefined
          },
          restApi: {
            isEnabled: !!this.integrationsForm.value.restEnabled,
            baseUrl: this.integrationsForm.value.restBaseUrl || undefined,
            apiToken: this.integrationsForm.value.restApiToken || undefined
          }
        }
      };

      this.gymState.updateGym(updated).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.snackBar.open('Integrations configurations saved successfully!', 'Dismiss', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(`Failed to save settings: ${err.message || err}`, 'Dismiss', { duration: 4000 });
        }
      });
    }
  }
}
