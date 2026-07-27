import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="metric-card" [ngClass]="colorClass">
      <div class="color-top-bar"></div>
      <div class="metric-header">
        <div class="metric-icon-box">
          <mat-icon>{{ icon }}</mat-icon>
        </div>
        <span class="metric-trend" *ngIf="trend" [class.positive]="trendPositive" [class.negative]="!trendPositive">
          {{ trend }}
        </span>
      </div>
      <div class="metric-body">
        <span class="metric-value">{{ value }}</span>
        <span class="metric-title">{{ title }}</span>
        <span class="metric-subtitle" *ngIf="subtitle">{{ subtitle }}</span>
      </div>
    </div>
  `,
  styles: [`
    .metric-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: var(--m3-radius-md, 16px);
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 10px;
      box-shadow: var(--m3-elevation-1, 0 2px 8px rgba(0, 0, 0, 0.25));
      position: relative;
      overflow: hidden;
      min-height: 105px;
      box-sizing: border-box;

      .color-top-bar {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: var(--accent-color, #6366f1);
      }

      &.primary .color-top-bar { background: #6366f1; }
      &.success .color-top-bar { background: #10b981; }
      &.warning .color-top-bar { background: #f59e0b; }
      &.danger .color-top-bar { background: #ef4444; }
      &.info .color-top-bar { background: #3b82f6; }

      .metric-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .metric-icon-box {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(99, 102, 241, 0.15);
        color: #818cf8;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .metric-trend {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 2px 8px;
        border-radius: var(--m3-radius-full, 9999px);

        &.positive {
          background: rgba(16, 185, 129, 0.18);
          color: #34d399;
        }
        &.negative {
          background: rgba(239, 68, 68, 0.18);
          color: #f87171;
        }
      }

      .metric-body {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .metric-value {
        font-size: 1.5rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--text-primary, #f8fafc);
        line-height: 1.2;
      }

      .metric-title {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--text-secondary, #94a3b8);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .metric-subtitle {
        font-size: 0.75rem;
        color: var(--text-muted, #64748b);
      }

      &.primary .metric-icon-box { background: rgba(99, 102, 241, 0.2); color: #818cf8; }
      &.success .metric-icon-box { background: rgba(16, 185, 129, 0.2); color: #34d399; }
      &.warning .metric-icon-box { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
      &.danger .metric-icon-box { background: rgba(239, 68, 68, 0.2); color: #f87171; }
      &.info .metric-icon-box { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
    }
  `]
})
export class MetricCardComponent {
  @Input() title = '';
  @Input() value: string | number = '';
  @Input() icon = 'trending_up';
  @Input() subtitle?: string;
  @Input() trend?: string;
  @Input() trendPositive = true;
  @Input() colorClass: 'primary' | 'success' | 'warning' | 'danger' | 'info' = 'primary';
}
