import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthState } from '../../presentation/state/auth.state';
import { OnboardingService } from '../../domain/onboarding/onboarding.service';
import { DefaultPlanConfig, OnboardingData } from '../../core/models/onboarding.model';
import { UserProfile } from '../../core/models/user.model';

import { trigger, transition, style, animate } from '@angular/animations';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSelectModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  animations: [
    trigger('stepAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(15px)' }),
        animate('350ms cubic-bezier(0.16, 1, 0.3, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class RegisterComponent implements OnInit, OnDestroy {
  // Steps:
  // 1: Register Gym Profile
  // 2: Verify Email OTP
  // 3: Provisioning database spinner
  // 4: Owner credentials form
  // 5: Branch configuration
  // 6: Custom pricing plans setup
  // 7: Full workspace deployment logs console
  currentStep: number = 1; 
  
  gymForm!: FormGroup;
  otpForm!: FormGroup;
  ownerForm!: FormGroup;
  branchForm!: FormGroup;
  
  plans: DefaultPlanConfig[] = [];
  
  isLoading = false;
  errorMessage: string | null = null;
  hidePassword = true;
  
  // OTP Countdown timer
  resendCountdown = 30;
  resendTimerInterval: any;
  verificationSent = false;
  
  // Loader parameters
  onboardingProgress = 0;
  onboardingTasks: { label: string; status: 'pending' | 'running' | 'done' }[] = [];
  
  registeredUser: UserProfile | null = null;

  constructor(
    private fb: FormBuilder,
    private authState: AuthState,
    private onboardingService: OnboardingService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gymForm = this.fb.group({
      gymName: ['', [Validators.required, Validators.minLength(3)]],
      gymPhone: ['', [Validators.required, Validators.pattern(/^[+]?[0-9\s-]{7,15}$/)]],
      gymEmail: ['', [Validators.required, Validators.email]],
      gymAddress: ['', [Validators.required, Validators.minLength(5)]],
      gymCity: ['', [Validators.required]],
      gymState: ['', [Validators.required]],
      gymCountry: ['', [Validators.required]]
    });

    this.otpForm = this.fb.group({
      code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });

    this.ownerForm = this.fb.group({
      ownerFullName: ['', [Validators.required, Validators.minLength(2)]],
      ownerEmail: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      ownerPhone: ['', [Validators.required, Validators.pattern(/^[+]?[0-9\s-]{7,15}$/)]],
      ownerPassword: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.branchForm = this.fb.group({
      branchName: ['Main Branch', [Validators.required, Validators.minLength(3)]],
      branchPhone: ['', [Validators.required, Validators.pattern(/^[+]?[0-9\s-]{7,15}$/)]],
      branchAddress: ['', [Validators.required, Validators.minLength(5)]]
    });
    
    this.plans = this.onboardingService.getDefaultPlans();
  }

  ngOnDestroy(): void {
    if (this.resendTimerInterval) {
      clearInterval(this.resendTimerInterval);
    }
  }

  startResendTimer(): void {
    this.resendCountdown = 30;
    if (this.resendTimerInterval) clearInterval(this.resendTimerInterval);
    this.resendTimerInterval = setInterval(() => {
      if (this.resendCountdown > 0) {
        this.resendCountdown--;
      } else {
        clearInterval(this.resendTimerInterval);
      }
    }, 1000);
  }

  submitGymInfo(): void {
    if (this.gymForm.invalid) {
      this.gymForm.markAllAsTouched();
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = null;
    const email = this.gymForm.value.gymEmail;
    
    this.onboardingService.sendVerificationCode(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.verificationSent = true;
        this.currentStep = 2;
        this.startResendTimer();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Failed to send verification code. Please check gym email.';
      }
    });
  }

  resendVerificationCode(): void {
    if (this.resendCountdown > 0) return;
    const email = this.gymForm.value.gymEmail;
    this.isLoading = true;
    this.onboardingService.sendVerificationCode(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.startResendTimer();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Failed to resend code.';
      }
    });
  }

  verifyEmail(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    const email = this.gymForm.value.gymEmail;
    const code = this.otpForm.value.code;

    this.onboardingService.verifyEmailCode(email, code).subscribe({
      next: (isValid) => {
        this.isLoading = false;
        if (isValid) {
          this.ownerForm.patchValue({
            ownerEmail: email,
            ownerPhone: this.gymForm.value.gymPhone
          });
          this.ownerForm.get('ownerEmail')?.disable();
          
          this.currentStep = 3;
          this.runGymCreationLoader();
        } else {
          this.errorMessage = 'Invalid verification code. Please enter standard 6 digit code.';
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Verification check failed.';
      }
    });
  }

  runGymCreationLoader(): void {
    this.onboardingProgress = 0;
    this.onboardingTasks = [
      { label: 'Registering tenant domain workspace...', status: 'running' },
      { label: 'Provisioning multi-tenant database space...', status: 'pending' },
      { label: 'Establishing secure SaaS API keys...', status: 'pending' }
    ];
    
    let currentTask = 0;
    const interval = setInterval(() => {
      this.onboardingProgress += 10;
      
      if (this.onboardingProgress >= 30 && currentTask === 0) {
        this.onboardingTasks[0].status = 'done';
        this.onboardingTasks[1].status = 'running';
        currentTask = 1;
      }
      
      if (this.onboardingProgress >= 70 && currentTask === 1) {
        this.onboardingTasks[1].status = 'done';
        this.onboardingTasks[2].status = 'running';
        currentTask = 2;
      }

      if (this.onboardingProgress >= 100) {
        this.onboardingTasks[2].status = 'done';
        clearInterval(interval);
        setTimeout(() => {
          this.currentStep = 4;
        }, 500);
      }
    }, 150);
  }

  submitOwnerDetails(): void {
    if (this.ownerForm.invalid) {
      this.ownerForm.markAllAsTouched();
      return;
    }

    this.branchForm.patchValue({
      branchPhone: this.ownerForm.value.ownerPhone || this.gymForm.value.gymPhone,
      branchAddress: this.gymForm.value.gymAddress
    });

    this.currentStep = 5;
  }

  submitBranchDetails(): void {
    if (this.branchForm.invalid) {
      this.branchForm.markAllAsTouched();
      return;
    }

    this.currentStep = 6;
  }

  addNewPlan(): void {
    this.plans.push({
      name: 'Custom Plan ' + (this.plans.length + 1),
      durationMonths: 1,
      price: 1200,
      description: 'Customized facility access tier.',
      features: ['Access to Gym Equipments', 'Locker Room Access'],
      enabled: true
    });
  }

  finalizeOnboarding(): void {
    this.isLoading = true;
    this.errorMessage = null;

    const payload: OnboardingData = {
      ...this.gymForm.value,
      verificationCode: this.otpForm.value.code,
      
      ownerFullName: this.ownerForm.value.ownerFullName,
      ownerEmail: this.ownerForm.getRawValue().ownerEmail,
      ownerPassword: this.ownerForm.value.ownerPassword,
      ownerPhone: this.ownerForm.value.ownerPhone,
      
      branchName: this.branchForm.value.branchName,
      branchPhone: this.branchForm.value.branchPhone,
      branchAddress: this.branchForm.value.branchAddress,
      
      plans: this.plans
    };

    this.currentStep = 7;
    this.runFinalWorkspaceDeployment(payload);
  }

  runFinalWorkspaceDeployment(payload: OnboardingData): void {
    this.onboardingProgress = 0;
    this.onboardingTasks = [
      { label: 'Registering owner credentials...', status: 'running' },
      { label: 'Configuring default branch workspace...', status: 'pending' },
      { label: 'Deploying custom membership plans...', status: 'pending' },
      { label: 'Enabling 14-day free trial tier...', status: 'pending' },
      { label: 'Redirecting to your administrative console...', status: 'pending' }
    ];

    this.onboardingService.onboardWorkspace(payload).subscribe({
      next: (result) => {
        this.registeredUser = result.owner;
        
        let currentTask = 0;
        const interval = setInterval(() => {
          this.onboardingProgress += 5;

          const threshold = (currentTask + 1) * 20;
          if (this.onboardingProgress >= threshold && currentTask < this.onboardingTasks.length - 1) {
            this.onboardingTasks[currentTask].status = 'done';
            currentTask++;
            this.onboardingTasks[currentTask].status = 'running';
          }

          if (this.onboardingProgress >= 100) {
            this.onboardingTasks[currentTask].status = 'done';
            this.onboardingTasks[4].status = 'running';
            clearInterval(interval);
            setTimeout(() => {
              this.onboardingTasks[4].status = 'done';
              this.isLoading = false;
              if (this.registeredUser) {
                this.authState.setCurrentUser(this.registeredUser);
              }
              this.router.navigate(['/dashboard']);
            }, 800);
          }
        }, 100);
      },
      error: (err) => {
        this.currentStep = 6;
        this.isLoading = false;
        this.errorMessage = err.message || 'Workspace creation failed. Please check parameters.';
      }
    });
  }

  prevStep(targetStep: number): void {
    this.errorMessage = null;
    this.currentStep = targetStep;
  }
}
