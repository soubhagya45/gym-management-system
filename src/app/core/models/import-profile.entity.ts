export interface ImportProfile {
  id: string;
  gymId: string;
  name: string;
  module: 'members' | 'leads' | 'employees' | 'trainers' | 'membership-plans' | 'pt-plans' | 'products' | 'invoices' | 'outstanding-dues';
  mappings: Record<string, string>; // Excel Column -> DB Field
  customFields?: { header: string; type: string }[];
  ignoredColumns?: string[];
  createdAt: string;
  updatedAt: string;
}
