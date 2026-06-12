import { create } from 'zustand';
import { User, Workspace } from '../types';

interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  initialize: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setCredentials: (user: User, workspace: Workspace, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  workspace: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  initialize: () => {
    if (typeof window === 'undefined') return;
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userStr = localStorage.getItem('user');
    const workspaceStr = localStorage.getItem('workspace');

    try {
      const user = userStr ? JSON.parse(userStr) : null;
      const workspace = workspaceStr ? JSON.parse(workspaceStr) : null;
      set({
        accessToken,
        refreshToken,
        user,
        workspace,
        isAuthenticated: !!accessToken,
      });
    } catch {
      // Clear corrupt storage
      localStorage.clear();
      set({
        accessToken: null,
        refreshToken: null,
        user: null,
        workspace: null,
        isAuthenticated: false,
      });
    }
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    set({ accessToken, refreshToken, isAuthenticated: true });
  },

  setCredentials: (user: User, workspace: Workspace, accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('workspace', JSON.stringify(workspace));
    set({
      user,
      workspace,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('workspace');
    set({
      user: null,
      workspace: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },
}));
