import { fetchAPI, API_URL } from './config.js';

/**
 * Servicio de Documentos
 * Gestión de archivos adjuntos (CV Lac, actas, contratos, informes)
 */
export const DocumentosAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/documentos?${query}`);
  },

  get: (id) => fetchAPI(`/documentos/${id}`),

  upload: (formData) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_URL}/documentos/upload`, {
      method: 'POST',
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
      body: formData,
    }).then(async (response) => {
      if (!response.ok) {
        const error = await response.json().catch(() => ({ 
          detail: `Error ${response.status}: ${response.statusText}` 
        }));
        throw new Error(error.detail || error.message || 'Error en la petición');
      }
      return response.json();
    });
  },

  download: (id) => fetchAPI(`/documentos/${id}/download`),

  delete: (id) => fetchAPI(`/documentos/${id}`, { method: 'DELETE' }),

  // Endpoints especiales
  getUserCVLac: () => fetchAPI('/documentos/user/cvlac'),

  getProyectoDocumentos: (proyectoId) => fetchAPI(`/documentos/proyecto/${proyectoId}/list`),
};
