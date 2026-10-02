import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProyectosAPI } from '../api/proyectos';
import { fetchAPI, setAuthToken } from '../api/config';

afterEach(() => { setAuthToken(null); vi.restoreAllMocks(); });

describe('Contrato del expediente', () => {
  it('consulta el diagnóstico del proyecto con la sesión activa', async () => {
    setAuthToken('example');
    const data = { proyecto_id: 'p-1', completo: false, etapas: [] };
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => data });
    expect(await ProyectosAPI.getExpediente('p-1')).toEqual(data);
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/proyectos\/p-1\/expediente$/), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer example' }) }));
  });

  it('descarga un ZIP binario autenticado sin intentar leerlo como JSON', async () => {
    setAuthToken('example');
    const zip = new Blob(['archivo'], { type: 'application/zip' });
    const json = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => zip, json });
    expect(await ProyectosAPI.downloadExpediente('p-1')).toBe(zip);
    expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/\/proyectos\/p-1\/expediente\/descargar$/), expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer example' }) }));
    expect(fetch.mock.calls[0][1]).not.toHaveProperty('responseType');
    expect(json).not.toHaveBeenCalled();
  });

  it('conserva los errores de permisos al solicitar un binario', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ detail: 'No tiene acceso al proyecto.' }) });
    await expect(fetchAPI('/proyectos/p-1/expediente/descargar', { responseType: 'blob' })).rejects.toThrow('No tiene acceso al proyecto.');
  });
});
