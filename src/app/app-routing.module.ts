import { NgModule } from '@angular/core';
// Force reload comment to wake up file watcher
import { RouterModule, Routes } from '@angular/router';
import { authGuard, loginGuard } from './guards/auth.guard';
import { permissionGuard } from './guards/permission.guard';

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing.component').then(m => m.LandingPageComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    canActivate: [loginGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register.component').then(m => m.RegisterComponent),
    canActivate: [loginGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'view:dashboard' }
  },
  {
    path: 'members',
    loadComponent: () => import('./pages/members/members.component').then(m => m.MembersComponent),
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'view:members' }
  },
  {
    path: 'members/:id',
    loadComponent: () => import('./pages/members/member-profile.component').then(m => m.MemberProfileComponent),
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'view:members' }
  },
  {
    path: 'leads',
    loadComponent: () => import('./pages/leads/leads.component').then(m => m.LeadsComponent),
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'view:leads' }
  },
  {
    path: 'leads/add',
    loadComponent: () => import('./pages/leads/add-lead.component').then(m => m.AddLeadComponent),
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'manage:leads' }
  },
  {
    path: 'leads/:id',
    loadComponent: () => import('./pages/leads/lead-details.component').then(m => m.LeadDetailsComponent),
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'view:leads' }
  },
  {
    path: 'attendance',
    loadComponent: () => import('./pages/attendance/attendance.component').then(m => m.AttendanceComponent),
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'view:attendance' }
  },
  {
    path: 'payments',
    loadComponent: () => import('./pages/payments/payments.component').then(m => m.PaymentsComponent),
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'view:payments' }
  },
  {
    path: 'plans',
    loadComponent: () => import('./pages/membership-plans/membership-plans.component').then(m => m.MembershipPlansComponent),
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'view:plans' }
  },
  {
    path: 'trainers',
    loadComponent: () => import('./pages/trainers/trainers.component').then(m => m.TrainersComponent),
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'view:trainers' }
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'manage:settings' }
  },
  {
    path: 'whatsapp',
    loadComponent: () => import('./pages/whatsapp/whatsapp.component').then(m => m.WhatsAppComponent),
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'view:whatsapp' }
  },
  {
    path: 'body-progress',
    loadComponent: () => import('./pages/body-progress/body-progress-dashboard.component').then(m => m.BodyProgressDashboardComponent),
    canActivate: [authGuard, permissionGuard],
    data: { permission: 'view:body-progress' }
  },
  {
    path: 'unauthorized',
    loadComponent: () => import('./pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/user-profile.component').then(m => m.UserProfileComponent),
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

