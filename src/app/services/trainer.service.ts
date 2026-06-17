import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ITrainerRepository, TRAINER_REPOSITORY_TOKEN } from '../core/interfaces/repository.interfaces';
import { Trainer } from '../core/models/trainer.entity';

@Injectable({
  providedIn: 'root'
})
export class TrainerService {
  constructor(
    @Inject(TRAINER_REPOSITORY_TOKEN) private trainerRepository: ITrainerRepository
  ) {}

  getTrainers(gymId: string): Observable<Trainer[]> {
    return this.trainerRepository.getTrainers(gymId);
  }

  addTrainer(gymId: string, trainer: Omit<Trainer, 'id' | 'membersCount'>): Observable<Trainer> {
    return this.trainerRepository.addTrainer(gymId, trainer);
  }

  updateTrainer(gymId: string, trainer: Trainer): Observable<void> {
    return this.trainerRepository.updateTrainer(gymId, trainer);
  }

  deleteTrainer(gymId: string, id: string): Observable<void> {
    return this.trainerRepository.deleteTrainer(gymId, id);
  }
}
