export interface Lead {
  id: string;
  gymId: string; // Multi-tenant foreign key
  name: string;
  phone: string;
  email: string;
  leadSource: 'Walk-in' | 'Instagram' | 'Facebook' | 'Referral' | 'Website';
  trialDate: string;
  followUpDate: string;
  interestedPlan: string;
  notes?: string;
  assignedStaff?: string;
  status: 'New' | 'Contacted' | 'Trial Scheduled' | 'Follow Up' | 'Converted' | 'Lost';
}
