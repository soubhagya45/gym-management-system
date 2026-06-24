import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ITrainerRepository, TRAINER_REPOSITORY_TOKEN } from '../core/interfaces/repository.interfaces';
import { Trainer } from '../core/models/trainer.entity';
import { TenantContextService } from '../domain/tenancy/tenant-context.service';

@Injectable({
  providedIn: 'root'
})
export class TrainerService {
  constructor(
    @Inject(TRAINER_REPOSITORY_TOKEN) private trainerRepository: ITrainerRepository,
    private tenantContext: TenantContextService
  ) {}

  getTrainers(): Observable<Trainer[]> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.trainerRepository.getTrainers(gymId);
  }

  addTrainer(trainer: Omit<Trainer, 'id' | 'membersCount'>): Observable<Trainer> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.trainerRepository.addTrainer(gymId, trainer);
  }

  updateTrainer(trainer: Trainer): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.trainerRepository.updateTrainer(gymId, trainer);
  }

  deleteTrainer(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');
    return this.trainerRepository.deleteTrainer(gymId, id);
  }
}
