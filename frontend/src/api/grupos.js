import { fetchAPI } from './config';

/**
 * Servicio de Grupos de Investigación
 */
export const GruposAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/grupos?${query}`);
  },

  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/grupos?${query}`.replace(/\?$/, ''));
  },

  get: (id) => fetchAPI(`/grupos/${id}`),

  create: (data) => fetchAPI('/grupos', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchAPI(`/grupos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id) => fetchAPI(`/grupos/${id}`, { method: 'DELETE' }),

  getMembers: async (id) => {
    const res = await fetchAPI(`/grupos/${id}/integrantes`);
    if (Array.isArray(res)) return res;
    return res.integrantes || [];
  },

  addMember: (grupoId, data) => fetchAPI(`/grupos/${grupoId}/integrantes`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  removeMember: (grupoId, userId) => fetchAPI(`/grupos/${grupoId}/integrantes/${userId}`, {
    method: 'DELETE',
  }),

  getStats: (id) => fetchAPI(`/grupos/${id}/stats`),

  getProyectos: (id) => fetchAPI(`/grupos/${id}/proyectos`),

  uploadPlanOperativo: (grupoId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchAPI(`/grupos/${grupoId}/plan-operativo`, {
      method: 'POST',
      body: formData,
    });
  },

  downloadPlanOperativoUrl: (grupoId) => `/api/grupos/${grupoId}/plan-operativo`,

  getConsolidadoReporteUrl: (formato = 'excel') => `/api/reportes/grupos-consolidado?formato=${formato}`,
};
