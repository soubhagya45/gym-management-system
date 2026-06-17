import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IAuthRepository, AUTH_REPOSITORY_TOKEN } from '../core/interfaces/repository.interfaces';
import { UserProfile } from '../core/models/user.model';
import { UserRole } from '../core/enums/roles.enum';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    @Inject(AUTH_REPOSITORY_TOKEN) private authRepository: IAuthRepository
  ) {}

  getUserProfile(userId: string): Observable<UserProfile | null> {
    return this.authRepository.getUserProfile(userId);
  }

  inviteStaff(email: string, name: string, role: UserRole, gymId: string): Observable<UserProfile> {
    return this.authRepository.inviteStaff(email, name, role, gymId);
  }
}
