import React, { useState } from 'react';
import { Building2 } from 'lucide-react';
import { documentationButtonClass } from './ProjectDocumentationFields';

const labels = { centro: 'Centro de formación', regional: 'Regional', ciudad: 'Ciudad', responsable: 'Responsable del proyecto' };

export default function ProjectGeneralData({ defaults = {}, values = {}, canEdit = false, busy = false, onChange }) {
  const [completed, setCompleted] = useState(0);
  const entries = Object.entries(defaults).filter(([key, value]) => Object.hasOwn(labels, key) && typeof value === 'string' && value.trim());
  if (!entries.length) return null;
  const missing = entries.filter(([key]) => !String(values[key] ?? '').trim());
  function fillEmptyFields() {
    missing.forEach(([key, value]) => onChange(key, value));
    setCompleted(missing.length);
  }
  return <section className="project-general-data" aria-label="Datos generales del proyecto">
    <div className="project-general-data__header">
      <div>
        <h5><Building2 size={18} aria-hidden="true" />Datos generales del proyecto</h5>
        <p>Los nuevos proyectos incluyen el centro, la regional, la ciudad y el investigador asignado como responsable. Puedes ajustar estos datos en el formulario.</p>
      </div>
      {canEdit && <button type="button" className={documentationButtonClass} disabled={busy || !missing.length} onClick={fillEmptyFields}>Completar campos vacíos</button>}
    </div>
    <details>
      <summary>Consultar los datos disponibles</summary>
      <dl className="project-general-data__values">
        {entries.map(([key, value]) => <div key={key}><dt>{labels[key]}</dt><dd>{String(values[key] ?? '').trim() || value}</dd></div>)}
      </dl>
    </details>
    <p className="project-general-data__note">Revisa las fechas y el código CAP con los soportes del proyecto. Completa los datos de formación cuando apliquen.</p>
    {completed > 0 && <p role="status">{completed} {completed === 1 ? 'campo completado' : 'campos completados'}. Guarda los datos institucionales para conservar los cambios.</p>}
  </section>;
}
