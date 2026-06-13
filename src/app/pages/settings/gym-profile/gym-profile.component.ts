import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GymState } from '../../../presentation/state/gym.state';
import { Gym } from '../../../core/models/gym.entity';

@Component({
  selector: 'app-gym-profile',
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
    MatSnackBarModule
  ],
  template: `
    <div class="settings-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="title-area">
          <h1>Gym Profile</h1>
          <p>Configure gym contact information, corporate details, and social channels displayed on bills and member sheets.</p>
        </div>
      </div>

      <div class="content-body" *ngIf="activeGym; else loading">
        <form [formGroup]="profileForm" (ngSubmit)="onSave()" class="settings-form-layout">
          <div class="settings-grid">
            <!-- Column 1: Core Details & Logo -->
            <div class="settings-col">
              <div class="mat-card settings-card">
                <div class="card-title-row">
                  <mat-icon class="title-icon">business</mat-icon>
                  <h2>General Information</h2>
                </div>
                <p class="section-desc">Primary identification details used for invoices, branding, and correspondence.</p>

                <!-- Logo Uploader Mockup -->
                <div class="logo-uploader-container">
                  <div class="logo-preview-box">
                    <img *ngIf="profileForm.get('logoUrl')?.value; else noLogo" 
                         [src]="profileForm.get('logoUrl')?.value" 
                         alt="Gym Logo" 
                         class="logo-preview">
                    <ng-template #noLogo>
                      <mat-icon class="placeholder-icon">add_a_photo</mat-icon>
                    </ng-template>
                  </div>
                  <div class="uploader-actions">
                    <span class="uploader-title">Gym Branding Logo</span>
                    <span class="uploader-desc">Click below to provide an image URL. JPG or PNG.</span>
                    <mat-form-field appearance="outline" class="w-100 mini-field">
                      <mat-label>Logo Image URL</mat-label>
                      <input matInput formControlName="logoUrl" placeholder="https://example.com/logo.png">
                    </mat-form-field>
                  </div>
                </div>

                <div class="fields-stack">
                  <!-- Gym Name -->
                  <mat-form-field appearance="outline">
                    <mat-label>Gym Business Name</mat-label>
                    <input matInput formControlName="gymName">
                    <mat-error *ngIf="profileForm.get('gymName')?.hasError('required')">Gym name is required</mat-error>
                  </mat-form-field>

                  <div class="form-row">
                    <!-- Phone -->
                    <mat-form-field appearance="outline">
                      <mat-label>Contact Hotline</mat-label>
                      <input matInput formControlName="phone">
                      <mat-error *ngIf="profileForm.get('phone')?.hasError('required')">Hotline is required</mat-error>
                    </mat-form-field>

                    <!-- Email -->
                    <mat-form-field appearance="outline">
                      <mat-label>Support Email Address</mat-label>
                      <input matInput type="email" formControlName="email">
                      <mat-error *ngIf="profileForm.get('email')?.hasError('required')">Email is required</mat-error>
                      <mat-error *ngIf="profileForm.get('email')?.hasError('email')">Enter a valid email address</mat-error>
                    </mat-form-field>
                  </div>

                  <div class="form-row">
                    <!-- Website -->
                    <mat-form-field appearance="outline">
                      <mat-label>Official Website</mat-label>
                      <input matInput formControlName="website" placeholder="https://www.apexfit.com">
                    </mat-form-field>

                    <!-- GST Number -->
                    <mat-form-field appearance="outline">
                      <mat-label>GST Number / Tax ID</mat-label>
                      <input matInput formControlName="gstNumber" placeholder="29ABCDE1234F1Z5">
                    </mat-form-field>
                  </div>

                  <!-- Address -->
                  <mat-form-field appearance="outline">
                    <mat-label>Registered Address</mat-label>
                    <textarea matInput formControlName="address" rows="3" placeholder="Address, City, Postal Code"></textarea>
                    <mat-error *ngIf="profileForm.get('address')?.hasError('required')">Registered address is required</mat-error>
                  </mat-form-field>
                </div>
              </div>
            </div>

            <!-- Column 2: Social Media Connects -->
            <div class="settings-col">
              <div class="mat-card settings-card">
                <div class="card-title-row">
                  <mat-icon class="title-icon">share</mat-icon>
                  <h2>Social Network Links</h2>
                </div>
                <p class="section-desc">Provide public profiles to auto-include on digital receipt invoices and emails.</p>

                <div class="fields-stack social-stack">
                  <!-- Facebook -->
                  <mat-form-field appearance="outline">
                    <mat-label>Facebook URL</mat-label>
                    <input matInput formControlName="facebook" placeholder="https://facebook.com/apexfit">
                    <mat-icon matPrefix class="social-prefix fb">facebook</mat-icon>
                  </mat-form-field>

                  <!-- Instagram -->
                  <mat-form-field appearance="outline">
                    <mat-label>Instagram Handle / URL</mat-label>
                    <input matInput formControlName="instagram" placeholder="https://instagram.com/apexfit">
                    <mat-icon matPrefix class="social-prefix ig">photo_camera</mat-icon>
                  </mat-form-field>

                  <!-- Twitter -->
                  <mat-form-field appearance="outline">
                    <mat-label>Twitter / X URL</mat-label>
                    <input matInput formControlName="twitter" placeholder="https://twitter.com/apexfit">
                    <mat-icon matPrefix class="social-prefix tw">alternate_email</mat-icon>
                  </mat-form-field>

                  <!-- LinkedIn -->
                  <mat-form-field appearance="outline">
                    <mat-label>LinkedIn Page URL</mat-label>
                    <input matInput formControlName="linkedin" placeholder="https://linkedin.com/company/apexfit">
                    <mat-icon matPrefix class="social-prefix li">business_center</mat-icon>
                  </mat-form-field>
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Actions Bar -->
          <div class="action-bar-footer">
            <button mat-raised-button color="primary" type="submit" [disabled]="profileForm.invalid" class="save-settings-btn">
              <mat-icon>save</mat-icon>
              <span>Save Profile Changes</span>
            </button>
          </div>
        </form>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <mat-icon class="spin-icon">sync</mat-icon>
          <p>Fetching gym tenant profile details...</p>
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
    .logo-uploader-container {
      display: flex;
      gap: 20px;
      align-items: center;
      margin-bottom: 24px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed var(--border-color);
      border-radius: 12px;

      body.light-theme & {
        background: rgba(0, 0, 0, 0.02);
      }
    }
    .logo-preview-box {
      width: 72px;
      height: 72px;
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border-color);
      background: rgba(0, 0, 0, 0.2);
      flex-shrink: 0;

      .logo-preview {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .placeholder-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
        color: var(--text-muted);
      }
    }
    .uploader-actions {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;

      .uploader-title {
        font-size: 13.5px;
        font-weight: 600;
        color: var(--text-primary);
      }
      .uploader-desc {
        font-size: 11px;
        color: var(--text-muted);
        margin-bottom: 8px;
      }
      .mini-field {
        margin-bottom: -16px;
      }
    }
    .fields-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .social-stack {
      gap: 20px;
      
      .social-prefix {
        margin-right: 12px;
        &.fb { color: #1877f2; }
        &.ig { color: #e1306c; }
        &.tw { color: #1da1f2; }
        &.li { color: #0077b5; }
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
    @media (max-width: 599.98px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class GymProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  profileForm!: FormGroup;
  activeGym: Gym | null = null;

  constructor(
    private fb: FormBuilder,
    private gymState: GymState,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.profileForm = this.fb.group({
      gymName: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      logoUrl: [''],
      address: ['', Validators.required],
      website: [''],
      gstNumber: [''],
      facebook: [''],
      instagram: [''],
      twitter: [''],
      linkedin: ['']
    });

    this.gymState.activeGym$.pipe(takeUntil(this.destroy$)).subscribe(gym => {
      if (gym) {
        this.activeGym = gym;
        this.profileForm.patchValue({
          gymName: gym.gymName,
          phone: gym.phone,
          email: gym.email,
          logoUrl: gym.logoUrl || '',
          address: gym.address || '',
          website: gym.website || '',
          gstNumber: gym.gstNumber || '',
          facebook: gym.socialLinks?.facebook || '',
          instagram: gym.socialLinks?.instagram || '',
          twitter: gym.socialLinks?.twitter || '',
          linkedin: gym.socialLinks?.linkedin || ''
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
    if (this.profileForm.valid && this.activeGym) {
      const updated: Gym = {
        ...this.activeGym,
        gymName: this.profileForm.value.gymName,
        phone: this.profileForm.value.phone,
        email: this.profileForm.value.email,
        logoUrl: this.profileForm.value.logoUrl,
        address: this.profileForm.value.address,
        website: this.profileForm.value.website,
        gstNumber: this.profileForm.value.gstNumber || undefined,
        socialLinks: {
          facebook: this.profileForm.value.facebook || undefined,
          instagram: this.profileForm.value.instagram || undefined,
          twitter: this.profileForm.value.twitter || undefined,
          linkedin: this.profileForm.value.linkedin || undefined
        }
      };

      this.gymState.updateGym(updated).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => {
          this.snackBar.open('Gym profile details updated successfully!', 'Dismiss', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(`Failed to save settings: ${err.message || err}`, 'Dismiss', { duration: 4000 });
        }
      });
    }
  }
}
