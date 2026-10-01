import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  API_URL,
  fetchAPI,
  getHeaders,
  setAuthToken,
} from '../api/config';
import {
  DATA_REFRESH_EVENT,
  emitDataRefresh,
  subscribeToDataRefresh,
  tieneCanalPropio,
} from '../utils/dataRefresh';

function jsonResponse(body, { status = 200, statusText = 'OK' } = {}) {
  return {
    status,
    statusText,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(body),
  };
}

beforeEach(() => {
  localStorage.clear();
  setAuthToken(null);
  history.replaceState({}, '', '/dashboard');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ok: true })));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('configuración y transporte global de la API', () => {
  it('arma URLs relativas, absolutas y rutas que ya incluyen el prefijo', async () => {
    const normalizedBase = API_URL.replace(/\/+$/, '');
    const baseIsAbsolute = /^https?:\/\//i.test(normalizedBase);
    await fetchAPI('/productos');
    await fetchAPI('/api/usuarios');
    await fetchAPI('https://servicio.example/recurso');

    expect(fetch).toHaveBeenNthCalledWith(1, `${normalizedBase}/productos`, expect.any(Object));
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      baseIsAbsolute ? `${normalizedBase}/api/usuarios` : `${window.location.origin}/api/usuarios`,
      expect.any(Object),
    );
    expect(fetch).toHaveBeenNthCalledWith(3, 'https://servicio.example/recurso', expect.any(Object));
  });

  it('conserva el token, mezcla cabeceras y elimina Content-Type para FormData', async () => {
    setAuthToken('token-de-prueba');
    expect(getHeaders()).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token-de-prueba',
    });

    await fetchAPI('/perfil', { headers: { 'X-Request-ID': 'req-1' } });
    const form = new FormData();
    form.append('archivo', new Blob(['contenido']), 'prueba.txt');
    await fetchAPI('/documentos', { method: 'POST', body: form });

    expect(fetch.mock.calls[0][1].headers).toMatchObject({
      Authorization: 'Bearer token-de-prueba',
      'X-Request-ID': 'req-1',
    });
    expect(fetch.mock.calls[1][1].headers).not.toHaveProperty('Content-Type');
  });

  it('publica cambios confirmados y devuelve null para respuestas 204', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToDataRefresh(listener);
    fetch.mockResolvedValueOnce({ status: 204, statusText: 'No Content', ok: true });

    expect(await fetchAPI('/proyectos/1', { method: 'DELETE' })).toBeNull();
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({
      endpoint: '/proyectos/1',
      method: 'DELETE',
      force: true,
    }));
    expect(tieneCanalPropio('https://host.test/mensajes/1')).toBe(true);

    listener.mockClear();
    emitDataRefresh({ endpoint: '/mensajes/conversaciones', method: 'POST' });
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
    window.dispatchEvent(new CustomEvent(DATA_REFRESH_EVENT, { detail: {} }));
    expect(listener).not.toHaveBeenCalled();
  });

  it('entrega el detalle del evento de refresco y permite cancelar la suscripción', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToDataRefresh(listener);

    window.dispatchEvent(new CustomEvent(DATA_REFRESH_EVENT, { detail: { endpoint: '/grupos' } }));
    expect(listener).toHaveBeenCalledWith({ endpoint: '/grupos' });

    unsubscribe();
    window.dispatchEvent(new CustomEvent(DATA_REFRESH_EVENT, { detail: { endpoint: '/proyectos' } }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('traduce errores de autorización, validación, servidor y conexión', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    fetch.mockResolvedValueOnce(jsonResponse({ detail: 'No autorizado' }, { status: 403 }));
    await expect(fetchAPI('/privado')).rejects.toThrow('No autorizado');

    fetch.mockResolvedValueOnce(jsonResponse({ detail: [{ msg: 'Campo requerido' }, { message: 'Dato inválido' }] }, { status: 422 }));
    await expect(fetchAPI('/validar')).rejects.toThrow('Campo requerido. Dato inválido');

    fetch.mockResolvedValueOnce({
      status: 500,
      statusText: 'Error',
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    });
    await expect(fetchAPI('/error')).rejects.toThrow('Error 500: Error');

    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(fetchAPI('/sin-red')).rejects.toThrow('No se puede conectar al servidor');

    localStorage.setItem('token', 'token-expirado');
    localStorage.setItem('user', '{"rol":"aprendiz"}');
    fetch.mockResolvedValueOnce(jsonResponse({}, { status: 401 }));
    await expect(fetchAPI('/protegido')).rejects.toThrow('Sesión expirada');
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(consoleError).toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalled();
  });
});
