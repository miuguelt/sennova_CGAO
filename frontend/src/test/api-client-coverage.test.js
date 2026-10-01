import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/config', () => ({
  API_URL: '/api',
  fetchAPI: vi.fn(),
  setAuthToken: vi.fn(),
}));

import { fetchAPI, setAuthToken } from '../api/config';
import { AuditAPI } from '../api/audit';
import { AuthAPI } from '../api/auth';
import { MensajesAPI } from '../api/mensajes';

class FakeEventSource {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.listeners = {};
    FakeEventSource.instances.push(this);
  }

  addEventListener(type, callback) {
    this.listeners[type] = callback;
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  fetchAPI.mockResolvedValue({ access_token: 'token-api', user: { id: 'u1', rol: 'investigador' } });
  FakeEventSource.instances = [];
});

describe('servicios de autenticación y auditoría', () => {
  it('envía llamadas de auditoría y construye URL de descarga', async () => {
    localStorage.setItem('token', 'token/csv');

    await AuditAPI.getLogs({ skip: 5, method: 'POST' });
    await AuditAPI.getActividades({ usuario: 'u1' });
    await AuditAPI.getStats();
    await AuditAPI.cleanup(45);

    expect(AuditAPI.exportLogsUrl('logs')).toContain('/audit/export?tipo=logs&token=token/csv');
    expect(fetchAPI).toHaveBeenNthCalledWith(1, '/audit/logs?skip=5&method=POST');
    expect(fetchAPI).toHaveBeenNthCalledWith(4, '/audit/cleanup?dias=45', { method: 'POST' });
  });

  it('inicia sesión, registra, actualiza, consulta, cierra y lee el estado local', async () => {
    const credentials = await AuthAPI.login('persona@sena.edu.co', 'clave-segura');
    expect(credentials.access_token).toBe('token-api');
    expect(setAuthToken).toHaveBeenCalledWith('token-api');
    expect(JSON.parse(localStorage.getItem('user'))).toEqual({ id: 'u1', rol: 'investigador' });

    await AuthAPI.register({ email: 'aprendiz@sena.edu.co', rol: 'aprendiz' });
    await AuthAPI.getMe();
    await AuthAPI.me();
    await AuthAPI.updateMe({ nombre: 'Actualizada' });
    await AuthAPI.changePassword('anterior', 'nueva123');
    await AuthAPI.listarUsuarios();
    expect(AuthAPI.getToken()).toBeNull();
    expect(AuthAPI.getUser()).toEqual({ id: 'u1', rol: 'investigador' });
    expect(AuthAPI.isAuthenticated()).toBe(false);
    expect(AuthAPI.isAdmin()).toBe(false);
    localStorage.setItem('token', 'token-local');
    localStorage.setItem('user', '{"rol":"admin"}');
    expect(AuthAPI.isAuthenticated()).toBe(true);
    expect(AuthAPI.isAdmin()).toBe(true);
    AuthAPI.logout();
    expect(setAuthToken).toHaveBeenLastCalledWith(null);
    expect(fetchAPI).toHaveBeenCalledWith('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: 'anterior', new_password: 'nueva123' }),
    });
  });
});

describe('cliente de mensajería', () => {
  it('cubre las llamadas REST, URLs de adjuntos y alias', async () => {
    localStorage.setItem('token', 'token /&');
    await MensajesAPI.getConversaciones();
    await MensajesAPI.getConversacion('u2', 3, 7);
    await MensajesAPI.marcarLeidos('u2');
    await MensajesAPI.marcarEntregados('u2');
    await MensajesAPI.notificarTyping('u2', 1);
    await MensajesAPI.enviar({ destinatario_id: 'u2', contenido: 'Hola' });
    const attachment = new File(['archivo'], 'documento.txt', { type: 'text/plain' });
    await MensajesAPI.subirAdjunto(attachment);
    await MensajesAPI.eliminarAdjunto('a1');
    await MensajesAPI.getStats();
    await MensajesAPI.getUnreadCount();
    await MensajesAPI.getDestinatarios();
    await MensajesAPI.getDestinatarios('ana', 'investigador');
    await MensajesAPI.getContacto('u2');
    await MensajesAPI.eliminar('m1');
    await MensajesAPI.send({ destinatario_id: 'u2', contenido: 'Alias' });
    await MensajesAPI.delete('m2');
    await MensajesAPI.markAsRead('u2');
    await MensajesAPI.markAsDelivered('u2');

    expect(MensajesAPI.urlAdjunto('a1')).toBe(`${window.location.origin}/api/mensajes/adjuntos/a1?token=token%20%2F%26`);
    expect(fetchAPI).toHaveBeenCalledWith('/mensajes/typing', {
      method: 'POST',
      body: JSON.stringify({ destinatario_id: 'u2', is_typing: true }),
    });
    expect(fetchAPI).toHaveBeenCalledWith('/mensajes/destinatarios?search=ana&rol=investigador');
    const uploadCall = fetchAPI.mock.calls.find(([path]) => path === '/mensajes/adjuntos');
    expect(uploadCall[1].body.get('archivo')).toBe(attachment);
  });

  it('maneja el canal SSE, eventos válidos, keepalive inválido y fallos', () => {
    const onEvent = vi.fn();
    const onError = vi.fn();
    const onOpen = vi.fn();
    expect(MensajesAPI.connectStream(onEvent, onError, onOpen)).toBeNull();

    localStorage.setItem('token', 'stream-token');
    vi.stubGlobal('EventSource', FakeEventSource);
    const stream = MensajesAPI.connectStream(onEvent, onError, onOpen);
    expect(stream.url).toBe(`${window.location.origin}/api/mensajes/stream?token=stream-token`);
    stream.onopen({ type: 'open' });
    stream.onmessage({ data: '{"id":"m1"}' });
    stream.onmessage({ data: 'ping' });
    for (const [type, callback] of Object.entries(stream.listeners)) {
      callback({ data: JSON.stringify({ type }) });
      callback({ data: '{invalid' });
    }
    stream.onerror({ type: 'error' });
    expect(onOpen).toHaveBeenCalledWith({ type: 'open' });
    expect(onEvent).toHaveBeenCalledWith('message', { id: 'm1' });
    expect(onEvent).toHaveBeenCalledWith('connected', { type: 'connected' });
    expect(onError).toHaveBeenCalledWith({ type: 'error' });

    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    class BrokenEventSource {
      constructor() {
        throw new Error('SSE no disponible');
      }
    }
    vi.stubGlobal('EventSource', BrokenEventSource);
    expect(MensajesAPI.connectStream(onEvent, onError, onOpen)).toBeNull();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'SSE no disponible' }));
    expect(consoleError).toHaveBeenCalled();
  });
});
