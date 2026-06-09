import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthState } from '../../presentation/state/auth.state';
import { UserProfile } from '../../core/models/user.model';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-register',
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
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent implements OnInit {
  currentStep: number = 1; // 1: Gym Info, 2: Owner Info, 3: Onboarding Loader
  gymForm!: FormGroup;
  ownerForm!: FormGroup;
  registeredUser: UserProfile | null = null;
  
  isLoading = false;
  errorMessage: string | null = null;
  hidePassword = true;

  // Onboarding simulation steps
  onboardingProgress = 0;
  onboardingTasks = [
    { label: 'Generating secure gym tenant ID...', status: 'pending' },
    { label: 'Initializing member transformation log tables...', status: 'pending' },
    { label: 'Deploying baseline WhatsApp reminder templates...', status: 'pending' },
    { label: 'Creating administrator credential database records...', status: 'pending' },
    { label: 'Compiling SaaS workspace dashboards...', status: 'pending' }
  ];

  constructor(
    private fb: FormBuilder,
    private authState: AuthState,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.gymForm = this.fb.group({
      gymName: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [Validators.required, Validators.pattern(/^[+]?[0-9\s-]{7,15}$/)]],
      address: ['', [Validators.required, Validators.minLength(5)]],
      gstNumber: ['', [Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)]] // GST Number pattern validation
    });

    this.ownerForm = this.fb.group({
      ownerName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]]
    });
  }

  nextStep(): void {
    if (this.gymForm.valid) {
      this.currentStep = 2;
    } else {
      this.gymForm.markAllAsTouched();
    }
  }

  prevStep(): void {
    this.currentStep = 1;
  }

  startOnboarding(): void {
    if (this.ownerForm.invalid || this.gymForm.invalid || this.isLoading) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { gymName, phone, address, gstNumber } = this.gymForm.value;
    const { ownerName, email, password } = this.ownerForm.value;

    // Call registration immediately, deferring the logged-in session state update
    this.authState.register(gymName, ownerName, email, phone, password, address, gstNumber, true).subscribe({
      next: (user) => {
        // Successful registration! Save the registered user profile locally
        this.registeredUser = user;
        // Now trigger step 3 onboarding animations (while remaining in the login/wizard layout view)
        this.currentStep = 3;
        this.runOnboardingSimulation();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.message || 'Registration failed. Please check your credentials.';
      }
    });
  }

  private runOnboardingSimulation(): void {
    let taskIdx = 0;
    this.onboardingTasks[0].status = 'running';

    const interval = setInterval(() => {
      this.onboardingProgress += 5;

      // Determine task transitions
      const threshold = (taskIdx + 1) * 20;
      if (this.onboardingProgress >= threshold && taskIdx < this.onboardingTasks.length) {
        this.onboardingTasks[taskIdx].status = 'done';
        taskIdx++;
        if (taskIdx < this.onboardingTasks.length) {
          this.onboardingTasks[taskIdx].status = 'running';
        }
      }

      if (this.onboardingProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          this.isLoading = false;
          if (this.registeredUser) {
            // Establish the session in AuthState now that onboarding is complete
            this.authState.setCurrentUser(this.registeredUser);
          }
          // Redirect to administrative dashboard
          this.router.navigate(['/dashboard']);
        }, 600);
      }
    }, 150);
  }
}
