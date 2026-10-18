import React from 'react';
import { AlertCircle, AlertTriangle, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';

const VARIANT_CONFIGS = {
  danger: {
    container: 'bg-rose-50 border-rose-200 text-rose-900',
    titleColor: 'text-rose-950',
    messageColor: 'text-rose-800',
    icon: AlertCircle,
    iconColor: 'text-rose-700',
    button: 'bg-rose-700 text-white hover:bg-rose-800 focus-visible:ring-rose-500 shadow-sm shadow-rose-900/10',
    ariaLive: 'assertive',
  },
  warning: {
    container: 'bg-amber-50 border-amber-200 text-amber-900',
    titleColor: 'text-amber-950',
    messageColor: 'text-amber-900',
    icon: AlertTriangle,
    iconColor: 'text-amber-800',
    button: 'bg-amber-800 text-white hover:bg-amber-900 focus-visible:ring-amber-600 shadow-sm shadow-amber-950/10',
    ariaLive: 'polite',
  },
};

/**
 * ErrorBanner — Componente accesible para estados de error en llamadas a API (Contrato C1)
 *
 * @param {Object} props
 * @param {string} [props.title="No fue posible cargar la información"] - Título accesible del mensaje.
 * @param {string} props.message - Detalle o causa amigable del error.
 * @param {Function} [props.onRetry] - Callback opcional para reintentar la acción.
 * @param {'danger' | 'warning'} [props.variant="danger"] - Variante semántica de severidad.
 * @param {string} [props.retryText="Reintentar"] - Texto del botón de acción.
 * @param {string} [props.className=""] - Clases CSS adicionales.
 */
export const ErrorBanner = ({
  title = 'No fue posible cargar la información',
  message,
  onRetry,
  variant = 'danger',
  retryText = 'Reintentar',
  className = '',
}) => {
  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.danger;
  const Icon = config.icon;

  const handleRetry = () => {
    if (typeof onRetry === 'function') {
      onRetry();
    }
  };

  return (
    <div
      role="alert"
      aria-live={config.ariaLive}
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all animate-fadeIn',
        config.container,
        className
      )}
    >
      <div className="flex items-start gap-3.5 flex-1 min-w-0">
        <div className="mt-0.5 flex-shrink-0">
          <Icon size={20} className={config.iconColor} aria-hidden="true" />
        </div>
        <div className="space-y-1 min-w-0">
          {title && (
            <h4 className={cn('text-sm font-black tracking-tight leading-snug', config.titleColor)}>
              {title}
            </h4>
          )}
          {message && (
            <p className={cn('text-xs font-medium leading-relaxed break-words', config.messageColor)}>
              {message}
            </p>
          )}
        </div>
      </div>

      {typeof onRetry === 'function' && (
        <button
          type="button"
          onClick={handleRetry}
          aria-label={`${retryText}: ${title}`}
          className={cn(
            'inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 flex-shrink-0 self-stretch sm:self-auto cursor-pointer',
            config.button
          )}
        >
          <RotateCcw size={14} className="stroke-[2.5]" aria-hidden="true" />
          <span>{retryText}</span>
        </button>
      )}
    </div>
  );
};

export default ErrorBanner;
