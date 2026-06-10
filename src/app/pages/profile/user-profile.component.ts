import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthState } from '../../presentation/state/auth.state';
import { GymState } from '../../presentation/state/gym.state';
import { UserProfile } from '../../core/models/user.model';
import { Gym } from '../../core/models/gym.entity';
import { UserRole } from '../../core/enums/roles.enum';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDividerModule,
    MatChipsModule
  ],
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss']
})
export class UserProfileComponent implements OnInit {
  currentUser$: Observable<UserProfile | null>;
  activeGym$: Observable<Gym | null>;
  gyms$: Observable<Gym[]>;
  UserRole = UserRole;

  constructor(
    private authState: AuthState,
    private gymState: GymState
  ) {
    this.currentUser$ = this.authState.currentUser$;
    this.activeGym$ = this.gymState.activeGym$;
    this.gyms$ = this.gymState.gyms$;
  }

  ngOnInit(): void {}

  getRoleLabel(role: string): string {
    switch (role) {
      case 'super-admin': return 'Super Administrator';
      case 'owner': return 'Club Owner';
      case 'trainer': return 'Personal Trainer';
      case 'staff': return 'Front Roster Staff';
      default: return 'User';
    }
  }

  onSwitchGym(gymId: string): void {
    this.gymState.switchGym(gymId);
  }

  onLogout(): void {
    this.authState.logout();
  }
}
