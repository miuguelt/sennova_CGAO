import { fetchAPI } from './config';

/**
 * Servicio de Convocatorias SENNOVA
 */
export const ConvocatoriasAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/convocatorias?${query}`);
  },

  get: (id) => fetchAPI(`/convocatorias/${id}`),

  create: (data) => fetchAPI('/convocatorias', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchAPI(`/convocatorias/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id) => fetchAPI(`/convocatorias/${id}`, { method: 'DELETE' }),

  activas: () => fetchAPI('/convocatorias/activas/now'),

  stats: () => fetchAPI('/convocatorias/stats/resumen'),
};
