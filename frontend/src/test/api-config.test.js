import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchAPI, setAuthToken, getHeaders, API_URL } from '../api/config';

describe('API Config', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('setAuthToken', () => {
    it('stores token in localStorage', () => {
      setAuthToken('test-token');
      expect(localStorage.getItem('token')).toBe('test-token');
    });

    it('removes token from localStorage when null', () => {
      localStorage.setItem('token', 'old-token');
      localStorage.setItem('user', 'test-user');
      setAuthToken(null);
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('getHeaders', () => {
    it('returns Content-Type header without auth when no token', () => {
      const headers = getHeaders();
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toBeUndefined();
    });

    it('includes Authorization header when token exists', () => {
      localStorage.setItem('token', 'my-token');
      const headers = getHeaders();
      expect(headers['Authorization']).toBe('Bearer my-token');
    });
  });

  describe('fetchAPI', () => {
    it('performs a successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockData),
      });

      const result = await fetchAPI('/test');
      expect(result).toEqual(mockData);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('returns null for 204 response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      const result = await fetchAPI('/test');
      expect(result).toBeNull();
    });

    it('throws on 401 and clears token', async () => {
      localStorage.setItem('token', 'bad-token');
      global.fetch = vi.fn().mockResolvedValue({
        status: 401,
        ok: false,
        json: () => Promise.resolve({ detail: 'Unauthorized' }),
      });

      await expect(fetchAPI('/test')).rejects.toThrow('Sesión expirada');
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('throws on network error with friendly message', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'));

      await expect(fetchAPI('/test')).rejects.toThrow(
        'No se puede conectar al servidor. Verifica que el backend esté corriendo.'
      );
    });
  });
});
