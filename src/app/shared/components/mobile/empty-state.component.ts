import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="empty-state">
      <div class="empty-icon-box">
        <mat-icon>{{ icon }}</mat-icon>
      </div>
      <h3 class="empty-title">{{ title }}</h3>
      <p class="empty-message" *ngIf="message">{{ message }}</p>
      <button 
        mat-flat-button 
        color="primary" 
        class="empty-action-btn" 
        *ngIf="actionLabel" 
        (click)="actionClick.emit()">
        <mat-icon *ngIf="actionIcon">{{ actionIcon }}</mat-icon>
        <span>{{ actionLabel }}</span>
      </button>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 24px;
      text-align: center;
      background: var(--bg-card, rgba(30, 41, 59, 0.4));
      border: 1px dashed rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      margin: 16px 0;

      .empty-icon-box {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        background: rgba(99, 102, 241, 0.12);
        color: #818cf8;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;

        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
        }
      }

      .empty-title {
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary, #f8fafc);
        margin: 0 0 6px 0;
      }

      .empty-message {
        font-size: 0.875rem;
        color: var(--text-secondary, #94a3b8);
        margin: 0 0 20px 0;
        max-width: 280px;
        line-height: 1.4;
      }

      .empty-action-btn {
        border-radius: 12px;
        min-height: 48px;
        padding: 0 24px;
        font-weight: 600;
        letter-spacing: 0.02em;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon = 'inbox';
  @Input() title = 'No records found';
  @Input() message?: string;
  @Input() actionLabel?: string;
  @Input() actionIcon?: string;
  @Output() actionClick = new EventEmitter<void>();
}
