import { httpJson } from './httpClient';
import { ApiResult, User, ApiError } from '../types/User';

// Simple in-memory cache (invalidate after TTL)
let cachedUsers: { data: User[]; expires: number } | null = null;
const USERS_TTL_MS = 60_000; // 1 minute

export async function getUsers(forceRefresh = false): Promise<ApiResult<User[]>> {
  if (!forceRefresh && cachedUsers && cachedUsers.expires > Date.now()) {
    return { data: cachedUsers.data };
  }
  try {
    const data = await httpJson<User[]>('/users', { method: 'GET' });
    cachedUsers = { data, expires: Date.now() + USERS_TTL_MS };
    return { data };
  } catch (e: any) {
    const error: ApiError = e;
    return { error };
  }
}

export function clearUsersCache() { cachedUsers = null; }
