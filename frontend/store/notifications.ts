import { create } from 'zustand';

export interface AlertNotification {
  id: string;
  message: string;
  severity: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
}

interface NotificationsState {
  queue: AlertNotification[];
  addNotification: (message: string, severity?: 'info' | 'success' | 'warning' | 'error') => void;
  dismissNotification: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
  queue: [],

  addNotification: (message: string, severity = 'info') => {
    const newAlert: AlertNotification = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      severity,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      queue: [newAlert, ...state.queue].slice(0, 50), // keep last 50 alerts
    }));
  },

  dismissNotification: (id: string) => {
    set((state) => ({
      queue: state.queue.filter((alert) => alert.id !== id),
    }));
  },

  clearAll: () => set({ queue: [] }),
}));
