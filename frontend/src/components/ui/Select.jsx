import React, { useId } from 'react';

const Select = ({
  label,
  options,
  value,
  onChange,
  className = '',
  required = false,
  id: idProp,
  error,
  disabled = false,
}) => {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;

  return (
    <div className={className || ''}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <select
        id={id}
        value={value ?? ''}
        onChange={onChange}
        required={required}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={[
          'w-full px-3 py-2 border rounded-lg text-sm bg-white transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:border-transparent',
          'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
          error
            ? 'border-rose-400 focus-visible:ring-rose-500'
            : 'border-slate-300 focus-visible:ring-emerald-500',
        ].join(' ')}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Select;
