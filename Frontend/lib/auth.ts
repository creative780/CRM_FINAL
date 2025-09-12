import { Role } from "@/types/api";

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

export function getRole(): Role {
  if (typeof window === 'undefined') return 'sales';
  const r = (localStorage.getItem('admin_role') || 'sales') as Role;
  const allowed: Role[] = ['admin', 'sales', 'designer', 'production', 'delivery', 'finance'];
  return allowed.includes(r) ? r : 'sales';
}

export async function login(username: string, password: string, role: Role) {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, role })
  });
  if (!res.ok) throw new Error((await res.json().catch(()=>({})))?.detail || 'Login failed');
  const data = await res.json();
  if (typeof window !== 'undefined') {
    localStorage.setItem('admin_token', data.token);
    localStorage.setItem('admin_username', data.username || username);
    localStorage.setItem('admin_role', data.role || role);
  }
  return data;
}

// Simple client-side guard helper (for use in useEffect of protected pages)
export function requireAuthClient(): boolean {
  if (typeof window === 'undefined') return false;
  const tok = getToken();
  if (!tok) { window.location.href = '/admin/login'; return false; }
  return true;
}

