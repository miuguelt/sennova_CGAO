import { useState, useEffect, useId, useRef } from 'react';
import modalStack from '../utils/modalStack';

/**
 * Hook para integrar cualquier modal, drawer o diálogo en la pila LIFO centralizada.
 * 
 * @param {Object} options
 * @param {boolean} options.isOpen - Indica si el modal está abierto
 * @param {Function} options.onClose - Función para cerrar el modal
 * @param {boolean} [options.closeOnEsc=true] - Si responde a la tecla Escape
 * @param {number} [options.priority=0] - Prioridad en la pila
 * @param {string} [options.customId] - ID personalizado opcional
 * @returns {{ zIndex: number, isTop: boolean, stackDepth: number, level: number, modalId: string }}
 */
export function useModalStack({
  isOpen,
  onClose,
  closeOnEsc = true,
  priority = 0,
  customId
}) {
  const autoId = useId();
  const modalId = customId || autoId;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [stackInfo, setStackInfo] = useState(() => ({
    zIndex: 100,
    level: 0,
    isTop: true,
    stackDepth: 0
  }));

  useEffect(() => {
    if (!isOpen) return;

    const registration = modalStack.push({
      id: modalId,
      onClose: (e) => {
        if (typeof onCloseRef.current === 'function') {
          onCloseRef.current(e);
        }
      },
      closeOnEsc,
      priority
    });

    const updateFromStack = () => {
      const zIndex = modalStack.calculateZIndex(modalId);
      const isTop = modalStack.isTop(modalId);
      const stackDepth = modalStack.getDepth();
      const level = registration.level;
      setStackInfo({ zIndex, isTop, stackDepth, level });
    };

    updateFromStack();

    const unsubscribe = modalStack.subscribe(() => {
      updateFromStack();
    });

    return () => {
      unsubscribe();
      modalStack.pop(modalId);
    };
  }, [isOpen, modalId, closeOnEsc, priority]);

  return {
    ...stackInfo,
    modalId
  };
}

export default useModalStack;
