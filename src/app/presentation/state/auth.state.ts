import { Injectable, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IAuthRepository, AUTH_REPOSITORY_TOKEN } from '../../core/interfaces/repository.interfaces';
import { UserProfile } from '../../core/models/user.model';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';

@Injectable({
  providedIn: 'root'
})
export class AuthState {
  private readonly STORAGE_KEY = 'apexfit_auth_user';
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  
  currentUser$: Observable<UserProfile | null> = this.currentUserSubject.asObservable();

  constructor(
    @Inject(AUTH_REPOSITORY_TOKEN) private authRepository: IAuthRepository,
    private tenantContext: TenantContextService,
    private router: Router
  ) {
    this.loadSession();
  }

  get currentUserValue(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.currentUserValue !== null;
  }

  private loadSession(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const user: UserProfile = JSON.parse(saved);
        this.currentUserSubject.next(user);
        if (user.gymId) {
          this.tenantContext.setTenantId(user.gymId);
        }
      }
    } catch (e) {
      console.error('Error loading session from storage', e);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  login(email: string, password: string): Observable<UserProfile> {
    return this.authRepository.login(email, password).pipe(
      tap(user => this.setSession(user))
    );
  }

  loginWithRole(role: 'owner' | 'trainer' | 'member'): Observable<UserProfile> {
    return this.authRepository.loginWithRole(role).pipe(
      tap(user => this.setSession(user))
    );
  }

  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentUserSubject.next(null);
    this.tenantContext.setTenantId(null);
    this.router.navigate(['/login']);
  }

  private setSession(user: UserProfile): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    if (user.gymId) {
      this.tenantContext.setTenantId(user.gymId);
    } else {
      // Super Admin: default to gym-a, but they can switch later
      this.tenantContext.setTenantId('gym-a');
    }
  }
}
