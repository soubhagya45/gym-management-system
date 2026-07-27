import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

export interface QuickActionItem {
  id: string;
  label: string;
  icon: string;
  color?: string;
  badge?: string | number;
}

@Component({
  selector: 'app-quick-action-row',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <div class="quick-actions-grid">
      <button 
        *ngFor="let item of actions" 
        class="quick-action-btn" 
        (click)="actionClick.emit(item.id)">
        <div class="quick-icon-circle" [style.background-color]="item.color || 'rgba(99, 102, 241, 0.15)'">
          <mat-icon>{{ item.icon }}</mat-icon>
        </div>
        <span class="quick-label">{{ item.label }}</span>
      </button>
    </div>
  `,
  styles: [`
    .quick-actions-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 16px;

      @media (max-width: 380px) {
        gap: 6px;
      }
    }

    .quick-action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 6px;
      background: var(--bg-card, rgba(30, 41, 59, 0.6));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      cursor: pointer;
      transition: transform 0.15s ease, background-color 0.15s ease;
      min-height: 80px;
      -webkit-tap-highlight-color: transparent;

      &:active {
        transform: scale(0.94);
        background: rgba(99, 102, 241, 0.15);
      }

      .quick-icon-circle {
        width: 42px;
        height: 42px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #f8fafc;

        mat-icon {
          font-size: 22px;
          width: 22px;
          height: 22px;
        }
      }

      .quick-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-primary, #f8fafc);
        text-align: center;
        line-height: 1.2;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
    }
  `]
})
export class QuickActionRowComponent {
  @Input() actions: QuickActionItem[] = [];
  @Output() actionClick = new EventEmitter<string>();
}
