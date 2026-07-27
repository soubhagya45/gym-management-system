import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mobile-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="mobile-card" 
      [class.clickable]="clickable"
      [class.glass-effect]="glass"
      [class.m3-elevated]="elevated"
      (click)="onClick($event)">
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .mobile-card {
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
      border-radius: var(--m3-radius-md, 16px);
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: var(--m3-elevation-1, 0 2px 8px rgba(0, 0, 0, 0.25));
      transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.15s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.15s ease;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;

      &.m3-elevated {
        box-shadow: var(--m3-elevation-2, 0 4px 16px rgba(0, 0, 0, 0.35));
      }

      &.glass-effect {
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        background: rgba(30, 41, 59, 0.65);
      }

      &.clickable {
        cursor: pointer;
        user-select: none;
        -webkit-tap-highlight-color: transparent;

        &:active {
          transform: scale(0.97);
          border-color: var(--accent-color, #6366f1);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.25);
        }
      }
    }
  `]
})
export class MobileCardComponent {
  @Input() clickable = false;
  @Input() glass = false;
  @Input() elevated = true;
  @Output() cardClick = new EventEmitter<Event>();

  onClick(event: Event): void {
    if (this.clickable) {
      this.cardClick.emit(event);
    }
  }
}
