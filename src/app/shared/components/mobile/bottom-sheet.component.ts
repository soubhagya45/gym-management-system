import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="bottom-sheet-overlay" *ngIf="isOpen" (click)="onBackdropClick($event)">
      <div class="bottom-sheet-content mobile-slide-up" (click)="$event.stopPropagation()">
        <!-- Drag Handle Indicator -->
        <div class="drag-handle-bar">
          <div class="drag-handle"></div>
        </div>

        <!-- Sticky Header -->
        <div class="sheet-header">
          <h3 class="sheet-title">{{ title }}</h3>
          <button mat-icon-button class="close-btn" (click)="close.emit()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <!-- Scrollable Content Body -->
        <div class="sheet-body">
          <ng-content></ng-content>
        </div>

        <!-- Sticky Footer Action Bar -->
        <div class="sheet-footer" *ngIf="showFooter">
          <ng-content select="[footer]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .bottom-sheet-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      animation: fadeIn 0.2s ease-out;
    }

    .bottom-sheet-content {
      background: var(--bg-card, #1e293b);
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      border-top-left-radius: 24px;
      border-top-right-radius: 24px;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.5);
      overflow: hidden;
      box-sizing: border-box;

      .drag-handle-bar {
        display: flex;
        justify-content: center;
        padding-top: 10px;
        padding-bottom: 4px;

        .drag-handle {
          width: 40px;
          height: 5px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.2);
        }
      }

      .sheet-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);

        .sheet-title {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--text-primary, #f8fafc);
          margin: 0;
        }

        .close-btn {
          color: #94a3b8;
        }
      }

      .sheet-body {
        padding: 20px;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        flex: 1;
      }

      .sheet-footer {
        padding: 16px 20px calc(16px + env(safe-area-inset-bottom, 0px)) 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(15, 23, 42, 0.5);
        display: flex;
        align-items: center;
        gap: 12px;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  `]
})
export class BottomSheetComponent {
  @Input() isOpen = false;
  @Input() title = '';
  @Input() showFooter = false;
  @Output() close = new EventEmitter<void>();

  onBackdropClick(event: Event): void {
    this.close.emit();
  }
}
