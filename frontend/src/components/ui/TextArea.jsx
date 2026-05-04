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
        <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {required && <span className="text-rose-500 ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        id={id}
        value={value || ''}
        onChange={onChange}
        rows={rows}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        className={[
          'w-full px-3 py-2 border rounded-lg text-sm resize-y transition-colors',
          'placeholder:text-slate-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:border-transparent',
          'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
          error
            ? 'border-rose-400 focus-visible:ring-rose-500 bg-rose-50/30'
            : 'border-slate-300 focus-visible:ring-emerald-500 bg-white',
        ].join(' ')}
      />
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default TextArea;
