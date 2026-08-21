import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TAB_VARIANTS = {
  emerald: {
    container: 'bg-slate-50/90 border-b border-slate-200',
    activeTab: 'text-emerald-800 border-b-2 border-emerald-600 bg-white shadow-xs font-black',
    inactiveTab: 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 font-bold',
    activeBadge: 'bg-emerald-100 text-emerald-900',
    inactiveBadge: 'bg-slate-200 text-slate-800',
    fadeBg: 'from-slate-50',
  },
  sena: {
    container: 'bg-emerald-50/50 border-b border-emerald-200',
    activeTab: 'text-emerald-900 border-b-2 border-emerald-700 bg-white shadow-xs font-black',
    inactiveTab: 'text-slate-700 hover:text-slate-950 hover:bg-white/80 font-bold',
    activeBadge: 'bg-emerald-100 text-emerald-900',
    inactiveBadge: 'bg-slate-200 text-slate-800',
    fadeBg: 'from-emerald-50',
  },
  indigo: {
    container: 'bg-indigo-50/40 border-b border-indigo-200',
    activeTab: 'text-indigo-900 border-b-2 border-indigo-700 bg-white shadow-xs font-black',
    inactiveTab: 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80 font-bold',
    activeBadge: 'bg-indigo-100 text-indigo-900',
    inactiveBadge: 'bg-slate-200 text-slate-800',
    fadeBg: 'from-indigo-50',
  },
  clean: {
    container: 'bg-white border-b border-slate-200',
    activeTab: 'text-slate-950 border-b-2 border-slate-950 bg-white shadow-xs font-black',
    inactiveTab: 'text-slate-600 hover:text-slate-950 hover:bg-slate-50 font-bold',
    activeBadge: 'bg-slate-900 text-white',
    inactiveBadge: 'bg-slate-200 text-slate-800',
    fadeBg: 'from-white',
  },
  pills: {
    container: 'bg-slate-100 p-1 rounded-2xl border border-slate-200',
    activeTab: 'bg-white text-emerald-800 shadow-sm font-black rounded-xl',
    inactiveTab: 'text-slate-600 hover:text-slate-950 font-bold rounded-xl',
    activeBadge: 'bg-emerald-100 text-emerald-900',
    inactiveBadge: 'bg-slate-200 text-slate-800',
    fadeBg: 'from-slate-100',
  }
};

const TAB_SIZES = {
  sm: 'px-3 py-2 text-[10px] sm:text-[11px] gap-1.5',
  md: 'px-3.5 sm:px-4 py-2.5 sm:py-3 text-[11px] sm:text-xs gap-2',
  lg: 'px-4 sm:px-5 py-3 sm:py-3.5 text-xs sm:text-sm gap-2.5',
};

/**
 * ScrollableTabs — Componente de pestañas con navegación asistida por desbordamiento.
 * Resuelve el corte visual en resoluciones pequeñas y permite desplazamiento fluido
 * mediante botones, arrastre o rueda del mouse.
 */
export const ScrollableTabs = ({
  tabs = [],
  activeTab,
  onTabChange,
  variant = 'emerald',
  size = 'md',
  showControls = true,
  className = '',
  tabClassName = '',
  ariaLabel = 'Pestañas de navegación',
}) => {
  const containerRef = useRef(null);
  const tabRefs = useRef(new Map());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);

  const style = TAB_VARIANTS[variant] || TAB_VARIANTS.emerald;
  const sizeCls = TAB_SIZES[size] || TAB_SIZES.md;

  const updateScrollState = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const isOverflowing = scrollWidth > clientWidth + 2;
    setHasOverflow(isOverflowing);
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => updateScrollState();
    el.addEventListener('scroll', handleScroll, { passive: true });

    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => updateScrollState());
      resizeObserver.observe(el);
      Array.from(el.children).forEach((child) => resizeObserver.observe(child));
    }

    const handleWindowResize = () => updateScrollState();
    window.addEventListener('resize', handleWindowResize);

    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [tabs, updateScrollState]);

  // Centrar suavemente la pestaña activa al cambiar
  useEffect(() => {
    if (!activeTab) return;
    const tabEl = tabRefs.current.get(activeTab);
    if (tabEl && containerRef.current) {
      const container = containerRef.current;
      const tabRect = tabEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Si la pestaña está fuera o cerca del borde visible, hacer scroll
      if (tabRect.left < containerRect.left + 30 || tabRect.right > containerRect.right - 30) {
        tabEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [activeTab]);

  // Soporte de rueda del mouse para desplazamiento horizontal sin requerir tecla Shift
  const handleWheel = (e) => {
    const el = containerRef.current;
    if (!el || !hasOverflow) return;

    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollBy({
        left: e.deltaY * 1.2,
        behavior: 'auto',
      });
      updateScrollState();
    }
  };

  const scrollByAmount = (amount) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({
      left: amount,
      behavior: 'smooth',
    });
  };

  if (!tabs || tabs.length === 0) return null;

  return (
    <div className={`relative flex items-center group/tabs-wrapper ${style.container} ${className}`}>
      {/* Botón de desplazamiento hacia la izquierda */}
      {showControls && hasOverflow && (
        <div
          className={`absolute left-0 top-0 bottom-0 z-10 flex items-center pr-4 pl-1 bg-gradient-to-r ${style.fadeBg} via-${style.fadeBg} to-transparent transition-opacity duration-200 pointer-events-none ${
            canScrollLeft ? 'opacity-100 pointer-events-auto' : 'opacity-0'
          }`}
        >
          <button
            type="button"
            onClick={() => scrollByAmount(-180)}
            aria-label="Desplazar pestañas hacia la izquierda"
            className="p-1 rounded-lg bg-white shadow-md border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-95"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      )}

      {/* Contenedor desplazable de pestañas */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        role="tablist"
        aria-label={ariaLabel}
        className="flex items-center w-full overflow-x-auto scrollbar-none px-2 sm:px-4 gap-1.5 py-1 scroll-smooth"
      >
        {tabs.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          const isPills = variant === 'pills';
          const tabRounded = isPills ? 'rounded-xl' : 'rounded-t-xl';

          return (
            <button
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el);
                else tabRefs.current.delete(tab.id);
              }}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              disabled={tab.disabled}
              onClick={() => onTabChange && onTabChange(tab.id)}
              className={`flex items-center shrink-0 tracking-wider uppercase whitespace-nowrap transition-all select-none ${sizeCls} ${tabRounded} ${
                isActive ? style.activeTab : style.inactiveTab
              } ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${tabClassName}`}
              title={tab.label}
            >
              {TabIcon && <TabIcon size={size === 'sm' ? 13 : 15} className="shrink-0" />}
              <span className="truncate">{tab.label}</span>
              {typeof tab.count !== 'undefined' && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ml-0.5 shrink-0 ${
                    isActive ? style.activeBadge : style.inactiveBadge
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Botón de desplazamiento hacia la derecha */}
      {showControls && hasOverflow && (
        <div
          className={`absolute right-0 top-0 bottom-0 z-10 flex items-center pl-4 pr-1 bg-gradient-to-l ${style.fadeBg} via-${style.fadeBg} to-transparent transition-opacity duration-200 pointer-events-none ${
            canScrollRight ? 'opacity-100 pointer-events-auto' : 'opacity-0'
          }`}
        >
          <button
            type="button"
            onClick={() => scrollByAmount(180)}
            aria-label="Desplazar pestañas hacia la derecha"
            className="p-1 rounded-lg bg-white shadow-md border border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-95"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ScrollableTabs;
