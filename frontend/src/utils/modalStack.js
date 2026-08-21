/**
 * ModalStack Manager — SENNOVA CGAO
 * Sistema centralizado de gestión de modales y paneles en pila (LIFO).
 * - Controla apertura y cierre apilado.
 * - Maneja el cálculo dinámico de z-index para capas superpuestas.
 * - Intercepta la tecla Escape para cerrar únicamente el elemento superior de la pila.
 * - Bloquea y restaura el scroll del body con conteo de referencias atómico.
 */

class ModalStackManager {
  constructor() {
    this.stack = [];
    this.listeners = new Set();
    this.bodyLockCount = 0;
    this.originalBodyOverflow = '';
    this.originalPaddingRight = '';
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  /**
   * Registra un modal o drawer en la pila activa
   * @param {Object} options
   * @param {string} options.id - Identificador único
   * @param {Function} options.onClose - Callback de cierre
   * @param {boolean} [options.closeOnEsc=true] - Si responde a la tecla Escape
   * @param {number} [options.priority=0] - Prioridad adicional si se requiere
   * @returns {{ zIndex: number, level: number, unregister: Function }}
   */
  push({ id, onClose, closeOnEsc = true, priority = 0 }) {
    // Si ya existía, remover antes de re-apilar
    this.remove(id, false);

    const level = this.stack.length;
    const item = { id, onClose, closeOnEsc, priority, level, timestamp: Date.now() };
    this.stack.push(item);

    this.lockBodyScroll();

    if (this.stack.length === 1 && typeof window !== 'undefined') {
      window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    }

    this.notify();

    const zIndex = this.calculateZIndex(id);
    return {
      zIndex,
      level,
      unregister: () => this.pop(id)
    };
  }

  /**
   * Desapila un modal específico o el superior
   */
  pop(id) {
    this.remove(id, true);
  }

  remove(id, shouldUnlock = true) {
    const idx = this.stack.findIndex(m => m.id === id);
    if (idx === -1) return;

    this.stack.splice(idx, 1);

    if (shouldUnlock) {
      this.unlockBodyScroll();
    }

    if (this.stack.length === 0 && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    }

    this.notify();
  }

  /**
   * Calcula el z-index de un modal según su posición en la pila
   * Base: 100, Incremento: 20 por cada capa anidada
   */
  calculateZIndex(id) {
    const index = this.stack.findIndex(m => m.id === id);
    if (index === -1) return 100;
    return 100 + (index * 20);
  }

  /**
   * Obtiene la copia de elementos en la pila
   */
  getStack() {
    return [...this.stack];
  }

  /**
   * Obtiene la cantidad de elementos en la pila
   */
  getDepth() {
    return this.stack.length;
  }

  /**
   * Obtiene el elemento que se encuentra arriba del todo
   */
  getTop() {
    return this.stack[this.stack.length - 1] || null;
  }

  /**
   * Verifica si un modal es el superior activo
   */
  isTop(id) {
    const top = this.getTop();
    return top ? top.id === id : false;
  }

  /**
   * Manejador de teclado para LIFO Escape
   */
  handleKeyDown(event) {
    if (event.key !== 'Escape' && event.key !== 'Esc') return;
    if (this.stack.length === 0) return;

    const topModal = this.getTop();
    if (topModal && topModal.closeOnEsc !== false && typeof topModal.onClose === 'function') {
      event.preventDefault();
      event.stopPropagation();
      topModal.onClose(event);
    }
  }

  /**
   * Bloquea el scroll del body de forma segura
   */
  lockBodyScroll() {
    this.bodyLockCount++;
    if (this.bodyLockCount === 1 && typeof document !== 'undefined' && document.body) {
      this.originalBodyOverflow = document.body.style.overflow;
      this.originalPaddingRight = document.body.style.paddingRight;

      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollBarWidth > 0) {
        document.body.style.paddingRight = `${scrollBarWidth}px`;
      }
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
    }
  }

  /**
   * Desbloquea el scroll del body cuando la pila queda vacía
   */
  unlockBodyScroll() {
    this.bodyLockCount = Math.max(0, this.bodyLockCount - 1);
    if (this.bodyLockCount === 0 && typeof document !== 'undefined' && document.body) {
      document.body.style.overflow = this.originalBodyOverflow || '';
      document.body.style.paddingRight = this.originalPaddingRight || '';
      document.body.classList.remove('modal-open');
    }
  }

  /**
   * Suscripción reactiva para componentes React
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.stack);
      } catch (err) {
        console.error('Error in modalStack listener:', err);
      }
    }
  }
}

export const modalStack = new ModalStackManager();
export default modalStack;
