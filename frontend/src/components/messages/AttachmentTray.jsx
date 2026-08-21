import React from 'react';
import { X, Paperclip, RefreshCw, Image, Film, Music, FileText } from 'lucide-react';

const ICONO_POR_CATEGORIA = {
  imagen: Image,
  video: Film,
  audio: Music,
  documento: FileText,
};

/**
 * Archivos ya subidos que se enviarán con el próximo mensaje.
 * Cada uno puede retirarse antes de enviar.
 */
export function AttachmentTray({ adjuntos = [], onQuitar }) {
  if (adjuntos.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {adjuntos.map((adjunto) => {
        const Icono = ICONO_POR_CATEGORIA[adjunto.categoria] || FileText;
        return (
          <div
            key={adjunto.id}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 max-w-[16rem]"
          >
            <Icono size={14} className="text-emerald-600 flex-shrink-0" />
            <span className="min-w-0 leading-tight line-clamp-1">{adjunto.nombre_archivo}</span>
            <button
              type="button"
              onClick={() => onQuitar?.(adjunto)}
              className="text-slate-400 hover:text-rose-600 transition-colors flex-shrink-0"
              title={`Quitar ${adjunto.nombre_archivo}`}
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Botón de clip con su input oculto: abre el selector de archivos del sistema.
 */
export function AttachmentButton({ inputRef, onArchivos, subiendo, disabled }) {
  return (
    <>
      <input
        type="file"
        ref={inputRef}
        onChange={(e) => onArchivos?.(e.target.files)}
        className="hidden"
        multiple
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={subiendo || disabled}
        className="h-11 w-11 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 text-slate-400 flex items-center justify-center flex-shrink-0 transition-colors disabled:opacity-50"
        title="Adjuntar imagen, video, audio o documento"
      >
        {subiendo ? (
          <RefreshCw size={18} className="animate-spin text-emerald-600" />
        ) : (
          <Paperclip size={18} />
        )}
      </button>
    </>
  );
}
