import { fetchAPI } from './config';

const API_BASE = '/mensajes';

/**
 * Cliente API de Mensajería Interna
 * Soporte para comunicación entre todos los roles (Admin, Investigadores, Aprendices)
 */
export const MensajesAPI = {
  /**
   * Obtiene la lista resumida de conversaciones del usuario
   */
  getConversaciones: async () => {
    return fetchAPI(`${API_BASE}/conversaciones`);
  },

  /**
   * Obtiene el historial de mensajes de la conversación con otro usuario
   */
  getConversacion: async (otroUsuarioId, skip = 0, limit = 100) => {
    return fetchAPI(`${API_BASE}/conversacion/${otroUsuarioId}?skip=${skip}&limit=${limit}`);
  },

  /**
   * Marca como leídos todos los mensajes recibidos de otro usuario
   */
  marcarLeidos: async (otroUsuarioId) => {
    return fetchAPI(`${API_BASE}/conversacion/${otroUsuarioId}/marcar-leidos`, {
      method: 'POST',
    });
  },

  /**
   * Envía un nuevo mensaje directo o anuncio
   */
  enviar: async ({ destinatario_id, contenido, asunto = null, es_anuncio = false }) => {
    return fetchAPI(API_BASE, {
      method: 'POST',
      body: JSON.stringify({
        destinatario_id,
        contenido,
        asunto,
        es_anuncio,
      }),
    });
  },

  /**
   * Obtiene estadísticas de mensajería (total recibidos, no leídos, total enviados)
   */
  getStats: async () => {
    return fetchAPI(`${API_BASE}/stats`);
  },

  /**
   * Conteo ligero de mensajes no leídos para badges en tiempo real
   */
  getUnreadCount: async () => {
    return fetchAPI(`${API_BASE}/unread-count`);
  },

  /**
   * Lista el directorio de usuarios disponibles para iniciar conversación
   */
  getDestinatarios: async (search = '', rol = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (rol) params.append('rol', rol);
    const qs = params.toString();
    return fetchAPI(`${API_BASE}/destinatarios${qs ? `?${qs}` : ''}`);
  },

  /**
   * Elimina un mensaje por su ID
   */
  eliminar: async (mensajeId) => {
    return fetchAPI(`${API_BASE}/${mensajeId}`, {
      method: 'DELETE',
    });
  },
};
