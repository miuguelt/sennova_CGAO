import React from 'react';
import './projectDocumentation.css';

export default function ProjectDocumentationProgress({ summary, compact = false }) {
  if (!summary) return null;
  return <section aria-label="Avance documental" className={`documentation-progress ${compact ? 'documentation-progress--compact' : ''}`}>
    <div className="documentation-progress-heading">
      <span className="font-semibold">{compact ? 'Documentación' : 'Avance de la documentación'}</span>
      <strong>{summary.porcentaje}%</strong>
    </div>
    <progress aria-label="Avance documental del proyecto" max="100" value={summary.porcentaje} />
    <div className="documentation-progress-stats">
      <span>{summary.campos_completados} de {summary.campos_totales} requisitos completos</span>
      {!compact && <>
        <span>{summary.documentos_generados} de {summary.documentos_totales} archivos vigentes</span>
        <span>{summary.documentos_revisados} de {summary.documentos_totales} documentos revisados</span>
      </>}
    </div>
    {!compact && summary.descripcion && <details className="mt-1 text-xs leading-relaxed text-slate-600"><summary className="min-h-[44px] cursor-pointer py-2">Cómo se calcula el avance</summary><p>{summary.descripcion}</p></details>}
  </section>;
}
