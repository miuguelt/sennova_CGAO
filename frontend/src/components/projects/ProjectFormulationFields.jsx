import React, { useState } from 'react';
import ProjectDocumentationFields, { documentationButtonClass } from './ProjectDocumentationFields';

export default function ProjectFormulationFields({ step, fields, values, disabled, onChange }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const blocks = (step.bloques || []).map(block => ({ ...block, fields: fields.filter(field => block.campos?.includes(field.key)) }))
    .filter(block => block.fields.length);
  if (!blocks.length) return <ProjectDocumentationFields fields={fields} values={values} disabled={disabled} onChange={onChange} compact />;
  const index = Math.min(activeIndex, blocks.length - 1);
  const block = blocks[index];
  const headingId = `formulation-${step.id}-${block.id}`;
  return <div className="formulation-field-groups">
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
