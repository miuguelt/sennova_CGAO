import React from 'react';
import { FileText, Download } from 'lucide-react';
import { MensajesAPI } from '../../api/mensajes';

// Ancho declarado del marco: sin él, una imagen que aún no cargó aporta un
// min-content de cero y arrastra a la burbuja del mensaje hasta colapsarla.
const ANCHO_MEDIA = 'w-64 sm:w-72';

// Relación de aspecto reservada mientras el archivo llega. Reservar el espacio
// es lo que permite que `loading="lazy"` se dispare y evita el salto de layout.
const RESERVA_IMAGEN = 'aspect-[4/3]';

// Los tamaños se muestran con separador decimal colombiano (coma), no con punto.
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const unidades = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), unidades.length - 1);
  const valor = bytes / Math.pow(k, i);
  const texto = valor.toLocaleString('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: i === 0 ? 0 : 1,
  });
  return `${texto} ${unidades[i]}`;
}

function Imagen({ adjunto, url }) {
  return (
    <div className={`${ANCHO_MEDIA} rounded-xl overflow-hidden border border-slate-200/60 shadow-sm bg-slate-100`}>
      <a href={url} target="_blank" rel="noopener noreferrer" title={`Abrir ${adjunto.nombre_archivo}`}>
        <img
          src={url}
          alt={adjunto.nombre_archivo}
          width={288}
          height={216}
          className={`w-full ${RESERVA_IMAGEN} object-contain hover:opacity-95 transition-opacity`}
          loading="lazy"
        />
      </a>
    </div>
  );
}

function Video({ adjunto, url }) {
  return (
    <div className={`${ANCHO_MEDIA} rounded-xl overflow-hidden border border-slate-200/60 shadow-sm bg-black`}>
      <video
        controls
        preload="metadata"
        src={url}
        className={`w-full ${RESERVA_IMAGEN} object-contain`}
        aria-label={adjunto.nombre_archivo}
      >
        Tu navegador no reproduce video.
      </video>
    </div>
  );
}

function Audio({ adjunto, url }) {
  return (
    <div className={`${ANCHO_MEDIA} p-2 rounded-xl border border-slate-200/60 bg-white/70 shadow-sm`}>
      <p className="text-[10px] font-semibold text-slate-600 mb-1 leading-tight">
        {adjunto.nombre_archivo}
      </p>
      <audio controls preload="metadata" src={url} className="w-full" aria-label={adjunto.nombre_archivo}>
        Tu navegador no reproduce audio.
      </audio>
    </div>
  );
}

function Documento({ adjunto, url }) {
  return (
    <a
      href={url}
      download={adjunto.nombre_archivo}
      className={`${ANCHO_MEDIA} flex items-center gap-3 p-2.5 rounded-xl border border-slate-200/80 bg-white/90 hover:bg-white hover:border-emerald-300 transition-all text-xs text-slate-700 group shadow-sm`}
      title={`Descargar ${adjunto.nombre_archivo}`}
    >
      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors flex-shrink-0">
        <FileText size={18} />
      </div>
      <div className="min-w-0 flex-1">
        {/* El nombre se envuelve en dos líneas antes que perderse tras una elipsis */}
        <p className="font-semibold text-slate-900 leading-tight line-clamp-2">
          {adjunto.nombre_archivo}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">{formatBytes(adjunto.tamano_bytes)}</p>
      </div>
      <Download size={16} className="text-slate-400 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
    </a>
  );
}

/**
 * Adjuntos de un mensaje: imágenes y video se ven en la propia burbuja, el
 * audio se reproduce en línea y el resto se ofrece como descarga.
 */
export default function MessageAttachments({ adjuntos = [] }) {
  if (!adjuntos || adjuntos.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {adjuntos.map((adjunto) => {
        const url = MensajesAPI.urlAdjunto?.(adjunto.id) || `/api/mensajes/adjuntos/${adjunto.id}`;
        const tipo = adjunto.content_type || '';
        const categoria = adjunto.categoria
          || (tipo.startsWith('image/') && 'imagen')
          || (tipo.startsWith('video/') && 'video')
          || (tipo.startsWith('audio/') && 'audio')
          || 'documento';

        const Vista = { imagen: Imagen, video: Video, audio: Audio }[categoria] || Documento;
        return <Vista key={adjunto.id} adjunto={adjunto} url={url} />;
      })}
    </div>
  );
}
