import React from 'react';

const VARIANTS = {
  primary:   'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 shadow-sm',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus-visible:ring-slate-400 shadow-sm',
  ghost:     'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-400',
  danger:    'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500 shadow-sm',
  outline:   'border border-emerald-600 text-emerald-700 hover:bg-emerald-50 focus-visible:ring-emerald-500',
  sena:      'bg-[#39A900] text-white hover:bg-[#2d8000] focus-visible:ring-[#39A900] shadow-sm',
};

const SIZES = {
  xs:   'px-2 py-1 text-xs gap-1',
  sm:   'px-3 py-1.5 text-xs gap-1.5',
  md:   'px-4 py-2 text-sm gap-2',
  lg:   'px-5 py-2.5 text-sm gap-2',
  xl:   'px-6 py-3 text-base gap-2',
  icon: 'p-2',
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  className = '',
  disabled = false,
  type = 'button',
  'aria-label': ariaLabel,
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={[
      'inline-flex items-center justify-center font-medium rounded-lg',
      'transition-colors duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
      VARIANTS[variant] ?? VARIANTS.primary,
      SIZES[size]   ?? SIZES.md,
      className,
    ].join(' ')}
  >
    {children}
  </button>
);

export default Button;
