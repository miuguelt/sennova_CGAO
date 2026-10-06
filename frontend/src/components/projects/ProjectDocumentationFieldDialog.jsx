import React, { useId } from 'react';
import Modal from './ProjectDocumentationModal';
import { documentationButtonClass } from './ProjectDocumentationFields';

export default function ProjectDocumentationFieldDialog({ mode, field, value, onChange, disabled, onClose, writingNote }) {
  const id = useId();
  const writing = mode === 'writing';
  return <Modal isOpen onClose={onClose} title={writing ? 'Escritura ampliada' : 'Cómo completar este campo'}
    subtitle={field.label} variant="clean" size={writing ? '3xl' : 'lg'} className="documentation-dialog"
    footer={<button type="button" className={documentationButtonClass} onClick={onClose}>Volver al formulario</button>}>
    {field.help && <p id={`${id}-help`} className="text-sm leading-relaxed text-slate-700">{field.help}</p>}
    {writing && <div className="documentation-expanded-writing">
      <label htmlFor={id}>{field.label}{field.required ? ' *' : ''}</label>
      <textarea id={id} value={value ?? ''} disabled={disabled} onChange={event => onChange(event.target.value)}
        aria-required={field.required || undefined} aria-describedby={field.help ? `${id}-help` : undefined}
        placeholder={field.placeholder} rows={14} />
      <p>{writingNote || 'El texto permanece en el formulario al cerrar esta ventana. Guarda la etapa para registrar los cambios.'}</p>
    </div>}
  </Modal>;
}
