import React, { useState, useMemo } from 'react';
import { Users, UserPlus, Trash2, Clock, Mail, AlertCircle } from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import VincularInvestigadorModal from './VincularInvestigadorModal';

export default function ProyectoEquipoTab({
  proyecto,
  teamMembers = [],
  usuarios = [],
  currentUser,
  isOwnerOrAdmin = true,
  onAddMember,
  onRemoveMember,
  onNotify
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToRemove, setUserToRemove] = useState(null);

  // Determinar permisos de gestión
  const canManage = typeof isOwnerOrAdmin === 'function' 
    ? isOwnerOrAdmin(proyecto) 
    : Boolean(isOwnerOrAdmin);

  // Set de IDs ya vinculados al equipo
  const linkedUserIds = useMemo(() => {
    return new Set(teamMembers.map(m => String(m.id)));
  }, [teamMembers]);

  // Lista de usuarios disponibles para vincular
  const availableUsers = useMemo(() => {
    return usuarios.filter(u => !linkedUserIds.has(String(u.id)));
  }, [usuarios, linkedUserIds]);

  const handleSubmitAdd = async (userId, rolEnProyecto, horas) => {
    try {
      setIsSubmitting(true);
      if (onAddMember) {
        await onAddMember(userId, rolEnProyecto, horas);
      }
      setShowAddModal(false);
    } catch (err) {
      console.error('Error vinculando miembro:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!userToRemove) return;
    try {
      if (onRemoveMember) {
        await onRemoveMember(userToRemove.id);
      }
      setUserToRemove(null);
    } catch (err) {
      console.error('Error desvinculando miembro:', err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── Header de Sección ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <Users size={16} className="text-emerald-600" />
            Investigadores Vinculados
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Equipo de trabajo responsable de las actividades y entregables del proyecto
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge variant="sena" className="font-bold text-[11px] px-2.5 py-1">
            {teamMembers.length} {teamMembers.length === 1 ? 'Miembro' : 'Miembros'}
          </Badge>

          {canManage && (
            <Button
              variant="sena"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold shadow-sm shadow-emerald-500/10 flex items-center gap-1.5"
            >
              <UserPlus size={14} />
              <span>Vincular Investigador</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Lista de Miembros del Equipo ── */}
      <div className="space-y-3">
        {teamMembers.map(member => {
          const initials = (member.nombre || 'U')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(w => w.charAt(0))
            .join('')
            .toUpperCase() || 'U';

          const rolLabel = member.rol_en_proyecto || member.rol || 'Investigador';
          const horas = member.horas_dedicadas || 20;

          return (
            <div 
              key={member.id} 
              className="p-4 bg-white rounded-2xl border border-slate-100 hover:border-emerald-200/80 shadow-sm transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/60 text-emerald-800 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-200/50 shadow-sm">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-slate-900 truncate">{member.nombre}</p>
                    {member.sede && (
                      <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        {member.sede}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="flex items-center gap-1 truncate text-slate-500">
                      <Mail size={12} className="text-slate-400 shrink-0" />
                      {member.email}
                    </span>
                    {member.rol_sennova && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-600 font-medium truncate">{member.rol_sennova}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
                <Badge variant="primary" className="text-[10px] font-bold uppercase tracking-tight px-2.5 py-1">
                  {rolLabel}
                </Badge>
                
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  <Clock size={11} className="text-slate-400" />
                  {horas}h / sem
                </span>

                {canManage && (
                  <button
                    type="button"
                    onClick={() => setUserToRemove(member)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Desvincular del proyecto"
                    aria-label={`Desvincular a ${member.nombre}`}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* ── Estado Vacío ── */}
        {teamMembers.length === 0 && (
          <div className="p-10 text-center bg-slate-50/80 rounded-3xl border-2 border-dashed border-slate-200/80 space-y-3">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
              <Users size={28} />
            </div>
            <div className="max-w-sm mx-auto">
              <p className="text-sm font-bold text-slate-800">No hay investigadores asignados</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Vincula investigadores, instructores o aprendices para conformar el equipo de trabajo de este proyecto.
              </p>
            </div>
            {canManage && (
              <div className="pt-2">
                <Button
                  variant="sena"
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                  className="px-5 py-2 text-xs font-bold shadow-md shadow-emerald-500/10 inline-flex items-center gap-1.5"
                >
                  <UserPlus size={14} />
                  Vincular Primer Investigador
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Modal para Agregar Investigador ── */}
      <VincularInvestigadorModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        proyecto={proyecto}
        availableUsers={availableUsers}
        usuarios={usuarios}
        onSubmit={handleSubmitAdd}
        isSubmitting={isSubmitting}
        onNotify={onNotify}
      />

      {/* ── Modal de Confirmación de Desvinculación ── */}
      {userToRemove && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 space-y-4 text-center"
            role="alertdialog"
            aria-labelledby="confirm-remove-title"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 id="confirm-remove-title" className="text-sm font-black text-slate-900">
                ¿Desvincular Investigador?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                ¿Estás seguro de desvincular a <strong className="text-slate-800">{userToRemove.nombre}</strong> del equipo de este proyecto?
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setUserToRemove(null)}
                className="px-4 text-xs font-bold flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmRemove}
                className="px-4 text-xs font-bold flex-1"
              >
                Desvincular
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
