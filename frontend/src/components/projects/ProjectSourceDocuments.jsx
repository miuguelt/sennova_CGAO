import React, { useEffect, useState } from 'react';
import { AlertCircle, Download, FileText, Loader2, RefreshCw } from 'lucide-react';
import { DocumentosAPI } from '../../api/documentos';

export default function ProjectSourceDocuments({ projectId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [reloadSequence, setReloadSequence] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMessage('');
    DocumentosAPI.getProyectoDocumentos(projectId)
      .then((result) => {
        if (!active) return;
        setDocuments((Array.isArray(result) ? result : [])
          .filter(document => document.tipo === 'formulacion_proyecto'));
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(error.message || 'No fue posible consultar los documentos del proyecto.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [projectId, reloadSequence]);

  const downloadSource = async (source) => {
    setDownloadingId(source.id);
    setErrorMessage('');
    let objectUrl = null;
    try {
      const result = await DocumentosAPI.download(source.id);
      if (!result?.data_base64) throw new Error('El documento no contiene datos descargables.');
      const binary = window.atob(result.data_base64);
      const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      const blob = new Blob([bytes], {
        type: result.content_type || source.content_type || 'application/octet-stream',
      });
      objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = result.nombre_archivo || source.nombre_archivo || 'formulacion.docx';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      const finishedUrl = objectUrl;
      objectUrl = null;
      window.setTimeout(() => URL.revokeObjectURL(finishedUrl), 0);
    } catch (error) {
      setErrorMessage(error.message || 'No fue posible descargar la formulación. Intenta de nuevo.');
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setDownloadingId(null);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4" aria-label="Formulación fuente del proyecto">
      <div className="flex items-start gap-2">
        <FileText size={17} className="mt-0.5 shrink-0 text-emerald-700" />
        <div>
          <h4 className="text-sm font-bold text-slate-900">Formulación fuente</h4>
          <p className="mt-0.5 text-xs text-slate-600">DOCX original adjunto al crear el proyecto.</p>
        </div>
      </div>

      {loading && (
        <p role="status" className="flex items-center gap-2 text-xs text-slate-600">
          <Loader2 size={14} className="animate-spin" /> Consultando archivo…
        </p>
      )}

      {!loading && !errorMessage && documents.length === 0 && (
        <p className="text-xs text-slate-600">Aún no hay una formulación DOCX adjunta a este proyecto.</p>
      )}

      {!loading && documents.map(source => (
        <div key={source.id} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="break-all text-xs font-semibold text-slate-800">{source.nombre_archivo || 'Formulación DOCX'}</p>
          <button
            type="button"
            onClick={() => void downloadSource(source)}
            disabled={downloadingId === source.id}
            aria-label={`Descargar formulación original ${source.nombre_archivo || ''}`.trim()}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:opacity-60"
          >
            {downloadingId === source.id
              ? <Loader2 size={14} className="animate-spin" />
              : <Download size={14} />}
            Descargar formulación original
          </button>
        </div>
      ))}

      {errorMessage && (
        <div role="alert" className="flex flex-col gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-xs text-rose-800"><AlertCircle size={15} className="mt-0.5 shrink-0" />{errorMessage}</p>
          <button
            type="button"
            onClick={() => setReloadSequence(value => value + 1)}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
          >
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      )}
    </section>
  );
}
