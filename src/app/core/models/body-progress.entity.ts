export interface BodyProgressEntry {
  id: string;
  memberId: string;
  gymId: string; // Multi-tenant foreign key
  date: string;  // Date formatted as YYYY-MM-DD
  weight: number; // in kg
  bodyFat?: number; // percentage
  chest?: number; // cm
  waist?: number; // cm
  arms?: number; // cm
  thighs?: number; // cm
  shoulder?: number; // cm
  bmi: number;
  notes?: string;
  frontPhoto?: string; // image URL
  sidePhoto?: string;  // image URL
  backPhoto?: string;  // image URL
}
