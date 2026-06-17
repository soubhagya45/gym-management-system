import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthState } from '../../presentation/state/auth.state';

@Component({
  selector: 'app-account-disabled',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './account-disabled.component.html',
  styleUrls: ['./account-disabled.component.scss']
})
export class AccountDisabledComponent implements OnInit {
  status: string = 'Suspended';

  constructor(private router: Router, private authState: AuthState) {}

  ngOnInit(): void {
    // Detect what status caused the block from the current user (if still cached before logout)
    // The auth guard calls logout() before redirecting, so currentUserValue may be null here.
    // We read status from the router state if available, otherwise default to 'Suspended'.
    const nav = this.router.getCurrentNavigation();
    const stateStatus = nav?.extras?.state?.['status'];
    if (stateStatus) {
      this.status = stateStatus;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}
