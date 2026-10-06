import React, { useState } from 'react';
import ProjectDocumentationModal from './ProjectDocumentationModal';

export default function ProjectDocumentationRowEditor({ field, row, index, isNew, disabled, onApply, onClose, FieldsComponent, buttonClass }) {
  const [draft, setDraft] = useState(() => ({ ...row }));
  const [discarding, setDiscarding] = useState(false);
  const regularColumns = field.columns.filter(column => !column.optional_detail);
  const detailColumns = field.columns.filter(column => column.optional_detail);
  const missing = regularColumns.filter(column => column.required && (draft[column.key] == null || String(draft[column.key]).trim() === ''));
  const dirty = JSON.stringify(draft) !== JSON.stringify(row);
  function change(key, value) { setDraft(previous => ({ ...previous, [key]: value })); }
  function close() {
    if (dirty && !disabled) setDiscarding(true);
    else onClose();
  }
  const title = disabled ? `Consultar registro ${index + 1}` : isNew ? 'Agregar registro' : `Editar registro ${index + 1}`;
  const fieldProps = { values: draft, disabled, compact: true, onChange: change,
    writingNote: 'El texto permanece en el registro al cerrar esta ventana. Aplica el registro al formulario y luego guarda la etapa.' };
  return <>
    <ProjectDocumentationModal isOpen onClose={close} title={title} subtitle={field.label} variant="clean" size="xl"
      className="documentation-dialog" bodyClassName="documentation-row-editor" footer={<>
        <button type="button" className={buttonClass} onClick={close}>{disabled ? 'Volver al formulario' : 'Cancelar'}</button>
        {!disabled && <button type="button" className={`${buttonClass} documentation-save-button`} onClick={() => onApply(draft)}>Aplicar al formulario</button>}
      </>}>
      {!disabled && <p className="documentation-row-editor-note">Completa lo que ya conoces. Aplica el registro al formulario y luego guarda la etapa para conservarlo en el proyecto.</p>}
      <FieldsComponent {...fieldProps} fields={regularColumns} />
      {detailColumns.length > 0 && <details className="documentation-row-details">
        <summary>{field.details_label || 'Datos adicionales (cuando apliquen)'}</summary>
        {field.details_help && <p>{field.details_help}</p>}
        <FieldsComponent {...fieldProps} fields={detailColumns} />
      </details>}
      {missing.length > 0 && <p className="documentation-row-pending">Por completar: {missing.map(column => column.label).join(', ')}.</p>}
    </ProjectDocumentationModal>
    {discarding && <ProjectDocumentationModal isOpen onClose={() => setDiscarding(false)} title="Descartar cambios del registro"
      variant="clean" size="md" className="documentation-dialog" footer={<>
        <button type="button" className={buttonClass} onClick={() => setDiscarding(false)}>Seguir editando</button>
        <button type="button" className={`${buttonClass} documentation-record-remove`} onClick={onClose}>Descartar cambios</button>
      </>}>
      <p>Los cambios de esta ventana aún no se han aplicado al formulario. Si cierras ahora, se perderán.</p>
    </ProjectDocumentationModal>}
  </>;
}
