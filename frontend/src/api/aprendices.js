import { fetchAPI } from './config';

/**
 * Servicio de Aprendices
 * Acceso global a la gestión de aprendices (Investigadores Junior)
 */
export const AprendicesAPI = {
  /**
   * Listado global de aprendices con filtros
   */
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/aprendices?${query}`);
  },

  /**
   * Detalle de un aprendiz
   */
  get: (id) => fetchAPI(`/aprendices/${id}`),

  /**
   * Actualizar estado/vinculación de aprendiz
   */
  update: (id, data) => fetchAPI(`/aprendices/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  /**
   * Eliminar vinculación de aprendiz (Solo Admin)
   */
  delete: (id) => fetchAPI(`/aprendices/${id}`, { 
    method: 'DELETE' 
  }),
};
