import { httpJson } from './httpClient';
import { Inventory, InventoryCreatePayload, InventoryUpdatePayload, ApiResult, ApiError } from '../types/Item';

export interface GetInventoryParams { skip?: number; limit?: number; signal?: AbortSignal }

function buildQuery(params: GetInventoryParams): string {
  const q = new URLSearchParams();
  if (params.skip != null) q.set('skip', String(params.skip));
  if (params.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return '/inventory' + (qs ? `?${qs}` : '');
}

function normalizeInventory(raw: any): Inventory {
  return {
    id: raw.id,
    name: raw.name,
    quantity: raw.quantity ?? 0,
    category_id: raw.category_id,
    weight_id: raw.weight_id,
    // Backend may or may not return enriched names; normalize to camelCase if present
    categoryName: raw.category_name ?? raw.categoryName,
    weightName: raw.weight_name ?? raw.weightName,
  } as Inventory;
}

export async function getInventory(params: GetInventoryParams = {}): Promise<ApiResult<Inventory[]>> {
  try {
    const path = buildQuery(params);
    const raw = await httpJson<any[]>(path, { method: 'GET', signal: params.signal });
    const data = Array.isArray(raw) ? raw.map(normalizeInventory) : [];
    return { data };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function getInventoryById(id: number): Promise<ApiResult<Inventory>> {
  try {
    const raw = await httpJson<any>(`/inventory/${id}`, { method: 'GET' });
    return { data: normalizeInventory(raw) };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function createInventory(payload: InventoryCreatePayload): Promise<ApiResult<Inventory>> {
  try {
    const raw = await httpJson<any>('/inventory', { method: 'POST', body: JSON.stringify(payload) });
    return { data: normalizeInventory(raw) };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function updateInventory(id: number, payload: InventoryUpdatePayload): Promise<ApiResult<Inventory>> {
  try {
    const raw = await httpJson<any>(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    return { data: normalizeInventory(raw) };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function deleteInventory(id: number): Promise<ApiResult<true>> {
  try {
    await httpJson<any>(`/inventory/${id}`, { method: 'DELETE' });
    return { data: true };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}
