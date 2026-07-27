import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="skeleton-wrapper" [style.height]="height" [style.width]="width">
      <ng-container *ngIf="type === 'dashboard'">
        <div class="skeleton-dashboard-grid">
          <div class="skeleton-item card 2x2"><div class="skeleton-pulse"></div></div>
          <div class="skeleton-item card 2x2"><div class="skeleton-pulse"></div></div>
          <div class="skeleton-item card 2x2"><div class="skeleton-pulse"></div></div>
          <div class="skeleton-item card 2x2"><div class="skeleton-pulse"></div></div>
        </div>
      </ng-container>

      <ng-container *ngIf="type === 'profile'">
        <div class="skeleton-profile-header">
          <div class="skeleton-item avatar"><div class="skeleton-pulse"></div></div>
          <div class="profile-info-skeleton">
            <div class="skeleton-item line title"><div class="skeleton-pulse"></div></div>
            <div class="skeleton-item line sub"><div class="skeleton-pulse"></div></div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="type !== 'dashboard' && type !== 'profile'">
        <div 
          *ngFor="let item of itemsArray" 
          class="skeleton-item" 
          [ngClass]="type">
          <div class="skeleton-pulse"></div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .skeleton-wrapper {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
    }

    .skeleton-dashboard-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;

      .skeleton-item {
        height: 80px;
      }
    }

    .skeleton-profile-header {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: rgba(255, 255, 255, 0.04);
      border-radius: 16px;

      .profile-info-skeleton {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;

        .title { height: 18px; width: 60%; }
        .sub { height: 12px; width: 40%; }
      }
    }

    .skeleton-item {
      background: rgba(255, 255, 255, 0.06);
      border-radius: 14px;
      position: relative;
      overflow: hidden;
      height: 96px;

      &.line {
        height: 18px;
        border-radius: 6px;
      }
      &.avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      &.chart {
        height: 180px;
        border-radius: 18px;
      }

      .skeleton-pulse {
        width: 100%;
        height: 100%;
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0) 0%,
          rgba(255, 255, 255, 0.08) 50%,
          rgba(255, 255, 255, 0) 100%
        );
        animation: skeleton-wave 1.5s infinite ease-in-out;
      }
    }

    @keyframes skeleton-wave {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `]
})
export class LoadingSkeletonComponent {
  @Input() count = 3;
  @Input() type: 'card' | 'line' | 'avatar' | 'dashboard' | 'profile' | 'chart' = 'card';
  @Input() height = 'auto';
  @Input() width = '100%';

  get itemsArray(): number[] {
    return Array.from({ length: this.count });
  }
}
