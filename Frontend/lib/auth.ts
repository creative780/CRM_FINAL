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

// Add function to fetch device ID from agent
async function fetchDeviceIdFromAgent(): Promise<string | null> {
  const agentUrls = [
    'http://127.0.0.1:47114/device-id',  // Agent API server
    'http://localhost:47114/device-id',
    'http://127.0.0.1:47113/device-id',  // HostAgent fallback
    'http://localhost:47113/device-id'
  ];
  
  for (const url of agentUrls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000);
      
      const response = await fetch(url, { 
        signal: controller.signal,
        method: 'GET'
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const data = await response.json();
        if (data.device_id && data.status === 'active') {
          console.log('Got device ID from agent:', data.device_id);
          return data.device_id;
        }
      }
    } catch (error) {
      // Continue to next URL
      console.debug('Agent not reachable at', url);
    }
  }
  
  return null;
}

export async function login(username: string, password: string, role: Role) {
  const base = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';
  
  // Try to get device ID from agent first, then fallback to localStorage/cookies
  let deviceId = null;
  if (typeof window !== 'undefined') {
    // First try to get from running agent
    deviceId = await fetchDeviceIdFromAgent();
    
    // Fallback to localStorage
    if (!deviceId) {
      deviceId = localStorage.getItem('device_id');
    }
    
    // Fallback to cookies
    if (!deviceId) {
      const cookies = document.cookie.split(';');
      const deviceCookie = cookies.find(cookie => cookie.trim().startsWith('device_id='));
      if (deviceCookie) {
        deviceId = deviceCookie.split('=')[1];
      }
    }
    
    // Store device ID in localStorage for future use
    if (deviceId) {
      localStorage.setItem('device_id', deviceId);
    }
  }
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (deviceId) {
    headers['X-Device-ID'] = deviceId;
  }
  
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST', 
    headers, 
    body: JSON.stringify({ username, password, role })
  });
  
  if (res.status === 412) {
    // Device agent required
    const data = await res.json();
    throw new Error(`DEVICE_REQUIRED:${data.enrollment_token}`);
  }
  
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

