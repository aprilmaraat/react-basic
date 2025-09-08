export interface User {
  id: number | string;
  name: string;
  email?: string;
  username?: string;
  createdAt?: string;
  // Allow additional dynamic fields without losing type safety for known keys
  [key: string]: unknown;
}

export interface ApiError extends Error {
  status?: number;
  payload?: unknown;
}

export interface ApiResult<T> {
  data?: T;
  error?: ApiError;
}
