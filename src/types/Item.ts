export interface Item {
  id: number | string;
  /**
   * Human readable label for the item (previously called `name`).
   * Backend now returns `title`; mapping layer will still hydrate from legacy `name` if present.
   */
  title: string;
  description?: string;
  amount: number;
  createdAt?: string;
  /** Owning user id (foreign key) */
  userId?: number | string;
  /** Denormalized owner display name coming directly from the items endpoint (preferred) */
  ownerName?: string;
  /** Logical classification for the item (e.g., expense, income, etc.) */
  type?: string;
  [key: string]: unknown;
}

// Re-export shared API result types from User definitions to keep things DRY
export type { ApiResult, ApiError } from './User';
