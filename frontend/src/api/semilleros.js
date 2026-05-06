import { fetchAPI } from './config';

/**
 * Servicio de Semilleros de Investigación
 */
export const SemillerosAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/semilleros?${query}`);
  },

  get: (id) => fetchAPI(`/semilleros/${id}`),

  create: (data) => fetchAPI('/semilleros', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchAPI(`/semilleros/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id) => fetchAPI(`/semilleros/${id}`, { method: 'DELETE' }),

  // Aprendices
  listAprendices: (semilleroId) => fetchAPI(`/semilleros/${semilleroId}/aprendices`),

  addAprendiz: (semilleroId, data) => fetchAPI(`/semilleros/${semilleroId}/aprendices`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  addAprendizFull: (semilleroId, data) => fetchAPI(`/semilleros/${semilleroId}/aprendices/full`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),


  updateAprendiz: (semilleroId, aprendizId, data) => fetchAPI(`/semilleros/${semilleroId}/aprendices/${aprendizId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  deleteAprendiz: (semilleroId, aprendizId) => fetchAPI(`/semilleros/${semilleroId}/aprendices/${aprendizId}`, {
    method: 'DELETE',
  }),

  // Investigadores
  addInvestigador: (semilleroId, data) => {
    const query = new URLSearchParams(data).toString();
    return fetchAPI(`/semilleros/${semilleroId}/investigadores?${query}`, {
      method: 'POST'
    });
  },

  removeInvestigador: (semilleroId, userId) => fetchAPI(`/semilleros/${semilleroId}/investigadores/${userId}`, {
    method: 'DELETE'
  }),

  getStats: (id) => fetchAPI(`/stats/semillero/${id}/impact`),
};
