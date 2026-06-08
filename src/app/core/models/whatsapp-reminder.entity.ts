export interface WhatsAppReminder {
  id: string;
  gymId: string; // Multi-tenant foreign key
  recipientName: string;
  recipientPhone: string;
  recipientType: 'member' | 'lead' | 'payment' | 'renewal';
  templateId: string;
  templateName: string;
  messageContent: string;
  status: 'pending' | 'sent' | 'failed' | 'scheduled';
  scheduledTime?: string; // ISO datetime string if scheduled
  sentTime?: string; // ISO datetime string if sent
}
