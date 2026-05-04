/**
 * API de Notificaciones
 * Sistema de alertas in-app
 */

import { API_URL, fetchAPI } from './config.js';

const API_BASE = `${API_URL}/notificaciones`;

export const NotificacionesAPI = {
  /**
   * Lista las notificaciones del usuario
   */
  async listar(soloNoLeidas = false, limite = 50) {
    const params = new URLSearchParams();
    if (soloNoLeidas) params.append('solo_no_leidas', 'true');
    params.append('limite', limite);
    return fetchAPI(`${API_BASE}/?${params}`);
  },

  /**
   * Obtiene estadísticas de notificaciones
   */
  async getStats() {
    return fetchAPI(`${API_BASE}/stats`);
  },

  /**
   * Obtiene una notificación específica
   */
  async obtener(notificacionId) {
    return fetchAPI(`${API_BASE}/${notificacionId}`);
  },

  /**
   * Marca una notificación como leída
   */
  async marcarLeida(notificacionId, leida = true) {
    return fetchAPI(`${API_BASE}/${notificacionId}/marcar-leida`, {
      method: 'PUT',
      body: JSON.stringify({ leida })
    });
  },

  /**
   * Marca todas las notificaciones como leídas
   */
  async marcarTodasLeidas() {
    return fetchAPI(`${API_BASE}/marcar-todas-leidas`, {
      method: 'POST'
    });
  },

  /**
   * Elimina una notificación
   */
  async eliminar(notificacionId) {
    return fetchAPI(`${API_BASE}/${notificacionId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Verifica notificaciones pendientes (para el badge)
   */
  async checkPendientes() {
    return fetchAPI(`${API_BASE}/check/pendientes`);
  },

  /**
   * Limpia notificaciones leídas antiguas
   */
  async limpiarLeidas(diasRetencion = 30) {
    return fetchAPI(`${API_BASE}/limpiar-leidas?dias_retencion=${diasRetencion}`, {
      method: 'POST'
    });
  },

  /**
   * Enviar alertas a investigadores con CVLAC desactualizado (admin)
   */
  async alertarCVLACDesactualizados() {
    return fetchAPI(`${API_BASE}/cvlac/alertar-desactualizados`, {
      method: 'POST'
    });
  },

  /**
   * Obtener lista de investigadores con CVLAC pendiente (admin)
   */
  async getCVLACPendientes() {
    return fetchAPI(`${API_BASE}/cvlac/pendientes`);
  }
};
