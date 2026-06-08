import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthState } from '../../presentation/state/auth.state';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  hidePassword = true;

  // Selected quick role for UI presentation
  activeRole: 'owner' | 'trainer' | 'member' = 'owner';

  // Role details for dynamic styling & descriptions in the futuristic interface
  roleDetails = {
    owner: {
      title: 'HQ System Owner',
      desc: 'Access core club management, financials, analytics & security logs.',
      badge: 'Level 3 Auth',
      color: '#6366f1', // Indigo glow
      email: 'owner@apexfit.com'
    },
    trainer: {
      title: 'Pro Coach Terminal',
      desc: 'Manage workout sessions, trainer rosters, rating reviews & schedules.',
      badge: 'Coach Auth',
      color: '#10b981', // Emerald glow
      email: 'trainer@apexfit.com'
    },
    member: {
      title: 'Member Nexus Portal',
      desc: 'Check personal profile, attendance track, invoice records & active plan.',
      badge: 'User Access',
      color: '#06b6d4', // Cyan glow
      email: 'member@apexfit.com'
    }
  };

  constructor(
    private fb: FormBuilder,
    private authState: AuthState,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });

    // Preset the form with the selected role email for UX convenience
    this.syncFormWithRole();
  }

  // Set selected quick role and auto-fill email field
  selectRole(role: 'owner' | 'trainer' | 'member'): void {
    this.activeRole = role;
    this.syncFormWithRole();
    this.errorMessage = null;
  }

  private syncFormWithRole(): void {
    const email = this.roleDetails[this.activeRole].email;
    this.loginForm.patchValue({
      email: email,
      password: 'password' // Standard default password for all mock accounts
    });
  }

  // Handle standard login submission
  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { email, password } = this.loginForm.value;

    this.authState.login(email, password).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.navigateToWorkspace(user.role);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Access Denied. Verification failed.';
      }
    });
  }

  // Direct quick login action
  onQuickLoginClick(): void {
    this.isLoading = true;
    this.errorMessage = null;

    this.authState.loginWithRole(this.activeRole).subscribe({
      next: (user) => {
        this.isLoading = false;
        this.navigateToWorkspace(user.role);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Quick login synchronization failed.';
      }
    });
  }

  private navigateToWorkspace(role: string): void {
    if (role === 'owner' || role === 'super-admin') {
      this.router.navigate(['/dashboard']);
    } else if (role === 'trainer') {
      this.router.navigate(['/trainers']);
    } else if (role === 'staff' || role === 'member') {
      this.router.navigate(['/members']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
