import { Observable } from 'rxjs';

export interface NotificationPayload {
  recipient: string; // Phone number or email address
  templateId?: string;
  variables?: Record<string, string | number>;
  bodyText?: string;
  subject?: string;
}

export interface WhatsAppProvider {
  sendWhatsApp(payload: NotificationPayload): Observable<boolean>;
}

export interface SMSProvider {
  sendSMS(payload: NotificationPayload): Observable<boolean>;
}

export interface EmailProvider {
  sendEmail(payload: NotificationPayload): Observable<boolean>;
}
