import { httpJson } from './httpClient';
import { Weight, WeightCreatePayload, WeightUpdatePayload } from '../types/Weight';
import { ApiResult, ApiError } from '../types/Item';

export interface GetWeightsParams { skip?: number; limit?: number; signal?: AbortSignal }

function buildQuery(params: GetWeightsParams): string {
  const q = new URLSearchParams();
  if (params.skip != null) q.set('skip', String(params.skip));
  if (params.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return '/weights' + (qs ? `?${qs}` : '');
}

function normalizeWeight(raw: any): Weight {
  return { id: raw.id, name: raw.name, description: raw.description ?? null };
}

export async function getWeights(params: GetWeightsParams = {}): Promise<ApiResult<Weight[]>> {
  try {
    const path = buildQuery(params);
    const raw = await httpJson<any[]>(path, { method: 'GET', signal: params.signal });
    const data = Array.isArray(raw) ? raw.map(normalizeWeight) : [];
    return { data };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function createWeight(payload: WeightCreatePayload): Promise<ApiResult<Weight>> {
  try {
    const raw = await httpJson<any>('/weights', { method: 'POST', body: JSON.stringify(payload) });
    return { data: normalizeWeight(raw) };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function updateWeight(id: number, payload: WeightUpdatePayload): Promise<ApiResult<Weight>> {
  try {
    const raw = await httpJson<any>(`/weights/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    return { data: normalizeWeight(raw) };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function deleteWeight(id: number): Promise<ApiResult<true>> {
  try {
    await httpJson<any>(`/weights/${id}`, { method: 'DELETE' });
    return { data: true };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}
