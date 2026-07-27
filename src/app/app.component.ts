import { Component, OnInit, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { AuthState } from './presentation/state/auth.state';
import { GymState } from './presentation/state/gym.state';
import { AppConfigService, ProviderType } from './core/config/app-config';
import { UserProfile } from './core/models/user.model';
import { Gym, Branch } from './core/models/gym.entity';
import { PermissionService } from './domain/auth/permission.service';
import { NavItem } from './core/models/permission.model';
import { SessionService } from './domain/auth/session.service';
import { TenantContextService } from './domain/tenancy/tenant-context.service';
import { SubscriptionPlan } from './core/enums/subscription-plans.enum';
import { FeatureFlags } from './core/models/subscription.model';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ResponsiveLayoutService } from './core/services/responsive-layout.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Apex Fit';
  pageTitle = 'Dashboard';
  isDarkMode = true;
  isMobile = false;
  sidenavOpened = true;
  isMoreMenuOpen = false;

  currentUser$: Observable<UserProfile | null>;
  menuItems$: Observable<NavItem[]>;
  sessionWarning$: Observable<number | null>;
  activeGym$: Observable<Gym | null>;
  gyms$: Observable<Gym[]>;
  currentProvider: ProviderType;

  activeBranchId$: Observable<string | null>;
  activeBranch$: Observable<Branch | null>;
  activeSubscription$: Observable<SubscriptionPlan | null>;
  activeFeatureFlags$: Observable<FeatureFlags | null>;

  constructor(
    public router: Router,
    private authState: AuthState,
    private gymState: GymState,
    private configService: AppConfigService,
    private permissionService: PermissionService,
    private sessionService: SessionService,
    private tenantContext: TenantContextService,
    private snackBar: MatSnackBar,
    public responsiveLayout: ResponsiveLayoutService
  ) {
    this.currentUser$ = this.authState.currentUser$;
    this.menuItems$ = this.currentUser$.pipe(
      map(user => this.permissionService.getNavigationItems(user))
    );
    this.sessionWarning$ = this.sessionService.sessionWarning$.asObservable();
    this.activeGym$ = this.gymState.activeGym$;
    this.gyms$ = this.gymState.gyms$;
    this.currentProvider = this.configService.provider;

    this.activeBranchId$ = this.tenantContext.activeBranchId$;
    this.activeBranch$ = this.tenantContext.activeBranch$;
    this.activeSubscription$ = this.tenantContext.activeSubscription$;
    this.activeFeatureFlags$ = this.tenantContext.activeFeatureFlags$;

    this.checkScreenSize();
  }

  formatRemainingTime(ms: number | null): string {
    if (ms === null || ms <= 0) return '';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  ngOnInit() {
    // 1. Theme initialization
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      this.isDarkMode = false;
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
    } else {
      this.isDarkMode = true;
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
    }

    // 2. Track route change to update Page Title in toolbar & close mobile drawer
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.isMoreMenuOpen = false;
      if (event.urlAfterRedirects.includes('/members/') && event.urlAfterRedirects.match(/\/members\/[a-zA-Z0-9-]+/)) {
        this.pageTitle = 'Member Profile';
      } else if (event.urlAfterRedirects.includes('/leads/add')) {
        this.pageTitle = 'Add New Lead';
      } else if (event.urlAfterRedirects.includes('/leads/') && event.urlAfterRedirects.match(/\/leads\/[a-zA-Z0-9-]+/)) {
        this.pageTitle = 'Lead Details';
      } else if (event.urlAfterRedirects.includes('/profile')) {
        this.pageTitle = 'User Profile';
      } else if (event.urlAfterRedirects.includes('/unauthorized')) {
        this.pageTitle = 'Access Denied';
      } else {
        const items = this.permissionService.getNavigationItems(this.authState.currentUserValue);
        const currentRoute = items.find(item => event.urlAfterRedirects.includes(item.route));
        this.pageTitle = currentRoute ? currentRoute.label : 'Dashboard';
      }

      // Auto-close drawer on mobile navigation
      if (this.isMobile) {
        this.sidenavOpened = false;
      }
    });

    // 3. Dynamic Gym Branding Integration
    this.gymState.activeGym$.subscribe(gym => {
      if (gym && gym.branding) {
        const root = document.documentElement;
        const primary = gym.branding.primaryColor || '#6366f1';
        const secondary = gym.branding.secondaryColor || '#8b5cf6';
        
        root.style.setProperty('--accent-color', primary);
        root.style.setProperty('--accent-hover', primary);
        root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`);
        root.style.setProperty('--accent-light', `${primary}15`);

        if (gym.branding.theme) {
          if (gym.branding.theme === 'dark') {
            this.isDarkMode = true;
            document.body.classList.remove('light-theme');
            document.body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
          } else if (gym.branding.theme === 'light') {
            this.isDarkMode = false;
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
          }
        }
      } else {
        // Fallback default colors
        const root = document.documentElement;
        root.style.setProperty('--accent-color', '#6366f1');
        root.style.setProperty('--accent-hover', '#818cf8');
        root.style.setProperty('--accent-gradient', 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)');
        root.style.setProperty('--accent-light', 'rgba(99, 102, 241, 0.15)');
      }
    });

    // Subscribe to CDK BreakpointObserver stream
    this.responsiveLayout.isMobile$.subscribe(mobile => {
      this.isMobile = mobile;
      this.sidenavOpened = !mobile;
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 960;
    if (this.isMobile) {
      this.sidenavOpened = false;
    } else {
      this.sidenavOpened = true;
    }
  }

  toggleSidenav() {
    this.sidenavOpened = !this.sidenavOpened;
  }

  toggleMoreMenu() {
    this.isMoreMenuOpen = !this.isMoreMenuOpen;
  }

  getTileColorStyle(route: string, icon: string): { [key: string]: string } {
    if (route.includes('dashboard')) return { background: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' };
    if (route.includes('members')) return { background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' };
    if (route.includes('leads')) return { background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
    if (route.includes('crm-sales')) return { background: 'rgba(132, 204, 22, 0.15)', color: '#a3e635' };
    if (route.includes('employees')) return { background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6' };
    if (route.includes('attendance')) return { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
    if (route.includes('pt-sessions')) return { background: 'rgba(20, 184, 166, 0.15)', color: '#2dd4bf' };
    if (route.includes('payments')) return { background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80' };
    if (route.includes('finance')) return { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' };
    if (route.includes('plans')) return { background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' };
    if (route.includes('trainers')) return { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
    if (route.includes('whatsapp')) return { background: 'rgba(37, 211, 102, 0.15)', color: '#25d366' };
    if (route.includes('body-progress')) return { background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185' };
    if (route.includes('setup-wizard')) return { background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c' };
    if (route.includes('settings')) return { background: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' };
    if (route.includes('profile')) return { background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' };
    return { background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' };
  }

  isTileActive(route: string): boolean {
    if (!route) return false;
    return this.router.url.includes(route);
  }

  expandedMenus: Record<string, boolean> = { 'Finance': false };

  toggleSubmenu(menuLabel: string): void {
    this.expandedMenus[menuLabel] = !this.expandedMenus[menuLabel];
  }

  isSubmenuExpanded(menuLabel: string): boolean {
    return !!this.expandedMenus[menuLabel];
  }

  isRouteActiveInSubmenu(item: any): boolean {
    return item.subItems?.some((sub: any) => this.router.url.includes(sub.route)) ?? false;
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'super_admin': return 'Super Administrator';
      case 'gym_owner': return 'Club Owner';
      case 'branch_manager': return 'Branch Manager';
      case 'trainer': return 'Personal Trainer';
      case 'staff': return 'Front Roster Staff';
      default: return 'User';
    }
  }

  onSwitchGym(gymId: string): void {
    this.gymState.switchGym(gymId);
  }

  onSwitchBranch(branchId: string): void {
    this.tenantContext.setBranchId(branchId);
    this.snackBar.open('Switched active branch successfully', 'Close', { duration: 2000 });
  }

  onSwitchProvider(provider: string): void {
    this.configService.setProvider(provider as ProviderType);
  }

  get isLocalhost(): boolean {
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.');
  }

  // --- Context-Aware FAB Helpers ---
  get fabIcon(): string {
    const url = this.router.url;
    if (url.includes('/members')) return 'person_add';
    if (url.includes('/leads')) return 'person_add_alt_1';
    if (url.includes('/employees')) return 'person_add';
    if (url.includes('/payments')) return 'payments';
    if (url.includes('/attendance')) return 'qr_code_scanner';
    if (url.includes('/finance')) return 'receipt_long';
    if (url.includes('/trainers')) return 'group_add';
    return 'add';
  }

  get fabLabel(): string {
    const url = this.router.url;
    if (url.includes('/members')) return 'Add Member';
    if (url.includes('/leads')) return 'Add Lead';
    if (url.includes('/employees')) return 'Register Employee';
    if (url.includes('/payments')) return 'Record Payment';
    if (url.includes('/attendance')) return 'Check In';
    if (url.includes('/finance')) return 'Add Expense';
    if (url.includes('/trainers')) return 'Add Trainer';
    return 'Quick Action';
  }

  onFabClick(): void {
    const url = this.router.url;
    const timestamp = Date.now();
    if (url.includes('/members')) {
      this.router.navigate(['/members'], { queryParams: { action: 'add', _t: timestamp } });
    } else if (url.includes('/leads')) {
      this.router.navigate(['/leads/add']);
    } else if (url.includes('/employees')) {
      this.router.navigate(['/employees'], { queryParams: { tab: 1, action: 'add', _t: timestamp } });
    } else if (url.includes('/payments')) {
      this.router.navigate(['/payments'], { queryParams: { action: 'add', _t: timestamp } });
    } else if (url.includes('/attendance')) {
      this.router.navigate(['/attendance'], { queryParams: { action: 'checkin', _t: timestamp } });
    } else if (url.includes('/finance')) {
      this.router.navigate(['/finance/expenses'], { queryParams: { action: 'add', _t: timestamp } });
    } else if (url.includes('/trainers')) {
      this.router.navigate(['/trainers'], { queryParams: { action: 'add', _t: timestamp } });
    } else {
      this.router.navigate(['/members'], { queryParams: { action: 'add', _t: timestamp } });
    }
  }

  onLogout(): void {
    this.authState.logout();
  }
}

