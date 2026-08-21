import { useState, useCallback } from 'react';

/**
 * Hook de guardado asíncrono estandarizado — SENNOVA CGAO
 * Centraliza el estado de envío (spinner), el manejo de errores y el
 * feedback inline que cada formulario debe ofrecer.
 *
 * Uso:
 *   const { saving, error, save } = useAsyncSave(handler, { onSuccess });
 *   <Button disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
 */
export const useAsyncSave = (handler, { onSuccess, onError } = {}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = useCallback(async (...args) => {
    setSaving(true);
    setError('');
    try {
      const result = await handler(...args);
      onSuccess?.(result);
      return { success: true, result };
    } catch (err) {
      const detail = err?.detail || err?.message || 'Error al guardar. Intenta nuevamente.';
      const message = typeof detail === 'string' ? detail : 'Error al guardar. Intenta nuevamente.';
      setError(message);
      onError?.(message, err);
      return { success: false, error: message };
    } finally {
      setSaving(false);
    }
  }, [handler, onSuccess, onError]);

  return { saving, error, save, setError };
};

export default useAsyncSave;
