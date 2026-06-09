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
import { Router } from '@angular/router';

@Component({
  selector: 'app-trainers',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './trainers.component.html',
  styleUrls: ['./trainers.component.scss']
})
export class TrainersComponent implements OnInit {
  trainers$: Observable<Trainer[]> | undefined;
  canManageTrainers$: Observable<boolean>;
  isLimitReached$: Observable<boolean>;
  currentTrainersCount = 0;

  constructor(
    private trainerState: TrainerState,
    private gymState: GymState,
    private subscriptionService: SubscriptionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router
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

  ngOnInit(): void {
    this.trainers$ = this.trainerState.trainers$;
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

      const dialogRef = this.dialog.open(TrainerDialogComponent, {
        width: '550px',
        data: null
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.trainerState.addTrainer(result).subscribe(() => {
            this.snackBar.open('Trainer profile registered successfully!', 'Dismiss', {
              duration: 3000
            });
          });
        }
      });
    });
  }


  // Edit Trainer
  openEditTrainerDialog(trainer: Trainer) {
    const dialogRef = this.dialog.open(TrainerDialogComponent, {
      width: '550px',
      data: trainer
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.trainerState.updateTrainer(result).subscribe(() => {
          this.snackBar.open('Trainer profile updated!', 'Dismiss', {
            duration: 3000
          });
        });
      }
    });
  }

  // Delete Trainer
  confirmDeleteTrainer(trainer: Trainer) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Remove Trainer Profile',
        message: `Are you sure you want to permanently remove "${trainer.name}" from the system directory?`,
        confirmText: 'Remove Trainer',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(confirm => {
      if (confirm) {
        this.trainerState.deleteTrainer(trainer.id).subscribe(() => {
          this.snackBar.open('Trainer profile removed.', 'Dismiss', {
            duration: 3000
          });
        });
      }
    });
  }
}
