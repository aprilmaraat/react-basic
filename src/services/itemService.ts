import { httpJson } from './httpClient';
import { Item, ApiResult, ApiError } from '../types/Item';

export interface GetItemsParams {
  userId?: string | number | null;
  search?: string;
  signal?: AbortSignal;
}

// Build query string – assumes backend accepts `user_id` & `search` as query params.
// Adjust the param keys here if the FastAPI docs differ.
function buildQuery(params: GetItemsParams): string {
  const q = new URLSearchParams();
  if (params.userId !== undefined && params.userId !== null && `${params.userId}`.length > 0) {
    q.set('user_id', String(params.userId));
  }
  if (params.search) {
    q.set('search', params.search);
  }
  const qs = q.toString();
  return '/items' + (qs ? `?${qs}` : '');
}

// Normalize raw item objects coming from API to our Item interface.
function normalizeItem(raw: any): Item {
  if (!raw) {
    return raw as Item;
  }
  // Support legacy 'name' field -> 'title'
  const title = raw.title ?? raw.name ?? '';
  // Normalize createdAt from several possible backend keys
  const createdAt = raw.createdAt
    ?? raw.created_at
    ?? raw.created
    ?? raw.date
    ?? undefined;
  // Derive ownerName from multiple possible shapes:
  //  - raw.ownerName (preferred direct field)
  //  - raw.owner_name (snake case)
  //  - raw.user?.username / raw.user?.name (expanded relationship)
  //  - raw.userName (camel) or raw.user_name
  const ownerName = raw.ownerName
    ?? raw.owner_name
    ?? raw.userName
    ?? raw.user_name
    ?? raw.user?.username
    ?? raw.user?.name
    ?? undefined;

  // Attempt to derive a canonical `type` (expense/income/etc.) from multiple possible backend keys
  const type = raw.item_type || undefined;

  return {
    ...raw,
    title,
  createdAt,
    ownerName,
  type,
  } as Item;
}

export async function getItems(params: GetItemsParams = {}): Promise<ApiResult<Item[]>> {
  try {
    const path = buildQuery(params);
    const raw = await httpJson<any[]>(path, { method: 'GET', signal: params.signal });
    const data = Array.isArray(raw) ? raw.map(normalizeItem) : [];
    return { data };
  } catch (e: any) {
    const error: ApiError = e;
    return { error };
  }
}
