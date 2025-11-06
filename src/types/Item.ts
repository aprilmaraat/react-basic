// Inventory models aligned with OpenAPI InventoryRead / InventoryReadSimple / InventoryCreate / InventoryUpdate
// Fields: id, name, quantity, category_id, weight_id

export interface Inventory {
  id: number;
  name: string;
  quantity: number;
  category_id: number;
  weight_id: number;
  // Enriched fields for UI mapping (resolved client-side from lookups)
  categoryName?: string;
  weightName?: string;
}

export interface InventorySimple {
  id: number;
  name: string;
  quantity: number;
}

export interface InventoryCreatePayload {
  name: string;
  quantity: number;
  category_id: number;
  weight_id: number;
}

export interface InventoryUpdatePayload {
  name?: string | null;
  quantity?: number | null;
  category_id?: number | null;
  weight_id?: number | null;
}

export type { ApiResult, ApiError } from './User';
