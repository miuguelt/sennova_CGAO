import React, { useRef, useEffect, useId, useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { useModalStack } from '../../hooks/useModalStack';
import ScrollableTabs from './ScrollableTabs';

const DRAWER_SIZES = {
  md: 'sm:max-w-xl',
  lg: 'sm:max-w-2xl md:max-w-3xl',
  xl: 'sm:max-w-3xl md:max-w-4xl lg:max-w-5xl',
  '2xl': 'sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-7xl',
  '3xl': 'sm:max-w-5xl md:max-w-6xl lg:max-w-7xl xl:max-w-[88vw]',
  full: 'w-full max-w-[96vw] lg:max-w-[95vw]',
};

const DRAWER_VARIANTS = {
  emerald: {
    headerBg: 'bg-gradient-to-br from-emerald-50 via-teal-50/80 to-emerald-100/60 border-b border-emerald-200',
    iconBg: 'bg-emerald-700 text-white shadow-md shadow-emerald-900/20',
    titleColor: 'text-slate-900',
    activeTab: 'text-emerald-800 border-b-2 border-emerald-600 bg-white shadow-sm font-black',
    inactiveTab: 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 font-bold',
  },
  sena: {
    headerBg: 'bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 border-b border-emerald-200',
    iconBg: 'bg-[#1e6800] text-white shadow-md shadow-emerald-950/20',
    titleColor: 'text-slate-900',
    activeTab: 'text-emerald-800 border-b-2 border-emerald-600 bg-white shadow-sm font-black',
    inactiveTab: 'text-slate-600 hover:text-slate-950 hover:bg-white/80 font-bold',
  },
  indigo: {
    headerBg: 'bg-gradient-to-br from-indigo-50 via-blue-50/80 to-indigo-100/60 border-b border-indigo-200',
    iconBg: 'bg-indigo-700 text-white shadow-md shadow-indigo-900/20',
    titleColor: 'text-slate-900',
    activeTab: 'text-indigo-800 border-b-2 border-indigo-600 bg-white shadow-sm font-black',
    inactiveTab: 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 font-bold',
  },
  clean: {
    headerBg: 'bg-white border-b border-slate-200',
    iconBg: 'bg-slate-100 text-slate-900',
    titleColor: 'text-slate-900',
    activeTab: 'text-slate-900 border-b-2 border-slate-900 bg-white shadow-sm font-black',
    inactiveTab: 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 font-bold',
  },
};

/**
 * Componente Drawer / Panel Lateral Estandarizado — SENNOVA CGAO
 * Slide-over profesional con navegación por pestañas limpia, adaptabilidad responsive total,
 * soporte de pila LIFO y cabeceras configurables.
 */
export const Drawer = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  badge,
  headerActions,
  tabs = [],
  activeTab,
  onTabChange,
  size = 'lg',
  variant = 'emerald',
  closeOnEsc = true,
  closeOnBackdrop = true,
  allowExpand = true,
  defaultExpanded = false,
  children,
  footer,
  className = '',
  bodyClassName = '',
  customId,
  ariaLabel
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const { zIndex, isTop } = useModalStack({
    isOpen,
    onClose,
    closeOnEsc,
    customId
  });

  const contentRef = useRef(null);
  const titleId = useId();
  const previouslyFocused = useRef(null);
  const isTopRef = useRef(isTop);
  isTopRef.current = isTop;

  // Focus trap: atrapa el Tab dentro del panel, enfoca al abrir y restaura al cerrar
  useEffect(() => {
    if (!isOpen) return;
    previouslyFocused.current = document.activeElement;
    const node = contentRef.current;
    const getFocusables = () => node
      ? [...node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
          .filter(el => !el.disabled && el.offsetParent !== null)
      : [];
    const closeBtn = node?.querySelector('[aria-label="Cerrar panel"]');
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

  const baseSizeCls = DRAWER_SIZES[size] || DRAWER_SIZES.lg;
  const effectiveSizeCls = isExpanded ? 'w-screen max-w-[98vw] lg:max-w-[95vw]' : `w-screen ${baseSizeCls}`;
  const style = DRAWER_VARIANTS[variant] || DRAWER_VARIANTS.emerald;

  const handleBackdropClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
      aria-label={ariaLabel}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200 animate-fadeIn ${
          isTop ? 'opacity-100' : 'opacity-80'
        }`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Slide-over Container */}
      <div className={`absolute inset-y-0 right-0 flex max-w-full ${isExpanded ? 'pl-0 sm:pl-2' : 'pl-0 sm:pl-10'} transition-all duration-300`}>
        <div
          ref={contentRef}
          className={`${effectiveSizeCls} h-full bg-white shadow-2xl flex flex-col animate-slideInRight border-l border-slate-200/60 relative z-10 transition-all duration-300 ${className}`}
        >
          {/* Header */}
          <div className={`px-6 py-6 sm:px-8 sm:py-7 relative shrink-0 overflow-hidden ${style.headerBg}`}>
            <div className="flex items-start justify-between gap-4 mb-4">
              {Icon && (
                <div className={`p-3.5 rounded-2xl shrink-0 ${style.iconBg}`}>
                  <Icon size={26} />
                </div>
              )}
              
              <div className="flex items-center gap-2 ml-auto">
                {headerActions}
                {allowExpand && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(prev => !prev)}
                    aria-label={isExpanded ? 'Restaurar ancho de panel' : 'Aprovechar ancho de pantalla'}
                    title={isExpanded ? 'Restaurar ancho' : 'Aprovechar ancho completo de la pantalla'}
                    className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl shadow-sm border border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Cerrar panel"
                  className="p-2.5 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl shadow-sm border border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <h2
                id={titleId}
                className={`text-xl sm:text-2xl font-black leading-tight tracking-tight ${style.titleColor}`}
              >
                {title}
              </h2>
              {(badge || subtitle) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {badge}
                  {subtitle && (
                    <span className="text-xs font-bold text-slate-600">{subtitle}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Navegación por Pestañas (ScrollableTabs con controles y auto-scroll) */}
          {tabs.length > 0 && (
            <ScrollableTabs
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={onTabChange}
              variant={variant}
              size="md"
              ariaLabel={`Pestañas de ${title || 'detalle'}`}
            />
          )}

          {/* Cuerpo del Drawer (Scrollable) */}
          <div
            className={`flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 custom-scrollbar bg-white ${bodyClassName}`}
          >
            {children}
          </div>

          {/* Pie del Drawer */}
          {footer && (
            <div className="px-6 py-4 sm:px-8 sm:py-5 border-t border-slate-100 bg-slate-50/70 flex items-center gap-4 shrink-0 pb-safe">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Drawer;
