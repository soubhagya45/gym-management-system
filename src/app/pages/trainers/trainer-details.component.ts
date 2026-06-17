import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TrainerState } from '../../presentation/state/trainer.state';
import { PTState } from '../../presentation/state/pt.state';
import { Trainer } from '../../core/models/trainer.entity';
import { MemberPTPlan } from '../../core/models/member-pt-plan.entity';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-trainer-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatDividerModule,
    MatProgressBarModule
  ],
  templateUrl: './trainer-details.component.html',
  styleUrls: ['./trainer-details.component.scss']
})
export class TrainerDetailsComponent implements OnInit {
  trainerId = '';
  trainer: Trainer | undefined;
  clients: MemberPTPlan[] = [];
  clientColumns = ['memberName', 'planName', 'progress', 'remaining', 'dates', 'status'];

  constructor(
    private route: ActivatedRoute,
    private trainerState: TrainerState,
    private ptState: PTState
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.trainerId = id;
        this.loadTrainerData();
      }
    });
  }

  loadTrainerData(): void {
    // Subscribe to trainer details
    this.trainerState.trainers$.subscribe(trainers => {
      this.trainer = trainers.find(t => t.id === this.trainerId);
    });

    // Subscribe to assigned PT wallets
    this.ptState.memberPTPlans$.subscribe(wallets => {
      this.clients = wallets.filter(w => w.trainerId === this.trainerId);
    });
  }
}
