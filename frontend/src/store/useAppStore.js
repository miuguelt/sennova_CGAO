import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAppStore = create(
  persist(
    (set) => ({
      // Autenticación Base (idealmente migrada desde AuthContext)
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      logout: () => set({ user: null, token: null }),

      // UI y Preferencias
      sidebarOpen: true,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      // Notificaciones Globales
      notifications: [],
      addNotification: (message, type = 'info') => set((state) => ({
        notifications: [...state.notifications, { id: Date.now(), message, type }]
      })),
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
    }),
    {
      name: 'sennova-cgao-storage',
      partialize: (state) => ({ user: state.user, token: state.token }), // Solo persistir sesión
    }
  )
);
