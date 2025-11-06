/**
 * Lightweight fetch wrapper with:
 *  - Base URL from environment variable (REACT_APP_API_BASE_URL)
 *  - JSON parsing & error normalization
 *  - Timeout via AbortController
 *  - Basic retry (idempotent GET only)
 */
import { ApiError } from '../types/User';

const DEFAULT_TIMEOUT_MS = 10000; // 10s
const MAX_RETRIES = 2;

const baseUrl = (process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000/').replace(/\/$/, '');

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retry?: number;
}

export async function httpJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, retry = MAX_RETRIES, ...init } = options;
  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...init.headers,
      },
      signal: controller.signal,
      ...init,
    });

    const text = await response.text();
    let json: any = undefined;
    if (text) {
      try { json = JSON.parse(text); } catch (e) { /* leave as text */ }
    }

    if (!response.ok) {
      const err: ApiError = Object.assign(new Error(`HTTP ${response.status} ${response.statusText}`), {
        status: response.status,
        payload: json ?? text,
      });
      // Retry on transient errors (network-ish or 5xx)
      if (retry > 0 && (response.status >= 500 || response.status === 429)) {
        await delay(backoffDelay(retry));
        return httpJson<T>(path, { ...options, retry: retry - 1 });
      }
      throw err;
    }

    return (json as T);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      const abortErr: ApiError = Object.assign(new Error('Request timed out'), { status: 0 });
      throw abortErr;
    }
    // Retry fetch failures (TypeError) for GET
    if (options.method === undefined || options.method === 'GET') {
      if (options.retry && options.retry > 0) {
        await delay(backoffDelay(options.retry));
        return httpJson<T>(path, { ...options, retry: (options.retry - 1) });
      }
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function delay(ms: number) { return new Promise(res => setTimeout(res, ms)); }
function backoffDelay(remainingRetries: number) {
  const attemptIndex = MAX_RETRIES - remainingRetries + 1; // 1-based
  return Math.min(2000, 100 * Math.pow(2, attemptIndex));
}

export { baseUrl };
