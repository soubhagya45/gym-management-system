import { Injectable, signal } from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { MatDialogConfig } from '@angular/material/dialog';

@Injectable({
  providedIn: 'root'
})
export class ResponsiveLayoutService {
  /**
   * Mobile breakpoint stream (matches handset screen widths < 960px).
   */
  readonly isMobile$: Observable<boolean>;
  
  /**
   * Reactive signal for instant template binding without async pipe overhead.
   */
  readonly isMobileSignal = signal<boolean>(window.innerWidth < 960);

  constructor(private breakpointObserver: BreakpointObserver) {
    this.isMobile$ = this.breakpointObserver
      .observe([Breakpoints.Handset, '(max-width: 959.98px)'])
      .pipe(
        map(result => result.matches),
        shareReplay(1)
      );

    this.isMobile$.subscribe(matches => {
      this.isMobileSignal.set(matches);
    });
  }

  get isMobile(): boolean {
    return this.isMobileSignal();
  }

  /**
   * Helper to format MatDialog options for native mobile full-screen / bottom-sheet presentation.
   */
  getDialogConfig<D = any>(defaultWidth: string = '600px', data?: D): MatDialogConfig<D> {
    if (this.isMobile) {
      return {
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        panelClass: ['mobile-fullscreen-dialog', 'mobile-slide-up'],
        data,
        autoFocus: false,
        restoreFocus: false
      };
    }

    return {
      width: defaultWidth,
      panelClass: 'desktop-modal-dialog',
      data
    };
  }
}
