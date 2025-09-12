import { Role } from "@/types/api";

const CRM_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
const MON_BASE = process.env.NEXT_PUBLIC_MONITORING_API_BASE || CRM_BASE;

function buildUrl(path: string): string {
  if (path.startsWith("/monitoring/") || path.startsWith("monitoring/")) {
    const p = path.replace(/^\/?monitoring\//, "/");
    return `${MON_BASE}${p}`;
  }
  if (path.startsWith("/")) return `${CRM_BASE}${path}`;
  return `${CRM_BASE}/${path}`;
}

function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_role');
      localStorage.removeItem('admin_username');
      window.location.href = '/admin/login';
    }
    throw new Error('Unauthorized');
  }
  const ct = res.headers.get('content-type') || '';
  const json = ct.includes('application/json');
  const data = json ? await res.json() : (await res.text());
  if (!res.ok) {
    const message = (data && (data.detail || data.message)) || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data as T;
}

async function apiRequest<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const url = buildUrl(path);
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
    ...authHeader(),
  };
  return handle<T>(await fetch(url, { ...init, headers }));
}

const get = <T = any>(path: string, init: RequestInit = {}) => apiRequest<T>(path, { ...init, method: 'GET' });
const post = <T = any>(path: string, body?: any, init: RequestInit = {}) =>
  apiRequest<T>(path, { ...init, method: 'POST', headers: { 'Content-Type': 'application/json', ...(init.headers as any) }, body: body != null ? JSON.stringify(body) : undefined });
const patch = <T = any>(path: string, body?: any, init: RequestInit = {}) =>
  apiRequest<T>(path, { ...init, method: 'PATCH', headers: { 'Content-Type': 'application/json', ...(init.headers as any) }, body: body != null ? JSON.stringify(body) : undefined });
const del = <T = any>(path: string, init: RequestInit = {}) =>
  apiRequest<T>(path, { ...init, method: 'DELETE' });
const upload = <T = any>(path: string, form: FormData, init: RequestInit = {}) =>
  apiRequest<T>(path, { ...init, method: 'POST', body: form });

function resolveUploadUrl(p?: string): string {
  if (!p) return '';
  if (p.startsWith('/uploads/')) return `${MON_BASE}${p}`;
  return p;
}

// Object-style API for convenience
export const api = {
  get,
  post,
  patch,
  delete: del,
  upload,
  resolveUploadUrl,
};

