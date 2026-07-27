import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-fab',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <button 
      class="native-fab-btn" 
      [class.extended]="label"
      (click)="fabClick.emit($event)">
      <mat-icon class="fab-icon">{{ icon }}</mat-icon>
      <span class="fab-label" *ngIf="label">{{ label }}</span>
    </button>
  `,
  styles: [`
    .native-fab-btn {
      position: fixed;
      bottom: calc(72px + env(safe-area-inset-bottom, 0px));
      right: 18px;
      z-index: 99;
      height: 56px;
      min-width: 56px;
      border-radius: 28px;
      background: var(--accent-gradient, linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%));
      color: #ffffff;
      border: none;
      box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 16px;
      cursor: pointer;
      transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
      -webkit-tap-highlight-color: transparent;

      &:active {
        transform: scale(0.92);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.5);
      }

      .fab-icon {
        font-size: 26px;
        width: 26px;
        height: 26px;
      }

      &.extended {
        padding: 0 20px;
        gap: 8px;

        .fab-label {
          font-size: 0.9375rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          white-space: nowrap;
        }
      }
    }
  `]
})
export class FloatingActionButtonComponent {
  @Input() icon = 'add';
  @Input() label?: string;
  @Output() fabClick = new EventEmitter<Event>();
}
