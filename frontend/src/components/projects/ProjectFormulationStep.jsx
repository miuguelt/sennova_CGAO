import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, FileText, Download, Sparkles, BrainCircuit } from 'lucide-react';
import ProjectDocumentationFields, { documentationButtonClass } from './ProjectDocumentationFields';
import { ProjectDocumentationAPI } from '../../api/projectDocumentation';

export default function ProjectFormulationStep({
  projectId,
  step,

  projectValues,
  commonValues,
  draftValues,
  projectFields,
  commonFields,
  formulationFields,
  documents,
  canEdit,
  busy,
  dirty,
  onProjectChange,
  onCommonChange,
  onDraftChange,
  onSaveProject,
  onSaveCommon,
  onSaveDraft,
  onGenerate,
  onDownload,
}) {
  if (!step) return null;

  const isProject = step.fuente === 'proyecto';
  const isCommon = step.fuente === 'comunes';
  const isDraft = step.fuente === 'formulacion';
  const isGeneration = step.fuente === 'generacion';

  const relevantFields = isProject
    ? (projectFields || []).filter(f => step.campos.includes(f.key))
    : isCommon
    ? (commonFields || []).filter(f => step.campos.includes(f.key))
    : isDraft
    ? (formulationFields || []).filter(f => step.campos.includes(f.key))
    : [];

  const currentValues = isProject ? projectValues : isCommon ? commonValues : draftValues;
  const handleChange = isProject ? onProjectChange : isCommon ? onCommonChange : onDraftChange;
  const handleSave = isProject ? onSaveProject : isCommon ? onSaveCommon : onSaveDraft;

  const formulationDoc = documents?.find(d => d.tipo === 'formulacion_proyecto');
  const presentationDoc = documents?.find(d => d.tipo === 'presentacion_proyecto');

  const [aiLoading, setAiLoading] = useState(false);
  const [aiTips, setAiTips] = useState([]);

  const getRecommendations = async () => {
    setAiLoading(true);
    setAiTips([]);
    try {
      const allTips = [];
      for (const field of relevantFields) {
        if (field.tipo === 'texto_largo' || field.tipo === 'texto' || field.type === 'textarea' || field.type === 'text') {
          const text = currentValues[field.key] || '';
          try {
            const res = await ProjectDocumentationAPI.getRecommendation(projectId, field.key, text);
            if (res?.recomendaciones && Array.isArray(res.recomendaciones) && res.recomendaciones.length > 0) {
              allTips.push({ campo: field.label || field.key, tips: res.recomendaciones });
            }
          } catch {
            // Continúa con los demás campos si uno falla
          }
        }
      }
      setAiTips(allTips);
    } catch (err) {
      setAiTips([{ campo: 'Error', tips: ['No fue posible conectar con el asistente de IA.'] }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (

    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Paso {step.numero} de 9
          </span>
          <h4 className="text-lg font-bold text-slate-900">{step.titulo}</h4>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-semibold sm:self-auto ${
            step.completo ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
          }`}
        >
          {step.completo ? <CheckCircle2 size={14} aria-hidden="true" /> : <AlertCircle size={14} aria-hidden="true" />}
          {step.completo ? 'Paso completo' : 'Requisitos pendientes'}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-slate-700">{step.proposito}</p>

      {step.advertencias?.length > 0 && (
        <div role="alert" className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold">Atención con este paso:</p>
          <ul className="list-disc pl-5">
            {step.advertencias.map((adv, idx) => <li key={idx}>{adv}</li>)}
          </ul>
        </div>
      )}

      {step.faltantes?.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Campos pendientes por registrar:</p>
          <ul className="mt-1 list-disc pl-5 space-y-0.5">
            {step.faltantes.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        </div>
      )}

      {!isGeneration && relevantFields.length > 0 && (
        <div className="space-y-4 pt-2">
          <ProjectDocumentationFields
            fields={relevantFields}
            values={currentValues}
            disabled={!canEdit || busy}
            onChange={handleChange}
          />
          {canEdit && (
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={busy || !dirty}
                  onClick={handleSave}
                  className={documentationButtonClass}
                >
                  {isProject ? 'Guardar identificación' : isCommon ? 'Guardar datos institucionales' : 'Guardar borrador'}
                </button>
                {dirty && <span className="text-xs text-amber-800">Tiene cambios pendientes por guardar en este paso.</span>}
              </div>
              <button
                type="button"
                onClick={getRecommendations}
                disabled={aiLoading || busy}
                className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
              >
                <BrainCircuit size={16} aria-hidden="true" />
                <span>{aiLoading ? 'Analizando con IA...' : 'Revisar textos con IA'}</span>
              </button>
            </div>
          )}

          {aiTips.length > 0 && (
            <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
              <div className="mb-2 flex items-center gap-2 font-bold text-indigo-900">
                <BrainCircuit size={18} aria-hidden="true" />
                <span>Recomendaciones del Asistente IA</span>
              </div>
              <div className="space-y-3">
                {aiTips.map((item, idx) => (
                  <div key={idx} className="text-sm">
                    <p className="font-semibold text-indigo-950">{item.campo}:</p>
                    <ul className="mt-1 list-disc pl-5 space-y-1 text-slate-700">
                      {item.tips.map((tip, tIdx) => (
                        <li key={tIdx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {isGeneration && (
        <div className="space-y-5 pt-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="flex items-center gap-2 font-bold text-emerald-950">
                <FileText size={20} aria-hidden="true" />
                <span>Formulación del proyecto (.docx)</span>
              </div>
              <p className="text-xs text-slate-700">Formato oficial con problema, marco teórico, metodología, presupuesto y cronograma.</p>
              {canEdit && formulationDoc && (
                <button
                  type="button"
                  disabled={busy || !formulationDoc.generable}
                  onClick={() => onGenerate(formulationDoc)}
                  className={`${documentationButtonClass} w-full gap-2`}
                >
                  <Sparkles size={16} aria-hidden="true" />
                  <span>Generar Word (.docx)</span>
                </button>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-sky-200 bg-sky-50/50 p-4">
              <div className="flex items-center gap-2 font-bold text-sky-950">
                <FileText size={20} aria-hidden="true" />
                <span>Presentación del proyecto (.pptx)</span>
              </div>
              <p className="text-xs text-slate-700">Diapositivas oficiales preparadas para sustentación del proyecto.</p>
              {canEdit && presentationDoc && (
                <button
                  type="button"
                  disabled={busy || !presentationDoc.generable}
                  onClick={() => onGenerate(presentationDoc)}
                  className={`${documentationButtonClass} w-full gap-2`}
                >
                  <Sparkles size={16} aria-hidden="true" />
                  <span>Generar PowerPoint (.pptx)</span>
                </button>
              )}
            </div>
          </div>

          {(formulationDoc?.historial?.length > 0 || presentationDoc?.historial?.length > 0) && (
            <div className="space-y-3 rounded-xl border border-slate-200 p-4">
              <h5 className="text-sm font-bold text-slate-900">Versiones generadas disponibles para descarga y revisión</h5>
              <div className="space-y-2">
                {[...(formulationDoc?.historial || []), ...(presentationDoc?.historial || [])].map((ver, idx) => (
                  <div key={idx} className="flex flex-col justify-between gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{ver.nombre_archivo}</p>
                      <p className="text-xs text-slate-600">Versión {ver.version} · Estado: {ver.estado} {ver.vigente ? '· Vigente' : ''}</p>
                    </div>
                    {ver.disponible && (
                      <button
                        type="button"
                        onClick={() => onDownload(ver.documento_id)}
                        className={`${documentationButtonClass} gap-1.5 text-xs`}
                      >
                        <Download size={14} aria-hidden="true" />
                        <span>Descargar</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
