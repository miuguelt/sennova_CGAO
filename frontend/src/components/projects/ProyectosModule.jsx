import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, FolderOpen, X, Users, Calendar, Trash2,
  DollarSign, ChevronRight, Clock, Send, CheckCircle2, AlertCircle, User, Loader2,
  LayoutGrid, List as ListIcon, MoreVertical, Edit2, Filter, ArrowRight, Award, FileText,
  MapPin, Package, Settings, Zap, Target, Clock3, CheckCircle, ShieldCheck, Check, Trophy
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, Tooltip as ReTooltip, 
  ResponsiveContainer, BarChart as ReBarChart, 
  Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { ProyectosAPI } from '../../api/proyectos';
import { UsersAPI } from '../../api/auth';
import { SemillerosAPI } from '../../api/semilleros';
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
import useClickOutside from '../../hooks/useClickOutside';
import { PDFGenerator } from '../../utils/pdfGenerator';

// ─── Gantt Component ──────────────────────────────────────────────────────────
const ProjectTimeline = ({ entregables = [] }) => {
  const fases = ['Fase I', 'Fase II', 'Fase III', 'Fase Final'];
  
  return (
    <div className="space-y-10 py-6">
      <div className="relative">
        {/* Barra de progreso de fondo con gradiente */}
        <div className="absolute top-0 left-5 bottom-0 w-1 bg-gradient-to-b from-emerald-500/20 via-slate-100 to-slate-100 rounded-full" />
        
        {fases.map((fase, idx) => {
          const items = entregables.filter(e => e.fase === fase);
          return (
            <div key={fase} className="relative pl-14 pb-10 last:pb-0">
              {/* Indicador de Fase Premium */}
              <div className="absolute left-0 w-10 h-10 bg-white border-4 border-slate-50 rounded-2xl flex items-center justify-center z-10 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.3)] ring-1 ring-emerald-500/30">
                <span className="text-xs font-black text-emerald-600 italic">F{idx + 1}</span>
              </div>
              
              <div className="mb-6">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3">
                  {fase}
                  <div className="h-px flex-1 bg-slate-100" />
                  <Badge variant="outline" className="text-[10px] border-slate-200 text-slate-600">{items.length} entregables</Badge>
                </h4>
              </div>

              {/* Grid de Hitos */}
              <div className="grid grid-cols-1 gap-4">
                {items.length === 0 ? (
                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[11px] text-slate-400 font-medium italic">Sin hitos programados para esta etapa.</p>
                  </div>
                ) : (
                  items.map(item => (
                    <div key={item.id} className="flex items-center gap-4 group">
                      <div className="flex-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 transform hover:-translate-y-0.5">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">{item.titulo}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{item.descripcion || 'Sin descripción de actividad'}</p>
                          </div>
                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg tracking-wider ${
                            item.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.estado}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ${item.estado === 'aprobado' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-400'}`} 
                              style={{width: item.estado === 'aprobado' ? '100%' : '15%'}} 
                            />
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Calendar size={10} />
                            <span className="text-[10px] font-bold tabular-nums">
                              {new Date(item.fecha_entrega).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
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
const STATES = ['Formulación', 'Aprobado', 'En ejecución', 'Finalizado'];

const RUBROS = [
  { id: 'personal', label: 'Talento Humano', icon: Users, color: 'text-emerald-600' },
  { id: 'materiales', label: 'Materiales', icon: Package, color: 'text-blue-600' },
  { id: 'viaticos', label: 'Viáticos', icon: MapPin, color: 'text-amber-600' },
  { id: 'servicios', label: 'Servicios', icon: Settings, color: 'text-indigo-600' },
  { id: 'equipos', label: 'Equipos', icon: Zap, color: 'text-rose-600' },
];

const STATE_DOT = {
  'Formulación':  'bg-amber-400',
  'Aprobado':     'bg-blue-400',
  'En ejecución': 'bg-emerald-500',
  'Finalizado':   'bg-slate-400',
};

const EMPTY_FORM = {
  nombre: '', nombre_corto: '', codigo_sgps: '', estado: 'Formulación',
  vigencia: 12, presupuesto_total: 0, tipologia: 'Innovación',
  linea_investigacion: '', descripcion: '',
  linea_programatica: '', reto_origen_id: null,
  convocatoria_id: null,
  objetivos_especificos: [],
  presupuesto_detallado: { personal: 0, materiales: 0, viaticos: 0, servicios: 0, equipos: 0 }
};

const TIPOLOGIA_OPTIONS = [
  { value: 'Innovación',     label: 'Innovación' },
  { value: 'Investigación',  label: 'Investigación' },
  { value: 'Modernización',  label: 'Modernización' },
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
const ProjectCard = ({ proyecto: p, isDragging, onDragStart, onDragEnd, onClick, onEdit, onDelete, onClickMenu, isMenuOpen, menuRef }) => (
  <Card
    draggable
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
          <div className="absolute right-0 mt-2 w-52 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-white/20 z-[60] py-2 animate-in fade-in zoom-in slide-in-from-top-2 duration-200 ring-1 ring-slate-900/5">
            <div className="px-3 py-2 mb-1 border-b border-slate-50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acciones</p>
            </div>
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
  const [loading,          setLoading]          = useState(true);
  const [viewMode,         setViewMode]         = useState('kanban');
  const [showLiquidation,  setShowLiquidation]  = useState(false);
  const [liqChecklist,     setLiqChecklist]     = useState(null);
  const [showForm,         setShowForm]         = useState(false);
  const [selectedProyecto, setSelectedProyecto] = useState(null);
  const [isDetailOpen,     setIsDetailOpen]     = useState(false);
  const [draggingId,       setDraggingId]       = useState(null);
  const [searchTerm,       setSearchTerm]       = useState('');
  const [statusFilter,     setStatusFilter]     = useState('');
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
  const menuRef = React.useRef(null);

  useClickOutside(menuRef, () => setMenuOpenId(null));

  useEffect(() => { loadData(); }, []);

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

  // Manejar acción inicial (ej: abrir formulario de creación)
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
    }
  }, [initialAction, onActionHandled]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, u, r, s, c] = await Promise.all([
        ProyectosAPI.list(),
        UsersAPI.list(),
        RetosAPI.list(),
        SemillerosAPI.list(),
        ConvocatoriasAPI.list()
      ]);
      setProyectos(Array.isArray(p) ? p : []);
      setUsuarios(Array.isArray(u) ? u : []);
      setRetosDisponibles(Array.isArray(r) ? r : []);
      setSemilleros(Array.isArray(s) ? s : []);
      setConvocatorias(Array.isArray(c) ? c : []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
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
      estado: proyecto.estado || 'Formulación',
      vigencia: proyecto.vigencia || 12,
      presupuesto_total: proyecto.presupuesto_total || 0,
      tipologia: proyecto.tipologia || 'Innovación',
      linea_investigacion: proyecto.linea_investigacion || '',
      descripcion: proyecto.descripcion || '',
      linea_programatica: proyecto.linea_programatica || '',
      reto_origen_id: proyecto.reto_origen_id || '',
      semillero_id: proyecto.semillero_id || '',
      convocatoria_id: proyecto.convocatoria_id || '',
      presupuesto_detallado: proyecto.presupuesto_detallado || { personal: 0, materiales: 0, viaticos: 0, servicios: 0, equipos: 0 }
    });
    setIsEditing(true);
    setShowForm(true);
    setMenuOpenId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este proyecto? Esta acción no se puede deshacer.')) return;
    try {
      await ProyectosAPI.delete(id);
      onNotify?.('Proyecto eliminado correctamente', 'success');
      loadData();
      setMenuOpenId(null);
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
    if (!window.confirm('¿Eliminar este miembro del equipo?')) return;
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


  const handleOpenLiquidation = async () => {
    if (!selectedProyecto) return;
    try {
      setLoading(true);
      const data = await ProyectosAPI.checkLiquidacion(selectedProyecto.id);
      setLiqChecklist(data);
      setShowLiquidation(true);
    } catch (err) {
      onNotify?.('Error al verificar liquidación: ' + err.message, 'error');
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

    // Optimistic update for kanban move
    setProyectos(prev => prev.map(p => String(p.id) === id ? { ...p, estado: newState } : p));
    try {
      await ProyectosAPI.update(id, { estado: newState });
      onNotify?.(`Proyecto movido a "${newState}"`, 'success');
    } catch {
      onNotify?.('Error al actualizar el estado', 'error');
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

  const filtered = proyectos.filter(p => {
    const haySearch = !searchTerm || (p.nombre + (p.nombre_corto ?? '') + (p.codigo_sgps ?? ''))
      .toLowerCase().includes(searchTerm.toLowerCase());
    const hayStatus = !statusFilter || p.estado === statusFilter;
    return haySearch && hayStatus;
  });

  const byState = (state) => filtered.filter(p => p.estado === state);

  if (loading) return <Skeleton />;

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
              className={`p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                viewMode === 'kanban' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              aria-label="Vista lista"
              aria-pressed={viewMode === 'table'}
              className={`p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                viewMode === 'table' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              <ListIcon size={18} />
            </button>
          </div>
          <div className="w-px h-5 bg-slate-200 mx-1" aria-hidden="true" />
          <Button onClick={openCreateForm} variant="sena" size="sm" className="px-4 py-2">
            <Plus size={16} /> <span className="hidden sm:inline">Nuevo Proyecto</span><span className="sm:hidden">Nuevo</span>
          </Button>
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
        <div className="flex gap-4 md:gap-5 overflow-x-auto pb-6 -mx-4 px-4 sm:mx-0 sm:px-0 min-h-[60vh] snap-x scroll-pl-4 scrollbar-hide md:scrollbar-thin">
          {STATES.map(state => {
            const cards = byState(state);
            return (
              <section key={state} className="flex-1 min-w-[280px] max-w-[320px] md:max-w-[380px] flex flex-col gap-3 snap-start">
                {/* Column header */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${STATE_DOT[state] ?? 'bg-slate-400'} shadow-sm`} aria-hidden="true" />
                    <h3 className="font-bold text-slate-700 text-[10px] md:text-xs uppercase tracking-widest">{state}</h3>
                  </div>
                  <span className="text-[10px] font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full tabular-nums">
                    {cards.length}
                  </span>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, state)}
                  className="flex-grow rounded-2xl bg-slate-100/50 p-2.5 space-y-3 border-2 border-transparent transition-colors min-h-[400px]"
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
                        onClickMenu={(id) => setMenuOpenId(menuOpenId === id ? null : id)}
                        isMenuOpen={menuOpenId === p.id}
                        menuRef={menuRef}
                      />
                      {dragOverProjectId === p.id && (
                        <div className="mt-2 px-3 py-1.5 bg-amber-600 text-white text-[9px] font-black uppercase tracking-widest text-center rounded-lg animate-pulse">
                          Soltar para vincular Reto
                        </div>
                      )}
                    </div>
                  ))}
                  {cards.length === 0 && (
                    <div className="py-16 text-center text-xs text-slate-500 font-medium italic">
                      Sin proyectos
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
                      <p className="hidden sm:block text-[10px] text-slate-500 font-medium mt-0.5 line-clamp-1">{p.linea_investigacion}</p>
                    </td>
                    <td className="hidden md:table-cell px-6 py-4 font-mono text-[10px] text-emerald-700 font-bold">{p.codigo_sgps}</td>
                    <td className="px-4 md:px-6 py-4"><StatusBadge estado={p.estado} className="text-[10px]" /></td>
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
                        <div className="absolute right-10 top-1/2 -translate-y-1/2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
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

      {/* ── Detail slide-over — Mobile optimized ── */}
      {isDetailOpen && selectedProyecto && (
        <div className="fixed inset-0 z-[100] overflow-hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={() => setIsDetailOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex max-w-full">
            <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col animate-slideInRight">
              {/* Header */}
              <div className="px-5 md:px-6 py-5 border-b border-slate-100 bg-slate-50/80 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <StatusBadge estado={selectedProyecto.estado} />
                  <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                    <X size={20} className="text-slate-500" />
                  </button>
                </div>
                <h2 className="text-lg md:text-xl font-bold text-slate-900 leading-tight">
                  {selectedProyecto.nombre}
                </h2>
                
                {/* Tabs Navigation */}
                <div className="flex border-b border-slate-100 mt-2">
                  {[
                    { id: 'summary', label: 'Resumen', icon: FileText },
                    { id: 'team',    label: 'Equipo',  icon: Users },
                    { id: 'timeline', label: 'Línea de Tiempo', icon: Clock3 },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all border-b-2 ${
                        activeTab === tab.id
                          ? 'border-emerald-500 text-emerald-600 bg-emerald-50/50'
                          : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <tab.icon size={14} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 md:px-6 py-6 scrollbar-thin bg-white">
                
                {activeTab === 'summary' && (
                  <div className="space-y-8 animate-fadeIn">
                    {/* Financial Summary with Charts */}
                    <section>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <DollarSign size={12} /> Ejecución por Rubros
                      </h3>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* CSS-based simple bars for quick view */}
                        <div className="space-y-4">
                          {RUBROS.map(r => {
                            const val = selectedProyecto.presupuesto_detallado?.[r.id] || 0;
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

                        {/* Recharts Pie Visualization */}
                        <div className="h-[200px] w-full bg-slate-50/50 rounded-3xl border border-slate-100 flex items-center justify-center relative overflow-hidden">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={RUBROS.map(r => ({
                                  name: r.label,
                                  value: selectedProyecto.presupuesto_detallado?.[r.id] || 0
                                })).filter(d => d.value > 0)}
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
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total</p>
                            <p className="text-sm font-black text-slate-900 tabular-nums">
                              ${(selectedProyecto.presupuesto_total || 0).toLocaleString('es-CO')}
                            </p>
                          </div>
                        </div>
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
                              setLoading(true);
                              const data = await PlantillasAPI.getReportePresupuesto(selectedProyecto.id);
                              PDFGenerator.generateBudgetReport(data);
                              onNotify?.('Reporte financiero generado con éxito', 'success');
                            } catch (err) {
                              onNotify?.('Error al generar reporte: ' + err.message, 'error');
                            } finally {
                              setLoading(false);
                            }
                          }}
                        >
                          {loading ? <Loader2 className="animate-spin mr-1.5" size={12} /> : <DollarSign size={12} className="mr-1.5" />} 
                          Exportar Presupuesto
                        </Button>
                      </div>
                    </section>

                    {/* Description */}
                    <section>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <FileText size={12} /> Descripción del Proyecto
                      </h3>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 leading-relaxed shadow-sm">
                        <p className="text-sm text-slate-700">
                          {selectedProyecto.descripcion || 'Sin descripción detallada.'}
                        </p>
                      </div>
                    </section>
                  </div>
                )}

                {activeTab === 'team' && (
                  <section className="animate-fadeIn space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Users size={12} /> Equipo de Investigación
                      </h3>
                      <Button 
                        variant={isPoolVisible ? 'secondary' : 'outline'} 
                        size="sm" 
                        className="h-8 text-[10px] font-black uppercase tracking-widest"
                        onClick={() => setIsPoolVisible(!isPoolVisible)}
                      >
                        {isPoolVisible ? 'Cerrar Directorio' : 'Vincular Talento'}
                      </Button>
                    </div>

                    <div className="relative">
                      {/* Talent Pool Sidebar 2.0 */}
                      {isPoolVisible && (
                        <div className="absolute left-0 top-0 bottom-0 w-full sm:w-72 bg-white border-r border-slate-100 z-50 shadow-2xl flex flex-col animate-slideInLeft rounded-r-3xl overflow-hidden ring-1 ring-slate-200">
                          <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Zap size={14} className="text-emerald-400" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Talento CGAO</span>
                            </div>
                            <button onClick={() => setIsPoolVisible(false)} className="p-1 hover:bg-white/10 rounded-lg"><X size={14} /></button>
                          </div>
                          
                          {/* Sidebar Tabs */}
                          <div className="flex bg-slate-50 p-1 border-b border-slate-100">
                            <button 
                              onClick={() => setTalentTab('investigadores')}
                              className={`flex-1 py-2 text-[9px] font-black uppercase tracking-tighter rounded-lg transition-all ${talentTab === 'investigadores' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                            >
                              Investigadores
                            </button>
                            <button 
                              onClick={() => setTalentTab('aprendices')}
                              className={`flex-1 py-2 text-[9px] font-black uppercase tracking-tighter rounded-lg transition-all ${talentTab === 'aprendices' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                            >
                              Aprendices
                            </button>
                          </div>

                          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
                            {usuarios
                              .filter(u => !selectedProyecto.equipo?.some(m => m.id === u.id))
                              .filter(u => talentTab === 'aprendices' ? (u.ficha || u.programa_formacion) : (!u.ficha && !u.programa_formacion))
                              .map(u => (
                              <div 
                                key={u.id}
                                draggable
                                onDragStart={(e) => handleDragUserStart(e, u)}
                                onClick={() => {
                                  setMemberToLink(u);
                                  setLinkingRole(talentTab === 'aprendices' ? 'Aprendiz' : 'Investigador');
                                }}
                                className="group p-3 bg-white border border-slate-100 rounded-2xl cursor-grab active:cursor-grabbing hover:border-emerald-400 hover:shadow-md transition-all flex items-center justify-between gap-3"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${talentTab === 'aprendices' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                    {u.nombre.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[11px] font-black text-slate-700 truncate">{u.nombre}</p>
                                    <p className="text-[9px] text-slate-400 font-bold truncate opacity-0 group-hover:opacity-100 transition-opacity">Click para vincular</p>
                                  </div>
                                </div>
                                <Plus size={14} className="text-slate-300 group-hover:text-emerald-500" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Role/Hours Prompt Overlay */}
                      {memberToLink && (
                        <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-fadeIn text-center">
                          <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
                            <Users size={32} />
                          </div>
                          <h4 className="text-sm font-black text-slate-900 mb-1">Vincular a {memberToLink.nombre}</h4>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Configuración de Rol</p>
                          
                          <div className="w-full max-w-xs space-y-4">
                            <div className="space-y-1.5 text-left">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rol en el Proyecto</label>
                              <select 
                                value={linkingRole}
                                onChange={(e) => setLinkingRole(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                              >
                                <option value="Investigador Principal">Investigador Principal</option>
                                <option value="Coinvestigador">Coinvestigador</option>
                                <option value="Investigador">Investigador</option>
                                <option value="Aprendiz">Aprendiz</option>
                                <option value="Asesor">Asesor</option>
                                <option value="Experto Técnico">Experto Técnico</option>
                              </select>
                            </div>

                            <div className="space-y-1.5 text-left">
                              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Horas Semanales</label>
                              <input 
                                type="number"
                                value={linkingHours}
                                onChange={(e) => setLinkingHours(parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
                              />
                            </div>

                            <div className="flex gap-3 pt-4">
                              <Button variant="secondary" className="flex-1" onClick={() => setMemberToLink(null)}>Cancelar</Button>
                              <Button variant="sena" className="flex-1" onClick={() => handleAddMember(memberToLink.id, linkingRole, linkingHours)}>Vincular</Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Project Team List */}
                      <div 
                        className={`grid grid-cols-1 gap-4 p-6 rounded-[2.5rem] border-2 border-dashed transition-all min-h-[300px] ${dragOverTeam ? 'border-emerald-500 bg-emerald-50 scale-[1.01]' : 'border-slate-100'}`}
                        onDragOver={(e) => { e.preventDefault(); setDragOverTeam(true); }}
                        onDragLeave={() => setDragOverTeam(false)}
                        onDrop={async (e) => {
                          e.preventDefault();
                          setDragOverTeam(false);
                          const userId = e.dataTransfer.getData('userId');
                          const user = usuarios.find(u => u.id === userId);
                          if (user) {
                            setMemberToLink(user);
                            setLinkingRole(user.ficha ? 'Aprendiz' : 'Investigador');
                          }
                        }}
                      >
                        {(selectedProyecto.equipo || []).length === 0 && !memberToLink && (
                          <div className="flex flex-col items-center justify-center py-10 opacity-40">
                            <Users size={48} className="text-slate-300 mb-4" />
                            <p className="text-xs text-slate-400 font-black uppercase tracking-widest">Sin miembros vinculados</p>
                            <p className="text-[10px] text-slate-400 mt-1 italic">Arrastra talentos aquí para comenzar</p>
                          </div>
                        )}
                        
                        {selectedProyecto.equipo?.map(m => (
                          <div key={m.id} className="group flex items-center justify-between p-4 bg-white rounded-3xl border border-slate-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg ${m.rol_en_proyecto === 'Aprendiz' ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-500/20' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20'}`}>
                                  {m.nombre.charAt(0)}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-50">
                                  <ShieldCheck size={12} className="text-emerald-500" />
                                </div>
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-black text-slate-800 truncate">{m.nombre}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className={`text-[9px] border-slate-100 uppercase font-black tracking-tighter ${m.rol_en_proyecto === 'Aprendiz' ? 'text-indigo-600 bg-indigo-50/50' : 'text-emerald-600 bg-emerald-50/50'}`}>
                                    {m.rol_en_proyecto || 'Investigador'}
                                  </Badge>
                                  <span className="text-[9px] font-black text-slate-400 flex items-center gap-1 uppercase">
                                    <Clock size={10} /> {m.horas_dedicadas || 20}H/Sem
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRemoveMember(m.id)}
                              className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                              title="Remover del equipo"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Certificates Section (Strategic Addition) */}
                    <Card className="p-6 border-0 bg-slate-50 border-slate-100 rounded-[2.5rem] space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 text-amber-600 rounded-xl">
                          <Trophy size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reconocimiento</p>
                          <h4 className="text-xs font-black text-slate-900">Certificación de Participación</h4>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                        Genera certificados automáticos para los integrantes del equipo que hayan cumplido con sus entregables.
                      </p>
                      <Button 
                        variant="sena" 
                        size="sm" 
                        className="w-full h-10 text-[10px] font-black uppercase tracking-widest mt-2"
                        onClick={handleOpenLiquidation}
                        disabled={selectedProyecto.estado === 'Finalizado'}
                      >
                        {selectedProyecto.estado === 'Finalizado' ? 'Proyecto Liquidado' : 'Liquidar Proyecto'}
                      </Button>
                    </Card>

                    {/* Summary Tab Content */}

                    {/* Quick Search Directory */}
                    <div className="p-6 bg-slate-900 rounded-[2rem] space-y-4 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                      <div className="flex items-center justify-between relative z-10">
                        <label className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] block">Directorio Global CGAO</label>
                        <Search size={14} className="text-emerald-500" />
                      </div>
                      <div className="relative z-10">
                        <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                        <select 
                          className="w-full pl-10 pr-4 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-xs font-bold text-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer shadow-inner"
                          onChange={(e) => {
                            const u = usuarios.find(usr => usr.id === e.target.value);
                            if (u) {
                              setMemberToLink(u);
                              setLinkingRole(u.ficha ? 'Aprendiz' : 'Investigador');
                            }
                            e.target.value = ""; 
                          }}
                          value=""
                        >
                          <option value="">Seleccionar investigador o aprendiz...</option>
                          {usuarios.filter(u => !selectedProyecto.equipo?.some(m => m.id === u.id)).map(u => (
                            <option key={u.id} value={u.id}>{u.nombre} {u.ficha ? `(Ficha: ${u.ficha})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[9px] text-slate-500 font-medium italic px-1 relative z-10">
                        * Los aprendices vinculados deben pertenecer a semilleros activos para certificación automática.
                      </p>
                    </div>
                  </section>
                )}

                {activeTab === 'timeline' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex flex-col sm:flex-row justify-between items-center bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 gap-4">
                      <div>
                        <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-1">Automatización</p>
                        <p className="text-xs text-slate-600 font-medium">¿Sin actividades? Genera el cronograma estándar SENNOVA.</p>
                      </div>
                      <Button variant="sena" size="sm" onClick={handleGenerateCronograma} disabled={loading} className="w-full sm:w-auto shadow-lg shadow-emerald-200">
                        <Zap size={14} className="mr-2" /> Generar Plan
                      </Button>
                    </div>
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Clock3 size={12} /> Progreso de Hitos SENNOVA
                    </h3>
                    <ProjectTimeline entregables={selectedProyecto.entregables || []} />
                  </div>
                )}
              </div>

              <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row gap-3">
                <Button className="flex-1 justify-center order-2 sm:order-1" variant="secondary" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
                <Button 
                  className="flex-1 justify-center order-1 sm:order-2" 
                  variant="sena"
                  onClick={() => {
                    setIsDetailOpen(false);
                    handleEdit(selectedProyecto);
                  }}
                >
                  <Edit2 size={16} /> Editar Proyecto
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create form — Mobile optimized ── */}
      {showForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center sm:p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-fadeIn" onClick={() => setShowForm(false)} />
          <Card variant="elevated" className="w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl relative z-10 animate-scaleIn flex flex-col rounded-none sm:rounded-3xl border-0 overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{isEditing ? 'Editar Proyecto' : 'Iniciar Proyecto'}</h2>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">
                  {isEditing ? `Actualizando ${formData.codigo_sgps || 'Proyecto'}` : 'Formulación técnica'}
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="flex-1 flex flex-col min-h-0 bg-white">
              {/* Form Tabs */}
              <div className="flex border-b border-slate-100 px-6 bg-slate-50/30">
                {[
                  { id: 'basic',  label: 'Básicos',  icon: FileText },
                  { id: 'tech',   label: 'Técnicos', icon: Target },
                  { id: 'budget', label: 'Finanzas', icon: DollarSign },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setFormTab(t.id)}
                    className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px ${
                      formTab === t.id
                        ? 'border-emerald-500 text-emerald-600 bg-white'
                        : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <t.icon size={14} />
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-thin">
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
                        <div className="md:col-span-2">
                          <Select 
                            label="Semillero de Investigación Vinculado" 
                            value={formData.semillero_id} 
                            onChange={patch('semillero_id')} 
                            options={[
                              { value: '', label: 'Sin semillero vinculado (Iniciativa de Grupo)' },
                              ...semilleros.map(s => ({ value: s.id, label: s.nombre }))
                            ]}
                            className="bg-emerald-50/30 border-emerald-100"
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
                      <div className="md:col-span-2">
                          <Select 
                            label="Convocatoria SENNOVA" 
                            value={formData.convocatoria_id} 
                            onChange={patch('convocatoria_id')} 
                            options={[
                              { value: '', label: 'Sin convocatoria vinculada (Uso interno)' },
                              ...convocatorias.map(c => ({ value: c.id, label: `${c.numero_oe} - ${c.nombre} (${c.año})` }))
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
                        <TextArea
                          label="Resumen Ejecutivo / Descripción"
                          placeholder="Describe el alcance y objetivos del proyecto..."
                          value={formData.descripcion}
                          onChange={patch('descripcion')}
                          rows={6}
                          className="rounded-3xl"
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
            </div>

            <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/80 flex flex-col sm:flex-row justify-end gap-3">
              <Button variant="secondary" onClick={() => { setShowForm(false); setIsEditing(false); setFormData(EMPTY_FORM); }} className="w-full sm:w-auto justify-center">Cancelar</Button>
              <Button variant="sena" onClick={handleSave} disabled={!formData.nombre.trim()} className="w-full sm:w-auto justify-center shadow-lg shadow-emerald-200">
                {isEditing ? 'Guardar Cambios' : 'Crear Proyecto'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Liquidation Checklist Modal ── */}
      {showLiquidation && liqChecklist && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <Card className="w-full max-w-lg shadow-2xl animate-scaleIn border-0 overflow-hidden bg-white">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-8 text-white relative">
              <button 
                onClick={() => setShowLiquidation(false)} 
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-all"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black tracking-tight">Liquidación Técnica</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Verificación de requisitos SENNOVA</p>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <p className="text-sm text-slate-500 font-medium leading-relaxed">
                Para finalizar oficialmente este proyecto y emitir los certificados, el sistema debe validar los siguientes requisitos institucionales:
              </p>

              <div className="space-y-3">
                {liqChecklist.checklist.map((item) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${item.status ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${item.status ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                        {item.status ? <Check size={14} /> : <AlertCircle size={14} />}
                      </div>
                      <span className={`text-xs font-bold ${item.status ? 'text-emerald-700' : 'text-rose-700'}`}>
                        {item.label}
                      </span>
                    </div>
                    {item.status ? (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 text-[8px]">CUMPLIDO</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-100 text-[8px]">PENDIENTE</Badge>
                    )}
                  </div>
                ))}
              </div>

              {!liqChecklist.can_liquidate && (
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
                  <AlertCircle className="text-amber-500 shrink-0" size={18} />
                  <p className="text-[10px] font-bold text-amber-700 leading-normal">
                    IMPORTANTE: El proyecto no puede ser liquidado hasta que se cumplan todos los puntos del checklist. 
                    Por favor verifica los productos pendientes y las firmas de bitácora.
                  </p>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowLiquidation(false)}>
                Cerrar
              </Button>
              <Button 
                variant="primary" 
                className="flex-1" 
                disabled={!liqChecklist.can_liquidate || loading}
                onClick={handleFinalizeProject}
              >
                {loading ? <Loader2 className="animate-spin mr-2" size={16} /> : 'Finalizar Proyecto'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProyectosModule;
