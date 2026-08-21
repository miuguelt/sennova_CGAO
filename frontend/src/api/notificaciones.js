/**
 * API de Notificaciones
 * Sistema de alertas in-app
 */

import { fetchAPI } from './config';

const API_BASE = '/notificaciones';

export const NotificacionesAPI = {
  /**
   * Lista las notificaciones del usuario
   */
  async listar(filter = false, limite = 50, skip = 0) {
    const params = new URLSearchParams();
    if (filter === true || filter === 'no_leidas') {
      params.append('solo_no_leidas', 'true');
    } else if (filter === 'leidas' || (typeof filter === 'object' && filter?.leida === true)) {
      params.append('leida', 'true');
    } else if (typeof filter === 'object' && filter !== null) {
      if (filter.solo_no_leidas) params.append('solo_no_leidas', 'true');
      if (filter.leida !== undefined) params.append('leida', String(filter.leida));
    }
    params.append('limite', limite);
    if (skip > 0) params.append('skip', skip);
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
  },

  /**
   * Envía un mensaje o notificación directa a un usuario
   */
  async enviarMensaje(data) {
    return fetchAPI(`${API_BASE}/enviar-mensaje`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Crea una notificación de sistema (admin)
   */
  async crearSistema(userId, titulo, mensaje, prioridad = 'normal', entidadTipo = null, entidadId = null) {
    const params = new URLSearchParams({
      user_id: userId,
      titulo,
      mensaje,
      prioridad
    });
    if (entidadTipo) params.append('entidad_tipo', entidadTipo);
    if (entidadId) params.append('entidad_id', entidadId);
    return fetchAPI(`${API_BASE}/crear-sistema?${params}`, {
      method: 'POST'
    });
  },

  // Alias universales en inglés
  list: (soloNoLeidas = false, limite = 50) => NotificacionesAPI.listar(soloNoLeidas, limite),
  get: (id) => NotificacionesAPI.obtener(id),
  delete: (id) => NotificacionesAPI.eliminar(id),
  markAsRead: (id, leida = true) => NotificacionesAPI.marcarLeida(id, leida),
  markAllAsRead: () => NotificacionesAPI.marcarTodasLeidas(),
  cleanRead: (dias = 30) => NotificacionesAPI.limpiarLeidas(dias),
  sendMessage: (data) => NotificacionesAPI.enviarMensaje(data)
};
