import { fetchAPI } from './config';

/**
 * Servicio de Estadísticas y Dashboard
 */
export const StatsAPI = {
  getDashboard: () => fetchAPI('/stats/dashboard'),
  dashboard: () => fetchAPI('/stats/dashboard'),
  
  /**
   * Estadísticas avanzadas para administradores
   */
  getAdmin: () => fetchAPI('/stats/admin'),
  admin: () => fetchAPI('/stats/admin'),
  
  getAnalyticsEvolucion: (meses = 12) => fetchAPI(`/stats/analytics/evolucion?meses=${meses}`),
  analyticsEvolucion: (meses = 12) => fetchAPI(`/stats/analytics/evolucion?meses=${meses}`),
  
  getUserImpact: (userId) => fetchAPI(`/stats/user/${userId}/impact`),
  userImpact: (userId) => fetchAPI(`/stats/user/${userId}/impact`),
  
  globalSearch: (query) => fetchAPI(`/stats/search/global?q=${query}`),
  
  getSemilleroImpact: (id) => fetchAPI(`/stats/semillero/${id}/impact`),
  semilleroImpact: (id) => fetchAPI(`/stats/semillero/${id}/impact`),
  
  // Auditoría (Solo Admin)
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchAPI(`/stats/audit/logs?${query}`);
  },
  
  getAuditSummary: () => fetchAPI('/stats/audit/summary'),
};
