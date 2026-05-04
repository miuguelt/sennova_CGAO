import { fetchAPI } from './config.js';

export const RetosAPI = {
  list: () => fetchAPI('/retos'),
  create: (data) => fetchAPI('/retos', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => fetchAPI(`/retos/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => fetchAPI(`/retos/${id}`, { method: 'DELETE' }),
};
