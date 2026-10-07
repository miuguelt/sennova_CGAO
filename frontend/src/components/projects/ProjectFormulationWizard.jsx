import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileUp, ListOrdered } from 'lucide-react';
import Modal from './ProjectDocumentationModal';
import ProjectFormulationUpload from './ProjectFormulationUpload';
import ProjectFormulationStep from './ProjectFormulationStep';
import ProjectFormulationNavigation from './ProjectFormulationNavigation';
import { ProjectDocumentationAPI } from '../../api/projectDocumentation';
import { documentationButtonClass } from './ProjectDocumentationFields';
import { getDocumentationErrors } from './projectDocumentationValidation';

export default forwardRef(function ProjectFormulationWizard({
  projectId, currentUserId, record, drafts = {}, dirty = {}, canEdit, busy, onNotify, onReload, onChange,
  onSaveCommon, onSaveDraft, onGenerate, onDownload, onIdentificationDirtyChange,
  focusStepId, focusFieldKey, focusRequest,
}, ref) {
  const ruta = record?.ruta_formulacion;
  const [activeStepId, setActiveStepId] = useState(ruta?.siguiente_paso || 'identificacion');
  const [dialog, setDialog] = useState(null);
  const [projectDraft, setProjectDraft] = useState(ruta?.valores_proyecto || {});
  const [projectDirty, setProjectDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const changedProjectFields = useRef({});
  const projectDirtyRef = useRef(projectDirty);
  const lastFocus = useRef('');
  projectDirtyRef.current = projectDirty;
  useEffect(() => { if (!projectDirtyRef.current) setProjectDraft(ruta?.valores_proyecto || {}); }, [ruta?.valores_proyecto]);
  useEffect(() => { onIdentificationDirtyChange?.(projectDirty); }, [projectDirty, onIdentificationDirtyChange]);
  useEffect(() => {
    const request = `${focusStepId}:${focusFieldKey}:${focusRequest}`;
    if (!focusStepId || lastFocus.current === request || !ruta?.pasos.some(step => step.id === focusStepId)) return;
    lastFocus.current = request; setActiveStepId(focusStepId); setDialog(null);
  }, [focusStepId, focusFieldKey, focusRequest, ruta]);
  const currentStepIndex = Math.max(0, ruta?.pasos.findIndex(step => step.id === activeStepId) ?? 0);
  const activeStep = ruta?.pasos[currentStepIndex] || ruta?.pasos[0];
  const hasUnsavedChanges = projectDirty || dirty.comunes || dirty.formulacion_proyecto;
  const formulationDoc = record?.documentos?.find(document => document.clave === 'formulacion_proyecto');
  const currentVersion = formulationDoc?.historial?.find(version => version.vigente);
  const reviewSummary = ruta?.resumen || {
    campos_diligenciados: ruta?.pasos.filter(step => step.fuente !== 'generacion').every(step => step.completo),
    borrador_generado: !!currentVersion,
    revision_registrada: currentVersion?.estado === 'revisado',
    revision_pendiente: !!currentVersion && currentVersion.estado !== 'revisado',
  };
  const handleProjectFieldChange = (field, value) => {
    projectDirtyRef.current = true;
    changedProjectFields.current[field] = true;
    setProjectDirty(true);
    setProjectDraft(previous => ({ ...previous, [field]: value }));
  };
  const handleSaveProject = async () => {
    if (!projectDirty) return true;
    if (!canEdit || busy || saving || Object.keys(getDocumentationErrors(ruta.campos_proyecto.filter(field => changedProjectFields.current[field.key]), projectDraft)).length) return false;
    setSaving(true);
    try {
      const changes = {};
      for (const field of Object.keys(changedProjectFields.current)) changes[field] = projectDraft[field];
      await ProjectDocumentationAPI.saveIdentification(projectId, changes);
      changedProjectFields.current = {};
      setProjectDirty(false);
      onNotify?.('Datos de identificación del proyecto guardados con éxito.', 'success');
      await onReload?.();
      return true;
    } catch (error) { onNotify?.(error?.message || 'No fue posible guardar la identificación del proyecto.', 'error'); return false; }
    finally { setSaving(false); }
  };
  const saveCommon = () => onSaveCommon?.('comunes');
  const saveDraft = () => onSaveDraft?.('formulacion_proyecto', formulationDoc);
  const saveSource = async source => {
    if (source === 'proyecto') return handleSaveProject();
    const key = source === 'comunes' ? 'comunes' : 'formulacion_proyecto';
    if (!dirty[key]) return true;
    if (!canEdit || busy || saving) return false;
    const fields = source === 'comunes' ? record.campos_comunes : formulationDoc?.campos;
    if (Object.keys(getDocumentationErrors(fields || [], drafts[key] || {})).length) {
      onNotify?.('Hay valores inválidos en los datos que vas a guardar. Revisa sus campos antes de continuar.', 'error'); return false;
    }
    setSaving(true);
    try { return await (source === 'comunes' ? saveCommon() : saveDraft()) === true; }
    catch (error) { onNotify?.(error?.message || 'No fue posible guardar los cambios. Sigue editando e intenta de nuevo.', 'error'); return false; }
    finally { setSaving(false); }
  };
  const savePending = async () => {
    if (!hasUnsavedChanges) return true;
    if (!canEdit || busy || saving) return false;
    if (projectDirty && !await handleSaveProject()) return false;
    if (dirty.comunes && !await saveSource('comunes')) return false;
    if (dirty.formulacion_proyecto && !await saveSource('formulacion')) return false;
    return true;
  };
  const discardPending = () => {
    changedProjectFields.current = {}; setProjectDirty(false); setProjectDraft(ruta?.valores_proyecto || {});
  };
  useImperativeHandle(ref, () => ({ hasUnsavedChanges: () => !!hasUnsavedChanges, savePending, discardPending }));
  const selectStep = id => { setActiveStepId(id); setDialog(null); };
  const closeDialog = () => setDialog(null);
  const handleAppliedUpload = () => { onReload?.(); setDialog(null); };
  const saveAndContinue = async () => {
    if (busy || saving || !activeStep) return;
    if (await saveSource(activeStep.fuente)) selectStep(ruta.pasos[currentStepIndex + 1].id);
  };
  if (!ruta || !activeStep) return null;
  return <section aria-label="Asistente de formulación de proyectos" className="formulation-workspace space-y-4">
    <div className="formulation-toolbar formulation-toolbar--compact">
      <div className="formulation-route-summary">
        <span>{ruta.completados} de {ruta.total} etapas diligenciadas o con borrador generado</span>
        <progress aria-label="Avance de diligenciamiento y generación" aria-valuenow={ruta.porcentaje} max="100" value={ruta.porcentaje} />
        <span>{ruta.porcentaje}% de diligenciamiento y generación</span>
      </div>
      <div className="formulation-toolbar-actions">
        <button type="button" className={documentationButtonClass} aria-haspopup="dialog" onClick={() => setDialog('route')}><ListOrdered size={17} aria-hidden="true" />Ver etapas</button>
        <button type="button" className={documentationButtonClass} aria-haspopup="dialog" onClick={() => setDialog('upload')}><FileUp size={17} aria-hidden="true" />Cargar formato (.docx)</button>
      </div>
    </div>
    {(reviewSummary.campos_diligenciados || reviewSummary.borrador_generado) && <div className="formulation-review-summary" aria-label="Estado de generación y revisión">
      <span>{reviewSummary.borrador_generado ? 'Borrador generado' : 'Borrador por generar'}</span>
      <span>{reviewSummary.revision_registrada ? 'Revisión registrada' : 'Revisión pendiente'}</span>
      {ruta.siguiente_accion && <p>{ruta.siguiente_accion}</p>}
    </div>}
    <details className="formulation-reference-note">
      <summary>Cómo usar el proyecto de ejemplo CAP-14</summary>
      <p role="note">CAP-14 orienta el orden de las secciones. Los casos y archivos del ejemplo están preparados para aprender y no contienen registros reales. Registra los datos propios de este proyecto y verifica la autorización y vigencia antes de incluir nombres, identificaciones o contactos.</p>
    </details>
    <ProjectFormulationStep key={activeStep.id} projectId={projectId} currentUserId={currentUserId} step={activeStep} stepNumber={currentStepIndex + 1} stepCount={ruta.pasos.length}
      focusFieldKey={activeStep.id === focusStepId ? focusFieldKey : undefined} focusRequest={focusRequest}
      projectContext={record.proyecto} projectValues={projectDraft} commonValues={drafts.comunes || {}} draftValues={drafts.formulacion_proyecto || {}} generalData={record.datos_iniciales}
      projectFields={ruta.campos_proyecto} commonFields={record.campos_comunes} formulationFields={formulationDoc?.campos} documents={record.documentos}
      canEdit={canEdit} busy={busy || saving}
      dirty={activeStep.fuente === 'generacion' ? hasUnsavedChanges : activeStep.fuente === 'proyecto' ? projectDirty : activeStep.fuente === 'comunes' ? dirty.comunes : dirty.formulacion_proyecto}
      onProjectChange={handleProjectFieldChange} onCommonChange={(field, value) => onChange('comunes', field, value)} onDraftChange={(field, value) => onChange('formulacion_proyecto', field, value)}
      onSaveProject={handleSaveProject} onSaveCommon={saveCommon} onSaveDraft={saveDraft}
      onGenerate={onGenerate} onDownload={onDownload} onNotify={onNotify} />
    <div className="formulation-bottom-actions">
      <button type="button" disabled={currentStepIndex === 0 || saving} onClick={() => selectStep(ruta.pasos[currentStepIndex - 1].id)} className={documentationButtonClass}><ChevronLeft size={17} aria-hidden="true" />Paso anterior</button>
      <span>Paso {currentStepIndex + 1} de {ruta.pasos.length}</span>
      {canEdit && currentStepIndex < ruta.pasos.length - 1 && <button type="button" disabled={busy || saving} onClick={saveAndContinue} className={documentationButtonClass + ' documentation-save-button'}>{saving ? 'Guardando…' : 'Guardar y continuar'}</button>}
      <button type="button" disabled={currentStepIndex === ruta.pasos.length - 1 || saving} onClick={() => selectStep(ruta.pasos[currentStepIndex + 1].id)} className={documentationButtonClass}>Siguiente paso<ChevronRight size={17} aria-hidden="true" /></button>
    </div>
    <ProjectFormulationNavigation open={dialog === 'route'} route={ruta} activeStepId={activeStep.id} onSelect={selectStep} onClose={closeDialog} />
    <Modal isOpen={dialog === 'upload'} onClose={closeDialog} title="Cargar formato Word" variant="clean" size="xl" className="documentation-dialog"
      closeOnBackdrop={false} footer={<button type="button" className={documentationButtonClass} onClick={closeDialog}>Volver al formulario</button>}>
      {hasUnsavedChanges && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Guarda los cambios pendientes antes de importar un formato. Así podrás revisar los datos extraídos sin perder tu edición.</p>}
      <ProjectFormulationUpload projectId={projectId} canEdit={canEdit && !hasUnsavedChanges} busy={busy || saving} onApplied={handleAppliedUpload} onNotify={onNotify} />
    </Modal>
  </section>;
});
