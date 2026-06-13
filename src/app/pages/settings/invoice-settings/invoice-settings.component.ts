import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GymState } from '../../../presentation/state/gym.state';
import { Gym } from '../../../core/models/gym.entity';

@Component({
  selector: 'app-invoice-settings',
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
    MatSnackBarModule
  ],
  template: `
    <div class="settings-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="title-area">
          <h1>Invoice Settings</h1>
          <p>Customize invoice layouts, tax parameters, currency formats, and printed footer comments.</p>
        </div>
      </div>

      <div class="content-body" *ngIf="activeGym; else loading">
        <form [formGroup]="invoiceForm" (ngSubmit)="onSave()" class="settings-form-layout">
          <div class="settings-grid">
            
            <!-- Left Card: General Invoices & Tax parameters -->
            <div class="settings-col">
              <div class="mat-card settings-card">
                <div class="card-title-row">
                  <mat-icon class="title-icon">description</mat-icon>
                  <h2>Invoice Layout &amp; Taxes</h2>
                </div>
                <p class="section-desc">Format settings and legal tax properties included on generated receipts.</p>

                <div class="fields-stack">
                  <!-- Invoice Prefix -->
                  <mat-form-field appearance="outline">
                    <mat-label>Invoice Number Prefix</mat-label>
                    <input matInput formControlName="prefix" placeholder="e.g. APEX-DT-">
                    <mat-hint>Sequential bills will generate as (e.g. APEX-DT-0001).</mat-hint>
                    <mat-error *ngIf="invoiceForm.get('prefix')?.hasError('required')">Prefix is required</mat-error>
                  </mat-form-field>

                  <div class="form-row">
                    <!-- Tax Name -->
                    <mat-form-field appearance="outline">
                      <mat-label>Tax Identifier Name</mat-label>
                      <input matInput formControlName="taxName" placeholder="e.g. GST, VAT">
                      <mat-error *ngIf="invoiceForm.get('taxName')?.hasError('required')">Tax Name is required</mat-error>
                    </mat-form-field>

                    <!-- Tax Rate -->
                    <mat-form-field appearance="outline">
                      <mat-label>Tax Rate Percentage (%)</mat-label>
                      <input matInput type="number" step="0.1" formControlName="taxRate">
                      <mat-error *ngIf="invoiceForm.get('taxRate')?.hasError('required')">Tax Rate is required</mat-error>
                      <mat-error *ngIf="invoiceForm.get('taxRate')?.hasError('min')">Tax cannot be negative</mat-error>
                    </mat-form-field>
                  </div>

                  <!-- Base Currency -->
                  <mat-form-field appearance="outline">
                    <mat-label>Invoice Currency Token</mat-label>
                    <mat-select formControlName="currency">
                      <mat-option value="₹">Indian Rupee (₹)</mat-option>
                      <mat-option value="$">US Dollar ($)</mat-option>
                      <mat-option value="€">Euro (€)</mat-option>
                      <mat-option value="£">British Pound (£)</mat-option>
                    </mat-select>
                    <mat-error *ngIf="invoiceForm.get('currency')?.hasError('required')">Currency is required</mat-error>
                  </mat-form-field>
                </div>
              </div>
            </div>

            <!-- Right Card: Invoice Footer & Notes -->
            <div class="settings-col">
              <div class="mat-card settings-card">
                <div class="card-title-row">
                  <mat-icon class="title-icon">notes</mat-icon>
                  <h2>Invoice Footer &amp; Terms</h2>
                </div>
                <p class="section-desc">Add standard footer messages, instructions, or terms printed at the bottom of bills.</p>

                <div class="fields-stack">
                  <!-- Footer Notes -->
                  <mat-form-field appearance="outline">
                    <mat-label>Footer Notes &amp; Legal Terms</mat-label>
                    <textarea matInput formControlName="footerNotes" rows="6" placeholder="e.g. Terms & Conditions: Fees once paid are non-refundable. Thank you for your business!"></textarea>
                  </mat-form-field>
                </div>
              </div>
            </div>

          </div>

          <!-- Save Button -->
          <div class="action-bar-footer">
            <button mat-raised-button color="primary" type="submit" [disabled]="invoiceForm.invalid" class="save-settings-btn">
              <mat-icon>save</mat-icon>
              <span>Save Invoice Settings</span>
            </button>
          </div>
        </form>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <mat-icon class="spin-icon">sync</mat-icon>
          <p>Fetching invoice configurations...</p>
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
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
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
    @media (max-width: 599.98px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class InvoiceSettingsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  invoiceForm!: FormGroup;
  activeGym: Gym | null = null;

  constructor(
    private fb: FormBuilder,
    private gymState: GymState,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.invoiceForm = this.fb.group({
      prefix: ['', Validators.required],
      taxName: ['', Validators.required],
      taxRate: [0, [Validators.required, Validators.min(0)]],
      currency: ['₹', Validators.required],
      footerNotes: ['']
    });

    this.gymState.activeGym$.pipe(takeUntil(this.destroy$)).subscribe(gym => {
      if (gym) {
        this.activeGym = gym;
        this.invoiceForm.patchValue({
          prefix: gym.invoiceSettings?.prefix || 'INV-',
          taxName: gym.invoiceSettings?.taxName || 'GST',
          taxRate: gym.invoiceSettings ? gym.invoiceSettings.taxRate : 18,
          currency: gym.paymentSettings?.currency || '₹',
          footerNotes: gym.invoiceSettings?.footerNotes || ''
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
    if (this.invoiceForm.valid && this.activeGym) {
      const updated: Gym = {
        ...this.activeGym,
        invoiceSettings: {
          prefix: this.invoiceForm.value.prefix,
          taxName: this.invoiceForm.value.taxName,
          taxRate: Number(this.invoiceForm.value.taxRate),
          footerNotes: this.invoiceForm.value.footerNotes || undefined
        },
        paymentSettings: {
          ...this.activeGym.paymentSettings,
          currency: this.invoiceForm.value.currency
        } as any
      };

      this.gymState.updateGym(updated).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.snackBar.open('Invoice settings saved successfully!', 'Dismiss', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(`Failed to save settings: ${err.message || err}`, 'Dismiss', { duration: 4000 });
        }
      });
    }
  }
}
