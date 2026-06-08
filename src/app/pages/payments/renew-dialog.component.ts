import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MemberState } from '../../presentation/state/member.state';
import { MembershipPlanState } from '../../presentation/state/membership-plan.state';
import { Member } from '../../core/models/member.entity';
import { MembershipPlan } from '../../core/models/membership-plan.entity';

@Component({
  selector: 'app-renew-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title class="gradient-text dialogue-title">Renew Gym Membership</h2>
    
    <form [formGroup]="renewForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-form-content">
        <div class="form-grid">
          <!-- Member Info -->
          <div class="full-width member-display-info" *ngIf="preselectedMember">
            <label>Member Name</label>
            <span class="member-name">{{ preselectedMember.name }}</span>
            <span class="member-sub">Current plan expires: {{ preselectedMember.endDate | date:'mediumDate' }}</span>
          </div>

          <!-- Member Select (if not preselected) -->
          <mat-form-field appearance="outline" class="full-width" *ngIf="!preselectedMember">
            <mat-label>Select Member</mat-label>
            <mat-select formControlName="memberId" (selectionChange)="onMemberSelect($event.value)">
              <mat-option *ngFor="let member of members" [value]="member.id">
                {{ member.name }} (Current Plan: {{ member.planName }})
              </mat-option>
            </mat-select>
            <mat-error *ngIf="renewForm.get('memberId')?.hasError('required')">Member is required</mat-error>
          </mat-form-field>

          <!-- Plan Select -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Select Renewal Plan</mat-label>
            <mat-select formControlName="planId" (selectionChange)="onPlanSelect($event.value)">
              <mat-option *ngFor="let plan of plans" [value]="plan.id">
                {{ plan.name }} (₹{{ plan.price }} for {{ plan.durationMonths }} mo)
              </mat-option>
            </mat-select>
            <mat-error *ngIf="renewForm.get('planId')?.hasError('required')">Membership plan is required</mat-error>
          </mat-form-field>

          <!-- Start Date -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Renewal Start Date</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate">
            <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
            <mat-error *ngIf="renewForm.get('startDate')?.hasError('required')">Start date is required</mat-error>
          </mat-form-field>

          <!-- Amount / Price -->
          <mat-form-field appearance="outline">
            <mat-label>Total Price (₹)</mat-label>
            <input matInput type="number" formControlName="amount" placeholder="0.00" (input)="updateDueCalculations()">
            <mat-error *ngIf="renewForm.get('amount')?.hasError('required')">Total price is required</mat-error>
            <mat-error *ngIf="renewForm.get('amount')?.hasError('min')">Must be greater than 0</mat-error>
          </mat-form-field>

          <!-- Paid Amount -->
          <mat-form-field appearance="outline">
            <mat-label>Amount Paid (₹)</mat-label>
            <input matInput type="number" formControlName="paidAmount" placeholder="0.00" (input)="updateDueCalculations()">
            <mat-error *ngIf="renewForm.get('paidAmount')?.hasError('required')">Paid amount is required</mat-error>
            <mat-error *ngIf="renewForm.get('paidAmount')?.hasError('min')">Must be 0 or greater</mat-error>
            <mat-error *ngIf="renewForm.get('paidAmount')?.hasError('max')">Cannot exceed total price</mat-error>
          </mat-form-field>

          <!-- Due Amount (Read-only) -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Remaining Balance Due (₹)</mat-label>
            <input matInput type="number" formControlName="dueAmount" [readonly]="true">
          </mat-form-field>

          <!-- Due Date (required if there is remaining balance) -->
          <mat-form-field appearance="outline" class="full-width" *ngIf="showDueDateField">
            <mat-label>Payment Due Date</mat-label>
            <input matInput [matDatepicker]="dueDatePicker" formControlName="dueDate">
            <mat-datepicker-toggle matSuffix [for]="dueDatePicker"></mat-datepicker-toggle>
            <mat-datepicker #dueDatePicker></mat-datepicker>
            <mat-error *ngIf="renewForm.get('dueDate')?.hasError('required')">Due date is required for outstanding balances</mat-error>
          </mat-form-field>
        </div>
      </mat-dialog-content>
      
      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button type="button" (click)="onCancel()">Cancel</button>
        <button mat-raised-button color="primary" type="submit" [disabled]="renewForm.invalid">
          Renew Membership
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
    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    .full-width {
      grid-column: span 2;
    }
    .member-display-info {
      display: flex;
      flex-direction: column;
      background-color: var(--accent-light);
      padding: 12px 16px;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      label {
        font-size: 11px;
        color: var(--text-secondary);
        text-transform: uppercase;
        font-weight: 600;
      }
      .member-name {
        font-size: 18px;
        font-weight: 700;
        color: var(--accent-color);
      }
      .member-sub {
        font-size: 12px;
        color: var(--text-secondary);
        margin-top: 4px;
      }
    }
    .dialog-actions {
      padding: 16px 0 0 0 !important;
      gap: 8px;
    }
    
    @media (max-width: 599.98px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
      .full-width {
        grid-column: span 1;
      }
    }
  `]
})
export class RenewDialogComponent implements OnInit {
  renewForm!: FormGroup;
  members: Member[] = [];
  plans: MembershipPlan[] = [];
  preselectedMember: Member | null = null;
  showDueDateField = false;

  constructor(
    private fb: FormBuilder,
    private memberState: MemberState,
    private planState: MembershipPlanState,
    private dialogRef: MatDialogRef<RenewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { member?: Member } | null
  ) {
    if (data && data.member) {
      this.preselectedMember = data.member;
    }
  }

  ngOnInit(): void {
    // 1. Fetch plans
    this.planState.plans$.subscribe(plans => {
      this.plans = plans;
    });

    if (!this.preselectedMember) {
      this.memberState.members$.subscribe(members => {
        this.members = members;
      });
    }

    // 2. Build form
    this.renewForm = this.fb.group({
      memberId: [this.preselectedMember ? this.preselectedMember.id : '', this.preselectedMember ? [] : [Validators.required]],
      planId: ['', [Validators.required]],
      startDate: [this.calculateDefaultStartDate(), [Validators.required]],
      amount: [0, [Validators.required, Validators.min(1)]],
      paidAmount: [0, [Validators.required, Validators.min(0)]],
      dueAmount: [{ value: 0, disabled: true }],
      dueDate: [new Date()]
    });

    this.updateDueCalculations();
  }

  private calculateDefaultStartDate(): Date {
    if (this.preselectedMember) {
      const expiry = new Date(this.preselectedMember.endDate);
      const today = new Date();
      if (expiry.getTime() < today.getTime()) {
        return today;
      } else {
        const nextDay = new Date(expiry);
        nextDay.setDate(nextDay.getDate() + 1);
        return nextDay;
      }
    }
    return new Date();
  }

  onMemberSelect(memberId: string): void {
    const selected = this.members.find(m => m.id === memberId);
    if (selected) {
      this.preselectedMember = selected;
      this.renewForm.get('startDate')?.setValue(this.calculateDefaultStartDate());
      this.preselectedMember = null;
    }
  }

  onPlanSelect(planId: string): void {
    const plan = this.plans.find(p => p.id === planId);
    if (plan) {
      this.renewForm.get('amount')?.setValue(plan.price);
      this.renewForm.get('paidAmount')?.setValue(plan.price);
      this.updateDueCalculations();
    }
  }

  updateDueCalculations(): void {
    const amount = Number(this.renewForm.get('amount')?.value || 0);
    const paid = Number(this.renewForm.get('paidAmount')?.value || 0);
    
    this.renewForm.get('paidAmount')?.setValidators([
      Validators.required,
      Validators.min(0),
      Validators.max(amount)
    ]);
    this.renewForm.get('paidAmount')?.updateValueAndValidity({ emitEvent: false });

    const due = Math.max(0, amount - paid);
    this.renewForm.get('dueAmount')?.setValue(due);

    if (due > 0) {
      this.showDueDateField = true;
      this.renewForm.get('dueDate')?.setValidators([Validators.required]);
    } else {
      this.showDueDateField = false;
      this.renewForm.get('dueDate')?.clearValidators();
    }
    this.renewForm.get('dueDate')?.updateValueAndValidity();
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSubmit(): void {
    if (this.renewForm.valid) {
      const formValue = this.renewForm.getRawValue();
      const finalMemberId = this.preselectedMember ? this.preselectedMember.id : formValue.memberId;
      
      const renewalResult = {
        memberId: finalMemberId,
        planId: formValue.planId,
        startDate: this.formatDate(formValue.startDate),
        price: formValue.amount,
        paidAmount: formValue.paidAmount,
        dueAmount: formValue.dueAmount,
        dueDate: this.formatDate(formValue.dueDate || new Date()),
        paymentStatus: formValue.dueAmount > 0 ? 'pending' : 'paid'
      };

      this.dialogRef.close(renewalResult);
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
