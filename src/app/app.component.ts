import { Component, OnInit, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService, UserProfile } from './services/auth.service';

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

  menuItems: MenuItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Members', route: '/members', icon: 'people' },
    { label: 'Attendance', route: '/attendance', icon: 'event_available' },
    { label: 'Payments', route: '/payments', icon: 'payments' },
    { label: 'Membership Plans', route: '/plans', icon: 'fitness_center' },
    { label: 'Trainers', route: '/trainers', icon: 'sports' },
    { label: 'Settings', route: '/settings', icon: 'settings' }
  ];

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    this.currentUser$ = this.authService.currentUser$;
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
      const currentRoute = this.menuItems.find(item => event.urlAfterRedirects.includes(item.route));
      this.pageTitle = currentRoute ? currentRoute.label : 'Dashboard';
      
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
      case 'owner': return 'Administrator';
      case 'trainer': return 'Personal Trainer';
      case 'member': return 'Gym Member';
      default: return 'User';
    }
  }

  onLogout(): void {
    this.authService.logout();
  }
}

