import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import {
  ITrainerRepository,
  TRAINER_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { Trainer } from '../../core/models/trainer.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';

@Injectable({
  providedIn: 'root'
})
export class TrainerState {
  private trainersSubject = new BehaviorSubject<Trainer[]>([]);
  trainers$ = this.trainersSubject.asObservable();

  constructor(
    @Inject(TRAINER_REPOSITORY_TOKEN) private trainerRepository: ITrainerRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService
  ) {
    this.tenantContext.activeGymId$.pipe(
      switchMap(gymId => {
        if (!gymId) return of([]);
        return this.trainerRepository.getTrainers(gymId);
      })
    ).subscribe(trainers => {
      this.trainersSubject.next(trainers);
    });
  }

  loadTrainers(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.trainerRepository.getTrainers(gymId).subscribe(trainers => {
        this.trainersSubject.next(trainers);
      });
    }
  }

  addTrainer(trainer: Omit<Trainer, 'id' | 'membersCount' | 'gymId'>): Observable<Trainer> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.trainerRepository.addTrainer(gymId, { ...trainer, gymId }).pipe(
      tap(() => {
        this.loadTrainers();
        this.logRepository.addLog(gymId, `Registered trainer: ${trainer.name}`, 'plan-change').subscribe();
      })
    );
  }

  updateTrainer(trainer: Trainer): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.trainerRepository.updateTrainer(gymId, trainer).pipe(
      tap(() => {
        this.loadTrainers();
        this.logRepository.addLog(gymId, `Updated details for trainer: ${trainer.name}`, 'plan-change').subscribe();
      })
    );
  }

  deleteTrainer(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const trainerName = this.trainersSubject.value.find(t => t.id === id)?.name || 'Trainer';

    return this.trainerRepository.deleteTrainer(gymId, id).pipe(
      tap(() => {
        this.loadTrainers();
        this.logRepository.addLog(gymId, `Removed trainer profile: ${trainerName}`, 'plan-change').subscribe();
      })
    );
  }
}
