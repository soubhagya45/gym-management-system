import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MembershipPlan } from '../../interfaces/gym.model';

@Component({
  selector: 'app-plan-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule
  ],
  template: `
    <h2 mat-dialog-title class="gradient-text dialogue-title">
      {{ isEdit ? 'Modify Membership Plan' : 'Create Membership Plan' }}
    </h2>
    
    <form [formGroup]="planForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        <!-- Plan Name -->
        <mat-form-field appearance="outline">
          <mat-label>Plan Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g. Premium Monthly Gym Pass">
          <mat-error *ngIf="planForm.get('name')?.hasError('required')">Name is required</mat-error>
        </mat-form-field>

        <div class="form-row">
          <!-- Price -->
          <mat-form-field appearance="outline">
            <mat-label>Monthly/Plan Price (₹)</mat-label>
            <input matInput type="number" formControlName="price" placeholder="1500">
            <mat-error *ngIf="planForm.get('price')?.hasError('required')">Price is required</mat-error>
            <mat-error *ngIf="planForm.get('price')?.hasError('min')">Price must be greater than 0</mat-error>
          </mat-form-field>

          <!-- Duration -->
          <mat-form-field appearance="outline">
            <mat-label>Duration (Months)</mat-label>
            <input matInput type="number" formControlName="durationMonths" placeholder="1">
            <mat-error *ngIf="planForm.get('durationMonths')?.hasError('required')">Duration is required</mat-error>
            <mat-error *ngIf="planForm.get('durationMonths')?.hasError('min')">Duration must be at least 1 month</mat-error>
          </mat-form-field>
        </div>

        <!-- Description -->
        <mat-form-field appearance="outline">
          <mat-label>Plan Description</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Access terms, facilities, timings..."></textarea>
          <mat-error *ngIf="planForm.get('description')?.hasError('required')">Description is required</mat-error>
        </mat-form-field>

        <!-- Features -->
        <mat-form-field appearance="outline">
          <mat-label>Key Features (Comma Separated)</mat-label>
          <input matInput formControlName="features" placeholder="e.g. Full Gym Access, 24/7 Entry, Free Trainer Consultation">
          <mat-hint>Separate each feature with a comma (,)</mat-hint>
          <mat-error *ngIf="planForm.get('features')?.hasError('required')">At least one feature is required</mat-error>
        </mat-form-field>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="planForm.invalid">
          {{ isEdit ? 'Save Plan' : 'Create Plan' }}
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
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .dialog-actions {
      padding: 16px 0 0 0 !important;
      gap: 8px;
    }
    
    @media (max-width: 599.98px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class PlanDialogComponent implements OnInit {
  planForm!: FormGroup;
  isEdit = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<PlanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MembershipPlan | null
  ) {}

  ngOnInit(): void {
    this.isEdit = !!this.data;

    // Join features with comma to populate form input
    const featuresStr = this.data?.features.join(', ') || '';

    this.planForm = this.fb.group({
      name: [this.data?.name || '', [Validators.required]],
      price: [this.data?.price || '', [Validators.required, Validators.min(1)]],
      durationMonths: [this.data?.durationMonths || '', [Validators.required, Validators.min(1)]],
      description: [this.data?.description || '', [Validators.required]],
      features: [featuresStr, [Validators.required]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.planForm.valid) {
      const formValue = this.planForm.value;
      
      // Split features by comma and trim whitespace
      const featuresArray = formValue.features
        .split(',')
        .map((f: string) => f.trim())
        .filter((f: string) => f !== '');

      const planResult = {
        ...formValue,
        features: featuresArray
      };

      if (this.isEdit && this.data) {
        this.dialogRef.close({
          ...this.data,
          ...planResult
        });
      } else {
        this.dialogRef.close(planResult);
      }
    }
  }
}
