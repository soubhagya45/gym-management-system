import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'members',
    loadComponent: () => import('./pages/members/members.component').then(m => m.MembersComponent)
  },
  {
    path: 'attendance',
    loadComponent: () => import('./pages/attendance/attendance.component').then(m => m.AttendanceComponent)
  },
  {
    path: 'payments',
    loadComponent: () => import('./pages/payments/payments.component').then(m => m.PaymentsComponent)
  },
  {
    path: 'plans',
    loadComponent: () => import('./pages/membership-plans/membership-plans.component').then(m => m.MembershipPlansComponent)
  },
  {
    path: 'trainers',
    loadComponent: () => import('./pages/trainers/trainers.component').then(m => m.TrainersComponent)
  },
  {
    path: 'settings',
    loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent)
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
