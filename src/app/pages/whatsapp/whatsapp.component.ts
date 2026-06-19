import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WhatsAppTemplateType } from '../../core/models/whatsapp-template.entity';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';

import { WhatsAppState } from '../../presentation/state/whatsapp.state';
import { WhatsAppTemplate } from '../../core/models/whatsapp-template.entity';
import { WhatsAppReminder } from '../../core/models/whatsapp-reminder.entity';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { WhatsAppPreviewModalComponent } from './whatsapp-preview-modal.component';

@Component({
  selector: 'app-whatsapp',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './whatsapp.component.html',
  styleUrls: ['./whatsapp.component.scss']
})
export class WhatsAppComponent implements OnInit {
  activeTab = 0;
  
  templates$: Observable<WhatsAppTemplate[]> | undefined;
  scheduledReminders$: Observable<WhatsAppReminder[]> | undefined;
  reminderLogs$: Observable<WhatsAppReminder[]> | undefined;
  
  // Stats
  stats$: Observable<{
    totalTemplates: number;
    activeTemplates: number;
    scheduledCount: number;
    sentCount: number;
  }> | undefined;

  // Editing template state
  editingTemplateId: string | null = null;
  editingBody = '';

  // Add-template form state
  showAddTemplateForm = false;
  newTemplateName = '';
  newTemplateType: WhatsAppTemplateType = 'welcome_message';
  newTemplateBody = '';
  isSubmittingTemplate = false;

  templateTypes: { value: WhatsAppTemplateType; label: string }[] = [
    { value: 'welcome_message',     label: 'Welcome Message' },
    { value: 'renewal_reminder',    label: 'Renewal Reminder' },
    { value: 'payment_reminder',    label: 'Payment Reminder' },
    { value: 'trial_follow_up',     label: 'Trial Follow-Up' },
    { value: 'attendance_reminder', label: 'Attendance Reminder' }
  ];

  // Table columns
  scheduledColumns = ['recipient', 'phone', 'template', 'scheduledTime', 'actions'];
  logColumns = ['recipient', 'phone', 'template', 'message', 'sentTime', 'status'];
  
  scheduledDataSource = new MatTableDataSource<WhatsAppReminder>();
  logDataSource = new MatTableDataSource<WhatsAppReminder>();

  // Available variables list helper for the UI
  availableVariables = [
    { name: '{name}', desc: 'Full name of the member/lead' },
    { name: '{planName}', desc: 'Name of the membership plan' },
    { name: '{dueDate}', desc: 'Due date for renewals or pending payments' },
    { name: '{amount}', desc: 'Amount due for pending invoices' },
    { name: '{gymName}', desc: 'Name of the gym facility' },
    { name: '{trialDate}', desc: 'Scheduled date of the trial session' }
  ];

  constructor(
    private whatsappState: WhatsAppState,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.templates$ = this.whatsappState.templates$;
    
    // Filter scheduled vs sent reminders
    this.scheduledReminders$ = this.whatsappState.reminders$.pipe(
      map(reminders => reminders.filter(r => r.status === 'scheduled' || r.status === 'pending'))
    );
    
    this.reminderLogs$ = this.whatsappState.reminders$.pipe(
      map(reminders => reminders.filter(r => r.status === 'sent' || r.status === 'failed'))
    );

    // Populate data sources for material tables
    this.scheduledReminders$.subscribe(reminders => {
      this.scheduledDataSource.data = reminders;
    });

    this.reminderLogs$.subscribe(logs => {
      this.logDataSource.data = logs;
    });

    // Calculate dynamic stats
    this.stats$ = combineLatest([
      this.whatsappState.templates$,
      this.whatsappState.reminders$
    ]).pipe(
      map(([templates, reminders]) => {
        const totalTemplates = templates.length;
        const activeTemplates = templates.filter(t => t.isActive).length;
        const scheduledCount = reminders.filter(r => r.status === 'scheduled' || r.status === 'pending').length;
        const sentCount = reminders.filter(r => r.status === 'sent').length;
        
        return {
          totalTemplates,
          activeTemplates,
          scheduledCount,
          sentCount
        };
      })
    );

    // Initial load
    this.whatsappState.loadTemplates();
    this.whatsappState.loadReminders();
  }

  // --- Template Management ---
  
  toggleTemplateStatus(template: WhatsAppTemplate): void {
    const updated = { ...template, isActive: !template.isActive };
    this.whatsappState.updateTemplate(updated).subscribe(() => {
      const stateTxt = updated.isActive ? 'activated' : 'deactivated';
      this.snackBar.open(`Template "${template.name}" has been ${stateTxt}.`, 'Dismiss', { duration: 3000 });
    });
  }

  startEditTemplate(template: WhatsAppTemplate): void {
    this.editingTemplateId = template.id;
    this.editingBody = template.body;
  }

  cancelEditTemplate(): void {
    this.editingTemplateId = null;
    this.editingBody = '';
  }

  saveTemplate(template: WhatsAppTemplate): void {
    if (!this.editingBody.trim()) {
      this.snackBar.open('Template body cannot be empty.', 'Dismiss', { duration: 3000 });
      return;
    }

    const updated = { ...template, body: this.editingBody };
    this.whatsappState.updateTemplate(updated).subscribe(() => {
      this.editingTemplateId = null;
      this.editingBody = '';
      this.snackBar.open(`Template "${template.name}" updated successfully!`, 'Dismiss', {
        duration: 3000,
        panelClass: ['premium-snack']
      });
    });
  }

  insertVariable(variable: string): void {
    this.editingBody += variable;
  }

  insertNewVariable(variable: string): void {
    this.newTemplateBody += variable;
  }

  openAddTemplateForm(): void {
    this.showAddTemplateForm = true;
    this.newTemplateName = '';
    this.newTemplateType = 'welcome_message';
    this.newTemplateBody = '';
  }

  cancelAddTemplate(): void {
    this.showAddTemplateForm = false;
  }

  saveNewTemplate(): void {
    if (!this.newTemplateName.trim() || !this.newTemplateBody.trim()) {
      this.snackBar.open('Template name and body are required.', 'Dismiss', { duration: 3000 });
      return;
    }
    if (this.isSubmittingTemplate) return;
    this.isSubmittingTemplate = true;

    const template = {
      name: this.newTemplateName.trim(),
      type: this.newTemplateType,
      body: this.newTemplateBody.trim(),
      variables: this.availableVariables
        .filter(v => this.newTemplateBody.includes(v.name))
        .map(v => v.name),
      isActive: true
    };

    this.whatsappState.addTemplate(template).subscribe({
      next: () => {
        this.isSubmittingTemplate = false;
        this.showAddTemplateForm = false;
        this.snackBar.open(`Template "${template.name}" created!`, 'Dismiss', {
          duration: 3000,
          panelClass: ['premium-snack']
        });
      },
      error: () => {
        this.isSubmittingTemplate = false;
        this.snackBar.open('Failed to create template. Please try again.', 'Dismiss', { duration: 3000 });
      }
    });
  }

  deleteTemplate(template: WhatsAppTemplate): void {
    this.whatsappState.deleteTemplate(template.id).subscribe(() => {
      this.snackBar.open(`Template "${template.name}" deleted.`, 'Dismiss', { duration: 3000 });
    });
  }

  // --- Scheduled Reminders ---

  triggerReminderNow(reminder: WhatsAppReminder): void {
    this.whatsappState.sendScheduledNow(reminder).subscribe(() => {
      this.snackBar.open(`Scheduled reminder dispatched to ${reminder.recipientName}!`, 'Dismiss', {
        duration: 3000,
        panelClass: ['premium-snack']
      });
    });
  }

  cancelReminder(reminder: WhatsAppReminder): void {
    this.whatsappState.cancelReminder(reminder.id).subscribe(() => {
      this.snackBar.open(`Scheduled reminder for ${reminder.recipientName} has been cancelled.`, 'Dismiss', { duration: 3000 });
    });
  }

  previewLogMessage(reminder: WhatsAppReminder): void {
    this.dialog.open(WhatsAppPreviewModalComponent, {
      width: '800px',
      data: {
        name: reminder.recipientName,
        phone: reminder.recipientPhone,
        recipientType: reminder.recipientType,
        variables: {
          gymName: 'Apex Fit Downtown',
          // Seed values if applicable
          messageContent: reminder.messageContent
        }
      }
    });
  }

  getTemplateTypeLabel(type: string): string {
    return type ? type.replace(/_/g, ' ') : '';
  }
}
