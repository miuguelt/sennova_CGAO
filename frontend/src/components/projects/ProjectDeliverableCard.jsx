import React from 'react';
import { FileText, FileSpreadsheet, FileImage, FileVideo, FileAudio, FileCode, Archive, File } from 'lucide-react';
import Badge from '../ui/Badge';
import { formatFileSize, getDeliverableCategory, importFieldClass, importFieldLabel, importTypes, importValueText } from './projectFileImportData';

function ProposedValues({ proposal }) {
  const groups = { comunes: 'Datos compartidos', proyecto: 'Datos del proyecto', borrador: 'Borrador del documento' };
  return (
    <div className="space-y-3">
      {Object.entries(groups).map(([group, title]) => {
        const fields = Object.entries(proposal?.[group] || {});
        return fields.length > 0 && (
          <div key={group} className="min-w-0 space-y-2">
            <h5 className="font-semibold text-slate-900">{title}</h5>
            <dl className="w-full space-y-2">
              {fields.map(([key, value]) => (
                <div key={key} className="min-w-0">
                  <dt className="text-sm font-semibold text-slate-800">{importFieldLabel(key)}</dt>
                  <dd className="whitespace-pre-wrap text-sm text-slate-700 [overflow-wrap:anywhere]">{importValueText(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
    </div>
  );
}

function getFileIcon(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) return FileText;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'].includes(ext)) return FileImage;
  if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext)) return FileVideo;
  if (['wav', 'ogg', 'oga', 'm4a', 'mp3'].includes(ext)) return FileAudio;
  if (['json'].includes(ext)) return FileCode;
  if (['zip'].includes(ext)) return Archive;
  return File;
}

export default function ProjectDeliverableCard({
  file,
  isSelected,
  selected,
  onSelect,
  onToggleSelect,
  period,
  periods,
  onPeriod,
  onBimesterChange,
  maxPeriods,
  busy,
}) {
  const checked = isSelected !== undefined ? isSelected : (typeof selected === 'object' ? Boolean(selected[file?.ruta]) : Boolean(selected));
  const currentPeriod = period !== undefined ? period : (periods?.[file?.ruta] ?? '');
  const handleSelect = (event) => {
    onSelect?.(file.ruta, event.target.checked);
    onToggleSelect?.(file.ruta, event.target.checked);
  };
  const handlePeriod = (event) => {
    onPeriod?.(file.ruta, event.target.value);
    onBimesterChange?.(file.ruta, event.target.value);
  };
  const FileIcon = getFileIcon(file?.nombre_archivo);
  const category = getDeliverableCategory(file?.tipo);

  return (
    <article aria-label={`Revisar ${file.nombre_archivo}`} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <label className="flex min-h-[44px] min-w-0 items-start gap-3 text-sm font-bold text-slate-900 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            disabled={busy}
            onChange={handleSelect}
            aria-label={`Incluir ${file.nombre_archivo}`}
            className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
          />
          <span className="flex min-w-0 items-center gap-2 [overflow-wrap:anywhere]">
            <FileIcon size={18} aria-hidden="true" className="shrink-0 text-emerald-700" />
            <span>{file.nombre_archivo}</span>
          </span>
        </label>
        <Badge variant={category.variant} className="shrink-0">{category.label}</Badge>
      </div>

      <p className="w-full text-xs text-slate-600 [overflow-wrap:anywhere]">{file.ruta}</p>

      <p className="w-full text-xs font-semibold text-slate-800">
        {importTypes[file.tipo] || 'Documento de apoyo'} · {formatFileSize(file.tamano)}
      </p>

      {file.tipo === 'informe_bimensual' && (
        <label className="block space-y-1 text-sm font-semibold text-slate-800">
          Bimestre de {file.nombre_archivo}
          <input
            type="number"
            min="1"
            max={maxPeriods || undefined}
            step="1"
            value={currentPeriod}
            disabled={busy || !checked}
            aria-required={checked}
            onChange={handlePeriod}
            className={importFieldClass}
          />
        </label>
      )}

      {file.advertencias?.length > 0 && (
        <ul className="w-full list-disc space-y-1 pl-5 text-sm text-amber-950">
          {file.advertencias.map((warning, index) => <li key={index}>{warning}</li>)}
        </ul>
      )}

      <details className="min-w-0 rounded-xl border border-slate-200 bg-white px-3">
        <summary className="min-h-[44px] cursor-pointer py-3 text-sm font-semibold text-emerald-900">
          Ver texto y datos propuestos
        </summary>
        <div className="max-h-96 min-w-0 space-y-4 overflow-y-auto pb-4">
          <ProposedValues proposal={file.propuesta} />
          <div className="space-y-2">
            <h5 className="font-semibold text-slate-900">Texto reconocido</h5>
            <p className="w-full whitespace-pre-wrap text-sm text-slate-700 [overflow-wrap:anywhere]">
              {file.texto_extraido || 'No se reconoció texto en este archivo. Se conservará el original.'}
            </p>
          </div>
        </div>
      </details>
    </article>
  );
}
