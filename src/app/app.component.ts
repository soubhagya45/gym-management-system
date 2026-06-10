import { Component, OnInit, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { AuthState } from './presentation/state/auth.state';
import { GymState } from './presentation/state/gym.state';
import { AppConfigService, ProviderType } from './core/config/app-config';
import { UserProfile } from './core/models/user.model';
import { Gym } from './core/models/gym.entity';
import { PermissionService } from './domain/auth/permission.service';
import { NavItem } from './core/models/permission.model';
import { SessionService } from './domain/auth/session.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Apex Fit';
  pageTitle = 'Dashboard';
  isDarkMode = true;
  isMobile = false;
  sidenavOpened = true;
  
  currentUser$: Observable<UserProfile | null>;
  menuItems$: Observable<NavItem[]>;
  sessionWarning$: Observable<number | null>;
  activeGym$: Observable<Gym | null>;
  gyms$: Observable<Gym[]>;
  currentProvider: ProviderType;

  constructor(
    private router: Router,
    private authState: AuthState,
    private gymState: GymState,
    private configService: AppConfigService,
    private permissionService: PermissionService,
    private sessionService: SessionService
  ) {
    this.currentUser$ = this.authState.currentUser$;
    this.menuItems$ = this.currentUser$.pipe(
      map(user => this.permissionService.getNavigationItems(user))
    );
    this.sessionWarning$ = this.sessionService.sessionWarning$.asObservable();
    this.activeGym$ = this.gymState.activeGym$;
    this.gyms$ = this.gymState.gyms$;
    this.currentProvider = this.configService.provider;
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

    // 2. Track route change to update Page Title in toolbar
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
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
  }

  @HostListener('window:resize', ['$event'])
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

  onSwitchProvider(provider: string): void {
    this.configService.setProvider(provider as ProviderType);
  }

  onLogout(): void {
    this.authState.logout();
  }
}
