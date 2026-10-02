import React, { useState } from 'react';
import { FolderOpen } from 'lucide-react';

export const evidenceButtonClass = 'inline-flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 disabled:opacity-50';
const fieldClass = 'min-h-[44px] w-full min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600';

export default function ProjectEvidenceStage({ stage, canUpload, busy, onUpload, onDownload }) {
  const [file, setFile] = useState(null);
  const [description, setDescription] = useState('');
  const [period, setPeriod] = useState('');
  const [documentType, setDocumentType] = useState(stage.tipo_documento);
  const [productId, setProductId] = useState('');
  const submit = async (event) => {
    event.preventDefault();
    const destination = productId ? { entidad_tipo: 'producto', entidad_id: productId, tipo_documento: 'soporte_minciencias' } : { tipo_documento: documentType };
    if (await onUpload({ ...stage, ...destination }, file, description, period)) {
      setFile(null);
      setDescription('');
      setPeriod('');
      setDocumentType(stage.tipo_documento);
      setProductId('');
      event.target.reset();
    }
  };

  return (
    <section aria-label={stage.titulo} className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex min-w-0 flex-wrap items-start gap-3">
        <FolderOpen aria-hidden="true" size={22} className="shrink-0 text-emerald-700" />
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-slate-900">{stage.titulo}</h4>
          <p className="w-full text-xs text-slate-600 [overflow-wrap:anywhere]">{stage.carpeta}</p>
        </div>
        <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${stage.completo ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-950'}`}>{stage.completo ? 'Completa' : 'Pendiente'}</span>
      </div>
      <p className="w-full text-sm leading-relaxed text-slate-700">{stage.guia}</p>
      {stage.id === 'productos' && <p className="w-full text-sm text-slate-700">Registre y verifique los productos en el módulo Productos. Adjunte aquí el soporte correspondiente a cada producto; una evidencia general del proyecto sirve como material adicional.</p>}
      {stage.faltantes?.length > 0 && <ul className="w-full list-disc space-y-1 pl-5 text-sm text-amber-950">{stage.faltantes.map((item, index) => <li key={index}>{item}</li>)}</ul>}
      {stage.id === 'informes' && stage.bimestres_pendientes?.length > 0 && <p className="w-full text-sm text-slate-700">Bimestres pendientes: {stage.bimestres_pendientes.join(', ')}.</p>}
      {stage.documentos?.length ? <div className="space-y-3">{stage.documentos.map(doc => (
        <div key={doc.id} className="min-w-0 space-y-2 rounded-xl bg-slate-50 p-3">
          <p className="w-full text-sm font-semibold text-slate-900 [overflow-wrap:anywhere]">{doc.nombre_archivo}</p>
          {doc.descripcion && <p className="w-full text-sm text-slate-700">{doc.descripcion}</p>}
          {doc.periodo_bimestre && <p className="text-sm text-slate-700">Bimestre {doc.periodo_bimestre}</p>}
          {!doc.disponible && <p className="text-sm text-rose-800">Archivo no disponible. Adjunte una copia.</p>}
          <button type="button" className={evidenceButtonClass} disabled={busy || !doc.disponible} onClick={() => onDownload(doc)} aria-label={`Descargar ${doc.nombre_archivo}`}>Descargar archivo</button>
        </div>
      ))}</div> : <p className="w-full rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Aún no hay documentos en esta carpeta. Revise la guía y adjunte la evidencia correspondiente.</p>}
      {canUpload && <form onSubmit={submit} className="space-y-3 border-t border-slate-200 pt-4">
        {stage.id === 'productos' && stage.productos?.length > 0 && <label className="block space-y-1 text-sm font-semibold text-slate-800">Destino del soporte
          <select title="Seleccione el producto al que pertenece este soporte" value={productId} disabled={busy} onChange={event => setProductId(event.target.value)} className={`${fieldClass} pr-10`}>
            <option value="">Evidencia general del proyecto</option>
            {stage.productos.map(product => <option key={product.id} value={product.id}>{product.nombre} · {product.soporte_disponible ? 'Con soporte' : 'Sin soporte'}</option>)}
          </select>
        </label>}
        {stage.id === 'cierre' && <label className="block space-y-1 text-sm font-semibold text-slate-800">Documento de cierre
          <select title="Seleccione el documento de cierre que va a adjuntar" value={documentType} disabled={busy} onChange={event => setDocumentType(event.target.value)} className={`${fieldClass} pr-10`}>
            <option value="acta_cierre">Acta de cierre</option>
            <option value="informe_final">Informe final</option>
          </select>
        </label>}
        <label className="block space-y-1 text-sm font-semibold text-slate-800">Archivo de {stage.titulo}
          <input type="file" disabled={busy} accept=".pdf,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.mp4" onChange={event => setFile(event.target.files?.[0] || null)} className={fieldClass} />
        </label>
        <label className="block space-y-1 text-sm font-semibold text-slate-800">Descripción de {stage.titulo}
          <textarea value={description} disabled={busy} onChange={event => setDescription(event.target.value)} rows={2} className={fieldClass} placeholder="Indique la versión, fecha y contenido del documento." />
        </label>
        {stage.id === 'informes' && <label className="block space-y-1 text-sm font-semibold text-slate-800">Número de bimestre
          <input type="number" value={period} min="1" max={stage.informes_esperados || undefined} disabled={busy} onChange={event => setPeriod(event.target.value)} className={fieldClass} />
        </label>}
        <p className="w-full text-xs text-slate-600">PDF, DOCX, XLSX, PPTX, JPG, PNG o MP4. Tamaño máximo: 10 MB.</p>
        <button type="submit" disabled={busy} className={evidenceButtonClass}>{busy ? 'Procesando…' : 'Adjuntar documento'}</button>
      </form>}
    </section>
  );
}
