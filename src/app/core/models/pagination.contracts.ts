export interface SortDefinition {
  column: string;
  direction: 'asc' | 'desc';
}

export interface FilterDefinition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'startsWith';
  value: any;
}

export interface PagedRequest {
  pageIndex: number;
  pageSize: number;
  searchTerm?: string;
  sort?: SortDefinition;
  filters?: FilterDefinition[];
}

export interface PagedResponse<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}
