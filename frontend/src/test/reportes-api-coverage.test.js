import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFetchAPI } = vi.hoisted(() => ({ mockFetchAPI: vi.fn() }));
vi.mock('../api/config', () => ({ API_URL: 'https://api.sennova.test', fetchAPI: mockFetchAPI }));

import { ReportesAPI } from '../api/reportes';

function response({ ok = true, filename = 'reporte.csv', body = { total: 4 } } = {}) {
  return {
    ok,
    headers: { get: vi.fn(() => `attachment; filename="${filename}"`) },
    blob: vi.fn(async () => new Blob(['contenido del reporte'])),
    json: vi.fn(async () => body),
  };
}

describe('API de reportes consolidados', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'token-reportes');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response()));
    Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:reporte') });
    Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('descarga consolidado de cada tipo y adjunta la sesión', async () => {
    const downloads = [
      [() => ReportesAPI.descargarConsolidadoProyectos(2026, 'csv'), 'reporte.csv'],
      [() => ReportesAPI.descargarConsolidadoGrupos('csv'), 'reporte.csv'],
      [() => ReportesAPI.descargarConsolidadoProductos(2026, true, 'csv'), 'reporte.csv'],
      [() => ReportesAPI.descargarConsolidadoSemilleros('csv'), 'reporte.csv'],
      [() => ReportesAPI.descargarConsolidadoTalento('csv'), 'consolidado_talento_sennova.csv'],
      [() => ReportesAPI.descargarCertificadoInvestigador('u-7'), 'certificado_investigacion_u-7.pdf'],
    ];

    for (const [download, expectedFilename] of downloads) {
      const result = await download();
      expect(result).toEqual({ success: true, filename: expectedFilename });
      expect(fetch).toHaveBeenLastCalledWith(expect.stringContaining('https://api.sennova.test/reportes/'), {
        headers: { Authorization: 'Bearer token-reportes' },
      });
    }

    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(downloads.length);
    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(downloads.length);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledTimes(downloads.length);
    expect(fetch.mock.calls.at(-1)[0]).toContain('/investigador/u-7/certificado');
    expect(downloads).toHaveLength(6);
  });

  it('consulta consolidados y usa fetch directo si falla el servicio de estadísticas', async () => {
    mockFetchAPI.mockResolvedValueOnce([{ id: 'p-1' }]);
    mockFetchAPI.mockResolvedValueOnce([{ id: 'g-1' }]);
    mockFetchAPI.mockResolvedValueOnce([{ id: 'pr-1' }]);
    mockFetchAPI.mockResolvedValueOnce([{ id: 's-1' }]);

    expect(await ReportesAPI.consolidadoProyectos({ año: 2026 })).toEqual([{ id: 'p-1' }]);
    expect(await ReportesAPI.consolidadoGrupos({ activo: true })).toEqual([{ id: 'g-1' }]);
    expect(await ReportesAPI.consolidadoProductos({ verificado: true })).toEqual([{ id: 'pr-1' }]);
    expect(await ReportesAPI.consolidadoSemilleros({ sede: 'Bogotá' })).toEqual([{ id: 's-1' }]);
    expect(mockFetchAPI).toHaveBeenNthCalledWith(1, '/reportes/proyectos-consolidado?a%C3%B1o=2026');
    expect(mockFetchAPI).toHaveBeenNthCalledWith(4, '/reportes/semilleros-consolidado?sede=Bogot%C3%A1');

    mockFetchAPI.mockRejectedValueOnce(new Error('servicio no disponible'));
    fetch.mockResolvedValueOnce(response({ body: { total: 12 } }));
    await expect(ReportesAPI.getEstadisticasResumen()).resolves.toEqual({ total: 12 });
    expect(fetch).toHaveBeenLastCalledWith('https://api.sennova.test/reportes/estadisticas-resumen', {
      headers: { Authorization: 'Bearer token-reportes' },
    });
  });

  it('propaga errores HTTP en descargas y en las estadísticas', async () => {
    fetch.mockResolvedValueOnce(response({ ok: false }));
    await expect(ReportesAPI.descargarConsolidadoProyectos()).rejects.toThrow('Error generando reporte de proyectos');

    mockFetchAPI.mockRejectedValueOnce(new Error('sin conexión'));
    fetch.mockResolvedValueOnce(response({ ok: false }));
    await expect(ReportesAPI.getEstadisticasResumen()).rejects.toThrow('Error obteniendo estadísticas');
  });
});
