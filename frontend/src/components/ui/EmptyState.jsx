import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Empty State Estandarizado — SENNOVA CGAO (Requisito R3)
 * Consistencia visual para estados vacíos: contenedor semántico, mensaje claro y acción opcional.
 */
export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) => (
  <div
    role="region"
    aria-label={title}
    className={cn(
      'py-16 px-6 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200 transition-all',
      className
    )}
  >
    {Icon && (
      <Icon
        size={40}
        className="mx-auto text-slate-400 mb-3 shrink-0"
        aria-hidden="true"
      />
    )}
    <h3 className="text-sm font-black text-slate-800 leading-snug">{title}</h3>
    {description && (
      <p className="text-xs font-medium text-slate-600 mt-1 max-w-sm mx-auto leading-relaxed">
        {description}
      </p>
    )}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
