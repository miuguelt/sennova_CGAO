import { fetchAPI } from './config';

export const RetosAPI = {
  list: () => fetchAPI('/retos'),
  listar: () => fetchAPI('/retos'),
  get: (id) => fetchAPI(`/retos/${id}`),
  obtener: (id) => fetchAPI(`/retos/${id}`),
  create: (data) => fetchAPI('/retos', { method: 'POST', body: JSON.stringify(data) }),
  crear: (data) => fetchAPI('/retos', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchAPI(`/retos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  actualizar: (id, data) => fetchAPI(`/retos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => fetchAPI(`/retos/${id}`, { method: 'DELETE' }),
  eliminar: (id) => fetchAPI(`/retos/${id}`, { method: 'DELETE' }),
};
