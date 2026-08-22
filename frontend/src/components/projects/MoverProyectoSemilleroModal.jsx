import React, { useState, useEffect } from 'react';
import { GraduationCap, Building2, Check, AlertCircle, Loader2, Info } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Badge from '../ui/Badge';
import { ProyectosAPI } from '../../api/proyectos';

const MoverProyectoSemilleroModal = ({
  isOpen,
  onClose,
  proyecto,
  semilleros = [],
  onSuccess,
  onNotify
}) => {
  const [selectedSemilleroId, setSelectedSemilleroId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (proyecto) {
      setSelectedSemilleroId(proyecto.semillero_id || proyecto.semillero?.id || '');
    }
  }, [proyecto]);

  if (!proyecto) return null;

  const currentSemilleroId = proyecto.semillero_id || proyecto.semillero?.id || '';
  const currentSemilleroObj = semilleros.find(s => String(s.id) === String(currentSemilleroId));
  const currentSemilleroName = proyecto.semillero_nombre || proyecto.semillero?.nombre || currentSemilleroObj?.nombre || 'Iniciativa Directa / Sin semillero';

  const targetSemilleroObj = semilleros.find(s => String(s.id) === String(selectedSemilleroId));
  const hasChanged = String(selectedSemilleroId || '') !== String(currentSemilleroId || '');

  const semilleroOptions = [
    { value: '', label: 'Sin semillero vinculado (Iniciativa Directa de Grupo)' },
    ...semilleros.map(s => {
      const grupoText = s.grupo_nombre || s.grupo?.nombre ? ` [${s.grupo_nombre || s.grupo?.nombre}]` : '';
      const siglaText = s.sigla ? `${s.sigla} - ` : '';
      return {
        value: String(s.id),
        label: `${siglaText}${s.nombre}${grupoText}`
      };
    })
  ];

  const handleConfirm = async () => {
    if (!hasChanged) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      const targetId = selectedSemilleroId ? String(selectedSemilleroId) : null;
      const updated = await ProyectosAPI.update(proyecto.id, { semillero_id: targetId });
      
      const targetName = targetSemilleroObj?.nombre || 'Iniciativa Directa';
      onNotify?.(`Proyecto movido a "${targetName}" correctamente`, 'success');
      
      if (onSuccess) {
        onSuccess(updated);
      }
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.detail || err.message || 'Error al mover el proyecto';
      onNotify?.(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      variant="emerald"
      icon={GraduationCap}
      title="Mover Proyecto a Semillero"
      subtitle={proyecto.codigo_sgps ? `${proyecto.codigo_sgps} • ${proyecto.nombre_corto || proyecto.nombre}` : (proyecto.nombre_corto || proyecto.nombre)}
      footer={
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-end">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto justify-center"
          >
            Cancelar
          </Button>
          <Button
            variant="sena"
            onClick={handleConfirm}
            disabled={loading || !hasChanged}
            className="w-full sm:w-auto justify-center shadow-md shadow-emerald-500/20"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Moviendo...
              </>
            ) : (
              <>
                <Check size={16} className="mr-2" />
                Confirmar Traslado
              </>
            )}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Proyecto Info Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
          <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">
            Proyecto Seleccionado
          </p>
          <p className="text-sm font-black text-slate-900 leading-snug">
            {proyecto.nombre}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {proyecto.codigo_sgps && (
              <Badge variant="indigo" className="font-mono text-[10px]">
                {proyecto.codigo_sgps}
              </Badge>
            )}
            <Badge variant="default" className="text-[10px]">
              Estado: {proyecto.estado || 'Aprobado'}
            </Badge>
            {proyecto.grupo_nombre && (
              <span className="text-[11px] text-slate-600 font-bold flex items-center gap-1">
                <Building2 size={12} className="text-slate-400" />
                Grupo: {proyecto.grupo_nombre}
              </span>
            )}
          </div>
        </div>

        {/* Semillero Actual */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl">
          <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1.5">
            Semillero Actual
          </p>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs">
              <GraduationCap size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900">
                {currentSemilleroName}
              </p>
              {currentSemilleroObj?.sigla && (
                <p className="text-[10px] text-slate-500 font-mono">
                  Sigla: {currentSemilleroObj.sigla}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Selector de Semillero Destino */}
        <div className="space-y-2">
          <Select
            label="Semillero de Destino"
            options={semilleroOptions}
            value={selectedSemilleroId}
            onChange={(e) => setSelectedSemilleroId(e.target.value)}
            className="bg-emerald-50/40 border-emerald-200 text-slate-900 font-bold"
          />
          {targetSemilleroObj && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
              <Building2 size={14} className="text-emerald-700 shrink-0" />
              <span>
                El proyecto se asociará al semillero <strong>{targetSemilleroObj.nombre}</strong>
                {targetSemilleroObj.grupo_nombre || targetSemilleroObj.grupo?.nombre ? ` adscrito al grupo ${targetSemilleroObj.grupo_nombre || targetSemilleroObj.grupo?.nombre}` : ''}.
              </span>
            </div>
          )}
          {!selectedSemilleroId && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-700 shrink-0" />
              <span>
                El proyecto quedará como <strong>iniciativa directa de grupo</strong> sin semillero asignado.
              </span>
            </div>
          )}
        </div>

        {/* Nota informativa */}
        <div className="flex gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium">
          <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Al mover este proyecto, sus integrantes, entregables y productos se sincronizarán con el semillero y grupo seleccionados.
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default MoverProyectoSemilleroModal;
