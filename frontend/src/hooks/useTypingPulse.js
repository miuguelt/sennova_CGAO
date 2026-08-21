import { useCallback, useEffect, useRef } from 'react';
import { MensajesAPI } from '@/api/mensajes';

// Ventana de silencio tras la cual se considera que el usuario dejó de escribir.
export const PULSO_ESCRITURA_MS = 2000;

/**
 * Pulso "escribiendo..." tratado como estado y no como evento por tecla.
 *
 * Emite una sola notificación al encender el pulso y otra al apagarlo tras el
 * silencio: escribir una frase deja de significar una petición por pulsación.
 */
export function useTypingPulse(destinatarioId, { ventanaSilencioMs = PULSO_ESCRITURA_MS } = {}) {
  const activoRef = useRef(false);
  const timerRef = useRef(null);
  const destinatarioRef = useRef(destinatarioId);

  useEffect(() => {
    destinatarioRef.current = destinatarioId;
  }, [destinatarioId]);

  const emitir = useCallback((id, activo) => {
    if (!id) return;
    try {
      MensajesAPI.notificarTyping?.(id, activo)?.catch?.(() => {});
    } catch (_) {
      // El pulso es informativo: su fallo nunca debe interrumpir la escritura
    }
  }, []);

  const detenerPulso = useCallback(() => {
    clearTimeout(timerRef.current);
    if (!activoRef.current) return;
    activoRef.current = false;
    emitir(destinatarioRef.current, false);
  }, [emitir]);

  const registrarPulsacion = useCallback(() => {
    const id = destinatarioRef.current;
    if (!id) return;

    if (!activoRef.current) {
      activoRef.current = true;
      emitir(id, true);
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      activoRef.current = false;
      emitir(id, false);
    }, ventanaSilencioMs);
  }, [emitir, ventanaSilencioMs]);

  // El pulso pertenece a una conversación: al cambiar de chat o desmontar se apaga
  useEffect(() => () => {
    clearTimeout(timerRef.current);
    activoRef.current = false;
  }, [destinatarioId]);

  return { registrarPulsacion, detenerPulso };
}
