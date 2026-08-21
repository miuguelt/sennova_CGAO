export const DATA_REFRESH_EVENT = 'sennova:data-refresh';

// Rutas con canal de sincronización propio. El refresco global remonta la vista
// activa, y en mensajería el propio uso dispara mutaciones (marcar leídos, pulso
// de escritura, envío): remontar cerraba el chat recién abierto. Estas rutas se
// sincronizan por SSE y por sus recargas locales, no por el remonte de la vista.
const RUTAS_CON_CANAL_PROPIO = ['/mensajes'];

/**
 * Indica si el endpoint mantiene su propia estrategia de sincronización.
 */
export function tieneCanalPropio(endpoint) {
  const ruta = String(endpoint || '').replace(/^https?:\/\/[^/]+/i, '');
  return RUTAS_CON_CANAL_PROPIO.some(
    (base) => ruta === base || ruta.startsWith(`${base}/`) || ruta.startsWith(`${base}?`)
  );
}

/**
 * Notifica que una mutación ya fue confirmada por el backend.
 * Las vistas no deben asumir que su estado local es la fuente de verdad.
 */
export function emitDataRefresh(detail = {}) {
  if (typeof window === 'undefined') return;
  if (tieneCanalPropio(detail.endpoint)) return;

  window.dispatchEvent(new CustomEvent(DATA_REFRESH_EVENT, {
    detail: {
      endpoint: detail.endpoint || '',
      method: detail.method || 'UNKNOWN',
      force: true,
      at: Date.now(),
    },
  }));
}

export function subscribeToDataRefresh(listener) {
  if (typeof window === 'undefined') return () => {};

  const handleRefresh = (event) => listener(event.detail || {});
  window.addEventListener(DATA_REFRESH_EVENT, handleRefresh);

  return () => window.removeEventListener(DATA_REFRESH_EVENT, handleRefresh);
}
