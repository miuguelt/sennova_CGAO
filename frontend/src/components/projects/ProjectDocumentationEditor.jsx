import React, { useEffect, useRef, useState } from 'react';
import { ProjectDocumentationAPI } from '../../api/projectDocumentation';
import { DocumentosAPI } from '../../api/documentos';
import { subscribeToDataRefresh } from '../../utils/dataRefresh';
import ProjectDocumentationFields, { documentationButtonClass } from './ProjectDocumentationFields';
import ProjectDocumentationCard from './ProjectDocumentationCard';
import ProjectDocumentationContext from './ProjectDocumentationContext';
import ProjectFormulationWizard from './ProjectFormulationWizard';
import ProjectTraceabilityPanel from './ProjectTraceabilityPanel';
import ProjectDocumentationProgress from './ProjectDocumentationProgress';
import './projectDocumentation.css';

export default function ProjectDocumentationEditor({ projectId, currentUser, onNotify, initialOpened = false, workspace = false }) {

  const [opened, setOpened] = useState(initialOpened);
  const [view, setView] = useState('redactar');
  const [record, setRecord] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [dirty, setDirty] = useState({});
  const [identificationDirty, setIdentificationDirty] = useState(false);
  const dirtyRef = useRef({});
  const projectRef = useRef(projectId);
  projectRef.current = projectId;
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [success, setSuccess] = useState('');
  const [sequence, setSequence] = useState(0);
  const canEdit = ['admin', 'investigador'].includes(currentUser?.rol);

  function reload() { setSequence(value => value + 1); }
  function change(key, field, value) {
    dirtyRef.current = { ...dirtyRef.current, [key]: true };
    setDirty(dirtyRef.current);
    setDrafts(previous => ({ ...previous, [key]: { ...previous[key], [field]: value } }));
  }
  useEffect(() => {
    dirtyRef.current = {}; setDirty({}); setIdentificationDirty(false); setDrafts({}); setRecord(null); setSuccess(''); setBusy(false); setConflict(false); setError('');
  }, [projectId]);
  useEffect(() => subscribeToDataRefresh(({ endpoint }) => {
    if (/\/(proyectos|productos|documentos)(\/|\?|$)/.test(endpoint)) reload();
  }), []);
  useEffect(() => {
    if (!opened) return;
    let active = true;
    setLoading(true); setError('');
    ProjectDocumentationAPI.get(projectId).then(result => {
      if (!active) return;
      setRecord(result);
      setDrafts(previous => {
        const next = { ...previous };
        if (!dirtyRef.current.comunes) next.comunes = result.comunes;
        result.documentos.forEach(entry => { if (!dirtyRef.current[entry.clave]) next[entry.clave] = entry.datos; });
        return next;
      });
      setConflict(false);
    }).catch(cause => { if (active) setError(cause.message || 'No fue posible consultar la documentación. Intente de nuevo.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [opened, projectId, sequence]);

  async function execute(action, message, refresh = true) {
    const target = projectId;
    setBusy(true); setError(''); setSuccess(''); setConflict(false);
    try {
      const result = await action();
      if (projectRef.current !== target) return;
      const text = typeof message === 'function' ? message(result) : message;
      setSuccess(text); onNotify?.(text, 'success');
      if (refresh) reload();
    } catch (cause) {
      if (projectRef.current !== target) return;
      setConflict(cause.status === 409);
      setError(cause.message || 'No fue posible completar la operación. Intente de nuevo.');
    } finally { if (projectRef.current === target) setBusy(false); }
  }
  async function save(key, entry = null) {
    await execute(async () => {
      const result = entry ? await ProjectDocumentationAPI.saveDraft(projectId, key, entry.revision, drafts[key]) : await ProjectDocumentationAPI.saveCommon(projectId, record.revision, drafts.comunes);
      if (projectRef.current !== projectId) return;
      dirtyRef.current = { ...dirtyRef.current, [key]: false }; setDirty(dirtyRef.current);
      setRecord(previous => entry ? { ...previous, documentos: previous.documentos.map(item => item.clave === key ? { ...item, revision: result.revision, datos: result.datos } : item) } : { ...previous, revision: result.revision, comunes: result.datos });
    }, entry ? 'Borrador guardado. Revise los campos pendientes antes de generar.' : 'Datos comunes guardados.');
  }
  function generate(entry) {
    return execute(() => ProjectDocumentationAPI.generate(projectId, entry.clave, entry.revision, record.revision), result => `Borrador, versión ${result.version}, generado. Revísalo y confirma el formato vigente antes de tramitar firmas o presentarlo.`);
  }
  function review(documentId, observation) {
    return execute(() => ProjectDocumentationAPI.review(projectId, documentId, observation.trim()), 'Revisión registrada. Tramita las firmas y la presentación por el canal que indique la convocatoria.');
  }
  function download(documentId) {
    return execute(async () => {
      const data = await DocumentosAPI.download(documentId);
      if (!data?.data_base64) throw new Error('La versión no contiene un archivo descargable. Intente generar una nueva versión.');
      const bytes = Uint8Array.from(window.atob(data.data_base64), char => char.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: data.content_type || 'application/octet-stream' }));
      const anchor = document.createElement('a');
      try { anchor.href = url; anchor.download = data.nombre_archivo; document.body.appendChild(anchor); anchor.click(); }
      finally { anchor.remove(); URL.revokeObjectURL(url); }
    }, 'Descarga de la versión iniciada.', false);
  }

  const commonValues = drafts.comunes || {};
  const commonRows = record?.campos_comunes.reduce((total, field) => total + (Array.isArray(commonValues[field.key]) ? commonValues[field.key].length : 0), 0) || 0;
  const commonFilled = record?.campos_comunes.filter(field => {
    const value = commonValues[field.key];
    return Array.isArray(value) ? value.length > 0 : value !== '' && value != null;
  }).length || 0;

  return <section aria-label="Construcción de documentación" className={`documentation-editor min-w-0 space-y-5 rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5 ${workspace ? 'documentation-editor--workspace' : ''}`}>
    <div className="documentation-heading"><div>
      <h3>{workspace ? 'Construye la documentación de tu proyecto' : 'Construir documentación'}</h3>
      <p>Desarrolla tus ideas, completa los datos compartidos y prepara los documentos para su revisión.</p>
      {!workspace && <p>La aplicación prepara borradores; confirma su vigencia y tramita las firmas y la presentación por el canal de la convocatoria.</p>}
    </div>{workspace && record && <ProjectDocumentationProgress summary={record.avance_documental} />}{!workspace && <button type="button" aria-expanded={opened} className={documentationButtonClass} onClick={() => setOpened(value => !value)}>{opened ? 'Ocultar constructor' : 'Construir documentación'}</button>}</div>
    {opened && <>
      {error && <div role="alert" className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><p className="w-full">{error}</p>{conflict && <p className="w-full">Hay una versión más reciente. Recargue los datos guardados y compare sus cambios antes de volver a guardar. Sus campos editados se conservarán.</p>}<button type="button" className={documentationButtonClass} onClick={reload}>{conflict ? 'Recargar y conservar mis cambios' : 'Reintentar documentación'}</button></div>}
      {success && <p role="status" className="w-full rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">{success}</p>}
      {loading && <div role="status" className="animate-pulse space-y-3 text-sm text-slate-700">Consultando documentación…<div className="h-16 rounded-xl bg-slate-100" /></div>}
      {record && <>
        {!workspace && <ProjectDocumentationProgress summary={record.avance_documental} />}

        {workspace && record.ruta_formulacion && <nav aria-label="Herramientas de documentación" className="documentation-workspace-tabs">
          {[['redactar', 'Redactar proyecto'], ['documentos', 'Documentos y versiones'], ['comunes', 'Datos compartidos']].map(([key, title]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}>{title}</button>)}
        </nav>}
        {record.advertencias?.length > 0 && <section aria-label="Datos por aclarar" className="documentation-warnings space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><h4 className="font-bold">Datos por aclarar antes de revisar</h4><ul className="w-full list-disc pl-5">{record.advertencias.map((warning, index) => <li key={index}>{warning}</li>)}</ul></section>}
        {record.ruta_formulacion && <div hidden={workspace && view !== 'redactar'}>
          <ProjectFormulationWizard
            key={projectId}
            onIdentificationDirtyChange={setIdentificationDirty}
            projectId={projectId}
            record={record}
            drafts={drafts}
            dirty={dirty}
            canEdit={canEdit}
            busy={busy || loading}
            onNotify={onNotify}
            onReload={reload}
            onChange={change}
            onSaveCommon={save}
            onSaveDraft={save}
            onGenerate={generate}
            onDownload={download}
          />
        </div>}
        <div hidden={workspace && !!record.ruta_formulacion && view !== 'documentos'}>
        <ProjectTraceabilityPanel documentos={record.documentos} />
        </div>
        <div hidden={workspace && !!record.ruta_formulacion && view !== 'comunes'}>
        <section aria-label="Datos comunes" className="space-y-4 rounded-2xl border border-slate-200 p-4">

          <details>
            <summary className="min-h-[44px] cursor-pointer font-bold text-slate-900"><span>Datos comunes</span><span className="mt-1 block text-sm font-medium text-slate-700">{commonFilled} campos con información · <span>{commonRows} filas registradas</span></span></summary>
            <div className="space-y-4 pt-4">
              <p className="w-full text-sm text-slate-700">Revise y complete los datos compartidos que necesita cada documento. Puede elegir un documento directamente para consultar sus pendientes.</p>
              <ProjectDocumentationFields fields={record.campos_comunes} values={drafts.comunes} disabled={!canEdit || busy || loading} onChange={(field, value) => change('comunes', field, value)} />
              {canEdit && <button type="button" className={documentationButtonClass} disabled={busy || loading || !dirty.comunes} onClick={() => save('comunes')}>Guardar datos comunes</button>}
            </div>
          </details>
          {dirty.comunes && <p className="w-full text-sm font-semibold text-amber-950">Tiene cambios sin guardar en los datos comunes.</p>}
        </section>
        </div>
        <div className={workspace ? 'documentation-document-grid' : 'space-y-4'} hidden={workspace && !!record.ruta_formulacion && view !== 'documentos'}>
        {record.documentos.length ? record.documentos.map(entry => <ProjectDocumentationCard key={entry.clave} entry={entry} values={drafts[entry.clave]} dirty={dirty[entry.clave]} commonDirty={dirty.comunes || identificationDirty || conflict} canEdit={canEdit} busy={busy || loading} reviewBlocked={record.advertencias?.length > 0} onChange={(field, value) => change(entry.clave, field, value)} onSave={() => save(entry.clave, entry)} onGenerate={() => generate(entry)} onDownload={download} onReview={review} />) : <p className="w-full rounded-xl bg-slate-50 p-4 text-sm text-slate-700">Aún no hay documentos configurados para este proyecto.</p>}
        </div>
        {workspace ? <details className="documentation-context-toggle rounded-xl border border-slate-200 bg-white px-4 py-2"><summary className="min-h-[44px] cursor-pointer text-sm font-semibold text-slate-700">Consultar los datos del proyecto</summary><ProjectDocumentationContext project={record.proyecto} /></details> : <ProjectDocumentationContext project={record.proyecto} />}
      </>}
    </>}
  </section>;
}
