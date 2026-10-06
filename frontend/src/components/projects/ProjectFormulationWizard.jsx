import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, FileUp, ListOrdered } from 'lucide-react';
import Modal from './ProjectDocumentationModal';
import ProjectFormulationUpload from './ProjectFormulationUpload';
import ProjectFormulationStep from './ProjectFormulationStep';
import ProjectFormulationNavigation from './ProjectFormulationNavigation';
import { ProjectDocumentationAPI } from '../../api/projectDocumentation';
import { documentationButtonClass } from './ProjectDocumentationFields';

export default function ProjectFormulationWizard({
  projectId, record, drafts, dirty, canEdit, busy, onNotify, onReload, onChange,
  onSaveCommon, onSaveDraft, onGenerate, onDownload, onIdentificationDirtyChange,
}) {
  const ruta = record?.ruta_formulacion;
  const [activeStepId, setActiveStepId] = useState(ruta?.siguiente_paso || 'identificacion');
  const [dialog, setDialog] = useState(null);
  const [projectDraft, setProjectDraft] = useState(ruta?.valores_proyecto || {});
  const [projectDirty, setProjectDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const projectDirtyRef = useRef(projectDirty);
  projectDirtyRef.current = projectDirty;
  useEffect(() => { if (!projectDirtyRef.current) setProjectDraft(ruta?.valores_proyecto || {}); }, [ruta?.valores_proyecto]);
  useEffect(() => { onIdentificationDirtyChange?.(projectDirty); }, [projectDirty, onIdentificationDirtyChange]);
  if (!ruta) return null;
  const currentStepIndex = Math.max(0, ruta.pasos.findIndex(step => step.id === activeStepId));
  const activeStep = ruta.pasos[currentStepIndex] || ruta.pasos[0];
  const hasUnsavedChanges = projectDirty || dirty.comunes || dirty.formulacion_proyecto;
  const handleProjectFieldChange = (field, value) => {
    setProjectDirty(true);
    setProjectDraft(previous => ({ ...previous, [field]: value }));
  };
  const handleSaveProject = async () => {
    setSaving(true);
    try {
      await ProjectDocumentationAPI.saveIdentification(projectId, projectDraft);
      setProjectDirty(false);
      onNotify?.('Datos de identificación del proyecto guardados con éxito.', 'success');
      await onReload?.();
    } catch (error) { onNotify?.(error.message || 'No fue posible guardar la identificación del proyecto.', 'error'); }
    finally { setSaving(false); }
  };
  const selectStep = id => { setActiveStepId(id); setDialog(null); };
  const closeDialog = () => setDialog(null);
  const handleAppliedUpload = () => { onReload?.(); setDialog(null); };
  const formulationDoc = record.documentos?.find(document => document.clave === 'formulacion_proyecto');
  return <section aria-label="Asistente de formulación de proyectos" className="formulation-workspace space-y-4">
    <div className="formulation-toolbar formulation-toolbar--compact">
      <div className="formulation-route-summary">
        <span>{ruta.completados} de {ruta.total} pasos completados</span>
        <progress aria-label="Avance en formulación" aria-valuenow={ruta.porcentaje} max="100" value={ruta.porcentaje} />
        <span>{ruta.porcentaje}% de avance en formulación</span>
      </div>
      <div className="formulation-toolbar-actions">
        <button type="button" className={documentationButtonClass} aria-haspopup="dialog" onClick={() => setDialog('route')}><ListOrdered size={17} aria-hidden="true" />Ver etapas</button>
        <button type="button" className={documentationButtonClass} aria-haspopup="dialog" onClick={() => setDialog('upload')}><FileUp size={17} aria-hidden="true" />Cargar formato (.docx)</button>
      </div>
    </div>
    <details className="formulation-reference-note">
      <summary>Cómo usar el proyecto de ejemplo CAP-14</summary>
      <p role="note">CAP-14 orienta el orden de las secciones. Registra los datos propios de este proyecto y verifica la autorización y vigencia antes de incluir nombres, identificaciones o contactos.</p>
    </details>
    <ProjectFormulationStep key={activeStep.id} projectId={projectId} step={activeStep} stepNumber={currentStepIndex + 1} stepCount={ruta.pasos.length}
      projectContext={record.proyecto} projectValues={projectDraft} commonValues={drafts.comunes || {}} draftValues={drafts.formulacion_proyecto || {}}
      projectFields={ruta.campos_proyecto} commonFields={record.campos_comunes} formulationFields={formulationDoc?.campos} documents={record.documentos}
      canEdit={canEdit} busy={busy || saving}
      dirty={activeStep.fuente === 'generacion' ? hasUnsavedChanges : activeStep.fuente === 'proyecto' ? projectDirty : activeStep.fuente === 'comunes' ? dirty.comunes : dirty.formulacion_proyecto}
      onProjectChange={handleProjectFieldChange} onCommonChange={(field, value) => onChange('comunes', field, value)} onDraftChange={(field, value) => onChange('formulacion_proyecto', field, value)}
      onSaveProject={handleSaveProject} onSaveCommon={() => onSaveCommon('comunes')} onSaveDraft={() => onSaveDraft('formulacion_proyecto', formulationDoc)}
      onGenerate={onGenerate} onDownload={onDownload} onNotify={onNotify} />
    <div className="formulation-bottom-actions">
      <button type="button" disabled={currentStepIndex === 0 || saving} onClick={() => selectStep(ruta.pasos[currentStepIndex - 1].id)} className={documentationButtonClass}><ChevronLeft size={17} aria-hidden="true" />Paso anterior</button>
      <span>Paso {currentStepIndex + 1} de {ruta.pasos.length}</span>
      <button type="button" disabled={currentStepIndex === ruta.pasos.length - 1 || saving} onClick={() => selectStep(ruta.pasos[currentStepIndex + 1].id)} className={documentationButtonClass}>Siguiente paso<ChevronRight size={17} aria-hidden="true" /></button>
    </div>
    <ProjectFormulationNavigation open={dialog === 'route'} route={ruta} activeStepId={activeStep.id} onSelect={selectStep} onClose={closeDialog} />
    <Modal isOpen={dialog === 'upload'} onClose={closeDialog} title="Cargar formato Word" variant="clean" size="xl" className="documentation-dialog"
      closeOnBackdrop={false} footer={<button type="button" className={documentationButtonClass} onClick={closeDialog}>Volver al formulario</button>}>
      {hasUnsavedChanges && <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Guarda los cambios pendientes antes de importar un formato. Así podrás revisar los datos extraídos sin perder tu edición.</p>}
      <ProjectFormulationUpload projectId={projectId} canEdit={canEdit && !hasUnsavedChanges} busy={busy || saving} onApplied={handleAppliedUpload} onNotify={onNotify} />
    </Modal>
  </section>;
}
