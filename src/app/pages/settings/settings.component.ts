import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GymState } from '../../presentation/state/gym.state';
import { Gym } from '../../core/models/gym.entity';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSnackBarModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  settingsForm!: FormGroup;
  isDarkMode = true;
  activeGym: Gym | null = null;

  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    private gymState: GymState
  ) {}

  ngOnInit(): void {
    // 1. Theme status check
    this.isDarkMode = document.body.classList.contains('dark-theme');

    // 2. Preferences form init
    this.settingsForm = this.fb.group({
      gymName: ['', [Validators.required]],
      ownerName: ['', [Validators.required]],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: ['', [Validators.required]],
      address: ['742 Luxury Boulevard, Suite 100, Beverly Hills, CA 90210', [Validators.required]],
      currency: ['₹', [Validators.required]],
      taxRate: [8.5, [Validators.required, Validators.min(0), Validators.max(100)]],
      allowGuestPass: [true],
      sendExpiryAlerts: [true]
    });

    // 3. Reactively load active gym settings
    this.gymState.activeGym$.subscribe(gym => {
      if (gym) {
        this.activeGym = gym;
        this.settingsForm.patchValue({
          gymName: gym.gymName,
          ownerName: gym.ownerName,
          contactEmail: gym.email,
          contactPhone: gym.phone
        });
      }
    });
  }

  // Handle global theme change
  onThemeToggle(checked: boolean) {
    this.isDarkMode = checked;
    if (this.isDarkMode) {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    }
    
    this.snackBar.open(`Switched to ${this.isDarkMode ? 'Dark' : 'Light'} Mode`, 'Dismiss', {
      duration: 2000
    });
  }

  onSaveSettings() {
    if (this.settingsForm.valid && this.activeGym) {
      const updated: Gym = {
        ...this.activeGym,
        gymName: this.settingsForm.value.gymName,
        ownerName: this.settingsForm.value.ownerName,
        email: this.settingsForm.value.contactEmail,
        phone: this.settingsForm.value.contactPhone
      };

      this.gymState.updateGym(updated).subscribe(() => {
        this.snackBar.open('Gym configurations updated successfully!', 'Dismiss', {
          duration: 3000
        });
      });
    }
  }
}
