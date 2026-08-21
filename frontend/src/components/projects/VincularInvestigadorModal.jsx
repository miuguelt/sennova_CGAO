import React, { useState, useMemo } from 'react';
import { UserPlus, Search, Briefcase, Clock, Check, X, Loader2 } from 'lucide-react';
import Button from '../ui/Button';

const ROLES_PROYECTO = [
  { value: 'Investigador Principal', label: 'Investigador Principal' },
  { value: 'Coinvestigador', label: 'Coinvestigador' },
  { value: 'Investigador', label: 'Investigador' },
  { value: 'Asesor Temático', label: 'Asesor Temático' },
  { value: 'Líder Técnico', label: 'Líder Técnico' },
  { value: 'Aprendiz Investigador', label: 'Aprendiz Investigador' },
];

export default function VincularInvestigadorModal({
  isOpen,
  onClose,
  proyecto,
  availableUsers = [],
  usuarios = [],
  onSubmit,
  isSubmitting = false,
  onNotify
}) {
  const [selectedUserId, setSelectedUserId] = useState('');
  const [rolEnProyecto, setRolEnProyecto] = useState('Investigador');
  const [horasDedicadas, setHorasDedicadas] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return availableUsers;
    return availableUsers.filter(u => {
      const matchName = u.nombre?.toLowerCase().includes(term);
      const matchEmail = u.email?.toLowerCase().includes(term);
      const matchRol = u.rol_sennova?.toLowerCase().includes(term) || u.rol?.toLowerCase().includes(term);
      return matchName || matchEmail || matchRol;
    });
  }, [availableUsers, searchTerm]);

  const selectedUserObj = useMemo(() => {
    if (!selectedUserId) return null;
    return usuarios.find(u => String(u.id) === String(selectedUserId)) || null;
  }, [usuarios, selectedUserId]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      onNotify?.('Por favor selecciona un investigador para vincular.', 'warning');
      return;
    }
    const hours = parseInt(horasDedicadas, 10);
    if (isNaN(hours) || hours <= 0 || hours > 60) {
      onNotify?.('Por favor ingresa una dedicación horaria válida (1 a 60 horas/semana).', 'warning');
      return;
    }
    onSubmit(selectedUserId, rolEnProyecto, hours);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-add-member-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <UserPlus size={18} className="text-white" />
            </div>
            <div>
              <h4 id="modal-add-member-title" className="text-sm font-black tracking-wide">
                Vincular Investigador
              </h4>
              <p className="text-[11px] text-emerald-100">
                {proyecto?.nombre || 'Proyecto SENNOVA'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Selección de Usuario */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Seleccionar Investigador / Usuario</span>
              <span className="text-[10px] text-slate-400 font-normal">
                {availableUsers.length} disponibles
              </span>
            </label>

            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, correo o rol..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-1.5 space-y-1 bg-slate-50/50">
              {filteredUsers.map(user => {
                const isSelected = String(user.id) === String(selectedUserId);
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(String(user.id))}
                    className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50 border border-emerald-300 shadow-sm'
                        : 'bg-white hover:bg-slate-100/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {user.nombre?.charAt(0) || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-950' : 'text-slate-800'}`}>
                          {user.nombre}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {user.email} {user.rol_sennova ? `• ${user.rol_sennova}` : ''}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check size={12} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}

              {filteredUsers.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 font-medium italic">
                  {searchTerm ? 'No se encontraron usuarios que coincidan.' : 'No hay usuarios disponibles.'}
                </div>
              )}
            </div>
          </div>

          {/* Rol y Horas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Briefcase size={13} className="text-emerald-600" />
                Rol en el Proyecto
              </label>
              <select
                value={rolEnProyecto}
                onChange={(e) => setRolEnProyecto(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
              >
                {ROLES_PROYECTO.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Clock size={13} className="text-emerald-600" />
                Dedicación (Horas/Semana)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={horasDedicadas}
                onChange={(e) => setHorasDedicadas(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                placeholder="20"
                required
              />
            </div>
          </div>

          {/* Preview del Usuario Seleccionado */}
          {selectedUserObj && (
            <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/60 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                {selectedUserObj.nombre?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-emerald-950 truncate">
                  {selectedUserObj.nombre}
                </p>
                <p className="text-[10px] text-emerald-700 font-medium truncate">
                  Se vinculará como <strong className="font-black">{rolEnProyecto}</strong> ({horasDedicadas}h/semana)
                </p>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="sena"
              size="sm"
              disabled={!selectedUserId || isSubmitting}
              className="px-5 text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Vinculando...
                </>
              ) : (
                <>
                  <Check size={14} />
                  Vincular al Proyecto
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
