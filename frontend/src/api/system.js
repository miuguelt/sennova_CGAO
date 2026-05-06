import { fetchAPI } from './config';

/**
 * Servicio de Mantenimiento y Sistema
 */
export const SystemAPI = {
  getBackup: () => fetchAPI('/maintenance/backup'),
  clearCache: () => fetchAPI('/maintenance/clear-cache', { method: 'POST' }),
  getHealth: () => fetchAPI('/health'),
};
