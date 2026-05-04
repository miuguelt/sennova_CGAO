import { fetchAPI } from './config.js';

/**
 * Servicio de Proyectos
 */
export const ProyectosAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/proyectos?${query}`);
  },

  get: (id) => fetchAPI(`/proyectos/${id}`),

  create: (data) => fetchAPI('/proyectos', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchAPI(`/proyectos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id) => fetchAPI(`/proyectos/${id}`, { method: 'DELETE' }),

  addEquipo: (proyectoId, userId, rol, horas) => fetchAPI(`/proyectos/${proyectoId}/equipo`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, rol_en_proyecto: rol, horas_dedicadas: horas }),
  }),

  removeEquipo: (proyectoId, userId) => fetchAPI(`/proyectos/${proyectoId}/equipo/${userId}`, {
    method: 'DELETE',
  }),
};
