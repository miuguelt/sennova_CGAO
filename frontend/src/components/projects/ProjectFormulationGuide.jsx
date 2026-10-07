import React, { useEffect, useState } from 'react';
import { Sparkles, ChevronRight, Copy, Check } from 'lucide-react';
import { checklistStorageKey, checklistFingerprint, readPersonalChecklist, writePersonalChecklist } from './projectFormulationChecklist';

export default function ProjectFormulationGuide({ guide, step, projectId, currentUserId, currentValues = {}, onNotify }) {
  const [guideTab, setGuideTab] = useState('orientacion'); // 'orientacion' | 'checklist' | 'ejemplo'
  const storageKey = checklistStorageKey(projectId, currentUserId, step.id);
  const fingerprint = checklistFingerprint(step.campos?.length ? step.campos : Object.keys(currentValues), currentValues, guide.checklist);
  const [review, setReview] = useState(() => ({ key: storageKey, fingerprint, ...readPersonalChecklist(storageKey, fingerprint) }));
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');
  useEffect(() => {
    if (review.key !== storageKey || review.fingerprint !== fingerprint) {
      setReview({ key: storageKey, fingerprint, ...readPersonalChecklist(storageKey, fingerprint) });
    }
  }, [storageKey, fingerprint, review.key, review.fingerprint]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const toggleCheck = (idx) => {
    const checked = { ...review.checked, [idx]: !review.checked[idx] };
    const persisted = writePersonalChecklist(storageKey, fingerprint, checked);
    setReview({ key: storageKey, fingerprint, checked, stale: false, failed: !persisted });
  };

  const completedChecksCount = (guide.checklist || []).filter((_, idx) => !!review.checked[idx]).length;
  const totalChecks = guide.checklist?.length || 1;
  const checklistPercent = Math.round((completedChecksCount / totalChecks) * 100);

  const handleCopyExample = async () => {
    if (!guide.ejemploModelo?.texto) return;
    setCopied(false); setCopyError('');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Portapapeles no disponible');
      await navigator.clipboard.writeText(guide.ejemploModelo.texto);
      setCopied(true);
      onNotify?.('Estructura modelo copiada al portapapeles', 'success');
    } catch {
      const message = 'No fue posible copiar el ejemplo. Selecciona el texto y cópialo manualmente.';
      setCopyError(message); onNotify?.(message, 'error');
    }
  };

  return (
          <div className="formulation-guide-content space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                  <Sparkles size={15} />
                </div>
                <div>
                  <h5 className="text-sm font-semibold text-slate-900">
                    Orientación para la formulación
                  </h5>
                </div>
              </div>
            </div>

            <details className="formulation-guide-disclosure">
            <summary>Alcance de la orientación</summary>
            <p className="text-sm leading-relaxed text-slate-700">
              Esta orientación local no define requisitos institucionales ni aporta datos para el proyecto. Usa información respaldada por sus fuentes y confirma los formatos y reglas vigentes de la convocatoria. Genera los borradores desde la sección de revisión después de guardar los campos requeridos por la aplicación.
            </p>
            </details>

            {guide.referenciaEjemplo && (
              <details className="formulation-guide-disclosure">
              <summary>Consultar la relación con CAP-14</summary>
              <section className="formulation-example-reference" aria-label="Relación con el proyecto de ejemplo">
                <p className="font-bold text-emerald-950">Correspondencia con el proyecto de ejemplo CAP-14</p>
                <p><span className="font-semibold">Documento de referencia:</span> {guide.referenciaEjemplo.fuente}</p>
                {guide.referenciaEjemplo.secciones?.length > 0 && (
                  <p><span className="font-semibold">Secciones:</span> {guide.referenciaEjemplo.secciones.join(', ')}</p>
                )}
                <p>La muestra sirve como referencia de organización y no reemplaza el formato vigente.</p>
                <p>{guide.referenciaEjemplo.nota}</p>
              </section>
              </details>
            )}

            {/* Selector interactivo de solapas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 rounded-xl bg-slate-100/80 p-1 text-sm">
              <button
                type="button"
                onClick={() => setGuideTab('orientacion')}
                className={`flex-1 min-h-[44px] py-2 px-3 rounded-lg font-bold transition-all text-center ${
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
                className={`flex-1 min-h-[44px] py-2 px-3 rounded-lg font-bold transition-all text-center ${
                  guideTab === 'checklist'
                    ? 'bg-white text-emerald-950 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Revisión personal ({completedChecksCount}/{totalChecks})
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('ejemplo')}
                className={`flex-1 min-h-[44px] py-2 px-3 rounded-lg font-bold transition-all text-center ${
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
              <div className="space-y-3">
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Consulta qué información puedes desarrollar en cada campo. Usa los ejemplos como referencia y conserva tu enfoque.
                </p>
                {guide.queInformacionAgregar?.map((item, idx) => (
                  <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1.5 shadow-2xs">
                    <h6 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                      <ChevronRight size={14} className="text-emerald-600 shrink-0" />
                      {item.campo}
                    </h6>
                    <p className="text-sm text-slate-700 leading-relaxed font-normal">
                      {item.instruccion}
                    </p>
                    {item.ejemplo && (
                      <div className="mt-1 p-2 bg-slate-50 rounded-lg text-sm text-slate-600 font-mono border-l-2 border-emerald-500 whitespace-pre-line">
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
                <p className="text-sm leading-relaxed text-slate-700">Esta es tu revisión personal de este navegador. Sus marcas corresponden al contenido actual y no registran la revisión documental formal ni una aprobación institucional.</p>
                {review.stale && <p role="status" className="text-sm text-amber-900">Cambió el contenido de esta etapa. Vuelve a revisar los criterios antes de marcarlos.</p>}
                {review.failed && <p role="alert" className="text-sm text-amber-900">El navegador no pudo guardar tus marcas. Puedes revisar aquí, pero las marcas se perderán al cerrar la guía.</p>}
                <div className="flex items-center justify-between text-sm font-bold text-slate-700">
                  <span>Aspectos que has revisado</span>
                  <span className="text-emerald-700 font-black">{checklistPercent}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
                <div className="space-y-2 pt-1">
                  {guide.checklist?.map((item, idx) => {
                    const isChecked = !!review.checked[idx];
                    return (
                      <label
                        key={idx}
                        
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-sm cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCheck(idx)}
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
                  <span className="text-sm font-bold text-slate-800">
                    {guide.ejemploModelo.titulo}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyExample}
                    className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors"
                  >
                    {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                    <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-sm text-slate-700 leading-relaxed  whitespace-pre-line shadow-2xs">
                  {guide.ejemploModelo.texto}
                </div>
                {copyError && <p role="alert" className="text-sm text-rose-900">{copyError}</p>}
              </div>
            )}
          </div>

  );
}
