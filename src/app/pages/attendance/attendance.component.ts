import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GymService } from '../../services/gym.service';
import { Member, Attendance } from '../../interfaces/gym.model';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

interface RosterItem {
  memberId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  planName: string;
  timeIn: string;
  status: 'present' | 'absent' | 'unmarked';
}

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule
  ],
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.scss']
})
export class AttendanceComponent implements OnInit {
  // Roster listing
  roster$: Observable<RosterItem[]> | undefined;
  filteredRoster$: Observable<RosterItem[]> | undefined;
  
  // Stats
  presentCount$ = new Observable<number>();
  absentCount$ = new Observable<number>();
  attendanceRate$ = new Observable<number>();
  totalEligible$ = new Observable<number>();

  // Filter queries
  searchQuery = '';
  todayString = '';

  displayedColumns = ['photo', 'name', 'plan', 'time', 'status', 'actions'];

  constructor(
    private gymService: GymService,
    private snackBar: MatSnackBar
  ) {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    this.todayString = new Date().toLocaleDateString('en-US', options);
  }

  ngOnInit(): void {
    // 1. Build the roster by combining members and their today checkin logs
    const todayStr = new Date().toISOString().split('T')[0];
    
    this.roster$ = combineLatest([
      this.gymService.members$,
      this.gymService.attendance$
    ]).pipe(
      map(([members, attendanceList]) => {
        // Only include active/expiring members for today's active attendance roster
        const eligibleMembers = members.filter(m => m.status !== 'inactive');
        
        return eligibleMembers.map(m => {
          const checkin = attendanceList.find(a => a.memberId === m.id && a.date === todayStr);
          return {
            memberId: m.id,
            name: m.name,
            email: m.email,
            avatarUrl: m.avatarUrl,
            planName: m.planName,
            timeIn: checkin ? checkin.timeIn : '',
            status: checkin ? checkin.status : 'unmarked'
          };
        });
      })
    );

    // 2. Setup statistics calculations
    this.presentCount$ = this.roster$.pipe(
      map(items => items.filter(i => i.status === 'present').length)
    );

    this.absentCount$ = this.roster$.pipe(
      map(items => items.filter(i => i.status === 'absent').length)
    );

    this.totalEligible$ = this.roster$.pipe(
      map(items => items.length)
    );

    this.attendanceRate$ = combineLatest([this.presentCount$, this.totalEligible$]).pipe(
      map(([present, total]) => total > 0 ? Math.round((present / total) * 100) : 0)
    );

    // 3. Setup reactive filter bindings
    this.applySearchFilter();
  }

  applySearchFilter() {
    if (this.roster$) {
      this.filteredRoster$ = this.roster$.pipe(
        map(items => items.filter(item => 
          item.name.toLowerCase().includes(this.searchQuery.trim().toLowerCase()) ||
          item.email.toLowerCase().includes(this.searchQuery.trim().toLowerCase())
        ))
      );
    }
  }

  markPresent(item: RosterItem) {
    this.gymService.markAttendance(item.memberId, 'present');
    this.snackBar.open(`${item.name} checked in successfully.`, 'Dismiss', {
      duration: 2000
    });
  }

  markAbsent(item: RosterItem) {
    this.gymService.markAttendance(item.memberId, 'absent');
    this.snackBar.open(`${item.name} marked absent.`, 'Dismiss', {
      duration: 2000
    });
  }
}
