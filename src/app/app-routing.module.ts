import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard, loginGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [loginGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'members',
    loadComponent: () => import('./pages/members/members.component').then(m => m.MembersComponent),
    canActivate: [authGuard]
  },
  {
    path: 'members/:id',
    loadComponent: () => import('./pages/members/member-profile.component').then(m => m.MemberProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'leads',
    loadComponent: () => import('./pages/leads/leads.component').then(m => m.LeadsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'leads/add',
    loadComponent: () => import('./pages/leads/add-lead.component').then(m => m.AddLeadComponent),
    canActivate: [authGuard]
  },
  {
    path: 'leads/:id',
    loadComponent: () => import('./pages/leads/lead-details.component').then(m => m.LeadDetailsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'attendance',
    loadComponent: () => import('./pages/attendance/attendance.component').then(m => m.AttendanceComponent),
    canActivate: [authGuard]
  },
  {
    path: 'payments',
    loadComponent: () => import('./pages/payments/payments.component').then(m => m.PaymentsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'plans',
    loadComponent: () => import('./pages/membership-plans/membership-plans.component').then(m => m.MembershipPlansComponent),
    canActivate: [authGuard]
  },
  {
    path: 'trainers',
    loadComponent: () => import('./pages/trainers/trainers.component').then(m => m.TrainersComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

