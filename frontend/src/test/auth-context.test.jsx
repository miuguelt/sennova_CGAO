import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AuthAPI } from '../api/auth';

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
  const [result, setResult] = React.useState('');
  return (
    <div>
      <span data-testid="loading">{auth.loading ? 'loading' : 'loaded'}</span>
      <span data-testid="connected">{auth.apiConnected ? 'connected' : 'disconnected'}</span>
      <span data-testid="user">{auth.currentUser ? auth.currentUser.nombre : 'no-user'}</span>
      <span data-testid="api-error">{auth.apiError || ''}</span>
      <span data-testid="result">{result}</span>
      <button onClick={async () => setResult(JSON.stringify(await auth.login('persona@sena.edu.co', 'clave')))}>Iniciar sesión</button>
      <button onClick={async () => setResult(JSON.stringify(await auth.register({ nombre: 'Aprendiz' })))}>Registrar</button>
      <button onClick={() => auth.logout()}>Cerrar sesión</button>
      <button onClick={async () => setResult(JSON.stringify(await auth.updateUser({ nombre: 'Actualizada' })))}>Actualizar perfil</button>
      <button onClick={async () => { await auth.retryConnection(); setResult('conexión revisada'); }}>Reintentar conexión</button>
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

  it('ejecuta inicio, registro, cierre, actualización de perfil y reintento de conexión', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    AuthAPI.getToken.mockReturnValue(null);
    AuthAPI.login.mockResolvedValue({ user: { id: 'u1', nombre: 'Aprendiz', rol: 'aprendiz' } });
    AuthAPI.register.mockResolvedValue({ id: 'u2', nombre: 'Nueva persona' });
    AuthAPI.updateMe.mockResolvedValue({ id: 'u1', nombre: 'Actualizada', rol: 'aprendiz' });
    const { unmount } = render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('loaded'));
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Aprendiz'));
    expect(screen.getByTestId('result')).toHaveTextContent('{"success":true}');
    expect(AuthAPI.login).toHaveBeenCalledWith('persona@sena.edu.co', 'clave');

    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('Nueva persona'));
    expect(AuthAPI.register).toHaveBeenCalledWith({ nombre: 'Aprendiz' });

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar perfil' }));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Actualizada'));
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 'u1', nombre: 'Actualizada', rol: 'aprendiz' });

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    expect(AuthAPI.logout).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar conexión' }));
    await waitFor(() => expect(screen.getByTestId('result')).toHaveTextContent('conexión revisada'));
    expect(global.fetch).toHaveBeenCalledTimes(2);
    unmount();
  });
});
