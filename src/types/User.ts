export interface User {
  id: number;
  email: string;
  full_name?: string | null;
  is_active: boolean;
  transactions?: import('./Transaction').Transaction[]; // present in detailed UserRead
}

export interface ApiError extends Error {
  status?: number;
  payload?: unknown;
}

export interface ApiResult<T> {
  data?: T;
  error?: ApiError;
}
