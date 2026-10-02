import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectDocumentationAPI } from '../api/projectDocumentation';
import { fetchAPI } from '../api/config';
vi.mock('../api/config', () => ({ fetchAPI: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); fetchAPI.mockResolvedValue({ revision: 2 }); });
describe('API de construcción documental', () => {
  it('consulta datos, conserva las revisiones y codifica las claves de documentos', async () => {
    await ProjectDocumentationAPI.get('p-1');
    expect(fetchAPI).toHaveBeenLastCalledWith('/proyectos/p-1/documentacion');
    await ProjectDocumentationAPI.saveCommon('p-1', 1, { centro: 'CGAO' });
    expect(fetchAPI).toHaveBeenLastCalledWith('/proyectos/p-1/documentacion/comunes', { method: 'PUT', body: JSON.stringify({ revision: 1, datos: { centro: 'CGAO' } }) });
    await ProjectDocumentationAPI.saveDraft('p-1', 'informe:1', 3, { avance: 'Resultado comprobado' });
    expect(fetchAPI).toHaveBeenLastCalledWith('/proyectos/p-1/documentacion/borradores/informe%3A1', { method: 'PUT', body: JSON.stringify({ revision: 3, datos: { avance: 'Resultado comprobado' } }) });
    await ProjectDocumentationAPI.generate('p-1', 'acta_inicio', 4, 2);
    expect(fetchAPI).toHaveBeenLastCalledWith('/proyectos/p-1/documentacion/generar/acta_inicio', { method: 'POST', body: JSON.stringify({ revision: 4, revision_comunes: 2 }) });
    await ProjectDocumentationAPI.review('p-1', 'doc-1', 'Contenido contrastado con los resultados.');
    expect(fetchAPI).toHaveBeenLastCalledWith('/proyectos/p-1/documentacion/revisar/doc-1', { method: 'POST', body: JSON.stringify({ observacion: 'Contenido contrastado con los resultados.' }) });
  });
});
