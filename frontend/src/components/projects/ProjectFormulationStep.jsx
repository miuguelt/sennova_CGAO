import React, { useState } from 'react';
import { CheckCircle2, Sparkles, BookOpen } from 'lucide-react';
import Modal from './ProjectDocumentationModal';
import { documentationButtonClass } from './ProjectDocumentationFields';
import ProjectFormulationFields from './ProjectFormulationFields';
import ProjectGeneralData from './ProjectGeneralData';
import ProjectFormulationGuide from './ProjectFormulationGuide';
import ProjectFormulationGeneration from './ProjectFormulationGeneration';
import ProjectFormulationRecommendations from './ProjectFormulationRecommendations';
import { STEP_METHODOLOGY_GUIDE } from '../../data/projectMethodologyGuideData';
import { getDocumentationErrors } from './projectDocumentationValidation';
import './projectDocumentation.css';

export default function ProjectFormulationStep({
  projectId, currentUserId, step, stepNumber = step?.numero || 1, stepCount = 1, projectContext = {},
  projectValues, commonValues, draftValues, projectFields, commonFields, formulationFields, documents, generalData,
  canEdit, busy, dirty, onProjectChange, onCommonChange, onDraftChange,
  onSaveProject, onSaveCommon, onSaveDraft, onGenerate, onDownload, onNotify,
  focusFieldKey, focusRequest,
}) {
  const [dialog, setDialog] = useState(null);
  if (!step) return null;
  const isProject = step.fuente === 'proyecto';
  const isCommon = step.fuente === 'comunes';
  const isDraft = step.fuente === 'formulacion';
  const isGeneration = step.fuente === 'generacion';
  const relevantFields = (isProject ? projectFields : isCommon ? commonFields : isDraft ? formulationFields : [])
    ?.filter(field => step.campos.includes(field.key)) || [];
  const currentValues = (isProject ? projectValues : isCommon ? commonValues : draftValues) || {};
  const fieldErrors = getDocumentationErrors(relevantFields, currentValues);
  const invalid = Object.keys(fieldErrors).length > 0;
  const handleChange = isProject ? onProjectChange : isCommon ? onCommonChange : onDraftChange;
  const handleSave = isProject ? onSaveProject : isCommon ? onSaveCommon : onSaveDraft;
  const guide = STEP_METHODOLOGY_GUIDE[step.id] || STEP_METHODOLOGY_GUIDE.identificacion;
  const liveHints = [];
  if (step.id === 'objetivos') {
    const general = (projectValues?.objetivo_general || draftValues?.objetivo_general || currentValues.objetivo_general || '').trim();
    if (general.length > 5 && !/^(desarrollar|diseñar|implementar|evaluar|caracterizar|validar|determinar|crear|construir|optimizar|analizar|establecer|formular|identificar|proponer|estandarizar)\b/i.test(general)) {
      liveHints.push('Sugerencia de redacción: Considera expresar el objetivo con un verbo de acción y un resultado verificable; confirma la estructura que solicita la convocatoria.');
    }
    const specific = (projectValues?.objetivos_especificos || draftValues?.objetivos_especificos || currentValues.objetivos_especificos || '').trim();
    if (specific.length > 5 && specific.split('\n').filter(line => line.trim().length > 3).length < 2) {
      liveHints.push('Confirma que los objetivos específicos cubran los resultados parciales necesarios; ajusta su número al alcance del proyecto y al formato que uses.');
    }
  }
  const closeDialog = () => setDialog(null);
  return <div className="formulation-step">
    <div className="formulation-step-heading">
      <div>
        <p className="formulation-step-number">Paso {stepNumber} de {stepCount}</p>
        <h4>{step.titulo}</h4>
      </div>
      <div className="formulation-step-tools">
        <button type="button" className={documentationButtonClass} aria-haspopup="dialog" aria-expanded={dialog === 'guide'} onClick={() => setDialog('guide')}>
          <BookOpen size={18} aria-hidden="true" /><span>Mostrar guía y ejemplos</span>
        </button>
        {step.completo ? <span className="formulation-step-complete"><CheckCircle2 size={16} aria-hidden="true" />{isGeneration || step.estado_diligenciamiento === 'generado' ? 'Borrador generado' : 'Campos diligenciados'}</span>
          : !!step.faltantes?.length && <button type="button" className="formulation-pending-button" aria-haspopup="dialog" onClick={() => setDialog('pending')}>Ver pendientes ({step.faltantes.length})</button>}
      </div>
    </div>
    {!step.bloques?.length && step.proposito && <p className="formulation-writing-instruction">{step.proposito}</p>}
    {step.advertencias?.length > 0 && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">Revisa estos datos antes de continuar</p>
      <ul className="list-disc pl-5">{step.advertencias.map((warning, index) => <li key={index}>{warning}</li>)}</ul>
    </div>}
    {step.id === 'institucional' && <ProjectGeneralData defaults={generalData} values={commonValues} canEdit={canEdit} busy={busy} onChange={onCommonChange} />}
    {step.id === 'institucional' && <details className="formulation-affiliation-toggle">
      <summary>Consultar grupo y semillero</summary>
      <section className="formulation-project-affiliation" aria-label="Vinculación del proyecto">
        <h5>Vinculación del proyecto</h5>
        <dl>
          <div><dt>Grupo de investigación</dt><dd>{projectContext?.grupo || 'Sin grupo vinculado'}</dd></div>
          <div><dt>Semillero de investigación</dt><dd>{projectContext?.semillero || 'Pendiente de vincular'}</dd></div>
        </dl>
        <p className="formulation-project-affiliation__note">{projectContext?.grupo || projectContext?.semillero
          ? 'Estos datos se consultan de la ficha del proyecto y no se duplican en el formulario.'
          : 'El proyecto aún no tiene grupo ni semillero vinculados. Si aplica, completa esa vinculación en la ficha antes de generar documentos.'}</p>
      </section>
    </details>}
    {liveHints.map((hint, index) => <p key={index} className="formulation-live-hint"><Sparkles size={16} aria-hidden="true" /><span>{hint}</span></p>)}
    {!isGeneration && relevantFields.length > 0 && <>
      <ProjectFormulationFields key={step.id} step={step} fields={relevantFields} values={currentValues} disabled={!canEdit || busy} onChange={handleChange} focusFieldKey={focusFieldKey} focusRequest={focusRequest} />
      {invalid && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
        <p className="w-full font-semibold">Corrige estos valores antes de guardar la etapa.</p>
        <ul className="w-full list-disc pl-5">{relevantFields.filter(field => fieldErrors[field.key]).map(field => <li key={field.key}>{field.label}: {fieldErrors[field.key]}</li>)}</ul>
      </div>}
      <div className="formulation-save-actions">
        {canEdit && <div className="formulation-save-status">
          <button type="button" disabled={busy || !dirty || invalid} onClick={handleSave} className={documentationButtonClass + ' documentation-save-button'}>
            {busy ? 'Guardando…' : isProject ? 'Guardar identificación' : isCommon ? 'Guardar datos institucionales' : 'Guardar borrador'}
          </button>
          <span role="status">{dirty ? 'Cambios pendientes por guardar' : 'Sin cambios pendientes'}</span>
        </div>}
        {canEdit && <button type="button" onClick={() => setDialog('recommendations')} disabled={busy} className="formulation-advice-button" aria-haspopup="dialog">
          <Sparkles size={16} aria-hidden="true" />Consultar orientaciones metodológicas
        </button>}
      </div>
    </>}
    {isGeneration && <ProjectFormulationGeneration
      formulationDoc={documents?.find(document => document.tipo === 'formulacion_proyecto')}
      presentationDoc={documents?.find(document => document.tipo === 'presentacion_proyecto')}
      canEdit={canEdit} busy={busy || dirty} onGenerate={onGenerate} onDownload={onDownload} />}
    <Modal isOpen={dialog === 'guide'} onClose={closeDialog} title="Guía y ejemplos" subtitle={step.titulo} variant="clean" size="xl" className="documentation-dialog"
      footer={<button type="button" className={documentationButtonClass} onClick={closeDialog}>Volver al formulario</button>}>
      {step.proposito && <p className="formulation-purpose">{step.proposito}</p>}
      <ProjectFormulationGuide guide={guide} step={step} projectId={projectId} currentUserId={currentUserId}
        currentValues={isGeneration ? { proyecto: projectValues, comunes: commonValues, formulacion: draftValues } : currentValues} onNotify={onNotify} />
    </Modal>
    <Modal isOpen={dialog === 'pending'} onClose={closeDialog} title="Pendientes de esta etapa" variant="clean" size="lg" className="documentation-dialog"
      footer={<button type="button" className={documentationButtonClass} onClick={closeDialog}>Volver al formulario</button>}>
      <p className="text-sm text-slate-700">Estos campos se calculan con la información guardada. Guarda tus cambios para actualizar la revisión.</p>
      <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">{step.faltantes?.map((item, index) => <li key={index}>{item}</li>)}</ul>
    </Modal>
    {dialog === 'recommendations' && <ProjectFormulationRecommendations projectId={projectId} fields={relevantFields} values={currentValues} onClose={closeDialog} />}
  </div>;
}
