import React from 'react';
import ProjectDeliverableCard from './ProjectDeliverableCard';
import { formatFileSize } from './projectFileImportData';

export default function ProjectFileImportReview({
  result,
  selected,
  onSelect,
  periods,
  onPeriod,
  importData,
  onImportData,
  maxPeriods,
  busy,
  onSelectAll,
}) {
  const totalFiles = result?.archivos?.length || 0;
  const selectedFiles = result?.archivos?.filter(file => selected[file.ruta]) || [];
  const selectedCount = selectedFiles.length;
  const selectedBytes = selectedFiles.reduce((total, file) => total + (file.tamano || 0), 0);

  const handleSelectAll = () => {
    if (typeof onSelectAll === 'function') {
      onSelectAll(true);
    } else {
      result?.archivos?.forEach(file => onSelect(file.ruta, true));
    }
  };

  const handleDeselectAll = () => {
    if (typeof onSelectAll === 'function') {
      onSelectAll(false);
    } else {
      result?.archivos?.forEach(file => onSelect(file.ruta, false));
    }
  };

  return (
    <section aria-label="Revisión de la importación" className="min-w-0 space-y-4 border-t border-slate-200 pt-4 [overflow-wrap:anywhere]">
      <h4 className="text-base font-bold text-slate-900">Revisar archivos antes de guardar</h4>
      <p className="w-full text-sm text-slate-700">
        Archivos encontrados: {result.archivos.length}. Carpetas encontradas: {result.carpetas.length}. Seleccione los archivos que desea registrar y revise su clasificación y los datos propuestos.
      </p>

      {result.carpetas_faltantes.length > 0 && (
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="w-full font-semibold">Carpetas requeridas que no aparecen en esta carga</p>
          <ul className="w-full list-disc pl-5 [overflow-wrap:anywhere]">
            {result.carpetas_faltantes.map(folder => <li key={folder}>{folder}</li>)}
          </ul>
          <p className="w-full">Puede importar un paquete parcial y completar estas carpetas después.</p>
        </div>
      )}

      {/* Barra de KPIs y acciones masivas */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Resumen de selección</p>
          <p className="text-sm font-semibold text-slate-900">
            {selectedCount} de {totalFiles} archivos seleccionados ({formatFileSize(selectedBytes)})
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || selectedCount === totalFiles}
            onClick={handleSelectAll}
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
          >
            Seleccionar todos
          </button>
          <button
            type="button"
            disabled={busy || selectedCount === 0}
            onClick={handleDeselectAll}
            className="inline-flex min-h-[36px] items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 disabled:opacity-50 transition-all cursor-pointer"
          >
            Deseleccionar todos
          </button>
        </div>
      </div>

      <label className="flex min-h-[44px] items-center gap-3 text-sm font-semibold text-slate-900">
        <input
          type="checkbox"
          checked={importData}
          disabled={busy}
          onChange={event => onImportData(event.target.checked)}
          className="h-5 w-5 shrink-0 accent-emerald-700"
        />
        Completar los campos vacíos con los datos reconocidos
      </label>
      <p className="w-full text-sm text-slate-700">
        Se completarán únicamente campos vacíos, sin reemplazar los valores guardados. Si desmarca esta opción, solo se conservarán los archivos. Podrá revisar y generar los documentos desde Documentación.
      </p>

      <div className="grid min-w-0 grid-cols-1 gap-4">
        {result.archivos.map(file => (
          <ProjectDeliverableCard
            key={file.ruta}
            file={file}
            selected={selected}
            onSelect={onSelect}
            periods={periods}
            onPeriod={onPeriod}
            maxPeriods={maxPeriods}
            busy={busy}
          />
        ))}
      </div>
    </section>
  );
}
