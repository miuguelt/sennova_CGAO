import { fetchAPI } from './config';

/**
 * Servicio de Grupos de Investigación
 */
export const GruposAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/grupos?${query}`);
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
    const grupo = await fetchAPI(`/grupos/${id}`);
    return grupo.integrantes || [];
  },

  addMember: (grupoId, data) => fetchAPI(`/grupos/${grupoId}/integrantes?user_id=${data.user_id}&rol_en_grupo=${data.rol || 'Miembro'}`, {
    method: 'POST',
  }),

  removeMember: (grupoId, userId) => fetchAPI(`/grupos/${grupoId}/integrantes/${userId}`, {
    method: 'DELETE',
  }),
};
