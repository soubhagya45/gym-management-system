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

interface ColorPreset {
  name: string;
  primary: string;
  secondary: string;
  label: string;
}

@Component({
  selector: 'app-branding',
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
          <h1>Branding &amp; Customization</h1>
          <p>Style the Apex Fit interface to represent your gym. Configure brand colors, logo imagery, and default page themes.</p>
        </div>
      </div>

      <div class="content-body" *ngIf="activeGym; else loading">
        <form [formGroup]="brandingForm" (ngSubmit)="onSave()" class="settings-form-layout">
          <div class="settings-grid">
            
            <!-- Column 1: Color Presets & Custom Swatches -->
            <div class="settings-col">
              <div class="mat-card settings-card">
                <div class="card-title-row">
                  <mat-icon class="title-icon">palette</mat-icon>
                  <h2>Accent Color Scheme</h2>
                </div>
                <p class="section-desc">Select an elegant color combination from our presets or specify custom HEX keys.</p>

                <!-- Color Presets Grid -->
                <div class="presets-grid">
                  <div class="preset-item" 
                       *ngFor="let preset of presets"
                       [class.selected]="isSelectedPreset(preset)"
                       (click)="applyPreset(preset)">
                    <div class="preset-colors">
                      <span class="color-dot" [style.background]="preset.primary"></span>
                      <span class="color-dot secondary" [style.background]="preset.secondary"></span>
                    </div>
                    <span class="preset-label">{{ preset.label }}</span>
                  </div>
                </div>

                <div class="fields-stack mt-4">
                  <div class="form-row">
                    <!-- Primary Color -->
                    <mat-form-field appearance="outline">
                      <mat-label>Primary Accent Color (HEX)</mat-label>
                      <input matInput formControlName="primaryColor" placeholder="#6366f1" (input)="onCustomColorChange()">
                      <span matPrefix class="color-indicator" [style.background]="brandingForm.get('primaryColor')?.value"></span>
                      <mat-error *ngIf="brandingForm.get('primaryColor')?.hasError('pattern')">Enter valid HEX color</mat-error>
                      <mat-error *ngIf="brandingForm.get('primaryColor')?.hasError('required')">Required</mat-error>
                    </mat-form-field>

                    <!-- Secondary Color -->
                    <mat-form-field appearance="outline">
                      <mat-label>Secondary Accent Color (HEX)</mat-label>
                      <input matInput formControlName="secondaryColor" placeholder="#8b5cf6" (input)="onCustomColorChange()">
                      <span matPrefix class="color-indicator" [style.background]="brandingForm.get('secondaryColor')?.value"></span>
                      <mat-error *ngIf="brandingForm.get('secondaryColor')?.hasError('pattern')">Enter valid HEX color</mat-error>
                      <mat-error *ngIf="brandingForm.get('secondaryColor')?.hasError('required')">Required</mat-error>
                    </mat-form-field>
                  </div>

                  <!-- Theme Mode -->
                  <mat-form-field appearance="outline">
                    <mat-label>Default Theme Skin</mat-label>
                    <mat-select formControlName="theme">
                      <mat-option value="light">Light Theme Mode</mat-option>
                      <mat-option value="dark">Dark Theme Mode</mat-option>
                    </mat-select>
                  </mat-form-field>
                </div>
              </div>
            </div>

            <!-- Column 2: Live UI Preview Mockup -->
            <div class="settings-col">
              <div class="mat-card settings-card preview-card">
                <div class="card-title-row">
                  <mat-icon class="title-icon">visibility</mat-icon>
                  <h2>Live Branded UI Preview</h2>
                </div>
                <p class="section-desc">See how your accent colors dynamically apply across the application dashboard components.</p>

                <!-- Preview container -->
                <div class="preview-container glass-panel" [class.preview-light]="brandingForm.get('theme')?.value === 'light'">
                  <div class="preview-header">
                    <div class="preview-logo">
                      <mat-icon class="logo-icon" [style.color]="brandingForm.get('primaryColor')?.value">fitness_center</mat-icon>
                      <span class="logo-text">APEX<span class="logo-highlight" [style.color]="brandingForm.get('primaryColor')?.value">FIT</span></span>
                    </div>
                    <div class="preview-menu-dots">
                      <span></span><span></span><span></span>
                    </div>
                  </div>

                  <!-- Inside Body Card -->
                  <div class="preview-body">
                    <div class="preview-card-element">
                      <div class="preview-card-icon" [style.background]="getGradientStyle()">
                        <mat-icon>people</mat-icon>
                      </div>
                      <div class="preview-card-info">
                        <span class="preview-card-num">142</span>
                        <span class="preview-card-lbl">Total Enrolled Members</span>
                      </div>
                    </div>

                    <!-- Button Preview -->
                    <button class="preview-btn" [style.background]="getGradientStyle()">
                      <mat-icon>check_circle</mat-icon>
                      <span>Authorize Payment</span>
                    </button>

                    <!-- Tab indicators preview -->
                    <div class="preview-tabs">
                      <span class="tab active" [style.border-color]="brandingForm.get('primaryColor')?.value" [style.color]="brandingForm.get('primaryColor')?.value">General Settings</span>
                      <span class="tab">Subscriptions</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- Action bar -->
          <div class="action-bar-footer">
            <button mat-raised-button color="primary" type="submit" [disabled]="brandingForm.invalid" class="save-settings-btn">
              <mat-icon>save</mat-icon>
              <span>Save &amp; Apply Branding</span>
            </button>
          </div>
        </form>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <mat-icon class="spin-icon">sync</mat-icon>
          <p>Fetching branding customization configurations...</p>
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
    .presets-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .preset-item {
      padding: 12px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      transition: all 0.2s ease;

      body.light-theme & {
        background: rgba(0, 0, 0, 0.02);
      }

      &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: var(--text-muted);
        body.light-theme & { background: rgba(0, 0, 0, 0.05); }
      }

      &.selected {
        border-color: var(--accent-color);
        background: rgba(99, 102, 241, 0.08);
        body.light-theme & { background: rgba(99, 102, 241, 0.05); }
      }
    }
    .preset-colors {
      display: flex;
      gap: 4px;
    }
    .color-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .preset-label {
      font-size: 11px;
      font-weight: 600;
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
    .color-indicator {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      display: inline-block;
      margin-right: 10px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .preview-card {
      align-items: stretch;
    }
    .preview-container {
      background: #12131a;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-top: 12px;
      flex: 1;
      min-height: 230px;
      box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
      transition: all 0.3s ease;

      &.preview-light {
        background: #f8fafc;
        border-color: rgba(0, 0, 0, 0.08);
        box-shadow: inset 0 0 20px rgba(0,0,0,0.02);
        
        .logo-text { color: #0f172a !important; }
        .preview-card-element { background: #ffffff; border-color: rgba(0,0,0,0.05); }
        .preview-card-num { color: #0f172a; }
        .preview-card-lbl { color: #475569; }
        .preview-tabs { border-color: rgba(0,0,0,0.08); .tab { color: #64748b; } }
      }
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.05);
      
      body.light-theme & { border-color: rgba(0,0,0,0.05); }
      .preview-logo {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.05em;
        .logo-icon { font-size: 16px; width: 16px; height: 16px; }
        .logo-text { color: #ffffff; }
      }
      .preview-menu-dots {
        display: flex;
        gap: 3px;
        span { width: 4px; height: 4px; border-radius: 50%; background: #4a5568; }
      }
    }
    .preview-body {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .preview-card-element {
      background: #161722;
      border: 1px solid rgba(255,255,255,0.05);
      border-radius: 10px;
      padding: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      
      .preview-card-icon {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
      }
      .preview-card-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .preview-card-num { font-size: 15px; font-weight: 800; color: #ffffff; }
      .preview-card-lbl { font-size: 11px; color: #a0aec0; }
    }
    .preview-btn {
      width: 100%;
      height: 36px;
      border-radius: 6px;
      border: none;
      color: #ffffff;
      font-weight: 700;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      cursor: pointer;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .preview-tabs {
      display: flex;
      gap: 16px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      
      .tab {
        font-size: 11.5px;
        font-weight: 600;
        color: #718096;
        padding-bottom: 6px;
        border-bottom: 2px solid transparent;
        
        &.active {
          border-bottom: 2px solid var(--accent-color);
          color: var(--accent-color);
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
export class BrandingComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  brandingForm!: FormGroup;
  activeGym: Gym | null = null;

  presets: ColorPreset[] = [
    { name: 'default', primary: '#6366f1', secondary: '#8b5cf6', label: 'Indigo Neon (Default)' },
    { name: 'emerald', primary: '#10b981', secondary: '#059669', label: 'Emerald Mint' },
    { name: 'rose', primary: '#f43f5e', secondary: '#be123c', label: 'Rose Velvet' },
    { name: 'amber', primary: '#f59e0b', secondary: '#d97706', label: 'Amber Bronze' },
    { name: 'cyan', primary: '#06b6d4', secondary: '#0891b2', label: 'Cyan Ocean' },
    { name: 'violet', primary: '#8b5cf6', secondary: '#d946ef', label: 'Violet Glow' }
  ];

  constructor(
    private fb: FormBuilder,
    private gymState: GymState,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    
    this.brandingForm = this.fb.group({
      primaryColor: ['#6366f1', [Validators.required, Validators.pattern(hexPattern)]],
      secondaryColor: ['#8b5cf6', [Validators.required, Validators.pattern(hexPattern)]],
      theme: ['dark', Validators.required]
    });

    this.gymState.activeGym$.pipe(takeUntil(this.destroy$)).subscribe(gym => {
      if (gym) {
        this.activeGym = gym;
        this.brandingForm.patchValue({
          primaryColor: gym.branding?.primaryColor || '#6366f1',
          secondaryColor: gym.branding?.secondaryColor || '#8b5cf6',
          theme: gym.branding?.theme || 'dark'
        });
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  isSelectedPreset(preset: ColorPreset): boolean {
    const formPri = this.brandingForm.get('primaryColor')?.value?.toLowerCase();
    const formSec = this.brandingForm.get('secondaryColor')?.value?.toLowerCase();
    return formPri === preset.primary.toLowerCase() && formSec === preset.secondary.toLowerCase();
  }

  applyPreset(preset: ColorPreset): void {
    this.brandingForm.patchValue({
      primaryColor: preset.primary,
      secondaryColor: preset.secondary
    });
    this.cdr.markForCheck();
  }

  onCustomColorChange(): void {
    this.cdr.markForCheck();
  }

  getGradientStyle(): string {
    const pri = this.brandingForm.get('primaryColor')?.value || '#6366f1';
    const sec = this.brandingForm.get('secondaryColor')?.value || '#8b5cf6';
    return `linear-gradient(135deg, ${pri} 0%, ${sec} 100%)`;
  }

  onSave(): void {
    if (this.brandingForm.valid && this.activeGym) {
      const updated: Gym = {
        ...this.activeGym,
        branding: {
          logoUrl: this.activeGym.logoUrl,
          primaryColor: this.brandingForm.value.primaryColor,
          secondaryColor: this.brandingForm.value.secondaryColor,
          theme: this.brandingForm.value.theme
        }
      };

      this.gymState.updateGym(updated).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.snackBar.open('Gym branding customization saved and applied!', 'Dismiss', { duration: 3000 });
          
          // Instantly toggle application layout theme if saved
          const selectedTheme = this.brandingForm.value.theme;
          if (selectedTheme === 'dark') {
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
          } else if (selectedTheme === 'light') {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
          }
        },
        error: (err) => {
          this.snackBar.open(`Failed to save settings: ${err.message || err}`, 'Dismiss', { duration: 4000 });
        }
      });
    }
  }
}
