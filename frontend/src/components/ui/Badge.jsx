import React from 'react';

const VARIANTS = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border border-amber-200',
  danger:  'bg-rose-100 text-rose-700 border border-rose-200',
  info:    'bg-sky-100 text-sky-700 border border-sky-200',
  primary: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
  sena:    'bg-[#39A900]/10 text-[#2d8000] border border-[#39A900]/25',
};

const Badge = ({ children, variant = 'default', dot = false, className = '' }) => (
  <span
    className={[
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
      VARIANTS[variant] ?? VARIANTS.default,
      className,
    ].join(' ')}
  >
    {dot && (
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 flex-shrink-0" aria-hidden="true" />
    )}
    {children}
  </span>
);

export default Badge;
