import { SubscriptionPlan } from '../enums/subscription-plans.enum';

export interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  manager: string;
  phone: string;
}

export interface Gym {
  gymId: string;
  gymName: string;
  ownerName: string;
  email: string;
  phone: string;
  subscriptionPlan: SubscriptionPlan;
  status: 'active' | 'suspended';
  createdAt: string;
  address: string;
  gstNumber?: string;
  gymType?: string;
  openingTime?: string;
  closingTime?: string;

  // Business Settings Configuration
  logoUrl?: string;
  website?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  };
  branches?: Branch[];
  membershipSettings?: {
    monthlyPrice: number;
    quarterlyPrice: number;
    halfYearlyPrice: number;
    annualPrice: number;
    autoExpiryEnabled: boolean;
    autoExpiryGraceDays: number;
    renewalReminderDays: number;
  };
  paymentSettings?: {
    currency: string;
    enableCard: boolean;
    enableUPI: boolean;
    enableCash: boolean;
    bankName?: string;
    bankAccountNo?: string;
    bankIfsc?: string;
    bankHolderName?: string;
  };
  invoiceSettings?: {
    prefix: string;
    taxName: string;
    taxRate: number;
    footerNotes?: string;
  };
  notificationSettings?: {
    renewalRemindersEnabled: boolean;
    paymentRemindersEnabled: boolean;
    leadFollowUpsEnabled: boolean;
    attendanceRemindersEnabled: boolean;
  };
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    theme?: 'light' | 'dark' | 'system';
  };
  integrations?: {
    whatsapp?: { isEnabled: boolean; apiKey?: string; senderPhone?: string; };
    razorpay?: { isEnabled: boolean; merchantId?: string; keyId?: string; keySecret?: string; };
    stripe?: { isEnabled: boolean; publishableKey?: string; secretKey?: string; };
    firebase?: { isEnabled: boolean; apiKey?: string; authDomain?: string; projectId?: string; };
    restApi?: { isEnabled: boolean; baseUrl?: string; apiToken?: string; };
  };
}

