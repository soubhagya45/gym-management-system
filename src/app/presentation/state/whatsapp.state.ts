import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of, combineLatest } from 'rxjs';
import { switchMap, tap, take, catchError } from 'rxjs/operators';
import {
  IWhatsAppRepository,
  WHATSAPP_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { WhatsAppTemplate } from '../../core/models/whatsapp-template.entity';
import { WhatsAppReminder } from '../../core/models/whatsapp-reminder.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';
import { GymState } from './gym.state';
import { buildDefaultWhatsAppTemplates } from '../../core/models/default-whatsapp-templates';

@Injectable({
  providedIn: 'root'
})
export class WhatsAppState {
  private templatesSubject = new BehaviorSubject<WhatsAppTemplate[]>([]);
  templates$ = this.templatesSubject.asObservable();

  private remindersSubject = new BehaviorSubject<WhatsAppReminder[]>([]);
  reminders$ = this.remindersSubject.asObservable();

  constructor(
    @Inject(WHATSAPP_REPOSITORY_TOKEN) private whatsappRepository: IWhatsAppRepository,
    @Inject(ACTIVITY_LOG_REPOSITORY_TOKEN) private logRepository: IActivityLogRepository,
    private tenantContext: TenantContextService,
    private gymState: GymState
  ) {
    // React to tenant changes — load templates and reminders
    this.tenantContext.activeGymId$.pipe(
      switchMap(gymId => {
        if (!gymId) {
          return of({ templates: [], reminders: [] });
        }
        return this.whatsappRepository.getTemplates(gymId).pipe(
          switchMap(templates => {
            return this.whatsappRepository.getReminders(gymId).pipe(
              switchMap(reminders => {
                return of({ templates, reminders });
              })
            );
          }),
          catchError(() => of({ templates: [], reminders: [] }))
        );
      })
    ).subscribe(data => {
      this.templatesSubject.next(data.templates);
      this.remindersSubject.next(data.reminders);

      // Back-fill default templates for existing gyms registered before this feature.
      // Only runs once when the gym loads and has no templates yet.
      if (data.templates.length === 0) {
        const gymId = this.tenantContext.getTenantId();
        if (gymId) {
          this.gymState.activeGym$.pipe(take(1)).subscribe(gym => {
            if (gym) {
              this.ensureDefaultTemplates(gymId, gym.gymName);
            }
          });
        }
      }
    });
  }

  loadTemplates(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.whatsappRepository.getTemplates(gymId).subscribe(templates => {
        this.templatesSubject.next(templates);
      });
    }
  }

  loadReminders(): void {
    const gymId = this.tenantContext.getTenantId();
    if (gymId) {
      this.whatsappRepository.getReminders(gymId).subscribe(reminders => {
        this.remindersSubject.next(reminders);
      });
    }
  }

  /**
   * Adds a new custom WhatsApp template for the active gym.
   */
  addTemplate(template: Omit<WhatsAppTemplate, 'id' | 'gymId'>): Observable<WhatsAppTemplate> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.whatsappRepository.addTemplate(gymId, { ...template, gymId }).pipe(
      tap(saved => {
        this.templatesSubject.next([...this.templatesSubject.value, saved]);
        this.logRepository.addLog(gymId, `Created WhatsApp template: "${saved.name}"`, 'plan-change').subscribe();
      })
    );
  }

  updateTemplate(template: WhatsAppTemplate): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.whatsappRepository.updateTemplate(gymId, template).pipe(
      tap(() => {
        this.loadTemplates();
      })
    );
  }

  /**
   * Deletes a WhatsApp template.
   */
  deleteTemplate(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.whatsappRepository.deleteTemplate(gymId, id).pipe(
      tap(() => {
        this.templatesSubject.next(this.templatesSubject.value.filter(t => t.id !== id));
        this.logRepository.addLog(gymId, `Deleted WhatsApp template`, 'plan-change').subscribe();
      })
    );
  }

  /**
   * Seeds the 8 default WhatsApp templates for a gym that has none.
   * Called automatically when a gym loads with an empty template list,
   * providing backward compatibility for gyms registered before onboarding seeding was added.
   */
  private ensureDefaultTemplates(gymId: string, gymName: string): void {
    const defaults = buildDefaultWhatsAppTemplates(gymId, gymName);
    const saves = defaults.map(t =>
      this.whatsappRepository.addTemplate(gymId, t)
    );

    // Use forkJoin-style sequential saves via individual subscriptions
    saves.forEach(save$ => {
      save$.pipe(
        catchError(err => {
          console.error('[WhatsAppState] Failed to seed default template:', err);
          return of(null);
        })
      ).subscribe(saved => {
        if (saved) {
          this.templatesSubject.next([...this.templatesSubject.value, saved]);
        }
      });
    });
  }

  sendReminder(reminder: Omit<WhatsAppReminder, 'id' | 'gymId' | 'status' | 'sentTime'>): Observable<WhatsAppReminder> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const newReminder: Omit<WhatsAppReminder, 'id'> = {
      ...reminder,
      gymId,
      status: 'sent',
      sentTime: new Date().toISOString()
    };

    return this.whatsappRepository.addReminder(gymId, newReminder).pipe(
      tap(saved => {
        this.loadReminders();
        // Log to activity log
        this.logRepository.addLog(
          gymId,
          `WhatsApp reminder sent to ${reminder.recipientName}: [${reminder.templateName}]`,
          'plan-change'
        ).subscribe();
      })
    );
  }

  scheduleReminder(reminder: Omit<WhatsAppReminder, 'id' | 'gymId' | 'status' | 'scheduledTime'>, scheduledTime: string): Observable<WhatsAppReminder> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const newReminder: Omit<WhatsAppReminder, 'id'> = {
      ...reminder,
      gymId,
      status: 'scheduled',
      scheduledTime
    };

    return this.whatsappRepository.addReminder(gymId, newReminder).pipe(
      tap(() => {
        this.loadReminders();
      })
    );
  }

  sendScheduledNow(reminder: WhatsAppReminder): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    const updated = {
      ...reminder,
      status: 'sent' as const,
      sentTime: new Date().toISOString()
    };

    return this.whatsappRepository.updateReminder(gymId, updated).pipe(
      tap(() => {
        this.loadReminders();
        this.logRepository.addLog(
          gymId,
          `WhatsApp scheduled reminder sent to ${reminder.recipientName}: [${reminder.templateName}]`,
          'plan-change'
        ).subscribe();
      })
    );
  }

  cancelReminder(id: string): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.whatsappRepository.deleteReminder(gymId, id).pipe(
      tap(() => {
        this.loadReminders();
      })
    );
  }
}


