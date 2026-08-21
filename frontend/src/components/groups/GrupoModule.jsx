import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers, Edit2, Globe, Star, Users, Award, Shield, ExternalLink,
  ArrowUpRight, Download, FileText, X, Loader2, ChevronRight,
  BookOpen, Target, Info, CheckCircle2, Upload, Folder,
  GraduationCap, FolderOpen, Building2, Calendar, BarChart3,
  PieChart, Activity, TrendingUp, Search, Filter, RefreshCw,
  Clock, DollarSign, Eye, AlertCircle, FileSpreadsheet, Printer,
  Plus, Trash2, UserPlus, Zap, Package, MapPin, Settings, Check,
  Clock3, Sparkles, ShieldCheck, Mail, Phone, Lock, ChevronDown,
  FileCheck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  ResponsiveContainer, Cell, PieChart as RePie, Pie
} from 'recharts';
import { GruposAPI } from '../../api/grupos';
import { SemillerosAPI } from '../../api/semilleros';
import { UsuariosAPI } from '../../api/usuarios';
import { ProyectosAPI } from '../../api/proyectos';
import { ProductosAPI } from '../../api/productos';
import { AprendicesAPI } from '../../api/aprendices';
import { PlantillasAPI } from '../../api/plantillas';
import { ReportesAPI } from '../../api/reportes';
import { PDFGenerator } from '../../utils/pdfGenerator';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TextArea from '../ui/TextArea';
import Modal from '../ui/Modal';
import Drawer from '../ui/Drawer';
import ScrollableTabs from '../ui/ScrollableTabs';
import ConfirmDialog from '../ui/ConfirmDialog';
import StatusBadge from '../ui/StatusBadge';
import ProyectoEquipoTab from '../projects/ProyectoEquipoTab';
import UserInsightPanel from '../users/UserInsightPanel';

// ─── Constantes CGAO ─────────────────────────────────────────────────────────
const CLASIFICACIONES = [
  { value: 'A1', label: 'Categoría A1 (Excelencia)' },
  { value: 'A',  label: 'Categoría A' },
  { value: 'B',  label: 'Categoría B' },
  { value: 'C',  label: 'Categoría C' },
  { value: 'Reconocido', label: 'Reconocido' },
  { value: 'S.C.', label: 'Sin Clasificación' }
];

const CHART_COLORS = ['#39A900', '#6366F1', '#F59E0B', '#EC4899', '#06B6D4', '#8B5CF6'];

const RUBROS = [
  { id: 'personal',   label: 'Talento Humano', icon: Users,    color: 'text-emerald-600', bg: 'bg-emerald-500' },
  { id: 'materiales', label: 'Materiales',     icon: Package,  color: 'text-blue-600',    bg: 'bg-blue-500' },
  { id: 'viaticos',   label: 'Viáticos',       icon: MapPin,   color: 'text-amber-600',   bg: 'bg-amber-500' },
  { id: 'servicios',  label: 'Servicios',      icon: Settings, color: 'text-indigo-600',  bg: 'bg-indigo-500' },
  { id: 'equipos',    label: 'Equipos',        icon: Zap,       color: 'text-rose-600',    bg: 'bg-rose-500' },
];

const TIPOLOGIAS_PROYECTO = [
  { value: 'Innovación',     label: 'Innovación' },
  { value: 'Investigación',  label: 'Investigación Aplicada' },
  { value: 'Modernización',  label: 'Modernización Tecnológica' },
  { value: 'Desarrollo Tecnológico', label: 'Desarrollo Tecnológico' },
];

const TIPOLOGIAS_PRODUCTO = [
  { value: 'Artículo Científico', label: 'Artículo Científico' },
  { value: 'Software / Aplicativo', label: 'Software / Aplicativo' },
  { value: 'Prototipo Industrial', label: 'Prototipo Industrial' },
  { value: 'Libro / Capítulo', label: 'Libro o Capítulo de Investigación' },
  { value: 'Patente / Modelo', label: 'Patente o Modelo de Utilidad' },
  { value: 'Informe Técnico', label: 'Informe Técnico Final' },
];

const FORMATOS_OFICIALES = [
  { id: 'etapa_productiva', nombre: 'Formato Planeación Etapa Productiva', codigo: 'F-01-SENN' },
  { id: 'seguimiento',      nombre: 'Formato de Seguimiento Técnico',      codigo: 'F-02-SENN' },
  { id: 'informe_final',    nombre: 'Informe Final de Proyecto',           codigo: 'F-03-SENN' },
  { id: 'bitacora',         nombre: 'Bitácora Técnica Oficial',            codigo: 'F-04-SENN' },
];

const EMPTY_PROJECT_FORM = {
  nombre: '',
  nombre_corto: '',
  codigo_sgps: '',
  estado: 'Aprobado',
  vigencia: 12,
  presupuesto_total: 0,
  tipologia: 'Innovación',
  linea_investigacion: '',
  red_conocimiento: '',
  descripcion: '',
  objetivo_general: '',
  año: new Date().getFullYear(),
  año_fin: new Date().getFullYear(),
  semillero_id: '',
  presupuesto_detallado: { personal: 0, materiales: 0, viaticos: 0, servicios: 0, equipos: 0 }
};

const EMPTY_SEMILLERO_FORM = {
  nombre: '',
  sigla: '',
  codigo: '',
  linea_investigacion: '',
  descripcion: '',
  estado: 'activo',
  horas_dedicadas: 40,
  lider: '',
  lider_nombre: '',
  is_publico: true
};

const EMPTY_PRODUCTO_FORM = {
  titulo: '',
  tipologia: 'Artículo Científico',
  categoria_minciencias: 'A',
  año: new Date().getFullYear(),
  proyecto_id: '',
  autores: '',
  url_soporte: '',
  descripcion: '',
  is_verificado: true
};

// ─── Componentes Auxiliares de Visualización ────────────────────────────────
const StatCard = ({ label, value, icon: Icon, color = 'indigo', subtext, onClick }) => {
  const colorMap = {
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', iconBg: 'bg-emerald-100', border: 'border-emerald-100' },
    indigo:  { bg: 'bg-indigo-50',  text: 'text-indigo-700',  iconBg: 'bg-indigo-100',  border: 'border-indigo-100' },
    amber:   { bg: 'bg-amber-50',   text: 'text-amber-700',   iconBg: 'bg-amber-100',   border: 'border-amber-100' },
    blue:    { bg: 'bg-blue-50',    text: 'text-blue-700',    iconBg: 'bg-blue-100',    border: 'border-blue-100' },
    purple:  { bg: 'bg-purple-50',  text: 'text-purple-700',  iconBg: 'bg-purple-100',  border: 'border-purple-100' },
  };
  const c = colorMap[color] || colorMap.indigo;

  return (
    <div
      onClick={onClick}
      className={`p-4 sm:p-5 rounded-2xl bg-white border ${c.border} shadow-sm hover:shadow-md transition-all ${
        onClick ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest">{label}</span>
        <div className={`p-2 rounded-xl ${c.iconBg} ${c.text}`}>
          <Icon size={16} />
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">{value}</p>
      {subtext && <p className="text-[11px] text-slate-600 font-medium mt-1">{subtext}</p>}
    </div>
  );
};

const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-4 py-3.5 border-b border-slate-100 last:border-0">
    {Icon && (
      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl mt-0.5 flex-shrink-0">
        <Icon size={14} />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm font-bold text-slate-800 break-words">{value || <span className="text-slate-400 italic font-normal">No configurado</span>}</p>
    </div>
  </div>
);

const ProjectTimeline = ({ entregables = [] }) => {
  const fases = ['Fase I (Planeación)', 'Fase II (Ejecución Inicial)', 'Fase III (Desarrollo Técnico)', 'Fase Final (Cierre)'];
  
  return (
    <div className="space-y-6 py-4">
      <div className="relative">
        <div className="absolute top-0 left-5 bottom-0 w-1 bg-gradient-to-b from-emerald-500/20 via-slate-100 to-slate-100 rounded-full" />
        
        {fases.map((fase, idx) => {
          const itemsDeFase = entregables.filter((_, i) => (i % 4) === idx);
          
          return (
            <div key={fase} className="relative flex items-start gap-5 mb-6 last:mb-0 group">
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-white border-2 border-emerald-500 shadow-md shadow-emerald-500/10 flex items-center justify-center text-xs font-black text-emerald-600">
                  {idx + 1}
                </div>
              </div>

              <div className="flex-1 pt-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Hito Metodológico
                    </span>
                    <h5 className="font-extrabold text-slate-800 text-xs sm:text-sm mt-0.5">{fase}</h5>
                  </div>
                  <span className="text-[10px] font-black text-slate-700 font-mono bg-slate-100 px-2 py-1 rounded-lg">
                    {itemsDeFase.length} Entregables
                  </span>
                </div>

                {itemsDeFase.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    {itemsDeFase.map((e, eIdx) => (
                      <div 
                        key={e.id || eIdx} 
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <CheckCircle2 size={13} className={e.estado === 'aprobado' ? 'text-emerald-500' : 'text-slate-400'} />
                          <span className="text-xs font-bold text-slate-800 truncate">{e.nombre}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-600 font-semibold">
                          <span>{e.fecha_limite ? new Date(e.fecha_limite).toLocaleDateString('es-CO') : 'Sin fecha'}</span>
                          <span className={`px-1.5 py-0.5 rounded font-black uppercase text-[8px] ${
                            e.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-800' :
                            e.estado === 'en_revision' ? 'bg-amber-100 text-amber-900' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {e.estado || 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600 italic py-1 font-medium">Sin entregables específicos para esta fase aún.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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

// ─── Main Module ────────────────────────────────────────────────────────────
const GrupoModule = ({ currentUser, onNotify, onNavigate }) => {
  // Datos Maestros del Grupo
  const [grupo, setGrupo] = useState(null);
  const [stats, setStats] = useState(null);
  const [semilleros, setSemilleros] = useState([]);
  const [investigadores, setInvestigadores] = useState([]);
  const [todosUsuarios, setTodosUsuarios] = useState([]);
  const [proyectosGrupo, setProyectosGrupo] = useState([]);
  const [productosGrupo, setProductosGrupo] = useState([]);
  const [aprendicesGrupo, setAprendicesGrupo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('stats');

  // Filtros
  const [proySearchTerm, setProySearchTerm] = useState('');
  const [proyStatusFilter, setProyStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLineaFilter, setSelectedLineaFilter] = useState('todas');

  // ── Modales de Proyecto (CRUD Unificado) ──
  const [selectedProyecto, setSelectedProyecto] = useState(null);
  const [isProjectDrawerOpen, setIsProjectDrawerOpen] = useState(false);
  const [projectDrawerTab, setProjectDrawerTab] = useState('summary');
  const [showProjectFormModal, setShowProjectFormModal] = useState(false);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectFormData, setProjectFormData] = useState(EMPTY_PROJECT_FORM);
  const [savingProject, setSavingProject] = useState(false);
  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState({ isOpen: false, id: null, nombre: '' });
  const [generatingFormatId, setGeneratingFormatId] = useState(null);
  const [showLiquidationModal, setShowLiquidationModal] = useState(false);
  const [showElaboracionModal, setShowElaboracionModal] = useState(false);

  // ── Modales de Semillero (CRUD Unificado) ──
  const [selectedSemillero, setSelectedSemillero] = useState(null);
  const [isSemilleroDrawerOpen, setIsSemilleroDrawerOpen] = useState(false);
  const [semilleroDrawerTab, setSemilleroDrawerTab] = useState('summary');
  const [semilleroAprendices, setSemilleroAprendices] = useState([]);
  const [showSemilleroFormModal, setShowSemilleroFormModal] = useState(false);
  const [isEditingSemillero, setIsEditingSemillero] = useState(false);
  const [semilleroFormData, setSemilleroFormData] = useState(EMPTY_SEMILLERO_FORM);
  const [savingSemillero, setSavingSemillero] = useState(false);
  const [showDeleteSemilleroConfirm, setShowDeleteSemilleroConfirm] = useState({ isOpen: false, id: null, nombre: '' });
  const [showVincularAprendizModal, setShowVincularAprendizModal] = useState(false);
  const [selectedAprendizIdToLink, setSelectedAprendizIdToLink] = useState('');
  const [showRemoveAprendizConfirm, setShowRemoveAprendizConfirm] = useState({ isOpen: false, id: null, name: '' });

  // ── Modales de Líneas de Investigación (CRUD) ──
  const [selectedLineaDetail, setSelectedLineaDetail] = useState(null);
  const [isLineaModalOpen, setIsLineaModalOpen] = useState(false);
  const [showAddLineaModal, setShowAddLineaModal] = useState(false);
  const [newLineaInput, setNewLineaInput] = useState('');
  const [showEditLineaModal, setShowEditLineaModal] = useState(false);
  const [editingLineaOriginal, setEditingLineaOriginal] = useState('');
  const [editingLineaNew, setEditingLineaNew] = useState('');
  const [showDeleteLineaConfirm, setShowDeleteLineaConfirm] = useState({ isOpen: false, nombre: '' });

  // ── Modales de Investigador / CvLAC (CRUD) ──
  const [selectedInvestigador, setSelectedInvestigador] = useState(null);
  const [isInvestigadorModalOpen, setIsInvestigadorModalOpen] = useState(false);
  const [isEditingInvestigador, setIsEditingInvestigador] = useState(false);
  const [investigadorFormData, setInvestigadorFormData] = useState({});
  const [savingInvestigador, setSavingInvestigador] = useState(false);
  const [showCreateInvestigadorModal, setShowCreateInvestigadorModal] = useState(false);
  const [newInvestigadorData, setNewInvestigadorData] = useState({ nombre: '', email: '', rol: 'investigador', rol_sennova: 'Investigador', estado_cv_lac: 'Actualizado' });

  // ── Modales de Aprendices (Listado & CRUD) ──
  const [showAprendicesModal, setShowAprendicesModal] = useState(false);
  const [aprendizSearch, setAprendizSearch] = useState('');
  const [aprendizSemilleroFilter, setAprendizSemilleroFilter] = useState('todos');
  const [selectedAprendizDetail, setSelectedAprendizDetail] = useState(null);
  const [selectedUserInsight, setSelectedUserInsight] = useState(null);
  const [showUserInsight, setShowUserInsight] = useState(false);

  // ── Modales de Productos I+D (Listado & CRUD) ──
  const [showProductosModal, setShowProductosModal] = useState(false);
  const [productoSearch, setProductoSearch] = useState('');
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [showProductoFormModal, setShowProductoFormModal] = useState(false);
  const [isEditingProducto, setIsEditingProducto] = useState(false);
  const [productoFormData, setProductoFormData] = useState(EMPTY_PRODUCTO_FORM);
  const [savingProducto, setSavingProducto] = useState(false);
  const [showDeleteProductoConfirm, setShowDeleteProductoConfirm] = useState({ isOpen: false, id: null, titulo: '' });

  // ── Ficha del Grupo & Plan Operativo ──
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [savingGrupo, setSavingGrupo] = useState(false);
  const [uploadingPlan, setUploadingPlan] = useState(false);

  useEffect(() => { 
    loadData(); 
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [grupos, sems, users, prods, aprs] = await Promise.all([
        GruposAPI.list().catch(() => []),
        SemillerosAPI.list().catch(() => []),
        UsuariosAPI.list().catch(() => []),
        ProductosAPI.list().catch(() => []),
        AprendicesAPI.list().catch(() => []),
      ]);
      
      const g = (grupos || [])[0] || null;
      setGrupo(g);
      setSemilleros(sems || []);
      setTodosUsuarios(users || []);
      setInvestigadores((users || []).filter(u => u.rol === 'investigador' || u.rol === 'admin' || u.rol === 'instructor'));
      setProductosGrupo(prods || []);
      setAprendicesGrupo(aprs || []);

      if (g?.id) {
        try {
          const [s, proys] = await Promise.all([
            GruposAPI.getStats(g.id).catch(() => null),
            GruposAPI.getProyectos(g.id).catch(() => [])
          ]);
          setStats(s);
          setProyectosGrupo(proys || []);
        } catch (e) {
          console.warn('No se pudieron cargar estadísticas detalladas:', e);
        }
      }
    } catch (err) {
      onNotify?.('Error al cargar datos del grupo: ' + err.message, 'error');
    }
    setLoading(false);
  };

  // ─── Proyectos CRUD Handlers ──────────────────────────────────────────────
  const handleOpenProjectDetail = (p) => {
    setSelectedProyecto(p);
    setProjectDrawerTab('summary');
    setIsProjectDrawerOpen(true);
  };

  const handleOpenCreateProject = () => {
    setProjectFormData({
      ...EMPTY_PROJECT_FORM,
      semillero_id: semilleros[0]?.id || '',
      linea_investigacion: lineas[0] || ''
    });
    setIsEditingProject(false);
    setShowProjectFormModal(true);
  };

  const handleOpenEditProject = (p, e) => {
    if (e) e.stopPropagation();
    setProjectFormData({
      ...p,
      presupuesto_detallado: p.presupuesto_detallado || { personal: 0, materiales: 0, viaticos: 0, servicios: 0, equipos: 0 }
    });
    setIsEditingProject(true);
    setShowProjectFormModal(true);
  };

  const handleSaveProject = async () => {
    setSavingProject(true);
    try {
      const payload = {
        ...projectFormData,
        presupuesto_total: Number(projectFormData.presupuesto_total) || 0,
        vigencia: Number(projectFormData.vigencia) || 12,
        grupo_id: grupo?.id || null
      };

      if (isEditingProject && projectFormData.id) {
        await ProyectosAPI.update(projectFormData.id, payload);
        onNotify?.('Proyecto actualizado exitosamente', 'success');
      } else {
        await ProyectosAPI.create(payload);
        onNotify?.('Proyecto creado y vinculado al grupo exitosamente', 'success');
      }

      setShowProjectFormModal(false);
      await loadData();
      if (selectedProyecto?.id === projectFormData.id) {
        setSelectedProyecto(prev => ({ ...prev, ...payload }));
      }
    } catch (err) {
      onNotify?.('Error al guardar proyecto: ' + err.message, 'error');
    }
    setSavingProject(false);
  };

  const handleDeleteProject = async () => {
    if (!showDeleteProjectConfirm.id) return;
    try {
      await ProyectosAPI.delete(showDeleteProjectConfirm.id);
      onNotify?.('Proyecto eliminado correctamente', 'success');
      setShowDeleteProjectConfirm({ isOpen: false, id: null, nombre: '' });
      if (selectedProyecto?.id === showDeleteProjectConfirm.id) {
        setIsProjectDrawerOpen(false);
        setSelectedProyecto(null);
      }
      await loadData();
    } catch (err) {
      onNotify?.('Error al eliminar proyecto: ' + err.message, 'error');
    }
  };

  const handleAddProjectTeamMember = async (userId, rolEnProyecto, horas) => {
    if (!selectedProyecto?.id) return;
    try {
      await ProyectosAPI.addEquipo(selectedProyecto.id, userId, rolEnProyecto, horas);
      onNotify?.('Investigador vinculado al proyecto', 'success');
      const updated = await ProyectosAPI.get(selectedProyecto.id);
      setSelectedProyecto(updated);
      await loadData();
    } catch (err) {
      onNotify?.('Error al vincular miembro: ' + err.message, 'error');
    }
  };

  const handleRemoveProjectTeamMember = async (userId) => {
    if (!selectedProyecto?.id) return;
    try {
      await ProyectosAPI.removeEquipo(selectedProyecto.id, userId);
      onNotify?.('Investigador desvinculado del proyecto', 'success');
      const updated = await ProyectosAPI.get(selectedProyecto.id);
      setSelectedProyecto(updated);
      await loadData();
    } catch (err) {
      onNotify?.('Error al desvincular miembro: ' + err.message, 'error');
    }
  };

  const handleGenerateFormat = async (formatId, p) => {
    const target = p || selectedProyecto;
    if (!target) return;
    setGeneratingFormatId(formatId);
    try {
      if (formatId === 'etapa_productiva') {
        let fullTarget = target;
        try {
          const loaded = await ProyectosAPI.get(target.id);
          if (loaded && loaded.id) fullTarget = loaded;
        } catch {
          // fallback to target
        }
        PDFGenerator.generateEtapaProductiva(fullTarget);
      } else if (formatId === 'seguimiento') {
        let fullTarget = target;
        try {
          const loaded = await ProyectosAPI.get(target.id);
          if (loaded && loaded.id) fullTarget = loaded;
        } catch {
          // fallback to target
        }
        PDFGenerator.generateSeguimiento(fullTarget);
      } else if (formatId === 'informe_final') {
        let fullTarget = target;
        try {
          const loaded = await ProyectosAPI.get(target.id);
          if (loaded && loaded.id) fullTarget = loaded;
        } catch {
          // fallback to target
        }
        PDFGenerator.generateInformeFinal(fullTarget);
      } else if (formatId === 'bitacora') {
        try {
          const data = await PlantillasAPI.getBitacoraOficial(target.id);
          PDFGenerator.generateBitacoraReport(data);
        } catch {
          PDFGenerator.generateBitacoraReport({ proyecto: target, entradas: [] });
        }
      } else if (formatId === 'presupuesto') {
        try {
          const data = await PlantillasAPI.getReportePresupuesto(target.id);
          PDFGenerator.generateBudgetReport(data);
        } catch {
          PDFGenerator.generateBudgetReport({ proyecto: target });
        }
      }
      onNotify?.('Formato oficial generado exitosamente', 'success');
    } catch (err) {
      onNotify?.('Error al generar formato: ' + err.message, 'error');
    } finally {
      setGeneratingFormatId(null);
    }
  };

  // ─── Semilleros CRUD Handlers ────────────────────────────────────────────
  const handleOpenSemilleroDetail = async (sem) => {
    setSelectedSemillero(sem);
    setSemilleroDrawerTab('summary');
    setIsSemilleroDrawerOpen(true);
    try {
      const aprs = await SemillerosAPI.listAprendices(sem.id);
      setSemilleroAprendices(aprs || []);
    } catch (e) {
      setSemilleroAprendices(sem.aprendices || []);
    }
  };

  const handleOpenCreateSemillero = () => {
    setSemilleroFormData({
      ...EMPTY_SEMILLERO_FORM,
      grupo_id: grupo?.id || '',
      linea_investigacion: lineas[0] || ''
    });
    setIsEditingSemillero(false);
    setShowSemilleroFormModal(true);
  };

  const handleOpenEditSemillero = (sem, e) => {
    if (e) e.stopPropagation();
    setSemilleroFormData({ ...sem });
    setIsEditingSemillero(true);
    setShowSemilleroFormModal(true);
  };

  const handleSaveSemillero = async () => {
    setSavingSemillero(true);
    try {
      const payload = {
        ...semilleroFormData,
        horas_dedicadas: Number(semilleroFormData.horas_dedicadas) || 40,
        grupo_id: grupo?.id || null
      };

      if (isEditingSemillero && semilleroFormData.id) {
        await SemillerosAPI.update(semilleroFormData.id, payload);
        onNotify?.('Semillero actualizado exitosamente', 'success');
      } else {
        await SemillerosAPI.create(payload);
        onNotify?.('Semillero creado exitosamente en el grupo', 'success');
      }

      setShowSemilleroFormModal(false);
      await loadData();
      if (selectedSemillero?.id === semilleroFormData.id) {
        setSelectedSemillero(prev => ({ ...prev, ...payload }));
      }
    } catch (err) {
      onNotify?.('Error al guardar semillero: ' + err.message, 'error');
    }
    setSavingSemillero(false);
  };

  const handleDeleteSemillero = async () => {
    if (!showDeleteSemilleroConfirm.id) return;
    try {
      await SemillerosAPI.delete(showDeleteSemilleroConfirm.id);
      onNotify?.('Semillero eliminado correctamente', 'success');
      setShowDeleteSemilleroConfirm({ isOpen: false, id: null, nombre: '' });
      if (selectedSemillero?.id === showDeleteSemilleroConfirm.id) {
        setIsSemilleroDrawerOpen(false);
        setSelectedSemillero(null);
      }
      await loadData();
    } catch (err) {
      onNotify?.('Error al eliminar semillero: ' + err.message, 'error');
    }
  };

  const handleLinkAprendizToSemillero = async () => {
    if (!selectedSemillero?.id || !selectedAprendizIdToLink) return;
    try {
      await SemillerosAPI.addAprendiz(selectedSemillero.id, {
        aprendiz_id: selectedAprendizIdToLink,
        estado: 'activo',
        fecha_vinculacion: new Date().toISOString().split('T')[0]
      });
      onNotify?.('Aprendiz vinculado exitosamente al semillero', 'success');
      setShowVincularAprendizModal(false);
      setSelectedAprendizIdToLink('');
      const aprs = await SemillerosAPI.listAprendices(selectedSemillero.id);
      setSemilleroAprendices(aprs || []);
      await loadData();
    } catch (err) {
      onNotify?.('Error al vincular aprendiz: ' + err.message, 'error');
    }
  };

  const handleRemoveAprendizFromSemillero = async (aprendizId) => {
    if (!selectedSemillero?.id) return;
    try {
      await SemillerosAPI.deleteAprendiz(selectedSemillero.id, aprendizId);
      onNotify?.('Aprendiz desvinculado del semillero', 'success');
      const aprs = await SemillerosAPI.listAprendices(selectedSemillero.id);
      setSemilleroAprendices(aprs || []);
      await loadData();
    } catch (err) {
      onNotify?.('Error al desvincular aprendiz: ' + err.message, 'error');
    }
  };

  const handleOpenAprendizDetail = async (apr) => {
    if (!apr) return;
    const targetUserId = apr.user_id || apr.id;

    // Buscar en la lista de usuarios ya cargados si existe
    let userObj = (todosUsuarios || []).find(u => u.id === targetUserId || u.id === apr.user_id || u.id === apr.id) ||
                  (aprendicesGrupo || []).find(a => a.id === apr.id || a.user_id === targetUserId);
    if (!userObj && targetUserId) {
      try {
        userObj = await UsuariosAPI.get(targetUserId);
      } catch {
        // Fallback al objeto con propiedades de aprendiz
      }
    }

    const finalUser = {
      ...(userObj || {}),
      ...apr,
      id: targetUserId,
      nombre: apr.nombre || apr.nombre_completo || userObj?.nombre || 'Aprendiz',
      email: apr.email || userObj?.email || `${(apr.nombre || 'aprendiz').toLowerCase().replace(/[^a-z0-9]/g, '.')}@soy.sena.edu.co`,
      rol: 'aprendiz',
      rol_sennova: apr.rol_sennova || userObj?.rol_sennova || 'Aprendiz Investigador',
      ficha: apr.ficha || userObj?.ficha || '',
      programa_formacion: apr.programa || apr.programa_formacion || userObj?.programa_formacion || 'Programa no especificado',
      documento: apr.documento || userObj?.documento || '',
      celular: apr.celular || userObj?.celular || '',
      sede: apr.sede || userObj?.sede || grupo?.nombre || 'Centro de Gestión Agroempresarial del Oriente',
      regional: apr.regional || userObj?.regional || 'Santander',
      is_active: apr.estado !== 'inactivo' && apr.estado !== 'Retirado' && userObj?.is_active !== false,
      cv_lac_url: apr.cv_lac_url || userObj?.cv_lac_url || '',
      nivel_academico: apr.nivel_academico || userObj?.nivel_academico || 'Técnico / Tecnólogo'
    };

    setSelectedUserInsight(finalUser);
    setShowUserInsight(true);
  };

  // ─── Líneas de Investigación Handlers ────────────────────────────────────
  const lineas = useMemo(() => {
    if (Array.isArray(grupo?.lineas_investigacion) && grupo.lineas_investigacion.length > 0) {
      return grupo.lineas_investigacion;
    }
    if (typeof grupo?.lineas_investigacion === 'string' && grupo.lineas_investigacion.trim()) {
      return grupo.lineas_investigacion.split(',').map(l => l.trim()).filter(Boolean);
    }
    return [];
  }, [grupo]);

  const handleOpenLineaDetail = (lineaName) => {
    const sems = semilleros.filter(s => s.linea_investigacion === lineaName);
    const proys = proyectosGrupo.filter(p => p.linea_investigacion === lineaName);
    const presTotal = proys.reduce((acc, p) => acc + (Number(p.presupuesto_total) || 0), 0);
    setSelectedLineaDetail({
      nombre: lineaName,
      semilleros: sems,
      proyectos: proys,
      presupuestoTotal: presTotal
    });
    setIsLineaModalOpen(true);
  };

  const handleAddLinea = async () => {
    if (!newLineaInput.trim() || !grupo?.id) return;
    try {
      const updatedLineas = [...lineas, newLineaInput.trim()];
      await GruposAPI.update(grupo.id, { ...grupo, lineas_investigacion: updatedLineas });
      onNotify?.('Línea de investigación agregada exitosamente', 'success');
      setNewLineaInput('');
      setShowAddLineaModal(false);
      await loadData();
    } catch (err) {
      onNotify?.('Error al agregar línea: ' + err.message, 'error');
    }
  };

  const handleSaveEditLinea = async () => {
    if (!editingLineaNew.trim() || !grupo?.id) return;
    try {
      const updatedLineas = lineas.map(l => l === editingLineaOriginal ? editingLineaNew.trim() : l);
      await GruposAPI.update(grupo.id, { ...grupo, lineas_investigacion: updatedLineas });
      onNotify?.('Línea de investigación actualizada', 'success');
      setShowEditLineaModal(false);
      if (selectedLineaDetail?.nombre === editingLineaOriginal) {
        setSelectedLineaDetail(prev => ({ ...prev, nombre: editingLineaNew.trim() }));
      }
      await loadData();
    } catch (err) {
      onNotify?.('Error al editar línea: ' + err.message, 'error');
    }
  };

  const handleDeleteLinea = async () => {
    if (!showDeleteLineaConfirm.nombre || !grupo?.id) return;
    try {
      const updatedLineas = lineas.filter(l => l !== showDeleteLineaConfirm.nombre);
      await GruposAPI.update(grupo.id, { ...grupo, lineas_investigacion: updatedLineas });
      onNotify?.('Línea de investigación eliminada', 'success');
      setShowDeleteLineaConfirm({ isOpen: false, nombre: '' });
      setIsLineaModalOpen(false);
      await loadData();
    } catch (err) {
      onNotify?.('Error al eliminar línea: ' + err.message, 'error');
    }
  };

  // ─── Investigadores Handlers ─────────────────────────────────────────────
  const handleOpenInvestigadorDetail = (inv) => {
    setSelectedInvestigador(inv);
    setInvestigadorFormData({ ...inv });
    setIsEditingInvestigador(false);
    setIsInvestigadorModalOpen(true);
  };

  const handleSaveInvestigador = async () => {
    if (!selectedInvestigador?.id) return;
    setSavingInvestigador(true);
    try {
      await UsuariosAPI.update(selectedInvestigador.id, investigadorFormData);
      onNotify?.('Datos del investigador actualizados correctamente', 'success');
      setIsEditingInvestigador(false);
      setSelectedInvestigador(prev => ({ ...prev, ...investigadorFormData }));
      await loadData();
    } catch (err) {
      onNotify?.('Error al actualizar investigador: ' + err.message, 'error');
    }
    setSavingInvestigador(false);
  };

  const handleCreateInvestigador = async () => {
    try {
      await UsuariosAPI.create(newInvestigadorData);
      onNotify?.('Investigador registrado exitosamente en el sistema', 'success');
      setShowCreateInvestigadorModal(false);
      setNewInvestigadorData({ nombre: '', email: '', rol: 'investigador', rol_sennova: 'Investigador', estado_cv_lac: 'Actualizado' });
      await loadData();
    } catch (err) {
      onNotify?.('Error al registrar investigador: ' + err.message, 'error');
    }
  };

  // ─── Productos I+D Handlers ──────────────────────────────────────────────
  const handleOpenCreateProducto = () => {
    setProductoFormData({
      ...EMPTY_PRODUCTO_FORM,
      proyecto_id: proyectosGrupo[0]?.id || ''
    });
    setIsEditingProducto(false);
    setShowProductoFormModal(true);
  };

  const handleOpenEditProducto = (prod) => {
    setProductoFormData({ ...prod });
    setIsEditingProducto(true);
    setShowProductoFormModal(true);
  };

  const handleSaveProducto = async () => {
    setSavingProducto(true);
    try {
      const payload = {
        ...productoFormData,
        año: Number(productoFormData.año) || new Date().getFullYear(),
        proyecto_id: productoFormData.proyecto_id || null
      };

      if (isEditingProducto && productoFormData.id) {
        await ProductosAPI.update(productoFormData.id, payload);
        onNotify?.('Producto de investigación actualizado', 'success');
      } else {
        await ProductosAPI.create(payload);
        onNotify?.('Producto I+D registrado exitosamente', 'success');
      }

      setShowProductoFormModal(false);
      await loadData();
    } catch (err) {
      onNotify?.('Error al guardar producto: ' + err.message, 'error');
    }
    setSavingProducto(false);
  };

  const handleDeleteProducto = async () => {
    if (!showDeleteProductoConfirm.id) return;
    try {
      await ProductosAPI.delete(showDeleteProductoConfirm.id);
      onNotify?.('Producto eliminado correctamente', 'success');
      setShowDeleteProductoConfirm({ isOpen: false, id: null, titulo: '' });
      await loadData();
    } catch (err) {
      onNotify?.('Error al eliminar producto: ' + err.message, 'error');
    }
  };

  // ─── Plan Operativo & Ficha General ───────────────────────────────────────
  const handleEditGrupo = () => {
    setFormData({
      ...grupo,
      lineas_investigacion: Array.isArray(grupo?.lineas_investigacion)
        ? grupo.lineas_investigacion.join(', ')
        : grupo?.lineas_investigacion || '',
    });
    setShowEditForm(true);
  };

  const handleSaveGrupo = async () => {
    setSavingGrupo(true);
    try {
      const payload = {
        ...formData,
        lineas_investigacion: typeof formData.lineas_investigacion === 'string'
          ? formData.lineas_investigacion.split(',').map(l => l.trim()).filter(Boolean)
          : formData.lineas_investigacion,
      };
      await GruposAPI.update(grupo.id, payload);
      onNotify?.('Información del grupo actualizada correctamente', 'success');
      setShowEditForm(false);
      await loadData();
    } catch (err) {
      onNotify?.('Error al guardar: ' + err.message, 'error');
    }
    setSavingGrupo(false);
  };

  const handlePlanUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !grupo?.id) return;

    setUploadingPlan(true);
    try {
      await GruposAPI.uploadPlanOperativo(grupo.id, file);
      onNotify?.('Plan operativo subido exitosamente', 'success');
      await loadData();
    } catch (err) {
      onNotify?.('Error al subir plan operativo: ' + err.message, 'error');
    }
    setUploadingPlan(false);
  };

  // ─── Filtrados ────────────────────────────────────────────────────────────
  const filteredSemilleros = useMemo(() => {
    return semilleros.filter(s => {
      const matchesSearch = 
        (s.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.sigla || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.lider_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.linea_investigacion || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesLinea = selectedLineaFilter === 'todas' || s.linea_investigacion === selectedLineaFilter;
      return matchesSearch && matchesLinea;
    });
  }, [semilleros, searchTerm, selectedLineaFilter]);

  const filteredProyectos = useMemo(() => {
    return proyectosGrupo.filter(p => {
      const matchesSearch = 
        (p.nombre || '').toLowerCase().includes(proySearchTerm.toLowerCase()) ||
        (p.nombre_corto || '').toLowerCase().includes(proySearchTerm.toLowerCase()) ||
        (p.codigo_sgps || '').toLowerCase().includes(proySearchTerm.toLowerCase()) ||
        (p.owner?.nombre || '').toLowerCase().includes(proySearchTerm.toLowerCase()) ||
        (p.semillero_nombre || '').toLowerCase().includes(proySearchTerm.toLowerCase());
      
      const matchesStatus = proyStatusFilter === 'todos' || (p.estado || '').toLowerCase() === proyStatusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [proyectosGrupo, proySearchTerm, proyStatusFilter]);

  const filteredAprendices = useMemo(() => {
    return aprendicesGrupo.filter(a => {
      const matchesSearch = 
        (a.nombre || '').toLowerCase().includes(aprendizSearch.toLowerCase()) ||
        (a.documento || '').includes(aprendizSearch) ||
        (a.programa_formacion || a.programa || '').toLowerCase().includes(aprendizSearch.toLowerCase()) ||
        (a.ficha || '').includes(aprendizSearch);
      const matchesSem = aprendizSemilleroFilter === 'todos' || String(a.semillero_id) === String(aprendizSemilleroFilter);
      return matchesSearch && matchesSem;
    });
  }, [aprendicesGrupo, aprendizSearch, aprendizSemilleroFilter]);

  const filteredProductos = useMemo(() => {
    return productosGrupo.filter(p => {
      return (p.titulo || '').toLowerCase().includes(productoSearch.toLowerCase()) ||
        (p.tipologia || '').toLowerCase().includes(productoSearch.toLowerCase()) ||
        (p.autores || '').toLowerCase().includes(productoSearch.toLowerCase());
    });
  }, [productosGrupo, productoSearch]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="p-4 bg-emerald-50 rounded-2xl animate-pulse">
          <Layers size={36} className="text-emerald-600 animate-spin" />
        </div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
          Consultando Base de Datos CGAO...
        </p>
      </div>
    );
  }

  const exportExcelUrl = GruposAPI.getConsolidadoReporteUrl('excel');

  return (
    <div className="space-y-6 animate-fadeIn pb-24">

      {/* ─── Banner Institucional Dinámico ───────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-900 text-white shadow-xl shadow-emerald-950/20">
        <div className="absolute top-0 right-0 w-80 h-80 -mr-20 -mt-20 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 -ml-16 -mb-16 bg-emerald-950/40 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              <div className="p-4 bg-white/15 backdrop-blur-md rounded-2xl shadow-lg ring-1 ring-white/20 flex-shrink-0">
                <Layers size={36} className="text-emerald-200" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                  <Badge className="bg-emerald-400/20 text-emerald-100 border-emerald-400/30 font-black text-[10px] uppercase tracking-widest">
                    {grupo?.estado?.toUpperCase() || 'VIGENTE'}
                  </Badge>
                  <Badge className="bg-white/15 text-white border-white/25 font-mono text-[10px]">
                    {grupo?.codigo_gruplac ? `GrupLAC: ${grupo.codigo_gruplac}` : 'GrupLAC no configurado'}
                  </Badge>
                  {grupo?.clasificacion && (
                    <Badge className="bg-amber-400/20 text-amber-100 border-amber-400/30 font-black text-[10px]">
                      CATEGORÍA {grupo.clasificacion}
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl sm:text-4xl font-black leading-tight mb-1 tracking-tight">
                  {grupo?.nombre || 'GRUPO DE INVESTIGACIÓN CGAO'}
                </h1>
                <p className="text-emerald-100 font-medium text-xs sm:text-sm opacity-90 max-w-3xl mb-3">
                  {grupo?.nombre_completo || 'Centro de Gestión Agroempresarial del Oriente • SENNOVA Regional Santander'}
                </p>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-emerald-200">
                  {grupo?.director_nombre && (
                    <span className="flex items-center gap-1.5">
                      <Users size={14} className="text-emerald-300" /> Director(a): {grupo.director_nombre}
                    </span>
                  )}
                  {grupo?.director_email && (
                    <span className="flex items-center gap-1.5 opacity-80">
                      <Globe size={14} className="text-emerald-300" /> {grupo.director_email}
                    </span>
                  )}
                  {grupo?.convocatoria_activa && (
                    <span className="flex items-center gap-1.5 bg-white/10 px-2.5 py-0.5 rounded-lg">
                      <Calendar size={12} className="text-emerald-300" /> {grupo.convocatoria_activa}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Acciones principales */}
            <div className="flex flex-wrap gap-2.5 print:hidden items-center">
              <Button
                onClick={() => onNavigate?.('dashboard')}
                className="bg-white hover:bg-emerald-50 text-emerald-950 border-0 font-bold text-xs shadow-md flex items-center gap-1.5"
                title="Ir al Dashboard Operativo"
              >
                <BarChart3 size={15} className="text-emerald-700" />
                <span>{currentUser?.rol === 'admin' ? 'Dashboard General' : currentUser?.rol === 'aprendiz' ? 'Mi Tablero' : 'Mi Dashboard'}</span>
              </Button>
              {grupo?.gruplac_url && (
                <a
                  href={grupo.gruplac_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3.5 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl border border-white/20 text-xs font-bold text-white transition-all shadow-xs"
                  title="Abrir perfil Scienti Minciencias"
                >
                  <Globe size={14} /> GrupLAC <ArrowUpRight size={12} />
                </a>
              )}
              <button
                onClick={async () => {
                  try {
                    await ReportesAPI.descargarConsolidadoGrupos('excel');
                    onNotify?.('Consolidado Excel de grupos generado exitosamente', 'success');
                  } catch (err) {
                    onNotify?.('Error al descargar consolidado: ' + err.message, 'error');
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl border border-white/20 text-xs font-bold text-white transition-all shadow-xs"
                title="Descargar consolidado Excel del grupo"
              >
                <FileSpreadsheet size={14} /> Consolidado Excel
              </button>
              <button onClick={() => window.print()} className="p-2 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl border border-white/20 text-white transition-all shadow-xs" title="Imprimir Ficha Resumen"><Printer size={16} /></button>
              {currentUser?.rol === 'admin' && (
                <Button onClick={handleEditGrupo} className="bg-white hover:bg-emerald-50 text-emerald-900 border-0 font-bold text-xs shadow-md" variant="outline"><Edit2 size={14} className="mr-1.5" /> Editar Perfil</Button>
              )}
            </div>
          </div>

          {/* KPI Ribbon Real y Clickeable */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-white/15 text-white">
            {[
              { label: 'Semilleros', value: semilleros.length, icon: GraduationCap, action: () => setActiveTab('semilleros'), hint: 'Ver semilleros' },
              { label: 'Aprendices', value: stats?.total_aprendices || aprendicesGrupo.length || 0, icon: Star, action: () => setShowAprendicesModal(true), hint: 'Abrir directorio de aprendices' },
              { label: 'Investigadores', value: investigadores.length, icon: Users, action: () => setActiveTab('gruplac'), hint: 'Ver investigadores CvLAC' },
              { label: 'Productos I+D', value: stats?.total_productos || productosGrupo.length || 0, icon: Award, action: () => setShowProductosModal(true), hint: 'Abrir catálogo de productos' },
              { label: 'Proyectos', value: stats?.total_proyectos || proyectosGrupo.length || 0, icon: FolderOpen, action: () => setActiveTab('proyectos'), hint: 'Ver proyectos y avance' },
              { label: 'Líneas I+D', value: lineas.length, icon: Target, action: () => setActiveTab('lineas'), hint: 'Ver líneas temáticas' },
            ].map(({ label, value, icon: Icon, action, hint }) => (
              <div
                key={label}
                onClick={action}
                title={hint}
                className="bg-white/10 hover:bg-white/20 cursor-pointer backdrop-blur-sm rounded-xl p-3 border border-white/10 transition-all hover:scale-105 active:scale-95 group"
              >
                <div className="flex items-center justify-between gap-1.5 mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <Icon size={13} className="text-emerald-300 group-hover:text-white transition-colors" />
                    <span className="text-[9px] font-black text-emerald-200 uppercase tracking-wider">{label}</span>
                  </div>
                  <ChevronRight size={11} className="text-white/40 group-hover:text-white transition-colors" />
                </div>
                <p className="text-xl sm:text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Pestañas de Navegación ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden print:hidden">
        <ScrollableTabs
          tabs={[
            { id: 'stats', label: 'Estadísticas e Indicadores', icon: BarChart3 },
            { id: 'proyectos', label: 'Proyectos & Avance', icon: FolderOpen, count: proyectosGrupo.length },
            { id: 'semilleros', label: 'Semilleros', icon: GraduationCap, count: semilleros.length },
            { id: 'lineas', label: 'Líneas de Investigación', icon: Target, count: lineas.length },
            { id: 'info', label: 'Información Institucional', icon: Info },
            { id: 'plan', label: 'Plan Operativo & Formatos', icon: FileText },
            { id: 'gruplac', label: 'Control GrupLAC / CvLAC', icon: Globe }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="emerald"
          size="md"
          ariaLabel="Secciones del Grupo CGAO"
        />

        {/* ─── PESTAÑA 1: Estadísticas e Indicadores CGAO ──────────────── */}
        {activeTab === 'stats' && (
          <div className="p-6 sm:p-8 space-y-6 animate-fadeIn">
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm border border-slate-700/50">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30 flex-shrink-0">
                  <Activity size={20} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-300">
                    {currentUser?.rol === 'admin' ? 'Panel de Gestión Institucional' : currentUser?.rol === 'aprendiz' ? 'Mi Espacio de Aprendiz' : 'Espacio de Trabajo I+D+i'}
                  </p>
                  <p className="text-xs text-slate-300 font-medium">
                    {currentUser?.rol === 'admin' 
                      ? 'Consulta alertas de vencimiento, bitácoras pendientes de validación y auditoría en tiempo real.'
                      : currentUser?.rol === 'aprendiz'
                      ? 'Registra tus bitácoras de campo, consulta entregables asignados y revisa tu ficha académica.'
                      : 'Gestiona tus entregables programados, firma bitácoras de tutoría y revisa recomendaciones AI.'}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => onNavigate?.('dashboard')}
                variant="sena"
                size="sm"
                className="text-xs font-bold whitespace-nowrap shadow-sm self-start sm:self-auto"
              >
                <BarChart3 size={14} className="mr-1.5" /> Ir al Dashboard Operativo
              </Button>
            </div>

            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-1">
                <Activity size={16} className="text-emerald-600" /> Tablero de Impacto Científico & Formativo CGAO
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Métricas calculadas en tiempo real a partir de los registros de investigación en la base de datos PostgreSQL.
              </p>
            </div>

            {/* Tarjetas Analíticas Clave */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Producción Minciencias"
                value={stats?.total_productos || productosGrupo.length || 0}
                icon={Award}
                color="emerald"
                subtext="Clic para ver y gestionar catálogo I+D"
                onClick={() => setShowProductosModal(true)}
              />
              <StatCard
                label="Proyectos I+D+i"
                value={stats?.total_proyectos || proyectosGrupo.length || 0}
                icon={FolderOpen}
                color="indigo"
                subtext={`Cumplimiento promedio: ${stats?.cumplimiento || stats?.avance_promedio || 0}%`}
                onClick={() => setActiveTab('proyectos')}
              />
              <StatCard
                label="Aprendices Semilleristas"
                value={stats?.total_aprendices || aprendicesGrupo.length || 0}
                icon={GraduationCap}
                color="amber"
                subtext={`En ${semilleros.length} semilleros activos (Clic para ver)`}
                onClick={() => setShowAprendicesModal(true)}
              />
              <StatCard
                label="Dedicación Formativa"
                value={`${stats?.horas_formativas || semilleros.reduce((acc, s) => acc + (s.horas_dedicadas || 0), 0) || 0}h`}
                icon={Clock}
                color="purple"
                subtext="Horas declaradas en semilleros"
                onClick={() => setActiveTab('semilleros')}
              />
            </div>

            {/* Gráficos de Producción y Proyectos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfico 1: Producción Científica por Tipología */}
              <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <BarChart3 size={15} className="text-emerald-600" /> Producción por Tipología Minciencias
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">Artículos, Software, Prototipos y Libros</p>
                  </div>
                  <Button size="xs" variant="outline" onClick={() => setShowProductosModal(true)}>
                    Gestionar Productos
                  </Button>
                </div>
                <div className="h-64">
                  {stats?.produccion && stats.produccion.some(p => p.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.produccion} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} interval={0} angle={-15} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
                        <ReTooltip
                          contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                          formatter={(value) => [`${value} productos`, 'Cantidad']}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {stats.produccion.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-medium">
                      <Award size={32} className="text-slate-300 mb-2" />
                      Sin productos registrados todavía
                      <Button size="xs" variant="sena" className="mt-3" onClick={handleOpenCreateProducto}>
                        + Registrar Primer Producto
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Gráfico 2: Distribución de Proyectos por Estado */}
              <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <PieChart size={15} className="text-indigo-600" /> Proyectos I+D+i por Estado
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">Ciclo de vida de los proyectos del grupo</p>
                  </div>
                  <Button size="xs" variant="outline" onClick={() => setActiveTab('proyectos')}>
                    Ver Proyectos
                  </Button>
                </div>
                <div className="h-64">
                  {stats?.proyectos_por_estado && stats.proyectos_por_estado.some(p => p.value > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RePie>
                        <Pie
                          data={stats.proyectos_por_estado}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={4}
                        >
                          {stats.proyectos_por_estado.map((_, index) => (
                            <Cell key={`cell-proj-${index}`} fill={['#3B82F6', '#10B981', '#6366F1', '#94A3B8'][index % 4]} />
                          ))}
                        </Pie>
                        <ReTooltip
                          contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                          formatter={(value) => [`${value} proyectos`, 'Total']}
                        />
                      </RePie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs font-medium">
                      <FolderOpen size={32} className="text-slate-300 mb-2" />
                      Sin proyectos registrados
                      <Button size="xs" variant="sena" className="mt-3" onClick={handleOpenCreateProject}>
                        + Crear Primer Proyecto
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-3 mt-2 text-[10px] font-bold text-slate-600">
                  {stats?.proyectos_por_estado?.map((item, idx) => (
                    <span key={item.name} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#3B82F6', '#10B981', '#6366F1', '#94A3B8'][idx % 4] }} />
                      {item.name}: {item.value}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Semilleros por Línea & CvLAC */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Target size={15} className="text-amber-600" /> Semilleros por Línea de Investigación
                </h3>
                {lineas.length > 0 ? (
                  <div className="space-y-3">
                    {lineas.map((linea, i) => {
                      const count = semilleros.filter(s => s.linea_investigacion === linea).length;
                      return (
                        <div 
                          key={i} 
                          onClick={() => handleOpenLineaDetail(linea)}
                          className="bg-white hover:bg-emerald-50/50 p-3.5 rounded-xl border border-slate-200/60 flex items-center justify-between gap-4 cursor-pointer transition-all hover:border-emerald-300 shadow-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-800 truncate">{linea}</p>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                              <div
                                className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (count / Math.max(1, semilleros.length)) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex-shrink-0 flex items-center gap-1">
                            {count} semilleros <ChevronRight size={12} />
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-8 text-center">No hay líneas asignadas.</p>
                )}
              </div>

              <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Shield size={15} className="text-indigo-600" /> Control CvLAC Investigadores
                  </h3>
                  <p className="text-[11px] text-slate-500 mb-5">Estado de las hojas de vida en Scienti Minciencias</p>

                  <div className="space-y-3">
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800">Actualizados</span>
                      <span className="text-sm font-black text-emerald-700">{investigadores.filter(i => (i.estado_cv_lac || '').toLowerCase() === 'actualizado').length}</span>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-800">Por Actualizar</span>
                      <span className="text-sm font-black text-amber-700">{investigadores.filter(i => (i.estado_cv_lac || '').toLowerCase() === 'desactualizado').length}</span>
                    </div>
                    <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Sin CvLAC</span>
                      <span className="text-sm font-black text-slate-600">{investigadores.filter(i => !(i.estado_cv_lac) || (i.estado_cv_lac || '').toLowerCase().includes('sin')).length}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-5 border-t border-slate-200 mt-5">
                  <Button
                    onClick={() => setActiveTab('gruplac')}
                    variant="outline"
                    className="w-full text-xs font-bold"
                  >
                    Ver Directorio Completo CvLAC
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── PESTAÑA 2: Proyectos del Grupo & Avance Institucional ──────── */}
        {activeTab === 'proyectos' && (
          <div className="p-6 sm:p-8 animate-fadeIn space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <FolderOpen size={16} className="text-emerald-600" /> Proyectos de Investigación & Avance Institucional
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Seguimiento del progreso técnico, entregables aprobados y ejecución presupuestal de los proyectos del grupo.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {currentUser?.rol !== 'aprendiz' && (
                  <Button
                    onClick={handleOpenCreateProject}
                    variant="sena"
                    size="sm"
                    className="text-xs font-bold shadow-sm"
                  >
                    <Plus size={15} className="mr-1" /> Nuevo Proyecto
                  </Button>
                )}
                <Button
                  onClick={() => onNavigate?.('proyectos')}
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold border-slate-200"
                >
                  <ArrowUpRight size={14} className="mr-1" /> Módulo Proyectos Completo
                </Button>
              </div>
            </div>

            {/* Banner de Avance Ponderado del Grupo */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
              
              <div className="relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                      Avance Técnico Global del Grupo
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-black mt-0.5">
                      {stats?.avance_promedio || 0}% <span className="text-xs font-normal text-slate-300 opacity-80">promedio ponderado</span>
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                      {stats?.entregables_aprobados || 0} / {stats?.entregables_totales || 0} Entregables Aprobados
                    </Badge>
                    <Badge className="bg-white/10 text-white border-white/20">
                      {proyectosGrupo.length} Proyectos Vinculados
                    </Badge>
                  </div>
                </div>

                <div className="w-full bg-slate-700/60 h-3.5 rounded-full overflow-hidden p-0.5 ring-1 ring-white/10">
                  <div 
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                    style={{ width: `${Math.min(100, Math.max(0, stats?.avance_promedio || 0))}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/10 text-center sm:text-left">
                  <div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase">Presupuesto Asignado</p>
                    <p className="text-sm sm:text-base font-black text-white mt-0.5">
                      ${(stats?.presupuesto_total || proyectosGrupo.reduce((a, p) => a + (Number(p.presupuesto_total) || 0), 0)).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase">Presupuesto Ejecutado</p>
                    <p className="text-sm sm:text-base font-black text-emerald-400 mt-0.5">
                      ${(stats?.presupuesto_ejecutado || 0).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase">En Ejecución</p>
                    <p className="text-sm sm:text-base font-black text-indigo-300 mt-0.5">
                      {proyectosGrupo.filter(p => (p.estado || '').toLowerCase().includes('ejecuc') || p.estado === 'Activo').length} activos
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-300 uppercase">Productos I+D</p>
                    <p className="text-sm sm:text-base font-black text-amber-300 mt-0.5">
                      {stats?.total_productos || productosGrupo.length} categorizados
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de Filtros */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
              <div className="sm:col-span-2 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Buscar proyectos por nombre, código SGPS, semillero o líder..."
                  value={proySearchTerm}
                  onChange={(e) => setProySearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                />
              </div>

              <select
                value={proyStatusFilter}
                onChange={(e) => setProyStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm font-bold text-slate-700 outline-none"
              >
                <option value="todos">Todos los Estados</option>
                <option value="en ejecución">En Ejecución</option>
                <option value="aprobado">Aprobados</option>
                <option value="finalizado">Finalizados</option>
              </select>
            </div>

            {/* Listado de Proyectos Interactivos (Clickeables) */}
            <div className="grid grid-cols-1 gap-4">
              {filteredProyectos.length === 0 ? (
                <div className="p-12 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 text-center">
                  <FolderOpen size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-black text-slate-700">No se encontraron proyectos vinculados</p>
                  <p className="text-xs text-slate-400 mt-1">
                    No hay proyectos que coincidan con los filtros de búsqueda.
                  </p>
                  {currentUser?.rol !== 'aprendiz' && (
                    <Button onClick={handleOpenCreateProject} variant="sena" size="sm" className="mt-4">
                      <Plus size={14} className="mr-1" /> Registrar Primer Proyecto
                    </Button>
                  )}
                </div>
              ) : (
                filteredProyectos.map(p => {
                  const avance = Number(p.avance_porcentaje) || 0;
                  const estadoBadgeColor = 
                    p.estado === 'Finalizado' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                    p.estado === 'En ejecución' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    'bg-blue-50 text-blue-700 border-blue-200';

                  return (
                    <div 
                      key={p.id}
                      onClick={() => handleOpenProjectDetail(p)}
                      className="p-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-400 cursor-pointer transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 group"
                    >
                      <div className="space-y-2.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                            {p.codigo_sgps || 'S/C'}
                          </span>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${estadoBadgeColor}`}>
                            {p.estado || 'Aprobado'}
                          </span>
                          {p.semillero_nombre ? (
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                              <GraduationCap size={11} /> {p.semillero_nombre}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md">
                              Iniciativa Directa del Grupo
                            </span>
                          )}
                          {p.tipologia && (
                            <span className="text-[10px] text-slate-500 font-medium">
                              • {p.tipologia}
                            </span>
                          )}
                        </div>

                        <div>
                          <h4 className="text-base font-black text-slate-900 group-hover:text-emerald-700 transition-colors leading-tight">
                            {p.nombre_corto || p.nombre}
                          </h4>
                          {p.nombre_corto && p.nombre && (
                            <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{p.nombre}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-medium pt-1">
                          {p.owner?.nombre && (
                            <span className="flex items-center gap-1">
                              <Users size={13} className="text-slate-400" /> Líder: <strong className="text-slate-700 font-bold">{p.owner.nombre}</strong>
                            </span>
                          )}
                          <span>
                            Equipo: <strong className="text-slate-700 font-bold">{p.total_equipo || p.equipo?.length || 1} investigadores</strong>
                          </span>
                          <span>
                            Presupuesto: <strong className="text-emerald-700 font-bold">${(p.presupuesto_total || 0).toLocaleString('es-CO')}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progreso y Acciones */}
                      <div className="lg:w-72 flex-shrink-0 bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2.5">
                        <div className="flex justify-between items-center text-xs font-black">
                          <span className="text-slate-500 uppercase text-[10px] tracking-wider">Avance Técnico</span>
                          <span className="text-emerald-700">{avance}%</span>
                        </div>

                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-700 ${
                              avance >= 100 ? 'bg-emerald-500' :
                              avance >= 50 ? 'bg-teal-500' :
                              avance > 0 ? 'bg-amber-500' : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, avance))}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 pt-1">
                          <span>
                            {p.entregables_aprobados || 0} / {p.total_entregables || 0} entregables
                          </span>
                          <span className="text-emerald-700 group-hover:text-emerald-800 font-black flex items-center gap-0.5">
                            Ver detalles & CRUD <ChevronRight size={12} />
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ─── PESTAÑA 3: Semilleros de Investigación ─────────────────── */}
        {activeTab === 'semilleros' && (
          <div className="p-6 sm:p-8 animate-fadeIn space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap size={16} className="text-emerald-600" /> Semilleros de Investigación Adscritos
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Semilleros de formación e investigación formativa vinculados al grupo CGAO.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {currentUser?.rol !== 'aprendiz' && (
                  <Button
                    onClick={handleOpenCreateSemillero}
                    variant="sena"
                    size="sm"
                    className="text-xs font-bold"
                  >
                    <Plus size={14} className="mr-1" /> Nuevo Semillero
                  </Button>
                )}
                <Badge variant="sena" className="font-mono text-xs font-black">
                  {filteredSemilleros.length} de {semilleros.length} semilleros
                </Badge>
              </div>
            </div>

            {/* Buscador y Selector de Línea */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/60">
              <div className="sm:col-span-2 relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, sigla o tutor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <select
                  value={selectedLineaFilter}
                  onChange={(e) => setSelectedLineaFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="todas">Todas las líneas ({lineas.length})</option>
                  {lineas.map((l, i) => (
                    <option key={i} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Grid de Semilleros Clickeables */}
            {filteredSemilleros.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSemilleros.map((sem, idx) => (
                  <div
                    key={sem.id || idx}
                    onClick={() => handleOpenSemilleroDetail(sem)}
                    className="p-5 bg-white border border-slate-200/80 rounded-2xl hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl uppercase tracking-wider font-mono">
                            {sem.sigla || sem.nombre?.substring(0, 8)}
                          </span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${
                            sem.estado === 'activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {sem.estado || 'Activo'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {currentUser?.rol !== 'aprendiz' && (
                            <button
                              onClick={(e) => handleOpenEditSemillero(sem, e)}
                              className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                              title="Editar Semillero"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          <span className="text-[11px] font-mono text-slate-400 font-bold">#{idx + 1}</span>
                        </div>
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug mb-1">
                        {sem.nombre}
                      </h3>

                      {sem.descripcion && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-3">
                          {sem.descripcion}
                        </p>
                      )}

                      {sem.linea_investigacion && (
                        <p className="text-[11px] text-indigo-700 bg-indigo-50/70 border border-indigo-100 px-2.5 py-1 rounded-lg font-semibold inline-block mb-3">
                          📍 {sem.linea_investigacion}
                        </p>
                      )}

                      {(sem.lider_nombre || sem.lider) && (
                        <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mb-4">
                          <Users size={13} className="text-slate-400" /> Líder: <span className="font-bold">{sem.lider_nombre || sem.lider}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                        <span className="text-emerald-700">{sem.total_aprendices || sem.aprendices?.length || 0} aprendices</span>
                        <span>•</span>
                        <span>{sem.horas_dedicadas || 40}h formativas</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-emerald-700 font-black text-xs group-hover:translate-x-0.5 transition-transform">
                        <span>Ver Detalle & CRUD</span>
                        <ChevronRight size={13} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <GraduationCap size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-700">No se encontraron semilleros</p>
                <p className="text-[11px] text-slate-400 mt-1">Prueba con otros términos de búsqueda o selecciona otra línea.</p>
              </div>
            )}
          </div>
        )}

        {/* ─── PESTAÑA 4: Líneas de Investigación ─────────────────────── */}
        {activeTab === 'lineas' && (
          <div className="p-6 sm:p-8 animate-fadeIn space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Target size={16} className="text-emerald-600" /> Líneas de Investigación del Grupo CGAO
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Ejes temáticos declarados y reconocidos institucionalmente para el desarrollo de proyectos I+D+i.
                </p>
              </div>
              {currentUser?.rol === 'admin' && (
                <Button onClick={() => setShowAddLineaModal(true)} size="sm" variant="sena" className="text-xs">
                  <Plus size={13} className="mr-1.5" /> Nueva Línea
                </Button>
              )}
            </div>

            {lineas.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {lineas.map((linea, i) => {
                  const semsInLinea = semilleros.filter(s => s.linea_investigacion === linea);
                  const proysInLinea = proyectosGrupo.filter(p => p.linea_investigacion === linea);
                  return (
                    <div
                      key={i}
                      onClick={() => handleOpenLineaDetail(linea)}
                      className="p-5 bg-white border border-slate-200/80 rounded-2xl hover:border-emerald-400 hover:shadow-md cursor-pointer transition-all flex items-start gap-4 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm">
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors leading-snug">
                          {linea}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-medium mt-1">
                          {semsInLinea.length} {semsInLinea.length === 1 ? 'semillero asociado' : 'semilleros asociados'} • {proysInLinea.length} proyectos
                        </p>
                        <div className="text-[11px] font-bold text-emerald-700 mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                          Ver proyectos y semilleros vinculados <ChevronRight size={12} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Target size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Sin líneas de investigación configuradas</p>
                {currentUser?.rol === 'admin' && (
                  <Button onClick={() => setShowAddLineaModal(true)} size="sm" variant="sena" className="mt-3 text-xs">
                    + Configurar Primera Línea
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── PESTAÑA 5: Información Institucional ───────────────────── */}
        {activeTab === 'info' && (
          <div className="p-6 sm:p-8 space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Building2 size={16} className="text-emerald-600" /> Ficha Institucional del Grupo
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Datos formales registrados en la base de datos de SENNOVA.
                </p>
              </div>
              {currentUser?.rol === 'admin' && (
                <Button onClick={handleEditGrupo} size="sm" variant="sena" className="text-xs">
                  <Edit2 size={14} className="mr-1.5" /> Editar Ficha
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 bg-white rounded-2xl border border-slate-100 p-6">
              <div>
                <InfoRow icon={Layers}    label="Nombre Corto / Sigla" value={grupo?.nombre} />
                <InfoRow icon={FileText}  label="Nombre Institucional Completo" value={grupo?.nombre_completo} />
                <InfoRow icon={Shield}    label="Código GrupLAC" value={grupo?.codigo_gruplac} />
                <InfoRow icon={Award}     label="Clasificación Minciencias" value={grupo?.clasificacion ? `Categoría ${grupo.clasificacion}` : null} />
                <InfoRow icon={Calendar}  label="Convocatoria Minciencias" value={grupo?.convocatoria_activa} />
              </div>
              <div>
                <InfoRow icon={Users}     label="Director(a) del Grupo" value={grupo?.director_nombre} />
                <InfoRow icon={Globe}     label="Correo Electrónico Institucional" value={grupo?.director_email} />
                <InfoRow icon={Star}      label="Semilleros Adscritos" value={`${semilleros.length} semilleros registrados`} />
                <InfoRow icon={Users}     label="Investigadores Vinculados" value={`${investigadores.length} investigadores adscritos`} />
                <InfoRow icon={Calendar}  label="Fecha de Registro" value={grupo?.created_at ? new Date(grupo.created_at).toLocaleDateString('es-CO') : null} />
              </div>
            </div>

            {(grupo?.descripcion_grupo || grupo?.mision || grupo?.vision) && (
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-4">
                {grupo?.descripcion_grupo && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Descripción Institucional</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{grupo.descripcion_grupo}</p>
                  </div>
                )}
                {grupo?.mision && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Misión</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{grupo.mision}</p>
                  </div>
                )}
                {grupo?.vision && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Visión</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{grupo.vision}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── PESTAÑA 6: Plan Operativo & Formatos ──────────────────── */}
        {activeTab === 'plan' && (
          <div className="p-6 sm:p-8 animate-fadeIn space-y-6">
            <div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <FolderOpen size={16} className="text-emerald-600" /> Plan Operativo & Documentación SENNOVA
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Gestión del plan operativo anual y acceso a formatos estándar de investigación formativa.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Plan Operativo del Centro */}
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white hover:border-emerald-300 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
                      <FileText size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Plan Operativo Anual</h3>
                      <p className="text-xs text-slate-500 font-medium">Documento estratégico del grupo de investigación</p>
                    </div>
                  </div>

                  {grupo?.plan_operativo_path ? (
                    <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100 mb-4">
                      <p className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-600" /> Documento vigente cargado
                      </p>
                      <p className="text-[11px] text-emerald-700 font-mono mt-1 truncate">
                        {grupo.plan_operativo_path}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic py-3">No hay documento de plan operativo cargado actualmente.</p>
                  )}
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  {grupo?.plan_operativo_path && (
                    <a
                      href={GruposAPI.downloadPlanOperativoUrl(grupo.id)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Download size={14} /> Descargar Plan Operativo
                    </a>
                  )}

                  {currentUser?.rol === 'admin' && (
                    <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer">
                      {uploadingPlan ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> Subiendo archivo...
                        </>
                      ) : (
                        <>
                          <Upload size={14} /> {grupo?.plan_operativo_path ? 'Reemplazar Plan Operativo' : 'Subir Plan Operativo'}
                        </>
                      )}
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx"
                        onChange={handlePlanUpload}
                        disabled={uploadingPlan}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Formatos Oficiales SENNOVA */}
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-white hover:border-indigo-300 transition-colors flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
                      <BookOpen size={24} />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900">Formatos Oficiales SENNOVA</h3>
                      <p className="text-xs text-slate-500 font-medium">Plantillas oficiales pre-diligenciadas</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    {FORMATOS_OFICIALES.map(f => (
                      <div key={f.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800">{f.nombre}</p>
                          <span className="text-[10px] text-emerald-700 font-mono font-bold">{f.codigo}</span>
                        </div>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleGenerateFormat(f.id, proyectosGrupo[0])}
                          className="text-[11px]"
                        >
                          Generar PDF
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Button
                    onClick={() => onNavigate?.('repositorio')}
                    variant="outline"
                    className="w-full text-xs font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    <BookOpen size={14} className="mr-2" /> Ir al Repositorio Documental Completo
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── PESTAÑA 7: Control GrupLAC & CvLAC ──────────────────────── */}
        {activeTab === 'gruplac' && (
          <div className="p-6 sm:p-8 animate-fadeIn space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <Globe size={16} className="text-emerald-600" /> Monitoreo y Control GrupLAC — Scienti Minciencias
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Seguimiento a la categorización institucional y actualización de las hojas de vida CvLAC del equipo de investigación.
                </p>
              </div>

              {currentUser?.rol === 'admin' && (
                <Button
                  onClick={() => setShowCreateInvestigadorModal(true)}
                  variant="sena"
                  size="sm"
                  className="text-xs font-bold"
                >
                  <UserPlus size={14} className="mr-1" /> Registrar Investigador
                </Button>
              )}
            </div>

            {/* Ficha Minciencias */}
            <div className="p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-indigo-50 rounded-2xl border border-emerald-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-600 text-white rounded-xl shadow-md">
                    <Award size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Reconocimiento Scienti</p>
                    <h3 className="text-lg font-black text-slate-900">
                      {grupo?.clasificacion ? `Categoría ${grupo.clasificacion}` : 'En Proceso de Medición'}
                    </h3>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Código Minciencias: <span className="font-mono font-bold">{grupo?.codigo_gruplac || 'COL000000'}</span>
                    </p>
                  </div>
                </div>

                {grupo?.gruplac_url && (
                  <a
                    href={grupo.gruplac_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-bold shadow-xs transition-all self-start sm:self-auto"
                  >
                    <Globe size={14} /> Abrir GrupLAC Oficial <ArrowUpRight size={14} />
                  </a>
                )}
              </div>
            </div>

            {/* Tabla de Investigadores Clickeables */}
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-slate-600" />
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Directorio de Investigadores del Grupo ({investigadores.length})
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400 font-medium">Haz clic en cualquier investigador para ver perfil y editar CvLAC</span>
              </div>

              <div className="divide-y divide-slate-100">
                {investigadores.length > 0 ? (
                  investigadores.map(inv => {
                    const status = inv.estado_cv_lac || 'Sin CVLAC';
                    const isActualizado = status.toLowerCase() === 'actualizado';
                    const isDesactualizado = status.toLowerCase() === 'desactualizado';
                    return (
                      <div 
                        key={inv.id} 
                        onClick={() => handleOpenInvestigadorDetail(inv)}
                        className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs flex-shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            {inv.nombre?.charAt(0) || 'I'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">{inv.nombre}</p>
                            <p className="text-[11px] text-slate-500 font-medium truncate">{inv.email} • {inv.rol_sennova || inv.rol}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            isActualizado ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            isDesactualizado ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {status}
                          </span>

                          <ChevronRight size={15} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center text-xs text-slate-400 italic">
                    No hay investigadores vinculados.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── DRAWER 1: DETALLE COMPLETO DE PROYECTO & CRUD ────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Drawer
        isOpen={isProjectDrawerOpen && !!selectedProyecto}
        onClose={() => setIsProjectDrawerOpen(false)}
        size="lg"
        variant="emerald"
        title={selectedProyecto?.nombre_corto || selectedProyecto?.nombre}
        subtitle={`Código SGPS: ${selectedProyecto?.codigo_sgps || 'S/C'} • ${selectedProyecto?.tipologia || 'Innovación'}`}
        badge={selectedProyecto && <StatusBadge estado={selectedProyecto.estado || 'Aprobado'} />}
        headerActions={
          selectedProyecto && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowLiquidationModal(true)}
                className="h-8 px-2.5 text-[10px] font-black tracking-wide border-slate-200"
              >
                <ShieldCheck size={13} className="mr-1 text-emerald-600" /> Liquidación
              </Button>
              {currentUser?.rol !== 'aprendiz' && (
                <Button
                  variant="sena"
                  size="sm"
                  onClick={() => handleOpenEditProject(selectedProyecto)}
                  className="h-8 px-2.5 text-[10px] font-black"
                >
                  <Edit2 size={13} className="mr-1" /> Editar
                </Button>
              )}
            </div>
          )
        }
        tabs={[
          { id: 'summary', label: 'Resumen & Presupuesto', icon: DollarSign },
          { id: 'team', label: 'Equipo', icon: Users },
          { id: 'timeline', label: 'Línea de Tiempo', icon: Clock3 },
          { id: 'formats', label: 'Formatos', icon: FileText },
        ]}
        activeTab={projectDrawerTab}
        onTabChange={setProjectDrawerTab}
        footer={
          <div className="flex items-center justify-between w-full">
            {currentUser?.rol === 'admin' ? (
              <Button 
                variant="outline" 
                className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs"
                onClick={() => setShowDeleteProjectConfirm({ isOpen: true, id: selectedProyecto?.id, nombre: selectedProyecto?.nombre })}
              >
                <Trash2 size={14} className="mr-1" /> Eliminar Proyecto
              </Button>
            ) : <div />}
            <Button variant="secondary" onClick={() => setIsProjectDrawerOpen(false)}>
              Cerrar
            </Button>
          </div>
        }
      >
        {selectedProyecto && (
          <div>
            {projectDrawerTab === 'summary' && (
              <div className="space-y-6 animate-fadeIn">
                <section>
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <DollarSign size={13} /> Ejecución Presupuestal por Rubros
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-3">
                      {RUBROS.map(r => {
                        const val = getRubroValue(selectedProyecto, r.id);
                        const pct = selectedProyecto.presupuesto_total > 0
                          ? (val / selectedProyecto.presupuesto_total) * 100
                          : 0;
                        return (
                          <div key={r.id} className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                              <span className="text-slate-600 flex items-center gap-1.5">
                                <r.icon size={11} className={r.color} /> {r.label}
                              </span>
                              <span className="text-slate-900">${val.toLocaleString('es-CO')} ({pct.toFixed(1)}%)</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${r.bg}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center items-center text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Presupuesto Total del Proyecto</p>
                      <p className="text-2xl font-black text-emerald-700 mt-1">
                        ${(selectedProyecto.presupuesto_total || 0).toLocaleString('es-CO')}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Vigencia: {selectedProyecto.vigencia || 12} meses • Año: {selectedProyecto.año || 2026}</p>
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleGenerateFormat('bitacora', selectedProyecto)}
                        >
                          <FileText size={12} className="mr-1" /> Bitácora Técnica
                        </Button>
                        <Button
                          variant="sena"
                          size="xs"
                          onClick={() => PDFGenerator.generateProjectPDF(selectedProyecto, selectedProyecto.equipo || [])}
                        >
                          <Download size={12} className="mr-1" /> Ficha Técnica PDF
                        </Button>
                      </div>
                    </div>
                  </div>
                </section>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Línea de Investigación</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedProyecto.linea_investigacion || 'No definida'}</p>
                  </div>
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Semillero Vinculado</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedProyecto.semillero_nombre || selectedProyecto.semillero?.nombre || 'Iniciativa Directa'}</p>
                  </div>
                </div>

                {selectedProyecto.objetivo_general && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Objetivo General</p>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{selectedProyecto.objetivo_general}</p>
                  </div>
                )}

                {selectedProyecto.descripcion && (
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Descripción Técnica</p>
                    <p className="text-xs text-slate-700 leading-relaxed">{selectedProyecto.descripcion}</p>
                  </div>
                )}
              </div>
            )}

            {projectDrawerTab === 'team' && (
              <ProyectoEquipoTab
                proyecto={selectedProyecto}
                teamMembers={selectedProyecto.equipo || []}
                usuarios={todosUsuarios}
                currentUser={currentUser}
                isOwnerOrAdmin={currentUser?.rol === 'admin' || currentUser?.id === selectedProyecto?.owner_id}
                onAddMember={handleAddProjectTeamMember}
                onRemoveMember={handleRemoveProjectTeamMember}
                onNotify={onNotify}
              />
            )}

            {projectDrawerTab === 'timeline' && (
              <ProjectTimeline entregables={selectedProyecto.entregables || []} />
            )}

            {projectDrawerTab === 'formats' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-1">Formatos Oficiales SENNOVA</h4>
                  <p className="text-xs text-slate-500">Descarga directa de plantillas pre-diligenciadas con los datos del proyecto.</p>
                </div>

                <div className="space-y-2.5">
                  {FORMATOS_OFICIALES.map(f => (
                    <div key={f.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-800">{f.nombre}</p>
                        <span className="text-[10px] font-mono font-bold text-emerald-700">{f.codigo}</span>
                      </div>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => handleGenerateFormat(f.id, selectedProyecto)}
                        disabled={generatingFormatId === f.id}
                      >
                        {generatingFormatId === f.id ? <Loader2 size={12} className="animate-spin" /> : 'Descargar'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── DRAWER 2: DETALLE COMPLETO DE SEMILLERO & CRUD ───────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Drawer
        isOpen={isSemilleroDrawerOpen && !!selectedSemillero}
        onClose={() => setIsSemilleroDrawerOpen(false)}
        size="lg"
        variant="emerald"
        icon={GraduationCap}
        title={selectedSemillero?.nombre}
        subtitle={`Sigla: ${selectedSemillero?.sigla || 'N/A'} • Línea: ${selectedSemillero?.linea_investigacion || 'General'}`}
        badge={
          selectedSemillero && (
            <Badge variant={selectedSemillero.estado === 'activo' ? 'success' : 'default'} className="uppercase text-[10px] font-black">
              {selectedSemillero.estado || 'Activo'}
            </Badge>
          )
        }
        headerActions={
          selectedSemillero && currentUser?.rol !== 'aprendiz' && (
            <Button
              variant="sena"
              size="sm"
              onClick={() => handleOpenEditSemillero(selectedSemillero)}
              className="h-8 px-2.5 text-[10px] font-black"
            >
              <Edit2 size={13} className="mr-1" /> Editar
            </Button>
          )
        }
        tabs={[
          { id: 'summary', label: 'Resumen', icon: Info },
          { id: 'aprendices', label: 'Aprendices Vinculados', icon: Star, count: semilleroAprendices.length || selectedSemillero?.total_aprendices || 0 },
          { id: 'proyectos', label: 'Proyectos Asociados', icon: FolderOpen },
          { id: 'tutores', label: 'Tutores', icon: Users },
        ]}
        activeTab={semilleroDrawerTab}
        onTabChange={setSemilleroDrawerTab}
        footer={
          <div className="flex items-center justify-between w-full">
            {currentUser?.rol === 'admin' ? (
              <Button
                variant="outline"
                className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs"
                onClick={() => setShowDeleteSemilleroConfirm({ isOpen: true, id: selectedSemillero?.id, nombre: selectedSemillero?.nombre })}
              >
                <Trash2 size={14} className="mr-1" /> Eliminar Semillero
              </Button>
            ) : <div />}
            <Button variant="secondary" onClick={() => setIsSemilleroDrawerOpen(false)}>
              Cerrar
            </Button>
          </div>
        }
      >
        {selectedSemillero && (
          <div>
            {semilleroDrawerTab === 'summary' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                  {selectedSemillero.descripcion ? (
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</p>
                      <p className="text-xs text-slate-700 leading-relaxed mt-1">{selectedSemillero.descripcion}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">Sin descripción disponible.</p>
                  )}

                  <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Líder / Tutor Asignado</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selectedSemillero.lider_nombre || selectedSemillero.lider || 'Por asignar'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase">Dedicación Semanal</p>
                      <p className="text-xs font-bold text-emerald-700 mt-0.5">{selectedSemillero.horas_dedicadas || 40} horas</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                    <p className="text-[10px] font-black text-emerald-700 uppercase">Aprendices Activos</p>
                    <p className="text-2xl font-black text-emerald-900 mt-1">{semilleroAprendices.length || selectedSemillero.total_aprendices || 0}</p>
                  </div>
                  <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                    <p className="text-[10px] font-black text-indigo-700 uppercase">Proyectos Vinculados</p>
                    <p className="text-2xl font-black text-indigo-900 mt-1">
                      {proyectosGrupo.filter(p => p.semillero_id === selectedSemillero.id || p.semillero_nombre === selectedSemillero.nombre).length}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {semilleroDrawerTab === 'aprendices' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Aprendices en Formación ({semilleroAprendices.length})
                  </h4>
                  {currentUser?.rol !== 'aprendiz' && (
                    <Button
                      size="xs"
                      variant="sena"
                      onClick={() => setShowVincularAprendizModal(true)}
                    >
                      <UserPlus size={12} className="mr-1" /> Vincular Aprendiz
                    </Button>
                  )}
                </div>

                {semilleroAprendices.length > 0 ? (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                    {semilleroAprendices.map(apr => (
                      <div
                        key={apr.id}
                        onClick={() => handleOpenAprendizDetail(apr)}
                        className="p-3 flex items-center justify-between gap-3 hover:bg-emerald-50/60 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                            {(apr.nombre || 'A').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5 truncate">
                              {apr.nombre}
                              <ChevronRight size={12} className="text-slate-300 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                            </p>
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                              {apr.programa || apr.programa_formacion || 'Programa no especificado'} • Ficha: {apr.ficha || 'S/N'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="success" className="text-[9px] uppercase">
                            {apr.estado || 'Activo'}
                          </Badge>
                          {currentUser?.rol !== 'aprendiz' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowRemoveAprendizConfirm({ isOpen: true, id: apr.id, name: apr.nombre || 'Aprendiz' });
                              }}
                              className="text-slate-300 hover:text-rose-600 p-1.5 transition-colors rounded-md hover:bg-rose-50"
                              title="Desvincular del semillero"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <p className="text-xs text-slate-500">Sin aprendices vinculados a este semillero actualmente.</p>
                    {currentUser?.rol !== 'aprendiz' && (
                      <Button size="xs" variant="sena" className="mt-2" onClick={() => setShowVincularAprendizModal(true)}>
                        + Vincular Primer Aprendiz
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {semilleroDrawerTab === 'proyectos' && (
              <div className="space-y-3 animate-fadeIn">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Proyectos Adscritos al Semillero
                </h4>
                {(() => {
                  const proys = proyectosGrupo.filter(p => p.semillero_id === selectedSemillero.id || p.semillero_nombre === selectedSemillero.nombre);
                  if (proys.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 italic p-6 bg-slate-50 rounded-xl text-center">
                        No hay proyectos asociados a este semillero todavía.
                      </p>
                    );
                  }
                  return proys.map(p => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setIsSemilleroDrawerOpen(false);
                        handleOpenProjectDetail(p);
                      }}
                      className="p-3.5 bg-white border border-slate-200 hover:border-emerald-400 rounded-xl flex items-center justify-between gap-3 cursor-pointer group shadow-xs"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                          {p.nombre_corto || p.nombre}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">SGPS: {p.codigo_sgps || 'S/C'} • {p.estado}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
                    </div>
                  ));
                })()}
              </div>
            )}

            {semilleroDrawerTab === 'tutores' && (
              <div className="space-y-3 animate-fadeIn">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Líderes y Tutores Asignados
                </h4>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs">
                    {selectedSemillero.lider_nombre?.charAt(0) || 'T'}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{selectedSemillero.lider_nombre || selectedSemillero.lider || 'Director(a) del Grupo'}</p>
                    <p className="text-[11px] text-slate-500">Tutor Principal de Semillero</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL 3: DETALLE & CRUD DE LÍNEA DE INVESTIGACIÓN ────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isLineaModalOpen && !!selectedLineaDetail}
        onClose={() => setIsLineaModalOpen(false)}
        size="lg"
        variant="emerald"
        icon={Target}
        title={selectedLineaDetail?.nombre}
        subtitle="Línea Temática de Investigación CGAO"
        footer={
          <div className="flex items-center justify-between w-full">
            {currentUser?.rol === 'admin' ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingLineaOriginal(selectedLineaDetail?.nombre);
                    setEditingLineaNew(selectedLineaDetail?.nombre);
                    setShowEditLineaModal(true);
                  }}
                  className="text-xs"
                >
                  <Edit2 size={13} className="mr-1" /> Renombrar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteLineaConfirm({ isOpen: true, nombre: selectedLineaDetail?.nombre })}
                  className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs"
                >
                  <Trash2 size={13} className="mr-1" /> Eliminar
                </Button>
              </div>
            ) : <div />}
            <Button variant="secondary" onClick={() => setIsLineaModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        }
      >
        {selectedLineaDetail && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                <p className="text-[10px] font-black text-emerald-700 uppercase">Semilleros</p>
                <p className="text-xl font-black text-emerald-900 mt-0.5">{selectedLineaDetail.semilleros.length}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-center">
                <p className="text-[10px] font-black text-indigo-700 uppercase">Proyectos</p>
                <p className="text-xl font-black text-indigo-900 mt-0.5">{selectedLineaDetail.proyectos.length}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-center col-span-2 sm:col-span-1">
                <p className="text-[10px] font-black text-amber-700 uppercase">Presupuesto</p>
                <p className="text-base font-black text-amber-900 mt-0.5">${(selectedLineaDetail.presupuestoTotal || 0).toLocaleString('es-CO')}</p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5">
                Semilleros en esta Línea ({selectedLineaDetail.semilleros.length})
              </h4>
              {selectedLineaDetail.semilleros.length > 0 ? (
                <div className="space-y-2">
                  {selectedLineaDetail.semilleros.map(s => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setIsLineaModalOpen(false);
                        handleOpenSemilleroDetail(s);
                      }}
                      className="p-3 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200/60 flex items-center justify-between cursor-pointer transition-all"
                    >
                      <span className="text-xs font-bold text-slate-800">{s.nombre}</span>
                      <span className="text-[10px] font-black text-emerald-700 font-mono">Ver semillero &gt;</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">Sin semilleros vinculados a esta línea.</p>
              )}
            </div>

            <div>
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2.5">
                Proyectos en esta Línea ({selectedLineaDetail.proyectos.length})
              </h4>
              {selectedLineaDetail.proyectos.length > 0 ? (
                <div className="space-y-2">
                  {selectedLineaDetail.proyectos.map(p => (
                    <div
                      key={p.id}
                      onClick={() => {
                        setIsLineaModalOpen(false);
                        handleOpenProjectDetail(p);
                      }}
                      className="p-3 bg-slate-50 hover:bg-emerald-50 rounded-xl border border-slate-200/60 flex items-center justify-between cursor-pointer transition-all"
                    >
                      <span className="text-xs font-bold text-slate-800">{p.nombre_corto || p.nombre}</span>
                      <span className="text-[10px] font-black text-emerald-700 font-mono">Ver proyecto &gt;</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">Sin proyectos vinculados a esta línea.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL 4: DETALLE & EDICIÓN DE INVESTIGADOR (CvLAC) ─────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={isInvestigadorModalOpen && !!selectedInvestigador}
        onClose={() => setIsInvestigadorModalOpen(false)}
        size="lg"
        variant="emerald"
        icon={Users}
        title={selectedInvestigador?.nombre}
        subtitle={`${selectedInvestigador?.rol_sennova || selectedInvestigador?.rol || 'Investigador'} • ${selectedInvestigador?.email}`}
        footer={
          <div className="flex items-center justify-between w-full">
            {isEditingInvestigador ? (
              <>
                <Button variant="outline" onClick={() => setIsEditingInvestigador(false)}>
                  Cancelar
                </Button>
                <Button variant="sena" onClick={handleSaveInvestigador} disabled={savingInvestigador}>
                  {savingInvestigador ? <Loader2 size={14} className="animate-spin mr-1" /> : 'Guardar Cambios'}
                </Button>
              </>
            ) : (
              <>
                {currentUser?.rol === 'admin' ? (
                  <Button variant="sena" size="sm" onClick={() => setIsEditingInvestigador(true)}>
                    <Edit2 size={13} className="mr-1.5" /> Editar Datos CvLAC
                  </Button>
                ) : <div />}
                <Button variant="secondary" onClick={() => setIsInvestigadorModalOpen(false)}>
                  Cerrar
                </Button>
              </>
            )}
          </div>
        }
      >
        {selectedInvestigador && (
          <div className="space-y-4">
            {isEditingInvestigador ? (
              <div className="space-y-3">
                <Input
                  label="Nombre Completo"
                  value={investigadorFormData.nombre || ''}
                  onChange={(e) => setInvestigadorFormData({ ...investigadorFormData, nombre: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Correo Electrónico"
                    value={investigadorFormData.email || ''}
                    onChange={(e) => setInvestigadorFormData({ ...investigadorFormData, email: e.target.value })}
                  />
                  <Input
                    label="Rol SENNOVA"
                    value={investigadorFormData.rol_sennova || ''}
                    onChange={(e) => setInvestigadorFormData({ ...investigadorFormData, rol_sennova: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Estado CvLAC"
                    options={[
                      { value: 'Actualizado', label: 'Actualizado' },
                      { value: 'Desactualizado', label: 'Desactualizado' },
                      { value: 'Sin CVLAC', label: 'Sin CVLAC' }
                    ]}
                    value={investigadorFormData.estado_cv_lac || 'Actualizado'}
                    onChange={(e) => setInvestigadorFormData({ ...investigadorFormData, estado_cv_lac: e.target.value })}
                  />
                  <Input
                    label="Horas Asignadas Semanales"
                    type="number"
                    value={investigadorFormData.horas_asignadas || ''}
                    onChange={(e) => setInvestigadorFormData({ ...investigadorFormData, horas_asignadas: Number(e.target.value) })}
                  />
                </div>
                <Input
                  label="URL CvLAC Scienti Minciencias"
                  value={investigadorFormData.cv_lac_url || ''}
                  onChange={(e) => setInvestigadorFormData({ ...investigadorFormData, cv_lac_url: e.target.value })}
                  placeholder="https://scienti.minciencias.gov.co/cvlac/..."
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Documento</span>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedInvestigador.documento || 'No registrado'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Teléfono</span>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedInvestigador.telefono || 'No registrado'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Estado CvLAC</span>
                    <p className="font-bold text-emerald-700 mt-0.5">{selectedInvestigador.estado_cv_lac || 'Sin CVLAC'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase">Horas Asignadas</span>
                    <p className="font-bold text-slate-800 mt-0.5">{selectedInvestigador.horas_asignadas || 40}h / semana</p>
                  </div>
                </div>

                {selectedInvestigador.cv_lac_url && (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900">Perfil Scienti Minciencias</span>
                    <a
                      href={selectedInvestigador.cv_lac_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-black text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      Abrir CvLAC <ExternalLink size={13} />
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL 5: DIRECTORIO DE APRENDICES (CRUD) ─────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showAprendicesModal}
        onClose={() => setShowAprendicesModal(false)}
        size="xl"
        variant="emerald"
        icon={GraduationCap}
        title="Directorio de Aprendices Semilleristas"
        subtitle={`Total de aprendices vinculados en el Centro: ${aprendicesGrupo.length}`}
        footer={
          <Button variant="secondary" onClick={() => setShowAprendicesModal(false)}>
            Cerrar Directorio
          </Button>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Buscar aprendiz por nombre, ficha o documento..."
                value={aprendizSearch}
                onChange={(e) => setAprendizSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={aprendizSemilleroFilter}
              onChange={(e) => setAprendizSemilleroFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
            >
              <option value="todos">Todos los Semilleros</option>
              {semilleros.map(s => (
                <option key={s.id} value={s.id}>{s.sigla || s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl bg-white">
            {filteredAprendices.length > 0 ? (
              filteredAprendices.map(a => (
                <div
                  key={a.id}
                  onClick={() => handleOpenAprendizDetail(a)}
                  className="p-3 flex items-center justify-between gap-3 hover:bg-emerald-50/60 cursor-pointer transition-all text-xs group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                      {(a.nombre || 'A').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5 truncate">
                        {a.nombre}
                        <ChevronRight size={12} className="text-slate-300 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        Doc: {a.documento || 'S/N'} • Ficha: <span className="font-mono font-bold">{a.ficha || 'S/N'}</span> • {a.programa_formacion || a.programa || 'Programa no asignado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const sem = semilleros.find(s => s.id === a.semillero_id) || semilleros[0];
                          let certData;
                          if (a.semillero_id && a.id) {
                            try {
                              certData = await PlantillasAPI.getDatosCertificado(a.semillero_id, a.id);
                            } catch {
                              // fallback to loaded object
                            }
                          }
                          if (!certData) {
                            certData = {
                              datos_aprendiz: {
                                nombre: a.nombre_completo || a.nombre,
                                documento: a.documento || 'S/N',
                                ficha: a.ficha || 'S/N',
                                programa: a.programa_formacion || a.programa || 'Formación SENA'
                              },
                              datos_semillero: {
                                nombre: sem?.nombre || 'Semillero CGAO',
                                fecha_ingreso: a.fecha_ingreso || 'Vigencia actual',
                                horas: a.horas_dedicadas || sem?.horas_dedicadas || 80
                              },
                              fecha_emision: new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }),
                              centro: grupo?.nombre_completo || grupo?.nombre || 'Centro de Gestión Agroempresarial y Oriente - CGAO',
                              firmas: [
                                { nombre: sem?.owner?.nombre || grupo?.director_nombre || 'Líder de Semillero', rol: 'Líder de Semillero SENNOVA' },
                                { nombre: 'SUBDIRECTOR DE CENTRO', rol: 'Subdirector(a) CGAO' }
                              ]
                            };
                          }
                          PDFGenerator.generateCertificate(certData);
                          onNotify?.('Certificado generado exitosamente', 'success');
                        } catch (err) {
                          onNotify?.('Error al generar certificado: ' + err.message, 'error');
                        }
                      }}
                      className="text-[10px]"
                    >
                      <FileCheck size={12} className="mr-1" /> Certificado PDF
                    </Button>
                    <Badge variant="success" className="text-[9px] uppercase">
                      {a.estado || 'Activo'}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic p-6 text-center">No hay aprendices que coincidan con la búsqueda.</p>
            )}
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── MODAL 6: CATÁLOGO DE PRODUCTOS I+D (CRUD) ────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showProductosModal}
        onClose={() => setShowProductosModal(false)}
        size="xl"
        variant="emerald"
        icon={Award}
        title="Catálogo de Productos Científicos & Tecnológicos I+D+i"
        subtitle={`Total categorizados: ${productosGrupo.length} productos`}
        footer={
          <div className="flex items-center justify-between w-full">
            {currentUser?.rol !== 'aprendiz' ? (
              <Button variant="sena" size="sm" onClick={handleOpenCreateProducto}>
                <Plus size={13} className="mr-1" /> + Registrar Nuevo Producto
              </Button>
            ) : <div />}
            <Button variant="secondary" onClick={() => setShowProductosModal(false)}>
              Cerrar
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              placeholder="Buscar producto por título, tipología o autor..."
              value={productoSearch}
              onChange={(e) => setProductoSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2.5">
            {filteredProductos.length > 0 ? (
              filteredProductos.map(prod => (
                <div key={prod.id} className="p-3.5 bg-white rounded-xl border border-slate-200 hover:border-emerald-400 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                        {prod.tipologia || 'Artículo Científico'}
                      </span>
                      {prod.categoria_minciencias && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                          Cat. {prod.categoria_minciencias}
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400">{prod.año || 2026}</span>
                    </div>
                    <h5 className="text-xs font-bold text-slate-900 truncate">{prod.titulo}</h5>
                    {prod.autores && <p className="text-[11px] text-slate-500">Autores: {prod.autores}</p>}
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {prod.url_soporte && (
                      <a
                        href={prod.url_soporte}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg"
                        title="Ver soporte digital"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {currentUser?.rol !== 'aprendiz' && (
                      <>
                        <button
                          onClick={() => handleOpenEditProducto(prod)}
                          className="p-1.5 text-slate-400 hover:text-emerald-700 rounded-lg"
                          title="Editar producto"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => setShowDeleteProductoConfirm({ isOpen: true, id: prod.id, titulo: prod.titulo })}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          title="Eliminar producto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 italic p-6 bg-slate-50 rounded-xl text-center">No hay productos registrados con esos filtros.</p>
            )}
          </div>
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── FORM MODAL: PROYECTO (CREAR / EDITAR) ────────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showProjectFormModal}
        onClose={() => setShowProjectFormModal(false)}
        size="lg"
        variant="emerald"
        icon={FolderOpen}
        title={isEditingProject ? 'Editar Proyecto de Investigación' : 'Nuevo Proyecto de Investigación'}
        subtitle="Persistencia directa en la base de datos de SENNOVA"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowProjectFormModal(false)}>
              Cancelar
            </Button>
            <Button variant="sena" onClick={handleSaveProject} disabled={savingProject}>
              {savingProject ? <Loader2 size={15} className="animate-spin mr-1" /> : (isEditingProject ? 'Actualizar Proyecto' : 'Crear Proyecto')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre Completo del Proyecto"
            value={projectFormData.nombre || ''}
            onChange={(e) => setProjectFormData({ ...projectFormData, nombre: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nombre Corto / Sigla"
              value={projectFormData.nombre_corto || ''}
              onChange={(e) => setProjectFormData({ ...projectFormData, nombre_corto: e.target.value })}
            />
            <Input
              label="Código SGPS"
              value={projectFormData.codigo_sgps || ''}
              onChange={(e) => setProjectFormData({ ...projectFormData, codigo_sgps: e.target.value })}
              placeholder="SGPS-XXXX"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Estado"
              options={[
                { value: 'Aprobado', label: 'Aprobado' },
                { value: 'En ejecución', label: 'En ejecución' },
                { value: 'Finalizado', label: 'Finalizado' }
              ]}
              value={projectFormData.estado || 'Aprobado'}
              onChange={(e) => setProjectFormData({ ...projectFormData, estado: e.target.value })}
            />
            <Select
              label="Tipología"
              options={TIPOLOGIAS_PROYECTO}
              value={projectFormData.tipologia || 'Innovación'}
              onChange={(e) => setProjectFormData({ ...projectFormData, tipologia: e.target.value })}
            />
            <Input
              label="Presupuesto Total (COP)"
              type="number"
              value={projectFormData.presupuesto_total || ''}
              onChange={(e) => setProjectFormData({ ...projectFormData, presupuesto_total: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Línea de Investigación"
              options={lineas.map(l => ({ value: l, label: l }))}
              value={projectFormData.linea_investigacion || ''}
              onChange={(e) => setProjectFormData({ ...projectFormData, linea_investigacion: e.target.value })}
            />
            <Select
              label="Semillero Asociado"
              options={[
                { value: '', label: 'Iniciativa Directa del Grupo' },
                ...semilleros.map(s => ({ value: s.id, label: s.nombre }))
              ]}
              value={projectFormData.semillero_id || ''}
              onChange={(e) => setProjectFormData({ ...projectFormData, semillero_id: e.target.value })}
            />
          </div>

          <TextArea
            label="Objetivo General"
            value={projectFormData.objetivo_general || ''}
            onChange={(e) => setProjectFormData({ ...projectFormData, objetivo_general: e.target.value })}
            rows={2}
          />

          <TextArea
            label="Descripción / Resumen Ejecutivo"
            value={projectFormData.descripcion || ''}
            onChange={(e) => setProjectFormData({ ...projectFormData, descripcion: e.target.value })}
            rows={2}
          />
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── FORM MODAL: SEMILLERO (CREAR / EDITAR) ───────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showSemilleroFormModal}
        onClose={() => setShowSemilleroFormModal(false)}
        size="lg"
        variant="emerald"
        icon={GraduationCap}
        title={isEditingSemillero ? 'Editar Semillero' : 'Nuevo Semillero de Investigación'}
        subtitle="Gestión formativa y vinculación de aprendices"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowSemilleroFormModal(false)}>
              Cancelar
            </Button>
            <Button variant="sena" onClick={handleSaveSemillero} disabled={savingSemillero}>
              {savingSemillero ? <Loader2 size={15} className="animate-spin mr-1" /> : (isEditingSemillero ? 'Actualizar Semillero' : 'Crear Semillero')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre del Semillero"
            value={semilleroFormData.nombre || ''}
            onChange={(e) => setSemilleroFormData({ ...semilleroFormData, nombre: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Sigla o Acrónimo"
              value={semilleroFormData.sigla || ''}
              onChange={(e) => setSemilleroFormData({ ...semilleroFormData, sigla: e.target.value })}
            />
            <Input
              label="Código Interno"
              value={semilleroFormData.codigo || ''}
              onChange={(e) => setSemilleroFormData({ ...semilleroFormData, codigo: e.target.value })}
              placeholder="SEM-2026-01"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Línea de Investigación"
              options={lineas.map(l => ({ value: l, label: l }))}
              value={semilleroFormData.linea_investigacion || ''}
              onChange={(e) => setSemilleroFormData({ ...semilleroFormData, linea_investigacion: e.target.value })}
            />
            <Select
              label="Líder / Tutor"
              options={[
                { value: '', label: 'Seleccionar tutor' },
                ...investigadores.map(i => ({ value: i.nombre, label: i.nombre }))
              ]}
              value={semilleroFormData.lider_nombre || semilleroFormData.lider || ''}
              onChange={(e) => setSemilleroFormData({ ...semilleroFormData, lider_nombre: e.target.value, lider: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Horas Formativas Semanales"
              type="number"
              value={semilleroFormData.horas_dedicadas || ''}
              onChange={(e) => setSemilleroFormData({ ...semilleroFormData, horas_dedicadas: e.target.value })}
            />
            <Select
              label="Estado"
              options={[
                { value: 'activo', label: 'Activo' },
                { value: 'inactivo', label: 'Inactivo' }
              ]}
              value={semilleroFormData.estado || 'activo'}
              onChange={(e) => setSemilleroFormData({ ...semilleroFormData, estado: e.target.value })}
            />
          </div>

          <TextArea
            label="Descripción del Semillero"
            value={semilleroFormData.descripcion || ''}
            onChange={(e) => setSemilleroFormData({ ...semilleroFormData, descripcion: e.target.value })}
            rows={3}
          />
        </div>
      </Modal>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ─── FORM MODAL: PRODUCTO I+D (CREAR / EDITAR) ────────────────────── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={showProductoFormModal}
        onClose={() => setShowProductoFormModal(false)}
        size="lg"
        variant="emerald"
        icon={Award}
        title={isEditingProducto ? 'Editar Producto I+D' : 'Registrar Producto de Investigación'}
        subtitle="Categorización Scienti Minciencias"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowProductoFormModal(false)}>
              Cancelar
            </Button>
            <Button variant="sena" onClick={handleSaveProducto} disabled={savingProducto}>
              {savingProducto ? <Loader2 size={15} className="animate-spin mr-1" /> : (isEditingProducto ? 'Actualizar Producto' : 'Registrar Producto')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Título del Producto"
            value={productoFormData.titulo || ''}
            onChange={(e) => setProductoFormData({ ...productoFormData, titulo: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipología"
              options={TIPOLOGIAS_PRODUCTO}
              value={productoFormData.tipologia || 'Artículo Científico'}
              onChange={(e) => setProductoFormData({ ...productoFormData, tipologia: e.target.value })}
            />
            <Select
              label="Categoría Minciencias"
              options={[
                { value: 'A1', label: 'Categoría A1' },
                { value: 'A',  label: 'Categoría A' },
                { value: 'B',  label: 'Categoría B' },
                { value: 'C',  label: 'Categoría C' },
                { value: 'Reconocido', label: 'Reconocido' }
              ]}
              value={productoFormData.categoria_minciencias || 'A'}
              onChange={(e) => setProductoFormData({ ...productoFormData, categoria_minciencias: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Proyecto Asociado"
              options={[
                { value: '', label: 'Sin proyecto asociado' },
                ...proyectosGrupo.map(p => ({ value: p.id, label: p.nombre_corto || p.nombre }))
              ]}
              value={productoFormData.proyecto_id || ''}
              onChange={(e) => setProductoFormData({ ...productoFormData, proyecto_id: e.target.value })}
            />
            <Input
              label="Año de Publicación"
              type="number"
              value={productoFormData.año || ''}
              onChange={(e) => setProductoFormData({ ...productoFormData, año: e.target.value })}
            />
          </div>

          <Input
            label="Autores (separados por coma)"
            value={productoFormData.autores || ''}
            onChange={(e) => setProductoFormData({ ...productoFormData, autores: e.target.value })}
            placeholder="Ej: Marta Rodríguez, Carlos Gómez..."
          />

          <Input
            label="URL de Soporte / DOI / Repositorio"
            value={productoFormData.url_soporte || ''}
            onChange={(e) => setProductoFormData({ ...productoFormData, url_soporte: e.target.value })}
            placeholder="https://doi.org/... o enlace al repositorio"
          />
        </div>
      </Modal>

      {/* ── Modal: Vincular Aprendiz a Semillero ── */}
      <Modal
        isOpen={showVincularAprendizModal}
        onClose={() => setShowVincularAprendizModal(false)}
        size="md"
        variant="emerald"
        icon={UserPlus}
        title="Vincular Aprendiz al Semillero"
        subtitle={`Asignación para ${selectedSemillero?.nombre}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowVincularAprendizModal(false)}>
              Cancelar
            </Button>
            <Button variant="sena" onClick={handleLinkAprendizToSemillero} disabled={!selectedAprendizIdToLink}>
              Confirmar Vinculación
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Seleccione un Aprendiz del Centro"
            options={[
              { value: '', label: 'Seleccionar aprendiz...' },
              ...aprendicesGrupo.map(a => ({
                value: a.id,
                label: `${a.nombre} (Ficha: ${a.ficha || 'S/N'} - ${a.programa_formacion || a.programa || 'Programa'})`
              }))
            ]}
            value={selectedAprendizIdToLink}
            onChange={(e) => setSelectedAprendizIdToLink(e.target.value)}
          />
        </div>
      </Modal>

      {/* ── Modal: Agregar Nueva Línea de Investigación ── */}
      <Modal
        isOpen={showAddLineaModal}
        onClose={() => setShowAddLineaModal(false)}
        size="md"
        variant="emerald"
        icon={Target}
        title="Nueva Línea de Investigación"
        subtitle="Añadir eje temático al grupo CGAO"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddLineaModal(false)}>
              Cancelar
            </Button>
            <Button variant="sena" onClick={handleAddLinea} disabled={!newLineaInput.trim()}>
              Agregar Línea
            </Button>
          </>
        }
      >
        <Input
          label="Nombre de la Línea de Investigación"
          value={newLineaInput}
          onChange={(e) => setNewLineaInput(e.target.value)}
          placeholder="Ej: Biotecnología y Bioinsumos Agropecuarios"
          required
        />
      </Modal>

      {/* ── Modal: Editar Línea de Investigación ── */}
      <Modal
        isOpen={showEditLineaModal}
        onClose={() => setShowEditLineaModal(false)}
        size="md"
        variant="emerald"
        icon={Edit2}
        title="Renombrar Línea de Investigación"
        subtitle={`Original: ${editingLineaOriginal}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowEditLineaModal(false)}>
              Cancelar
            </Button>
            <Button variant="sena" onClick={handleSaveEditLinea} disabled={!editingLineaNew.trim()}>
              Guardar Cambios
            </Button>
          </>
        }
      >
        <Input
          label="Nuevo Nombre de la Línea"
          value={editingLineaNew}
          onChange={(e) => setEditingLineaNew(e.target.value)}
          required
        />
      </Modal>

      {/* ── Modal: Registrar Investigador ── */}
      <Modal
        isOpen={showCreateInvestigadorModal}
        onClose={() => setShowCreateInvestigadorModal(false)}
        size="md"
        variant="emerald"
        icon={UserPlus}
        title="Registrar Nuevo Investigador"
        subtitle="Incorporación al equipo del grupo CGAO"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreateInvestigadorModal(false)}>
              Cancelar
            </Button>
            <Button variant="sena" onClick={handleCreateInvestigador} disabled={!newInvestigadorData.nombre || !newInvestigadorData.email}>
              Registrar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Nombre Completo"
            value={newInvestigadorData.nombre}
            onChange={(e) => setNewInvestigadorData({ ...newInvestigadorData, nombre: e.target.value })}
            required
          />
          <Input
            label="Correo Electrónico"
            type="email"
            value={newInvestigadorData.email}
            onChange={(e) => setNewInvestigadorData({ ...newInvestigadorData, email: e.target.value })}
            required
          />
          <Input
            label="Rol SENNOVA"
            value={newInvestigadorData.rol_sennova}
            onChange={(e) => setNewInvestigadorData({ ...newInvestigadorData, rol_sennova: e.target.value })}
          />
        </div>
      </Modal>

      {/* ── Modal: Editar Perfil Institucional del Grupo ── */}
      <Modal
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        size="lg"
        variant="emerald"
        icon={Edit2}
        title="Editar Perfil Institucional del Grupo"
        subtitle="Actualización de datos maestros en base de datos"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowEditForm(false)}>
              Cancelar
            </Button>
            <Button variant="sena" onClick={handleSaveGrupo} disabled={savingGrupo}>
              {savingGrupo ? <Loader2 size={16} className="mr-2 animate-spin" /> : 'Guardar Cambios'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Sigla o Nombre Corto" value={formData.nombre || ''} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />
            <Input label="Código GrupLAC (Scienti)" value={formData.codigo_gruplac || ''} onChange={(e) => setFormData({ ...formData, codigo_gruplac: e.target.value })} placeholder="COL000XXXX" />
          </div>

          <Input label="Nombre Institucional Completo" value={formData.nombre_completo || ''} onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Director(a) del Grupo" value={formData.director_nombre || ''} onChange={(e) => setFormData({ ...formData, director_nombre: e.target.value })} />
            <Input label="Email Institucional Director" value={formData.director_email || ''} onChange={(e) => setFormData({ ...formData, director_email: e.target.value })} type="email" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Clasificación Minciencias" options={CLASIFICACIONES} value={formData.clasificacion || ''} onChange={(e) => setFormData({ ...formData, clasificacion: e.target.value })} />
            <Input label="Convocatoria Minciencias" value={formData.convocatoria_activa || ''} onChange={(e) => setFormData({ ...formData, convocatoria_activa: e.target.value })} />
          </div>

          <Input label="URL GrupLAC (Scienti Minciencias)" value={formData.gruplac_url || ''} onChange={(e) => setFormData({ ...formData, gruplac_url: e.target.value })} />

          <TextArea
            label="Líneas de Investigación (separadas por coma)"
            value={formData.lineas_investigacion || ''}
            onChange={(e) => setFormData({ ...formData, lineas_investigacion: e.target.value })}
            rows={3}
          />

          <TextArea label="Descripción del Grupo" value={formData.descripcion_grupo || ''} onChange={(e) => setFormData({ ...formData, descripcion_grupo: e.target.value })} rows={2} />
          <TextArea label="Misión Institucional" value={formData.mision || ''} onChange={(e) => setFormData({ ...formData, mision: e.target.value })} rows={2} />
          <TextArea label="Visión Institucional" value={formData.vision || ''} onChange={(e) => setFormData({ ...formData, vision: e.target.value })} rows={2} />
        </div>
      </Modal>

      {/* ── Dialogs de Confirmación de Eliminación ── */}
      <ConfirmDialog
        isOpen={showDeleteProjectConfirm.isOpen}
        onClose={() => setShowDeleteProjectConfirm({ isOpen: false, id: null, nombre: '' })}
        onConfirm={handleDeleteProject}
        title="¿Eliminar Proyecto de Investigación?"
        description={`¿Estás seguro de eliminar "${showDeleteProjectConfirm.nombre}"? Se removerán sus entregables y presupuesto asociado.`}
        confirmText="Eliminar Proyecto"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showDeleteSemilleroConfirm.isOpen}
        onClose={() => setShowDeleteSemilleroConfirm({ isOpen: false, id: null, nombre: '' })}
        onConfirm={handleDeleteSemillero}
        title="¿Eliminar Semillero de Investigación?"
        description={`¿Estás seguro de eliminar el semillero "${showDeleteSemilleroConfirm.nombre}"?`}
        confirmText="Eliminar Semillero"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showRemoveAprendizConfirm.isOpen}
        onClose={() => setShowRemoveAprendizConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={async () => { if (!showRemoveAprendizConfirm.id) return; await handleRemoveAprendizFromSemillero(showRemoveAprendizConfirm.id); setShowRemoveAprendizConfirm({ isOpen: false, id: null, name: '' }); }}
        title="¿Desvincular Aprendiz del Semillero?"
        description={`¿Estás seguro de desvincular a "${showRemoveAprendizConfirm.name}" del semillero? Esta acción no elimina su cuenta.`}
        confirmText="Desvincular"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showDeleteProductoConfirm.isOpen}
        onClose={() => setShowDeleteProductoConfirm({ isOpen: false, id: null, titulo: '' })}
        onConfirm={handleDeleteProducto}
        title="¿Eliminar Producto I+D?"
        description={`¿Estás seguro de eliminar "${showDeleteProductoConfirm.titulo}"?`}
        confirmText="Eliminar Producto"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={showDeleteLineaConfirm.isOpen}
        onClose={() => setShowDeleteLineaConfirm({ isOpen: false, nombre: '' })}
        onConfirm={handleDeleteLinea}
        title="¿Eliminar Línea de Investigación?"
        description={`¿Estás seguro de remover la línea "${showDeleteLineaConfirm.nombre}" del grupo CGAO?`}
        confirmText="Eliminar Línea"
        variant="danger"
      />

      <UserInsightPanel
        user={selectedUserInsight}
        isOpen={showUserInsight}
        onClose={() => setShowUserInsight(false)}
        onNotify={onNotify}
      />
    </div>
  );
};

export default GrupoModule;
