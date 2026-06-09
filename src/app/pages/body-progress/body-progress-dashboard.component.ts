import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { Member } from '../../core/models/member.entity';
import { BodyProgressEntry } from '../../core/models/body-progress.entity';
import { MemberState } from '../../presentation/state/member.state';
import { BodyProgressState } from '../../presentation/state/body-progress.state';
import { LogBodyProgressDialogComponent } from '../members/log-body-progress-dialog.component';

@Component({
  selector: 'app-body-progress-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './body-progress-dashboard.component.html',
  styleUrls: ['./body-progress-dashboard.component.scss']
})
export class BodyProgressDashboardComponent implements OnInit {
  stats$: Observable<any>;
  members$: Observable<Member[]>;
  allEntries$: Observable<any[]>; // Join with member info for display

  selectedMemberId: string = '';
  displayedColumns: string[] = ['member', 'date', 'weight', 'bodyFat', 'bmi', 'notes', 'actions'];

  constructor(
    private memberState: MemberState,
    private progressState: BodyProgressState,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.stats$ = this.progressState.dashboardStats$;
    this.members$ = this.memberState.members$;

    // Join progress entries with member details for the global logs table
    this.allEntries$ = this.progressState.allEntries$.pipe(
      map(entries => {
        // We will fetch members synchronously or via the state's snapshot if available,
        // but since we are reactive, we get it from membersSubject value if possible.
        // Let's do it by subscribing to members$ or using combineLatest.
        return entries;
      })
    );
  }

  ngOnInit(): void {
    this.memberState.loadMembers();
    this.progressState.loadAllEntries();

    // Set up joined entries stream
    this.allEntries$ = this.progressState.allEntries$.pipe(
      map(entries => {
        const membersList = (this.memberState as any).membersSubject?.value || [];
        return entries.map(entry => {
          const member = membersList.find((m: Member) => m.id === entry.memberId);
          return {
            ...entry,
            memberName: member?.name || 'Unknown Member',
            memberAvatar: member?.avatarUrl,
            memberGoal: member?.fitnessGoal || 'General Fitness'
          };
        });
      })
    );
  }

  openLogDialog(): void {
    if (!this.selectedMemberId) return;

    this.members$.pipe(take(1)).subscribe(members => {
      const member = members.find(m => m.id === this.selectedMemberId);
      if (!member) return;

      const dialogRef = this.dialog.open(LogBodyProgressDialogComponent, {
        width: '600px',
        data: { member },
        panelClass: 'glass-dialog'
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.progressState.addEntry(result).subscribe({
            next: () => {
              this.snackBar.open('Body progress logged successfully!', 'Close', { duration: 3000 });
              this.selectedMemberId = '';
            },
            error: (err) => {
              this.snackBar.open(err.message || 'Error logging progress', 'Close', { duration: 3000 });
            }
          });
        }
      });
    });
  }

  onDeleteEntry(entry: any): void {
    if (confirm(`Are you sure you want to delete this progress entry for ${entry.memberName}?`)) {
      this.progressState.deleteEntry(entry.id, entry.memberId).subscribe({
        next: () => {
          this.snackBar.open('Progress entry deleted', 'Close', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(err.message || 'Error deleting progress entry', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
