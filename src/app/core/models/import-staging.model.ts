export interface StagingValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface StagingRelation {
  field: string;
  entityType: string;
  referencedName: string;
  resolvedId?: string;
  status: 'resolved' | 'unresolved' | 'conflict';
  possibleMatches?: { id: string; name: string }[];
}

export interface StagingRecord {
  id: string;
  gymId: string;
  importId: string;
  module: 'members' | 'leads' | 'employees' | 'trainers' | 'membership-plans' | 'pt-plans' | 'products' | 'invoices' | 'outstanding-dues' | 'expenses' | 'collections' | 'payments';
  rawRowData: Record<string, any>;
  mappedData: Record<string, any>;
  validationErrors: StagingValidationError[];
  duplicateStatus: 'new' | 'duplicate_skip' | 'duplicate_overwrite' | 'duplicate_merge';
  duplicateMatchId?: string;
  relations: StagingRelation[];
  status: 'pending' | 'valid' | 'invalid' | 'committed';
}
