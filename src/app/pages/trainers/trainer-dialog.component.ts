import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Trainer } from '../../core/models/trainer.entity';

@Component({
  selector: 'app-trainer-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title class="gradient-text dialogue-title">
      {{ isEdit ? 'Edit Trainer Profile' : 'Register New Trainer' }}
    </h2>
    
    <form [formGroup]="trainerForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        <!-- Avatar Preview -->
        <div class="avatar-select-section">
          <div class="avatar-preview">
            <img [src]="selectedAvatarUrl || 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=150'" alt="Trainer Avatar Preview">
          </div>
          <div class="avatar-inputs">
            <mat-form-field appearance="outline">
              <mat-label>Avatar Image URL</mat-label>
              <input matInput formControlName="avatarUrl" placeholder="Unsplash URL" (input)="onAvatarChange($event)">
              <mat-hint>Paste an image URL or leave blank for default</mat-hint>
            </mat-form-field>
          </div>
        </div>

        <div class="form-grid">
          <!-- Name -->
          <mat-form-field appearance="outline">
            <mat-label>Trainer Name</mat-label>
            <input matInput formControlName="name" placeholder="Marcus Vance">
            <mat-error *ngIf="trainerForm.get('name')?.hasError('required')">Name is required</mat-error>
          </mat-form-field>

          <!-- Specialty -->
          <mat-form-field appearance="outline">
            <mat-label>Specialty / Skillset</mat-label>
            <input matInput formControlName="specialty" placeholder="e.g. Strength, Powerlifting, HIIT">
            <mat-error *ngIf="trainerForm.get('specialty')?.hasError('required')">Specialty is required</mat-error>
          </mat-form-field>

          <!-- Email -->
          <mat-form-field appearance="outline">
            <mat-label>Email Address</mat-label>
            <input matInput type="email" formControlName="email" placeholder="marcus.v@apexfit.com">
            <mat-error *ngIf="trainerForm.get('email')?.hasError('required')">Email is required</mat-error>
            <mat-error *ngIf="trainerForm.get('email')?.hasError('email')">Enter a valid email</mat-error>
          </mat-form-field>

          <!-- Phone -->
          <mat-form-field appearance="outline">
            <mat-label>Phone Number</mat-label>
            <input matInput formControlName="phone" placeholder="+1 (555) 000-0000">
            <mat-error *ngIf="trainerForm.get('phone')?.hasError('required')">Phone is required</mat-error>
          </mat-form-field>

          <!-- Status -->
          <mat-form-field appearance="outline">
            <mat-label>Work Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="active">Active Duty</mat-option>
              <mat-option value="on leave">On Leave</mat-option>
            </mat-select>
            <mat-error *ngIf="trainerForm.get('status')?.hasError('required')">Status is required</mat-error>
          </mat-form-field>

          <!-- Rating -->
          <mat-form-field appearance="outline">
            <mat-label>Trainer Rating (1.0 - 5.0)</mat-label>
            <input matInput type="number" step="0.1" min="1" max="5" formControlName="rating">
            <mat-error *ngIf="trainerForm.get('rating')?.hasError('min') || trainerForm.get('rating')?.hasError('max')">
              Rating must be between 1.0 and 5.0
            </mat-error>
          </mat-form-field>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="trainerForm.invalid">
          {{ isEdit ? 'Save Changes' : 'Register Trainer' }}
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .dialogue-title {
      font-weight: 700;
      font-size: 22px;
      margin-bottom: 20px;
    }
    .dialog-form-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 10px !important;
    }
    .avatar-select-section {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 8px;
    }
    .avatar-preview {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      overflow: hidden;
      border: 2px solid var(--border-color);
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
    .avatar-inputs {
      flex: 1;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .dialog-actions {
      padding: 16px 0 0 0 !important;
      gap: 8px;
    }
    
    @media (max-width: 599.98px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TrainerDialogComponent implements OnInit {
  trainerForm!: FormGroup;
  isEdit = false;
  selectedAvatarUrl = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<TrainerDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Trainer | null
  ) {}

  ngOnInit(): void {
    this.isEdit = !!this.data;
    this.selectedAvatarUrl = this.data?.avatarUrl || '';

    this.trainerForm = this.fb.group({
      name: [this.data?.name || '', [Validators.required]],
      specialty: [this.data?.specialty || '', [Validators.required]],
      email: [this.data?.email || '', [Validators.required, Validators.email]],
      phone: [this.data?.phone || '', [Validators.required]],
      status: [this.data?.status || 'active', [Validators.required]],
      rating: [this.data?.rating || 4.8, [Validators.min(1.0), Validators.max(5.0)]],
      avatarUrl: [this.data?.avatarUrl || '']
    });
  }

  onAvatarChange(event: any): void {
    this.selectedAvatarUrl = event.target.value;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.trainerForm.valid) {
      const formValue = this.trainerForm.value;
      
      const trainerResult = {
        ...formValue,
        avatarUrl: formValue.avatarUrl || 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=150'
      };

      if (this.isEdit && this.data) {
        this.dialogRef.close({
          ...this.data,
          ...trainerResult
        });
      } else {
        this.dialogRef.close(trainerResult);
      }
    }
  }
}
