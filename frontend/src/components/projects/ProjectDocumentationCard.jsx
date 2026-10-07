import React, { useState } from 'react';
import ProjectDocumentationFields, { documentationButtonClass } from './ProjectDocumentationFields';
import { getDocumentationErrors } from './projectDocumentationValidation';

function DocumentationVersion({ version, title, canEdit, busy, reviewBlocked, onDownload, onReview }) {
  const [observation, setObservation] = useState('');
  return <div className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
    <p className="w-full text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">Versión {version.version} · {version.nombre_archivo}</p>
    <p className="w-full text-sm text-slate-700">{version.estado === 'revisado' ? 'Revisada' : 'Borrador'}{version.vigente ? ' · Versión vigente' : ' · Versión anterior'}</p>
    {version.observacion_revision && <p className="w-full text-sm text-slate-700">{version.observacion_revision}</p>}
    {(version.disponible === false || !version.documento_id) && <p className="w-full text-sm text-rose-900">Archivo no disponible. Genere una nueva versión.</p>}
    <button type="button" disabled={busy || version.disponible === false || !version.documento_id} className={documentationButtonClass} onClick={() => onDownload(version.documento_id)} aria-label={`Descargar versión ${version.version} de ${title}`}>Descargar versión {version.version}</button>
    {canEdit && version.estado !== 'revisado' && <>
      <label className="block space-y-1 text-sm font-semibold text-slate-900">Observación de revisión de versión {version.version}
        <textarea className="w-full min-w-0 rounded-xl border border-slate-300 p-3 text-sm" rows={2} value={observation} disabled={busy} onChange={event => setObservation(event.target.value)} placeholder="Indique qué revisó y qué queda pendiente, si corresponde." />
      </label>
      <button type="button" className={documentationButtonClass} disabled={busy || reviewBlocked || !version.vigente || version.disponible === false || !version.documento_id} onClick={() => onReview(version.documento_id, observation)} aria-label={`Marcar revisada la versión ${version.version} de ${title}`}>Registrar revisión</button>
    </>}
  </div>;
}

export default function ProjectDocumentationCard({ entry, values, dirty, commonDirty, canEdit, busy, reviewBlocked, autoOpen = false, onChange, onSave, onGenerate, onDownload, onReview }) {
  const invalid = Object.keys(getDocumentationErrors(entry.campos, values)).length > 0;
  return <section aria-label={entry.titulo} className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <details open={autoOpen}>
      <summary className="min-h-[44px] cursor-pointer text-base font-bold text-slate-900"><span>{entry.titulo}</span><span className="mt-1 block text-sm font-medium text-slate-700">{entry.faltantes.length ? `${entry.faltantes.length} ${entry.faltantes.length === 1 ? 'campo pendiente' : 'campos pendientes'}` : 'Campos completos'}</span></summary>
      <div className="space-y-4 pt-3">
        {entry.faltantes.length > 0 && <ul className="w-full list-disc space-y-1 pl-5 text-sm text-amber-950">{entry.faltantes.map(item => <li key={item.campo}>{item.mensaje}</li>)}</ul>}
        <ProjectDocumentationFields fields={entry.campos} values={values} onChange={onChange} disabled={!canEdit || busy} />
        {canEdit && <div className="flex min-w-0 flex-wrap gap-3">
          <button type="button" className={documentationButtonClass} disabled={busy || !dirty || invalid} onClick={onSave} aria-label={`Guardar ${entry.titulo}`}>Guardar borrador</button>
          <button type="button" className={documentationButtonClass} disabled={busy || dirty || commonDirty || !entry.generable || entry.faltantes.length > 0} onClick={onGenerate} aria-label={`Generar ${entry.titulo}`}>Generar {entry.formato.toUpperCase()}</button>
        </div>}
      </div>
    </details>
    <p className="w-full text-sm text-slate-600 [overflow-wrap:anywhere]">{entry.carpeta} · {entry.formato.toUpperCase()}{entry.periodo_bimestre ? ` · Bimestre ${entry.periodo_bimestre}` : ''}</p>
    {dirty && <p className="w-full text-sm font-semibold text-amber-950">Tiene cambios sin guardar.</p>}
    <div className="space-y-3 border-t border-slate-200 pt-4">
      <h5 className="text-sm font-bold text-slate-900">Versiones generadas</h5>
      {entry.historial.length ? entry.historial.map(version => <DocumentationVersion key={version.documento_id || version.version} version={version} title={entry.titulo} canEdit={canEdit} busy={busy} reviewBlocked={reviewBlocked || dirty || commonDirty} onDownload={onDownload} onReview={onReview} />) : <p className="w-full text-sm text-slate-600">Aún no hay versiones generadas.</p>}
    </div>
  </section>;
}
