import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-mobile-form-container',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="mobile-form-wrapper">
      <!-- Fixed Top Header -->
      <div class="mobile-form-header">
        <button mat-icon-button type="button" class="close-btn" (click)="cancel.emit()">
          <mat-icon>close</mat-icon>
        </button>
        <div class="header-titles">
          <h2 class="form-title">{{ title }}</h2>
          <span class="form-subtitle" *ngIf="subtitle">{{ subtitle }}</span>
        </div>
        <div class="header-action">
          <ng-content select="[header-action]"></ng-content>
        </div>
      </div>

      <!-- Scrollable Single-Column Body -->
      <div class="mobile-form-body">
        <ng-content></ng-content>
      </div>

      <!-- Sticky Bottom Action Bar -->
      <div class="mobile-form-footer" *ngIf="showFooter">
        <button 
          mat-stroked-button 
          type="button" 
          class="touch-footer-btn cancel-btn" 
          (click)="cancel.emit()">
          {{ cancelLabel }}
        </button>
        <button 
          mat-flat-button 
          color="primary" 
          type="button" 
          class="touch-footer-btn submit-btn" 
          [disabled]="loading || submitDisabled"
          (click)="submit.emit()">
          <mat-icon *ngIf="!loading">{{ submitIcon }}</mat-icon>
          <span *ngIf="!loading">{{ submitLabel }}</span>
          <span *ngIf="loading">Saving...</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .mobile-form-wrapper {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      background: var(--bg-main, #0f172a);
      color: var(--text-primary, #f8fafc);
      overflow: hidden;
    }

    .mobile-form-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-card, #1e293b);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      flex-shrink: 0;

      .close-btn {
        color: var(--text-secondary, #94a3b8);
      }

      .header-titles {
        display: flex;
        flex-direction: column;
        flex: 1;

        .form-title {
          font-size: 1.125rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary, #f8fafc);
        }

        .form-subtitle {
          font-size: 0.75rem;
          color: var(--text-secondary, #94a3b8);
        }
      }
    }

    .mobile-form-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      -webkit-overflow-scrolling: touch;
      padding-bottom: 90px;
    }

    .mobile-form-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: var(--bg-card, #1e293b);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      z-index: 100;
      box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.3);

      .touch-footer-btn {
        flex: 1;
        height: 48px;
        border-radius: 14px;
        font-size: 0.9375rem;
        font-weight: 700;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }

      .cancel-btn {
        border-color: rgba(255, 255, 255, 0.15);
        color: var(--text-secondary, #94a3b8);
      }
    }
  `]
})
export class MobileFormContainerComponent {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() submitLabel: string = 'Save Details';
  @Input() submitIcon: string = 'check';
  @Input() cancelLabel: string = 'Cancel';
  @Input() loading: boolean = false;
  @Input() submitDisabled: boolean = false;
  @Input() showFooter: boolean = true;

  @Output() submit = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
}
