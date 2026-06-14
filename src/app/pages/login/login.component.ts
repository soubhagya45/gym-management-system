import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthState } from '../../presentation/state/auth.state';
import { UserRole } from '../../core/enums/roles.enum';
import { PermissionService } from '../../domain/auth/permission.service';
import { UserProfile } from '../../core/models/user.model';
import { AppConfigService, ProviderType } from '../../core/config/app-config';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
    MatProgressBarModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, OnDestroy {
  @ViewChild('passwordChangeDialog') passwordChangeDialogTemplate!: TemplateRef<any>;

  loginForm!: FormGroup;
  changePasswordForm!: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;
  hidePassword = true;
  hideChangePassword = true;
  pendingUser: UserProfile | null = null;
  dialogRef: any = null;

  // Selected quick role for UI presentation
  activeRole: UserRole = UserRole.Owner;
  UserRole = UserRole;

  // Ordered list of roles for dynamic layout
  availableRoles = [
    UserRole.SuperAdmin,
    UserRole.Owner,
    UserRole.Manager,
    UserRole.Receptionist,
    UserRole.Accountant,
    UserRole.Trainer,
    UserRole.Staff
  ];

  // Role details for dynamic styling & descriptions in the futuristic interface
  roleDetails: Record<UserRole, { title: string; desc: string; badge: string; color: string; email: string; icon: string }> = {
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
    [UserRole.Manager]: {
      title: 'General Manager',
      desc: 'Direct gym operations: view dashboard, manage members, check-ins, and employees.',
      badge: 'Manager Auth',
      color: '#3b82f6', // Blue glow
      email: 'manager@apexfit.com',
      icon: 'assignment_ind'
    },
    [UserRole.Receptionist]: {
      title: 'Front Desk Terminal',
      desc: 'Check in members, log attendance, register new leads, and view payments.',
      badge: 'Reception Auth',
      color: '#06b6d4', // Cyan glow
      email: 'receptionist@apexfit.com',
      icon: 'contact_phone'
    },
    [UserRole.Accountant]: {
      title: 'Financial Accountant',
      desc: 'Log expenses, review invoices, manage collection records, and handle payroll.',
      badge: 'Finance Auth',
      color: '#14b8a6', // Teal glow
      email: 'accountant@apexfit.com',
      icon: 'account_balance'
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
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private appConfig: AppConfigService
  ) {}

  /** True when app is running against live Firebase — hides demo role panel */
  get isFirebaseMode(): boolean {
    return this.appConfig.provider === ProviderType.Firebase;
  }

  ngOnInit(): void {
    document.documentElement.classList.add('auth-page-active');
    document.body.classList.add('auth-page-active');

    this.loginForm = this.fb.group({
      usernameOrEmail: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });

    // Preset the form with the selected role email for UX convenience
    this.syncFormWithRole();
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('auth-page-active');
    document.body.classList.remove('auth-page-active');
  }

  // Set selected quick role and auto-fill email field
  selectRole(role: UserRole): void {
    this.activeRole = role;
    this.syncFormWithRole();
    this.errorMessage = null;
  }

  private syncFormWithRole(): void {
    if (this.isFirebaseMode) {
      // In Firebase mode: keep role selected for validation, but don't auto-fill demo credentials
      // User must type their real registered email and password
      return;
    }
    const email = this.roleDetails[this.activeRole].email;
    this.loginForm.patchValue({
      usernameOrEmail: email,
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

    const { usernameOrEmail, password } = this.loginForm.value;

    this.authState.login(usernameOrEmail, password).subscribe({
      next: (user) => {
        this.isLoading = false;

        // In Firebase mode: validate that the logged-in user's role matches the selected role chip
        if (this.isFirebaseMode && user.role !== this.activeRole) {
          this.authState.logout();
          this.errorMessage =
            `Access denied. This account is registered as "${user.role}", not "${this.activeRole}". ` +
            `Please select the correct role or log in with the right account.`;
          return;
        }

        if (user.isFirstLogin) {
          this.promptPasswordChange(user);
        } else {
          this.navigateToWorkspace(user.role);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Access Denied. Verification failed.';
      }
    });
  }

  // Direct quick login action
  onQuickLoginClick(): void {
    if (this.isFirebaseMode) {
      // In Firebase mode: quick login validates the form email/password against the selected role
      if (this.loginForm.invalid) {
        this.loginForm.markAllAsTouched();
        this.errorMessage = 'Please enter your email and password to authenticate.';
        return;
      }
      this.onSubmit();
      return;
    }

    // Mock/Demo mode: instant role login with demo accounts
    this.isLoading = true;
    this.errorMessage = null;

    this.authState.loginWithRole(this.activeRole).subscribe({
      next: (user) => {
        this.isLoading = false;
        if (user.isFirstLogin) {
          this.promptPasswordChange(user);
        } else {
          this.navigateToWorkspace(user.role);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Quick login synchronization failed.';
      }
    });
  }

  promptPasswordChange(user: UserProfile): void {
    this.pendingUser = user;
    this.changePasswordForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
    this.hideChangePassword = true;

    this.dialogRef = this.dialog.open(this.passwordChangeDialogTemplate, {
      width: '450px',
      disableClose: true,
      panelClass: 'cyber-dialog-panel'
    });
  }

  confirmPasswordChange(): void {
    if (this.changePasswordForm.invalid || !this.pendingUser) {
      return;
    }

    this.isLoading = true;
    const newPassword = this.changePasswordForm.value.newPassword;
    const email = this.pendingUser.email;

    this.authState.changePassword(email, newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.dialogRef?.close();
        this.snackBar.open('Access key updated successfully!', 'Close', { duration: 3000 });
        const role = this.pendingUser!.role;
        this.pendingUser = null;
        this.navigateToWorkspace(role);
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(err.message || 'Failed to update key', 'Close', { duration: 3000 });
      }
    });
  }

  cancelPasswordChange(): void {
    if (!this.pendingUser) {
      return;
    }

    this.isLoading = true;
    const email = this.pendingUser.email;

    this.authState.clearFirstLoginFlag(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.dialogRef?.close();
        this.snackBar.open('Bypassed. Logged in with default access key.', 'Close', { duration: 3000 });
        const role = this.pendingUser!.role;
        this.pendingUser = null;
        this.navigateToWorkspace(role);
      },
      error: (err) => {
        this.isLoading = false;
        this.dialogRef?.close();
        const role = this.pendingUser!.role;
        this.pendingUser = null;
        this.navigateToWorkspace(role);
      }
    });
  }

  private navigateToWorkspace(role: UserRole): void {
    const defaultRoute = this.permissionService.getDefaultRoute(role);
    this.router.navigate([defaultRoute]);
  }
}
