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
        <label htmlFor={id} className="block text-sm font-bold text-slate-800 mb-1.5">
          {label}
          {required && <span className="text-rose-600 font-black ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value ?? ''}
          onChange={onChange || (() => {})}
          readOnly={rest.readOnly ?? (value !== undefined && !onChange)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={[
            'w-full px-3.5 py-2.5 border rounded-xl text-sm font-medium text-slate-900 transition-colors',
            'placeholder:text-slate-500',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:border-transparent',
            'disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed',
            error
              ? 'border-rose-500 focus-visible:ring-rose-600 bg-rose-50/40 text-slate-950'
              : 'border-slate-300 focus-visible:ring-emerald-600 bg-white',
            endAdornment ? 'pr-10' : '',
          ].join(' ')}
          {...rest}
        />
        {endAdornment && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none [&>*]:pointer-events-auto text-slate-600">
            {endAdornment}
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-xs font-bold text-rose-700" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default Input;
