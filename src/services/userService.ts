import { httpJson } from './httpClient';
import { ApiResult, User, ApiError } from '../types/User';

// Simple in-memory cache (invalidate after TTL)
let cachedUsers: { data: User[]; expires: number } | null = null;
const USERS_TTL_MS = 60_000; // 1 minute

export interface GetUsersParams { skip?: number; limit?: number; forceRefresh?: boolean; signal?: AbortSignal }

export async function getUsers(params: GetUsersParams = {}): Promise<ApiResult<User[]>> {
  const { skip, limit, forceRefresh, signal } = params;
  if (!forceRefresh && cachedUsers && cachedUsers.expires > Date.now() && skip == null && limit == null) {
    return { data: cachedUsers.data };
  }
  try {
    const q = new URLSearchParams();
    if (skip != null) q.set('skip', String(skip));
    if (limit != null) q.set('limit', String(limit));
    const path = '/users' + (q.toString() ? `?${q.toString()}` : '');
    const raw = await httpJson<any[]>(path, { method: 'GET', signal });
    const data: User[] = raw.map(u => ({
      id: u.id,
      email: u.email,
      full_name: u.full_name ?? null,
      is_active: u.is_active,
      transactions: u.transactions, // may be undefined if simple read
    }));
    if (skip == null && limit == null) {
      cachedUsers = { data, expires: Date.now() + USERS_TTL_MS };
    }
    return { data };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export function clearUsersCache() { cachedUsers = null; }

// Return a user from cache if available; optionally trigger a refresh if cache stale
export async function getUserById(id: number): Promise<ApiResult<User>> {
  try {
    const raw = await httpJson<any>(`/users/${id}`, { method: 'GET' });
    const user: User = {
      id: raw.id,
      email: raw.email,
      full_name: raw.full_name ?? null,
      is_active: raw.is_active,
      transactions: raw.transactions,
    };
    return { data: user };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

// Create a new user. Payload shape can be adjusted to backend contract.
export async function createUser(payload: { email: string; full_name?: string | null; is_active?: boolean }): Promise<ApiResult<User>> {
  try {
    const raw = await httpJson<any>('/users', { method: 'POST', body: JSON.stringify(payload) });
    clearUsersCache();
    return { data: { id: raw.id, email: raw.email, full_name: raw.full_name ?? null, is_active: raw.is_active, transactions: raw.transactions } };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function updateUser(id: number, payload: Partial<{ email: string; full_name: string | null; is_active: boolean }>): Promise<ApiResult<User>> {
  try {
    const raw = await httpJson<any>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    clearUsersCache();
    return { data: { id: raw.id, email: raw.email, full_name: raw.full_name ?? null, is_active: raw.is_active, transactions: raw.transactions } };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function deleteUser(id: number): Promise<ApiResult<User>> {
  try {
    const raw = await httpJson<any>(`/users/${id}`, { method: 'DELETE' });
    clearUsersCache();
    const user: User = { id: raw.id, email: raw.email, full_name: raw.full_name ?? null, is_active: raw.is_active };
    return { data: user };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}
