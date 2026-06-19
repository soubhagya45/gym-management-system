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

  constructor(
    private fb: FormBuilder,
    private authState: AuthState,
    private permissionService: PermissionService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private appConfig: AppConfigService
  ) {}

  /** True when app is running against live Firebase */
  get isFirebaseMode(): boolean {
    return this.appConfig.provider === ProviderType.Firebase;
  }

  ngOnInit(): void {
    document.documentElement.classList.add('auth-page-active');
    document.body.classList.add('auth-page-active');

    this.loginForm = this.fb.group({
      usernameOrEmail: [
        this.isFirebaseMode ? '' : 'owner@apexfit.com',
        [Validators.required]
      ],
      password: [
        this.isFirebaseMode ? '' : 'password',
        [Validators.required, Validators.minLength(4)]
      ]
    });
  }

  ngOnDestroy(): void {
    document.documentElement.classList.remove('auth-page-active');
    document.body.classList.remove('auth-page-active');
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

        if (user.isFirstLogin) {
          this.promptPasswordChange(user);
        } else {
          this.navigateToWorkspace(user.role);
        }
      },
      error: (err) => {
        this.isLoading = false;
        const msg: string = err.message || '';
        if (msg.startsWith('ACCOUNT_DISABLED:')) {
          this.router.navigate(['/account-disabled']);
          return;
        }
        this.errorMessage = msg || 'Access Denied. Verification failed.';
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

  forgotPassword(): void {
    const email = this.loginForm.get('usernameOrEmail')?.value?.trim();
    if (!email) {
      this.snackBar.open('Please enter your email inside the Identity Node field first.', 'Close', { duration: 5000 });
      return;
    }
    
    this.isLoading = true;
    this.authState.changePassword(email, '').subscribe({
      next: () => {
        this.isLoading = false;
        this.snackBar.open(`Password reset link has been successfully transmitted to ${email}.`, 'Close', { duration: 5000 });
      },
      error: (err) => {
        this.isLoading = false;
        this.snackBar.open(err.message || 'Transmission failed. Verify your email.', 'Close', { duration: 5000 });
      }
    });
  }

  private navigateToWorkspace(role: UserRole): void {
    const defaultRoute = this.permissionService.getDefaultRoute(role);
    this.router.navigate([defaultRoute]);
  }
}
