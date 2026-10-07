import React from 'react';
import './projectDocumentation.css';

export default function ProjectDocumentationProgress({ summary, compact = false, disclosure = false }) {
  if (!summary) return null;
  const pendingReview = Math.max(0, (summary.documentos_generados || 0) - (summary.documentos_revisados || 0));
  const counters = <div className="documentation-progress-stats">
      <span>Campos diligenciados: {summary.campos_completados} de {summary.campos_totales}</span>
      {!compact && <>
        <span>Borradores generados: {summary.documentos_generados} de {summary.documentos_totales}</span>
        <span>Revisión registrada: {summary.documentos_revisados} de {summary.documentos_totales}</span>
        {pendingReview > 0 && <span>Revisión pendiente: {pendingReview} {pendingReview === 1 ? 'documento' : 'documentos'}</span>}
      </>}
    </div>;
  if (disclosure) return <section aria-label="Avance documental" className="documentation-progress documentation-progress--disclosure">
    <details>
      <summary className="documentation-progress-toggle">
        <span>{summary.porcentaje}% de avance documental · {pendingReview} {pendingReview === 1 ? 'revisión pendiente' : 'revisiones pendientes'}</span>
        <progress aria-label="Avance documental del proyecto" max="100" value={summary.porcentaje} />
      </summary>
      <div className="documentation-progress-detail">
        {counters}
        {summary.descripcion && <p>{summary.descripcion}</p>}
      </div>
    </details>
  </section>;
  return <section aria-label="Avance documental" className={`documentation-progress ${compact ? 'documentation-progress--compact' : ''}`}>
    <div className="documentation-progress-heading">
      <span className="font-semibold">{compact ? 'Documentación' : 'Avance de la documentación'}</span>
      <strong>{summary.porcentaje}%</strong>
    </div>
    <progress aria-label="Avance documental del proyecto" max="100" value={summary.porcentaje} />
    {counters}
    {!compact && summary.descripcion && <details className="mt-1 text-xs leading-relaxed text-slate-600"><summary className="min-h-[44px] cursor-pointer py-2">Cómo se calcula el avance</summary><p>{summary.descripcion}</p></details>}
  </section>;
}
