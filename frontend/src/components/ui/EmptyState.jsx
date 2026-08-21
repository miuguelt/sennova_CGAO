import React from 'react';
import { cn } from '../../lib/utils';

/**
 * Empty State Estandarizado — SENNOVA CGAO
 * Consistencia visual para estados vacíos: mensaje claro + acción opcional.
 */
const EmptyState = ({ icon: Icon, title, description, action, className = '' }) => (
  <div className={cn('py-16 text-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200', className)}>
    {Icon && <Icon size={40} className="mx-auto text-slate-300 mb-3" aria-hidden="true" />}
    <p className="text-sm font-black text-slate-700">{title}</p>
    {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
