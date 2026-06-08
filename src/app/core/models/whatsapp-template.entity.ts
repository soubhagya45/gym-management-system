export type WhatsAppTemplateType =
  | 'renewal_reminder'
  | 'payment_reminder'
  | 'trial_follow_up'
  | 'welcome_message'
  | 'attendance_reminder';

export interface WhatsAppTemplate {
  id: string;
  gymId: string; // Multi-tenant foreign key
  name: string;
  type: WhatsAppTemplateType;
  body: string;
  variables: string[]; // e.g. ['name', 'planName', 'dueDate', 'amount', 'gymName', 'trialDate']
  isActive: boolean;
}
