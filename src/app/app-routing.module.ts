import { NgModule } from '@angular/core';
// Force reload comment to wake up file watcher
import { RouterModule, Routes } from '@angular/router';
import { authGuard, loginGuard } from './guards/auth.guard';
import { permissionGuard } from './guards/permission.guard';
import { tenantGuard } from './guards/tenant.guard';
import { roleGuard } from './guards/role.guard';
import { branchGuard } from './guards/branch.guard';
import { UserRole } from './core/enums/roles.enum';

const routes: Routes = [
  {
    path: 'tenant-not-found',
    loadComponent: () => import('./pages/tenant-not-found/tenant-not-found.component').then(m => m.TenantNotFoundComponent)
  },
  {
    path: '',
    canActivate: [tenantGuard],
    children: [
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
        path: 'crm-sales',
        loadComponent: () => import('./pages/crm-sales/crm-sales.component').then(m => m.CrmSalesComponent),
        canActivate: [authGuard, permissionGuard, branchGuard],
        data: { permission: 'view:leads' }
      },
      {
        path: 'attendance',
        loadComponent: () => import('./pages/attendance/attendance.component').then(m => m.AttendanceComponent),
        canActivate: [authGuard, permissionGuard],
        data: { permission: 'view:attendance' }
      },
      {
        path: 'pt-sessions',
        loadComponent: () => import('./pages/pt-sessions/pt-sessions.component').then(m => m.PtSessionsComponent),
        canActivate: [authGuard, permissionGuard, roleGuard, branchGuard],
        data: { permission: 'view:pt-sessions', expectedRoles: [UserRole.Trainer, UserRole.Owner, UserRole.Manager] }
      },
      {
        path: 'employees',
        loadComponent: () => import('./pages/employees/employees.component').then(m => m.EmployeesComponent),
        canActivate: [authGuard, permissionGuard, branchGuard],
        data: { permission: 'view:employees' }
      },
      {
        path: 'payments',
        loadComponent: () => import('./pages/payments/payments.component').then(m => m.PaymentsComponent),
        canActivate: [authGuard, permissionGuard, branchGuard],
        data: { permission: 'view:payments' }
      },
      {
        path: 'finance/dashboard',
        loadComponent: () => import('./pages/finance/dashboard/finance-dashboard.component').then(m => m.FinanceDashboardComponent),
        canActivate: [authGuard, permissionGuard, roleGuard, branchGuard],
        data: { permission: 'view:finance', expectedRoles: [UserRole.Owner, UserRole.Manager] }
      },
      {
        path: 'finance/invoices',
        loadComponent: () => import('./pages/finance/invoices/invoices.component').then(m => m.InvoicesComponent),
        canActivate: [authGuard, permissionGuard, roleGuard, branchGuard],
        data: { permission: 'view:finance', expectedRoles: [UserRole.Owner, UserRole.Manager] }
      },
      {
        path: 'finance/collections',
        loadComponent: () => import('./pages/finance/collections/collections.component').then(m => m.CollectionsComponent),
        canActivate: [authGuard, permissionGuard, roleGuard, branchGuard],
        data: { permission: 'view:finance', expectedRoles: [UserRole.Owner, UserRole.Manager] }
      },
      {
        path: 'finance/expenses',
        loadComponent: () => import('./pages/finance/expenses/expenses.component').then(m => m.ExpensesComponent),
        canActivate: [authGuard, permissionGuard, roleGuard, branchGuard],
        data: { permission: 'view:finance', expectedRoles: [UserRole.Owner, UserRole.Manager] }
      },
      {
        path: 'finance/reports',
        loadComponent: () => import('./pages/finance/reports/reports.component').then(m => m.ReportsComponent),
        canActivate: [authGuard, permissionGuard, roleGuard, branchGuard],
        data: { permission: 'view:finance', expectedRoles: [UserRole.Owner, UserRole.Manager] }
      },
      {
        path: 'finance/cash-flow',
        loadComponent: () => import('./pages/finance/cash-flow/cash-flow.component').then(m => m.CashFlowComponent),
        canActivate: [authGuard, permissionGuard, roleGuard, branchGuard],
        data: { permission: 'view:finance', expectedRoles: [UserRole.Owner, UserRole.Manager] }
      },
      {
        path: 'finance/revenue-analytics',
        loadComponent: () => import('./pages/finance/revenue-analytics/revenue-analytics.component').then(m => m.RevenueAnalyticsComponent),
        canActivate: [authGuard, permissionGuard, roleGuard, branchGuard],
        data: { permission: 'view:finance', expectedRoles: [UserRole.Owner, UserRole.Manager] }
      },
      {
        path: 'plans',
        loadComponent: () => import('./pages/membership-plans/membership-plans.component').then(m => m.MembershipPlansComponent),
        canActivate: [authGuard, permissionGuard, branchGuard],
        data: { permission: 'view:plans' }
      },
      {
        path: 'trainers',
        loadComponent: () => import('./pages/trainers/trainers.component').then(m => m.TrainersComponent),
        canActivate: [authGuard, permissionGuard, branchGuard],
        data: { permission: 'view:trainers' }
      },
      {
        path: 'trainers/:id',
        loadComponent: () => import('./pages/trainers/trainer-details.component').then(m => m.TrainerDetailsComponent),
        canActivate: [authGuard, permissionGuard, branchGuard],
        data: { permission: 'view:trainers' }
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings.component').then(m => m.SettingsComponent),
        canActivate: [authGuard, permissionGuard, branchGuard],
        data: { permission: 'view:settings' }
      },
      {
        path: 'whatsapp',
        loadComponent: () => import('./pages/whatsapp/whatsapp.component').then(m => m.WhatsAppComponent),
        canActivate: [authGuard, permissionGuard, branchGuard],
        data: { permission: 'view:whatsapp' }
      },
      {
        path: 'body-progress',
        loadComponent: () => import('./pages/body-progress/body-progress-dashboard.component').then(m => m.BodyProgressDashboardComponent),
        canActivate: [authGuard, permissionGuard, branchGuard],
        data: { permission: 'view:body-progress' }
      },
      {
        path: 'admin',
        loadComponent: () => import('./pages/admin-utility/admin-utility.component').then(m => m.AdminUtilityComponent),
        canActivate: [authGuard, roleGuard],
        data: { expectedRoles: [UserRole.SuperAdmin] }
      },
      {
        path: 'account-disabled',
        loadComponent: () => import('./pages/account-disabled/account-disabled.component').then(m => m.AccountDisabledComponent)
      },
      {
        path: 'unauthorized',
        loadComponent: () => import('./pages/unauthorized/unauthorized.component').then(m => m.UnauthorizedComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/user-profile.component').then(m => m.UserProfileComponent),
        canActivate: [authGuard, branchGuard]
      },
      {
        path: '**',
        redirectTo: 'dashboard'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }


