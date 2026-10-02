import React, { useEffect, useState } from 'react';
import { AlertCircle, Download, FolderOpen } from 'lucide-react';
import { ProyectosAPI } from '../../api/proyectos';
import { DocumentosAPI } from '../../api/documentos';
import { subscribeToDataRefresh } from '../../utils/dataRefresh';
import ProjectEvidenceStage, { evidenceButtonClass } from './ProjectEvidenceStage';
import ProjectDocumentationEditor from './ProjectDocumentationEditor';

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}

export default function ProjectEvidenceFile({ projectId, currentUser, onNotify }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const canUpload = ['admin', 'investigador'].includes(currentUser?.rol);

  useEffect(() => subscribeToDataRefresh(({ endpoint }) => {
    if (/\/(documentos|proyectos|productos|entregables)(\/|\?|$)/.test(endpoint)) setRevision(value => value + 1);
  }), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    ProyectosAPI.getExpediente(projectId).then(result => {
      if (active) setData(result);
    }).catch(cause => {
      if (active) setError(cause.message || 'No fue posible consultar el expediente. Intente de nuevo.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [projectId, revision]);

  const upload = async (stage, file, description, period) => {
    setError('');
    setSuccess('');
    if (!file || !/\.(pdf|docx|xlsx|pptx|jpe?g|png|mp4)$/i.test(file.name)) {
      setError('Seleccione un archivo PDF, DOCX, XLSX, PPTX, JPG, PNG o MP4.');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('El archivo supera los 10 MB. Reduzca su tamaño e intente de nuevo.');
      return false;
    }
    if (stage.id === 'informes' && (!Number.isInteger(Number(period)) || Number(period) < 1 || (stage.informes_esperados && Number(period) > stage.informes_esperados))) {
      setError('Indique un número de bimestre válido dentro de la duración del proyecto.');
      return false;
    }
    setBusy(true);
    try {
      const payload = new FormData();
      payload.append('file', file);
      payload.append('entidad_tipo', stage.entidad_tipo || 'proyecto');
      payload.append('entidad_id', stage.entidad_id || projectId);
      payload.append('tipo', stage.tipo_documento);
      payload.append('descripcion', description.trim());
      if (stage.id === 'informes') payload.append('periodo_bimestre', String(Number(period)));
      await DocumentosAPI.upload(payload);
      setSuccess('Documento adjuntado al expediente.');
      onNotify?.('Documento adjuntado al expediente.', 'success');
      setRevision(value => value + 1);
      return true;
    } catch (cause) {
      setError(cause.message || 'No fue posible adjuntar el documento. Intente de nuevo.');
      return false;
    } finally { setBusy(false); }
  };

  const download = async (doc = null) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (doc) {
        const result = await DocumentosAPI.download(doc.id);
        if (!result?.data_base64) throw new Error('El documento no contiene datos descargables. Adjunte una copia.');
        const bytes = Uint8Array.from(window.atob(result.data_base64), char => char.charCodeAt(0));
        saveBlob(new Blob([bytes], { type: result.content_type || 'application/octet-stream' }), result.nombre_archivo || doc.nombre_archivo);
        setSuccess('Descarga del documento iniciada.');
      } else {
        const blob = await ProyectosAPI.downloadExpediente(projectId);
        saveBlob(blob, `expediente-${data.codigo_sgps || projectId}.zip`);
        setSuccess(data.completo ? 'Descarga del expediente iniciada.' : 'Descarga del expediente parcial iniciada. Revise los pendientes incluidos en el ZIP.');
      }
    } catch (cause) {
      setError(cause.message || 'No fue posible descargar el archivo. Intente de nuevo.');
    } finally { setBusy(false); }
  };

  return (
    <section aria-label="Expediente del proyecto" className="min-w-0 space-y-5">
      <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
        <h3 className="flex items-center gap-2 text-lg font-bold text-emerald-950"><FolderOpen size={22} aria-hidden="true" />Expediente del proyecto</h3>
        <p className="w-full text-sm leading-relaxed text-emerald-950">Construya la documentación del proyecto en estas seis carpetas. Revise la guía de cada etapa, adjunte los documentos vigentes y corrija los pendientes antes de radicar.</p>
        {data && <>
          <p className="w-full text-sm font-semibold text-emerald-950">{data.completo ? 'Expediente completo' : 'Expediente en construcción'} · {data.porcentaje_completitud}% de requisitos cumplidos.</p>
          <progress aria-label="Completitud del expediente" aria-valuenow={data.porcentaje_completitud} max="100" value={data.porcentaje_completitud} className="h-3 w-full accent-emerald-700" />
          <button type="button" disabled={busy} onClick={() => download()} className={`${evidenceButtonClass} gap-2`}><Download size={16} aria-hidden="true" />{data.completo ? 'Descargar expediente (ZIP)' : 'Descargar expediente parcial (ZIP)'}</button>
          {!data.completo && <p className="w-full text-sm text-emerald-950">La descarga conserva las seis carpetas e incluye el reporte de pendientes. Un paquete parcial requiere completar y revisar sus evidencias.</p>}
          {data.alcance && <p className="w-full text-sm text-emerald-950">{data.alcance}</p>}
        </>}
      </div>
      {success && <p role="status" className="w-full rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">{success}</p>}
      {error && <div role="alert" className="space-y-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
        <p className="flex w-full items-start gap-2 text-sm"><AlertCircle size={18} aria-hidden="true" className="shrink-0" />{error}</p>
        <button type="button" className={evidenceButtonClass} onClick={() => setRevision(value => value + 1)}>Reintentar consulta</button>
      </div>}
      <ProjectDocumentationEditor projectId={projectId} currentUser={currentUser} onNotify={onNotify} />
      {loading && <div role="status" className="animate-pulse space-y-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">Consultando expediente…<div className="h-16 rounded-xl bg-slate-100" /><div className="h-16 rounded-xl bg-slate-100" /></div>}
      {!loading && data && <>
        {data.pendientes?.length > 0 && <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h4 className="font-bold text-amber-950">Pendientes por resolver</h4><ul className="w-full list-disc space-y-1 pl-5 text-sm text-amber-950">{data.pendientes.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
        <div className="grid min-w-0 grid-cols-1 gap-4">{data.etapas.map(stage => <ProjectEvidenceStage key={stage.id} stage={stage} canUpload={canUpload} busy={busy} onUpload={upload} onDownload={download} />)}</div>
        {data.documentos_sin_clasificar?.length > 0 && <section aria-label="Archivos adicionales" className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
          <h4 className="font-bold text-slate-900">Archivos adicionales</h4>
          <p className="w-full text-sm text-slate-700">Se conservan en el ZIP y requieren clasificación para contar como evidencia de una etapa.</p>
          <ul className="w-full list-disc pl-5 text-sm text-slate-700">{data.documentos_sin_clasificar.map(doc => <li key={doc.id} className="[overflow-wrap:anywhere]">{doc.nombre_archivo}</li>)}</ul>
        </section>}
      </>}
    </section>
  );
}
