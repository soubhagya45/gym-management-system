import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { NativeCapacitorService } from '../../../core/services/native-capacitor.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="offline-banner-container" *ngIf="(isOnline$ | async) === false">
      <div class="offline-content">
        <mat-icon class="wifi-off-icon">wifi_off</mat-icon>
        <span class="offline-text">Working Offline. Unsynced changes will automatically sync on reconnect.</span>
      </div>
    </div>
  `,
  styles: [`
    .offline-banner-container {
      background: linear-gradient(90deg, #d97706, #b45309);
      color: #ffffff;
      padding: 8px 16px;
      font-size: 0.8125rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      z-index: 999;

      .offline-content {
        display: flex;
        align-items: center;
        gap: 8px;
        text-align: center;

        .wifi-off-icon {
          font-size: 1.125rem;
          width: 1.125rem;
          height: 1.125rem;
        }

        .offline-text {
          line-height: 1.3;
        }
      }
    }
  `]
})
export class OfflineBannerComponent {
  public isOnline$: Observable<boolean>;

  constructor(private nativeCapacitor: NativeCapacitorService) {
    this.isOnline$ = this.nativeCapacitor.isOnline$;
  }
}
