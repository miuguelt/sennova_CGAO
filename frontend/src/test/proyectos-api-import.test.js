import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAPI } from '../api/config';

vi.mock('../api/config', () => ({ fetchAPI: vi.fn() }));

let ProyectosAPI;

describe('ProyectosAPI: importación de formulaciones', () => {
  beforeEach(async () => {
    ({ ProyectosAPI } = await vi.importActual('../api/proyectos'));
  });

  afterEach(() => vi.clearAllMocks());

  it('envía el DOCX como formulario multipart para analizarlo', async () => {
    const file = new File(['docx'], 'formulacion.docx');
    fetchAPI.mockResolvedValue({ suggested_fields: { nombre: 'Proyecto CAP' } });

    await ProyectosAPI.analyzeFormulation(file);

    const [endpoint, options] = fetchAPI.mock.calls[0];
    expect(endpoint).toBe('/proyectos/analizar-formulacion');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('file')).toBe(file);
  });

  it('envía los datos revisados y el DOCX en una sola solicitud de importación', async () => {
    const project = { nombre: 'Proyecto revisado', objetivos_especificos: ['Objetivo 1'] };
    const file = new File(['docx'], 'formulacion.docx');
    fetchAPI.mockResolvedValue({ id: 'proyecto-creado' });

    await ProyectosAPI.importFormulation(project, file);

    const [endpoint, options] = fetchAPI.mock.calls[0];
    expect(endpoint).toBe('/proyectos/importar-formulacion');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('proyecto')).toBe(JSON.stringify(project));
    expect(options.body.get('file')).toBe(file);
  });
});
