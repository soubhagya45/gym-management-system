import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ImageViewerData {
  imageUrl: string;
  title?: string;
  subtitle?: string;
}

@Component({
  selector: 'app-image-viewer-modal',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="image-viewer-container">
      <div class="viewer-header">
        <div class="header-info">
          <span class="viewer-title">{{ data.title || 'Image Preview' }}</span>
          <span class="viewer-sub" *ngIf="data.subtitle">{{ data.subtitle }}</span>
        </div>
        <button mat-icon-button type="button" class="close-btn" (click)="close()">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="viewer-body">
        <img [src]="data.imageUrl" [alt]="data.title || 'Photo'" class="full-img">
      </div>
    </div>
  `,
  styles: [`
    .image-viewer-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      background: #000000;
      color: #ffffff;
    }

    .viewer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(10px);
      z-index: 10;

      .header-info {
        display: flex;
        flex-direction: column;

        .viewer-title {
          font-size: 1rem;
          font-weight: 700;
        }

        .viewer-sub {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.7);
        }
      }

      .close-btn {
        color: #ffffff;
      }
    }

    .viewer-body {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      overflow: hidden;

      .full-img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        border-radius: 8px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.8);
      }
    }
  `]
})
export class ImageViewerModalComponent {
  constructor(
    public dialogRef: MatDialogRef<ImageViewerModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ImageViewerData
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
