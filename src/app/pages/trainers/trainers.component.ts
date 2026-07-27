import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { TrainerState } from '../../presentation/state/trainer.state';
import { GymState } from '../../presentation/state/gym.state';
import { SubscriptionService } from '../../domain/subscription/subscription.service';
import { Trainer } from '../../core/models/trainer.entity';
import { TrainerDialogComponent } from './trainer-dialog.component';
import { ConfirmDialogComponent } from '../members/confirm-dialog.component';
import { Observable, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ResponsiveLayoutService } from '../../core/services/responsive-layout.service';
import { SearchHeaderComponent } from '../../shared/components/mobile/search-header.component';
import { MobileCardComponent } from '../../shared/components/mobile/mobile-card.component';
import { StatusChipComponent } from '../../shared/components/mobile/status-chip.component';
import { EmptyStateComponent } from '../../shared/components/mobile/empty-state.component';

@Component({
  selector: 'app-trainers',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule,
    SearchHeaderComponent,
    MobileCardComponent,
    StatusChipComponent,
    EmptyStateComponent
  ],
  templateUrl: './trainers.component.html',
  styleUrls: ['./trainers.component.scss']
})
export class TrainersComponent implements OnInit {
  trainers$: Observable<Trainer[]> | undefined;
  canManageTrainers$: Observable<boolean>;
  isLimitReached$: Observable<boolean>;
  currentTrainersCount = 0;
  searchQuery = '';

  constructor(
    private trainerState: TrainerState,
    private gymState: GymState,
    private subscriptionService: SubscriptionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private route: ActivatedRoute,
    public responsiveLayout: ResponsiveLayoutService
  ) {
    this.canManageTrainers$ = this.gymState.activeGymFeatures$.pipe(
      map(features => features ? features.canManageTrainers : false)
    );

    this.isLimitReached$ = combineLatest([
      this.gymState.activeGym$,
      this.trainerState.trainers$
    ]).pipe(
      map(([gym, trainers]) => {
        if (!gym || !trainers) return false;
        this.currentTrainersCount = trainers.length;
        const features = this.subscriptionService.getFeatureFlags(gym.subscriptionPlan);
        return trainers.length >= features.maxTrainers;
      })
    );
  }

  trackByTrainerId(index: number, trainer: Trainer): string {
    return trainer.id;
  }

  ngOnInit(): void {
    this.trainers$ = this.trainerState.trainers$;
    this.route.queryParams.subscribe(params => {
      if (params['action'] === 'add') {
        this.openAddTrainerDialog();
      }
    });
  }


  // Add Trainer
  openAddTrainerDialog() {
    this.isLimitReached$.pipe(take(1)).subscribe(limitReached => {
      if (limitReached) {
        this.snackBar.open('Trainer limit reached for your plan. Please upgrade to register more trainers.', 'Upgrade Plan', {
          duration: 5000
        }).onAction().subscribe(() => {
          this.router.navigate(['/settings']);
        });
        return;
      }

      this.router.navigate(['/employees'], { queryParams: { tab: 1, prefillRole: 'trainer' } });
    });
  }


  // Edit Trainer
  openEditTrainerDialog(trainer: Trainer) {
    this.router.navigate(['/employees'], { queryParams: { tab: 0, search: trainer.name, role: 'trainer' } });
  }

  // Delete Trainer
  confirmDeleteTrainer(trainer: Trainer) {
    this.router.navigate(['/employees'], { queryParams: { tab: 0, search: trainer.name, role: 'trainer' } });
  }
}
