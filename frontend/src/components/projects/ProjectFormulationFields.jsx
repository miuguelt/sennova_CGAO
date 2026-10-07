import React, { useEffect, useRef, useState } from 'react';
import ProjectDocumentationFields, { documentationButtonClass } from './ProjectDocumentationFields';

export default function ProjectFormulationFields({ step, fields, values, disabled, onChange, focusFieldKey, focusRequest }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const focusedRequest = useRef('');
  const blocks = (step.bloques || []).map(block => ({ ...block, fields: fields.filter(field => block.campos?.includes(field.key)) }))
    .filter(block => block.fields.length);
  const ungroupedFields = blocks.length ? fields.filter(field => !blocks.some(block => block.fields.some(grouped => grouped.key === field.key))) : [];
  if (ungroupedFields.length) blocks.push({ id: 'otros-datos', titulo: 'Otros datos de esta etapa', fields: ungroupedFields });
  const index = Math.min(activeIndex, blocks.length - 1);
  const block = blocks[index];
  useEffect(() => {
    if (!focusFieldKey) return;
    const target = blocks.findIndex(item => item.fields.some(field => field.key === focusFieldKey));
    if (target >= 0) setActiveIndex(target);
  }, [focusFieldKey, focusRequest]);
  useEffect(() => {
    if (!focusFieldKey) return;
    const request = `${focusFieldKey}:${focusRequest}`;
    if (disabled || focusedRequest.current === request) return;
    const field = fields.find(item => item.key === focusFieldKey);
    if (!field) return;
    const labels = [...(containerRef.current?.querySelectorAll('label, legend') || [])];
    const label = labels.find(item => item.textContent.trim().replace(/\s*\*$/, '') === field.label);
    const target = label?.htmlFor ? document.getElementById(label.htmlFor) : label?.closest('fieldset')?.querySelector('input,textarea,select,button');
    target?.focus(); target?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    if (target) focusedRequest.current = request;
  }, [focusFieldKey, focusRequest, index, disabled]);
  if (!blocks.length) return <div ref={containerRef}><ProjectDocumentationFields fields={fields} values={values} disabled={disabled} onChange={onChange} compact /></div>;
  const headingId = `formulation-${step.id}-${block.id}`;
  return <div ref={containerRef} className="formulation-field-groups">
    {blocks.length > 1 && <nav className="formulation-block-nav" aria-label="Bloques de esta etapa">
      {blocks.map((item, position) => <button key={item.id} type="button" aria-current={position === index ? 'step' : undefined}
        onClick={() => setActiveIndex(position)}>{position + 1}. {item.titulo}</button>)}
    </nav>}
    <section className="formulation-field-group" aria-labelledby={headingId}>
      <div className="formulation-field-group__heading">
        <h5 id={headingId}>{block.titulo}</h5>
        {block.descripcion && <p>{block.descripcion}</p>}
      </div>
      <ProjectDocumentationFields fields={block.fields} values={values} disabled={disabled} onChange={onChange} compact />
    </section>
    {blocks.length > 1 && <div className="formulation-block-actions">
      <button type="button" className={documentationButtonClass} disabled={index === 0} onClick={() => setActiveIndex(index - 1)}>Bloque anterior</button>
      <span>Bloque {index + 1} de {blocks.length}</span>
      <button type="button" className={documentationButtonClass} disabled={index === blocks.length - 1} onClick={() => setActiveIndex(index + 1)}>Siguiente bloque</button>
    </div>}
  </div>;
}
