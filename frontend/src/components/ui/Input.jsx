import React, { useId } from 'react';

const Input = ({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
  required = false,
  disabled = false,
  id: idProp,
  error,
  endAdornment,
  ...rest
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
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={[
            'w-full px-3 py-2 border rounded-lg text-sm transition-colors',
            'placeholder:text-slate-400',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:border-transparent',
            'disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed',
            error
              ? 'border-rose-400 focus-visible:ring-rose-500 bg-rose-50/30'
              : 'border-slate-300 focus-visible:ring-emerald-500 bg-white',
            endAdornment ? 'pr-10' : '',
          ].join(' ')}
          {...rest}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none [&>*]:pointer-events-auto">
            {endAdornment}
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
