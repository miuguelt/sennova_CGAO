import React from 'react';
import { Send, RefreshCw } from 'lucide-react';
import { AttachmentTray, AttachmentButton } from './AttachmentTray';
import Button from '../ui/Button';

const SUGERENCIAS = [
  '¡Hola! ¿Cómo estás?',
  '¿Me confirmas el avance del entregable?',
  'Quedo atento a tus comentarios.',
  'Excelente trabajo con la bitácora.',
];

/**
 * Zona de redacción: sugerencias rápidas, adjuntos pendientes y envío.
 *
 * El botón de enviar se habilita con texto o con adjuntos: un mensaje puede
 * consistir únicamente en archivos.
 */
export default function MessageComposer({
  destinatarioNombre,
  texto,
  onTextoChange,
  onSugerencia,
  onKeyDown,
  onEnviar,
  textareaRef,
  adjuntos,
  enviando,
}) {
  const sinContenido = !texto.trim() && adjuntos.ids.length === 0;

  return (
    <>
      <div className="px-4 py-2 bg-white/70 border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">
          Sugerencias:
        </span>
        {SUGERENCIAS.map((sugerencia) => (
          <button
            key={sugerencia}
            type="button"
            onClick={() => onSugerencia(sugerencia)}
            className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-[11px] text-slate-600 font-medium whitespace-nowrap transition-colors border border-transparent hover:border-emerald-200"
          >
            {sugerencia}
          </button>
        ))}
      </div>

      <div className="p-4 bg-white border-t border-slate-200">
        <AttachmentTray adjuntos={adjuntos.adjuntos} onQuitar={adjuntos.quitar} />

        <form onSubmit={onEnviar} className="flex items-end gap-2 sm:gap-3">
          <AttachmentButton
            inputRef={adjuntos.inputRef}
            onArchivos={adjuntos.agregarArchivos}
            subiendo={adjuntos.subiendo}
            disabled={enviando}
          />

          <div className="flex-1 bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-2xl p-2.5 transition-all">
            <textarea
              ref={textareaRef}
              rows={1}
              value={texto}
              onChange={onTextoChange}
              onKeyDown={onKeyDown}
              placeholder={`Escribe un mensaje para ${destinatarioNombre}... (Enter para enviar)`}
              className="w-full bg-transparent border-0 resize-none outline-none text-xs font-medium text-slate-800 placeholder:text-slate-400 max-h-28"
            />
          </div>

          <Button
            type="submit"
            disabled={sinContenido || enviando || adjuntos.subiendo}
            className="h-11 w-11 p-0 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? <RefreshCw size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </form>
      </div>
    </>
  );
}
