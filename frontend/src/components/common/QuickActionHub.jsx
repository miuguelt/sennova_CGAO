import React, { useEffect, useRef } from 'react';
import {
  FolderPlus, UserPlus, Award, Calendar, FilePlus,
  Zap, X, Command, ChevronRight, LayoutGrid, Book,
} from 'lucide-react';
import { useModalStack } from '../../hooks/useModalStack';

const ACTIONS = [
  { id: 'new-project', label: 'Nuevo Proyecto',       desc: 'Iniciar formulación SGPS',          Icon: FolderPlus, iconCls: 'bg-blue-50 text-blue-600',    module: 'proyectos',      form: 'create' },
  { id: 'new-product', label: 'Reportar Producto',     desc: 'Artículos, software o prototipos',  Icon: Award,      iconCls: 'bg-amber-50 text-amber-600',   module: 'productos',      form: 'create' },
  { id: 'new-log',     label: 'Registrar Bitácora',   desc: 'Diario de campo y avances',         Icon: Book,       iconCls: 'bg-indigo-50 text-indigo-600', module: 'bitacora',      form: 'create' },
  { id: 'new-user',    label: 'Invitar Investigador',  desc: 'Añadir talento al centro',          Icon: UserPlus,   iconCls: 'bg-emerald-50 text-emerald-700',module: 'investigadores', form: 'create' },
  { id: 'new-call',    label: 'Crear Convocatoria',    desc: 'Abrir nueva línea de fomento',      Icon: Calendar,   iconCls: 'bg-rose-50 text-rose-600',     module: 'convocatorias',  form: 'create' },
  { id: 'upload-doc',  label: 'Subir Documento',       desc: 'Actas, contratos o guías',          Icon: FilePlus,   iconCls: 'bg-violet-50 text-violet-600', module: 'documentos',     form: 'upload' },
  { id: 'sync-cvlac',  label: 'Sincronizar CVLaC',     desc: 'Actualizar producción científica',  Icon: LayoutGrid, iconCls: 'bg-orange-50 text-orange-600', module: 'perfil',         form: 'cvlac' },
];

const QuickActionHub = ({ isOpen, onClose, onAction }) => {
  const firstBtnRef = useRef(null);

  const { zIndex, isTop } = useModalStack({
    isOpen,
    onClose,
    closeOnEsc: true,
    customId: 'quick-action-hub-dialog'
  });

  useEffect(() => {
    if (!isOpen) return;
    setTimeout(() => firstBtnRef.current?.focus(), 80);

    const onKeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-label="Centro de acción rápida"
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-200 animate-fadeIn ${
          isTop ? 'opacity-100' : 'opacity-80'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="w-full sm:max-w-xl bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl overflow-hidden animate-slideUp sm:animate-scaleIn border-0 sm:border sm:border-slate-200/80 relative z-10 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-7 pb-5 sm:py-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-gradient-to-br from-emerald-50/60 via-white to-white">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 mb-1">
              <Zap size={16} className="fill-emerald-600 text-emerald-600" aria-hidden="true" />
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Centro de Acción Rápida</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight tracking-tight">¿Qué deseas gestionar?</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar panel"
            className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-800 focus-visible:outline-none flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action grid */}
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[65vh] overflow-y-auto custom-scrollbar pb-8 sm:pb-4">
          {ACTIONS.map(({ id, label, desc, Icon, iconCls, module: mod, form }, idx) => (
            <button
              key={id}
              ref={idx === 0 ? firstBtnRef : undefined}
              onClick={() => { onAction({ id, label, module: mod, form }); onClose(); }}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-300 hover:bg-emerald-50/40 transition-all group text-left focus-visible:outline-none hover:shadow-sm"
            >
              <div className={`p-3.5 rounded-2xl ${iconCls} flex-shrink-0 transition-transform group-hover:scale-105 shadow-sm`}>
                <Icon size={22} aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-emerald-800 transition-colors">{label}</p>
                <p className="text-xs text-slate-600 font-medium mt-0.5 line-clamp-1">{desc}</p>
              </div>
              <ChevronRight
                size={16}
                className="text-slate-400 group-hover:text-emerald-700 flex-shrink-0 transition-all group-hover:translate-x-1"
                aria-hidden="true"
              />
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between pb-safe">
          <div className="hidden sm:flex items-center gap-4 text-xs text-slate-600 font-medium">
            <span className="flex items-center gap-1.5 font-bold">
              <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-black border border-slate-300 text-slate-700" aria-hidden="true">Ctrl</kbd>
              <span>+</span>
              <kbd className="px-1.5 py-0.5 bg-slate-200 rounded text-[10px] font-black border border-slate-300 text-slate-700" aria-hidden="true">J</kbd>
              <span>para alternar</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-700 uppercase tracking-widest mx-auto sm:mx-0">
            <LayoutGrid size={14} aria-hidden="true" />
            <span>SISTEMA SENNOVA CGAO</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickActionHub;
