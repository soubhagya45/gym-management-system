export interface ImportProfile {
  id: string;
  gymId: string;
  name: string;
  module: 'members' | 'leads' | 'employees' | 'trainers' | 'membership-plans' | 'pt-plans' | 'products' | 'invoices' | 'outstanding-dues' | 'expenses' | 'collections' | 'payments';
  mappings: Record<string, string>; // Excel Column -> DB Field
  customFields?: { header: string; type: string }[];
  ignoredColumns?: string[];
  createdAt: string;
  updatedAt: string;
}
