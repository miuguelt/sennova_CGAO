import { fetchAPI } from './config';

export const ProjectDocumentationAPI = {
  get: (id) => fetchAPI(`/proyectos/${id}/documentacion`),
  saveIdentification: (id, payload) => fetchAPI(`/proyectos/${id}/documentacion/identificacion`, {
    method: 'PUT', body: JSON.stringify(payload),
  }),
  saveCommon: (id, revision, datos) => fetchAPI(`/proyectos/${id}/documentacion/comunes`, {
    method: 'PUT', body: JSON.stringify({ revision, datos }),
  }),
  saveDraft: (id, key, revision, datos) => fetchAPI(`/proyectos/${id}/documentacion/borradores/${encodeURIComponent(key)}`, {
    method: 'PUT', body: JSON.stringify({ revision, datos }),
  }),
  analyzeFormulation: (id, file) => {
    const form = new FormData();
    form.append('archivo', file);
    return fetchAPI(`/proyectos/${id}/documentacion/analizar-formato`, {
      method: 'POST', body: form, mutates: false,
    });
  },
  applyFormulation: (id, borrador, proyecto) => fetchAPI(`/proyectos/${id}/documentacion/aplicar-formato`, {
    method: 'POST', body: JSON.stringify({ borrador, proyecto }),
  }),
  generate: (id, key, revision, revisionComunes) => fetchAPI(`/proyectos/${id}/documentacion/generar/${encodeURIComponent(key)}`, {
    method: 'POST', body: JSON.stringify({ revision, revision_comunes: revisionComunes }),
  }),
  review: (id, documentId, observacion) => fetchAPI(`/proyectos/${id}/documentacion/revisar/${documentId}`, {
    method: 'POST', body: JSON.stringify({ observacion }),
  }),
  getRecommendation: (id, campo, texto) => fetchAPI(`/proyectos/${id}/documentacion/recomendar`, {
    method: 'POST', body: JSON.stringify({ campo, texto }), mutates: false,
  }),
};


