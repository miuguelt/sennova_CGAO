import { fetchAPI } from './config';

/**
 * Servicio de Productos de Investigación
 */
export const ProductosAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/productos?${query}`);
  },

  get: (id) => fetchAPI(`/productos/${id}`),

  create: (data) => fetchAPI('/productos', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchAPI(`/productos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id) => fetchAPI(`/productos/${id}`, { method: 'DELETE' }),

  verificar: (id, isVerificado) => fetchAPI(`/productos/${id}/verificar`, {
    method: 'POST',
    body: JSON.stringify({ is_verificado: isVerificado }),
  }),

  stats: () => fetchAPI('/productos/stats/resumen'),

  misProductos: () => fetchAPI('/productos/mis-productos/list'),
  
  importCVLaC: (url) => fetchAPI(`/cvlac/import?url=${encodeURIComponent(url)}`, {
    method: 'POST',
  }),

  generarDesdePlantilla: (proyectoId) => fetchAPI(`/productos/proyecto/${proyectoId}/generate-template`, {
    method: 'POST',
  }),
};
