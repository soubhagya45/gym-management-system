import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthState } from '../../presentation/state/auth.state';
import { UserRole } from '../../core/enums/roles.enum';
import { PermissionService } from '../../domain/auth/permission.service';

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
  activeRole: UserRole = UserRole.Owner;
  UserRole = UserRole;

  // Ordered list of roles for dynamic layout
  availableRoles = [
    UserRole.SuperAdmin,
    UserRole.Owner,
    UserRole.Trainer,
    UserRole.Staff
  ];

  // Role details for dynamic styling & descriptions in the futuristic interface
  roleDetails = {
    [UserRole.SuperAdmin]: {
      title: 'Super Administrator',
      desc: 'Global system overview, multi-tenant gym directories & database provider swapping.',
      badge: 'Root Access',
      color: '#f43f5e', // Rose glow
      email: 'superadmin@apexfit.com',
      icon: 'admin_panel_settings'
    },
    [UserRole.Owner]: {
      title: 'HQ Club Owner',
      desc: 'Access core club management, financial reports, membership plans & settings.',
      badge: 'Level 3 Auth',
      color: '#6366f1', // Indigo glow
      email: 'owner@apexfit.com',
      icon: 'storefront'
    },
    [UserRole.Trainer]: {
      title: 'Pro Coach Terminal',
      desc: 'Track fitness goals, log workout sessions, and mark class attendances.',
      badge: 'Coach Auth',
      color: '#10b981', // Emerald glow
      email: 'trainer@apexfit.com',
      icon: 'sports'
    },
    [UserRole.Staff]: {
      title: 'Front Roster Staff',
      desc: 'Manage active members, register new leads, update payments & check-ins.',
      badge: 'Staff Auth',
      color: '#eab308', // Amber glow
      email: 'staff@apexfit.com',
      icon: 'people'
    }
  };

  constructor(
    private fb: FormBuilder,
    private authState: AuthState,
    private permissionService: PermissionService,
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
  selectRole(role: UserRole): void {
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

  private navigateToWorkspace(role: UserRole): void {
    const defaultRoute = this.permissionService.getDefaultRoute(role);
    this.router.navigate([defaultRoute]);
  }
}
