import React from 'react';
import { importFieldClass, importFieldLabel, importTypes, importValueText } from './projectFileImportData';

function ProposedValues({ proposal }) {
  return <div className="space-y-3">{Object.entries({ comunes: 'Datos compartidos', proyecto: 'Datos del proyecto', borrador: 'Borrador del documento' }).map(([group, title]) => {
    const fields = Object.entries(proposal?.[group] || {});
    return fields.length > 0 && <div key={group} className="min-w-0 space-y-2"><h5 className="font-semibold text-slate-900">{title}</h5><dl className="w-full space-y-2">{fields.map(([key, value]) => <div key={key} className="min-w-0"><dt className="text-sm font-semibold text-slate-800">{importFieldLabel(key)}</dt><dd className="whitespace-pre-wrap text-sm text-slate-700 [overflow-wrap:anywhere]">{importValueText(value)}</dd></div>)}</dl></div>;
  })}</div>;
}

export default function ProjectFileImportReview({ result, selected, onSelect, periods, onPeriod, importData, onImportData, maxPeriods, busy }) {
  return <section aria-label="Revisión de la importación" className="min-w-0 space-y-4 border-t border-slate-200 pt-4 [overflow-wrap:anywhere]">
    <h4 className="text-base font-bold text-slate-900">Revisar archivos antes de guardar</h4>
    <p className="w-full text-sm text-slate-700">Archivos encontrados: {result.archivos.length}. Carpetas encontradas: {result.carpetas.length}. Seleccione los archivos que desea registrar y revise su clasificación y los datos propuestos.</p>
    {result.carpetas_faltantes.length > 0 && <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="w-full font-semibold">Carpetas requeridas que no aparecen en esta carga</p><ul className="w-full list-disc pl-5 [overflow-wrap:anywhere]">{result.carpetas_faltantes.map(folder => <li key={folder}>{folder}</li>)}</ul><p className="w-full">Puede importar un paquete parcial y completar estas carpetas después.</p></div>}
    <label className="flex min-h-[44px] items-center gap-3 text-sm font-semibold text-slate-900"><input type="checkbox" checked={importData} disabled={busy} onChange={event => onImportData(event.target.checked)} className="h-5 w-5 shrink-0 accent-emerald-700" />Completar los campos vacíos con los datos reconocidos</label>
    <p className="w-full text-sm text-slate-700">Se completarán únicamente campos vacíos, sin reemplazar los valores guardados. Si desmarca esta opción, solo se conservarán los archivos. Podrá revisar y generar los documentos desde Documentación.</p>
    <div className="grid min-w-0 grid-cols-1 gap-4">{result.archivos.map(file => <article key={file.ruta} aria-label={`Revisar ${file.nombre_archivo}`} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <label className="flex min-h-[44px] min-w-0 items-start gap-3 text-sm font-bold text-slate-900"><input type="checkbox" checked={selected[file.ruta] || false} disabled={busy} onChange={event => onSelect(file.ruta, event.target.checked)} aria-label={`Incluir ${file.nombre_archivo}`} className="mt-1 h-5 w-5 shrink-0 accent-emerald-700" /><span className="min-w-0 [overflow-wrap:anywhere]">{file.nombre_archivo}</span></label>
      <p className="w-full text-sm text-slate-600 [overflow-wrap:anywhere]">{file.ruta}</p>
      <p className="w-full text-sm font-semibold text-slate-800">{importTypes[file.tipo] || 'Documento de apoyo'} · {new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(file.tamano / 1024)} KB</p>
      {file.tipo === 'informe_bimensual' && <label className="block space-y-1 text-sm font-semibold text-slate-800">Bimestre de {file.nombre_archivo}<input type="number" min="1" max={maxPeriods || undefined} step="1" value={periods[file.ruta] ?? ''} disabled={busy || !selected[file.ruta]} aria-required={selected[file.ruta]} onChange={event => onPeriod(file.ruta, event.target.value)} className={importFieldClass} /></label>}
      {file.advertencias?.length > 0 && <ul className="w-full list-disc space-y-1 pl-5 text-sm text-amber-950">{file.advertencias.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
      <details className="min-w-0 rounded-xl border border-slate-200 bg-white px-3"><summary className="min-h-[44px] cursor-pointer py-3 text-sm font-semibold text-emerald-900">Ver texto y datos propuestos</summary><div className="max-h-96 min-w-0 space-y-4 overflow-y-auto pb-4">
        <ProposedValues proposal={file.propuesta} />
        <div className="space-y-2"><h5 className="font-semibold text-slate-900">Texto reconocido</h5><p className="w-full whitespace-pre-wrap text-sm text-slate-700 [overflow-wrap:anywhere]">{file.texto_extraido || 'No se reconoció texto en este archivo. Se conservará el original.'}</p></div>
      </div></details>
    </article>)}</div>
  </section>;
}
