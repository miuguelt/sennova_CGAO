import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';
import { useModalStack } from '../../hooks/useModalStack';

const SIZE_CLASSES = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  full: 'max-w-7xl',
};

const VARIANT_HEADER_STYLES = {
  default: {
    bg: 'bg-gradient-to-r from-slate-900 to-slate-950',
    text: 'text-white',
    subtitle: 'text-slate-200 font-semibold',
    iconBg: 'bg-white/15 text-white',
    closeBtn: 'text-slate-200 hover:text-white hover:bg-white/20',
  },
  emerald: {
    bg: 'bg-gradient-to-r from-emerald-700 to-teal-800',
    text: 'text-white',
    subtitle: 'text-emerald-100 font-semibold',
    iconBg: 'bg-white/20 text-white',
    closeBtn: 'text-emerald-100 hover:text-white hover:bg-white/20',
  },
  sena: {
    bg: 'bg-gradient-to-r from-[#175200] to-[#257c00]',
    text: 'text-white',
    subtitle: 'text-emerald-100 font-semibold',
    iconBg: 'bg-white/20 text-white',
    closeBtn: 'text-white/90 hover:text-white hover:bg-white/20',
  },
  indigo: {
    bg: 'bg-gradient-to-r from-indigo-700 to-blue-800',
    text: 'text-white',
    subtitle: 'text-indigo-100 font-semibold',
    iconBg: 'bg-white/20 text-white',
    closeBtn: 'text-indigo-100 hover:text-white hover:bg-white/20',
  },
  danger: {
    bg: 'bg-gradient-to-r from-rose-700 to-red-800',
    text: 'text-white',
    subtitle: 'text-rose-100 font-semibold',
    iconBg: 'bg-white/20 text-white',
    closeBtn: 'text-rose-100 hover:text-white hover:bg-white/20',
  },
  warning: {
    bg: 'bg-gradient-to-r from-amber-700 to-orange-800',
    text: 'text-white',
    subtitle: 'text-amber-100 font-semibold',
    iconBg: 'bg-white/20 text-white',
    closeBtn: 'text-amber-100 hover:text-white hover:bg-white/20',
  },
  clean: {
    bg: 'bg-white border-b border-slate-200',
    text: 'text-slate-900 font-black',
    subtitle: 'text-slate-600 font-semibold',
    iconBg: 'bg-slate-100 text-slate-800',
    closeBtn: 'text-slate-600 hover:text-slate-950 hover:bg-slate-100',
  },
};

/**
 * Componente Modal Estandarizado — SENNOVA CGAO
 * Soporta apilamiento LIFO, adaptabilidad responsive en móviles y escritorio,
 * cabeceras enriquecidas y cierre ordenado.
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  badge,
  size = 'md',
  variant = 'emerald',
  closeOnEsc = true,
  closeOnBackdrop = true,
  showCloseButton = true,
  children,
  footer,
  className = '',
  bodyClassName = '',
  headerClassName = '',
  customId,
  ariaLabel
}) => {
  const { zIndex, isTop } = useModalStack({
    isOpen,
    onClose,
    closeOnEsc,
    customId
  });

  const modalRef = useRef(null);
  const titleId = useId();
  const previouslyFocused = useRef(null);
  const isTopRef = useRef(isTop);
  isTopRef.current = isTop;

  // Focus trap: atrapa el Tab dentro del modal, enfoca al abrir y restaura al cerrar
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement;
    const node = modalRef.current;
    const getFocusables = () => node
      ? [...node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
          .filter(el => !el.disabled && el.offsetParent !== null)
      : [];
    const closeBtn = node?.querySelector('[aria-label="Cerrar ventana modal"]');
    (closeBtn || getFocusables()[0] || node)?.focus?.();

    const onKeyDown = (e) => {
      if (e.key !== 'Tab' || !isTopRef.current) return;
      const els = getFocusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeCls = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const headerStyle = VARIANT_HEADER_STYLES[variant] || VARIANT_HEADER_STYLES.emerald;

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={ariaLabel}
    >
      {/* Backdrop con desenfoque dinámico */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200 animate-fadeIn ${
          isTop ? 'opacity-100' : 'opacity-80'
        }`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Contenedor del Modal */}
      <div
        ref={modalRef}
        className={`w-full ${sizeCls} bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col relative z-10 max-h-[92vh] sm:max-h-[88vh] border-0 sm:border sm:border-slate-100 animate-scaleIn my-auto transition-transform ${className}`}
      >
        {/* Cabecera Estandarizada */}
        {(title || Icon || showCloseButton) && (
          <div
            className={`px-6 py-5 sm:px-8 sm:py-6 relative shrink-0 flex items-center justify-between gap-4 ${headerStyle.bg} ${headerClassName}`}
          >
            <div className="flex items-center gap-3.5 min-w-0 pr-6">
              {Icon && (
                <div className={`p-2.5 rounded-2xl shrink-0 shadow-sm ${headerStyle.iconBg}`}>
                  <Icon size={22} />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {title && (
                    <h2
                      id={titleId}
                      className={`text-lg sm:text-xl font-black leading-tight tracking-tight truncate ${headerStyle.text}`}
                    >
                      {title}
                    </h2>
                  )}
                  {badge && (
                    <span className="shrink-0">{badge}</span>
                  )}
                </div>
                {subtitle && (
                  <p className={`text-xs font-semibold tracking-wide mt-0.5 truncate ${headerStyle.subtitle}`}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar ventana modal"
                className={`p-2 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-white/40 shrink-0 ${headerStyle.closeBtn}`}
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Cuerpo del Modal (Scrollable) */}
        <div
          className={`p-5 sm:p-8 space-y-6 flex-1 overflow-y-auto custom-scrollbar bg-white ${bodyClassName}`}
        >
          {children}
        </div>

        {/* Pie de Acciones Estandarizado */}
        {footer && (
          <div className="px-6 py-4 sm:px-8 sm:py-4 bg-slate-50 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end items-stretch sm:items-center gap-3 shrink-0 pb-safe">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
