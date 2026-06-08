import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';

import { WhatsAppState } from '../../presentation/state/whatsapp.state';
import { WhatsAppTemplate } from '../../core/models/whatsapp-template.entity';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface WhatsAppPreviewData {
  name: string;
  phone: string;
  recipientType: 'member' | 'lead' | 'payment' | 'renewal';
  variables: {
    planName?: string;
    dueDate?: string;
    amount?: number | string;
    trialDate?: string;
    gymName?: string;
    [key: string]: any;
  };
}

@Component({
  selector: 'app-whatsapp-preview-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './whatsapp-preview-modal.component.html',
  styleUrls: ['./whatsapp-preview-modal.component.scss']
})
export class WhatsAppPreviewModalComponent implements OnInit {
  templates$: Observable<WhatsAppTemplate[]> | undefined;
  templates: WhatsAppTemplate[] = [];
  selectedTemplate: WhatsAppTemplate | null = null;
  
  messageContent = '';
  isEditing = false;
  
  // Scheduling state
  isScheduling = false;
  scheduleDate: Date = new Date();
  scheduleTime = '10:00';
  
  currentTime = '';

  constructor(
    public dialogRef: MatDialogRef<WhatsAppPreviewModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: WhatsAppPreviewData,
    private whatsappState: WhatsAppState,
    private snackBar: MatSnackBar
  ) {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    this.currentTime = `${hours}:${minutes} ${ampm}`;
  }

  ngOnInit(): void {
    // 1. Fetch and filter templates matching recipient type
    this.templates$ = this.whatsappState.templates$.pipe(
      map(list => {
        this.templates = list.filter(t => t.isActive);
        this.preselectTemplate();
        return this.templates;
      })
    );
    this.whatsappState.loadTemplates();
  }

  preselectTemplate(): void {
    if (this.templates.length === 0) return;
    
    // Choose appropriate default template type
    let defaultType = 'welcome_message';
    if (this.data.recipientType === 'lead') defaultType = 'trial_follow_up';
    if (this.data.recipientType === 'payment') defaultType = 'payment_reminder';
    if (this.data.recipientType === 'renewal') defaultType = 'renewal_reminder';

    const found = this.templates.find(t => t.type === defaultType);
    this.selectedTemplate = found || this.templates[0];
    this.onTemplateChange();
  }

  onTemplateChange(): void {
    if (!this.selectedTemplate) {
      this.messageContent = '';
      return;
    }
    this.messageContent = this.interpolateTemplate(this.selectedTemplate.body);
  }

  interpolateTemplate(body: string): string {
    let content = body;
    const values = {
      name: this.data.name || 'Client',
      phone: this.data.phone || '',
      gymName: this.data.variables?.gymName || 'Apex Fit Downtown',
      planName: this.data.variables?.planName || 'Active Plan',
      dueDate: this.data.variables?.dueDate || 'upcoming date',
      amount: this.data.variables?.amount || '0',
      trialDate: this.data.variables?.trialDate || 'tomorrow',
      ...this.data.variables
    };

    Object.keys(values).forEach(key => {
      const val = (values as any)[key];
      content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), val);
    });

    return content;
  }

  toggleEditMode(): void {
    this.isEditing = !this.isEditing;
  }

  toggleScheduling(): void {
    this.isScheduling = !this.isScheduling;
  }

  onSendNow(): void {
    if (!this.messageContent.trim()) {
      this.snackBar.open('Message body cannot be empty.', 'Dismiss', { duration: 3000 });
      return;
    }

    const reminderPayload = {
      recipientName: this.data.name,
      recipientPhone: this.data.phone,
      recipientType: this.data.recipientType,
      templateId: this.selectedTemplate?.id || 'custom',
      templateName: this.selectedTemplate?.name || 'Custom Message',
      messageContent: this.messageContent
    };

    this.whatsappState.sendReminder(reminderPayload).subscribe(() => {
      this.snackBar.open(`Message successfully sent to ${this.data.name}!`, 'Dismiss', {
        duration: 3000,
        panelClass: ['premium-snack']
      });
      this.dialogRef.close(true);
    });
  }

  onScheduleSubmit(): void {
    if (!this.messageContent.trim()) {
      this.snackBar.open('Message body cannot be empty.', 'Dismiss', { duration: 3000 });
      return;
    }

    // Combine date and time
    const [hours, minutes] = this.scheduleTime.split(':');
    const scheduledDate = new Date(this.scheduleDate);
    scheduledDate.setHours(parseInt(hours, 10));
    scheduledDate.setMinutes(parseInt(minutes, 10));
    scheduledDate.setSeconds(0);

    const reminderPayload = {
      recipientName: this.data.name,
      recipientPhone: this.data.phone,
      recipientType: this.data.recipientType,
      templateId: this.selectedTemplate?.id || 'custom',
      templateName: this.selectedTemplate?.name || 'Custom Message',
      messageContent: this.messageContent
    };

    this.whatsappState.scheduleReminder(reminderPayload, scheduledDate.toISOString()).subscribe(() => {
      const formattedDate = scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const formattedTime = scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      this.snackBar.open(`Reminder scheduled for ${this.data.name} on ${formattedDate} at ${formattedTime}!`, 'Dismiss', {
        duration: 3000,
        panelClass: ['premium-snack']
      });
      this.dialogRef.close(true);
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
