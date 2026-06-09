import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthState } from '../../presentation/state/auth.state';
import { Observable, Subject } from 'rxjs';
import { take, takeUntil } from 'rxjs/operators';
import { UserProfile } from '../../core/models/user.model';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.scss']
})
export class LandingPageComponent implements OnInit, OnDestroy {
  currentUser: UserProfile | null = null;
  private destroy$ = new Subject<void>();

  features = [
    {
      icon: 'business',
      title: 'Multi-Tenant Workspaces',
      description: 'Manage multiple gym branches or franchises under a single master profile. Switch tenants in two clicks.'
    },
    {
      icon: 'chat',
      title: 'WhatsApp Automation',
      description: 'Set up templates for renewals, payment reminders, and follow-ups. Schedule and preview messages in real-time.'
    },
    {
      icon: 'trending_up',
      title: 'Transformation Analytics',
      description: 'Track body metrics, weights, fat percentages, circumferences, and side-by-side progression photo comparison galleries.'
    },
    {
      icon: 'event_available',
      title: 'Attendance Check-in',
      description: 'Mark daily attendance, calculate member streaks, and view check-in velocity graphs instantly.'
    },
    {
      icon: 'payments',
      title: 'Invoicing & Payments',
      description: 'Generate itemized receipts, track dues, record pending invoices, and automatically flag overdue accounts.'
    },
    {
      icon: 'sports',
      title: 'Trainer Coordinator',
      description: 'Assign personal coaches to members, track ratings, view client ratios, and log training plans.'
    }
  ];

  constructor(
    private authState: AuthState,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authState.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.router.navigate(['/dashboard']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
