import React from 'react';
import { MoreVertical, Sparkles, ShieldCheck, GraduationCap, Edit2, Trash2, Award } from 'lucide-react';
import Card from '../ui/Card';
import StatusBadge from '../ui/StatusBadge';
import ProjectDocumentationProgress from './ProjectDocumentationProgress';

// ─── Kanban card ──────────────────────────────────────────────────────────────
const ProjectCard = ({ proyecto: p, isDragging, onDragStart, onDragEnd, onClick, onEdit, onDelete, onLiquidar, onElaboracion, onMoverSemillero, onClickMenu, isMenuOpen, menuRef, canEdit }) => (
  <Card
    draggable={canEdit}
    onDragStart={onDragStart}
    onDragEnd={onDragEnd}
    onClick={onClick}
    tabIndex={0}
    onKeyDown={(e) => e.key === 'Enter' && onClick()}
    className={[
      'p-4 cursor-grab active:cursor-grabbing group transition-shadow',
      'border-0 ring-1 ring-slate-200 hover:ring-emerald-400 hover:shadow-card-md',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
      isDragging ? 'opacity-40' : '',
    ].join(' ')}
  >
    {/* Top row */}
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md font-mono">
          {p.codigo_sgps || 'S/C'}
        </span>
        {p.estado === 'Referencia' && <StatusBadge estado={p.estado} />}
      </div>
      <div className="relative" ref={isMenuOpen ? menuRef : null}>
        <button
          aria-label="Opciones del proyecto"
          onClick={(e) => {
            e.stopPropagation();
            onClickMenu(p.id);
          }}
          className={[
            "p-1.5 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
            isMenuOpen ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
          ].join(" ")}
        >
          <MoreVertical size={16} />
        </button>
        
        {/* Dropdown Menu - Glassmorphism style */}
        {isMenuOpen && (
          <div className="absolute right-0 mt-2 w-60 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-white/20 z-[60] py-2 animate-in fade-in zoom-in slide-in-from-top-2 duration-200 ring-1 ring-slate-900/5">
            <div className="px-3 py-2 mb-1 border-b border-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones del Proyecto</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onElaboracion(p); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all group/item"
            >
              <div className="p-1.5 bg-slate-100 rounded-lg group-hover/item:bg-emerald-100 group-hover/item:text-emerald-700 transition-colors">
                <Sparkles size={14} className="text-emerald-600" />
              </div>
              Diagnóstico Elaboración
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onLiquidar(p); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-all group/item"
            >
              <div className="p-1.5 bg-emerald-100/80 rounded-lg group-hover/item:bg-emerald-200 text-emerald-700 transition-colors">
                <ShieldCheck size={14} />
              </div>
              Requisitos Liquidación
            </button>
            {canEdit && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onMoverSemillero(p); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-all group/item"
                >
                  <div className="p-1.5 bg-indigo-100/80 rounded-lg group-hover/item:bg-indigo-200 text-indigo-700 transition-colors">
                    <GraduationCap size={14} />
                  </div>
                  Mover a Semillero
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(p); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 transition-all group/item"
                >
                  <div className="p-1.5 bg-slate-100 rounded-lg group-hover/item:bg-emerald-100 group-hover/item:text-emerald-600 transition-colors">
                    <Edit2 size={14} />
                  </div>
                  Editar Proyecto
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all group/item"
                >
                  <div className="p-1.5 bg-slate-100 rounded-lg group-hover/item:bg-rose-100 group-hover/item:text-rose-600 transition-colors">
                    <Trash2 size={14} />
                  </div>
                  Eliminar Proyecto
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Title */}
    <h4 title={p.nombre} className="font-semibold text-slate-900 text-sm leading-snug mb-2 break-words">
      {p.nombre_corto || p.nombre}
    </h4>
    <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
      {p.descripcion || 'Sin descripción.'}
    </p>
    <p className="text-[11px] font-semibold text-slate-600 mb-3">
      Investigador responsable: <span className="text-slate-800">{p.owner?.nombre || 'Pendiente de asignación'}</span>
    </p>

    <ProjectDocumentationProgress summary={p.avance_documental} compact />
    {/* Footer */}
    <div className="flex items-center justify-between pt-3 border-t border-slate-50">
      {/* Avatar stack */}
      <div className="flex -space-x-1.5" aria-label={`${p.equipo?.length || 0} miembros`}>
        {p.equipo?.slice(0, 3).map((m, i) => (
          <div
            key={i}
            title={m.nombre}
            className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-600"
          >
            {m.nombre.charAt(0)}
          </div>
        ))}
        {p.equipo?.length > 3 && (
          <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-[10px] font-semibold text-emerald-700">
            +{p.equipo.length - 3}
          </div>
        )}
      </div>

      {/* Products count */}
      <div className="flex items-center gap-1 text-slate-400" aria-label={`${p.total_productos} productos`}>
        <Award size={12} aria-hidden="true" />
        <span className="text-xs font-semibold">{p.total_productos ?? 0}</span>
      </div>
    </div>
  </Card>
);


export default ProjectCard;
