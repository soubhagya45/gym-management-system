export interface ImportHistory {
  id: string;
  gymId: string;
  branchId?: string;
  importedBy: string;
  importedByName?: string;
  date: string;
  fileName: string;
  module: 'members' | 'leads' | 'employees' | 'trainers' | 'membership-plans' | 'pt-plans' | 'products' | 'invoices' | 'outstanding-dues' | 'multi-file';
  recordsImported: number;
  recordsFailed: number;
  recordsDuplicates: number;
  duration: number; // in milliseconds
  fileHash?: string;
  createdIds?: { collection: string; id: string }[]; // flat list of created entity IDs for rollback
  snapshotUrl?: string; // Reference to the pre-import snapshot JSON file URL
  status: 'completed' | 'failed' | 'rolled_back';
  rolledBackBy?: string;
  rolledBackByName?: string;
  rolledBackAt?: string;
  errorMessage?: string;
}
