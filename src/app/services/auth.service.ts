import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { delay, tap } from 'rxjs/operators';

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl: string;
  role: 'owner' | 'trainer' | 'member';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly STORAGE_KEY = 'apexfit_auth_user';
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  
  currentUser$: Observable<UserProfile | null> = this.currentUserSubject.asObservable();

  // Mock accounts database
  private readonly mockAccounts: Record<string, UserProfile> = {
    'owner@apexfit.com': {
      name: 'Alex Johnson',
      email: 'owner@apexfit.com',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      role: 'owner'
    },
    'trainer@apexfit.com': {
      name: 'Marcus Vance',
      email: 'trainer@apexfit.com',
      avatarUrl: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=150',
      role: 'trainer'
    },
    'member@apexfit.com': {
      name: 'Sophia Chen',
      email: 'member@apexfit.com',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      role: 'member'
    }
  };

  constructor(private router: Router) {
    this.loadSession();
  }

  // Get current user synchronous value
  get currentUserValue(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  // Check if authenticated
  get isAuthenticated(): boolean {
    return this.currentUserValue !== null;
  }

  // Load session from localStorage on startup
  private loadSession(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.currentUserSubject.next(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Error reading auth session from storage', e);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  // Login via email/password
  login(email: string, password: string): Observable<UserProfile> {
    const user = this.mockAccounts[email.toLowerCase().trim()];
    
    // Simple mock check: if account exists and password is 'password'
    if (user && password === 'password') {
      return of(user).pipe(
        delay(1200), // Simulate network latency
        tap(loggedInUser => this.setSession(loggedInUser))
      );
    } else {
      return throwError(() => new Error('Invalid email or password. Use password: password'));
    }
  }

  // Quick Login using role select
  loginWithRole(role: 'owner' | 'trainer' | 'member'): Observable<UserProfile> {
    const email = `${role}@apexfit.com`;
    const user = this.mockAccounts[email];
    return of(user).pipe(
      delay(800), // Simulating scanning sync credentials
      tap(loggedInUser => this.setSession(loggedInUser))
    );
  }

  // Helper to persist session
  private setSession(user: UserProfile): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  // Logout current session
  logout(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }
}
