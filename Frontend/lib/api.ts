// API utility functions for handling requests to the CRM backend.
//
// This file defines helper functions to build URLs based on configured
// environment variables, attach authentication headers, and provide a
// unified `apiRequest` wrapper around the native `fetch` API.  It
// automatically falls back to a same-origin request whenever a cross
// origin request returns a 404 or fails outright.  This helps avoid
// confusing HTTP errors in local development when the backend is
// reachable through a proxy (e.g. via `/api/…`).

function normalizeBase(base?: string | null): string | null {
  if (!base) return null;
  const trimmed = base.trim();
  if (!trimmed) return null;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

// Resolve the API base. If an environment variable is provided, use it;
// otherwise, default to http://localhost:8000. This ensures all API
// requests go to Django in development and avoids 404s from Next.js.
function resolveBase(preferred: string | null | undefined): string | null {
  if (preferred) return preferred;
  // When running on the server (SSR), fall back to 127.0.0.1
  if (typeof window === 'undefined') {
    return 'http://127.0.0.1:8000';
  }
  // Always default to 127.0.0.1:8000 for client-side if no base specified
  return 'http://127.0.0.1:8000';
}

function joinBaseAndPath(base: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  try {
    return new URL(normalizedPath, normalizedBase).toString();
  } catch {
    return `${normalizedBase.replace(/\/+$/, '')}${normalizedPath}`;
  }
}

function buildUrl(path: string): { primary: string; fallback: string; crossOrigin: boolean } {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const isMonitoring = /^\/monitoring\//.test(path);
  const CRM_BASE_ENV = normalizeBase((process as any).env?.NEXT_PUBLIC_API_BASE || null);
  const MON_BASE_ENV = normalizeBase((process as any).env?.NEXT_PUBLIC_MONITORING_API_BASE || CRM_BASE_ENV || null);
  const base = resolveBase(isMonitoring ? MON_BASE_ENV : CRM_BASE_ENV);
  if (!base) {
    return { primary: normalizedPath, fallback: normalizedPath, crossOrigin: false };
  }
  const requestPath = isMonitoring ? normalizedPath.replace(/^\/monitoring\//, '/') : normalizedPath;
  const primary = joinBaseAndPath(base, requestPath);
  let crossOrigin = false;
  if (typeof window !== 'undefined') {
    try {
      crossOrigin = new URL(primary, window.location.href).origin !== window.location.origin;
    } catch {
      crossOrigin = false;
    }
  }
  return { primary, fallback: normalizedPath, crossOrigin };
}

function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage?.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Improved error handler: extracts `detail`, `message` or `error`, and falls back to plain text.
async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.localStorage?.removeItem('admin_token');
      window.localStorage?.removeItem('admin_role');
      window.localStorage?.removeItem('admin_username');
      window.location.href = '/admin/login';
    }
    throw new Error('Unauthorized');
  }
  const ct = res.headers.get('content-type') || '';
  const json = ct.includes('application/json');
  let data: any;
  try {
    data = json ? await res.json() : await res.text();
  } catch {
    data = null;
  }
  if (!res.ok) {
    let message: string | undefined;
    if (data && typeof data === 'object') {
      message = (data.detail as string) || (data.message as string) || (data.error as string);
      // Surface DRF field errors like { field: ["error"] }
      if (!message) {
        try {
          const entries = Object.entries(data as Record<string, any>);
          const parts: string[] = [];
          for (const [key, val] of entries) {
            if (typeof val === 'string' && val) {
              parts.push(`${key}: ${val}`);
            } else if (Array.isArray(val) && val.length) {
              const first = typeof val[0] === 'string' ? val[0] : JSON.stringify(val[0]);
              parts.push(`${key}: ${first}`);
            }
            if (parts.length >= 2) break; // keep concise
          }
          if (parts.length) {
            message = parts.join('; ');
          }
        } catch {}
      }
    }
    if (!message && typeof data === 'string') {
      message = data;
    }
    if (!message) {
      message = `HTTP ${res.status}`;
    }
    throw new Error(message);
  }
  return data as T;
}

/**
 * Strip trailing slashes from a path if needed.
 *
 * WARNING: This helper isn’t used by default; Django REST endpoints
 * require the slash. Only use it on APIs that do not require trailing slashes.
 */
function stripTrailingSlash(path: string): string {
  if (!path) return path;
  return path.replace(/\/+$/, '');
}

/**
 * Core fetch wrapper. If a request to `path` returns 404 and the path lacks
 * a trailing slash, automatically retry with an appended slash (once).
 */
async function apiRequest<T = any>(
  path: string,
  init: RequestInit = {},
  allowTrailingSlashRetry = true
): Promise<T> {
  const { primary, fallback, crossOrigin } = buildUrl(path);
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    ...authHeader(),
  };
  const fetchWithHeaders = async (targetUrl: string) =>
    fetch(targetUrl, { ...init, headers });

  let response: Response | null = null;
  try {
    response = await fetchWithHeaders(primary);
    // If the primary request is cross origin and returns a 404, retry the fallback
    // ONLY for idempotent requests (GET/HEAD). Avoid redirecting POST/PATCH/DELETE
    // to the Next.js app which would yield an HTML 404 page.
    const method = (init.method || 'GET').toString().toUpperCase();
    const isIdempotent = method === 'GET' || method === 'HEAD';
    const isApiPath = typeof path === 'string' && (/^\/?api\//.test(path) || path === '/api');
    if (
      response.status === 404 &&
      isIdempotent &&
      crossOrigin &&
      fallback &&
      fallback !== primary &&
      !isApiPath // never fall back API requests to Next.js
    ) {
      response = await fetchWithHeaders(fallback);
    }
  } catch (error) {
    // Network failure on the primary request: attempt fallback if appropriate.
    const isApiPath = typeof path === 'string' && (/^\/?api\//.test(path) || path === '/api');
    if (
      typeof window !== 'undefined' &&
      crossOrigin &&
      fallback &&
      fallback !== primary &&
      !isApiPath // never fall back API requests to Next.js
    ) {
      try {
        const method = (init.method || 'GET').toString().toUpperCase();
        const isIdempotent = method === 'GET' || method === 'HEAD';
        response = isIdempotent ? await fetchWithHeaders(fallback) : response;
      } catch (fallbackError) {
        const message =
          fallbackError instanceof TypeError
            ? 'Network request failed. Please check your connection and try again.'
            : fallbackError instanceof Error
            ? fallbackError.message
            : 'Network request failed.';
        throw new Error(message);
      }
    } else {
      const message =
        error instanceof TypeError
          ? 'Network request failed. Please check your connection and try again.'
          : error instanceof Error
          ? error.message
          : 'Network request failed.';
      throw new Error(message);
    }
  }

  if (!response) {
    throw new Error('Network request failed.');
  }

  // NEW: retry with a trailing slash if the original path did not end with one and the response was 404
  if (
    response.status === 404 &&
    allowTrailingSlashRetry &&
    typeof path === 'string' &&
    !path.endsWith('/')
  ) {
    return apiRequest(path + '/', init, false);
    // On the recursive call, allowTrailingSlashRetry is false to prevent loops.
  }

  return handle<T>(response);
}

// HTTP-method helpers
const get = <T = any>(path: string, init: RequestInit = {}) =>
  apiRequest<T>(path, { ...init, method: 'GET' });

const post = <T = any>(path: string, body?: any, init: RequestInit = {}) =>
  apiRequest<T>(path, {
    ...init,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(init.headers as any) },
    body: body != null ? JSON.stringify(body) : undefined,
  });

const patch = <T = any>(path: string, body?: any, init: RequestInit = {}) =>
  apiRequest<T>(path, {
    ...init,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(init.headers as any) },
    body: body != null ? JSON.stringify(body) : undefined,
  });

const del = <T = any>(path: string, init: RequestInit = {}) =>
  apiRequest<T>(path, { ...init, method: 'DELETE' });

const upload = <T = any>(path: string, form: FormData, init: RequestInit = {}) =>
  apiRequest<T>(path, { ...init, method: 'POST', body: form });

function resolveUploadUrl(p?: string): string {
  if (!p) return '';
  if (p.startsWith('/uploads/')) {
    const CRM_BASE_ENV = normalizeBase((process as any).env?.NEXT_PUBLIC_API_BASE || null);
    const MON_BASE_ENV = normalizeBase((process as any).env?.NEXT_PUBLIC_MONITORING_API_BASE || CRM_BASE_ENV || null);
    const base = resolveBase(MON_BASE_ENV);
    return base ? `${base}${p}` : p;
  }
  return p;
}

export const api = {
  get,
  post,
  patch,
  delete: del,
  upload,
  resolveUploadUrl,
};
