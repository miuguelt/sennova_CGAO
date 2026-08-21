import { fetchAPI, API_URL } from './config';

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

  upload: (formData) => fetchAPI('/documentos/upload', {
      method: 'POST',
      body: formData,
    }),

  download: (id) => fetchAPI(`/documentos/${id}/download`),

  delete: (id) => fetchAPI(`/documentos/${id}`, { method: 'DELETE' }),

  // Endpoints especiales
  getUserCVLac: () => fetchAPI('/documentos/user/cvlac'),

  getProyectoDocumentos: (proyectoId) => fetchAPI(`/documentos/proyecto/${proyectoId}/list`),

  getViewUrl: (id) => `${API_URL}/documentos/${id}/view`,
  getDownloadUrl: (id) => `${API_URL}/documentos/${id}/download`,
};
