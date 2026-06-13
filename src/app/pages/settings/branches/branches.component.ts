import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { GymState } from '../../../presentation/state/gym.state';
import { Gym, Branch } from '../../../core/models/gym.entity';

@Component({
  selector: 'app-branches',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTableModule,
    MatSnackBarModule
  ],
  template: `
    <div class="settings-container">
      <!-- Page Header -->
      <div class="page-header">
        <div class="title-area">
          <h1>Branch Management</h1>
          <p>Configure and manage physical gym centers. Define identifiers, address details, and assign location managers.</p>
        </div>
        <div class="actions-area">
          <button mat-raised-button color="primary" (click)="toggleBranchForm()">
            <mat-icon>{{ showForm ? 'close' : 'add' }}</mat-icon>
            <span>{{ showForm ? 'Close Editor' : 'Add New Branch' }}</span>
          </button>
        </div>
      </div>

      <div class="content-body" *ngIf="activeGym; else loading">
        <!-- Editor Box (Collapse/Expand) -->
        <div class="mat-card edit-card glass-panel" *ngIf="showForm">
          <div class="card-title-row">
            <mat-icon class="title-icon">storefront</mat-icon>
            <h2>{{ editMode ? 'Edit Branch' : 'Add New Branch' }}</h2>
          </div>
          <p class="section-desc">Fill in the branches specification details below.</p>

          <form [formGroup]="branchForm" (ngSubmit)="onSaveBranch()" class="fields-stack">
            <div class="form-row">
              <!-- Name -->
              <mat-form-field appearance="outline">
                <mat-label>Branch Name</mat-label>
                <input matInput formControlName="name" placeholder="e.g. Koramangala Extension">
                <mat-error *ngIf="branchForm.get('name')?.hasError('required')">Name is required</mat-error>
              </mat-form-field>

              <!-- Code -->
              <mat-form-field appearance="outline">
                <mat-label>Branch Code</mat-label>
                <input matInput formControlName="code" placeholder="e.g. UT-02">
                <mat-error *ngIf="branchForm.get('code')?.hasError('required')">Branch code is required</mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <!-- Manager -->
              <mat-form-field appearance="outline">
                <mat-label>Branch Manager</mat-label>
                <input matInput formControlName="manager" placeholder="e.g. Rahul Sharma">
                <mat-error *ngIf="branchForm.get('manager')?.hasError('required')">Manager name is required</mat-error>
              </mat-form-field>

              <!-- Phone -->
              <mat-form-field appearance="outline">
                <mat-label>Contact Hotline</mat-label>
                <input matInput formControlName="phone" placeholder="e.g. +91 98765 43210">
                <mat-error *ngIf="branchForm.get('phone')?.hasError('required')">Phone is required</mat-error>
              </mat-form-field>
            </div>

            <!-- Address -->
            <mat-form-field appearance="outline">
              <mat-label>Address</mat-label>
              <textarea matInput formControlName="address" rows="2" placeholder="Complete address details"></textarea>
              <mat-error *ngIf="branchForm.get('address')?.hasError('required')">Address is required</mat-error>
            </mat-form-field>

            <div class="editor-actions">
              <button mat-button type="button" (click)="cancelEdit()">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="branchForm.invalid">
                <mat-icon>check</mat-icon>
                <span>{{ editMode ? 'Update Branch' : 'Add Branch' }}</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Branches Table -->
        <div class="mat-card table-card">
          <div class="card-title-row">
            <mat-icon class="title-icon">list_alt</mat-icon>
            <h2>Branch Location Registry</h2>
          </div>
          <p class="section-desc">Total Branches Configured: <strong>{{ branchesList.length }}</strong></p>

          <div class="table-scroll-wrapper">
            <table mat-table [dataSource]="branchesList" class="w-100">
              <!-- Code -->
              <ng-container matColumnDef="code">
                <th mat-header-cell *matHeaderCellDef>Code</th>
                <td mat-cell *matCellDef="let element" class="branch-code">{{ element.code }}</td>
              </ng-container>

              <!-- Name -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Branch Name</th>
                <td mat-cell *matCellDef="let element" class="font-bold">{{ element.name }}</td>
              </ng-container>

              <!-- Manager -->
              <ng-container matColumnDef="manager">
                <th mat-header-cell *matHeaderCellDef>Manager</th>
                <td mat-cell *matCellDef="let element">{{ element.manager }}</td>
              </ng-container>

              <!-- Phone -->
              <ng-container matColumnDef="phone">
                <th mat-header-cell *matHeaderCellDef>Phone</th>
                <td mat-cell *matCellDef="let element">{{ element.phone }}</td>
              </ng-container>

              <!-- Address -->
              <ng-container matColumnDef="address">
                <th mat-header-cell *matHeaderCellDef>Address</th>
                <td mat-cell *matCellDef="let element" class="text-muted text-truncate">{{ element.address }}</td>
              </ng-container>

              <!-- Actions -->
              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef style="width: 120px; text-align: center;">Actions</th>
                <td mat-cell *matCellDef="let element" style="text-align: center;">
                  <button mat-icon-button color="primary" (click)="startEdit(element)" matTooltip="Edit Branch Details">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="deleteBranch(element.id)" matTooltip="Delete Branch">
                    <mat-icon>delete</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="columns"></tr>
              <tr mat-row *matRowDef="let row; columns: columns;"></tr>
            </table>

            <div class="empty-state" *ngIf="branchesList.length === 0">
              <mat-icon>store</mat-icon>
              <h3>No branches registered</h3>
              <p>Create a physical outlet location to start managing multiple branch data.</p>
            </div>
          </div>
        </div>
      </div>

      <ng-template #loading>
        <div class="loading-state">
          <mat-icon class="spin-icon">sync</mat-icon>
          <p>Fetching active branch registry details...</p>
        </div>
      </ng-template>
    </div>
  `,
  styles: [`
    .settings-container {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .edit-card {
      margin-bottom: 24px;
      animation: slideDown 0.3s ease;
    }
    .card-title-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 8px;
      .title-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: var(--accent-color);
      }
      h2 {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
      }
    }
    .section-desc {
      font-size: 13px;
      color: var(--text-secondary);
      line-height: 1.5;
      margin: 0 0 24px 0;
    }
    .fields-stack {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .editor-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid var(--border-color);
      padding-top: 16px;
      margin-top: 8px;
      button {
        border-radius: 8px !important;
      }
    }
    .table-scroll-wrapper {
      width: 100%;
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--border-color);
      
      table {
        width: 100%;
        background: transparent !important;
      }
      
      th {
        font-weight: 700 !important;
        color: var(--text-secondary);
      }
      
      td {
        color: var(--text-primary);
      }
      .branch-code {
        font-family: monospace;
        font-size: 13px;
        font-weight: bold;
      }
      .text-truncate {
        max-width: 250px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      gap: 12px;
      color: var(--text-muted);
      
      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        opacity: 0.3;
      }
      
      h3 {
        font-size: 16px;
        font-weight: 700;
        margin: 0;
        color: var(--text-secondary);
      }
      
      p {
        font-size: 13px;
        margin: 0;
      }
    }
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: var(--text-muted);

      .spin-icon {
        font-size: 40px;
        width: 40px;
        height: 40px;
        animation: spin 1.5s infinite linear;
        margin-bottom: 16px;
        color: var(--accent-color);
      }
    }
    @keyframes spin {
      100% { transform: rotate(360deg); }
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @media (max-width: 599.98px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class BranchesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  branchForm!: FormGroup;
  activeGym: Gym | null = null;
  branchesList: Branch[] = [];
  columns = ['code', 'name', 'manager', 'phone', 'address', 'actions'];

  showForm = false;
  editMode = false;
  editingBranchId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private gymState: GymState,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.branchForm = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      manager: ['', Validators.required],
      phone: ['', Validators.required],
      address: ['', Validators.required]
    });

    this.gymState.activeGym$.pipe(takeUntil(this.destroy$)).subscribe(gym => {
      if (gym) {
        this.activeGym = gym;
        this.branchesList = gym.branches || [];
        this.cdr.markForCheck();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleBranchForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) {
      this.cancelEdit();
    }
  }

  startEdit(branch: Branch): void {
    this.showForm = true;
    this.editMode = true;
    this.editingBranchId = branch.id;
    this.branchForm.patchValue({
      name: branch.name,
      code: branch.code,
      manager: branch.manager,
      phone: branch.phone,
      address: branch.address
    });
    this.cdr.markForCheck();
  }

  cancelEdit(): void {
    this.showForm = false;
    this.editMode = false;
    this.editingBranchId = null;
    this.branchForm.reset();
    this.cdr.markForCheck();
  }

  onSaveBranch(): void {
    if (this.branchForm.invalid || !this.activeGym) return;

    let updatedBranches = [...this.branchesList];
    if (this.editMode && this.editingBranchId) {
      const idx = updatedBranches.findIndex(b => b.id === this.editingBranchId);
      if (idx !== -1) {
        updatedBranches[idx] = {
          ...updatedBranches[idx],
          name: this.branchForm.value.name,
          code: this.branchForm.value.code,
          manager: this.branchForm.value.manager,
          phone: this.branchForm.value.phone,
          address: this.branchForm.value.address
        };
      }
    } else {
      const newBranch: Branch = {
        id: 'br-' + Math.random().toString(36).substring(2, 9),
        name: this.branchForm.value.name,
        code: this.branchForm.value.code,
        manager: this.branchForm.value.manager,
        phone: this.branchForm.value.phone,
        address: this.branchForm.value.address
      };
      updatedBranches.push(newBranch);
    }

    const updatedGym: Gym = {
      ...this.activeGym,
      branches: updatedBranches
    };

    this.gymState.updateGym(updatedGym).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open(
          this.editMode ? 'Branch updated successfully!' : 'New branch added successfully!', 
          'Dismiss', 
          { duration: 3000 }
        );
        this.cancelEdit();
      },
      error: (err) => {
        this.snackBar.open(`Failed to save branch: ${err.message || err}`, 'Dismiss', { duration: 4000 });
      }
    });
  }

  deleteBranch(branchId: string): void {
    if (!this.activeGym || !confirm('Are you sure you want to delete this branch?')) return;

    const updatedBranches = this.branchesList.filter(b => b.id !== branchId);
    const updatedGym: Gym = {
      ...this.activeGym,
      branches: updatedBranches
    };

    this.gymState.updateGym(updatedGym).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.snackBar.open('Branch deleted successfully!', 'Dismiss', { duration: 3000 });
      },
      error: (err) => {
        this.snackBar.open(`Failed to delete branch: ${err.message || err}`, 'Dismiss', { duration: 4000 });
      }
    });
  }
}
