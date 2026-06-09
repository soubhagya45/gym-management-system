import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { Member } from '../../core/models/member.entity';

@Component({
  selector: 'app-log-body-progress-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title class="gradient-text dialogue-title">
      Log Body Progress
    </h2>
    
    <div class="member-badge" *ngIf="member">
      <img [src]="member.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'" alt="Avatar">
      <div class="member-info">
        <div class="name">{{ member.name }}</div>
        <div class="meta">Height: {{ member.height }} cm | Goal: {{ member.fitnessGoal }}</div>
      </div>
    </div>

    <form [formGroup]="progressForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        <div class="form-grid">
          <!-- Date -->
          <mat-form-field appearance="outline">
            <mat-label>Date</mat-label>
            <input matInput [matDatepicker]="datePicker" formControlName="date">
            <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
            <mat-datepicker #datePicker></mat-datepicker>
            <mat-error *ngIf="progressForm.get('date')?.hasError('required')">Date is required</mat-error>
          </mat-form-field>

          <!-- Weight -->
          <mat-form-field appearance="outline">
            <mat-label>Weight (kg)</mat-label>
            <input matInput type="number" formControlName="weight" step="0.1" placeholder="70.5">
            <mat-error *ngIf="progressForm.get('weight')?.hasError('required')">Weight is required</mat-error>
            <mat-error *ngIf="progressForm.get('weight')?.hasError('min')">Must be at least 10 kg</mat-error>
          </mat-form-field>

          <!-- Body Fat % -->
          <mat-form-field appearance="outline">
            <mat-label>Body Fat %</mat-label>
            <input matInput type="number" formControlName="bodyFat" step="0.1" placeholder="18.5">
            <mat-error *ngIf="progressForm.get('bodyFat')?.hasError('min')">Must be positive</mat-error>
          </mat-form-field>

          <!-- Calculated BMI (Readonly) -->
          <mat-form-field appearance="outline" class="readonly-field">
            <mat-label>Calculated BMI</mat-label>
            <input matInput type="number" formControlName="bmi" readonly>
            <mat-hint>Calculated automatically</mat-hint>
          </mat-form-field>
        </div>

        <h3 class="section-title">Circumference Measurements (cm)</h3>
        <div class="form-grid measurements-grid">
          <!-- Chest -->
          <mat-form-field appearance="outline">
            <mat-label>Chest</mat-label>
            <input matInput type="number" formControlName="chest" placeholder="95">
          </mat-form-field>

          <!-- Waist -->
          <mat-form-field appearance="outline">
            <mat-label>Waist</mat-label>
            <input matInput type="number" formControlName="waist" placeholder="85">
          </mat-form-field>

          <!-- Arms -->
          <mat-form-field appearance="outline">
            <mat-label>Arms</mat-label>
            <input matInput type="number" formControlName="arms" placeholder="35">
          </mat-form-field>

          <!-- Thighs -->
          <mat-form-field appearance="outline">
            <mat-label>Thighs</mat-label>
            <input matInput type="number" formControlName="thighs" placeholder="55">
          </mat-form-field>

          <!-- Shoulder -->
          <mat-form-field appearance="outline">
            <mat-label>Shoulder</mat-label>
            <input matInput type="number" formControlName="shoulder" placeholder="115">
          </mat-form-field>
        </div>

        <h3 class="section-title">Progress Photos (URLs)</h3>
        <div class="photo-inputs">
          <mat-form-field appearance="outline">
            <mat-label>Front Photo URL</mat-label>
            <input matInput formControlName="frontPhoto" placeholder="https://images.unsplash.com...">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Side Photo URL</mat-label>
            <input matInput formControlName="sidePhoto" placeholder="https://images.unsplash.com...">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Back Photo URL</mat-label>
            <input matInput formControlName="backPhoto" placeholder="https://images.unsplash.com...">
          </mat-form-field>
        </div>

        <h3 class="section-title">Additional Info</h3>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Notes</mat-label>
          <textarea matInput formControlName="notes" rows="3" placeholder="Feeling energetic, increased lift capacity..."></textarea>
        </mat-form-field>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="progressForm.invalid">
          Save Progress Log
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .dialogue-title {
      font-weight: 700;
      font-size: 22px;
      margin-bottom: 12px;
    }
    .member-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 20px;

      img {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        border: 1.5px solid var(--border-color, rgba(255,255,255,0.1));
      }

      .member-info {
        .name {
          font-weight: 600;
          font-size: 15px;
          color: #fff;
        }
        .meta {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 1px;
        }
      }
    }
    .dialog-form-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 5px !important;
      max-height: 60vh;
      overflow-y: auto;
    }
    .section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--primary-color, #ff007f);
      margin: 12px 0 6px 0;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .measurements-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    .photo-inputs {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
    }
    .full-width {
      width: 100%;
    }
    .readonly-field {
      opacity: 0.85;
    }
    .dialog-actions {
      padding: 16px 0 0 0 !important;
      gap: 8px;
    }
    
    @media (max-width: 599.98px) {
      .form-grid, .measurements-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class LogBodyProgressDialogComponent implements OnInit {
  progressForm!: FormGroup;
  member: Member;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<LogBodyProgressDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { member: Member }
  ) {
    this.member = data.member;
  }

  ngOnInit(): void {
    this.progressForm = this.fb.group({
      date: [new Date(), [Validators.required]],
      weight: [this.member.weight || '', [Validators.required, Validators.min(10)]],
      bodyFat: ['', [Validators.min(0)]],
      bmi: ['', []],
      chest: ['', []],
      waist: ['', []],
      arms: ['', []],
      thighs: ['', []],
      shoulder: ['', []],
      frontPhoto: ['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400', []],
      sidePhoto: ['https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=400', []],
      backPhoto: ['https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=400', []],
      notes: ['', []]
    });

    // Auto-calculate BMI
    this.progressForm.get('weight')?.valueChanges.subscribe(w => {
      this.calculateBMI(w);
    });

    // Initial BMI calculation
    if (this.member.weight) {
      this.calculateBMI(this.member.weight);
    }
  }

  private calculateBMI(weight: number): void {
    if (weight && this.member.height) {
      const heightInMeters = this.member.height / 100;
      const bmi = weight / (heightInMeters * heightInMeters);
      this.progressForm.patchValue({ bmi: Math.round(bmi * 10) / 10 }, { emitEvent: false });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.progressForm.valid) {
      const val = this.progressForm.value;
      const formattedEntry = {
        memberId: this.member.id,
        date: this.formatDate(val.date),
        weight: val.weight,
        bodyFat: val.bodyFat ? Number(val.bodyFat) : undefined,
        bmi: val.bmi ? Number(val.bmi) : 0,
        chest: val.chest ? Number(val.chest) : undefined,
        waist: val.waist ? Number(val.waist) : undefined,
        arms: val.arms ? Number(val.arms) : undefined,
        thighs: val.thighs ? Number(val.thighs) : undefined,
        shoulder: val.shoulder ? Number(val.shoulder) : undefined,
        frontPhoto: val.frontPhoto || undefined,
        sidePhoto: val.sidePhoto || undefined,
        backPhoto: val.backPhoto || undefined,
        notes: val.notes || undefined
      };
      this.dialogRef.close(formattedEntry);
    }
  }

  private formatDate(date: Date): string {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }
}
