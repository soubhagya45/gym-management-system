import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MembershipPlanState } from '../../presentation/state/membership-plan.state';
import { PTState } from '../../presentation/state/pt.state';
import { MembershipPlan } from '../../core/models/membership-plan.entity';
import { PTPlan } from '../../core/models/pt-plan.entity';
import { PlanDialogComponent } from './plan-dialog.component';
import { ConfirmDialogComponent } from '../members/confirm-dialog.component';
import { Observable } from 'rxjs';

import { ResponsiveLayoutService } from '../../core/services/responsive-layout.service';
import { MobileCardComponent } from '../../shared/components/mobile/mobile-card.component';
import { EmptyStateComponent } from '../../shared/components/mobile/empty-state.component';

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
    MatDividerModule,
    MobileCardComponent,
    EmptyStateComponent
  ],
  templateUrl: './membership-plans.component.html',
  styleUrls: ['./membership-plans.component.scss']
})
export class MembershipPlansComponent implements OnInit {
  plans$: Observable<MembershipPlan[]> | undefined;
  ptPlans$: Observable<PTPlan[]> | undefined;
  activeTab: 'membership' | 'pt' = 'membership';

  constructor(
    private planState: MembershipPlanState,
    private ptState: PTState,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public responsiveLayout: ResponsiveLayoutService
  ) {}

  trackByPlanId(index: number, plan: MembershipPlan): string {
    return plan.id;
  }

  ngOnInit(): void {
    this.plans$ = this.planState.plans$;
    this.ptPlans$ = this.ptState.ptPlans$;
  }

  switchTab(tab: 'membership' | 'pt'): void {
    this.activeTab = tab;
  }

  // Add Plan Dialog
  openAddPlanDialog() {
    const dialogRef = this.dialog.open(PlanDialogComponent, {
      width: '500px',
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.type === 'pt') {
          this.ptState.addPTPlan(result).subscribe(() => {
            this.snackBar.open('Personal Training plan created successfully!', 'Dismiss', {
              duration: 3000
            });
          });
        } else {
          this.planState.addPlan(result).subscribe(() => {
            this.snackBar.open('Membership plan created successfully!', 'Dismiss', {
              duration: 3000
            });
          });
        }
      }
    });
  }

  // Edit Plan Dialog
  openEditPlanDialog(plan: MembershipPlan | PTPlan) {
    const dialogRef = this.dialog.open(PlanDialogComponent, {
      width: '500px',
      data: plan
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (result.type === 'pt') {
          this.ptState.updatePTPlan(result).subscribe(() => {
            this.snackBar.open('Personal Training plan updated!', 'Dismiss', {
              duration: 3000
            });
          });
        } else {
          this.planState.updatePlan(result).subscribe(() => {
            this.snackBar.open('Membership plan updated!', 'Dismiss', {
              duration: 3000
            });
          });
        }
      }
    });
  }

  // Delete Plan Confirmed
  confirmDeletePlan(plan: MembershipPlan | PTPlan) {
    const isPT = plan.type === 'pt';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: isPT ? 'Delete PT Plan' : 'Delete Membership Plan',
        message: `Are you sure you want to permanently delete the "${plan.name}" plan? This will affect new member registrations.`,
        confirmText: 'Delete Plan',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        if (isPT) {
          this.ptState.deletePTPlan(plan.id).subscribe(() => {
            this.snackBar.open('Personal Training plan deleted.', 'Dismiss', {
              duration: 3000
            });
          });
        } else {
          this.planState.deletePlan(plan.id).subscribe(() => {
            this.snackBar.open('Membership plan deleted.', 'Dismiss', {
              duration: 3000
            });
          });
        }
      }
    });
  }
}
