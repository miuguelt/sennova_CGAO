import React from 'react';
import { cn } from '../../lib/utils';

const VARIANTS = {
  default: 'bg-slate-100 text-slate-800 border border-slate-300',
  success: 'bg-emerald-50 text-emerald-900 border border-emerald-300',
  emerald: 'bg-emerald-50 text-emerald-900 border border-emerald-300',
  warning: 'bg-amber-50 text-amber-950 border border-amber-300',
  amber:   'bg-amber-50 text-amber-950 border border-amber-300',
  danger:  'bg-rose-50 text-rose-900 border border-rose-300',
  destructive: 'bg-rose-50 text-rose-900 border border-rose-300',
  info:    'bg-sky-50 text-sky-950 border border-sky-300',
  primary: 'bg-indigo-50 text-indigo-950 border border-indigo-300',
  indigo:  'bg-indigo-50 text-indigo-950 border border-indigo-300',
  purple:  'bg-purple-50 text-purple-950 border border-purple-300',
  blue:    'bg-blue-50 text-blue-950 border border-blue-300',
  dark:    'bg-slate-900 text-white border border-slate-700',
  outline: 'bg-white text-slate-800 border border-slate-300',
  sena:    'bg-emerald-50 text-[#144600] border border-emerald-300 font-black',
};

const Badge = ({ children, variant = 'default', dot = false, className = '' }) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold',
      VARIANTS[variant] ?? VARIANTS.default,
      className
    )}
  >
    {dot && (
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 flex-shrink-0" aria-hidden="true" />
    )}
    {children}
  </span>
);

export default Badge;

