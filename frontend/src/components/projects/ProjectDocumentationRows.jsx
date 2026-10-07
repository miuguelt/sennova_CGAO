import React, { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Eye, Trash2 } from 'lucide-react';
import ProjectDocumentationModal from './ProjectDocumentationModal';
import ProjectDocumentationRowEditor from './ProjectDocumentationRowEditor';
import { getDocumentationErrors } from './projectDocumentationValidation';

function summaryValue(column, value) {
  if (value == null || String(value).trim() === '') return 'Por completar';
  if (column.type === 'number' && /valor|monto|presupuesto|costo|aporte/.test(column.key)) {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value));
  }
  if (column.type === 'select') return column.options.find(option => option.value === value)?.label || String(value);
  return String(value);
}

export default function ProjectDocumentationRows({ field, value, disabled, onChange, FieldsComponent, buttonClass }) {
  const rows = Array.isArray(value) ? value : [];
  const columns = field.columns.filter(column => !column.optional_detail);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const addButton = useRef(null);
  const restoreAfterRemoval = useRef(false);
  useEffect(() => {
    if (removing == null && restoreAfterRemoval.current) {
      addButton.current?.focus();
      restoreAfterRemoval.current = false;
    }
  }, [removing]);
  function applyRow(draft) {
    onChange(editing.index === rows.length ? [...rows, draft] : rows.map((row, index) => index === editing.index ? draft : row));
    setEditing(null);
  }
  function removeRow() {
    restoreAfterRemoval.current = true;
    onChange(rows.filter((_row, index) => index !== removing));
    setRemoving(null);
  }
  return <fieldset className="documentation-records">
    <legend>{field.label}{field.required ? ' *' : ''}</legend>
    <div className="documentation-records-heading">
      <p>{field.help || 'Agrega los registros que necesita tu proyecto y revisa cada uno por separado.'}</p>
      {!disabled && <button type="button" ref={addButton} className={buttonClass} aria-label={`Agregar registro en ${field.label}`} onClick={() => setEditing({ index: rows.length, row: {} })}>
        <Plus size={18} aria-hidden="true" />Agregar registro
      </button>}
    </div>
    {rows.length === 0 && <p className="documentation-records-empty">Aún no has agregado registros.</p>}
    <div className="documentation-records-list">
      {rows.map((row, index) => {
        const title = String(row[columns[0]?.key] || `Registro ${index + 1}`);
        const missing = columns.filter(column => (column.required || field.key === 'aclaraciones_fuente') && (row[column.key] == null || String(row[column.key]).trim() === ''));
        const invalid = Object.keys(getDocumentationErrors(field.columns, row)).length;
        return <article className="documentation-record" key={index}>
          <div className="documentation-record-heading">
            <div><span className="documentation-record-number">Registro {index + 1}</span><h6>{title}</h6></div>
            <span className={`documentation-record-status ${missing.length || invalid ? '' : 'documentation-record-status--complete'}`}>
              {invalid ? 'Datos por corregir' : missing.length ? `${missing.length} ${missing.length === 1 ? 'campo por completar' : 'campos por completar'}` : field.key === 'aclaraciones_fuente' ? 'Datos de aclaración diligenciados' : 'Campos completos'}
            </span>
          </div>
          <dl>{columns.slice(1, 4).map(column => <div key={column.key}><dt>{column.label}</dt><dd>{summaryValue(column, row[column.key])}</dd></div>)}</dl>
          <div className="documentation-record-actions">
            <button type="button" className={buttonClass} aria-label={`${disabled ? 'Consultar' : 'Editar'} registro ${index + 1} de ${field.label}`} onClick={() => setEditing({ index, row })}>
              {disabled ? <Eye size={17} aria-hidden="true" /> : <Pencil size={17} aria-hidden="true" />}{disabled ? 'Consultar' : 'Editar registro'}
            </button>
            {!disabled && <button type="button" className="documentation-record-remove" aria-label={`Eliminar registro ${index + 1} de ${field.label}`} onClick={() => setRemoving(index)}>
              <Trash2 size={17} aria-hidden="true" />Eliminar
            </button>}
          </div>
        </article>;
      })}
    </div>
    {editing && <ProjectDocumentationRowEditor field={field} row={editing.row} index={editing.index} isNew={editing.index === rows.length}
      disabled={disabled} FieldsComponent={FieldsComponent} buttonClass={buttonClass} onApply={applyRow} onClose={() => setEditing(null)} />}
    {removing != null && <ProjectDocumentationModal isOpen onClose={() => setRemoving(null)} title="Eliminar registro" subtitle={field.label}
      variant="clean" size="md" className="documentation-dialog" footer={<>
        <button type="button" className={buttonClass} onClick={() => setRemoving(null)}>Conservar registro</button>
        <button type="button" className={`${buttonClass} documentation-record-remove`} onClick={removeRow}>Eliminar registro</button>
      </>}>
      <p>Vas a retirar «{String(rows[removing][columns[0]?.key] || `Registro ${removing + 1}`)}» del formulario. Los demás registros se conservarán.</p>
      <p className="text-sm text-slate-600">Después, guarda la etapa para actualizar el proyecto.</p>
    </ProjectDocumentationModal>}
  </fieldset>;
}
