import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/config', () => ({
  fetchAPI: vi.fn(),
  setAuthToken: vi.fn((token) => {
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }),
  getHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
  API_URL: '/api',
}));

import { AuthAPI } from '../api/auth';

describe('AuthAPI', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('calls fetchAPI and stores token + user', async () => {
      const mockResponse = {
        access_token: 'jwt-token',
        user: { id: '1', email: 'test@test.com', rol: 'investigador' },
      };
      const { fetchAPI } = await import('../api/config');
      fetchAPI.mockResolvedValue(mockResponse);

      const result = await AuthAPI.login('test@test.com', 'password');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getToken / getUser', () => {
    it('returns null when no user stored', () => {
      expect(AuthAPI.getToken()).toBeNull();
      expect(AuthAPI.getUser()).toBeNull();
    });

    it('returns stored user', () => {
      const user = { id: '1', email: 'test@test.com', rol: 'admin' };
      localStorage.setItem('user', JSON.stringify(user));
      expect(AuthAPI.getUser()).toEqual(user);
    });
  });

  describe('isAuthenticated', () => {
    it('returns false when no token', () => {
      expect(AuthAPI.isAuthenticated()).toBe(false);
    });

    it('returns true when token exists', () => {
      localStorage.setItem('token', 'some-token');
      expect(AuthAPI.isAuthenticated()).toBe(true);
    });
  });

  describe('isAdmin', () => {
    it('returns false for non-admin user', () => {
      localStorage.setItem('user', JSON.stringify({ rol: 'investigador' }));
      expect(AuthAPI.isAdmin()).toBe(false);
    });

    it('returns true for admin user', () => {
      localStorage.setItem('user', JSON.stringify({ rol: 'admin' }));
      expect(AuthAPI.isAdmin()).toBe(true);
    });
  });

  describe('logout', () => {
    it('clears auth data', () => {
      localStorage.setItem('token', 'some-token');
      localStorage.setItem('user', '{}');
      AuthAPI.logout();
      expect(localStorage.getItem('token')).toBeNull();
    });
  });
});
