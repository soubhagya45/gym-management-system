import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export type MobileErrorType = 'offline' | 'permission' | 'timeout' | 'server' | 'unknown';

@Component({
  selector: 'app-mobile-error-state',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="mobile-error-container">
      <div class="error-icon-box" [ngClass]="errorType">
        <mat-icon>{{ getIcon() }}</mat-icon>
      </div>

      <h3 class="error-title">{{ getTitle() }}</h3>
      <p class="error-msg">{{ message || getDefaultMessage() }}</p>

      <div class="error-actions">
        <button 
          mat-flat-button 
          color="primary" 
          type="button" 
          class="retry-btn" 
          *ngIf="showRetry" 
          (click)="retry.emit()">
          <mat-icon>refresh</mat-icon>
          <span>{{ retryLabel }}</span>
        </button>
        <button 
          mat-stroked-button 
          type="button" 
          class="diag-btn" 
          *ngIf="details" 
          (click)="showDetails = !showDetails">
          <span>{{ showDetails ? 'Hide Diagnostics' : 'View Diagnostics' }}</span>
        </button>
      </div>

      <div class="diag-details-box" *ngIf="showDetails && details">
        <pre>{{ details }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .mobile-error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 20px;
      text-align: center;
      background: var(--bg-card, rgba(30, 41, 59, 0.7));
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      margin: 16px 0;

      .error-icon-box {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 16px;

        mat-icon {
          font-size: 32px;
          width: 32px;
          height: 32px;
        }

        &.offline {
          background: rgba(245, 158, 11, 0.15);
          color: #f59e0b;
        }

        &.permission {
          background: rgba(239, 68, 68, 0.15);
          color: #ef4444;
        }

        &.timeout, &.server, &.unknown {
          background: rgba(99, 102, 241, 0.15);
          color: #6366f1;
        }
      }

      .error-title {
        font-size: 1.125rem;
        font-weight: 700;
        margin: 0 0 6px 0;
        color: var(--text-primary, #f8fafc);
      }

      .error-msg {
        font-size: 0.8125rem;
        color: var(--text-secondary, #94a3b8);
        margin: 0 0 20px 0;
        max-width: 300px;
        line-height: 1.4;
      }

      .error-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        justify-content: center;

        .retry-btn {
          height: 44px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .diag-btn {
          height: 44px;
          border-radius: 12px;
          border-color: rgba(255, 255, 255, 0.15);
          color: var(--text-secondary, #94a3b8);
          font-size: 0.8125rem;
        }
      }

      .diag-details-box {
        margin-top: 16px;
        padding: 12px;
        background: #0f172a;
        border-radius: 8px;
        text-align: left;
        max-width: 100%;
        overflow-x: auto;

        pre {
          margin: 0;
          font-size: 0.75rem;
          color: #ef4444;
          white-space: pre-wrap;
          word-break: break-word;
        }
      }
    }
  `]
})
export class MobileErrorStateComponent {
  @Input() errorType: MobileErrorType = 'unknown';
  @Input() title: string = '';
  @Input() message: string = '';
  @Input() details: string = '';
  @Input() showRetry: boolean = true;
  @Input() retryLabel: string = 'Try Again';

  @Output() retry = new EventEmitter<void>();

  showDetails = false;

  getIcon(): string {
    switch (this.errorType) {
      case 'offline': return 'wifi_off';
      case 'permission': return 'lock';
      case 'timeout': return 'hourglass_empty';
      case 'server': return 'dns';
      default: return 'error_outline';
    }
  }

  getTitle(): string {
    if (this.title) return this.title;
    switch (this.errorType) {
      case 'offline': return 'No Internet Connection';
      case 'permission': return 'Access Restricted';
      case 'timeout': return 'Request Timed Out';
      case 'server': return 'Server Unavailable';
      default: return 'Something Went Wrong';
    }
  }

  getDefaultMessage(): string {
    switch (this.errorType) {
      case 'offline': return 'Please check your mobile network or Wi-Fi connection.';
      case 'permission': return 'You do not have permission to view or modify this resource.';
      case 'timeout': return 'The connection took too long to respond. Please try again.';
      case 'server': return 'Unable to connect to the ApexFit server. Try again shortly.';
      default: return 'An unexpected error occurred while processing your request.';
    }
  }
}
