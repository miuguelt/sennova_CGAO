import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, Sparkles, FileUp, ListOrdered } from 'lucide-react';
import ProjectFormulationUpload from './ProjectFormulationUpload';
import ProjectFormulationStep from './ProjectFormulationStep';
import { ProjectDocumentationAPI } from '../../api/projectDocumentation';
import { documentationButtonClass } from './ProjectDocumentationFields';

export default function ProjectFormulationWizard({
  projectId,
  record,
  drafts,
  dirty,
  canEdit,
  busy,
  onNotify,
  onReload,
  onChange,
  onSaveCommon,
  onSaveDraft,
  onGenerate,
  onDownload,
}) {
  const ruta = record?.ruta_formulacion;
  const [activeStepId, setActiveStepId] = useState(ruta?.siguiente_paso || 'identificacion');
  const [mode, setMode] = useState('guiado'); // 'guiado' | 'formato'
  const [projectDraft, setProjectDraft] = useState(ruta?.valores_proyecto || {});
  const [projectDirty, setProjectDirty] = useState(false);

  if (!ruta) return null;

  const currentStepIndex = ruta.pasos.findIndex(s => s.id === activeStepId);
  const activeStep = ruta.pasos[currentStepIndex] || ruta.pasos[0];

  const handleProjectFieldChange = (field, value) => {
    setProjectDirty(true);
    setProjectDraft(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProject = async () => {
    try {
      await ProjectDocumentationAPI.saveIdentification(projectId, projectDraft);
      setProjectDirty(false);
      onNotify?.('Datos de identificación del proyecto guardados con éxito.', 'success');
      onReload?.();
    } catch (err) {
      onNotify?.(err.message || 'No fue posible guardar la identificación del proyecto.', 'error');
    }
  };

  const goToNextStep = () => {
    if (currentStepIndex < ruta.pasos.length - 1) {
      setActiveStepId(ruta.pasos[currentStepIndex + 1].id);
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setActiveStepId(ruta.pasos[currentStepIndex - 1].id);
    }
  };

  const handleAppliedUpload = () => {
    onReload?.();
    setMode('guiado');
  };

  const formulationDoc = record.documentos?.find(d => d.clave === 'formulacion_proyecto');

  return (
    <section aria-label="Asistente de formulación de proyectos" className="space-y-5 rounded-2xl border border-emerald-300 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900">
            <Sparkles size={14} aria-hidden="true" />
            Ruta de Formulación SENNOVA
          </span>
          <h3 className="mt-1 text-xl font-bold text-emerald-950">Formular proyecto de investigación</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            Avance de forma progresiva paso a paso o cargue el formato diligenciado para completar todos los requisitos.
          </p>
        </div>

        <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setMode('guiado')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              mode === 'guiado' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListOrdered size={16} aria-hidden="true" />
            <span>Formulario guiado</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('formato')}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
              mode === 'formato' ? 'bg-white text-emerald-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileUp size={16} aria-hidden="true" />
            <span>Cargar formato (.docx)</span>
          </button>
        </div>
      </div>

      <div className="space-y-2 rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs font-semibold text-emerald-950">
          <span>{ruta.completados} de {ruta.total} pasos completados</span>
          <span>{ruta.porcentaje}% de avance en formulación</span>
        </div>
        <progress
          aria-label="Avance en formulación"
          aria-valuenow={ruta.porcentaje}
          max="100"
          value={ruta.porcentaje}
          className="h-2.5 w-full accent-emerald-700"
        />
        {ruta.siguiente_paso && (
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-slate-600">
              Siguiente paso sugerido:{' '}
              <strong className="text-emerald-900">
                {ruta.pasos.find(s => s.id === ruta.siguiente_paso)?.titulo}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => {
                setActiveStepId(ruta.siguiente_paso);
                setMode('guiado');
              }}
              className="font-bold text-emerald-800 underline hover:text-emerald-950"
            >
              Ir a este paso
            </button>
          </div>
        )}
      </div>

      {mode === 'formato' ? (
        <ProjectFormulationUpload
          projectId={projectId}
          canEdit={canEdit}
          busy={busy}
          onApplied={handleAppliedUpload}
          onNotify={onNotify}
        />
      ) : (
        <div className="space-y-4">
          <nav aria-label="Pasos de formulación" className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
            {ruta.pasos.map((s, idx) => {
              const isCurrent = s.id === activeStep.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveStepId(s.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-emerald-800 text-white shadow'
                      : s.completo
                      ? 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {s.completo ? (
                    <CheckCircle2 size={13} className={isCurrent ? 'text-emerald-200' : 'text-emerald-700'} aria-hidden="true" />
                  ) : (
                    <Circle size={13} className={isCurrent ? 'text-emerald-200' : 'text-slate-400'} aria-hidden="true" />
                  )}
                  <span>{idx + 1}. {s.titulo}</span>
                </button>
              );
            })}
          </nav>

          <ProjectFormulationStep
            projectId={projectId}
            step={activeStep}
            projectValues={projectDraft}
            commonValues={drafts.comunes || {}}
            draftValues={drafts.formulacion_proyecto || {}}
            projectFields={ruta.campos_proyecto}

            commonFields={record.campos_comunes}
            formulationFields={formulationDoc?.campos}
            documents={record.documentos}
            canEdit={canEdit}
            busy={busy}
            dirty={
              activeStep.fuente === 'proyecto'
                ? projectDirty
                : activeStep.fuente === 'comunes'
                ? dirty.comunes
                : dirty.formulacion_proyecto
            }
            onProjectChange={handleProjectFieldChange}
            onCommonChange={(field, val) => onChange('comunes', field, val)}
            onDraftChange={(field, val) => onChange('formulacion_proyecto', field, val)}
            onSaveProject={handleSaveProject}
            onSaveCommon={() => onSaveCommon('comunes')}
            onSaveDraft={() => onSaveDraft('formulacion_proyecto', formulationDoc)}
            onGenerate={onGenerate}
            onDownload={onDownload}
          />

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={currentStepIndex === 0}
              onClick={goToPreviousStep}
              className={`${documentationButtonClass} gap-1.5 text-xs`}
            >
              <ChevronLeft size={16} aria-hidden="true" />
              <span>Paso anterior</span>
            </button>

            <span className="text-xs font-semibold text-slate-500">
              Paso {currentStepIndex + 1} de {ruta.pasos.length}
            </span>

            <button
              type="button"
              disabled={currentStepIndex === ruta.pasos.length - 1}
              onClick={goToNextStep}
              className={`${documentationButtonClass} gap-1.5 text-xs`}
            >
              <span>Siguiente paso</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
