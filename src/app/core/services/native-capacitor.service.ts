import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class NativeCapacitorService {
  private onlineSubject = new BehaviorSubject<boolean>(navigator.onLine);
  public isOnline$: Observable<boolean> = this.onlineSubject.asObservable();

  constructor(private ngZone: NgZone) {
    this.initNetworkListeners();
    this.initBackButtonListener();
  }

  private initNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.ngZone.run(() => this.onlineSubject.next(true));
    });

    window.addEventListener('offline', () => {
      this.ngZone.run(() => this.onlineSubject.next(false));
    });
  }

  private initBackButtonListener(): void {
    // Listen for hardware back button if Capacitor native app runtime is active
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform()) {
      try {
        const App = (window as any).Capacitor?.Plugins?.App;
        if (App) {
          App.addListener('backButton', (data: any) => {
            this.ngZone.run(() => {
              // Custom back button handler event
              window.dispatchEvent(new CustomEvent('capacitorBackButton', { detail: data }));
            });
          });
        }
      } catch (err) {
        console.warn('Capacitor App plugin not initialized', err);
      }
    }
  }

  public triggerHaptic(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light'): void {
    if (typeof window === 'undefined') return;

    // Check if Capacitor Haptics is available
    const Haptics = (window as any).Capacitor?.Plugins?.Haptics;
    if (Haptics) {
      try {
        if (type === 'success' || type === 'error') {
          Haptics.notification({ type: type.toUpperCase() });
        } else {
          Haptics.impact({ style: type.toUpperCase() });
        }
        return;
      } catch (e) {
        // Fallback to web vibration
      }
    }

    // Fallback to Web Vibration API
    if ('vibrate' in navigator) {
      const patterns: Record<string, number | number[]> = {
        light: 15,
        medium: 30,
        heavy: 50,
        success: [20, 50, 20],
        error: [50, 30, 50, 30, 50]
      };
      navigator.vibrate(patterns[type] || 20);
    }
  }

  public async shareContent(title: string, text: string, url?: string): Promise<boolean> {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, text, url: url || window.location.href });
        this.triggerHaptic('success');
        return true;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      }
    }
    return false;
  }

  public selectPhoto(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          this.triggerHaptic('light');
          resolve(file);
        } else {
          resolve(null);
        }
      };
      input.click();
    });
  }
}
