export interface DefaultPlanConfig {
  name: string;
  durationMonths: number;
  price: number;
  description: string;
  features: string[];
  enabled: boolean;
}

export interface OnboardingData {
  // Gym Details
  gymName: string;
  gymPhone: string;
  gymEmail: string;
  gymAddress: string;
  gymCity: string;
  gymState: string;
  gymCountry: string;
  
  // Email Verification
  verificationCode?: string;
  
  // Owner Credentials
  ownerFullName: string;
  ownerEmail: string;
  ownerPassword?: string;
  ownerPhone: string;
  
  // Default Branch Details
  branchName: string;
  branchPhone: string;
  branchAddress: string;
  
  // Baseline Membership Plans
  plans: DefaultPlanConfig[];
}
