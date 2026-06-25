import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Invoice } from '../../../core/models/finance.entity';
import { FinanceState } from '../../../presentation/state/finance.state';
import { FILE_STORAGE_REPOSITORY_TOKEN, IFileStorageRepository } from '../../../core/interfaces/file-storage-repository.interface';
import { TenantContextService } from '../../../domain/tenancy/tenant-context.service';

@Component({
  selector: 'app-invoice-view-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <div class="invoice-container dark-theme-dialog">
      <!-- Invoice Header -->
      <div class="invoice-header">
        <div class="brand">
          <mat-icon class="brand-icon">fitness_center</mat-icon>
          <div class="brand-text">
            <h2>APEX<span>FIT</span></h2>
            <p>Premium Gym Suite</p>
          </div>
        </div>
        <div class="meta">
          <h2>INVOICE</h2>
          <p class="invoice-num">{{ data.invoiceNumber }}</p>
          <p class="date">Date: {{ data.invoiceDate | date:'mediumDate' }}</p>
        </div>
      </div>

      <mat-divider class="divider"></mat-divider>

      <!-- Billing Details -->
      <div class="billing-details">
        <div class="bill-from">
          <h4>Billed By</h4>
          <h3>Apex Fit Downtown</h3>
          <p>123 Elite Athlete Boulevard</p>
          <p>GSTIN: 29ABCDE1234F1Z5</p>
          <p>Email: billing&#64;apexfit.com</p>
        </div>
        <div class="bill-to">
          <h4>Billed To</h4>
          <h3>{{ data.memberName }}</h3>
          <p>Gym Member ID: {{ data.memberId }}</p>
          <p>Status: <span class="status-badge" [class]="data.status">{{ data.status }}</span></p>
        </div>
      </div>

      <!-- Line Items Table -->
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th class="text-right">Base Amount</th>
            <th class="text-right">GST (18%)</th>
            <th class="text-right">Discount</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>{{ data.membershipPlan }}</strong>
              <p class="desc-sub">Full access membership pass</p>
            </td>
            <td class="text-right">₹{{ data.amount | number:'1.2-2' }}</td>
            <td class="text-right">₹{{ data.gst || 0 | number:'1.2-2' }}</td>
            <td class="text-right">₹{{ data.discount | number:'1.2-2' }}</td>
            <td class="text-right">₹{{ data.finalAmount | number:'1.2-2' }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Summary -->
      <div class="summary-section">
        <div class="payment-method">
          <p><strong>Payment Method:</strong> {{ data.paymentMethod }}</p>
          <p class="notes">Note: This is a system-generated invoice valid for tax purposes.</p>
        </div>
        <div class="totals">
          <div class="total-row">
            <span>Subtotal</span>
            <span>₹{{ data.amount | number:'1.2-2' }}</span>
          </div>
          <div class="total-row">
            <span>GST (18%)</span>
            <span>₹{{ data.gst || 0 | number:'1.2-2' }}</span>
          </div>
          <div class="total-row grand-total">
            <span>Grand Total</span>
            <span>₹{{ data.finalAmount | number:'1.2-2' }}</span>
          </div>
        </div>
      </div>

      <mat-divider class="divider" style="margin-top: 16px; margin-bottom: 16px;"></mat-divider>
      
      <!-- Attachment Section -->
      <div class="attachment-section">
        <div *ngIf="data.attachmentUrl; else noAttachment" class="attachment-info">
          <mat-icon class="attachment-icon">attachment</mat-icon>
          <a [href]="data.attachmentUrl" target="_blank" class="attachment-link">View Invoice Attachment</a>
          <button mat-icon-button color="warn" (click)="removeAttachment()" matTooltip="Remove Attachment" class="remove-btn">
            <mat-icon>delete</mat-icon>
          </button>
        </div>
        <ng-template #noAttachment>
          <div class="upload-attachment-btn">
            <input type="file" #fileInput (change)="onUploadAttachment($event)" accept="image/*,application/pdf" style="display: none">
            <button mat-stroked-button color="accent" (click)="fileInput.click()" [disabled]="isUploading">
              <mat-icon *ngIf="!isUploading">cloud_upload</mat-icon>
              <mat-icon *ngIf="isUploading" class="spin-icon">sync</mat-icon>
              <span>{{ isUploading ? 'Uploading...' : 'Attach Receipt/Document' }}</span>
            </button>
          </div>
        </ng-template>
      </div>

      <!-- Footer Actions -->
      <div mat-dialog-actions class="dialog-actions">
        <button mat-flat-button color="primary" (click)="printInvoice()">
          <mat-icon>print</mat-icon>
          Print Invoice
        </button>
        <button mat-button (click)="dialogRef.close()">Close</button>
      </div>
    </div>
  `,
  styles: [`
    .invoice-container {
      font-family: 'Outfit', sans-serif;
      color: var(--text-primary);
      padding: 12px;
    }

    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      font-size: 38px;
      width: 38px;
      height: 38px;
      color: var(--accent-color);
    }

    .brand-text {
      h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 800;
        span {
          color: var(--accent-color);
        }
      }
      p {
        margin: 0;
        font-size: 11px;
        color: var(--text-secondary);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
    }

    .meta {
      text-align: right;
      h2 {
        margin: 0 0 4px 0;
        font-size: 20px;
        font-weight: 700;
        color: var(--accent-color);
        letter-spacing: 0.05em;
      }
      .invoice-num {
        margin: 0 0 2px 0;
        font-weight: 600;
        font-size: 13px;
      }
      .date {
        margin: 0;
        font-size: 12px;
        color: var(--text-secondary);
      }
    }

    .divider {
      margin-bottom: 24px;
      background-color: var(--border-color);
    }

    .billing-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      margin-bottom: 32px;

      h4 {
        margin: 0 0 8px 0;
        color: var(--text-secondary);
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
      }

      p {
        margin: 0 0 3px 0;
        font-size: 13px;
        color: var(--text-secondary);
      }
    }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: capitalize;

      &.paid {
        background-color: var(--success-glow);
        color: var(--success);
      }
      &.pending {
        background-color: var(--warning-glow);
        color: var(--warning);
      }
      &.cancelled {
        background-color: var(--danger-glow);
        color: var(--danger);
      }
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 32px;

      th {
        border-bottom: 2px solid var(--border-color);
        padding: 12px 8px;
        text-align: left;
        font-size: 12px;
        text-transform: uppercase;
        color: var(--text-secondary);
        font-weight: 600;
      }

      td {
        border-bottom: 1px solid var(--border-color);
        padding: 16px 8px;
        font-size: 13.5px;

        strong {
          color: var(--text-primary);
        }

        .desc-sub {
          margin: 4px 0 0 0;
          font-size: 12px;
          color: var(--text-secondary);
        }
      }

      .text-right {
        text-align: right;
      }
    }

    .summary-section {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 32px;
      margin-bottom: 24px;
      align-items: flex-start;
    }

    .payment-method {
      p {
        margin: 0 0 8px 0;
        font-size: 13.5px;
      }
      .notes {
        font-size: 11px;
        color: var(--text-secondary);
        font-style: italic;
      }
    }

    .totals {
      display: flex;
      flex-direction: column;
      gap: 10px;

      .total-row {
        display: flex;
        justify-content: space-between;
        font-size: 13.5px;
        color: var(--text-secondary);

        &.grand-total {
          border-top: 1px solid var(--border-color);
          padding-top: 10px;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }
      }
    }

    .attachment-section {
      margin-bottom: 24px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px dashed var(--border-color);
      border-radius: 8px;
    }
    .attachment-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .attachment-icon {
      color: var(--accent-color);
    }
    .attachment-link {
      color: var(--accent-color);
      text-decoration: none;
      font-weight: 500;
      flex: 1;
      &:hover {
        text-decoration: underline;
      }
    }
    .remove-btn {
      color: var(--danger);
    }
    .upload-attachment-btn {
      display: flex;
      justify-content: flex-start;
    }
    .spin-icon {
      animation: spin 1.5s infinite linear;
      display: inline-block;
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }

    @media print {
      body * {
        visibility: hidden;
      }
      .invoice-container, .invoice-container * {
        visibility: visible;
      }
      .invoice-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        background-color: white !important;
        color: black !important;
      }
      .dialog-actions {
        display: none;
      }
    }
  `]
})
export class InvoiceViewDialogComponent {
  isUploading = false;

  constructor(
    public dialogRef: MatDialogRef<InvoiceViewDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: Invoice,
    private financeState: FinanceState,
    @Inject(FILE_STORAGE_REPOSITORY_TOKEN) private fileStorage: IFileStorageRepository,
    private tenantContext: TenantContextService
  ) {}

  printInvoice(): void {
    window.print();
  }

  onUploadAttachment(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.isUploading = true;
      const gymId = this.data.gymId || this.tenantContext.getTenantId() || 'unknown';
      this.fileStorage.uploadFile(file, `gyms/${gymId}/invoices`).subscribe({
        next: (url) => {
          this.data = {
            ...this.data,
            attachmentUrl: url
          };
          this.financeState.updateInvoice(this.data).subscribe({
            next: () => {
              this.isUploading = false;
            },
            error: () => {
              this.isUploading = false;
            }
          });
        },
        error: (err) => {
          this.isUploading = false;
          console.error('Invoice attachment upload failed:', err);
        }
      });
    }
  }

  removeAttachment(): void {
    if (this.data.attachmentUrl) {
      this.fileStorage.deleteFile(this.data.attachmentUrl).subscribe({
        next: () => {
          const updated = { ...this.data };
          delete updated.attachmentUrl;
          this.data = updated;
          this.financeState.updateInvoice(this.data).subscribe();
        },
        error: (err) => {
          console.error('Invoice attachment delete failed:', err);
          const updated = { ...this.data };
          delete updated.attachmentUrl;
          this.data = updated;
          this.financeState.updateInvoice(this.data).subscribe();
        }
      });
    }
  }
}
