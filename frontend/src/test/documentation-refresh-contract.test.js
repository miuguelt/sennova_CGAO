import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ProjectDocumentationAPI } from '../api/projectDocumentation';
import { DATA_REFRESH_EVENT } from '../utils/dataRefresh';

let refresh;
beforeEach(() => {
  refresh = vi.fn();
  window.addEventListener(DATA_REFRESH_EVENT, refresh);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ recomendaciones: ['Relaciona la actividad con un objetivo.'] }) }));
});
afterEach(() => { window.removeEventListener(DATA_REFRESH_EVENT, refresh); vi.unstubAllGlobals(); });

it('consultar orientaciones no notifica una escritura ni envía metadatos internos a HTTP', async () => {
  await ProjectDocumentationAPI.getRecommendation('example', 'introduccion', 'Texto en edición');
  expect(refresh).not.toHaveBeenCalled();
  expect(fetch.mock.calls[0][1]).not.toHaveProperty('mutates');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ campo: 'introduccion', texto: 'Texto en edición' });
});

it('analizar una importación conserva la edición hasta que la persona aplica el resultado', async () => {
  await ProjectDocumentationAPI.analyzeFormulation('example', new File(['contenido'], 'formato.docx'));
  expect(refresh).not.toHaveBeenCalled();
  await ProjectDocumentationAPI.applyFormulation('example', { introduccion: 'Contenido confirmado' }, {});
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(refresh.mock.calls[0][0].detail).toMatchObject({ endpoint: '/proyectos/example/documentacion/aplicar-formato', method: 'POST' });
});
