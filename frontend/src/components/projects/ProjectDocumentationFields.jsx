import React, { useId, useState } from 'react';
import { Expand, CircleHelp } from 'lucide-react';
import ProjectDocumentationFieldDialog from './ProjectDocumentationFieldDialog';
import ProjectDocumentationRows from './ProjectDocumentationRows';

export const documentationButtonClass = 'inline-flex min-h-[44px] max-w-full items-center justify-center rounded-xl border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:opacity-50';
const inputClass = 'min-h-[44px] w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:bg-slate-50';

function DocumentationRows({ field, value, disabled, onChange, compact }) {
  const rows = Array.isArray(value) ? value : [];
  const detailColumns = field.columns.filter(column => column.optional_detail);
  const regularColumns = field.columns.filter(column => !column.optional_detail);
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
      <ProjectDocumentationFields fields={regularColumns} values={row} scope={`${field.label} fila ${index + 1}`} disabled={disabled} compact={compact} onChange={(key, nextValue) => changeRow(index, key, nextValue)} />
      {detailColumns.length > 0 && <details className="rounded-xl border border-slate-200 bg-white px-3">
        <summary className="min-h-[44px] cursor-pointer py-3 text-sm font-semibold text-emerald-900">{field.details_label || 'Datos adicionales (cuando apliquen)'}</summary>
        {field.details_help && <p className="pb-3 text-sm leading-relaxed text-slate-700">{field.details_help}</p>}
        <ProjectDocumentationFields fields={detailColumns} values={row} scope={`${field.label} fila ${index + 1}`} disabled={disabled} compact={compact} onChange={(key, nextValue) => changeRow(index, key, nextValue)} />
      </details>}
      {!disabled && <button type="button" onClick={() => removeRow(index)} className={documentationButtonClass}>Eliminar fila {index + 1} de {field.label}</button>}
    </div>)}
    {!disabled && <button type="button" className={documentationButtonClass} onClick={addRow}>Agregar fila en {field.label}</button>}
  </fieldset>;
}

function DocumentationField({ field, value, onChange, disabled, scope, compact, writingNote }) {
  const id = useId();
  const [dialog, setDialog] = useState(null);
  const label = `${field.label}${scope ? ` · ${scope}` : ''}${field.required ? ' *' : ''}`;
  function change(event) {
    const next = event.target.value;
    onChange(field.type === 'number' && next !== '' ? Number(next) : next);
  }
  const props = { id, value: value ?? '', disabled, onChange: change, placeholder: field.placeholder, min: field.min, max: field.max, step: field.step, 'aria-required': field.required || undefined, 'aria-describedby': field.help && !compact ? `${id}-help` : undefined, className: inputClass };
  if (field.type === 'rows') return compact
    ? <ProjectDocumentationRows field={field} value={value} disabled={disabled} onChange={onChange} FieldsComponent={ProjectDocumentationFields} buttonClass={documentationButtonClass} />
    : <DocumentationRows field={field} value={value} disabled={disabled} onChange={onChange} compact={compact} />;
  return <div className={`documentation-field min-w-0 space-y-2 ${field.type === 'textarea' ? 'documentation-field--writing' : ''}`}>
    <div className="documentation-field-heading">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-900">{label}</label>
      <div className="documentation-field-tools">
        {compact && field.help && <button type="button" title={`Ayuda para ${field.label}`} onClick={() => setDialog('help')}>
          <CircleHelp size={18} aria-hidden="true" /><span className="sr-only">Ayuda para {label}</span>
        </button>}
        {field.type === 'textarea' && <button type="button" title={`Ampliar escritura de ${field.label}`} onClick={() => setDialog('writing')}>
          <Expand size={16} aria-hidden="true" /><span aria-hidden="true">Ampliar</span><span className="sr-only">Ampliar escritura de {label}</span>
        </button>}
      </div>
    </div>
    {field.type === 'textarea' ? <textarea {...props} rows={8} /> : field.type === 'select' ? <select {...props} title={field.label} className={`${inputClass} pr-10`}>
      <option value="">Selecciona una opción</option>{field.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select> : <input {...props} type={field.type || 'text'} />}
    {field.help && !compact && <p id={`${id}-help`} className="w-full text-sm leading-relaxed text-slate-700">{field.help}</p>}
    {field.type === 'number' && /valor|monto|presupuesto|costo|aporte/.test(field.key) && value !== '' && value != null && <p className="w-full font-mono text-sm tabular-nums text-emerald-900">{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value))}</p>}
    {dialog && <ProjectDocumentationFieldDialog mode={dialog} field={field} value={value} disabled={disabled} writingNote={writingNote} onChange={onChange} onClose={() => setDialog(null)} />}
  </div>;
}

export default function ProjectDocumentationFields({ fields = [], values = {}, onChange, disabled, scope = '', compact = false, writingNote }) {
  return <div className={`documentation-fields-grid ${compact ? 'documentation-fields-grid--compact' : ''}`}>{fields.map(field => <DocumentationField key={field.key} field={field} value={values[field.key]} scope={scope} disabled={disabled} compact={compact} writingNote={writingNote} onChange={value => onChange(field.key, value)} />)}</div>;
}
