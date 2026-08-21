import React from 'react';
import { Mail, CheckCircle2, Trash2, ArrowRight } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const PRIORIDAD_COLORS = {
  urgente: 'bg-rose-100 text-rose-800 border-rose-300',
  alta: 'bg-amber-100 text-amber-900 border-amber-300',
  normal: 'bg-slate-100 text-slate-700 border-slate-200',
  baja: 'bg-sky-50 text-sky-800 border-sky-200',
};

const NotificationDetailModal = ({ notif, target, icon: Icon, onClose, onToggleLeida, onDelete, onAction }) => {
  if (!notif) return null;
  return (
  <Modal
    isOpen={!!notif}
    onClose={onClose}
    title="Detalle de Notificación"
    maxWidth="max-w-lg"
  >
    <div className="space-y-5">
      <div className="flex items-start gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-600/20">
          <Icon size={24} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-slate-900 text-base leading-snug">
            {notif.titulo}
          </h3>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${PRIORIDAD_COLORS[notif.prioridad] || PRIORIDAD_COLORS.normal}`}>
              Prioridad {notif.prioridad}
            </span>
            {notif.entidad_tipo && (
              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {notif.entidad_tipo}
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">
              {new Date(notif.created_at).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mensaje</h4>
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {notif.mensaje}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleLeida}
            className="text-xs font-bold flex-1 sm:flex-initial"
          >
            {notif.leida ? <Mail size={14} className="mr-1.5" /> : <CheckCircle2 size={14} className="mr-1.5 text-emerald-600" />}
            {notif.leida ? 'Marcar no leída' : 'Marcar leída'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-200"
          >
            <Trash2 size={14} className="mr-1.5" /> Eliminar
          </Button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {target?.label && (
            <Button
              variant="primary"
              size="sm"
              onClick={onAction}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
            >
              {target.label} <ArrowRight size={14} className="ml-1.5" />
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            className="text-xs font-bold"
          >
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  </Modal>
  );
};

export default NotificationDetailModal;
