import { useCallback, useRef, useState } from 'react';
import { MensajesAPI } from '@/api/mensajes';

/**
 * Adjuntos que esperan a ser enviados con el próximo mensaje.
 *
 * El archivo se sube en cuanto se elige, así el envío solo transporta
 * identificadores y el usuario ve de inmediato si el servidor lo rechaza.
 * Quitar un adjunto también lo descarta en el servidor, para no dejar archivos
 * huérfanos ocupando disco.
 */
export function useMessageAttachments({ onNotify } = {}) {
  const [pendientes, setPendientes] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef(null);

  const agregarArchivos = useCallback(async (archivos) => {
    const lista = Array.from(archivos || []);
    if (lista.length === 0) return;

    setSubiendo(true);
    for (const archivo of lista) {
      try {
        const subido = await MensajesAPI.subirAdjunto(archivo);
        if (subido?.id) setPendientes((prev) => [...prev, subido]);
      } catch (err) {
        onNotify?.(err.message || `No se pudo subir ${archivo.name}`, 'error');
      }
    }
    setSubiendo(false);
    if (inputRef.current) inputRef.current.value = '';
  }, [onNotify]);

  const quitar = useCallback(async (adjunto) => {
    setPendientes((prev) => prev.filter((a) => a.id !== adjunto.id));
    try {
      await MensajesAPI.eliminarAdjunto(adjunto.id);
    } catch (err) {
      // El adjunto ya salió de la bandeja; su limpieza en servidor no es crítica
      console.warn('No se pudo descartar el adjunto en el servidor:', err?.message);
    }
  }, []);

  const limpiar = useCallback(() => setPendientes([]), []);

  const abrirSelector = useCallback(() => inputRef.current?.click(), []);

  return {
    adjuntos: pendientes,
    ids: pendientes.map((a) => a.id),
    subiendo,
    inputRef,
    agregarArchivos,
    quitar,
    limpiar,
    abrirSelector,
  };
}
