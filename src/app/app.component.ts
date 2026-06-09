import { Component, OnInit, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthState } from './presentation/state/auth.state';
import { GymState } from './presentation/state/gym.state';
import { AppConfigService, ProviderType } from './core/config/app-config';
import { UserProfile } from './core/models/user.model';
import { Gym } from './core/models/gym.entity';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
}

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
  activeGym$: Observable<Gym | null>;
  gyms$: Observable<Gym[]>;
  currentProvider: ProviderType;

  menuItems: MenuItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Members', route: '/members', icon: 'people' },
    { label: 'Leads', route: '/leads', icon: 'leaderboard' },
    { label: 'Attendance', route: '/attendance', icon: 'event_available' },
    { label: 'Payments', route: '/payments', icon: 'payments' },
    { label: 'Membership Plans', route: '/plans', icon: 'fitness_center' },
    { label: 'Trainers', route: '/trainers', icon: 'sports' },
    { label: 'WhatsApp Center', route: '/whatsapp', icon: 'chat' },
    { label: 'Body Progress', route: '/body-progress', icon: 'trending_up' },
    { label: 'Settings', route: '/settings', icon: 'settings' }
  ];

  constructor(
    private router: Router,
    private authState: AuthState,
    private gymState: GymState,
    private configService: AppConfigService
  ) {
    this.currentUser$ = this.authState.currentUser$;
    this.activeGym$ = this.gymState.activeGym$;
    this.gyms$ = this.gymState.gyms$;
    this.currentProvider = this.configService.provider;
    this.checkScreenSize();
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
      } else {
        const currentRoute = this.menuItems.find(item => event.urlAfterRedirects.includes(item.route));
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
