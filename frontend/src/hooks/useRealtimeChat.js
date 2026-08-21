import { useEffect, useRef, useState, useCallback } from 'react';
import { MensajesAPI } from '@/api/mensajes';

/**
 * Hook para comunicación en tiempo real mediante Server-Sent Events (SSE)
 * Proporciona eventos instantáneos (0 ms) con reconexión automática y tolerancia a fallos.
 */
export function useRealtimeChat({
  currentUser,
  selectedUserId,
  onNewMessage,
  onMessagesDelivered,
  onMessagesRead,
  onTypingStatus,
  onMessageDeleted,
}) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // Callbacks refs para evitar reconexiones innecesarias por cambio de referencias
  const callbacksRef = useRef({
    onNewMessage,
    onMessagesDelivered,
    onMessagesRead,
    onTypingStatus,
    onMessageDeleted,
  });

  useEffect(() => {
    callbacksRef.current = {
      onNewMessage,
      onMessagesDelivered,
      onMessagesRead,
      onTypingStatus,
      onMessageDeleted,
    };
  });

  const handleEvent = useCallback((type, data) => {
    const cb = callbacksRef.current;

    switch (type) {
      case 'connected':
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        break;

      case 'mensaje_nuevo':
        cb.onNewMessage?.(data);
        // Despachar evento global para que Navbar u otros componentes actualicen badges
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sennova:mensaje_nuevo', { detail: data }));
        }
        break;

      case 'mensajes_entregados':
        cb.onMessagesDelivered?.(data);
        break;

      case 'mensajes_leidos':
        cb.onMessagesRead?.(data);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sennova:mensajes_leidos', { detail: data }));
        }
        break;

      case 'typing_status':
        cb.onTypingStatus?.(data);
        break;

      case 'mensaje_eliminado':
        cb.onMessageDeleted?.(data);
        break;

      default:
        break;
    }
  }, []);

  const connect = useCallback(() => {
    if (!currentUser?.id) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (typeof MensajesAPI?.connectStream !== 'function') return;

    // Reconexión exponencial, tope de 15 s
    const reintentar = () => {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 15000);
      reconnectAttemptsRef.current += 1;

      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    };

    const es = MensajesAPI.connectStream(
      handleEvent,
      (err) => {
        setIsConnected(false);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        reintentar();
      },
      () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
      }
    );

    eventSourceRef.current = es;

    // Sin canal (token todavía no disponible o EventSource no soportado):
    // sin este reintento el módulo quedaba sin tiempo real hasta recargar.
    if (!es) {
      setIsConnected(false);
      reintentar();
    }
  }, [currentUser?.id, handleEvent]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  return { isConnected };
}
