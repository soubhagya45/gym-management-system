import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { GymService } from '../../services/gym.service';
import { Trainer } from '../../interfaces/gym.model';
import { TrainerDialogComponent } from './trainer-dialog.component';
import { ConfirmDialogComponent } from '../members/confirm-dialog.component';
import { Observable } from 'rxjs';

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

  constructor(
    private gymService: GymService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.trainers$ = this.gymService.trainers$;
  }

  // Add Trainer
  openAddTrainerDialog() {
    const dialogRef = this.dialog.open(TrainerDialogComponent, {
      width: '550px',
      data: null
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.gymService.addTrainer(result);
        this.snackBar.open('Trainer profile registered successfully!', 'Dismiss', {
          duration: 3000
        });
      }
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
        this.gymService.updateTrainer(result);
        this.snackBar.open('Trainer profile updated!', 'Dismiss', {
          duration: 3000
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
        this.gymService.deleteTrainer(trainer.id);
        this.snackBar.open('Trainer profile removed.', 'Dismiss', {
          duration: 3000
        });
      }
    });
  }
}
