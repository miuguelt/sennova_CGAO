import { fetchAPI } from './config.js';

/**
 * Servicio de Usuarios (Admin Only)
 * Gestión completa de usuarios del sistema
 */
export const UsuariosAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/usuarios?${query}`);
  },

  get: (id) => fetchAPI(`/usuarios/${id}`),

  create: (data) => fetchAPI('/usuarios', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  update: (id, data) => fetchAPI(`/usuarios/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  delete: (id) => fetchAPI(`/usuarios/${id}`, { method: 'DELETE' }),

  resetPassword: (id, newPassword) => fetchAPI(`/usuarios/${id}/reset-password?new_password=${encodeURIComponent(newPassword)}`, {
    method: 'POST',
  }),

  toggleActive: (id) => fetchAPI(`/usuarios/${id}/toggle-active`, {
    method: 'POST',
  }),

  // Estadísticas
  getStats: () => fetchAPI('/usuarios/stats/resumen'),

  getActividad: (id) => fetchAPI(`/usuarios/${id}/actividad`),

  getHistorial: (id) => fetchAPI(`/usuarios/${id}/historial`),
};
