import React, { useEffect, useRef, useState } from 'react';
import { FolderArchive } from 'lucide-react';
import { ProjectFileImportAPI } from '../../api/projectFileImport';
import { useUnsavedChangesGuard } from '../../context/UnsavedChangesContext';
import Button from '../ui/Button';
import ConfirmDialog from '../ui/ConfirmDialog';
import ErrorBanner from '../ui/ErrorBanner';
import ProjectFileImportReview from './ProjectFileImportReview';
import { importExtensions, importFieldClass, importFolders, importTypes, validateImportFiles } from './projectFileImportData';

export default function ProjectFileImport({ projectId, projectName, maxPeriods, onImported, onNotify, confirmClear = false }) {
  const [files, setFiles] = useState([]);
  const [folder, setFolder] = useState('');
  const [type, setType] = useState('');
  const [result, setResult] = useState(null);
  const [selected, setSelected] = useState({});
  const [periods, setPeriods] = useState({});
  const [importData, setImportData] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState('');
  const [success, setSuccess] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  const inputRef = useRef(null);
  const active = useRef(false);
  const guard = useUnsavedChangesGuard();

  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);

  const isZip = files.length === 1 && /\.zip$/i.test(files[0].name);
  const source = { files, carpeta: isZip ? '' : folder, tipo: isZip ? '' : type };
  const chosen = result?.archivos.filter(file => selected[file.ruta]) || [];
  const isDirty = (files.length > 0 || result !== null) && !busy;

  useEffect(() => {
    return guard.registerSession(`project-file-import:${projectId}`, {
      dirty: isDirty,
      save: async () => {
        if (result && chosen.length > 0) {
          await save();
          return true;
        }
        return false;
      },
      discard: () => {
        setFiles([]);
        resetReview();
        if (inputRef.current) inputRef.current.value = '';
      },
    });
  }, [guard, projectId, isDirty, result, chosen.length]);

  function resetReview() {
    setResult(null); setSelected({}); setPeriods({}); setError(''); setRetry(''); setSuccess(''); setWarnings([]);
  }
  function clear() {
    setFiles([]); resetReview(); if (inputRef.current) inputRef.current.value = '';
  }
  function handleClearClick() {
    if (isDirty && confirmClear) setShowConfirmClear(true);
    else clear();
  }
  function changeFiles(event) { setFiles(Array.from(event.target.files || [])); resetReview(); }
  function changeFolder(event) { setFolder(event.target.value); resetReview(); }
  function changeType(event) { setType(event.target.value); resetReview(); }
  function select(path, checked) { setSelected(value => ({ ...value, [path]: checked })); setError(''); }
  function selectAll(checked) {
    if (result?.archivos) {
      setSelected(Object.fromEntries(result.archivos.map(file => [file.ruta, checked])));
      setError('');
    }
  }
  function changePeriod(path, value) { setPeriods(previous => ({ ...previous, [path]: value })); setError(''); }

  async function analyze() {
    const validation = validateImportFiles(files);
    setError(validation); setRetry(''); setSuccess('');
    if (validation) return;
    setBusy('analyze'); setResult(null);
    try {
      const response = await ProjectFileImportAPI.analyze(projectId, source);
      if (!active.current) return;
      if (String(response.proyecto_id) !== String(projectId)) throw new Error('La respuesta no corresponde al proyecto actual. Analice los archivos de nuevo.');
      setResult(response);
      setSelected(Object.fromEntries(response.archivos.map(file => [file.ruta, true])));
      setPeriods(Object.fromEntries(response.archivos.map(file => [file.ruta, file.periodo_bimestre ?? ''])));
    } catch (cause) {
      if (active.current) { setError(cause.message || 'No fue posible analizar los archivos. Intente de nuevo.'); setRetry('analyze'); }
    } finally { if (active.current) setBusy(''); }
  }

  async function save() {
    const invalid = chosen.find(file => file.tipo === 'informe_bimensual' && (!Number.isInteger(Number(periods[file.ruta])) || Number(periods[file.ruta]) < 1 || (maxPeriods && Number(periods[file.ruta]) > maxPeriods)));
    setError(''); setRetry('');
    if (invalid) { setError(`Indique un número de bimestre válido para ${invalid.nombre_archivo}${maxPeriods ? `, entre 1 y ${maxPeriods}` : ''}.`); return; }
    setBusy('save');
    try {
      const selection = chosen.map(file => ({ ruta: file.ruta, sha256: file.sha256, periodo_bimestre: file.tipo === 'informe_bimensual' ? Number(periods[file.ruta]) : null, importar_datos: importData }));
      const response = await ProjectFileImportAPI.save(projectId, source, selection);
      if (!active.current) return;
      clear();
      const message = `Archivos guardados: ${response.archivos_importados}. Archivos omitidos: ${response.archivos_omitidos}. Campos registrados: ${response.campos_registrados}.`;
      setSuccess(message); setWarnings(response.advertencias || []);
      onNotify?.(message, 'success');
      onImported?.();
    } catch (cause) {
      if (active.current) { setError(cause.message || 'No fue posible guardar los archivos. Intente de nuevo.'); setRetry('save'); }
    } finally { if (active.current) setBusy(''); }
  }

  return (
    <section aria-label="Importar archivos al proyecto" className="min-w-0 space-y-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 items-start gap-3">
        <FolderArchive size={24} aria-hidden="true" className="shrink-0 text-emerald-700" />
        <div className="min-w-0 space-y-1">
          <h3 className="text-lg font-bold text-slate-900">Importar archivos al proyecto</h3>
          <p className="w-full text-sm font-semibold text-emerald-900 [overflow-wrap:anywhere]">Proyecto de destino: {projectName || projectId}</p>
        </div>
      </div>
      <p className="w-full text-sm leading-relaxed text-slate-700">Cargue un ZIP con las carpetas del proyecto o seleccione archivos individuales. El sistema conservará los originales y propondrá los datos que reconozca en los formatos compatibles. Revise los resultados antes de guardarlos en este proyecto.</p>
      <label className="block space-y-2 text-sm font-semibold text-slate-800">ZIP o archivos individuales
        <input ref={inputRef} type="file" multiple accept={`.zip,.${importExtensions.join(',.')}`} disabled={Boolean(busy)} onChange={changeFiles} className={importFieldClass} />
      </label>
      <p className="w-full text-xs leading-relaxed text-slate-600">Un ZIP de hasta 50 MB o archivos de hasta 10 MB cada uno, incluidos los que contiene el ZIP. Máximo 500 archivos y 200 MB en total después de descomprimir. Se admiten documentos PDF, Word, Excel y PowerPoint; texto TXT, MD, CSV y JSON; imágenes, audio y video.</p>
      <details className="rounded-xl bg-slate-50 px-3">
        <summary className="min-h-[44px] cursor-pointer py-3 text-sm font-semibold text-emerald-900">Consultar formatos admitidos</summary>
        <p className="w-full pb-3 text-xs leading-relaxed text-slate-700">{importExtensions.join(', ').toUpperCase()}.</p>
      </details>
      {files.length > 0 && <p className="w-full text-sm text-slate-700 [overflow-wrap:anywhere]">Selección actual: {files.length === 1 ? files[0].name : `${files.length} archivos`}. {isZip ? 'Se conservarán las rutas de las subcarpetas del ZIP.' : 'La carpeta y el tipo se aplicarán a esta selección.'}</p>}
      {!isZip && files.length > 0 && (
        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="block min-w-0 space-y-1 text-sm font-semibold text-slate-800">Carpeta de destino
            <select value={folder} title="Seleccione la carpeta para estos archivos individuales" disabled={Boolean(busy)} onChange={changeFolder} className={`${importFieldClass} pr-10`}>
              <option value="">Detectar según el archivo</option>
              {importFolders.map(item => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="block min-w-0 space-y-1 text-sm font-semibold text-slate-800">Tipo de documento
            <select value={type} title="Seleccione el tipo de documento para estos archivos individuales" disabled={Boolean(busy)} onChange={changeType} className={`${importFieldClass} pr-10`}>
              <option value="">Detectar según el archivo</option>
              {Object.entries(importTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={analyze} disabled={Boolean(busy) || !files.length} loading={busy === 'analyze'} variant="sena">Analizar archivos</Button>
        {files.length > 0 && <Button type="button" onClick={handleClearClick} disabled={Boolean(busy)} variant="outline">Limpiar selección</Button>}
      </div>
      {busy && <div role="status" className="animate-pulse space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">{busy === 'analyze' ? 'Analizando archivos…' : 'Guardando archivos…'}<div className="h-14 rounded-xl bg-slate-200" /></div>}
      {error && (
        <div className="space-y-3">
          <ErrorBanner title="Error en la importación de archivos" message={error} variant="danger" />
          {retry && <Button type="button" disabled={Boolean(busy)} onClick={retry === 'analyze' ? analyze : save} variant="outline">{retry === 'analyze' ? 'Reintentar análisis' : 'Reintentar guardado'}</Button>}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <p className="w-full">{success}</p>
          {warnings.length > 0 && <ul className="mt-2 w-full list-disc pl-5">{warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
        </div>
      )}
      {result && (
        <>
          <ProjectFileImportReview result={result} selected={selected} onSelect={select} periods={periods} onPeriod={changePeriod} importData={importData} onImportData={setImportData} maxPeriods={maxPeriods} busy={Boolean(busy)} onSelectAll={selectAll} />
          <Button type="button" onClick={save} disabled={Boolean(busy) || !chosen.length} loading={busy === 'save'} variant="sena" className="w-full sm:w-auto">Guardar archivos en este proyecto</Button>
        </>
      )}
      <ConfirmDialog isOpen={showConfirmClear} onClose={() => setShowConfirmClear(false)} onConfirm={() => { setShowConfirmClear(false); clear(); }} title="¿Descartar archivos seleccionados?" description="Se descartará la selección actual y los resultados de análisis no guardados. Esta acción no se puede deshacer." confirmText="Descartar selección" cancelText="Continuar con la importación" variant="warning" />
    </section>
  );
}
