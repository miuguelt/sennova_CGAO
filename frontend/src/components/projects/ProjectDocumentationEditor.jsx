import React, { useEffect, useRef, useState } from 'react';
import { ProjectDocumentationAPI } from '../../api/projectDocumentation';
import { DocumentosAPI } from '../../api/documentos';
import { ProyectosAPI } from '../../api/proyectos';
import { Download, FolderArchive } from 'lucide-react';
import { subscribeToDataRefresh } from '../../utils/dataRefresh';
import ProjectDocumentationFields, { documentationButtonClass } from './ProjectDocumentationFields';
import ProjectGeneralData from './ProjectGeneralData';
import ProjectDocumentationCard from './ProjectDocumentationCard';
import ProjectDocumentationContext from './ProjectDocumentationContext';
import ProjectFormulationWizard from './ProjectFormulationWizard';
import ProjectTraceabilityPanel from './ProjectTraceabilityPanel';
import ProjectDocumentationProgress from './ProjectDocumentationProgress';
import { getDocumentationErrors } from './projectDocumentationValidation';
import { useUnsavedChangesGuard } from '../../context/UnsavedChangesContext';
import Modal from './ProjectDocumentationModal';
import { FormulationRelationsProvider } from './FormulationRelationsContext';
import './projectDocumentation.css';

export default function ProjectDocumentationEditor({ projectId, currentUser, onNotify, initialOpened = false, workspace = false, focusDocumentKey = '', focusDocumentRequest = 0 }) {

  const [opened, setOpened] = useState(initialOpened);
  const [view, setView] = useState('redactar');
  const [record, setRecord] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [dirty, setDirty] = useState({});
  const [identificationDirty, setIdentificationDirty] = useState(false);
  const guard = useUnsavedChangesGuard();
  const wizardRef = useRef(null);
  const recordRef = useRef(null);
  const operationsRef = useRef({});
  const batchRef = useRef(false);
  const editorRef = useRef(null);
  const initialStageRef = useRef(null);
  const [coherenceOpen, setCoherenceOpen] = useState(false);
  const [fieldFocus, setFieldFocus] = useState(null);
  const dirtyRef = useRef({});
  const draftsRef = useRef({});
  const editBaseRef = useRef({});
  const editedFieldsRef = useRef({});
  const [mergeConflicts, setMergeConflicts] = useState({});
  const projectRef = useRef(projectId);
  projectRef.current = projectId;
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [success, setSuccess] = useState('');
  const [sequence, setSequence] = useState(0);
  const canEdit = ['admin', 'investigador'].includes(currentUser?.rol);
  const unresolved = Object.keys(mergeConflicts).length > 0;

  function reload() { if (!batchRef.current) setSequence(value => value + 1); }
  function change(key, field, value) {
    if (!dirtyRef.current[key]) {
      editBaseRef.current[key] = { ...draftsRef.current[key] };
      editedFieldsRef.current[key] = {};
    }
    editedFieldsRef.current[key] = { ...editedFieldsRef.current[key], [field]: true };
    dirtyRef.current = { ...dirtyRef.current, [key]: true };
    setDirty(dirtyRef.current);
    draftsRef.current = { ...draftsRef.current, [key]: { ...draftsRef.current[key], [field]: value } };
    setDrafts(draftsRef.current);
  }
  function resolveConflicts(useSaved) {
    const next = { ...draftsRef.current };
    for (const [key, fields] of Object.entries(mergeConflicts)) {
      next[key] = { ...next[key] };
      for (const [field, values] of Object.entries(fields)) {
        if (useSaved) next[key][field] = values.saved;
        editBaseRef.current[key][field] = values.saved;
      }
    }
    draftsRef.current = next;
    setDrafts(next);
    setMergeConflicts({});
  }
  useEffect(() => {
    draftsRef.current = {}; editBaseRef.current = {}; editedFieldsRef.current = {}; setMergeConflicts({});
    initialStageRef.current = null;
    dirtyRef.current = {}; setDirty({}); setIdentificationDirty(false); setDrafts({}); setRecord(null); setSuccess(''); setBusy(false); setConflict(false); setError('');
  }, [projectId]);
  useEffect(() => {
    if (!focusDocumentKey) return;
    setView(focusDocumentKey === '__common__' ? 'comunes' : focusDocumentKey === 'formulacion_proyecto' ? 'redactar' : 'documentos');
  }, [focusDocumentKey, focusDocumentRequest]);
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
      recordRef.current = result;
      const next = { ...draftsRef.current };
      const conflicts = {};
      const savedDrafts = { comunes: result.comunes };
      result.documentos.forEach(entry => { savedDrafts[entry.clave] = entry.datos; });
      for (const [key, saved] of Object.entries(savedDrafts)) {
        next[key] = { ...saved };
        if (!dirtyRef.current[key]) continue;
        for (const field of Object.keys(editedFieldsRef.current[key] || {})) {
          const local = draftsRef.current[key]?.[field];
          next[key][field] = local;
          if (JSON.stringify(saved?.[field]) !== JSON.stringify(editBaseRef.current[key]?.[field]) && JSON.stringify(saved?.[field]) !== JSON.stringify(local)) {
            conflicts[key] = { ...conflicts[key], [field]: { local, saved: saved?.[field] } };
          }
        }
      }
      draftsRef.current = next; setDrafts(next); setMergeConflicts(conflicts);
      setConflict(false);
    }).catch(cause => { if (active) setError(cause.message || 'No fue posible consultar la documentación. Intente de nuevo.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [opened, projectId, sequence]);
  useEffect(() => {
    if (!workspace || !record?.ruta_formulacion || initialStageRef.current === projectId) return;
    const stage = editorRef.current?.querySelector('.formulation-step');
    const body = editorRef.current?.closest('.project-workspace-body');
    if (stage && body) {
      initialStageRef.current = projectId;
      body.scrollTop = Math.max(0, body.scrollTop + stage.getBoundingClientRect().top - body.getBoundingClientRect().top);
    }
  }, [workspace, record, projectId]);

  async function execute(action, message, refresh = true) {
    const target = projectId;
    setBusy(true); setError(''); setSuccess(''); setConflict(false);
    try {
      const result = await action();
      if (projectRef.current !== target) return false;
      const text = typeof message === 'function' ? message(result) : message;
      setSuccess(text); onNotify?.(text, 'success');
      if (refresh && !batchRef.current) reload();
      return true;
    } catch (cause) {
      if (projectRef.current !== target) return false;
      setConflict(cause.status === 409);
      setError(cause.message || 'No fue posible completar la operación. Intente de nuevo.');
      return false;
    } finally { if (projectRef.current === target) setBusy(false); }
  }
  async function save(key, entry = null) {
    return execute(async () => {
      const current = recordRef.current;
      const document = entry && current.documentos.find(item => item.clave === key);
      const result = entry ? await ProjectDocumentationAPI.saveDraft(projectId, key, document.revision, draftsRef.current[key]) : await ProjectDocumentationAPI.saveCommon(projectId, current.revision, draftsRef.current.comunes);
      if (projectRef.current !== projectId) return;
      dirtyRef.current = { ...dirtyRef.current, [key]: false }; setDirty(dirtyRef.current);
      delete editBaseRef.current[key]; delete editedFieldsRef.current[key];
      recordRef.current = entry ? { ...recordRef.current, documentos: recordRef.current.documentos.map(item => item.clave === key ? { ...item, revision: result.revision, datos: result.datos } : item) } : { ...recordRef.current, revision: result.revision, comunes: result.datos };
      setRecord(recordRef.current);
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

  function downloadFolder() {
    return execute(async () => {
      const archive = await ProyectosAPI.downloadExpediente(projectId);
      const url = URL.createObjectURL(archive);
      const anchor = document.createElement('a');
      try {
        anchor.href = url;
        anchor.download = `expediente-${projectId}.zip`;
        document.body.appendChild(anchor);
        anchor.click();
      } finally { anchor.remove(); URL.revokeObjectURL(url); }
    }, 'Descarga de la carpeta iniciada. El ZIP incluye los archivos guardados y el reporte de pendientes.', false);
  }

  const commonValues = drafts.comunes || {};
  const hasUnsavedChanges = identificationDirty || Object.values(dirty).some(Boolean);
  const commonInvalid = Object.keys(getDocumentationErrors(record?.campos_comunes, commonValues)).length > 0;
  const commonRows = record?.campos_comunes.reduce((total, field) => total + (Array.isArray(commonValues[field.key]) ? commonValues[field.key].length : 0), 0) || 0;
  const commonFilled = record?.campos_comunes.filter(field => {
    const value = commonValues[field.key];
    return Array.isArray(value) ? value.length > 0 : value !== '' && value != null;
  }).length || 0;

  async function savePending() {
    if (busy || loading || unresolved || conflict) return false;
    batchRef.current = true;
    try {
      if (wizardRef.current && !await wizardRef.current.savePending()) return false;
      for (const key of Object.keys(dirtyRef.current)) {
        if (!dirtyRef.current[key]) continue;
        const entry = key === 'comunes' ? null : recordRef.current.documentos.find(item => item.clave === key);
        const fields = entry ? entry.campos : recordRef.current.campos_comunes;
        if (Object.keys(getDocumentationErrors(fields, draftsRef.current[key])).length || !await save(key, entry)) return false;
      }
      return true;
    } finally { batchRef.current = false; reload(); }
  }
  function discardPending() {
    const current = recordRef.current;
    const next = { comunes: current.comunes };
    current.documentos.forEach(entry => { next[entry.clave] = entry.datos; });
    draftsRef.current = next; setDrafts(next);
    dirtyRef.current = {}; setDirty({});
    editBaseRef.current = {}; editedFieldsRef.current = {};
    setMergeConflicts({}); setConflict(false); setIdentificationDirty(false);
    wizardRef.current?.discardPending();
  }
  operationsRef.current = { savePending, discardPending };
  useEffect(() => guard.registerSession(`documentation:${projectId}`, {
    dirty: hasUnsavedChanges,
    save: () => operationsRef.current.savePending(),
    discard: () => operationsRef.current.discardPending(),
  }), [guard, projectId, hasUnsavedChanges]);

  function goToField(issue) {
    setCoherenceOpen(false);
    const path = issue.campo.split('.');
    const key = path[1];
    const step = record.ruta_formulacion?.pasos.find(item => item.id === issue.paso && item.campos.includes(key));
    setView(step ? 'redactar' : 'comunes');
    setFieldFocus({ key, stepId: step?.id, request: (fieldFocus?.request || 0) + 1 });
  }
  useEffect(() => {
    if (!fieldFocus || fieldFocus.stepId) return;
    const container = editorRef.current.querySelector(`[data-documentation-field="${fieldFocus.key}"]`);
    container?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    (container?.querySelector('input, textarea, select') || container?.querySelector('button'))?.focus();
  }, [fieldFocus]);
  const coherenceButton = record?.revision_coherencia && <button type="button" className={documentationButtonClass} onClick={() => setCoherenceOpen(true)}>Revisar coherencia ({record.revision_coherencia.length})</button>;

  return <FormulationRelationsProvider options={record?.opciones_relaciones}><section ref={editorRef} aria-label="Construcción de documentación" className={`documentation-editor min-w-0 space-y-5 rounded-2xl border border-emerald-200 bg-white p-4 sm:p-5 ${workspace ? 'documentation-editor--workspace' : ''}`}>
    <div className="documentation-heading"><div>
      <h3>{workspace ? 'Construye la documentación de tu proyecto' : 'Construir documentación'}</h3>
      <p>Desarrolla tus ideas, completa los datos compartidos y prepara los documentos para su revisión.</p>
      {!workspace && <p>La aplicación prepara borradores; confirma su vigencia y tramita las firmas y la presentación por el canal de la convocatoria.</p>}
    </div>{workspace && record && <ProjectDocumentationProgress summary={record.avance_documental} disclosure />}{!workspace && <button type="button" aria-expanded={opened} className={documentationButtonClass} onClick={() => setOpened(value => !value)}>{opened ? 'Ocultar constructor' : 'Construir documentación'}</button>}</div>
    {opened && <>
      {error && <div role="alert" className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><p className="w-full">{error}</p>{conflict && <p className="w-full">Hay una versión más reciente. Recargue los datos guardados y compare sus cambios antes de volver a guardar. Sus campos editados se conservarán.</p>}<button type="button" className={documentationButtonClass} onClick={reload}>{conflict ? 'Recargar y conservar mis cambios' : 'Reintentar documentación'}</button></div>}
      {success && <p role="status" className="w-full rounded-xl bg-emerald-50 p-4 text-sm text-emerald-950">{success}</p>}
      {loading && <div role="status" className="animate-pulse space-y-3 text-sm text-slate-700">Consultando documentación…<div className="h-16 rounded-xl bg-slate-100" /></div>}
      {unresolved && <section aria-label="Cambios simultáneos por resolver" className="space-y-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
        <h4 className="font-bold">Otra persona cambió campos que tú también editaste</h4>
        <p>Los campos que no editaste ya incorporan la información guardada. Compara los valores en conflicto y elige cuáles conservar antes de guardar.</p>
        {Object.entries(mergeConflicts).map(([key, fields]) => <div key={key} className="space-y-2">
          <h5 className="font-semibold">{key === 'comunes' ? 'Datos comunes' : record?.documentos.find(entry => entry.clave === key)?.titulo || key}</h5>
          {Object.entries(fields).map(([field, values]) => <dl key={field} className="space-y-1 rounded-lg border border-amber-200 bg-white p-3 [overflow-wrap:anywhere]">
            <dt className="font-semibold">{(key === 'comunes' ? record?.campos_comunes : record?.documentos.find(entry => entry.clave === key)?.campos)?.find(item => item.key === field)?.label || field}</dt>
            <dd>Tu valor: {typeof values.local === 'object' ? JSON.stringify(values.local) : String(values.local ?? 'Sin información')}</dd>
            <dd>Valor guardado: {typeof values.saved === 'object' ? JSON.stringify(values.saved) : String(values.saved ?? 'Sin información')}</dd>
          </dl>)}
        </div>)}
        <div className="flex flex-wrap gap-3">
          <button type="button" className={documentationButtonClass} disabled={busy || loading} onClick={() => resolveConflicts(false)}>Conservar mis valores en conflicto</button>
          <button type="button" className={documentationButtonClass} disabled={busy || loading} onClick={() => resolveConflicts(true)}>Usar los valores guardados en conflicto</button>
        </div>
      </section>}
      {record && <>
        {!workspace && <ProjectDocumentationProgress summary={record.avance_documental} />}

        {workspace && record.ruta_formulacion && <nav aria-label="Herramientas de documentación" className="documentation-workspace-tabs">
          {[['redactar', 'Redactar proyecto'], ['documentos', 'Documentos y versiones'], ['comunes', 'Datos compartidos']].map(([key, title]) => <button key={key} type="button" aria-pressed={view === key} onClick={() => setView(key)}>{title}</button>)}
          {coherenceButton}
        </nav>}
        {record.advertencias?.length > 0 && <section aria-label="Datos por aclarar" className="documentation-warnings space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><h4 className="font-bold">Datos por aclarar antes de revisar</h4><ul className="w-full list-disc pl-5">{record.advertencias.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
          {commonValues.inconsistencias_fuente && <div className="flex w-full flex-wrap items-center gap-2"><button type="button" className={documentationButtonClass} onClick={() => goToField({ campo: 'comunes.inconsistencias_fuente' })}>Aclarar datos de la fuente</button>
            {record.campos_comunes.some(field => field.key === 'aclaraciones_fuente') && <button type="button" className={documentationButtonClass} onClick={() => goToField({ campo: 'comunes.aclaraciones_fuente' })}>Registrar aclaración con soporte</button>}
            <details className="documentation-source-detail"><summary className="cursor-pointer py-2">Ver el pendiente y cómo aclararlo</summary><p className="whitespace-pre-wrap [overflow-wrap:anywhere]">{commonValues.inconsistencias_fuente}</p><p>Conserva el pendiente original y registra el valor confirmado, el soporte, la fecha y la persona que verificó la información en el registro de aclaraciones.</p></details>
          </div>}
        </section>}
        {(!workspace || !record.ruta_formulacion) && coherenceButton}
        <Modal isOpen={coherenceOpen} onClose={() => setCoherenceOpen(false)} title="Coherencia del proyecto" variant="clean" size="xl" footer={<button type="button" className={documentationButtonClass} onClick={() => setCoherenceOpen(false)}>Volver al formulario</button>}>
          <p>Relaciona cada objetivo con sus actividades, resultados, indicadores, metas, medios de verificación, responsables y recursos. Esta revisión orienta la consistencia de los datos guardados; la calidad científica y la aprobación requieren revisión de las personas responsables.</p>
          {hasUnsavedChanges && <p role="note">Guarda tus cambios para actualizar esta revisión.</p>}
          {record.revision_coherencia?.length ? <ul className="space-y-3">{record.revision_coherencia.map((issue, index) => <li key={index} className="rounded-xl border p-3"><p>{issue.mensaje}</p><button type="button" className={documentationButtonClass} onClick={() => goToField(issue)}>Ir al dato</button></li>)}</ul> : <p>No se detectaron relaciones pendientes en los datos guardados. Revisa el contenido y sus soportes antes de presentar el proyecto.</p>}
        </Modal>
        {record.ruta_formulacion && <div hidden={workspace && view !== 'redactar'}>
          <ProjectFormulationWizard
            ref={wizardRef}
            currentUserId={currentUser?.id}
            focusStepId={fieldFocus?.stepId}
            focusFieldKey={fieldFocus?.key}
            focusRequest={fieldFocus?.request}
            key={projectId}
            onIdentificationDirtyChange={setIdentificationDirty}
            projectId={projectId}
            record={record}
            drafts={drafts}
            dirty={dirty}
            canEdit={canEdit}
            busy={busy || loading || unresolved}
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

          <details open={focusDocumentKey === '__common__' || !!fieldFocus && !fieldFocus.stepId}>
            <summary className="min-h-[44px] cursor-pointer font-bold text-slate-900"><span>Datos comunes</span><span className="mt-1 block text-sm font-medium text-slate-700">{commonFilled} campos con información · <span>{commonRows} filas registradas</span></span></summary>
            <div className="space-y-4 pt-4">
              <p className="w-full text-sm text-slate-700">Revise y complete los datos compartidos que necesita cada documento. Puede elegir un documento directamente para consultar sus pendientes.</p>
              <ProjectGeneralData defaults={record.datos_iniciales} values={commonValues} canEdit={canEdit} busy={busy || loading || unresolved} onChange={(field, value) => change('comunes', field, value)} />
              <ProjectDocumentationFields fields={record.campos_comunes} values={drafts.comunes} disabled={!canEdit || busy || loading || unresolved} onChange={(field, value) => change('comunes', field, value)} />
              {canEdit && <button type="button" className={documentationButtonClass} disabled={busy || loading || unresolved || !dirty.comunes || commonInvalid} onClick={() => save('comunes')}>Guardar datos comunes</button>}
            </div>
          </details>
          {dirty.comunes && <p className="w-full text-sm font-semibold text-amber-950">Tiene cambios sin guardar en los datos comunes.</p>}
        </section>
        </div>
        <div className={workspace ? 'documentation-document-grid' : 'space-y-4'} hidden={workspace && !!record.ruta_formulacion && view !== 'documentos'}>
        {record.documentos.length ? record.documentos.map(entry => <ProjectDocumentationCard key={entry.clave} entry={entry} autoOpen={focusDocumentKey === entry.clave} values={drafts[entry.clave]} dirty={dirty[entry.clave]} commonDirty={dirty.comunes || identificationDirty || conflict} canEdit={canEdit} busy={busy || loading || unresolved} reviewBlocked={record.advertencias?.length > 0} onChange={(field, value) => change(entry.clave, field, value)} onSave={() => save(entry.clave, entry)} onGenerate={() => generate(entry)} onDownload={download} onReview={review} />) : <p className="w-full rounded-xl bg-slate-50 p-4 text-sm text-slate-700">Aún no hay documentos configurados para este proyecto.</p>}
        </div>
        {workspace ? <details className="documentation-context-toggle rounded-xl border border-slate-200 bg-white px-4 py-2"><summary className="min-h-[44px] cursor-pointer text-sm font-semibold text-slate-700">Consultar los datos del proyecto</summary><ProjectDocumentationContext project={record.proyecto} /></details> : <ProjectDocumentationContext project={record.proyecto} />}
        <section aria-label="Descarga de la carpeta del proyecto" className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <h4 className="flex items-center gap-2 font-bold text-emerald-950"><FolderArchive size={20} aria-hidden="true" />Carpeta del proyecto</h4>
            <p className="text-sm leading-relaxed text-emerald-950">Descarga la última versión generada de cada documento, los soportes adjuntos y el reporte de pendientes, organizados por etapa.</p>
            {hasUnsavedChanges && <p className="text-sm font-semibold text-amber-950">Guarda los cambios pendientes antes de descargar la carpeta.</p>}
          </div>
          <button type="button" className={`${documentationButtonClass} shrink-0 gap-2`} disabled={busy || loading || hasUnsavedChanges} onClick={downloadFolder}><Download size={18} aria-hidden="true" />Descargar carpeta del proyecto (ZIP)</button>
        </section>
      </>}
    </>}
  </section></FormulationRelationsProvider>;
}
