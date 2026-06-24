import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { AuthService } from '../../services/auth.service';
import { UserProfile } from '../../core/models/user.model';
import { UserRole } from '../../core/enums/roles.enum';

@Component({
  selector: 'app-admin-utility',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './admin-utility.component.html',
  styleUrls: ['./admin-utility.component.scss']
})
export class AdminUtilityComponent implements OnInit {
  users: UserProfile[] = [];
  displayedColumns: string[] = ['name', 'email', 'role', 'gymId', 'actions'];
  emailToPromote = '';
  isLoading = false;

  constructor(
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.authService.getUsers()
      .subscribe({
        next: (users) => {
          this.users = users;
          this.isLoading = false;
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Failed to load user directories.', 'Close', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }

  promoteToSuperAdmin(): void {
    const email = this.emailToPromote.toLowerCase().trim();
    if (!email) {
      this.snackBar.open('Please specify an email address.', 'Close', { duration: 5000 });
      return;
    }

    const user = this.users.find(u => u.email.toLowerCase().trim() === email);
    if (!user) {
      this.snackBar.open('User with this email was not found in directory.', 'Close', { duration: 5000 });
      return;
    }

    this.isLoading = true;
    this.authService.updateUserRole(user.id, UserRole.SuperAdmin)
      .subscribe({
        next: () => {
          this.snackBar.open(`${user.name} has been promoted to Super Admin.`, 'Close', { duration: 5000 });
          this.emailToPromote = '';
          this.loadUsers();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Failed to promote user: ' + err.message, 'Close', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }

  demoteUser(user: UserProfile): void {
    if (user.role !== UserRole.SuperAdmin) return;
    
    this.isLoading = true;
    this.authService.updateUserRole(user.id, UserRole.Owner)
      .subscribe({
        next: () => {
          this.snackBar.open(`${user.name} role reverted to Owner.`, 'Close', { duration: 5000 });
          this.loadUsers();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Failed to demote user: ' + err.message, 'Close', { duration: 5000 });
          this.isLoading = false;
        }
      });
  }
}
