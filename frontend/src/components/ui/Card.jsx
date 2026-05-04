import React from 'react';

const VARIANTS = {
  default:  'bg-white rounded-xl border border-slate-200 shadow-sm',
  elevated: 'bg-white rounded-xl shadow-lg border-0',
  ghost:    'bg-slate-50/70 rounded-xl border border-slate-100',
  outline:  'bg-transparent rounded-xl border border-slate-200',
};

const Card = ({ children, className = '', variant = 'default', ...props }) => (
  <div className={`${VARIANTS[variant] ?? VARIANTS.default} ${className || ''}`} {...props}>
    {children}
  </div>
);

export default Card;
