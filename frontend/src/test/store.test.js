import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../store/useAppStore';

describe('useAppStore (Zustand)', () => {
  beforeEach(() => {
    useAppStore.setState({
      user: null,
      token: null,
      sidebarOpen: true,
      notifications: [],
    });
  });

  it('has initial state', () => {
    const state = useAppStore.getState();
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.sidebarOpen).toBe(true);
    expect(state.notifications).toEqual([]);
  });

  describe('setUser', () => {
    it('sets user', () => {
      const user = { id: '1', nombre: 'Test' };
      useAppStore.getState().setUser(user);
      expect(useAppStore.getState().user).toEqual(user);
    });
  });

  describe('setToken', () => {
    it('sets token', () => {
      useAppStore.getState().setToken('jwt-token');
      expect(useAppStore.getState().token).toBe('jwt-token');
    });
  });

  describe('logout', () => {
    it('clears user and token', () => {
      useAppStore.setState({ user: { id: '1' }, token: 'jwt' });
      useAppStore.getState().logout();
      expect(useAppStore.getState().user).toBeNull();
      expect(useAppStore.getState().token).toBeNull();
    });
  });

  describe('toggleSidebar', () => {
    it('toggles sidebar state', () => {
      expect(useAppStore.getState().sidebarOpen).toBe(true);
      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().sidebarOpen).toBe(false);
      useAppStore.getState().toggleSidebar();
      expect(useAppStore.getState().sidebarOpen).toBe(true);
    });
  });

  describe('notifications', () => {
    it('adds a notification', () => {
      useAppStore.getState().addNotification('Test message', 'info');
      const notifications = useAppStore.getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toBe('Test message');
      expect(notifications[0].type).toBe('info');
    });

    it('removes a notification by id', async () => {
      useAppStore.getState().addNotification('First', 'info');
      await new Promise(r => setTimeout(r, 5));
      useAppStore.getState().addNotification('Second', 'error');
      const firstId = useAppStore.getState().notifications[0].id;
      useAppStore.getState().removeNotification(firstId);
      expect(useAppStore.getState().notifications).toHaveLength(1);
      expect(useAppStore.getState().notifications[0].message).toBe('Second');
    });
  });
});
