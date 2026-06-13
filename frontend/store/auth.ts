import { create } from 'zustand';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  skills?: string[];
  availability_status?: string;
  tenant_id?: string;
}

export interface AuthTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  max_agents: number;
  max_campaigns: number;
}

interface AuthState {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  accessToken: string | null;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;

  initialize: () => void;
  loginTenantUser: (user: AuthUser, tenant: AuthTenant, accessToken: string, refreshToken: string) => void;
  loginSuperAdmin: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  accessToken: null,
  isSuperAdmin: false,
  isAuthenticated: false,
  isLoading: true,

  initialize: () => {
    if (typeof window === 'undefined') return;
    try {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('user');
      const tenantStr = localStorage.getItem('tenant');
      const isSuperAdmin = localStorage.getItem('isSuperAdmin') === 'true';

      if (token && userStr) {
        const user = JSON.parse(userStr);
        const tenant = tenantStr ? JSON.parse(tenantStr) : null;
        set({ user, tenant, accessToken: token, isSuperAdmin, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      localStorage.clear();
      set({ isLoading: false });
    }
  },

  loginTenantUser: (user, tenant, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tenant', JSON.stringify(tenant));
    localStorage.setItem('isSuperAdmin', 'false');
    set({ user, tenant, accessToken, isSuperAdmin: false, isAuthenticated: true, isLoading: false });
  },

  loginSuperAdmin: (user, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('isSuperAdmin', 'true');
    localStorage.removeItem('tenant');
    set({ user, tenant: null, accessToken, isSuperAdmin: true, isAuthenticated: true, isLoading: false });
  },

  logout: () => {
    localStorage.clear();
    set({ user: null, tenant: null, accessToken: null, isSuperAdmin: false, isAuthenticated: false });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  setLoading: (v) => set({ isLoading: v }),
}));
