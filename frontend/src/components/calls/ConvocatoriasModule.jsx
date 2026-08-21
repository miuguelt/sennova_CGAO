import React, { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, FileText, CheckCircle, 
  Clock, Plus, Search, Filter, ArrowUpRight,
  MoreVertical, Edit, Trash2, ExternalLink,
  X, Info, Target, AlertCircle, Loader2,
  Layers, Zap, Unlink, User, DollarSign, Send,
  ChevronDown, ChevronUp, Briefcase, Award
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Drawer from '../ui/Drawer';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useAsyncSave } from '../../hooks/useAsyncSave';
import { ConvocatoriasAPI } from '../../api/convocatorias';
import { ProyectosAPI } from '../../api/proyectos';

const ESTADOS = [
  { value: 'abierta', label: 'Abierta', variant: 'success', icon: CheckCircle },
  { value: 'en_evaluacion', label: 'En Evaluación', variant: 'warning', icon: Search },
  { value: 'resultados_publicados', label: 'Resultados', variant: 'indigo', icon: FileText },
  { value: 'cerrada', label: 'Cerrada', variant: 'default', icon: Clock }
];

const LINEAS_CGAO = [
  'Todas las líneas',
  'Agroindustria y Procesamiento Alimentos',
  'Biotecnología y Bioinsumos Agropecuarios',
  'Producción Agrícola Sostenible',
  'Producción Pecuaria y Salud Animal',
  'Software, TICs y Automatización Agropecuaria',
  'Gestión Ambiental y Recurso Hídrico',
  'Servicios Tecnológicos SENNOVA'
];

const EMPTY_FORM = {
  nombre: '',
  año: new Date().getFullYear(),
  numero_oe: '',
  fecha_inicio: '',
  fecha_cierre: '',
  descripcion: '',
  enlace_externo: '',
  fuente: 'SENNOVA',
  estado: 'abierta'
};

const formatCurrency = (val) => {
  if (!val && val !== 0) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
};

const StatusBadge = ({ status }) => {
  const config = ESTADOS.find(e => e.value === status) || ESTADOS[3];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} dot className="text-[10px] font-black uppercase tracking-tighter">
      <Icon size={12} className="mr-1" />
      {config.label}
    </Badge>
  );
};

// ── Tarjeta de Proyecto dentro de Convocatoria ──
const ProyectoVinculadoItem = ({ proyecto, onUnlink, onNavigate, isDraggable = true }) => {
  const handleDragStart = (e) => {
    e.stopPropagation();
    e.dataTransfer.setData('proyectoId', proyecto.id);
    e.dataTransfer.setData('sourceConvocatoriaId', proyecto.convocatoria_id || '');
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div 
      draggable={isDraggable}
      onDragStart={handleDragStart}
      className="p-3 bg-white rounded-xl border border-slate-200 hover:border-emerald-400 shadow-sm hover:shadow-md transition-all group/item relative cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Badge variant="emerald" className="text-[9px] font-black uppercase px-2 py-0.5 shrink-0">
            {proyecto.codigo_sgps || 'SGPS'}
          </Badge>
          <h4 className="text-xs font-bold text-slate-800 truncate group-hover/item:text-emerald-700 transition-colors">
            {proyecto.nombre}
          </h4>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onUnlink(proyecto.id); }}
          title="Desvincular de esta convocatoria"
          className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0"
        >
          <Unlink size={13} />
        </button>
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
        <span className="flex items-center gap-1 truncate max-w-[140px]">
          <User size={11} className="text-slate-400 shrink-0" />
          <span className="truncate">{proyecto.owner?.nombre || proyecto.responsable_nombre || 'Investigador CGAO'}</span>
        </span>
        <span className="font-bold text-slate-700">{formatCurrency(proyecto.presupuesto_total)}</span>
      </div>

      {onNavigate && (
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate(proyecto.id); }}
          className="mt-2 w-full py-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center justify-center gap-1 transition-colors"
        >
          Ver Proyecto <ArrowUpRight size={12} />
        </button>
      )}
    </div>
  );
};

// ── Tarjeta Principal de Convocatoria ──
const ConvocatoriaCard = ({ 
  convocatoria, 
  proyectosVinculados = [], 
  onEdit, 
  onDelete, 
  onDetail, 
  onDropProject,
  onUnlinkProject,
  onOpenPostularModal,
  onNavigateProyecto
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showProjectsList, setShowProjectsList] = useState(true);

  const daysLeft = () => {
    if (!convocatoria.fecha_cierre) return null;
    const diff = new Date(convocatoria.fecha_cierre) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const dl = daysLeft();
  const presupuestoTotalConvocatoria = proyectosVinculados.reduce((sum, p) => sum + (p.presupuesto_total || 0), 0);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('proyectoId') || e.dataTransfer.types.includes('text/plain')) {
      setIsDragOver(true);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const proyectoId = e.dataTransfer.getData('proyectoId');
    const sourceConvocatoriaId = e.dataTransfer.getData('sourceConvocatoriaId');

    if (proyectoId && sourceConvocatoriaId !== String(convocatoria.id)) {
      onDropProject(convocatoria.id, proyectoId);
    }
  };

  return (
    <Card 
      onClick={onDetail}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`group hover:shadow-2xl transition-all duration-300 border-l-4 cursor-pointer relative overflow-hidden flex flex-col justify-between ${
        isDragOver 
          ? 'bg-emerald-50/90 border-emerald-600 ring-4 ring-emerald-500/30 scale-[1.02] shadow-2xl' 
          : 'bg-white border-l-emerald-500'
      }`}
    >
      {isDragOver && (
        <div className="absolute inset-0 bg-emerald-600/15 backdrop-blur-[2px] flex items-center justify-center pointer-events-none z-20">
          <div className="bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl animate-bounce flex items-center gap-3">
            <Zap size={22} />
            <span className="font-black text-sm">Vincular Proyecto a {convocatoria.numero_oe || 'Convocatoria'}</span>
          </div>
        </div>
      )}

      <div className="p-6">
        {/* Top Header & Status */}
        <div className="flex justify-between items-start mb-3">
          <StatusBadge status={convocatoria.estado} />
          <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(convocatoria); }} 
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              title="Editar Convocatoria"
            >
              <Edit size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(convocatoria.id); }} 
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              title="Eliminar Convocatoria"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
          {convocatoria.nombre}
        </h3>
        
        {/* Meta Metadata */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4">
          <div className="flex items-center gap-1">
            <Calendar size={13} className="text-slate-400" />
            <span>{convocatoria.año}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText size={13} className="text-slate-400" />
            <span>OE: {convocatoria.numero_oe || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1">
            <Layers size={13} className="text-slate-400" />
            <span>{convocatoria.fuente || 'SENNOVA'}</span>
          </div>
        </div>

        {/* Closing Progress Bar */}
        <div className="space-y-2 mb-5 bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-500 flex items-center gap-1">
              <Clock size={12} className="text-slate-400" /> Cierre
            </span>
            <span className={dl !== null && dl > 0 && dl <= 15 ? 'text-amber-600 font-black' : 'text-slate-700 font-bold'}>
              {convocatoria.fecha_cierre || 'No definida'}
            </span>
          </div>
          {dl !== null && dl > 0 && (
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${
                  dl <= 5 ? 'bg-rose-500' : dl <= 15 ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, (dl / 45) * 100))}%` }}
              ></div>
            </div>
          )}
          {dl !== null && dl > 0 && (
            <p className="text-[10px] text-right font-bold text-slate-600">
              {dl} días restantes para postular
            </p>
          )}
        </div>

        {/* ── SECCIÓN PROYECTOS POSTULADOS ── */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={(e) => { e.stopPropagation(); setShowProjectsList(!showProjectsList); }}
              className="text-xs font-black text-slate-700 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
            >
              <Target size={14} className="text-emerald-600" />
              <span>Proyectos Postulados ({proyectosVinculados.length})</span>
              {showProjectsList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            
            {convocatoria.estado === 'abierta' && (
              <button
                onClick={(e) => { e.stopPropagation(); onOpenPostularModal(convocatoria); }}
                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-lg flex items-center gap-1 transition-colors"
                title="Postular un proyecto a esta convocatoria"
              >
                <Plus size={12} /> Postular
              </button>
            )}
          </div>

          {showProjectsList && (
            <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {proyectosVinculados.length > 0 ? (
                proyectosVinculados.map(p => (
                  <ProyectoVinculadoItem
                    key={p.id}
                    proyecto={p}
                    onUnlink={onUnlinkProject}
                    onNavigate={onNavigateProyecto}
                  />
                ))
              ) : (
                <div className="py-4 px-3 text-center bg-slate-50/70 border border-dashed border-slate-200 rounded-xl">
                  <p className="text-[11px] text-slate-600 font-bold">Sin proyectos postulados aún.</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">Arrastra un proyecto del pool aquí para postularlo.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
        <div className="text-[11px] text-slate-600">
          <span className="text-slate-700 block text-[9px] uppercase font-bold">Presupuesto Postulado</span>
          <span className="font-black text-slate-900">{formatCurrency(presupuestoTotalConvocatoria)}</span>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDetail}
          className="text-emerald-600 hover:text-emerald-700 p-0 h-auto font-bold group/btn text-xs"
        >
          Detalles <ArrowUpRight size={14} className="ml-1 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
        </Button>
      </div>
    </Card>
  );
};

// ── MÓDULO PRINCIPAL DE CONVOCATORIAS ──
const ConvocatoriasModule = ({ currentUser, onNotify, onModuleAction, onNavigate }) => {
  const [convocatorias, setConvocatorias] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterLinea, setFilterLinea] = useState('Todas las líneas');
  const [isPoolVisible, setIsPoolVisible] = useState(true);
  const [isPoolDragOver, setIsPoolDragOver] = useState(false);
  
  // Modales
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedConvocatoria, setSelectedConvocatoria] = useState(null);

  // Modal Postular Proyecto
  const [postularModalOpen, setPostularModalOpen] = useState(false);
  const [targetConvocatoria, setTargetConvocatoria] = useState(null);
  const [selectedProyectoToLink, setSelectedProyectoToLink] = useState('');

  const loadData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [convData, proyData] = await Promise.all([
        ConvocatoriasAPI.list(),
        ProyectosAPI.list()
      ]);
      const cList = convData || [];
      setConvocatorias(cList);
      setProyectos(proyData || []);
      setSelectedConvocatoria(prev => {
        if (!prev) return null;
        const updated = cList.find(c => c.id === prev.id);
        return updated ? { ...prev, ...updated } : prev;
      });
    } catch (err) {
      onNotify?.('Error al cargar convocatorias y proyectos', 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });

  const handleOpenCreate = () => {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleOpenEdit = (convocatoria) => {
    setFormData({ ...convocatoria });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirm.id) return;
    try {
      await ConvocatoriasAPI.delete(deleteConfirm.id);
      onNotify?.('Convocatoria eliminada correctamente', 'success');
      setDeleteConfirm({ isOpen: false, id: null });
      if (selectedConvocatoria?.id === deleteConfirm.id) setDetailOpen(false);
      loadData();
    } catch (err) {
      onNotify?.('Error al eliminar la convocatoria', 'error');
    }
  };

  const doSubmit = async () => {
    if (formData.fecha_inicio && formData.fecha_cierre && new Date(formData.fecha_cierre) < new Date(formData.fecha_inicio)) {
      throw new Error('La fecha de cierre no puede ser anterior a la de inicio');
    }
    if (formData.enlace_externo && !/^https?:\/\/.+\..+/.test(formData.enlace_externo)) {
      throw new Error('El enlace externo no es una URL válida');
    }
    if (isEditing) {
      await ConvocatoriasAPI.update(formData.id, formData);
      onNotify?.('Convocatoria actualizada con éxito', 'success');
    } else {
      await ConvocatoriasAPI.create(formData);
      onNotify?.('Convocatoria creada exitosamente', 'success');
    }
  };

  const { saving, save: guardarConvocatoria } = useAsyncSave(doSubmit, {
    onSuccess: () => { setShowForm(false); loadData(); }
  });

  // Vincular Proyecto a Convocatoria (Drop or Action)
  const handleDropProject = async (convocatoriaId, proyectoId) => {
    try {
      await ProyectosAPI.update(proyectoId, { convocatoria_id: convocatoriaId });
      onNotify?.('Proyecto vinculado a la convocatoria exitosamente', 'success');
      loadData();
    } catch (err) {
      onNotify?.('Error al vincular proyecto: ' + (err.message || 'No autorizado'), 'error');
    }
  };

  // Desvincular Proyecto (Arrastrar al Pool o darle al botón X)
  const handleUnlinkProject = async (proyectoId) => {
    try {
      await ProyectosAPI.update(proyectoId, { convocatoria_id: null });
      onNotify?.('Proyecto desvinculado de la convocatoria', 'info');
      loadData();
    } catch (err) {
      onNotify?.('Error al desvincular proyecto: ' + (err.message || 'Error'), 'error');
    }
  };

  // Abrir Modal de Postulación Directa
  const handleOpenPostularModal = (convocatoria) => {
    setTargetConvocatoria(convocatoria);
    setSelectedProyectoToLink('');
    setPostularModalOpen(true);
  };

  const handleConfirmPostular = async () => {
    if (!selectedProyectoToLink || !targetConvocatoria) return;
    try {
      await ProyectosAPI.update(selectedProyectoToLink, { convocatoria_id: targetConvocatoria.id });
      onNotify?.(`Proyecto postulado con éxito a '${targetConvocatoria.nombre}'`, 'success');
      setPostularModalOpen(false);
      loadData();
    } catch (err) {
      onNotify?.('Error al postular proyecto: ' + (err.message || 'Error'), 'error');
    }
  };

  // Drop handler para el Pool de Proyectos (Desvincular al soltar en el Pool)
  const handlePoolDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('proyectoId')) {
      setIsPoolDragOver(true);
    }
  };

  const handlePoolDrop = (e) => {
    e.preventDefault();
    setIsPoolDragOver(false);
    const proyectoId = e.dataTransfer.getData('proyectoId');
    if (proyectoId) {
      handleUnlinkProject(proyectoId);
    }
  };

  const navigateToProyecto = (proyectoId) => {
    if (onNavigate) {
      onNavigate('proyectos', { proyectoId });
    } else if (onModuleAction) {
      onModuleAction({ module: 'proyectos', proyectoId });
    }
  };

  // Filtrado de Convocatorias
  const filteredConvocatorias = (convocatorias || []).filter(c => {
    const matchesSearch = (c.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.numero_oe || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filterEstado ? c.estado === filterEstado : true;

    // Filtro por línea si se especifica
    const proyectosDeConv = proyectos.filter(p => String(p.convocatoria_id) === String(c.id));
    const matchesLinea = filterLinea === 'Todas las líneas' || proyectosDeConv.some(p => p.linea_investigacion?.includes(filterLinea));

    return matchesSearch && matchesEstado && matchesLinea;
  });

  // Proyectos sin convocatoria (Pool)
  const proyectosPool = proyectos.filter(p => !p.convocatoria_id);

  // Proyectos propios del usuario para el modal de postulación rápida
  const proyectosMisDisponibles = proyectos.filter(p => !p.convocatoria_id && (currentUser?.rol === 'admin' || String(p.owner_id) === String(currentUser?.id)));

  // Cálculos de Métricas SENNOVA CGAO
  const totalAbiertas = convocatorias.filter(c => c.estado === 'abierta').length;
  const totalProyectosPostulados = proyectos.filter(p => p.convocatoria_id).length;
  const presupuestoTotalAcumulado = proyectos.filter(p => p.convocatoria_id).reduce((sum, p) => sum + (p.presupuesto_total || 0), 0);
  const convocatoriasPorVencer = convocatorias.filter(c => {
    if (!c.fecha_cierre) return false;
    const diff = Math.ceil((new Date(c.fecha_cierre) - new Date()) / (1000 * 60 * 60 * 24));
    return diff > 0 && diff <= 15;
  }).length;

  if (loading && convocatorias.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
          <p className="text-slate-500 font-medium text-sm">Sincronizando Convocatorias y Proyectos SENNOVA CGAO...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ── HEADER Y MÉTRICAS CGAO ── */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                Centro de Gestión Agroempresarial del Oriente
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Convocatorias I+D+i SENNOVA</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Gestiona, postula y realiza seguimiento a los proyectos de investigación del CGAO.
            </p>
          </div>
          
          {currentUser?.rol === 'admin' && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className={`h-10 border-slate-200 ${isPoolVisible ? 'bg-emerald-50 ring-2 ring-emerald-500/50 border-emerald-500' : ''}`}
                onClick={() => setIsPoolVisible(!isPoolVisible)}
              >
                <Layers size={18} className="mr-2" /> Pool Proyectos ({proyectosPool.length})
              </Button>
              <Button onClick={handleOpenCreate} variant="primary" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                <Plus size={18} className="mr-2" /> Nueva Convocatoria
              </Button>
            </div>
          )}
        </div>

        {/* Grid de KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-200">
          {[
            { bg: 'bg-emerald-50/80 border-emerald-200', iconBg: 'bg-emerald-700', Icon: CheckCircle, label: 'Convocatorias Abiertas', value: totalAbiertas },
            { bg: 'bg-indigo-50/80 border-indigo-200', iconBg: 'bg-indigo-700', Icon: Target, label: 'Proyectos Postulados', value: totalProyectosPostulados },
            { bg: 'bg-slate-50 border-slate-200', iconBg: 'bg-slate-800', Icon: DollarSign, label: 'Presupuesto Postulado', value: formatCurrency(presupuestoTotalAcumulado), valueCls: 'text-lg' },
            { bg: 'bg-amber-50/80 border-amber-200', iconBg: 'bg-amber-600', Icon: Clock, label: 'Próximas a Cerrar', value: convocatoriasPorVencer },
          ].map(k => (
            <div key={k.label} className={`p-4 rounded-2xl ${k.bg} flex items-center gap-3`}>
              <div className={`p-3 ${k.iconBg} text-white rounded-xl shadow-md`}>
                <k.Icon size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">{k.label}</p>
                <p className={`text-xl font-black text-slate-900 ${k.valueCls || ''}`}>{k.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros de Búsqueda y Línea CGAO */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar convocatoria por nombre u oferta (OE)..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select 
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-slate-700"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>

          <select 
            className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-slate-700 max-w-[260px]"
            value={filterLinea}
            onChange={(e) => setFilterLinea(e.target.value)}
          >
            {LINEAS_CGAO.map(linea => (
              <option key={linea} value={linea}>{linea}</option>
            ))}
          </select>

          {(searchTerm || filterEstado || filterLinea !== 'Todas las líneas') && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => { setSearchTerm(''); setFilterEstado(''); setFilterLinea('Todas las líneas'); }}
              className="text-xs text-slate-500"
            >
              Limpiar Filtros
            </Button>
          )}
        </div>
      </div>

      {/* ── POOL DE PROYECTOS DISPONIBLES (Zona de Arrastre/Desvinculación) ── */}
      {isPoolVisible && (
        <div 
          onDragOver={handlePoolDragOver}
          onDragLeave={() => setIsPoolDragOver(false)}
          onDrop={handlePoolDrop}
          className={`p-6 rounded-[2rem] transition-all duration-300 relative overflow-hidden group/pool mb-6 border ${
            isPoolDragOver
              ? 'bg-slate-900 ring-4 ring-rose-500/30 border-rose-500 scale-[1.01]'
              : 'bg-slate-900 border-slate-800 shadow-2xl'
          }`}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
          
          {isPoolDragOver && (
            <div className="absolute inset-0 bg-rose-900/30 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-none">
              <div className="bg-rose-600 text-white px-6 py-3 rounded-2xl shadow-2xl animate-bounce flex items-center gap-3">
                <Unlink size={22} />
                <span className="font-black text-sm">Soltar aquí para Desvincular de la Convocatoria</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4 relative z-10">
            <div>
              <h3 className="text-white font-black text-base flex items-center gap-2.5">
                <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                  <Layers size={18} />
                </div>
                Pool de Proyectos Disponibles ({proyectosPool.length})
              </h3>
              <p className="text-slate-400 text-xs mt-1 font-medium">
                Arrastra un proyecto hacia una convocatoria para vincularlo. O arrastra un proyecto de una convocatoria aquí para desvincularlo.
              </p>
            </div>
            <Badge className="bg-white/10 text-white border-white/20 uppercase font-black text-[9px] tracking-widest px-3 py-1">
              Recursos de Investigación CGAO
            </Badge>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-emerald-500/50 scrollbar-track-transparent">
            {proyectosPool.length > 0 ? (
              proyectosPool.map(p => (
                <div 
                  key={p.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('proyectoId', p.id);
                    e.dataTransfer.setData('sourceConvocatoriaId', '');
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="flex-shrink-0 w-64 p-4 bg-white/5 border border-white/10 rounded-2xl cursor-grab active:cursor-grabbing hover:bg-white/10 hover:border-emerald-400 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="indigo" className="text-[8px] font-black uppercase border-0">
                      {p.codigo_sgps || 'SIN CÓDIGO'}
                    </Badge>
                    <Target size={13} className="text-emerald-400" />
                  </div>
                  <p className="text-xs font-black text-white line-clamp-2 leading-snug group-hover:text-emerald-300 transition-colors">
                    {p.nombre}
                  </p>
                  <div className="text-[9px] text-slate-400 mt-2 flex items-center justify-between font-medium">
                    <span className="truncate max-w-[120px]">{p.linea_investigacion || 'Investigación Aplicada'}</span>
                    <span className="text-emerald-400 font-bold">{formatCurrency(p.presupuesto_total)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="w-full py-6 text-center border border-dashed border-white/10 rounded-2xl">
                <p className="text-slate-400 text-xs font-bold">Todos los proyectos están postulados actualmente a convocatorias.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GRID DE CONVOCATORIAS ── */}
      {filteredConvocatorias.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConvocatorias.map((c) => {
            const proyectosDeConvocatoria = proyectos.filter(p => String(p.convocatoria_id) === String(c.id));
            return (
              <ConvocatoriaCard 
                key={c.id} 
                convocatoria={c} 
                proyectosVinculados={proyectosDeConvocatoria}
                onEdit={handleOpenEdit} 
                onDelete={handleDelete}
                onDetail={() => { setSelectedConvocatoria(c); setDetailOpen(true); }}
                onDropProject={handleDropProject}
                onUnlinkProject={handleUnlinkProject}
                onOpenPostularModal={handleOpenPostularModal}
                onNavigateProyecto={navigateToProyecto}
              />
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-4 border border-slate-100">
            <Filter size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No se encontraron convocatorias</h3>
          <p className="text-slate-500 mt-1 max-w-xs mx-auto text-sm">Prueba ajustando los filtros o el término de búsqueda.</p>
          <Button variant="outline" className="mt-6" onClick={() => { setSearchTerm(''); setFilterEstado(''); setFilterLinea('Todas las líneas'); }}>
            Limpiar filtros
          </Button>
        </Card>
      )}

      {/* ── DETALLE SIDE-OVER (Drawer Estandarizado en Pila) ── */}
      <Drawer
        isOpen={detailOpen && !!selectedConvocatoria}
        onClose={() => setDetailOpen(false)}
        size="lg"
        variant="emerald"
        icon={Calendar}
        title={selectedConvocatoria?.nombre}
        badge={
          selectedConvocatoria && (
            <div className="flex flex-wrap gap-2 items-center">
              <StatusBadge status={selectedConvocatoria.estado} />
              <Badge variant="emerald" className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                {selectedConvocatoria.año} {selectedConvocatoria.fuente || 'SENNOVA'}
              </Badge>
              {selectedConvocatoria.numero_oe && (
                <Badge variant="indigo" className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  OE: {selectedConvocatoria.numero_oe}
                </Badge>
              )}
            </div>
          )
        }
        headerActions={
          selectedConvocatoria && currentUser?.rol === 'admin' && (
            <div className="flex gap-2">
              <button 
                onClick={() => handleOpenEdit(selectedConvocatoria)} 
                className="p-2 bg-white text-blue-600 hover:bg-blue-50 rounded-xl shadow-sm border border-blue-100 transition-all"
                title="Editar convocatoria"
              >
                <Edit size={18} />
              </button>
              <button 
                onClick={() => handleDelete(selectedConvocatoria.id)} 
                className="p-2 bg-white text-rose-600 hover:bg-rose-50 rounded-xl shadow-sm border border-rose-100 transition-all"
                title="Eliminar convocatoria"
              >
                <Trash2 size={18} />
              </button>
            </div>
          )
        }
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="secondary" className="flex-1" onClick={() => setDetailOpen(false)}>
              Cerrar
            </Button>
            {selectedConvocatoria?.estado === 'abierta' && (
              <Button 
                variant="primary" 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                onClick={() => handleOpenPostularModal(selectedConvocatoria)}
              >
                <Send size={16} className="mr-2" /> Postular Proyecto
              </Button>
            )}
          </div>
        }
      >
        {selectedConvocatoria && (
          <div className="space-y-8 animate-fadeIn">
            {/* Descripción */}
            <section>
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <Info size={14} className="text-emerald-600" /> Descripción y Términos de Referencia
              </h3>
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed text-sm">
                {selectedConvocatoria.descripcion || 'Sin descripción técnica registrada para esta convocatoria.'}
              </div>
            </section>

            {/* Proyectos Postulados */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Target size={14} className="text-emerald-600" /> Proyectos Postulados / Vinculados
                </h3>
                <Badge variant="emerald" className="font-bold text-[10px]">
                  {proyectos.filter(p => String(p.convocatoria_id) === String(selectedConvocatoria.id)).length} Iniciativas
                </Badge>
              </div>

              <div className="space-y-3">
                {proyectos.filter(p => String(p.convocatoria_id) === String(selectedConvocatoria.id)).length > 0 ? (
                  proyectos.filter(p => String(p.convocatoria_id) === String(selectedConvocatoria.id)).map(p => (
                    <div key={p.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {p.codigo_sgps || 'SIN CÓDIGO SGPS'}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">{p.nombre}</h4>
                        </div>
                        <button
                          onClick={() => handleUnlinkProject(p.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Desvincular proyecto de esta convocatoria"
                        >
                          <Unlink size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-[10px] font-bold text-slate-700 block uppercase">Línea Investigación</span>
                          <span className="font-semibold text-slate-900 truncate block">{p.linea_investigacion || 'Investigación Aplicada'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-700 block uppercase">Presupuesto</span>
                          <span className="font-bold text-emerald-800">{formatCurrency(p.presupuesto_total)}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-slate-700 font-medium flex items-center gap-1">
                          <User size={13} className="text-slate-500" />
                          {p.owner?.nombre || p.responsable_nombre || 'Investigador SENNOVA'}
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => { setDetailOpen(false); navigateToProyecto(p.id); }}
                          className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 font-bold"
                        >
                          Ver Proyecto <ArrowUpRight size={13} className="ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl space-y-2">
                    <p className="text-slate-700 text-xs font-bold">No hay proyectos postulados a esta convocatoria.</p>
                    <p className="text-slate-600 text-xs">Arrastra un proyecto del pool o usa el botón "Postular Proyecto" a continuación.</p>
                  </div>
                )}
              </div>
            </section>

            {/* Cronograma de Cierre */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] flex items-center gap-2">
                <Clock size={14} className="text-amber-600" /> Cronograma de Cierre
              </h3>
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-200">
                <div>
                  <p className="text-[10px] font-bold text-amber-800 uppercase">Fecha Límite de Recepción</p>
                  <p className="font-black text-slate-900">{selectedConvocatoria.fecha_cierre || 'No definida'}</p>
                </div>
                {selectedConvocatoria.fecha_cierre && (
                  <Badge variant="amber" className="font-black">
                    {Math.ceil((new Date(selectedConvocatoria.fecha_cierre) - new Date()) / (1000 * 60 * 60 * 24))} días restantes
                  </Badge>
                )}
              </div>
            </div>

            {selectedConvocatoria.enlace_externo && (
              <Button 
                onClick={() => window.open(selectedConvocatoria.enlace_externo, '_blank')}
                variant="outline" 
                className="w-full py-3.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex items-center justify-center gap-2 text-sm"
              >
                <ExternalLink size={16} /> Ver Términos de Referencia Oficiales
              </Button>
            )}
          </div>
        )}
      </Drawer>

      {/* ── MODAL POSTULAR PROYECTO (Estandarizado en Pila) ── */}
      <Modal
        isOpen={postularModalOpen && !!targetConvocatoria}
        onClose={() => setPostularModalOpen(false)}
        size="md"
        variant="emerald"
        icon={Send}
        title="Postular Proyecto"
        subtitle={targetConvocatoria?.nombre}
        footer={
          <>
            <Button variant="outline" onClick={() => setPostularModalOpen(false)}>Cancelar</Button>
            <Button 
              variant="primary" 
              className="bg-emerald-600 hover:bg-emerald-700" 
              disabled={!selectedProyectoToLink}
              onClick={handleConfirmPostular}
            >
              Confirmar Postulación
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-600 leading-relaxed">
          Selecciona uno de tus proyectos activos sin convocatoria para matricularlo en esta oferta institucional.
        </p>

        {proyectosMisDisponibles.length > 0 ? (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">Proyectos Disponibles:</label>
            <select 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              value={selectedProyectoToLink}
              onChange={(e) => setSelectedProyectoToLink(e.target.value)}
            >
              <option value="">Selecciona un proyecto...</option>
              {proyectosMisDisponibles.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.codigo_sgps || 'SGPS'}] {p.nombre} ({formatCurrency(p.presupuesto_total)})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
            No se encontraron proyectos disponibles para vincular. Puedes crear una nueva propuesta en el módulo de Proyectos.
          </div>
        )}
      </Modal>

      {/* ── MODAL FORMULARIO CREAR / EDITAR CONVOCATORIA (Estandarizado en Pila) ── */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        size="lg"
        variant="emerald"
        icon={Calendar}
        title={isEditing ? 'Actualizar Convocatoria' : 'Nueva Convocatoria'}
        subtitle="Gestión SENNOVA CGAO"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving} className="px-6">Cancelar</Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-11"
              onClick={guardarConvocatoria}
              disabled={!formData.nombre || saving}
            >
              {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              {isEditing ? 'Guardar Cambios' : 'Crear Convocatoria'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Input 
            label="Nombre de la Convocatoria" 
            placeholder="Ej: Convocatoria Nacional de Proyectos I+D+i 2026" 
            value={formData.nombre} 
            onChange={e => setFormData({...formData, nombre: e.target.value})} 
            required 
          />

          <TextArea 
            label="Descripción y Alcance" 
            placeholder="Detalla los objetivos, requisitos y población objetivo..." 
            value={formData.descripcion} 
            onChange={e => setFormData({...formData, descripcion: e.target.value})} 
            rows={4} 
          />
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Fuente / Entidad"
              value={formData.fuente || 'SENNOVA'}
              onChange={(e) => setFormData({...formData, fuente: e.target.value})}
              options={[
                { value: 'SENNOVA', label: 'SENNOVA' },
                { value: 'Minciencias', label: 'Minciencias' },
                { value: 'Capacidad_Instalada', label: 'Capacidad Instalada' },
                { value: 'Otra', label: 'Otra Entidad' }
              ]}
            />

            <Input 
              label="Año" 
              type="number"
              value={formData.año} 
              onChange={e => setFormData({...formData, año: e.target.value})} 
            />

            <Input 
              label="Número OE (Opcional)" 
              value={formData.numero_oe}
              onChange={(e) => setFormData({...formData, numero_oe: e.target.value})}
              placeholder="Ej. OE-2024-001"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Fecha Inicio" 
              type="date"
              value={formData.fecha_inicio} 
              onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} 
            />
            <Input 
              label="Fecha Cierre" 
              type="date"
              value={formData.fecha_cierre} 
              onChange={e => setFormData({...formData, fecha_cierre: e.target.value})} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              label="Estado Actual" 
              value={formData.estado} 
              onChange={e => setFormData({...formData, estado: e.target.value})} 
              options={ESTADOS} 
            />
            <Input 
              label="Enlace a TdR (URL)" 
              placeholder="https://sena.edu.co/convocatoria..." 
              value={formData.enlace_externo} 
              onChange={e => setFormData({...formData, enlace_externo: e.target.value})} 
            />
          </div>
        </div>
      </Modal>

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDeleteAction}
        title="¿Eliminar Convocatoria?"
        description="¿Estás seguro de eliminar esta convocatoria? Esta acción no se puede deshacer y desvinculará sus iniciativas."
        confirmText="Eliminar Convocatoria"
        variant="danger"
      />
    </div>
  );
};

export default ConvocatoriasModule;
