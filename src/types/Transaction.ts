// Transaction models mapped to OpenAPI schemas:
// TransactionRead, TransactionReadSimple, TransactionCreate, TransactionUpdate
// NOTE: Backend returns decimal amounts as strings; total_amount is calculated server-side.

export type TransactionType = 'expense' | 'earning' | 'capital';

export interface Transaction {
  id: number;
  title: string;
  description?: string | null;
  owner_id: number;
  transaction_type: TransactionType;
  amount_per_unit: string; // decimal as string (e.g., "10.50")
  quantity: number;        // integer
  total_amount: string;    // decimal as string (amount_per_unit * quantity on server)
  date: string;            // YYYY-MM-DD
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
  quantity?: number;        // default 1
  date: string;             // required by spec
  inventory_id?: number | null;
  purchase_price?: number | string | null; // accepts number or string
}

export interface TransactionUpdatePayload {
  title?: string | null;
  description?: string | null;
  transaction_type?: TransactionType | null;
  amount_per_unit?: number | string | null; // accepts number or string
  quantity?: number | null;
  date?: string | null;
  inventory_id?: number | null;
  purchase_price?: number | string | null; // accepts number or string
}

export type { ApiResult, ApiError } from './User';