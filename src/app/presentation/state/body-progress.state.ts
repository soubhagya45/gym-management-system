import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import {
  IBodyProgressRepository,
  BODY_PROGRESS_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { BodyProgressEntry } from '../../core/models/body-progress.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { MemberState } from './member.state';

@Injectable({
  providedIn: 'root'
})
export class BodyProgressState {
  private entriesSubject = new BehaviorSubject<BodyProgressEntry[]>([]);
  entries$ = this.entriesSubject.asObservable();

  private allEntriesSubject = new BehaviorSubject<BodyProgressEntry[]>([]);
  allEntries$ = this.allEntriesSubject.asObservable();

  // Dashboard Aggregates derived reactively from members and progress entries
  dashboardStats$ = combineLatest([
    this.memberState.members$,
    this.allEntries$
  ]).pipe(
    map(([members, entries]) => {
      // 1. Total Weight Lost: startingWeight - currentWeight for members who have both set
      const membersWithWeights = members.filter(
        m => m.startingWeight !== undefined && m.startingWeight > 0
      );

      let totalWeightLost = 0;
      let totalMembersProgressing = 0;
      let goalCompletionSum = 0;

      const leaders = membersWithWeights
        .map(member => {
          const start = member.startingWeight!;
          const current = member.weight; // member.weight is their current weight
          const goal = member.goalWeight || start; // fallback if no goal weight
          
          const lost = start - current;
          const targetLoss = start - goal;
          
          let completionPercentage = 0;
          if (targetLoss > 0) {
            completionPercentage = Math.max(0, Math.min(100, (lost / targetLoss) * 100));
          } else if (targetLoss < 0) {
            // Weight gain goal
            const gained = current - start;
            const targetGain = goal - start;
            completionPercentage = Math.max(0, Math.min(100, (gained / targetGain) * 100));
          } else {
            completionPercentage = current === goal ? 100 : 0;
          }

          if (lost > 0) {
            totalWeightLost += lost;
          }

          if (member.startingWeight) {
            totalMembersProgressing++;
            goalCompletionSum += completionPercentage;
          }

          return {
            memberId: member.id,
            name: member.name,
            avatarUrl: member.avatarUrl,
            startingWeight: start,
            currentWeight: current,
            goalWeight: goal,
            weightChange: lost,
            completionPercentage: Math.round(completionPercentage),
            fitnessGoal: member.fitnessGoal
          };
        })
        .sort((a, b) => b.completionPercentage - a.completionPercentage) // Sort by completion percentage descending
        .slice(0, 5); // top 5 leaders

      const averageGoalCompletion = totalMembersProgressing > 0 
        ? Math.round(goalCompletionSum / totalMembersProgressing) 
        : 0;

      return {
        totalWeightLost: Math.round(totalWeightLost * 10) / 10,
        averageGoalCompletion,
        totalProgressingCount: totalMembersProgressing,
        leaders
      };
    })
  );

  constructor(
    @Inject(BODY_PROGRESS_REPOSITORY_TOKEN) private progressRepository: IBodyProgressRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService,
    private memberState: MemberState
  ) {
    // React to tenant changes
    this.tenantContext.activeGymId$.pipe(
      switchMap(gymId => {
        if (!gymId) {
          return of([]);
        }
        return this.progressRepository.getAllEntries(gymId);
      })
    ).subscribe(entries => {
      this.allEntriesSubject.next(entries);
    });
  }

  loadEntries(memberId: string): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.progressRepository.getEntries(gymId, memberId).subscribe(entries => {
        this.entriesSubject.next(entries);
      });
    }
  }

  loadAllEntries(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.progressRepository.getAllEntries(gymId).subscribe(entries => {
        this.allEntriesSubject.next(entries);
      });
    }
  }

  addEntry(entry: Omit<BodyProgressEntry, 'id' | 'gymId'>): Observable<BodyProgressEntry> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.progressRepository.addEntry(gymId, { ...entry, gymId }).pipe(
      tap((saved) => {
        this.loadAllEntries();
        this.loadEntries(entry.memberId);
        
        // Reload members to update current weight
        this.memberState.loadMembers();

        // Get member name to log
        this.memberState.getMemberById(entry.memberId).subscribe(member => {
          if (member) {
            this.logRepository.addLog(
              gymId,
              `Logged fitness progress for ${member.name}: ${entry.weight} kg (Body Fat: ${entry.bodyFat || 'N/A'}%)`,
              'attendance'
            ).subscribe();
          }
        });
      })
    );
  }

  deleteEntry(id: string, memberId: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.progressRepository.deleteEntry(gymId, id).pipe(
      tap(() => {
        this.loadAllEntries();
        this.loadEntries(memberId);
        this.memberState.loadMembers();
      })
    );
  }
}
