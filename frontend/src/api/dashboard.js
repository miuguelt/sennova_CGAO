import { fetchAPI } from './config';

/**
 * Servicio de Dashboard y Estadísticas
 */
export const DashboardAPI = {
  // Estadísticas para el dashboard principal
  getStats: () => fetchAPI('/stats/dashboard'),

  // Estadísticas detalladas para admin
  getAdminStats: () => fetchAPI('/stats/admin'),

  // Datos de evolución temporal para analytics
  getAnalyticsEvolucion: (meses = 12) => fetchAPI(`/stats/analytics/evolucion?meses=${meses}`),

  // Datos de impacto de usuario específico
  getUserImpact: (userId) => fetchAPI(`/stats/user/${userId}/impact`),

  // Alias para compatibilidad
  stats: () => fetchAPI('/stats/dashboard'),
  adminStats: () => fetchAPI('/stats/admin'),
  analyticsEvolucion: (meses = 12) => fetchAPI(`/stats/analytics/evolucion?meses=${meses}`),

  globalSearch: (q) => fetchAPI(`/stats/search/global?q=${encodeURIComponent(q)}`),
};
