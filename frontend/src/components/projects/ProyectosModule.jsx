import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, FolderOpen, X, Users, Calendar, Trash2,
  DollarSign, ChevronRight, Clock, Send, CheckCircle2, AlertCircle, User, Loader2,
  LayoutGrid, List as ListIcon, MoreVertical, Edit2, Filter, ArrowRight, Award, FileText,
  MapPin, Package, Settings, Zap, Target, Clock3, CheckCircle, ShieldCheck, Check, Trophy,
  Sparkles, GraduationCap, Info, Activity
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip as ReTooltip, 
  ResponsiveContainer, BarChart as ReBarChart, 
  Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { ProyectosAPI } from '../../api/proyectos';
import { UsuariosAPI as UsersAPI } from '../../api/usuarios';
import { SemillerosAPI } from '../../api/semilleros';
import { GruposAPI } from '../../api/grupos';
import { RetosAPI } from '../../api/retos';
import { ConvocatoriasAPI } from '../../api/convocatorias';
import { PlantillasAPI } from '../../api/plantillas';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TextArea from '../ui/TextArea';
import StatusBadge from '../ui/StatusBadge';
import Modal from '../ui/Modal';
import Drawer from '../ui/Drawer';
import ScrollableTabs from '../ui/ScrollableTabs';
import ConfirmDialog from '../ui/ConfirmDialog';
import useClickOutside from '../../hooks/useClickOutside';
import { PDFGenerator } from '../../utils/pdfGenerator';
import ProyectoEquipoTab from './ProyectoEquipoTab';

// ─── Gantt Component ──────────────────────────────────────────────────────────
const ProjectTimeline = ({ entregables = [] }) => {
  const fases = ['Fase I', 'Fase II', 'Fase III', 'Fase Final'];
  
  return (
    <div className="space-y-10 py-6">
      <div className="relative">
        {/* Barra de progreso de fondo con gradiente */}
        <div className="absolute top-0 left-5 bottom-0 w-1 bg-gradient-to-b from-emerald-500/20 via-slate-100 to-slate-100 rounded-full" />
        
        {fases.map((fase, idx) => {
          const itemsDeFase = entregables.filter((_, i) => (i % 4) === idx);
          
          return (
            <div key={fase} className="relative flex items-start gap-6 mb-8 last:mb-0 group">
              {/* Nodo indicador con pulso para fases activas */}
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white border-2 border-emerald-500 shadow-lg shadow-emerald-500/10 flex items-center justify-center text-xs font-black text-emerald-600 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
                  {idx + 1}
                </div>
              </div>

              {/* Contenido de la Fase */}
              <div className="flex-1 pt-1 bg-white/50 backdrop-blur-xs p-4 rounded-2xl border border-slate-100 hover:border-emerald-100 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Hito Metodológico
                    </span>
                    <h5 className="font-extrabold text-slate-800 text-sm mt-0.5">{fase}</h5>
                  </div>
                  <span className="text-[11px] font-black text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded-lg">
                    {itemsDeFase.length} Entregables
                  </span>
                </div>

                {itemsDeFase.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    {itemsDeFase.map(e => (
                      <div 
                        key={e.id} 
                        className="p-3 bg-slate-50/80 rounded-xl border border-slate-100/80 flex flex-col justify-between hover:bg-emerald-50/30 hover:border-emerald-200/60 transition-all"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <CheckCircle2 size={13} className={e.estado === 'aprobado' ? 'text-emerald-500' : 'text-slate-300'} />
                          <span className="text-xs font-bold text-slate-700 truncate">{e.nombre}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span>{e.fecha_limite ? new Date(e.fecha_limite).toLocaleDateString('es-CO') : 'Sin fecha'}</span>
                          <span className={`px-1.5 py-0.5 rounded font-black uppercase text-[8px] ${
                            e.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-700' :
                            e.estado === 'en_revision' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {e.estado}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-1">No hay entregables mapeados para esta fase aún.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};


// ─── Constants ────────────────────────────────────────────────────────────────
const STATES = ['Aprobado', 'En ejecución', 'Finalizado'];

const RUBROS = [
  { id: 'personal', label: 'Talento Humano', icon: Users, color: 'text-emerald-600' },
  { id: 'materiales', label: 'Materiales', icon: Package, color: 'text-blue-600' },
  { id: 'viaticos', label: 'Viáticos', icon: MapPin, color: 'text-amber-600' },
  { id: 'servicios', label: 'Servicios', icon: Settings, color: 'text-indigo-600' },
  { id: 'equipos', label: 'Equipos', icon: Zap, color: 'text-rose-600' },
];

const getRubroValue = (p, rubroId) => {
  if (!p?.presupuesto_detallado) return 0;
  if (typeof p.presupuesto_detallado[rubroId] === 'number') {
    return p.presupuesto_detallado[rubroId];
  }
  if (Array.isArray(p.presupuesto_detallado?.items)) {
    const mapCat = {
      personal: ['talento humano', 'personal', 'investigador', 'honorarios'],
      materiales: ['materiales', 'insumos', 'suministros'],
      viaticos: ['viaticos', 'viajes', 'transporte', 'hospedaje'],
      servicios: ['servicios', 'software', 'licencias'],
      equipos: ['equipos', 'maquinaria', 'hardware']
    };
    const keywords = mapCat[rubroId] || [rubroId];
    return p.presupuesto_detallado.items
      .filter(it => keywords.some(k => (it.categoria || '').toLowerCase().includes(k)))
      .reduce((sum, it) => sum + (Number(it.valor) || 0), 0);
  }
  return 0;
};

const STATE_DOT = {
  'Aprobado':     'bg-blue-500',
  'En ejecución': 'bg-emerald-500',
  'Finalizado':   'bg-slate-500',
};

const normalizeEstado = (estado) => {
  if (!estado) return 'Aprobado';
  if (STATES.includes(estado)) return estado;
  return 'Aprobado';
};

const EMPTY_FORM = {
  nombre: '', nombre_corto: '', codigo_sgps: '', estado: 'Aprobado',
  vigencia: 12, presupuesto_total: 0, tipologia: 'Innovación',
  linea_investigacion: '', red_conocimiento: '', descripcion: '',
  objetivo_general: '',
  linea_programatica: '', reto_origen_id: null,
  convocatoria_id: null,
  año: new Date().getFullYear(),
  año_fin: new Date().getFullYear(),
  continua_siguiente_año: false,
  objetivos_especificos: [],
  presupuesto_detallado: { personal: 0, materiales: 0, viaticos: 0, servicios: 0, equipos: 0 }
};

const TIPOLOGIA_OPTIONS = [
  { value: 'Innovación',     label: 'Innovación' },
  { value: 'Investigación',  label: 'Investigación' },
  { value: 'Modernización',  label: 'Modernización' },
];

const FORMATOS_OFICIALES = [
  { id: 'etapa_productiva', nombre: 'Formato Planeación Etapa Productiva', codigo: 'F-01-SENN' },
  { id: 'seguimiento', nombre: 'Formato de Seguimiento Técnico', codigo: 'F-02-SENN' },
  { id: 'informe_final', nombre: 'Informe Final de Proyecto', codigo: 'F-03-SENN' },
  { id: 'bitacora', nombre: 'Bitácora Técnica Oficial', codigo: 'F-04-SENN' },
];

const controlValue = (eventOrValue) => eventOrValue?.target ? eventOrValue.target.value : eventOrValue;

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const Skeleton = () => (
  <div className="flex gap-6 animate-pulse overflow-hidden">
    {STATES.map(s => (
      <div key={s} className="flex-1 min-w-[300px]">
        <div className="h-6 bg-slate-200 rounded mb-4 w-24" />
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-40 bg-slate-100 rounded-xl" />)}
        </div>
      </div>
    ))}
  </div>
);

// ─── Kanban card ──────────────────────────────────────────────────────────────
const ProjectCard = ({ proyecto: p, isDragging, onDragStart, onDragEnd, onClick, onEdit, onDelete, onLiquidar, onElaboracion, onClickMenu, isMenuOpen, menuRef, canEdit }) => (
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
    <div className="flex items-center justify-between mb-3">
      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md font-mono">
        {p.codigo_sgps || 'S/C'}
      </span>
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
    <h4 className="font-semibold text-slate-900 text-sm leading-snug mb-2 line-clamp-2">
      {p.nombre_corto || p.nombre}
    </h4>
    <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
      {p.descripcion || 'Sin descripción.'}
    </p>

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

// ─── Main module ──────────────────────────────────────────────────────────────
const ProyectosModule = ({ currentUser, onNotify, initialAction, onActionHandled }) => {
  const [proyectos,        setProyectos]        = useState([]);
  const [retosDisponibles, setRetosDisponibles] = useState([]);
  const [convocatorias,    setConvocatorias]    = useState([]);
  const [usuarios,         setUsuarios]         = useState([]);
  const [semilleros,       setSemilleros]       = useState([]);
  const [grupos,           setGrupos]           = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [viewMode,         setViewMode]         = useState('kanban');
  const [showLiquidation,  setShowLiquidation]  = useState(false);
  const [liqChecklist,     setLiqChecklist]     = useState(null);
  const [showElaboracionModal, setShowElaboracionModal] = useState(false);
  const [elaboracionData, setElaboracionData] = useState(null);
  const [showForm,         setShowForm]         = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState(null);
  const [isDetailOpen,     setIsDetailOpen]     = useState(false);
  const [draggingId,       setDraggingId]       = useState(null);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [statusFilter,     setStatusFilter]     = useState('');
  const [selectedYear,     setSelectedYear]     = useState(new Date().getFullYear());
  const [formData,         setFormData]         = useState(EMPTY_FORM);
  const [activeTab,        setActiveTab]        = useState('summary');
  const [menuOpenId,       setMenuOpenId]       = useState(null);
  const [isEditing,        setIsEditing]        = useState(false);
  const [isPoolVisible,    setIsPoolVisible]    = useState(false);
  const [dragOverTeam,     setDragOverTeam]     = useState(false);
  const [talentTab,        setTalentTab]        = useState('investigadores'); // 'investigadores' or 'aprendices'
  const [memberToLink,     setMemberToLink]     = useState(null); // Para el mini-formulario de vinculación
  const [linkingRole,      setLinkingRole]      = useState('Investigador');
  const [linkingHours,     setLinkingHours]     = useState(20);
  const [formTab,           setFormTab]          = useState('basic'); // 'basic', 'tech', 'budget'
  const [dragOverProjectId, setDragOverProjectId] = useState(null);
  const [generatingFormatId, setGeneratingFormatId] = useState(null);
  const menuRef = React.useRef(null);

  const isOwnerOrAdmin = (project) => currentUser?.rol !== 'aprendiz' && (currentUser?.rol === 'admin' || project?.owner_id === currentUser?.id);
  const teamMembers = selectedProyecto?.equipo || [];

  useClickOutside(menuRef, () => setMenuOpenId(null));

  useEffect(() => { loadData(true); }, []);

  // Close menus on click outside
  useEffect(() => {
    const closeMenu = () => setMenuOpenId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  const updateRubro = (id, value) => {
    const val = parseFloat(value) || 0;
    const newDetalle = { ...formData.presupuesto_detallado, [id]: val };
    const newTotal = Object.values(newDetalle).reduce((a, b) => a + b, 0);
    setFormData(prev => ({ 
      ...prev, 
      presupuesto_detallado: newDetalle,
      presupuesto_total: newTotal 
    }));
  };

  // Manejar acción inicial (ej: abrir formulario de creación o ver detalle de un proyecto)
  useEffect(() => {
    if (initialAction?.form === 'create') {
      setFormData({
        ...EMPTY_FORM,
        ...(initialAction.data || {})
      });
      setIsEditing(false);
      setFormTab('basic');
      setShowForm(true);
      onActionHandled?.();
    } else if (initialAction?.form === 'view' && initialAction?.data?.id) {
      const targetId = String(initialAction.data.id);
      const found = proyectos.find(p => String(p.id) === targetId);
      if (found) {
        handleOpenDetail(found);
        onActionHandled?.();
      } else {
        ProyectosAPI.get(targetId).then(p => {
          if (p) {
            handleOpenDetail(p);
            onActionHandled?.();
          }
        }).catch(() => {});
      }
    }
  }, [initialAction, proyectos, onActionHandled]);

  const loadData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [p, u, r, s, c, g] = await Promise.all([
        ProyectosAPI.list(),
        UsersAPI.list(),
        RetosAPI.list(),
        SemillerosAPI.list(),
        ConvocatoriasAPI.list(),
        GruposAPI.list()
      ]);
      const pList = Array.isArray(p) ? p : [];
      setProyectos(pList);
      setUsuarios(Array.isArray(u) ? u : []);
      setRetosDisponibles(Array.isArray(r) ? r : []);
      setSemilleros(Array.isArray(s) ? s : []);
      setConvocatorias(Array.isArray(c) ? c : []);
      setGrupos(Array.isArray(g) ? g : []);

      setSelectedProyecto(prev => {
        if (!prev) return null;
        const updated = pList.find(item => String(item.id) === String(prev.id));
        return updated ? { ...prev, ...updated } : prev;
      });
    } catch (err) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await ProyectosAPI.create(formData);
      setShowForm(false);
      setFormData(EMPTY_FORM);
      loadData();
      onNotify?.('Proyecto creado con éxito.', 'success');
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      const errorMsg = typeof detail === 'object' ? JSON.stringify(detail) : detail;
      onNotify?.('Error al crear proyecto: ' + errorMsg, 'error');
    }
  };

  const handleOpenDetail = (proyecto) => {
    setSelectedProyecto(proyecto);
    setIsDetailOpen(true);
    setActiveTab('summary');
  };

  const handleEdit = (proyecto) => {
    setFormData({
      id: proyecto.id,
      nombre: proyecto.nombre || '',
      nombre_corto: proyecto.nombre_corto || '',
      codigo_sgps: proyecto.codigo_sgps || '',
      estado: proyecto.estado || 'Aprobado',
      vigencia: proyecto.vigencia || 12,
      presupuesto_total: proyecto.presupuesto_total || 0,
      tipologia: proyecto.tipologia || 'Innovación',
      linea_investigacion: proyecto.linea_investigacion || '',
      red_conocimiento: proyecto.red_conocimiento || '',
      descripcion: proyecto.descripcion || '',
      objetivo_general: proyecto.objetivo_general || '',
      objetivos_especificos: proyecto.objetivos_especificos || [],
      linea_programatica: proyecto.linea_programatica || '',
      reto_origen_id: proyecto.reto_origen_id || '',
      semillero_id: proyecto.semillero_id || '',
      grupo_id: proyecto.grupo_id || '',
      convocatoria_id: proyecto.convocatoria_id || '',
      año: proyecto.año || new Date().getFullYear(),
      año_fin: proyecto.año_fin || new Date().getFullYear(),
      continua_siguiente_año: proyecto.continua_siguiente_año || false,
      presupuesto_detallado: proyecto.presupuesto_detallado || { personal: 0, materiales: 0, viaticos: 0, servicios: 0, equipos: 0 }
    });
    setIsEditing(true);
    setShowForm(true);
    setMenuOpenId(null);
  };

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });

  const handleDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id });
    setMenuOpenId(null);
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirm.id) return;
    try {
      await ProyectosAPI.delete(deleteConfirm.id);
      onNotify?.('Proyecto eliminado correctamente', 'success');
      setDeleteConfirm({ isOpen: false, id: null });
      if (selectedProyecto?.id === deleteConfirm.id) setIsDetailOpen(false);
      loadData();
    } catch (err) {
      onNotify?.('Error al eliminar: ' + err.message, 'error');
    }
  };

  const handleSave = async () => {
    try {
      const sanitizedData = {
        ...formData,
        reto_origen_id: (formData.reto_origen_id && formData.reto_origen_id !== '') ? formData.reto_origen_id : null,
        semillero_id: (formData.semillero_id && formData.semillero_id !== '') ? formData.semillero_id : null,
        convocatoria_id: (formData.convocatoria_id && formData.convocatoria_id !== '') ? formData.convocatoria_id : null,
        vigencia: parseInt(formData.vigencia) || 12,
        año: parseInt(formData.año) || new Date().getFullYear(),
        año_fin: parseInt(formData.año_fin) || new Date().getFullYear(),
        continua_siguiente_año: Boolean(formData.continua_siguiente_año),
        presupuesto_total: parseFloat(formData.presupuesto_total) || 0,
        objetivos_especificos: Array.isArray(formData.objetivos_especificos) ? formData.objetivos_especificos : []
      };

      if (isEditing) {
        await ProyectosAPI.update(formData.id, sanitizedData);
        onNotify?.('Proyecto actualizado con éxito.', 'success');
      } else {
        await ProyectosAPI.create(sanitizedData);
        onNotify?.('Proyecto creado con éxito.', 'success');
      }
      setShowForm(false);
      setIsEditing(false);
      setFormData(EMPTY_FORM);
      loadData();
    } catch (err) {
      // fetchAPI lanza un Error con el detalle en el mensaje
      const errorMsg = err.message || 'Error desconocido';
      onNotify?.('Error al guardar: ' + errorMsg, 'error');
      if (errorMsg.includes('cierre técnico') || errorMsg.includes('finalizar el proyecto')) {
        const targetProy = proyectos.find(p => String(p.id) === String(formData.id));
        if (targetProy) {
          handleOpenLiquidation(targetProy);
        }
      }
    }
  };

  const handleAddMember = async (userId, rol = 'Investigador', horas = 20) => {
    if (!userId) return;
    try {
      await ProyectosAPI.addEquipo(selectedProyecto.id, userId, rol, horas);
      onNotify?.('Miembro añadido al equipo', 'success');
      // Actualizar localmente
      const pActualizado = await ProyectosAPI.get(selectedProyecto.id);
      setSelectedProyecto(pActualizado);
      setMemberToLink(null);
      loadData();
    } catch (err) {
      onNotify?.('Error al añadir miembro: ' + err.message, 'error');
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!userId || !selectedProyecto) return;
    try {
      await ProyectosAPI.removeEquipo(selectedProyecto.id, userId);
      onNotify?.('Miembro eliminado del equipo', 'success');
      // Actualizar localmente
      const pActualizado = await ProyectosAPI.get(selectedProyecto.id);
      setSelectedProyecto(pActualizado);
      loadData();
    } catch (err) {
      onNotify?.('Error al eliminar miembro: ' + err.message, 'error');
    }
  };

  const handleDragUserStart = (e, user) => {
    e.dataTransfer.setData('userId', user.id);
    e.dataTransfer.setData('source', 'talent-pool');
  };

  const handleTeamDrop = async (e) => {
    e.preventDefault();
    setDragOverTeam(false);
    const source = e.dataTransfer.getData('source');
    if (source !== 'talent-pool') return;
    
    const userId = e.dataTransfer.getData('userId');
    if (!userId || !selectedProyecto) return;
    
    try {
      await ProyectosAPI.addEquipo(selectedProyecto.id, userId, 'Investigador', 20);
      onNotify?.('Miembro vinculado exitosamente', 'success');
      const pActualizado = await ProyectosAPI.get(selectedProyecto.id);
      setSelectedProyecto(pActualizado);
      loadData();
    } catch (err) {
      onNotify?.('Error al vincular: ' + err.message, 'error');
    }
  };

  const handleGenerateCronograma = async () => {
    if (!selectedProyecto) return;
    try {
      setLoading(true);
      await PlantillasAPI.generarCronograma(selectedProyecto.id);
      onNotify?.('Cronograma SENNOVA generado exitosamente', 'success');
      const pActualizado = await ProyectosAPI.get(selectedProyecto.id);
      setSelectedProyecto(pActualizado);
      loadData();
    } catch (err) {
      onNotify?.('Error al generar cronograma: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };


  const handleGenerateCertificates = async () => {
    if (!selectedProyecto) return;
    try {
      setLoading(true);
      const dataMasiva = await PlantillasAPI.getCertificadosMasivos(selectedProyecto.id);
      
      if (!dataMasiva || dataMasiva.length === 0) {
        onNotify?.('No hay integrantes para certificar', 'warning');
        return;
      }

      onNotify?.(`Iniciando descarga de ${dataMasiva.length} certificados...`, 'info');
      
      // Generar uno por uno (jsPDF gatilla la descarga)
      for (const certData of dataMasiva) {
        PDFGenerator.generateProjectCertificate(certData);
      }

      onNotify?.('Certificados generados exitosamente', 'success');
    } catch (err) {
      onNotify?.('Error al generar certificados: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFormat = async (formatId) => {
    if (!selectedProyecto) return;
    setGeneratingFormatId(formatId);
    try {
      switch (formatId) {
        case 'etapa_productiva':
          PDFGenerator.generateEtapaProductiva(selectedProyecto);
          onNotify?.('Formato Etapa Productiva generado exitosamente', 'success');
          break;
        case 'seguimiento':
          PDFGenerator.generateSeguimiento(selectedProyecto);
          onNotify?.('Formato de Seguimiento generado exitosamente', 'success');
          break;
        case 'informe_final':
          PDFGenerator.generateInformeFinal(selectedProyecto);
          onNotify?.('Informe Final generado exitosamente', 'success');
          break;
        case 'bitacora':
          const bitacoraData = await PlantillasAPI.getBitacoraOficial(selectedProyecto.id);
          PDFGenerator.generateBitacoraReport(bitacoraData);
          onNotify?.('Bitácora Oficial generada exitosamente', 'success');
          break;
        default:
          onNotify?.('Formato no soportado', 'error');
      }
    } catch (err) {
      onNotify?.('Error al generar el formato: ' + err.message, 'error');
    } finally {
      setGeneratingFormatId(null);
    }
  };



  const handleOpenLiquidation = async (proyectoToOpen = null) => {
    const target = proyectoToOpen || selectedProyecto;
    if (!target) return;
    try {
      setLoading(true);
      if (proyectoToOpen) {
        setSelectedProyecto(proyectoToOpen);
      }
      const data = await ProyectosAPI.checkLiquidacion(target.id);
      setLiqChecklist(data);
      setShowLiquidation(true);
      if (data.auto_finalizado) {
        onNotify?.('🎉 ¡Proyecto auto-finalizado por cumplimiento del 100% de requisitos institucionales!', 'success');
        loadData();
      }
    } catch (err) {
      onNotify?.('Error al verificar liquidación: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenElaboracionDiagnostic = async (proyectoToOpen = null) => {
    const target = proyectoToOpen || selectedProyecto;
    if (!target) return;
    try {
      setLoading(true);
      if (proyectoToOpen) {
        setSelectedProyecto(proyectoToOpen);
      }
      const data = await ProyectosAPI.getElaboracionStatus(target.id);
      setElaboracionData(data);
      setShowElaboracionModal(true);
    } catch (err) {
      onNotify?.('Error al obtener diagnóstico de elaboración: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeProject = async () => {
    try {
      setLoading(true);
      await ProyectosAPI.update(selectedProyecto.id, { estado: 'Finalizado' });
      onNotify?.('Proyecto finalizado y liquidado exitosamente', 'success');
      setShowLiquidation(false);
      setSelectedProyecto(null);
      loadData();
    } catch (err) {
      onNotify?.('Error al finalizar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };


  // Drag & drop
  const handleDragStart = (e, id) => {
    setDraggingId(id);
    e.dataTransfer.setData('projectId', String(id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => setDraggingId(null);

  const handleDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };

  const handleDrop = async (e, newState) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('projectId');
    const retoId = e.dataTransfer.getData('retoId');
    
    if (retoId) {
      // Logic for dropping a RETO into a PROJECT
      const targetProjectId = e.currentTarget.dataset.projectid;
      if (targetProjectId) {
        try {
          const proy = proyectos.find(p => String(p.id) === targetProjectId);
          await ProyectosAPI.update(targetProjectId, { ...proy, reto_origen_id: retoId });
          onNotify?.('Reto vinculado al proyecto correctamente', 'success');
          loadData();
        } catch (err) {
          onNotify?.('Error al vincular reto', 'error');
        }
      }
      setDragOverProjectId(null);
      return;
    }

    if (!id) return;

    if (newState === 'Finalizado') {
      const targetProy = proyectos.find(p => String(p.id) === String(id));
      if (targetProy) {
        handleOpenLiquidation(targetProy);
      }
      return;
    }

    // Optimistic update for kanban move
    setProyectos(prev => prev.map(p => String(p.id) === id ? { ...p, estado: newState } : p));
    try {
      await ProyectosAPI.update(id, { estado: newState });
      onNotify?.(`Proyecto movido a "${newState}"`, 'success');
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Error al actualizar el estado';
      onNotify?.(msg, 'error');
      loadData();
    }
  };

  const patch = (field) => (eventOrValue) => setFormData(prev => ({ ...prev, [field]: controlValue(eventOrValue) }));

  const openCreateForm = () => {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setFormTab('basic');
    setShowForm(true);
  };

  const filtered = proyectos.map(p => ({
    ...p,
    estado_normalizado: normalizeEstado(p.estado)
  })).filter(p => {
    const haySearch = !searchTerm || (p.nombre + (p.nombre_corto ?? '') + (p.codigo_sgps ?? ''))
      .toLowerCase().includes(searchTerm.toLowerCase());
    const hayStatus = !statusFilter || p.estado_normalizado === statusFilter || p.estado === statusFilter;
    const projectYear = p.año || (p.created_at ? new Date(p.created_at).getFullYear() : new Date().getFullYear());
    const hayAño = selectedYear === 'todos' || projectYear === selectedYear;
    return haySearch && hayStatus && hayAño;
  });

  const availableYears = [...new Set(proyectos.map(p => p.año || (p.created_at ? new Date(p.created_at).getFullYear() : new Date().getFullYear())).filter(Boolean)), new Date().getFullYear()].sort((a, b) => b - a);
  // Eliminar duplicados si el año actual ya existía
  const uniqueYears = [...new Set(availableYears)];

  const byState = (state) => filtered.filter(p => p.estado_normalizado === state);

  if (loading && proyectos.length === 0) return <Skeleton />;

  return (
    <div className="space-y-4 md:space-y-6 animate-fadeIn pb-20">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">Gestión de Proyectos</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">Transformando ideas en resultados tangibles</p>
        </div>

        {/* View toggle + CTA */}
        <div className="flex items-center justify-between md:justify-end gap-2 bg-white p-1 rounded-xl shadow-sm border border-slate-200">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`text-[10px] font-black uppercase tracking-widest ${isPoolVisible ? 'bg-amber-100 text-amber-700' : 'text-slate-400'}`}
            onClick={() => setIsPoolVisible(!isPoolVisible)}
          >
            <Target size={14} className="mr-1.5" /> Pool de Retos
          </Button>
          <div className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewMode('kanban')}
              aria-label="Vista tablero"
              aria-pressed={viewMode === 'kanban'}
              className={`p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                viewMode === 'kanban' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <LayoutGrid size={17} aria-hidden="true" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              aria-label="Vista lista"
              aria-pressed={viewMode === 'list'}
              className={`p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                viewMode === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <ListIcon size={17} aria-hidden="true" />
            </button>
          </div>
          {currentUser?.rol !== 'aprendiz' && (
            <>
              <div className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true" />
              <Button onClick={openCreateForm} variant="sena" size="sm" className="px-4 py-2">
                <Plus size={16} /> <span className="hidden sm:inline">Nuevo Proyecto</span><span className="sm:hidden">Nuevo</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Retos Pool ── */}
      {isPoolVisible && (
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest flex items-center gap-2">
              <Target size={14} /> Banco de Retos Disponibles
            </p>
            <span className="text-[9px] text-amber-600 font-bold uppercase italic">Arrastra un reto hacia un proyecto para vincularlo</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {retosDisponibles.filter(r => r.estado !== 'resuelto').map(r => (
              <div 
                key={r.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('retoId', r.id)}
                className="flex-shrink-0 px-4 py-3 bg-white border border-amber-200 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all max-w-[200px]"
              >
                <p className="text-xs font-bold text-slate-800 line-clamp-1">{r.titulo}</p>
                <p className="text-[9px] text-slate-400 mt-1">{r.empresa_solicitante || 'Sector Productivo'}</p>
              </div>
            ))}
            {retosDisponibles.length === 0 && (
              <p className="text-xs text-amber-600/60 font-medium italic py-2">No hay retos disponibles en este momento.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Year Folders ── */}
      <div className="bg-white/60 rounded-2xl border border-slate-200/60 p-1 shadow-xs">
        <ScrollableTabs
          tabs={[
            { id: 'todos', label: `Todos (${proyectos.length})`, icon: FolderOpen },
            ...uniqueYears.map(year => ({
              id: String(year),
              label: String(year),
              icon: FolderOpen,
              count: proyectos.filter(p => p.ano_ejecucion === year || p.año === year).length || undefined
            }))
          ]}
          activeTab={String(selectedYear)}
          onTabChange={(tabId) => setSelectedYear(tabId === 'todos' ? 'todos' : Number(tabId) || tabId)}
          variant="emerald"
          size="md"
          className="bg-transparent border-0"
          ariaLabel="Filtrar proyectos por año de ejecución"
        />
      </div>

      {/* ── Filters ── */}
      <Card variant="ghost" className="p-2 md:p-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} aria-hidden="true" />
          <input
            type="search"
            placeholder="Buscar proyectos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Buscar proyectos"
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:border-transparent transition-colors placeholder:text-slate-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filtrar por estado"
            className="flex-1 sm:flex-none px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs md:text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 transition-colors"
          >
            <option value="">Estados</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <Badge variant="default" className="flex-shrink-0 text-[10px] md:text-xs">{filtered.length} total</Badge>
        </div>
      </Card>

      {/* ── Kanban ── */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pb-6 min-h-[60vh]">
          {STATES.map(state => {
            const cards = byState(state);
            const totalBudget = cards.reduce((sum, c) => sum + (Number(c.presupuesto_total) || 0), 0);
            
            const headerThemes = {
              'Aprobado':     { border: 'border-blue-300', bg: 'bg-blue-50', badge: 'bg-blue-100 text-blue-950 font-black border border-blue-200', text: 'text-blue-950 font-black', dot: 'bg-blue-600' },
              'En ejecución': { border: 'border-emerald-300', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-950 font-black border border-emerald-200', text: 'text-emerald-950 font-black', dot: 'bg-emerald-600' },
              'Finalizado':   { border: 'border-slate-300', bg: 'bg-slate-100/80', badge: 'bg-slate-200 text-slate-950 font-black border border-slate-300', text: 'text-slate-950 font-black', dot: 'bg-slate-600' },
            };
            const theme = headerThemes[state] || headerThemes['Aprobado'];

            return (
              <section key={state} className="flex flex-col gap-3">
                {/* Column Header Card */}
                <div className={`p-3.5 rounded-2xl border ${theme.border} ${theme.bg} backdrop-blur-sm shadow-sm flex items-center justify-between`}>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-3 h-3 rounded-full ${theme.dot} shadow-sm`} aria-hidden="true" />
                    <div>
                      <h3 className={`font-black text-xs uppercase tracking-widest ${theme.text}`}>{state}</h3>
                      <p className="text-[10px] font-bold text-slate-700 mt-0.5 tabular-nums">
                        ${totalBudget >= 1e6 ? `${(totalBudget / 1e6).toFixed(1)}M` : totalBudget.toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-black px-2.5 py-1 rounded-xl tabular-nums ${theme.badge}`}>
                    {cards.length} {cards.length === 1 ? 'proyecto' : 'proyectos'}
                  </span>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, state)}
                  className="flex-grow rounded-2xl bg-slate-50/60 p-3 space-y-3 border-2 border-dashed border-slate-200/80 transition-colors min-h-[450px]"
                  aria-label={`Columna ${state}`}
                >
                  {cards.map(p => (
                    <div
                      key={p.id}
                      data-projectid={p.id}
                      onDragOver={(e) => { 
                        if (e.dataTransfer.types.includes('retoId')) {
                          e.preventDefault(); 
                          setDragOverProjectId(p.id); 
                        }
                      }}
                      onDragLeave={() => setDragOverProjectId(null)}
                      className={`transition-all rounded-2xl ${dragOverProjectId === p.id ? 'ring-4 ring-amber-400 bg-amber-50 scale-[1.02] shadow-2xl z-10' : ''}`}
                    >
                      <ProjectCard
                        proyecto={p}
                        isDragging={draggingId === p.id}
                        onDragStart={(e) => handleDragStart(e, p.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleOpenDetail(p)}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onLiquidar={(target) => handleOpenLiquidation(target)}
                        onElaboracion={(target) => handleOpenElaboracionDiagnostic(target)}
                        onClickMenu={(id) => setMenuOpenId(menuOpenId === id ? null : id)}
                        isMenuOpen={menuOpenId === p.id}
                        menuRef={menuRef}
                        canEdit={isOwnerOrAdmin(p)}
                      />
                      {dragOverProjectId === p.id && (
                        <div className="mt-2 px-3 py-1.5 bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest text-center rounded-lg animate-pulse">
                          Soltar para vincular Reto
                        </div>
                      )}
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center justify-center text-slate-400">
                      <FolderOpen size={32} className="mb-2 text-slate-300 stroke-1" />
                      <p className="text-xs font-bold uppercase tracking-wider">Sin proyectos</p>
                      <p className="text-[10px] text-slate-400 mt-1">Arrastra o crea un proyecto en esta etapa</p>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* ── Table view — responsive ── */
        <Card variant="elevated" className="overflow-hidden border-0 shadow-sm ring-1 ring-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" role="table">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th scope="col" className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Proyecto</th>
                  <th scope="col" className="hidden md:table-cell px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Código</th>
                  <th scope="col" className="px-4 md:px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Estado</th>
                  <th scope="col" className="hidden lg:table-cell px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Avance Técnico</th>
                  <th scope="col" className="hidden sm:table-cell px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Presupuesto</th>
                  <th scope="col" className="px-4 py-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => handleOpenDetail(p)}
                    tabIndex={0}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group focus-visible:outline-none focus-visible:bg-emerald-50/50"
                  >
                    <td className="px-4 md:px-6 py-4">
                      <p className="font-bold text-slate-900 text-sm">{p.nombre_corto || p.nombre}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {p.grupo_nombre && (
                          <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {p.grupo_nombre}
                          </span>
                        )}
                        {p.semillero_nombre && (
                          <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                            {p.semillero_nombre}
                          </span>
                        )}
                        <span className="hidden sm:inline text-[10px] text-slate-400 font-medium truncate max-w-[180px]">{p.linea_investigacion}</span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 font-mono text-[10px] text-emerald-700 font-bold">{p.codigo_sgps || 'S/C'}</td>
                    <td className="px-4 md:px-6 py-4"><StatusBadge estado={p.estado} className="text-[10px]" /></td>
                    <td className="hidden lg:table-cell px-6 py-4">
                      <div className="w-36 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-bold">
                          <span className="text-slate-400">{p.entregables_aprobados || 0}/{p.total_entregables || 0} ent.</span>
                          <span className="text-emerald-700 font-black">{p.avance_porcentaje || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              (p.avance_porcentaje || 0) >= 100 ? 'bg-emerald-500' :
                              (p.avance_porcentaje || 0) >= 50 ? 'bg-teal-500' :
                              (p.avance_porcentaje || 0) > 0 ? 'bg-amber-500' : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, p.avance_porcentaje || 0))}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 text-xs font-bold text-slate-700 tabular-nums text-right">
                      ${p.presupuesto_total?.toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-4 relative" ref={menuOpenId === p.id ? menuRef : null}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === p.id ? null : p.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <MoreVertical size={16} />
                      </button>
                      
                      {/* Table Dropdown Menu */}
                      {menuOpenId === p.id && (
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 w-60 bg-white/95 backdrop-blur-md rounded-xl shadow-xl border border-slate-100 z-50 py-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleOpenLiquidation(p); }}
                            className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors"
                          >
                            <ShieldCheck size={14} /> Liquidación Técnica SENNOVA
                          </button>
                          {isOwnerOrAdmin(p) && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEdit(p); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                              >
                                <Edit2 size={14} /> Editar Proyecto
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 size={14} /> Eliminar Proyecto
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      <ChevronRight size={14} className="inline-block ml-2 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <FolderOpen size={40} className="mx-auto text-slate-200 mb-3" />
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-wide">No hay coincidencias</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Detail Drawer (Estandarizado en Pila) ── */}
      <Drawer
        isOpen={isDetailOpen && !!selectedProyecto}
        onClose={() => setIsDetailOpen(false)}
        size="lg"
        variant="emerald"
        title={selectedProyecto?.nombre}
        badge={selectedProyecto && <StatusBadge estado={selectedProyecto.estado} />}
        headerActions={
          selectedProyecto && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenElaboracionDiagnostic(selectedProyecto)}
                className="h-8 px-3 text-[11px] font-black text-slate-700 bg-white hover:bg-slate-50 border-slate-200 shadow-sm flex items-center gap-1.5"
              >
                <Sparkles size={13} className="text-emerald-600" />
                Diagnóstico Elaboración
              </Button>
              <Button
                variant="sena"
                size="sm"
                onClick={() => handleOpenLiquidation(selectedProyecto)}
                className="h-8 px-3 text-[11px] font-black tracking-wide bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white shadow-sm flex items-center gap-1.5"
              >
                <ShieldCheck size={14} />
                Requisitos Liquidación
              </Button>
            </div>
          )
        }
        tabs={[
          { id: 'summary', label: 'Resumen', icon: FileText },
          { id: 'team', label: 'Equipo', icon: Users },
          { id: 'timeline', label: 'Línea de Tiempo', icon: Clock3 },
          { id: 'formats', label: 'Formatos', icon: FileText },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button className="flex-1 justify-center order-2 sm:order-1" variant="secondary" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
            <Button 
              className="flex-1 justify-center order-1 sm:order-2" 
              variant="sena"
              onClick={() => {
                handleEdit(selectedProyecto);
              }}
            >
              <Edit2 size={16} className="mr-1.5" /> Editar Proyecto
            </Button>
          </div>
        }
      >
        {selectedProyecto && (
          <div>
            {activeTab === 'summary' && (
              <div className="space-y-8 animate-fadeIn">
                <section>
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <DollarSign size={12} /> Ejecución por Rubros
                  </h3>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-4">
                      {RUBROS.map(r => {
                        const val = getRubroValue(selectedProyecto, r.id);
                        const pct = selectedProyecto.presupuesto_total > 0 
                          ? (val / selectedProyecto.presupuesto_total) * 100 
                          : 0;
                        return (
                          <div key={r.id} className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-tight">
                              <span className="text-slate-500 flex items-center gap-1.5">
                                <r.icon size={10} className={r.color} /> {r.label}
                              </span>
                              <span className="text-slate-900">${val.toLocaleString('es-CO')} ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${r.color.replace('text', 'bg')} opacity-80`} 
                                style={{ width: `${pct}%` }} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {(() => {
                      const pieData = RUBROS.map(r => ({
                        name: r.label,
                        value: getRubroValue(selectedProyecto, r.id)
                      })).filter(d => d.value > 0);

                      return (
                        <div className="h-[200px] w-full bg-slate-50/50 rounded-3xl border border-slate-100 flex items-center justify-center relative overflow-hidden">
                          {pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={pieData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                                >
                                  {RUBROS.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={
                                      entry.id === 'personal' ? '#10b981' : 
                                      entry.id === 'materiales' ? '#3b82f6' :
                                      entry.id === 'viaticos' ? '#f59e0b' :
                                      entry.id === 'servicios' ? '#6366f1' : '#f43f5e'
                                    } />
                                  ))}
                                </Pie>
                                <ReTooltip 
                                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                  formatter={(value) => `$${value.toLocaleString('es-CO')}`}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="text-center p-4">
                              <DollarSign size={24} className="text-slate-300 mx-auto mb-1" />
                              <p className="text-xs font-bold text-slate-500">Sin rubros clasificados</p>
                              <p className="text-[10px] text-slate-400">Total registrado: ${(selectedProyecto.presupuesto_total || 0).toLocaleString('es-CO')}</p>
                            </div>
                          )}
                          {pieData.length > 0 && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total</p>
                              <p className="text-sm font-black text-slate-900 tabular-nums">
                                ${(selectedProyecto.presupuesto_total || 0).toLocaleString('es-CO')}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 mb-8">
                    <Button variant="outline" size="sm" className="h-8 text-[10px] font-black uppercase tracking-widest" onClick={handleGenerateCronograma}>
                      <Calendar size={12} className="mr-1.5" /> Generar Cronograma
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-[10px] font-black uppercase tracking-widest border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={async () => {
                        try {
                          await PDFGenerator.generateProjectPDF(selectedProyecto, teamMembers);
                          onNotify?.('Ficha técnica exportada correctamente', 'success');
                        } catch (err) {
                          onNotify?.('Error al generar PDF: ' + err.message, 'error');
                        }
                      }}
                    >
                      <FileText size={12} className="mr-1.5" /> Ficha Técnica PDF
                    </Button>
                  </div>
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-700 uppercase mb-1">Línea de Investigación</p>
                    <p className="text-sm font-bold text-slate-900">{selectedProyecto.linea_investigacion || 'No definida'}</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-black text-slate-700 uppercase mb-1">Semillero Asociado</p>
                    <p className="text-sm font-bold text-slate-900">{selectedProyecto.semillero?.nombre || 'Independiente / No asignado'}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-700 uppercase mb-1">Objetivo General</p>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {selectedProyecto.objetivo_general || 'Sin objetivo general registrado para este proyecto.'}
                  </p>
                </div>
                
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="text-[10px] font-black text-slate-700 uppercase mb-1">Descripción / Resumen Ejecutivo</p>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {selectedProyecto.descripcion || 'Sin descripción técnica registrada.'}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'team' && (
              <ProyectoEquipoTab
                proyecto={selectedProyecto}
                teamMembers={teamMembers}
                usuarios={usuarios}
                currentUser={currentUser}
                isOwnerOrAdmin={isOwnerOrAdmin}
                onAddMember={handleAddMember}
                onRemoveMember={handleRemoveMember}
                onNotify={onNotify}
              />
            )}

            {activeTab === 'timeline' && (
              <div className="animate-fadeIn">
                <ProjectTimeline entregables={selectedProyecto.entregables || []} />
              </div>
            )}

            {activeTab === 'formats' && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h3 className="text-xs font-black text-slate-900 mb-1 flex items-center gap-2">
                    <FileText size={16} className="text-emerald-600" />
                    Formatos Oficiales SENNOVA
                  </h3>
                  <p className="text-xs text-slate-500">
                    Descargue las plantillas oficiales pre-diligenciadas con la información institucional del proyecto.
                  </p>
                </div>

                <div className="space-y-3">
                  {FORMATOS_OFICIALES.map(p => (
                    <div key={p.id} className="p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/20 transition-all flex items-center justify-between">
                      <div className="flex items-center gap-3.5">
                        <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl">
                          <FileText size={18} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">{p.nombre}</h4>
                          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-0.5 inline-block">
                            {p.codigo}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateFormat(p.id)}
                        disabled={generatingFormatId === p.id}
                        className="text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      >
                        {generatingFormatId === p.id ? (
                          <><Loader2 size={12} className="animate-spin mr-1" /> Generando</>
                        ) : 'Generar'}
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-4 italic text-center">
                  * Los formatos se autocompletan con la información del proyecto y los investigadores.
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ── Create / Edit Form Modal (Estandarizado en Pila) ── */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setIsEditing(false); setFormData(EMPTY_FORM); }}
        size="2xl"
        variant="emerald"
        icon={isEditing ? Edit2 : Plus}
        title={isEditing ? 'Editar Proyecto' : 'Iniciar Proyecto'}
        subtitle={isEditing ? `Actualizando ${formData.codigo_sgps || 'Proyecto'}` : 'Formulación técnica'}
        tabs={[
          { id: 'basic', label: 'Básicos', icon: FileText },
          { id: 'tech', label: 'Técnicos', icon: Target },
          { id: 'budget', label: 'Finanzas', icon: DollarSign },
        ]}
        activeTab={formTab}
        onTabChange={setFormTab}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowForm(false); setIsEditing(false); setFormData(EMPTY_FORM); }} className="w-full sm:w-auto justify-center">Cancelar</Button>
            <Button variant="sena" onClick={handleSave} disabled={!formData.nombre?.trim()} className="w-full sm:w-auto justify-center shadow-lg shadow-emerald-200">
              {isEditing ? 'Guardar Cambios' : 'Crear Proyecto'}
            </Button>
          </>
        }
      >
        <div className="space-y-6">
          {formTab === 'basic' && (
            <section className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <Input 
                    label="Nombre del Proyecto" 
                    placeholder="Nombre completo del proyecto..." 
                    value={formData.nombre} 
                    onChange={patch('nombre')} 
                    required 
                    className={!formData.nombre && 'border-amber-200'}
                  />
                </div>
                <Input label="Nombre Corto / Acrónimo" value={formData.nombre_corto} onChange={patch('nombre_corto')} placeholder="Ej: SIGPI, PADGEC..." />
                <Input label="Código SGPS" value={formData.codigo_sgps} onChange={patch('codigo_sgps')} placeholder="SGPS-XXXX" />
                <Select label="Tipología" options={TIPOLOGIA_OPTIONS} value={formData.tipologia} onChange={patch('tipologia')} />
                <div>
                  <Select 
                    label="Grupo de Investigación" 
                    value={formData.grupo_id || ''} 
                    onChange={patch('grupo_id')} 
                    options={[
                      { value: '', label: 'Seleccionar Grupo de Investigación...' },
                      ...grupos.map(g => ({ value: g.id, label: g.nombre }))
                    ]}
                    className="bg-emerald-50/30 border-emerald-100"
                  />
                </div>
                <div className="md:col-span-2">
                  <Select 
                    label="Semillero de Investigación Vinculado" 
                    value={formData.semillero_id || ''} 
                    onChange={patch('semillero_id')} 
                    options={[
                      { value: '', label: 'Sin semillero vinculado (Iniciativa Directa de Grupo)' },
                      ...semilleros.map(s => ({ value: s.id, label: `${s.sigla ? s.sigla + ' - ' : ''}${s.nombre}` }))
                    ]}
                    className="bg-emerald-50/30 border-emerald-100"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:col-span-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                      <Calendar size={12} className="text-emerald-500" /> Año Inicio
                    </label>
                    <input
                      type="number"
                      value={formData.año}
                      onChange={patch('año')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                      <Calendar size={12} className="text-slate-500" /> Año Fin
                    </label>
                    <input
                      type="number"
                      value={formData.año_fin}
                      onChange={patch('año_fin')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 ml-1 flex items-center gap-1.5">
                      <Clock size={12} className="text-blue-500" /> Vigencia (Meses)
                    </label>
                    <input
                      type="number"
                      value={formData.vigencia}
                      onChange={patch('vigencia')}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="md:col-span-2 mt-2">
                  <label className="flex items-center gap-3 cursor-pointer p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.continua_siguiente_año}
                      onChange={(e) => patch('continua_siguiente_año')(e.target.checked)}
                      className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-sm font-bold text-slate-800">Continúa el siguiente año</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">El proyecto es multianual y se mantendrá en ejecución durante el próximo período lectivo.</p>
                    </div>
                  </label>
                </div>
                <div className="md:col-span-2">
                  <Select 
                    label="Convocatoria SENNOVA" 
                    value={formData.convocatoria_id} 
                    onChange={patch('convocatoria_id')} 
                    options={[
                      { value: '', label: 'Sin convocatoria vinculada (Uso interno)' },
                      ...convocatorias.map(c => ({ value: c.id, label: `${c.numero_oe || 'OE'} - ${c.nombre} (${c.año})` }))
                    ]}
                    className="bg-blue-50/30 border-blue-100"
                  />
                </div>
              </div>
            </section>
          )}

          {formTab === 'tech' && (
            <section className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <Select 
                    label="Reto de Origen (Opcional)" 
                    value={formData.reto_origen_id} 
                    onChange={patch('reto_origen_id')} 
                    options={[
                      { value: '', label: 'Ningún reto vinculado - Iniciativa propia' },
                      ...retosDisponibles.map(r => ({ value: r.id, label: r.titulo }))
                    ]}
                  />
                </div>
                <Input label="Línea Programática" value={formData.linea_programatica} onChange={patch('linea_programatica')} placeholder="Ej: 65, 82..." />
                <Input label="Línea de Investigación" value={formData.linea_investigacion} onChange={patch('linea_investigacion')} placeholder="Ej: Software, Agro..." />
                <div className="md:col-span-2">
                  <Input label="Red de Conocimiento" value={formData.red_conocimiento} onChange={patch('red_conocimiento')} placeholder="Ej: Red de Informática, Electrónica y Telecomunicaciones..." />
                </div>
                
                <div className="md:col-span-2">
                  <TextArea
                    label="Objetivo General"
                    placeholder="Formular el objetivo general del proyecto..."
                    value={formData.objetivo_general}
                    onChange={patch('objetivo_general')}
                    rows={3}
                    className="rounded-2xl"
                  />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1">Objetivos Específicos (uno por línea)</label>
                  <TextArea
                    placeholder="1. Diseñar la arquitectura del sistema...&#10;2. Implementar módulo de integración...&#10;3. Evaluar resultados con aprendices..."
                    value={Array.isArray(formData.objetivos_especificos) ? formData.objetivos_especificos.join('\n') : (formData.objetivos_especificos || '')}
                    onChange={(e) => {
                      const lines = e.target.value.split('\n').filter(l => l.trim() !== '');
                      setFormData(prev => ({ ...prev, objetivos_especificos: lines }));
                    }}
                    rows={4}
                    className="rounded-2xl font-sans"
                  />
                </div>

                <div className="md:col-span-2">
                  <TextArea
                    label="Resumen Ejecutivo / Descripción"
                    placeholder="Describe el alcance y contexto del proyecto..."
                    value={formData.descripcion}
                    onChange={patch('descripcion')}
                    rows={4}
                    className="rounded-2xl"
                  />
                </div>
              </div>
            </section>
          )}

          {formTab === 'budget' && (
            <section className="space-y-6 animate-fadeIn">
              <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-200 flex items-center justify-between overflow-hidden relative group">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Presupuesto Total Estimado</p>
                  <h4 className="text-3xl font-black tabular-nums tracking-tighter">
                    ${formData.presupuesto_total?.toLocaleString('es-CO')}
                  </h4>
                </div>
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                  <Zap size={24} fill="currentColor" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {RUBROS.map(r => (
                  <div key={r.id} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-emerald-200 transition-all group">
                    <label className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2 group-hover:text-emerald-600 transition-colors">
                      <r.icon size={12} className={r.color} /> {r.label}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold">$</span>
                      <input
                        type="number"
                        value={formData.presupuesto_detallado[r.id]}
                        onChange={(e) => updateRubro(r.id, e.target.value)}
                        className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-black tabular-nums text-slate-700"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                  Asegúrate de que los valores coincidan con los rubros aprobados en el Plan de Adquisiciones institucional.
                </p>
              </div>
            </section>
          )}
        </div>
      </Modal>

      {/* ── Liquidation Checklist Modal (Estandarizado en Pila) ── */}
      <Modal
        isOpen={showLiquidation && !!liqChecklist}
        onClose={() => setShowLiquidation(false)}
        size="lg"
        variant="default"
        icon={ShieldCheck}
        title="Requisitos Institucionales SENNOVA"
        subtitle={`Cierre Técnico & Auto-Finalización (${liqChecklist?.porcentaje_completitud ?? 0}%)`}
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setShowLiquidation(false)}>
              Cerrar
            </Button>
            <Button 
              variant="primary" 
              className="flex-1" 
              disabled={!liqChecklist?.can_liquidate || loading}
              onClick={handleFinalizeProject}
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : 'Finalizar Proyecto'}
            </Button>
          </div>
        }
      >
        {liqChecklist && (
          <div className="space-y-6">
            {liqChecklist.auto_finalizado && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 animate-pulse">
                <Sparkles className="text-emerald-600 shrink-0" size={20} />
                <p className="text-xs font-black text-emerald-800">
                  🎉 ¡PROYECTO AUTO-FINALIZADO! El sistema verificó el 100% de cumplimiento institucionales y movió el proyecto a Finalizado automáticamente.
                </p>
              </div>
            )}

            {/* Progress bar */}
            <div>
              <div className="flex justify-between items-center text-xs font-bold mb-1">
                <span className="text-slate-700">Progreso de Requisitos Institucionales</span>
                <span className="text-emerald-600">{liqChecklist.porcentaje_completitud ?? 0}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500" 
                  style={{ width: `${liqChecklist.porcentaje_completitud ?? 0}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              {liqChecklist.checklist.map((item) => (
                <div 
                  key={item.id} 
                  className={`flex items-start justify-between p-4 rounded-2xl border transition-all ${item.status ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg mt-0.5 ${item.status ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                      {item.status ? <Check size={14} /> : <AlertCircle size={14} />}
                    </div>
                    <div>
                      <span className={`text-xs font-bold block ${item.status ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {item.label}
                      </span>
                      {item.detalles && (
                        <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                          {item.detalles}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.status ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[8px] shrink-0">CUMPLIDO</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 text-[8px] shrink-0">PENDIENTE</Badge>
                  )}
                </div>
              ))}
            </div>

            {!liqChecklist.can_liquidate && (
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                <AlertCircle className="text-amber-500 shrink-0" size={18} />
                <p className="text-[10px] font-bold text-amber-700 leading-normal">
                  IMPORTANTE: Cuando se apruebe el último entregable, se verifique el último producto o se suba el informe final, el sistema moverá automáticamente este proyecto a Finalizado.
                </p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Elaboración & Quality Diagnostic Modal (Estandarizado en Pila) ── */}
      <Modal
        isOpen={showElaboracionModal && !!elaboracionData}
        onClose={() => setShowElaboracionModal(false)}
        size="lg"
        variant="emerald"
        icon={FileText}
        title="Diagnóstico de Elaboración SENNOVA"
        subtitle={`Calidad de Formulación (${elaboracionData?.score_total}/100 pts)`}
        footer={
          <Button variant="outline" onClick={() => setShowElaboracionModal(false)}>
            Cerrar Diagnóstico
          </Button>
        }
      >
        {elaboracionData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-emerald-600 font-black block">Calidad de Formulación</span>
                <span className="text-lg font-black text-emerald-900">{elaboracionData.nivel_calidad}</span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-emerald-600">{elaboracionData.score_total}</span>
                <span className="text-xs text-emerald-500 font-bold">/100 pts</span>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">Evaluación por Criterios</h3>
              <div className="space-y-2.5">
                {elaboracionData.criterios?.map((crit, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${crit.status ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {crit.status ? <Check size={14} /> : <AlertCircle size={14} />}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">{crit.categoria}</span>
                        <span className="text-[10px] text-slate-500 font-medium">{crit.detalle}</span>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-700 shrink-0">{crit.puntos}/{crit.max} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {elaboracionData.recomendaciones && elaboracionData.recomendaciones.length > 0 && (
              <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
                <h4 className="text-xs font-black text-indigo-900 flex items-center gap-2">
                  <Sparkles size={14} className="text-indigo-600" />
                  Recomendaciones de Mejora SENNOVA
                </h4>
                <ul className="space-y-1.5 pl-5 list-disc text-xs text-indigo-800 font-medium">
                  {elaboracionData.recomendaciones.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDeleteAction}
        title="¿Eliminar Proyecto?"
        description="¿Estás seguro de eliminar este proyecto? Esta acción no se puede deshacer y borrará entregables y registros asociados."
        confirmText="Eliminar Proyecto"
        variant="danger"
      />
    </div>
  );
};

export default ProyectosModule;
