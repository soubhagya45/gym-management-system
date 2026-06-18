import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

@Component({
  selector: 'app-plan-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatSlideToggleModule
  ],
  template: `
    <h2 mat-dialog-title class="gradient-text dialogue-title">
      {{ isEdit ? 'Modify Plan Configuration' : 'Create New Plan Package' }}
    </h2>
    
    <form [formGroup]="planForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        
        <div class="form-row">
          <!-- Plan Name -->
          <mat-form-field appearance="outline" style="grid-column: span 2;">
            <mat-label>Plan Name</mat-label>
            <input matInput formControlName="name" placeholder="e.g. Platinum Annual Membership or PT 12 Sessions">
            <mat-error *ngIf="planForm.get('name')?.hasError('required')">Name is required</mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <!-- Plan Type -->
          <mat-form-field appearance="outline">
            <mat-label>Plan Type</mat-label>
            <mat-select formControlName="type">
              <mat-option value="membership">Membership Plan</mat-option>
              <mat-option value="pt">PT Plan</mat-option>
            </mat-select>
          </mat-form-field>

          <!-- Price -->
          <mat-form-field appearance="outline">
            <mat-label>Price (₹)</mat-label>
            <input matInput type="number" formControlName="price" placeholder="1500">
            <mat-error *ngIf="planForm.get('price')?.hasError('required')">Price is required</mat-error>
            <mat-error *ngIf="planForm.get('price')?.hasError('min')">Price must be greater than 0</mat-error>
          </mat-form-field>
        </div>

        <div class="form-row">
          <!-- Duration -->
          <mat-form-field appearance="outline">
            <mat-label>Duration</mat-label>
            <input matInput type="number" formControlName="duration" placeholder="1">
            <mat-error *ngIf="planForm.get('duration')?.hasError('required')">Duration is required</mat-error>
            <mat-error *ngIf="planForm.get('duration')?.hasError('min')">Duration must be at least 1</mat-error>
          </mat-form-field>

          <!-- Duration Unit -->
          <mat-form-field appearance="outline">
            <mat-label>Duration Unit</mat-label>
            <mat-select formControlName="durationUnit">
              <mat-option value="days">Days</mat-option>
              <mat-option value="weeks">Weeks</mat-option>
              <mat-option value="months">Months</mat-option>
              <mat-option value="years">Years</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <!-- Tax -->
          <mat-form-field appearance="outline">
            <mat-label>Tax Rate (GST %)</mat-label>
            <input matInput type="number" formControlName="tax" placeholder="18">
            <mat-error *ngIf="planForm.get('tax')?.hasError('required')">Tax rate is required</mat-error>
          </mat-form-field>

          <!-- Sessions (PT Only) -->
          <mat-form-field appearance="outline" *ngIf="planForm.get('type')?.value === 'pt'">
            <mat-label>Number of Sessions</mat-label>
            <input matInput type="number" formControlName="numberOfSessions" placeholder="12">
            <mat-error *ngIf="planForm.get('numberOfSessions')?.hasError('required')">Number of sessions is required</mat-error>
          </mat-form-field>
        </div>

        <!-- Description -->
        <mat-form-field appearance="outline">
          <mat-label>Plan Description</mat-label>
          <textarea matInput formControlName="description" rows="3" placeholder="Access terms, facilities, timings..."></textarea>
          <mat-error *ngIf="planForm.get('description')?.hasError('required')">Description is required</mat-error>
        </mat-form-field>

        <!-- Features (Membership Only) -->
        <mat-form-field appearance="outline" *ngIf="planForm.get('type')?.value === 'membership'">
          <mat-label>Key Features (Comma Separated)</mat-label>
          <input matInput formControlName="features" placeholder="e.g. Full Gym Access, 24/7 Entry, Free Trainer Consultation">
          <mat-hint>Separate each feature with a comma (,)</mat-hint>
          <mat-error *ngIf="planForm.get('features')?.hasError('required')">At least one feature is required</mat-error>
        </mat-form-field>

        <!-- Active Status slide toggle -->
        <div class="toggle-container" style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between;">
          <span>Active Status</span>
          <mat-slide-toggle formControlName="isActive" color="primary">
            {{ planForm.get('isActive')?.value ? 'Active' : 'Inactive' }}
          </mat-slide-toggle>
        </div>
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
    @Inject(MAT_DIALOG_DATA) public data: any | null
  ) {}

  ngOnInit(): void {
    this.isEdit = !!this.data;

    // Join features with comma to populate form input if it is a membership plan
    const featuresStr = this.data?.features?.join(', ') || '';
    const planType = this.data?.type || 'membership';
    const isPlanActive = this.data?.isActive !== undefined ? this.data.isActive : true;

    this.planForm = this.fb.group({
      name: [this.data?.name || '', [Validators.required]],
      type: [planType, [Validators.required]],
      price: [this.data?.price || '', [Validators.required, Validators.min(1)]],
      duration: [this.data?.duration || this.data?.durationMonths || 1, [Validators.required, Validators.min(1)]],
      durationUnit: [this.data?.durationUnit || 'months', [Validators.required]],
      tax: [this.data?.tax || 18, [Validators.required]],
      numberOfSessions: [this.data?.numberOfSessions || 12],
      description: [this.data?.description || '', [Validators.required]],
      features: [featuresStr],
      isActive: [isPlanActive]
    });

    this.planForm.get('type')?.valueChanges.subscribe(type => {
      const featuresCtrl = this.planForm.get('features');
      const sessionsCtrl = this.planForm.get('numberOfSessions');
      if (type === 'pt') {
        featuresCtrl?.clearValidators();
        featuresCtrl?.setValue('');
        sessionsCtrl?.setValidators([Validators.required, Validators.min(1)]);
      } else {
        featuresCtrl?.setValidators([Validators.required]);
        sessionsCtrl?.clearValidators();
        sessionsCtrl?.setValue(12);
      }
      featuresCtrl?.updateValueAndValidity();
      sessionsCtrl?.updateValueAndValidity();
    });

    // Run trigger once initially
    const initialType = this.planForm.get('type')?.value;
    if (initialType === 'pt') {
      this.planForm.get('numberOfSessions')?.setValidators([Validators.required, Validators.min(1)]);
    } else {
      this.planForm.get('features')?.setValidators([Validators.required]);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.planForm.valid) {
      const formValue = this.planForm.value;
      let planResult: any = { ...formValue };
      
      if (formValue.type === 'membership') {
        const featuresArray = formValue.features
          .split(',')
          .map((f: string) => f.trim())
          .filter((f: string) => f !== '');
        planResult.features = featuresArray;
        planResult.durationMonths = formValue.duration; // sync for legacy compatibility
        delete planResult.numberOfSessions;
      } else {
        delete planResult.features;
      }

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
