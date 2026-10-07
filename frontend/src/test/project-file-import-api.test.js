import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProjectFileImportAPI } from '../api/projectFileImport';
import { setAuthToken } from '../api/config';
import { DATA_REFRESH_EVENT } from '../utils/dataRefresh';

afterEach(() => { setAuthToken(null); vi.restoreAllMocks(); });

describe('Contrato de importación de archivos del proyecto', () => {
  it('analiza multipart autenticado sin anunciar una escritura ni persistir selección', async () => {
    setAuthToken('example');
    const result = { proyecto_id: 'p-1', archivos: [] };
    const refresh = vi.fn();
    window.addEventListener(DATA_REFRESH_EVENT, refresh);
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => result });
    const files = [new File(['uno'], 'uno.pdf'), new File(['dos'], 'dos.docx')];
    expect(await ProjectFileImportAPI.analyze('p-1', { files, carpeta: '2ActadeInicio', tipo: 'acta_inicio' })).toEqual(result);
    const [url, config] = fetch.mock.calls[0];
    expect(url).toMatch(/\/proyectos\/p-1\/expediente\/analizar-archivos$/);
    expect(config.method).toBe('POST');
    expect(config.headers.Authorization).toBe('Bearer example');
    expect(config.headers).not.toHaveProperty('Content-Type');
    expect(config.body.getAll('files')).toEqual(files);
    expect(config.body.get('carpeta')).toBe('2ActadeInicio');
    expect(config.body.get('tipo')).toBe('acta_inicio');
    expect(config.body.has('seleccion')).toBe(false);
    expect(config).not.toHaveProperty('mutates');
    expect(refresh).not.toHaveBeenCalled();
    window.removeEventListener(DATA_REFRESH_EVENT, refresh);
  });

  it('guarda el ZIP y la selección revisada y anuncia solo la escritura confirmada', async () => {
    setAuthToken('example');
    const result = { archivos_importados: 1, campos_registrados: 2 };
    const refresh = vi.fn();
    window.addEventListener(DATA_REFRESH_EVENT, refresh);
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200, json: async () => result });
    const file = new File(['zip'], 'proyecto.zip');
    const seleccion = [{ ruta: '3Productos/soporte.pdf', sha256: 'example', periodo_bimestre: null, importar_datos: false }];
    expect(await ProjectFileImportAPI.save('p-2', { files: [file] }, seleccion)).toEqual(result);
    const [url, config] = fetch.mock.calls[0];
    expect(url).toMatch(/\/proyectos\/p-2\/expediente\/importar-archivos$/);
    expect(config.body.getAll('files')).toEqual([file]);
    expect(config.body.has('carpeta')).toBe(false);
    expect(config.body.has('tipo')).toBe(false);
    expect(JSON.parse(config.body.get('seleccion'))).toEqual(seleccion);
    expect(refresh).toHaveBeenCalledOnce();
    expect(refresh.mock.calls[0][0].detail.endpoint).toBe('/proyectos/p-2/expediente/importar-archivos');
    window.removeEventListener(DATA_REFRESH_EVENT, refresh);
  });

  it('conserva el error de validación para corregir y reintentar', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({ ok: false, status: 422, json: async () => ({ detail: 'El ZIP contiene una ruta no permitida.' }) });
    await expect(ProjectFileImportAPI.analyze('p-1', { files: [new File(['x'], 'proyecto.zip')] })).rejects.toThrow('El ZIP contiene una ruta no permitida.');
  });
});
