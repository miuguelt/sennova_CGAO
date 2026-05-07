import { fetchAPI } from './config';

/**
 * Servicio de Estadísticas y Dashboard
 */
export const StatsAPI = {
  getDashboard: () => fetchAPI('/stats/dashboard'),
  
  /**
   * Estadísticas avanzadas para administradores
   * Nota: Este endpoint puede estar restringido por el backend
   */
  getAdmin: () => fetchAPI('/stats/admin'),
  
  getAnalyticsEvolucion: (meses = 12) => fetchAPI(`/stats/analytics/evolucion?meses=${meses}`),
  
  getUserImpact: (userId) => fetchAPI(`/stats/user/${userId}/impact`),
  
  globalSearch: (query) => fetchAPI(`/stats/search/global?q=${query}`),
  
  getSemilleroImpact: (id) => fetchAPI(`/stats/semillero/${id}/impact`),
  
  // Auditoría (Solo Admin)
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/stats/audit/logs?${query}`);
  },
  
  getAuditSummary: () => fetchAPI('/stats/audit/summary'),
};
