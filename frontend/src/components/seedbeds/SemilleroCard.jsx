import React from 'react';
import { Users, Edit, Trash2, UserPlus } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

const ESTADOS = [
  { value: 'activo', label: 'Activo', variant: 'success' },
  { value: 'inactivo', label: 'Inactivo', variant: 'default' },
  { value: 'en_convocatoria', label: 'En Convocatoria', variant: 'warning' },
];

export { ESTADOS };

const SemilleroCard = ({ semillero, onEdit, onDelete, onDetail, onAddAprendiz, canManage = true }) => (
  <Card
    className="group hover:shadow-xl hover:border-emerald-400 transition-all duration-300 border-l-4 border-l-emerald-500 cursor-pointer bg-white flex flex-col justify-between border-slate-200"
    onClick={() => onDetail(semillero)}
  >
    <div className="p-6">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg uppercase tracking-wider font-mono">
            {semillero.sigla || semillero.nombre?.substring(0, 8)}
          </span>
          <Badge variant={ESTADOS.find(e => e.value === semillero.estado)?.variant || 'default'} className="font-black text-[9px] uppercase">
            {ESTADOS.find(e => e.value === semillero.estado)?.label || semillero.estado}
          </Badge>
        </div>
        {canManage && (
          <div className="flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(semillero); }}
              className="p-1.5 text-slate-500 hover:text-blue-600 rounded-md hover:bg-blue-50"
              title="Editar"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(semillero.id); }}
              className="p-1.5 text-slate-500 hover:text-rose-600 rounded-md hover:bg-rose-50"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mb-1.5 line-clamp-1">
        {semillero.nombre}
      </h3>

      {semillero.descripcion && (
        <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed mb-3 font-medium">
          {semillero.descripcion}
        </p>
      )}

      {semillero.linea_investigacion && (
        <div className="mb-3">
          <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md inline-block max-w-full truncate">
            📍 {semillero.linea_investigacion}
          </span>
        </div>
      )}

      {semillero.lider_nombre && (
        <p className="text-xs text-slate-700 font-medium flex items-center gap-1.5 mb-4">
          <Users size={13} className="text-slate-500" /> Líder: <span className="font-bold text-slate-900">{semillero.lider_nombre}</span>
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[9px] font-black text-slate-700 uppercase tracking-tighter">Aprendices</p>
          <p className="text-base font-black text-slate-900">{semillero.total_aprendices || 0}</p>
        </div>
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-[9px] font-black text-slate-700 uppercase tracking-tighter">Dedicación</p>
          <p className="text-base font-black text-slate-900">{semillero.horas_dedicadas || 0}h</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex -space-x-2">
          {Array(Math.min(3, semillero.total_aprendices || 0)).fill(0).map((_, i) => (
            <div key={i} className="w-7 h-7 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-emerald-700">
              A{i + 1}
            </div>
          ))}
          {semillero.total_aprendices > 3 && (
            <div className="w-7 h-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-slate-500">
              +{semillero.total_aprendices - 3}
            </div>
          )}
        </div>
        {canManage ? (
          <Button
            variant="primary"
            size="sm"
            className="h-8 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700"
            onClick={(e) => { e.stopPropagation(); onAddAprendiz(semillero); }}
          >
            <UserPlus size={13} className="mr-1.5" /> Vincular
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-[10px] font-black uppercase tracking-widest text-emerald-700 border-emerald-200"
            onClick={(e) => { e.stopPropagation(); onDetail(semillero); }}
          >
            Ver Información
          </Button>
        )}
      </div>
    </div>
  </Card>
);

export default SemilleroCard;
