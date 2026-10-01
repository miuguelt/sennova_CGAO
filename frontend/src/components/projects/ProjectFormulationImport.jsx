import React, { useId, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileText, FileUp, Loader2, RefreshCw, X } from 'lucide-react';
import { ProyectosAPI } from '../../api/proyectos';

const emptyHint = 'Si ya tienes la formulación, cárgala para proponer datos del proyecto.';
const fieldLabels = {
  nombre: 'Título',
  objetivo_general: 'Objetivo general',
  objetivos_especificos: 'Objetivos específicos',
  descripcion: 'Contenido de la formulación',
};

export default function ProjectFormulationImport({ onAnalysis, onFileChange }) {
  const inputId = useId();
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState('empty');
  const [errorMessage, setErrorMessage] = useState('');

  const analyzeFile = async (selectedFile) => {
    setStatus('loading');
    setErrorMessage('');
    try {
      const result = await ProyectosAPI.analyzeFormulation(selectedFile);
      setAnalysis(result);
      onAnalysis?.(result);
      setStatus('ready');
    } catch (error) {
      setErrorMessage(error.message || 'No fue posible leer el archivo.');
      setStatus('error');
    }
  };

  const handleFileSelection = (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.docx')) {
      setFile(null);
      setAnalysis(null);
      onFileChange?.(null);
      setErrorMessage('Solo se admiten archivos .docx. Guarda el documento en Word y vuelve a cargarlo.');
      setStatus('error');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      setFile(null);
      setAnalysis(null);
      onFileChange?.(null);
      setErrorMessage('El archivo supera el límite de 10 MB. Comprime o reduce el documento y vuelve a intentarlo.');
      setStatus('error');
      return;
    }
    setFile(selectedFile);
    setAnalysis(null);
    onFileChange?.(selectedFile);
    void analyzeFile(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    setAnalysis(null);
    setErrorMessage('');
    setStatus('empty');
    onFileChange?.(null);
  };

  const retryAnalysis = () => {
    if (file) {
      void analyzeFile(file);
      return;
    }
    inputRef.current?.click();
  };

  const selectedFields = Object.keys(analysis?.suggested_fields || {});
  const detectedCount = selectedFields.length;

  return (
    <section className="space-y-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 p-4 sm:p-5" aria-label="Importar formulación de proyecto">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-white p-2.5 text-emerald-700 shadow-sm"><FileUp size={19} /></span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-slate-900">Alimentar el proyecto desde un DOCX</h3>
          <p className="mt-1 text-sm text-slate-600">Leemos el título, los objetivos y las secciones de la formulación. Tú revisas y corriges los datos antes de guardarlos.</p>
        </div>
      </div>

      <input
        ref={inputRef}
        id={inputId}
        className="sr-only"
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        aria-label="Seleccionar formulación DOCX"
        onChange={handleFileSelection}
      />

      {status === 'empty' && (
        <div className="space-y-2">
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-emerald-300 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600"><FileText size={16} className="text-emerald-700" /><span>{emptyHint}</span></div>
            <label htmlFor={inputId} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800 focus-within:ring-2 focus-within:ring-emerald-600 focus-within:ring-offset-2">
              <FileUp size={16} /> Seleccionar DOCX
            </label>
          </div>
          <p className="px-1 text-xs text-slate-500">Máximo 10 MB. Se conserva el archivo original como soporte.</p>
          <p className="px-1 text-xs text-slate-500">Este importador sugiere datos; no certifica el cumplimiento ni reemplaza el formato institucional vigente.</p>
          <p className="px-1 text-xs text-slate-500">Si cargas otro DOCX, se conservan los campos que ya diligenciaste.</p>
        </div>
      )}

      {status === 'loading' && (
        <div className="space-y-3 rounded-xl border border-emerald-100 bg-white p-4" aria-live="polite">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><Loader2 size={16} className="animate-spin" /> Leyendo la formulación…</div>
          <div className="animate-pulse space-y-2" aria-label="Cargando datos">
            <div className="h-3 w-3/4 rounded bg-slate-200" />
            <div className="h-3 w-full rounded bg-slate-100" />
            <div className="h-3 w-2/3 rounded bg-slate-100" />
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-white p-4" role="status">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-700" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-emerald-900">Lectura lista: {detectedCount} {detectedCount === 1 ? 'campo encontrado' : 'campos encontrados'}</p>
                <p className="mt-0.5 break-words text-xs text-slate-600">{file?.name}</p>
              </div>
            </div>
            <button type="button" onClick={clearFile} aria-label="Quitar archivo" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-600">
              <X size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedFields.map((field) => <span key={field} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">{fieldLabels[field] || field}</span>)}
          </div>
          {analysis?.referencias_detectadas?.grupo && <p className="text-xs text-slate-600">Grupo detectado: <strong>{analysis.referencias_detectadas.grupo}</strong></p>}
          {analysis?.referencias_detectadas?.semillero && <p className="text-xs text-slate-600">Semillero detectado: <strong>{analysis.referencias_detectadas.semillero}</strong></p>}
          {analysis?.campos_no_detectados?.length > 0 && <p className="text-xs text-amber-800">Revisa los campos que no se pudieron extraer; puedes completarlos en el formulario.</p>}
          <p className="text-xs text-slate-500">Las sugerencias quedaron en el formulario. Verifica cada dato antes de crear el proyecto.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div className="flex items-start gap-2 text-sm text-rose-800"><AlertCircle size={17} className="mt-0.5 shrink-0" /><span>{errorMessage}</span></div>
          <div className="flex shrink-0 gap-2">
            <button type="button" onClick={retryAnalysis} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-500"><RefreshCw size={15} /> Intentar de nuevo</button>
            {file && <button type="button" onClick={clearFile} aria-label="Quitar archivo" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-600"><X size={16} /></button>}
            <label htmlFor={inputId} className="inline-flex min-h-10 cursor-pointer items-center rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 focus-within:ring-2 focus-within:ring-emerald-600">Elegir otro DOCX</label>
          </div>
        </div>
      )}
    </section>
  );
}
