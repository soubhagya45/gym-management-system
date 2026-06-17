import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IGymRepository, GYM_REPOSITORY_TOKEN } from '../core/interfaces/repository.interfaces';
import { Gym } from '../core/models/gym.entity';

@Injectable({
  providedIn: 'root'
})
export class GymService {
  constructor(
    @Inject(GYM_REPOSITORY_TOKEN) private gymRepository: IGymRepository
  ) {}

  getGyms(): Observable<Gym[]> {
    return this.gymRepository.getGyms();
  }

  getGymById(gymId: string): Observable<Gym | null> {
    return this.gymRepository.getGymById(gymId);
  }

  createGym(gym: Omit<Gym, 'gymId' | 'createdAt'>): Observable<Gym> {
    return this.gymRepository.createGym(gym);
  }

  updateGym(gym: Gym): Observable<void> {
    return this.gymRepository.updateGym(gym);
  }
}
