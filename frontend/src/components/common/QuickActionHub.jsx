import React, { useEffect, useRef } from 'react';
import {
  FolderPlus, UserPlus, Award, Calendar, FilePlus,
  Zap, X, Command, ChevronRight, LayoutGrid,
} from 'lucide-react';

const ACTIONS = [
  { id: 'new-project', label: 'Nuevo Proyecto',       desc: 'Iniciar formulación SGPS',          Icon: FolderPlus, iconCls: 'bg-blue-50 text-blue-600',    module: 'proyectos',      form: 'create' },
  { id: 'new-product', label: 'Reportar Producto',     desc: 'Artículos, software o prototipos',  Icon: Award,      iconCls: 'bg-amber-50 text-amber-600',   module: 'productos',      form: 'create' },
  { id: 'new-user',    label: 'Invitar Investigador',  desc: 'Añadir talento al centro',          Icon: UserPlus,   iconCls: 'bg-emerald-50 text-emerald-700',module: 'investigadores', form: 'create' },
  { id: 'new-call',    label: 'Crear Convocatoria',    desc: 'Abrir nueva línea de fomento',      Icon: Calendar,   iconCls: 'bg-rose-50 text-rose-600',     module: 'convocatorias',  form: 'create' },
  { id: 'upload-doc',  label: 'Subir Documento',       desc: 'Actas, contratos o guías',          Icon: FilePlus,   iconCls: 'bg-indigo-50 text-indigo-600', module: 'documentos',     form: 'upload' },
];

const QuickActionHub = ({ isOpen, onClose, onAction }) => {
  const firstBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    setTimeout(() => firstBtnRef.current?.focus(), 80);

    const onKeydown = (e) => {
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKeydown);

    return () => {
      window.removeEventListener('keydown', onKeydown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Centro de acción rápida"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="w-full sm:max-w-xl bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slideUp sm:animate-scaleIn border-0 sm:border sm:border-slate-200 relative z-10 flex flex-col">

        {/* Header */}
        <div className="px-6 pt-7 pb-5 sm:py-5 border-b border-slate-100 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <Zap size={15} fill="currentColor" aria-hidden="true" />
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest">Centro de Acción Rápida</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight tracking-tight">¿Qué deseas gestionar?</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
            className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-700 focus-visible:outline-none flex-shrink-0"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action grid */}
        <div className="p-4 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[70vh] overflow-y-auto scrollbar-thin pb-10 sm:pb-4">
          {ACTIONS.map(({ id, label, desc, Icon, iconCls, module: mod, form }, idx) => (
            <button
              key={id}
              ref={idx === 0 ? firstBtnRef : undefined}
              onClick={() => { onAction({ id, label, module: mod, form }); onClose(); }}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors group text-left focus-visible:outline-none"
            >
              <div className={`p-3.5 rounded-xl ${iconCls} flex-shrink-0 transition-transform group-hover:scale-105`}>
                <Icon size={24} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-emerald-800 transition-colors">{label}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{desc}</p>
              </div>
              <ChevronRight
                size={16}
                className="text-slate-300 group-hover:text-emerald-500 flex-shrink-0 transition-all group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between pb-safe">
          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-bold border border-slate-300" aria-hidden="true">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-bold border border-slate-300" aria-hidden="true">J</kbd>
              <span>para abrir</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest mx-auto sm:mx-0">
            <LayoutGrid size={13} aria-hidden="true" />
            <span>SISTEMA SENNOVA CGAO</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActionHub;
