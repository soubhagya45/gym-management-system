import { Injectable, Inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import {
  IWhatsAppRepository,
  WHATSAPP_REPOSITORY_TOKEN,
  IActivityLogRepository,
  ACTIVITY_LOG_REPOSITORY_TOKEN
} from '../../core/interfaces/repository.interfaces';
import { WhatsAppTemplate } from '../../core/models/whatsapp-template.entity';
import { WhatsAppReminder } from '../../core/models/whatsapp-reminder.entity';
import { TenantContextService } from '../../domain/tenancy/tenant-context.service';

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
    private tenantContext: TenantContextService
  ) {
    // React to tenant changes
    this.tenantContext.activeGymId$.pipe(
      switchMap(gymId => {
        if (!gymId) {
          return of({ templates: [], reminders: [] });
        }
        // Fetch both templates and reminders
        return this.whatsappRepository.getTemplates(gymId).pipe(
          switchMap(templates => {
            return this.whatsappRepository.getReminders(gymId).pipe(
              switchMap(reminders => {
                return of({ templates, reminders });
              })
            );
          })
        );
      })
    ).subscribe(data => {
      this.templatesSubject.next(data.templates);
      this.remindersSubject.next(data.reminders);
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

  updateTemplate(template: WhatsAppTemplate): Observable<void> {
    const gymId = this.tenantContext.getTenantId();
    if (!gymId) throw new Error('No active tenant selected');

    return this.whatsappRepository.updateTemplate(gymId, template).pipe(
      tap(() => {
        this.loadTemplates();
      })
    );
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
