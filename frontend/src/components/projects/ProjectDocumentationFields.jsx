import React, { useId } from 'react';

export const documentationButtonClass = 'inline-flex min-h-[44px] max-w-full items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:opacity-50';
const inputClass = 'min-h-[44px] w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:bg-slate-50';

function DocumentationRows({ field, value, disabled, onChange }) {
  const rows = Array.isArray(value) ? value : [];
  function addRow() { onChange([...rows, {}]); }
  function removeRow(index) { onChange(rows.filter((_row, rowIndex) => rowIndex !== index)); }
  function changeRow(index, key, nextValue) {
    onChange(rows.map((row, rowIndex) => rowIndex === index ? { ...row, [key]: nextValue } : row));
  }
  return <fieldset className="min-w-0 space-y-3 rounded-xl border border-slate-200 p-4">
    <legend className="px-1 text-sm font-semibold text-slate-900">{field.label}{field.required ? ' *' : ''}</legend>
    {field.help && <p className="w-full text-sm text-slate-700">{field.help}</p>}
    {rows.length === 0 && <p className="w-full text-sm text-slate-600">Aún no hay filas registradas.</p>}
    {rows.map((row, index) => <div key={index} className="min-w-0 space-y-3 rounded-xl bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-900">{field.label} · Fila {index + 1}</p>
      <ProjectDocumentationFields fields={field.columns} values={row} scope={`${field.label} fila ${index + 1}`} disabled={disabled} onChange={(key, nextValue) => changeRow(index, key, nextValue)} />
      {!disabled && <button type="button" onClick={() => removeRow(index)} className={documentationButtonClass}>Eliminar fila {index + 1} de {field.label}</button>}
    </div>)}
    {!disabled && <button type="button" className={documentationButtonClass} onClick={addRow}>Agregar fila en {field.label}</button>}
  </fieldset>;
}

function DocumentationField({ field, value, onChange, disabled, scope }) {
  const id = useId();
  const label = `${field.label}${scope ? ` · ${scope}` : ''}${field.required ? ' *' : ''}`;
  function change(event) {
    const next = event.target.value;
    onChange(field.type === 'number' && next !== '' ? Number(next) : next);
  }
  const props = { id, value: value ?? '', disabled, onChange: change, min: field.min, max: field.max, step: field.step, 'aria-required': field.required || undefined, 'aria-describedby': field.help ? `${id}-help` : undefined, className: inputClass };
  if (field.type === 'rows') return <DocumentationRows field={field} value={value} disabled={disabled} onChange={onChange} />;
  return <div className="min-w-0 space-y-1.5">
    <label htmlFor={id} className="block text-sm font-semibold text-slate-900">{label}</label>
    {field.type === 'textarea' ? <textarea {...props} rows={4} /> : field.type === 'select' ? <select {...props} title={field.label} className={`${inputClass} pr-10`}>
      <option value="">Seleccione una opción</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select> : <input {...props} type={field.type || 'text'} />}
    {field.help && <p id={`${id}-help`} className="w-full text-sm leading-relaxed text-slate-700">{field.help}</p>}
    {field.type === 'number' && /valor|monto|presupuesto|costo|aporte/.test(field.key) && value !== '' && value != null && <p className="w-full font-mono text-sm tabular-nums text-emerald-900">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value))}</p>}
  </div>;
}

export default function ProjectDocumentationFields({ fields = [], values = {}, onChange, disabled, scope = '' }) {
  return <div className="grid min-w-0 grid-cols-1 gap-4">{fields.map(field => <DocumentationField key={field.key} field={field} value={values[field.key]} scope={scope} disabled={disabled} onChange={value => onChange(field.key, value)} />)}</div>;
}
