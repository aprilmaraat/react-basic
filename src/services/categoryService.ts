import { httpJson } from './httpClient';
import { Category, CategoryCreatePayload, CategoryUpdatePayload } from '../types/Category';
import { ApiResult, ApiError } from '../types/Item';

export interface GetCategoriesParams { skip?: number; limit?: number; signal?: AbortSignal }

function buildQuery(params: GetCategoriesParams): string {
  const q = new URLSearchParams();
  if (params.skip != null) q.set('skip', String(params.skip));
  if (params.limit != null) q.set('limit', String(params.limit));
  const qs = q.toString();
  return '/categories' + (qs ? `?${qs}` : '');
}

function normalizeCategory(raw: any): Category {
  return { id: raw.id, name: raw.name, description: raw.description ?? null };
}

export async function getCategories(params: GetCategoriesParams = {}): Promise<ApiResult<Category[]>> {
  try {
    const path = buildQuery(params);
    const raw = await httpJson<any[]>(path, { method: 'GET', signal: params.signal });
    const data = Array.isArray(raw) ? raw.map(normalizeCategory) : [];
    return { data };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function createCategory(payload: CategoryCreatePayload): Promise<ApiResult<Category>> {
  try {
    const raw = await httpJson<any>('/categories', { method: 'POST', body: JSON.stringify(payload) });
    return { data: normalizeCategory(raw) };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function updateCategory(id: number, payload: CategoryUpdatePayload): Promise<ApiResult<Category>> {
  try {
    const raw = await httpJson<any>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    return { data: normalizeCategory(raw) };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}

export async function deleteCategory(id: number): Promise<ApiResult<true>> {
  try {
    await httpJson<any>(`/categories/${id}`, { method: 'DELETE' });
    return { data: true };
  } catch (e: any) { const error: ApiError = e; return { error }; }
}
