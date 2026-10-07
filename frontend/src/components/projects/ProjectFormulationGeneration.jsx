import React from 'react';
import { FileText, Sparkles, Download } from 'lucide-react';
import { documentationButtonClass } from './ProjectDocumentationFields';

export default function ProjectFormulationGeneration({ formulationDoc, presentationDoc, canEdit, busy, onGenerate, onDownload }) {
  return (
            <div className="space-y-5 pt-2">
              <p className="text-sm leading-relaxed text-slate-700">Generar un borrador conserva una versión para revisar. Registra la revisión desde Documentos y versiones; la generación no acredita aprobación institucional.</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-950 text-sm">
                    <FileText size={18} className="text-emerald-700" />
                    <span>Formulación del proyecto (.docx)</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Borrador editable con la información del proyecto. Confirma el formato vigente de la convocatoria antes de presentarlo.
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
                    Presentación editable de apoyo para revisión. Ajusta el contenido a los requisitos confirmados de la convocatoria.
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
                            Versión {ver.version} · Estado: {ver.estado} {ver.vigente ? '· Versión actual' : ''}
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
  );
}
