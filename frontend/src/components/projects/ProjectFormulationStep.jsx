import React, { useState } from 'react';
import { BookOpen, CheckCircle2, GraduationCap, Sparkles } from 'lucide-react';
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

const STAGE_DIDACTIC_CARDS = {
  identificacion: {
    titulo: 'Orientación institucional SENA CGAO — Identificación',
    texto: 'Formula este proyecto alineado a las líneas de convocatoria SENNOVA del Centro de Gestión Agroempresarial del Oriente (Vélez, Santander): Capacidad Instalada (CAP), Investigación Aplicada (I+D+i) o Semilleros formativos. Define la vigencia y el presupuesto base en COP con rigor técnico.',
  },
  institucional: {
    titulo: 'Orientación institucional SENA CGAO — Equipo e institución',
    texto: 'Vincula al Centro de Gestión Agroempresarial del Oriente (Regional Santander), identificando al instructor líder, coinvestigadores y aprendices en semilleros formativos vinculados a los grupos reconocidos del centro.',
  },
  problema: {
    titulo: 'Orientación institucional SENA CGAO — Problema y justificación',
    texto: 'Estructura la necesidad mediante el árbol de problemas: identifica causas directas, delimita el problema central y sustenta los efectos comprobables en el sector agroempresarial y formativo de la provincia de Vélez.',
  },
  objetivos: {
    titulo: 'Orientación institucional SENA CGAO — Objetivos del proyecto',
    texto: 'Redacta el objetivo general con un verbo de acción en infinitivo que exprese un resultado alcanzable y medible. Desglosa objetivos específicos como hitos metodológicos secuenciales que conduzcan al objetivo general.',
  },
  marco: {
    titulo: 'Orientación institucional SENA CGAO — Referentes teóricos y normativos',
    texto: 'Distingue entre antecedentes comprobados, marco conceptual y normativa institucional vigente aplicable al sector agropecuario y agroindustrial de la región.',
  },
  metodologia: {
    titulo: 'Orientación institucional SENA CGAO — Metodología',
    texto: 'Describe las fases del método, la población o muestra beneficiaria en la provincia y las técnicas e instrumentos de recolección y análisis riguroso de datos.',
  },
  resultados: {
    titulo: 'Orientación institucional SENA CGAO — Resultados e impactos',
    texto: 'Especifica productos de nuevo conocimiento, desarrollo tecnológico, apropiación social y formación de aprendices esperados según la tipología MinCiencias/SENA.',
  },
  recursos: {
    titulo: 'Orientación institucional SENA CGAO — Presupuesto y cronograma',
    texto: 'Desglosa los rubros presupuestales conforme a la guía de gastos elegibles de SENNOVA y sincroniza las actividades con el cronograma de ejecución.',
  },
  referencias: {
    titulo: 'Orientación institucional SENA CGAO — Referencias',
    texto: 'Registra las fuentes bibliográficas y normativas citadas en el documento bajo normas APA vigentes, priorizando literatura académica y técnica indexada.',
  },
  generar: {
    titulo: 'Orientación institucional SENA CGAO — Revisión y borradores',
    texto: 'Los borradores en Word (.docx) y diapositivas (.pptx) son documentos de trabajo para revisión metodológica interna en el CGAO. La radicación formal depende del cronograma de la convocatoria institucional SENNOVA.',
  },
};

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

  if (step.id === 'identificacion') {
    const rawPres = currentValues.presupuesto_total ?? projectValues?.presupuesto_total;
    if (rawPres !== undefined && rawPres !== '' && rawPres !== null && Number(rawPres) <= 0) {
      liveHints.push('Orientación SENNOVA: Registra el presupuesto estimado del proyecto en pesos colombianos (COP). Este valor servirá de base para verificar la coherencia con el desglose de rubros presupuestales en la etapa de recursos.');
    }
    const rawVig = currentValues.vigencia ?? projectValues?.vigencia;
    if (rawVig !== undefined && rawVig !== '' && rawVig !== null && Number(rawVig) > 12) {
      liveHints.push('Verificación de duración: Las convocatorias SENNOVA CGAO suelen contemplar vigencias de hasta 12 meses por anualidad. Confirma los términos de referencia vigentes de la convocatoria.');
    }
  } else if (step.id === 'problema') {
    const problema = (currentValues.planteamiento_problema || draftValues?.planteamiento_problema || '').trim();
    if (problema.length > 0 && problema.length < 50) {
      liveHints.push('Consejo pedagógico: Describe con suficiente detalle la necesidad o brecha productiva identificada en el contexto regional del CGAO antes de formular la justificación.');
    }
  } else if (step.id === 'objetivos') {
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
  const didacticCard = STAGE_DIDACTIC_CARDS[step.id];

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
    {didacticCard && (
      <aside role="region" aria-label="Orientación didáctica institucional" className="formulation-didactic-card rounded-2xl border border-emerald-200/90 bg-emerald-50/70 p-4 text-emerald-950 mb-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 mt-0.5">
            <GraduationCap size={18} aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h5 className="font-semibold text-sm text-emerald-900 leading-snug">{didacticCard.titulo}</h5>
            <p className="text-xs text-emerald-900/90 leading-relaxed">{didacticCard.texto}</p>
          </div>
        </div>
      </aside>
    )}
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
