import React, { useId } from 'react';

const TextArea = ({
  label,
  value,
  onChange,
  rows = 3,
  className = '',
  required = false,
  id: idProp,
  placeholder,
  disabled = false,
  error,
}) => {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const errorId = `${id}-error`;

  return (
    <div className={className || ''}>
      {label && (
        <label htmlFor={id} className="block text-sm font-bold text-slate-800 mb-1.5">
          {label}
          {required && <span className="text-rose-600 font-black ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        id={id}
        value={value ?? ''}
        onChange={onChange || (() => {})}
        readOnly={disabled ? undefined : (value !== undefined && !onChange)}
        rows={rows}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={[
          'w-full px-3.5 py-2.5 border rounded-xl text-sm font-medium text-slate-900 resize-y transition-colors',
          'placeholder:text-slate-500',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:border-transparent',
          'disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed',
          error
            ? 'border-rose-500 focus-visible:ring-rose-600 bg-rose-50/40 text-slate-950'
            : 'border-slate-300 focus-visible:ring-emerald-600 bg-white',
        ].join(' ')}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-bold text-rose-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default TextArea;
