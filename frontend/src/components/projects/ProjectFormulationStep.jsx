import React, { useState } from 'react';
import { 
  CheckCircle2, AlertCircle, FileText, Download, Sparkles, BrainCircuit, 
  HelpCircle, CheckSquare, BookOpen, Copy, Check, ChevronRight, FileCheck2, Loader2
} from 'lucide-react';
import ProjectDocumentationFields, { documentationButtonClass } from './ProjectDocumentationFields';
import { ProjectDocumentationAPI } from '../../api/projectDocumentation';
import { STEP_METHODOLOGY_GUIDE } from '../../data/projectMethodologyGuideData';
import { PDFGenerator } from '../../utils/pdfGenerator';

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
  onNotify,
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

  // Asistente Metodológico pre-programado para este paso
  const guide = STEP_METHODOLOGY_GUIDE[step.id] || STEP_METHODOLOGY_GUIDE.identificacion;
  const [guideTab, setGuideTab] = useState('orientacion'); // 'orientacion' | 'checklist' | 'ejemplo'
  const [checkedItems, setCheckedItems] = useState({});
  const [copied, setCopied] = useState(false);
  const [downloadingDocId, setDownloadingDocId] = useState(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiTips, setAiTips] = useState([]);

  const toggleCheck = (idx) => {
    const key = `${step.id}_${idx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const completedChecksCount = (guide.checklist || []).filter((_, idx) => !!checkedItems[`${step.id}_${idx}`]).length;
  const totalChecks = guide.checklist?.length || 1;
  const checklistPercent = Math.round((completedChecksCount / totalChecks) * 100);

  const handleCopyExample = () => {
    if (!guide.ejemploModelo?.texto) return;
    navigator.clipboard?.writeText?.(guide.ejemploModelo.texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onNotify?.('Estructura modelo copiada al portapapeles', 'success');
  };

  // Descarga de documentos construidos durante este paso
  const handleDownloadStepDoc = async (docSpec) => {
    setDownloadingDocId(docSpec.id);
    try {
      const fullProject = {
        ...projectValues,
        ...commonValues,
        id: projectId,
        nombre: projectValues?.nombre || 'Proyecto de Investigación SENNOVA',
        codigo_sgps: projectValues?.codigo_sgps || 'SGPS-CGAO',
        presupuesto_total: projectValues?.presupuesto_total || 0,
        vigencia: projectValues?.vigencia || 12,
        objetivo_general: projectValues?.objetivo_general || '',
        descripcion: projectValues?.descripcion || '',
        equipo: commonValues?.equipo || []
      };

      if (docSpec.accion === 'ficha') {
        await PDFGenerator.generateProjectPDF(fullProject, commonValues?.equipo || []);
        onNotify?.('Ficha técnica de investigación generada exitosamente', 'success');
      } else if (docSpec.accion === 'acta') {
        PDFGenerator.generateActaInicio(fullProject);
        onNotify?.('Acta de inicio generada exitosamente', 'success');
      } else if (docSpec.accion === 'seguimiento') {
        PDFGenerator.generateSeguimiento(fullProject);
        onNotify?.('Reporte de seguimiento generado exitosamente', 'success');
      } else if (docSpec.accion === 'informe_final') {
        PDFGenerator.generateInformeFinal(fullProject);
        onNotify?.('Modelo de informe final generado exitosamente', 'success');
      }
    } catch (err) {
      onNotify?.('Error al generar documento: ' + err.message, 'error');
    } finally {
      setDownloadingDocId(null);
    }
  };

  // Validación en vivo pre-programada
  const liveHints = [];
  if (step.id === 'identificacion') {
    const objGen = (projectValues?.objetivo_general || draftValues?.objetivo_general || currentValues?.objetivo_general || '').trim();
    if (objGen.length > 5) {
      const startsWithInfinitive = /^(desarrollar|diseñar|implementar|evaluar|caracterizar|validar|determinar|crear|construir|optimizar|analizar|establecer|formular|identificar|proponer|estandarizar)\b/i.test(objGen);
      if (!startsWithInfinitive) {
        liveHints.push({
          tipo: 'info',
          texto: 'Sugerencia de formulación: El objetivo general debe iniciar con un verbo de acción en infinitivo (ej: Desarrollar, Implementar, Diseñar, Validar, Evaluar).'
        });
      }
    }
    const objEsp = (projectValues?.objetivos_especificos || draftValues?.objetivos_especificos || currentValues?.objetivos_especificos || '').trim();
    if (objEsp.length > 5) {
      const lines = objEsp.split('\n').filter(l => l.trim().length > 3);
      if (lines.length < 3) {
        liveHints.push({
          tipo: 'info',
          texto: 'Sugerencia metodológica: Se recomienda formular al menos 3 objetivos específicos secuenciales que cubran diagnóstico, diseño/desarrollo y validación/transferencia.'
        });
      }
    }
  }

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
    } catch {
      setAiTips([{ campo: 'Error', tips: ['No fue posible conectar con el asistente de IA.'] }]);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
      {/* Cabecera del Paso */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md">
              Paso {step.numero} de 9
            </span>
            {guide.badge && (
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {guide.badge}
              </span>
            )}
          </div>
          <h4 className="text-xl font-black text-slate-900 mt-1">{step.titulo}</h4>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-bold sm:self-auto ${
            step.completo ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
          }`}
        >
          {step.completo ? <CheckCircle2 size={14} aria-hidden="true" /> : <AlertCircle size={14} aria-hidden="true" />}
          {step.completo ? 'Paso completo' : 'Requisitos pendientes'}
        </span>
      </div>

      <p className="text-sm leading-relaxed text-slate-700 font-medium">{step.proposito}</p>

      {/* Grilla Responsiva Principal: Formulario a la Izquierda, Asistente a la Derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── COLUMNA IZQUIERDA: Formulario de captura y edición (Col 1-7 en lg, 1-8 en xl) ── */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-5">
          {step.advertencias?.length > 0 && (
            <div role="alert" className="space-y-1 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs sm:text-sm text-amber-950">
              <p className="font-bold flex items-center gap-1.5">
                <AlertCircle size={16} className="text-amber-700 shrink-0" /> Atención con este paso:
              </p>
              <ul className="list-disc pl-5 space-y-0.5">
                {step.advertencias.map((adv, idx) => <li key={idx}>{adv}</li>)}
              </ul>
            </div>
          )}

          {step.faltantes?.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs sm:text-sm text-slate-700">
              <p className="font-bold text-slate-900">Campos pendientes por registrar:</p>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {step.faltantes.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
          )}

          {/* Validaciones en vivo pre-programadas */}
          {liveHints.map((hint, idx) => (
            <div key={idx} className="rounded-xl border border-teal-200 bg-teal-50/70 p-3 text-xs text-teal-950 flex items-start gap-2">
              <Sparkles size={16} className="text-teal-700 shrink-0 mt-0.5" />
              <span>{hint.texto}</span>
            </div>
          ))}

          {/* Campos del formulario */}
          {!isGeneration && relevantFields.length > 0 && (
            <div className="space-y-4 pt-1">
              <ProjectDocumentationFields
                fields={relevantFields}
                values={currentValues}
                disabled={!canEdit || busy}
                onChange={handleChange}
              />

              {canEdit && (
                <div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={busy || !dirty}
                      onClick={handleSave}
                      className={documentationButtonClass}
                    >
                      {isProject ? 'Guardar identificación' : isCommon ? 'Guardar datos institucionales' : 'Guardar borrador'}
                    </button>
                    {dirty && <span className="text-xs font-bold text-amber-800">Cambios pendientes por guardar</span>}
                  </div>
                  <button
                    type="button"
                    onClick={getRecommendations}
                    disabled={aiLoading || busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                  >
                    <BrainCircuit size={15} aria-hidden="true" />
                    <span>{aiLoading ? 'Analizando con IA...' : 'Revisar textos con IA'}</span>
                  </button>
                </div>
              )}

              {aiTips.length > 0 && (
                <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 animate-fadeIn">
                  <div className="mb-2 flex items-center gap-2 font-bold text-indigo-900 text-xs">
                    <BrainCircuit size={16} aria-hidden="true" />
                    <span>Recomendaciones del Asistente IA</span>
                  </div>
                  <div className="space-y-3">
                    {aiTips.map((item, idx) => (
                      <div key={idx} className="text-xs">
                        <p className="font-bold text-indigo-950">{item.campo}:</p>
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

          {/* Paso 9: Generación Oficial */}
          {isGeneration && (
            <div className="space-y-5 pt-2">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                    <FileText size={18} className="text-emerald-700" />
                    <span>Formulación del proyecto (.docx)</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Formato oficial institucional con problema, marco teórico, metodología, presupuesto y cronograma.
                  </p>
                  {canEdit && formulationDoc && (
                    <button
                      type="button"
                      disabled={busy || !formulationDoc.generable}
                      onClick={() => onGenerate(formulationDoc)}
                      className={`${documentationButtonClass} w-full gap-2 justify-center`}
                    >
                      <Sparkles size={16} aria-hidden="true" />
                      <span>Generar Word (.docx)</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-sky-200 bg-sky-50/40 p-4 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-sky-950 text-sm">
                    <FileText size={18} className="text-sky-700" />
                    <span>Presentación del proyecto (.pptx)</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Diapositivas oficiales preparadas para sustentación ante el comité de investigación CGAO.
                  </p>
                  {canEdit && presentationDoc && (
                    <button
                      type="button"
                      disabled={busy || !presentationDoc.generable}
                      onClick={() => onGenerate(presentationDoc)}
                      className={`${documentationButtonClass} w-full gap-2 justify-center`}
                    >
                      <Sparkles size={16} aria-hidden="true" />
                      <span>Generar PowerPoint (.pptx)</span>
                    </button>
                  )}
                </div>
              </div>

              {(formulationDoc?.historial?.length > 0 || presentationDoc?.historial?.length > 0) && (
                <div className="space-y-3 rounded-2xl border border-slate-200 p-4 bg-slate-50/50">
                  <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Versiones generadas disponibles para descarga y revisión
                  </h5>
                  <div className="space-y-2">
                    {[...(formulationDoc?.historial || []), ...(presentationDoc?.historial || [])].map((ver, idx) => (
                      <div key={idx} className="flex flex-col justify-between gap-2 rounded-xl bg-white p-3 sm:flex-row sm:items-center border border-slate-200 shadow-xs">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{ver.nombre_archivo}</p>
                          <p className="text-[11px] text-slate-600">
                            Versión {ver.version} · Estado: {ver.estado} {ver.vigente ? '· Vigente' : ''}
                          </p>
                        </div>
                        {ver.disponible && (
                          <button
                            type="button"
                            onClick={() => onDownload(ver.documento_id)}
                            className={`${documentationButtonClass} gap-1.5 text-xs py-1.5`}
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

        {/* ── COLUMNA DERECHA: Asistente Metodológico & Descargas en Construcción (Col 8-12 en lg, 9-12 en xl) ── */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          {/* Panel del Asistente Metodológico */}
          <div className="rounded-2xl border border-emerald-200 bg-gradient-to-b from-emerald-50/70 to-white p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                  <Sparkles size={15} />
                </div>
                <div>
                  <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                    Tutor Metodológico
                  </h5>
                  <p className="text-[10px] text-slate-500 font-bold">Guía oficial SENNOVA I+D+i</p>
                </div>
              </div>
            </div>

            {/* Selector interactivo de solapas */}
            <div className="flex rounded-xl bg-slate-100/80 p-1 text-xs">
              <button
                type="button"
                onClick={() => setGuideTab('orientacion')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center ${
                  guideTab === 'orientacion'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ¿Qué agregar?
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('checklist')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center ${
                  guideTab === 'checklist'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Checklist ({completedChecksCount}/{totalChecks})
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('ejemplo')}
                className={`flex-1 py-1.5 px-2 rounded-lg font-bold transition-all text-center ${
                  guideTab === 'ejemplo'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ejemplo
              </button>
            </div>

            {/* Contenido de Solapa: ¿Qué agregar? */}
            {guideTab === 'orientacion' && (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  Consulte a continuación qué información debe ingresar en cada campo de esta etapa:
                </p>
                {guide.queInformacionAgregar?.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1.5 shadow-2xs">
                    <h6 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                      <ChevronRight size={14} className="text-emerald-600 shrink-0" />
                      {item.campo}
                    </h6>
                    <p className="text-[11px] text-slate-700 leading-relaxed font-normal">
                      {item.instruccion}
                    </p>
                    {item.ejemplo && (
                      <div className="mt-1 p-2 bg-slate-50 rounded-lg text-[10px] text-slate-600 font-mono border-l-2 border-emerald-500 whitespace-pre-line">
                        <span className="font-bold text-slate-700 block not-italic">Ejemplo sugerido:</span>
                        {item.ejemplo}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Contenido de Solapa: Checklist interactiva */}
            {guideTab === 'checklist' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Criterios de calidad validados</span>
                  <span className="text-emerald-700 font-black">{checklistPercent}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
                <div className="space-y-2 pt-1 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                  {guide.checklist?.map((item, idx) => {
                    const isChecked = !!checkedItems[`${step.id}_${idx}`];
                    return (
                      <label
                        key={idx}
                        onClick={() => toggleCheck(idx)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 shrink-0"
                        />
                        <span className="leading-snug">{item}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Contenido de Solapa: Ejemplo modelo */}
            {guideTab === 'ejemplo' && guide.ejemploModelo && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">
                    {guide.ejemploModelo.titulo}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyExample}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors"
                  >
                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-700 leading-relaxed max-h-[320px] overflow-y-auto custom-scrollbar font-mono whitespace-pre-line shadow-2xs">
                  {guide.ejemploModelo.texto}
                </div>
              </div>
            )}
          </div>

          {/* Caja de Descargas de Documentos en Construcción para este paso */}
          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/50 to-white p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-indigo-950">
              <FileCheck2 size={18} className="text-indigo-700" />
              <div>
                <h5 className="text-xs font-black uppercase tracking-wider">
                  Documentos en Construcción
                </h5>
                <p className="text-[10px] text-slate-500 font-bold">
                  Descargue los entregables generados con la información actual
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {guide.documentosEnConstruccion?.map((docSpec) => (
                <div
                  key={docSpec.id}
                  className="p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-all shadow-2xs flex flex-col justify-between gap-2"
                >
                  <div>
                    <h6 className="text-xs font-bold text-slate-900">{docSpec.nombre}</h6>
                    <p className="text-[10px] text-slate-600 leading-tight mt-0.5 font-normal">
                      {docSpec.descripcion}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadStepDoc(docSpec)}
                    disabled={downloadingDocId === docSpec.id}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-50"
                  >
                    {downloadingDocId === docSpec.id ? (
                      <><Loader2 size={13} className="animate-spin" /> Generando…</>
                    ) : (
                      <><Download size={13} /> Descargar {docSpec.tipo.toUpperCase()}</>
                    )}
                  </button>
                </div>
              ))}

              {/* Si hay versión en Word disponible para descargar */}
              {formulationDoc?.historial?.some(v => v.disponible) && (
                <div className="p-3 bg-white rounded-xl border border-emerald-200 shadow-2xs flex flex-col justify-between gap-2">
                  <div>
                    <h6 className="text-xs font-bold text-emerald-950">Borrador Oficial Word (.docx)</h6>
                    <p className="text-[10px] text-slate-600 leading-tight mt-0.5">
                      Versión editable generada desde la plataforma lista para revisión.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const latest = formulationDoc.historial.find(v => v.disponible);
                      if (latest) onDownload?.(latest.documento_id);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 px-3 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                  >
                    <Download size={13} />
                    <span>Descargar Última Versión DOCX</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
