import { fetchAPI } from './config';

/**
 * Servicio de Auditoría y Trazabilidad (Solo Admin)
 */
export const AuditAPI = {
  /**
   * Obtiene los logs técnicos de mutaciones (POST, PUT, DELETE)
   */
  getLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/audit/logs?${query}`);
  },

  /**
   * Obtiene el historial de actividades de usuarios
   */
  getActividades: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/audit/actividades?${query}`);
  },

  /**
   * Obtiene estadísticas de auditoría
   */
  getStats: () => fetchAPI('/audit/stats'),
};
