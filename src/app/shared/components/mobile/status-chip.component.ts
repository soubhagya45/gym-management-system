import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-status-chip',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-chip" [ngClass]="statusClass">
      <span class="dot" *ngIf="showDot"></span>
      <span>{{ label || status }}</span>
    </span>
  `,
  styles: [`
    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: var(--m3-radius-full, 9999px);
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
      letter-spacing: 0.01em;
      line-height: 1.2;

      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
      }

      &.active, &.paid, &.present, &.converted {
        background: rgba(16, 185, 129, 0.18);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
      }

      &.expiring, &.pending, &.follow-up, &.trial-scheduled, &.warm {
        background: rgba(245, 158, 11, 0.18);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }

      &.inactive, &.overdue, &.absent, &.lost, &.expired, &.hot {
        background: rgba(239, 68, 68, 0.18);
        color: #f87171;
        border: 1px solid rgba(239, 68, 68, 0.3);
      }

      &.new, &.scheduled, &.contacted, &.cold {
        background: rgba(59, 130, 246, 0.18);
        color: #60a5fa;
        border: 1px solid rgba(59, 130, 246, 0.3);
      }
    }
  `]
})
export class StatusChipComponent {
  @Input() status = 'active';
  @Input() label?: string;
  @Input() showDot = true;

  get statusClass(): string {
    const s = this.status ? this.status.toLowerCase().replace(/\s+/g, '-') : '';
    if (s.includes('active') || s.includes('paid') || s.includes('present') || s.includes('converted')) return 'active';
    if (s.includes('expiring') || s.includes('pending') || s.includes('follow') || s.includes('warm') || s.includes('trial')) return 'expiring';
    if (s.includes('inactive') || s.includes('overdue') || s.includes('absent') || s.includes('lost') || s.includes('expired') || s.includes('hot')) return 'inactive';
    return 'new';
  }
}
