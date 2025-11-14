// Transaction models mapped to OpenAPI schemas:
// TransactionRead, TransactionReadSimple, TransactionCreate, TransactionUpdate
// NOTE: Backend returns decimal amounts as strings; total_amount is calculated server-side.
// quantity now supports decimals (number or string)

export type TransactionType = 'expense' | 'earning' | 'capital';

export interface Transaction {
  id: number;
  title: string;
  description?: string | null;
  owner_id: number;
  transaction_type: TransactionType;
  amount_per_unit: string; // decimal as string (e.g., "10.50")
  quantity: number | string;        // decimal - accepts both number and string
  total_amount: string;    // decimal as string (amount_per_unit * quantity on server)
  date: string;            // ISO 8601 datetime string (e.g., "2024-01-15T14:30:00")
  inventory_id?: number | null;
  purchase_price?: string | null; // decimal as string (e.g., "10.50")
  // Client enrichment
  ownerFullName?: string;
  inventoryName?: string;
}

export interface TransactionCreatePayload {
  title: string;
  owner_id: number;
  description?: string | null;
  transaction_type?: TransactionType; // default expense
  amount_per_unit?: number | string; // accepts number or string, default "0.00"
  quantity?: number | string;        // decimal - accepts both number and string, default 1
  date: string;             // ISO 8601 datetime string (required)
  inventory_id?: number | null;
  purchase_price?: number | string | null; // accepts number or string
}

export interface TransactionUpdatePayload {
  title?: string | null;
  description?: string | null;
  transaction_type?: TransactionType | null;
  amount_per_unit?: number | string | null; // accepts number or string
  quantity?: number | string | null;  // decimal - accepts both number and string
  date?: string | null;      // ISO 8601 datetime string
  inventory_id?: number | null;
  purchase_price?: number | string | null; // accepts number or string
}

export type { ApiResult, ApiError } from './User';