import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, FileCheck, ArrowRight } from 'lucide-react';
import { ProjectDocumentationAPI } from '../../api/projectDocumentation';
import { documentationButtonClass } from './ProjectDocumentationFields';

export default function ProjectFormulationUpload({ projectId, canEdit, busy, onApplied, onNotify }) {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    setError('');
    setAnalysis(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (!selected.name.toLowerCase().endsWith('.docx')) {
      setError('Seleccione un archivo de Word con extensión .docx.');
      setFile(null);
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('El archivo supera los 10 MB permitidos.');
      setFile(null);
      return;
    }
    setFile(selected);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setAnalyzing(true);
    setError('');
    try {
      const result = await ProjectDocumentationAPI.analyzeFormulation(projectId, file);
      setAnalysis(result);
      onNotify?.('Formato analizado con éxito. Revise la información extraída.', 'success');
    } catch (err) {
      setError(err.message || 'No fue posible analizar el archivo. Verifique que sea un formato Word válido.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleApply = async () => {
    if (!analysis) return;
    setApplying(true);
    setError('');
    try {
      await ProjectDocumentationAPI.applyFormulation(projectId, analysis.borrador, analysis.proyecto);
      onNotify?.('Información del formato aplicada al proyecto y al borrador.', 'success');
      setAnalysis(null);
      setFile(null);
      onApplied?.();
    } catch (err) {
      setError(err.message || 'No fue posible aplicar los datos del formato. Intente de nuevo.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <section aria-label="Carga de formato de formulación" className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5">
      <div>
        <h4 className="text-base font-bold text-slate-900">Opción 1: Cargar formato oficial diligenciado</h4>
        <p className="mt-1 text-sm text-slate-600">
          Si ya cuenta con el formato CAP o SENNOVA diligenciado en Word (.docx), cárguelo aquí para extraer automáticamente el título, objetivos, justificación, metodología y resultados.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-400 bg-white px-4 py-3 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-within:ring-2 focus-within:ring-emerald-700">
          <UploadCloud size={18} aria-hidden="true" />
          <span>{file ? file.name : 'Seleccionar archivo Word (.docx)'}</span>
          <input
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            disabled={!canEdit || busy || analyzing || applying}
            onChange={handleFileChange}
            className="sr-only"
          />
        </label>

        {file && (
          <button
            type="button"
            disabled={!canEdit || busy || analyzing || applying}
            onClick={handleAnalyze}
            className={documentationButtonClass}
          >
            {analyzing ? 'Analizando archivo…' : 'Analizar y previsualizar formato'}
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
          <AlertCircle size={18} className="shrink-0 text-rose-600" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      {analysis && (
        <div className="space-y-4 rounded-xl border border-emerald-200 bg-white p-4">
          <div className="flex items-center gap-2 text-emerald-900">
            <CheckCircle2 size={20} className="text-emerald-700" aria-hidden="true" />
            <span className="font-bold">{analysis.mensaje || 'Información detectada en el documento'}</span>
          </div>

          {analysis.campos_detectados?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Campos detectados listos para aplicar</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {analysis.campos_detectados.map(field => (
                  <span key={field} className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                    <FileCheck size={14} aria-hidden="true" />
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.campos_no_detectados?.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Campos no detectados (podrá completarlos en el formulario guiado)</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {analysis.campos_no_detectados.map(field => (
                  <span key={field} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {analysis.campos_recortados?.length > 0 && (
            <p className="text-xs text-amber-800">
              Nota: Algunos campos excedieron el límite y se recortaron de forma segura: {analysis.campos_recortados.join(', ')}.
            </p>
          )}

          <div className="pt-2">
            <button
              type="button"
              disabled={!canEdit || busy || applying}
              onClick={handleApply}
              className={`${documentationButtonClass} gap-2 bg-emerald-700 text-white hover:bg-emerald-800`}
            >
              <span>{applying ? 'Aplicando información…' : 'Aplicar información al proyecto y borrador'}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
