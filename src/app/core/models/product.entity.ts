export interface Product {
  id: string;
  gymId: string;
  branchId?: string;
  name: string;
  category: string;
  price: number;
  costPrice?: number;
  quantity: number;
  tax?: number;
  description?: string;
  sku?: string;
  isActive: boolean;
  
  // Tagging metadata for imports
  importId?: string;
  importedAt?: string;
  sourceSystem?: string;
  customFields?: Record<string, any>;
}
