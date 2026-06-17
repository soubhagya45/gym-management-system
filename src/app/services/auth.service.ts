import { Injectable, Inject } from '@angular/core';
import { Observable } from 'rxjs';
import { IAuthRepository, AUTH_REPOSITORY_TOKEN } from '../core/interfaces/repository.interfaces';
import { UserProfile } from '../core/models/user.model';
import { UserRole } from '../core/enums/roles.enum';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(
    @Inject(AUTH_REPOSITORY_TOKEN) private authRepository: IAuthRepository
  ) {}

  login(email: string, password: string): Observable<UserProfile> {
    return this.authRepository.login(email, password);
  }

  loginWithRole(role: UserRole): Observable<UserProfile> {
    return this.authRepository.loginWithRole(role);
  }

  logout(): Observable<void> {
    return this.authRepository.logout();
  }

  changePassword(email: string, newPassword: string): Observable<void> {
    return this.authRepository.changePassword(email, newPassword);
  }

  clearFirstLoginFlag(email: string): Observable<void> {
    return this.authRepository.clearFirstLoginFlag(email);
  }

  getUserProfile(userId: string): Observable<UserProfile | null> {
    return this.authRepository.getUserProfile(userId);
  }
}
