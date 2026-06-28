import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';

vi.mock('../api/config', () => ({
  API_URL: '/api',
  setAuthToken: vi.fn(),
  getHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
  fetchAPI: vi.fn(),
}));

vi.mock('../api/auth', () => ({
  AuthAPI: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    getToken: vi.fn(() => null),
    getUser: vi.fn(() => null),
    isAuthenticated: vi.fn(() => false),
    isAdmin: vi.fn(() => false),
    updateMe: vi.fn(),
  },
}));

function TestConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="loading">{auth.loading ? 'loading' : 'loaded'}</span>
      <span data-testid="connected">{auth.apiConnected ? 'connected' : 'disconnected'}</span>
      <span data-testid="user">{auth.currentUser ? auth.currentUser.nombre : 'no-user'}</span>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('provides initial state', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    const { AuthAPI } = await import('../api/auth');
    AuthAPI.getToken.mockReturnValue(null);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('loaded');
    });
    expect(screen.getByTestId('user').textContent).toBe('no-user');
  });

  it('shows disconnected state when API fails', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('connected').textContent).toBe('disconnected');
    });
  });

  it('throws when useAuth is used outside provider', () => {
    expect(() => render(
      <TestConsumer />
    )).toThrow('useAuth must be used within AuthProvider');
  });
});
