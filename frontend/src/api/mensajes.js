import { fetchAPI, API_URL } from './config';

const API_BASE = '/mensajes';

/**
 * Cliente API de Mensajería Interna en Tiempo Real
 * Soporte completo para confirmaciones de 3 estados (Enviado, Entregado, Leído) y SSE.
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
   * Marca como leídos todos los mensajes recibidos de otro usuario (doble check verde)
   */
  marcarLeidos: async (otroUsuarioId) => {
    return fetchAPI(`${API_BASE}/conversacion/${otroUsuarioId}/marcar-leidos`, {
      method: 'POST',
    });
  },

  /**
   * Marca como entregados todos los mensajes recibidos de otro usuario (doble check gris)
   */
  marcarEntregados: async (otroUsuarioId) => {
    return fetchAPI(`${API_BASE}/conversacion/${otroUsuarioId}/marcar-entregados`, {
      method: 'POST',
    });
  },

  /**
   * Notifica el estado 'escribiendo...' al interlocutor
   */
  notificarTyping: async (destinatarioId, isTyping = true) => {
    return fetchAPI(`${API_BASE}/typing`, {
      method: 'POST',
      body: JSON.stringify({
        destinatario_id: destinatarioId,
        is_typing: Boolean(isTyping),
      }),
    });
  },

  /**
   * Envía un nuevo mensaje directo o anuncio
   */
  enviar: async ({ destinatario_id, contenido = '', asunto = null, es_anuncio = false, adjunto_ids = [] }) => {
    return fetchAPI(API_BASE, {
      method: 'POST',
      body: JSON.stringify({
        destinatario_id,
        contenido,
        asunto,
        es_anuncio,
        adjunto_ids,
      }),
    });
  },

  /**
   * Sube un archivo como adjunto temporal de mensajería
   */
  subirAdjunto: async (file) => {
    const formData = new FormData();
    formData.append('archivo', file);
    return fetchAPI(`${API_BASE}/adjuntos`, {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Descarta un adjunto no enviado
   */
  eliminarAdjunto: async (adjuntoId) => {
    return fetchAPI(`${API_BASE}/adjuntos/${adjuntoId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Obtiene la URL pública autenticada para descargar o previsualizar un adjunto
   */
  urlAdjunto: (adjuntoId) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    let baseUrl = API_URL || '/api';
    if (typeof window !== 'undefined' && baseUrl.startsWith('/')) {
      baseUrl = `${window.location.origin}${baseUrl}`;
    }
    const cleanBase = String(baseUrl || '').replace(/\/+$/, '');
    return `${cleanBase}${API_BASE}/adjuntos/${adjuntoId}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
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
   * Obtiene el perfil básico de un interlocutor para iniciar o ver su chat
   */
  getContacto: async (otroUsuarioId) => {
    return fetchAPI(`${API_BASE}/contacto/${otroUsuarioId}`);
  },

  /**
   * Elimina un mensaje por su ID
   */
  eliminar: async (mensajeId) => {
    return fetchAPI(`${API_BASE}/${mensajeId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Conecta al canal Server-Sent Events (SSE) para recibir eventos asíncronos en tiempo real
   */
  connectStream: (onEvent, onError, onOpen) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return null;

    let baseUrl = API_URL || '/api';
    if (typeof window !== 'undefined' && baseUrl.startsWith('/')) {
      baseUrl = `${window.location.origin}${baseUrl}`;
    }
    const cleanBase = String(baseUrl || '').replace(/\/+$/, '');
    const streamUrl = `${cleanBase}${API_BASE}/stream?token=${encodeURIComponent(token)}`;

    try {
      const eventSource = new EventSource(streamUrl);

      eventSource.onopen = (e) => {
        onOpen?.(e);
      };

      eventSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          onEvent?.('message', data);
        } catch (err) {
          // Ping keepalive
        }
      };

      const eventTypes = [
        'connected',
        'mensaje_nuevo',
        'mensajes_entregados',
        'mensajes_leidos',
        'typing_status',
        'mensaje_eliminado'
      ];

      eventTypes.forEach((type) => {
        eventSource.addEventListener(type, (e) => {
          try {
            const data = JSON.parse(e.data);
            onEvent?.(type, data);
          } catch (err) {
            console.error(`Error procesando evento ${type}:`, err);
          }
        });
      });

      eventSource.onerror = (err) => {
        onError?.(err);
      };

      return eventSource;
    } catch (err) {
      console.error('Error iniciando EventSource SSE:', err);
      onError?.(err);
      return null;
    }
  },

  // Alias universales
  send: async (data) => MensajesAPI.enviar(data),
  delete: async (id) => MensajesAPI.eliminar(id),
  markAsRead: async (otroUsuarioId) => MensajesAPI.marcarLeidos(otroUsuarioId),
  markAsDelivered: async (otroUsuarioId) => MensajesAPI.marcarEntregados(otroUsuarioId),
};

