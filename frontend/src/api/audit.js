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

  /**
   * Exporta logs a CSV (retorna la URL del endpoint para descarga directa)
   */
  exportLogsUrl: (tipo) => {
    const token = localStorage.getItem('token');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    return `${apiBase}/audit/export?tipo=${tipo}&token=${token}`;
  },

  /**
   * Ejecuta la limpieza de logs antiguos
   */
  cleanup: (dias) => {
    return fetchAPI(`/audit/cleanup?dias=${dias}`, {
      method: 'POST'
    });
  }
};

