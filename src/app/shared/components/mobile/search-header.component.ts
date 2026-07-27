import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

@Component({
  selector: 'app-search-header',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  template: `
    <div class="search-header-container">
      <div class="search-input-box">
        <mat-icon class="search-icon">search</mat-icon>
        <input 
          type="text" 
          [placeholder]="placeholder" 
          [(ngModel)]="searchQuery" 
          (ngModelChange)="onSearchChange()"
          class="native-search-input" />
        <button 
          mat-icon-button 
          *ngIf="searchQuery" 
          (click)="clearSearch()" 
          class="clear-btn">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- Filter Chips Row -->
      <div class="chips-scroll-container" *ngIf="filterOptions && filterOptions.length > 0">
        <button 
          *ngFor="let opt of filterOptions" 
          class="chip-btn" 
          [class.active]="selectedFilter === opt.id"
          (click)="selectFilter(opt.id)">
          <span>{{ opt.label }}</span>
          <span class="chip-badge" *ngIf="opt.count !== undefined">{{ opt.count }}</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .search-header-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .search-input-box {
      display: flex;
      align-items: center;
      background: var(--bg-card, rgba(30, 41, 59, 0.8));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 0 14px;
      height: 48px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);

      .search-icon {
        color: #94a3b8;
        font-size: 22px;
        width: 22px;
        height: 22px;
        margin-right: 10px;
      }

      .native-search-input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--text-primary, #f8fafc);
        font-size: 0.9375rem;
        font-weight: 400;

        &::placeholder {
          color: #64748b;
        }
      }

      .clear-btn {
        width: 32px;
        height: 32px;
        line-height: 32px;
        color: #94a3b8;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }
      }
    }

    .chips-scroll-container {
      display: flex;
      align-items: center;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 4px;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }

      .chip-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: 36px;
        padding: 0 14px;
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: var(--text-secondary, #94a3b8);
        font-size: 0.8125rem;
        font-weight: 500;
        white-space: nowrap;
        cursor: pointer;
        transition: all 0.2s ease;
        -webkit-tap-highlight-color: transparent;

        &.active {
          background: var(--accent-color, #6366f1);
          border-color: var(--accent-color, #6366f1);
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);

          .chip-badge {
            background: rgba(255, 255, 255, 0.25);
            color: #ffffff;
          }
        }

        .chip-badge {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-muted, #94a3b8);
          font-size: 0.75rem;
          font-weight: 600;
          padding: 1px 6px;
          border-radius: 10px;
        }
      }
    }
  `]
})
export class SearchHeaderComponent {
  @Input() placeholder = 'Search members, phone, plan...';
  @Input() searchQuery = '';
  @Input() filterOptions: FilterOption[] = [];
  @Input() selectedFilter = 'all';

  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() filterChange = new EventEmitter<string>();

  onSearchChange(): void {
    this.searchQueryChange.emit(this.searchQuery);
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchQueryChange.emit('');
  }

  selectFilter(filterId: string): void {
    this.selectedFilter = filterId;
    this.filterChange.emit(filterId);
  }
}
