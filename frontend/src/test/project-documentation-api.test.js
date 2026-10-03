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
    await ProjectDocumentationAPI.saveIdentification('p-1', { nombre: 'Proyecto Nuevo' });
    expect(fetchAPI).toHaveBeenLastCalledWith('/proyectos/p-1/documentacion/identificacion', { method: 'PUT', body: JSON.stringify({ nombre: 'Proyecto Nuevo' }) });
    const dummyFile = new File(['content'], 'formato.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    await ProjectDocumentationAPI.analyzeFormulation('p-1', dummyFile);
    expect(fetchAPI).toHaveBeenLastCalledWith('/proyectos/p-1/documentacion/analizar-formato', expect.objectContaining({ method: 'POST' }));
    await ProjectDocumentationAPI.applyFormulation('p-1', { intro: 'ok' }, { nombre: 'ok' });
    expect(fetchAPI).toHaveBeenLastCalledWith('/proyectos/p-1/documentacion/aplicar-formato', { method: 'POST', body: JSON.stringify({ borrador: { intro: 'ok' }, proyecto: { nombre: 'ok' } }) });
    await ProjectDocumentationAPI.getRecommendation('p-1', 'planteamiento_problema', 'Texto de prueba');
    expect(fetchAPI).toHaveBeenLastCalledWith('/proyectos/p-1/documentacion/recomendar', { method: 'POST', body: JSON.stringify({ campo: 'planteamiento_problema', texto: 'Texto de prueba' }) });
  });
});

