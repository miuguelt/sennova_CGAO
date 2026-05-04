import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const CONFIGS = {
  success: {
    icon: CheckCircle2,
    iconCls: 'text-emerald-600',
    containerCls: 'border-emerald-100 bg-emerald-50',
  },
  error: {
    icon: AlertCircle,
    iconCls: 'text-rose-600',
    containerCls: 'border-rose-100 bg-rose-50',
  },
  info: {
    icon: Info,
    iconCls: 'text-blue-600',
    containerCls: 'border-blue-100 bg-blue-50',
  },
};

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const { icon: Icon, iconCls, containerCls } = CONFIGS[type] ?? CONFIGS.success;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg',
        'animate-slideInRight min-w-[300px] max-w-sm pointer-events-auto',
        containerCls,
      ].join(' ')}
    >
      <Icon size={18} className={`${iconCls} flex-shrink-0`} aria-hidden="true" />
      <p className="flex-1 text-sm font-medium text-slate-800">{message}</p>
      <button
        onClick={onClose}
        aria-label="Cerrar notificación"
        className="p-1 hover:bg-black/10 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 flex-shrink-0"
      >
        <X size={15} className="text-slate-500" />
      </button>
    </div>
  );
};

export default Toast;
