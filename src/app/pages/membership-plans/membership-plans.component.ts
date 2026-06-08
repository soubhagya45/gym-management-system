import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MembershipPlanState } from '../../presentation/state/membership-plan.state';
import { MembershipPlan } from '../../core/models/membership-plan.entity';
import { PlanDialogComponent } from './plan-dialog.component';
import { ConfirmDialogComponent } from '../members/confirm-dialog.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-membership-plans',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatDividerModule
  ],
  templateUrl: './membership-plans.component.html',
  styleUrls: ['./membership-plans.component.scss']
})
export class MembershipPlansComponent implements OnInit {
  plans$: Observable<MembershipPlan[]> | undefined;

  constructor(
    private planState: MembershipPlanState,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.plans$ = this.planState.plans$;
  }

  // Add Plan Dialog
  openAddPlanDialog() {
    const dialogRef = this.dialog.open(PlanDialogComponent, {
      width: '500px',
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.planState.addPlan(result).subscribe(() => {
          this.snackBar.open('Membership plan created successfully!', 'Dismiss', {
            duration: 3000
          });
        });
      }
    });
  }

  // Edit Plan Dialog
  openEditPlanDialog(plan: MembershipPlan) {
    const dialogRef = this.dialog.open(PlanDialogComponent, {
      width: '500px',
      data: plan
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.planState.updatePlan(result).subscribe(() => {
          this.snackBar.open('Membership plan updated!', 'Dismiss', {
            duration: 3000
          });
        });
      }
    });
  }

  // Delete Plan Confirmed
  confirmDeletePlan(plan: MembershipPlan) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Delete Membership Plan',
        message: `Are you sure you want to permanently delete the "${plan.name}" plan? This will affect new member registrations.`,
        confirmText: 'Delete Plan',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.planState.deletePlan(plan.id).subscribe(() => {
          this.snackBar.open('Membership plan deleted.', 'Dismiss', {
            duration: 3000
          });
        });
      }
    });
  }
}
