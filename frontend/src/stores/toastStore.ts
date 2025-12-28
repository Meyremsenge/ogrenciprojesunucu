/**
 * Toast Store
 * Global notification/toast yönetimi
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

interface ToastState {
  toasts: Toast[];
  
  // Actions
  addToast: (toast: Omit<Toast, 'id'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  
  // Convenience methods
  success: (title: string, message?: string) => string;
  error: (title: string, message?: string) => string;
  warning: (title: string, message?: string) => string;
  info: (title: string, message?: string) => string;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const DEFAULT_DURATION = 5000;

export const useToastStore = create<ToastState>()(
  immer((set) => ({
    toasts: [],

    addToast: (toast) => {
      const id = generateId();
      const newToast: Toast = {
        id,
        dismissible: true,
        duration: DEFAULT_DURATION,
        ...toast,
      };

      set((state) => {
        // Maximum 5 toast
        if (state.toasts.length >= 5) {
          state.toasts.shift();
        }
        state.toasts.push(newToast);
      });

      // Auto-dismiss
      if (newToast.duration && newToast.duration > 0) {
        setTimeout(() => {
          set((state) => {
            state.toasts = state.toasts.filter((t) => t.id !== id);
          });
        }, newToast.duration);
      }

      return id;
    },

    removeToast: (id) =>
      set((state) => {
        state.toasts = state.toasts.filter((t) => t.id !== id);
      }),

    clearToasts: () =>
      set((state) => {
        state.toasts = [];
      }),

    success: (title, message) => {
      const id = generateId();
      set((state) => {
        if (state.toasts.length >= 5) state.toasts.shift();
        state.toasts.push({
          id,
          type: 'success',
          title,
          message,
          dismissible: true,
          duration: DEFAULT_DURATION,
        });
      });
      setTimeout(() => {
        set((state) => {
          state.toasts = state.toasts.filter((t) => t.id !== id);
        });
      }, DEFAULT_DURATION);
      return id;
    },

    error: (title, message) => {
      const id = generateId();
      set((state) => {
        if (state.toasts.length >= 5) state.toasts.shift();
        state.toasts.push({
          id,
          type: 'error',
          title,
          message,
          dismissible: true,
          duration: 8000, // Errors stay longer
        });
      });
      setTimeout(() => {
        set((state) => {
          state.toasts = state.toasts.filter((t) => t.id !== id);
        });
      }, 8000);
      return id;
    },

    warning: (title, message) => {
      const id = generateId();
      set((state) => {
        if (state.toasts.length >= 5) state.toasts.shift();
        state.toasts.push({
          id,
          type: 'warning',
          title,
          message,
          dismissible: true,
          duration: 6000,
        });
      });
      setTimeout(() => {
        set((state) => {
          state.toasts = state.toasts.filter((t) => t.id !== id);
        });
      }, 6000);
      return id;
    },

    info: (title, message) => {
      const id = generateId();
      set((state) => {
        if (state.toasts.length >= 5) state.toasts.shift();
        state.toasts.push({
          id,
          type: 'info',
          title,
          message,
          dismissible: true,
          duration: DEFAULT_DURATION,
        });
      });
      setTimeout(() => {
        set((state) => {
          state.toasts = state.toasts.filter((t) => t.id !== id);
        });
      }, DEFAULT_DURATION);
      return id;
    },
  }))
);

// Hook shortcut
export const useToast = () => {
  const { success, error, warning, info, addToast, removeToast, clearToasts } = useToastStore();
  return { success, error, warning, info, addToast, removeToast, clearToasts };
};
