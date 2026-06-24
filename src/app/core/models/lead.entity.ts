export interface Lead {
  id: string;
  gymId: string; // Multi-tenant foreign key
  branchId?: string;
  name: string;
  phone: string;
  email: string;
  leadSource: 'Walk-In' | 'Website' | 'Instagram' | 'Facebook' | 'Google Ads' | 'WhatsApp' | 'Referral' | 'Existing Member Referral' | 'Trainer Referral' | 'Other';
  trialDate: string;
  followUpDate: string;
  interestedPlan: string;
  notes?: string;
  assignedStaff?: string; // Kept for compatibility
  status: 'New' | 'Contacted' | 'Follow Up' | 'Trial Scheduled' | 'Trial Attended' | 'Trial Completed' | 'Negotiation' | 'Converted' | 'Lost';

  // CRM Detail Fields
  leadTemperature?: 'Hot' | 'Warm' | 'Cold'; // Categorized temperature of lead quality
  fitnessGoal?: string | string[];           // Selected goals
  preferredPlan?: string;    // syncs or defaults to interestedPlan
  referralSource?: string;   // detailed description of referrer if source is Referral/Referrals
  leadOwner?: string;        // employee name/ID owning the lead

  // Lead Assignment & Follow-ups
  assignedEmployee?: string; // ID/Name of assigned employee
  assignedEmployeeName?: string; // Name of assigned employee
  assignedDate?: string;     // ISO Date when lead was assigned
  lastFollowUp?: string;     // ISO Date of last activity
  nextFollowUp?: string;     // ISO Date of next scheduled contact (syncs with followUpDate)
  followUpStatus?: 'Pending' | 'Completed'; // Custom follow-up status indicators
  followUpNotes?: string;    // Custom notes on follow-up progress

  // Trial & Lost Details
  trialStatus?: 'Not Scheduled' | 'Scheduled' | 'Attended' | 'No Show' | 'Converted After Trial';
  reasonLost?: string;       // Populated when stage is Lost

  // Conversion & Commission Details
  convertedBy?: string;      // Employee ID/Name who closed the lead
  revenueGenerated?: number; // Final plan revenue in ₹
  commissionPercent?: number;// Commission percentage on revenue (e.g. 10)
  commissionEarned?: number; // Calculated commission amount in ₹
  createdAt?: string;        // ISO Date when lead was created

  // PT Preferences
  interestedInPT?: 'Yes' | 'No';
  ptPlanId?: string;
  preferredTrainerId?: string;
  ptGoal?: string;
  gender?: string;
  age?: number;
  height?: number;
  weight?: number;
  followUpHistory?: FollowUpHistoryItem[];
  customFields?: Record<string, any>;
}

export interface FollowUpHistoryItem {
  id: string;
  date: string;               // YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  notes: string;
  nextFollowUpDate?: string;  // YYYY-MM-DD
}

// ── Atomic Lead Conversion Types ─────────────────────────────────────────────

/**
 * All data required to perform an atomic Lead → Member conversion.
 * Passed to the repository layer where a single WriteBatch is built and committed.
 */
export interface LeadConversionPayload {
  lead?: Lead;
  memberData: {
    name: string;
    email: string;
    phone: string;
    planId: string;
    planName: string;
    status: string;
    joinDate?: string;
    expiryDate?: string;
    gender?: string;
    age?: number;
    height?: number;
    weight?: number;
    address?: string;
    branchId?: string;
    [key: string]: any;
  };
  membershipPlanPrice: number;   // Pre-fetched before batch to avoid reads inside batch
  conversionDetails: {
    convertedBy: string;
    revenueGenerated: number;
    paymentStatus: 'paid' | 'partially_paid' | 'pending' | 'overdue';
    paymentMethod: string;
    paidAmount: number;
    interestedInPT: boolean;
    // PT fields (only used when interestedInPT = true)
    ptPlanId?: string;
    ptPlanName?: string;
    ptPlanPrice?: number;
    ptPlanDuration?: number;
    ptSessionsTotal?: number;
    preferredTrainerId?: string;
    trainerName?: string;
    ptGoal?: string;
    salespersonId?: string;
    salespersonName?: string;
    // Discount fields
    discountType?: 'flat' | 'percentage' | 'none';
    discountValue?: number;
    discountGivenBy?: string;
    discountDate?: string;
  };
  gymId: string;
  branchId: string;
  today: string;               // YYYY-MM-DD
}

/**
 * IDs of all documents created by the atomic conversion batch.
 * Used by the state layer to trigger targeted cache invalidations.
 */
export interface LeadConversionResult {
  memberId: string;
  membershipPaymentId: string;
  invoiceId: string;
  memberPTPlanId?: string;
  trainerAssignmentId?: string;
  ptPaymentId?: string;
}
