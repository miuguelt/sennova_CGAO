import { fetchAPI } from './config';

export const ProjectDocumentationAPI = {
  get: (id) => fetchAPI(`/proyectos/${id}/documentacion`),
  saveCommon: (id, revision, datos) => fetchAPI(`/proyectos/${id}/documentacion/comunes`, {
    method: 'PUT', body: JSON.stringify({ revision, datos }),
  }),
  saveDraft: (id, key, revision, datos) => fetchAPI(`/proyectos/${id}/documentacion/borradores/${encodeURIComponent(key)}`, {
    method: 'PUT', body: JSON.stringify({ revision, datos }),
  }),
  generate: (id, key, revision, revisionComunes) => fetchAPI(`/proyectos/${id}/documentacion/generar/${encodeURIComponent(key)}`, {
    method: 'POST', body: JSON.stringify({ revision, revision_comunes: revisionComunes }),
  }),
  review: (id, documentId, observacion) => fetchAPI(`/proyectos/${id}/documentacion/revisar/${documentId}`, {
    method: 'POST', body: JSON.stringify({ observacion }),
  }),
};
