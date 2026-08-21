import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, Plus, Search, Filter, 
  Users, BookOpen, Clock, ChevronRight,
  UserPlus, Trash2, Edit, ExternalLink, Layers,
  X, Info, Target, ArrowUpRight, Loader2,
  TrendingUp, BarChart3, PieChart, Download,
  CheckCircle2, AlertCircle, Award, Shield,
  Mail, FileText, MapPin
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart as RePie, Pie 
} from 'recharts';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import Drawer from '../ui/Drawer';
import ConfirmDialog from '../ui/ConfirmDialog';
import SemilleroCard, { ESTADOS } from './SemilleroCard';
import { SemillerosAPI } from '../../api/semilleros';
import { GruposAPI } from '../../api/grupos';
import { UsuariosAPI } from '../../api/usuarios';
import { ProyectosAPI } from '../../api/proyectos';
import { PlantillasAPI } from '../../api/plantillas';
import { PDFGenerator } from '../../utils/pdfGenerator';
import UserInsightPanel from '../users/UserInsightPanel';
import useClickOutside from '../../hooks/useClickOutside';

const ROLES_SEMILLERO = [
  { value: 'Investigador Principal', label: 'Investigador Principal' },
  { value: 'Coinvestigador', label: 'Coinvestigador' },
  { value: 'Tutor', label: 'Tutor de Semillero' },
  { value: 'Mentor', label: 'Mentor Externo' }
];

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

const EMPTY_FORM = {
  nombre: '',
  sigla: '',
  codigo: '',
  linea_investigacion: '',
  grupo_id: '',
  descripcion: '',
  estado: 'activo',
  horas_dedicadas: 0,
  is_publico: true
};

const StatCard = ({ label, value, icon: Icon, colorCls, bgCls }) => (
  <Card className="p-5 border border-slate-200 shadow-sm overflow-hidden relative group transition-all hover:shadow-md bg-white">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 ${bgCls}`} />
    <div className="flex items-center gap-4 relative">
      <div className={`p-3 rounded-2xl ${bgCls} ${colorCls} shadow-sm`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">{label}</p>
        <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
      </div>
    </div>
  </Card>
);

const SemillerosModule = ({ currentUser, onNotify }) => {
  const [semilleros, setSemilleros] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [lineaFilter, setLineaFilter] = useState('');
  
  // Modales & Stack State
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedSemillero, setSelectedSemillero] = useState(null);
  const [semilleroStats, setSemilleroStats] = useState(null);
  const [aprendices,       setAprendices]       = useState([]);
  const [investigadores,   setInvestigadores]   = useState([]);
  const [usuarios,         setUsuarios]         = useState([]);
  const [proyectos,        setProyectos]        = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  const [dragOverSemilleroId, setDragOverSemilleroId] = useState(null);
  const [isGroupPoolVisible, setIsGroupPoolVisible] = useState(false);

  // Tabs & Detail Drawer
  const [activeTab, setActiveTab] = useState('info');
  const [dragOver, setDragOver] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedUserInsight, setSelectedUserInsight] = useState(null);
  const [showUserInsight, setShowUserInsight] = useState(false);

  // Confirm Dialog
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });
  const [removeConfirm, setRemoveConfirm] = useState(null);

  const loadData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [s, g, u, p] = await Promise.all([
        SemillerosAPI.list(), 
        GruposAPI.list(),
        UsuariosAPI.list(),
        ProyectosAPI.list()
      ]);
      setSemilleros(s || []);
      setGrupos(g || []);
      setUsuarios(u || []);
      setProyectos(p || []);

      // Keep selectedSemillero in sync with latest data
      setSelectedSemillero(prev => {
        if (!prev) return null;
        const updated = (s || []).find(item => item.id === prev.id);
        return updated ? { ...prev, ...updated } : prev;
      });
    } catch (err) {
      onNotify?.('Error al cargar datos', 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => { loadData(true); }, []);

  const handleOpenCreate = () => {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleOpenEdit = (s) => {
    setFormData({ 
      ...s, 
      sigla: s.sigla || s.codigo || '',
      codigo: s.sigla || s.codigo || '',
      grupo_id: s.grupo_id || s.grupo?.id || '' 
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirm.id) return;
    try {
      await SemillerosAPI.delete(deleteConfirm.id);
      onNotify?.('Semillero eliminado', 'success');
      setDeleteConfirm({ isOpen: false, id: null });
      if (selectedSemillero?.id === deleteConfirm.id) {
        setDetailOpen(false);
      }
      loadData();
    } catch {
      onNotify?.('Error al eliminar', 'error');
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        sigla: formData.sigla || formData.codigo || '',
        horas_dedicadas: Number(formData.horas_dedicadas) || 0,
        grupo_id: formData.grupo_id || undefined,
      };
      if (isEditing) {
        await SemillerosAPI.update(formData.id, payload);
        onNotify?.('Semillero actualizado', 'success');
        if (selectedSemillero?.id === formData.id) {
          setSelectedSemillero(prev => ({ ...prev, ...payload }));
        }
      } else {
        await SemillerosAPI.create(payload);
        onNotify?.('Semillero creado con éxito', 'success');
      }
      setShowForm(false);
      await loadData(false);
    } catch (err) {
      onNotify?.('Error al guardar semillero', 'error');
    }
  };

  const handleDownloadFormato = (tipo) => {
    if (!selectedSemillero) return;
    try {
      if (tipo === 'bitacora') {
        PDFGenerator.generateSeguimiento({
          nombre_corto: selectedSemillero.nombre,
          codigo_sgps: selectedSemillero.sigla || selectedSemillero.codigo || 'S-2026',
          entregables: []
        });
        onNotify?.('Formato de bitácora generado', 'success');
      } else if (tipo === 'etapa_productiva') {
        PDFGenerator.generateEtapaProductiva({
          nombre: selectedSemillero.nombre,
          codigo_sgps: selectedSemillero.sigla || selectedSemillero.codigo || 'S-2026',
          tipologia: `Semillero - ${selectedSemillero.linea_investigacion || 'CGAO'}`,
          vigencia: 12,
          presupuesto_total: 0,
          equipo: investigadores
        });
        onNotify?.('Formato de etapa productiva generado', 'success');
      } else if (tipo === 'informe_final') {
        PDFGenerator.generateInformeFinal({
          nombre: selectedSemillero.nombre,
          codigo_sgps: selectedSemillero.sigla || selectedSemillero.codigo || 'S-2026',
          total_productos: semilleroStats?.impacto?.reduce((a, b) => a + (b.value || 0), 0) || 0,
          presupuesto_total: 0,
          entregables: []
        });
        onNotify?.('Informe final generado', 'success');
      }
    } catch {
      onNotify?.('Error al generar formato', 'error');
    }
  };

  const handleOpenDetail = async (s) => {
    setSelectedSemillero(s);
    setDetailOpen(true);
    setActiveTab('info');
    setLoadingStats(true);
    try {
      const [stats, mems, semData] = await Promise.all([
        SemillerosAPI.getStats(s.id).catch(() => null),
        SemillerosAPI.listAprendices(s.id).catch(() => []),
        SemillerosAPI.get(s.id).catch(() => ({}))
      ]);
      setSemilleroStats(stats);
      setAprendices(mems || []);
      setInvestigadores(semData?.investigadores || []);
      if (semData && semData.id) {
        setSelectedSemillero(prev => ({ ...prev, ...semData }));
      }
    } catch {
      setSemilleroStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadSemilleroMembers = async (semilleroId) => {
    try {
      const [data, semData] = await Promise.all([
        SemillerosAPI.listAprendices(semilleroId).catch(() => []),
        SemillerosAPI.get(semilleroId).catch(() => null)
      ]);
      setAprendices(data || []);
      if (semData && semData.investigadores) {
        setInvestigadores(semData.investigadores || []);
      }
      if (semData && semData.id) {
        setSelectedSemillero(prev => prev && prev.id === semData.id ? { ...prev, ...semData } : prev);
      }
    } catch {
      onNotify?.('Error al cargar integrantes', 'error');
    }
  };

  const handleOpenAprendices = async (s) => {
    setSelectedSemillero(s);
    setDetailOpen(true);
    setActiveTab('aprendices');
    await loadSemilleroMembers(s.id);
  };

  const handleOpenInvestigadores = async (s) => {
    setSelectedSemillero(s);
    setDetailOpen(true);
    setActiveTab('investigadores');
    await loadSemilleroMembers(s.id);
  };

  const handleGenerateCertificate = async (aprendiz) => {
    try {
      const data = await PlantillasAPI.getDatosCertificado(selectedSemillero.id, aprendiz.id);
      PDFGenerator.generateCertificate(data);
      onNotify?.('Certificado generado y descargado', 'success');
    } catch {
      onNotify?.('Error al generar certificado PDF', 'error');
    }
  };

  const handleRemoveAprendiz = async (aprendizId) => {
    try {
      await SemillerosAPI.deleteAprendiz(selectedSemillero.id, aprendizId);
      onNotify?.('Aprendiz desvinculado', 'success');
      await loadSemilleroMembers(selectedSemillero.id);
      await loadData(false);
    } catch {
      onNotify?.('Error al desvincular', 'error');
    }
  };

  const handleRemoveInvestigador = async (userId) => {
    try {
      await SemillerosAPI.removeInvestigador(selectedSemillero.id, userId);
      onNotify?.('Investigador desvinculado', 'success');
      await loadSemilleroMembers(selectedSemillero.id);
      await loadData(false);
    } catch (err) {
      onNotify?.('Error al desvincular investigador: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  const handleOpenAprendizDetail = async (apr) => {
    if (!apr) return;
    const targetUserId = apr.user_id || apr.id;

    let userObj = (usuarios || []).find(u => u.id === targetUserId || u.id === apr.user_id || u.id === apr.id);
    if (!userObj && targetUserId) {
      try {
        userObj = await UsuariosAPI.get(targetUserId);
      } catch {
        // Fallback
      }
    }

    const finalUser = {
      ...(userObj || {}),
      ...apr,
      id: targetUserId,
      nombre: apr.nombre || apr.nombre_completo || userObj?.nombre || 'Aprendiz',
      email: apr.email || userObj?.email || `${(apr.nombre || 'aprendiz').toLowerCase().replace(/[^a-z0-9]/g, '.')}@soy.sena.edu.co`,
      rol: apr.rol || 'aprendiz',
      rol_sennova: apr.rol_sennova || userObj?.rol_sennova || (apr.rol === 'investigador' ? 'Investigador' : 'Aprendiz Investigador'),
      ficha: apr.ficha || userObj?.ficha || '',
      programa_formacion: apr.programa || apr.programa_formacion || userObj?.programa_formacion || 'Programa no especificado',
      documento: apr.documento || userObj?.documento || '',
      celular: apr.celular || userObj?.celular || '',
      sede: apr.sede || userObj?.sede || 'Centro de Gestión Agroempresarial del Oriente',
      regional: apr.regional || userObj?.regional || 'Santander',
      is_active: apr.estado !== 'inactivo' && apr.estado !== 'Retirado' && userObj?.is_active !== false,
      cv_lac_url: apr.cv_lac_url || userObj?.cv_lac_url || '',
      nivel_academico: apr.nivel_academico || userObj?.nivel_academico || (apr.rol === 'investigador' ? 'Profesional' : 'Técnico / Tecnólogo')
    };

    setSelectedUserInsight(finalUser);
    setShowUserInsight(true);
  };

  const handleDrop = async (e, semillero) => {
    e.preventDefault();
    setDragOverSemilleroId(null);
    setDragOver(false);
    
    const userId = e.dataTransfer.getData('userId');
    const grupoId = e.dataTransfer.getData('grupoId');

    if (grupoId && semillero) {
      try {
        await SemillerosAPI.update(semillero.id, { ...semillero, grupo_id: grupoId });
        onNotify?.('Grupo vinculado al semillero', 'success');
        await loadData(false);
      } catch (err) {
        onNotify?.('Error al vincular grupo', 'error');
      }
      return;
    }

    if (!userId || !selectedSemillero) return;
    
    try {
      if (activeTab === 'aprendices') {
        await SemillerosAPI.addAprendiz(selectedSemillero.id, {
          user_id: userId,
          semillero_id: selectedSemillero.id,
          estado: 'activo'
        });
        onNotify?.('Aprendiz vinculado exitosamente', 'success');
      } else {
        await SemillerosAPI.addInvestigador(selectedSemillero.id, {
          user_id: userId,
          rol_en_semillero: 'Coinvestigador'
        });
        onNotify?.('Investigador vinculado exitosamente', 'success');
      }
      
      await loadSemilleroMembers(selectedSemillero.id);
      await loadData(false);
    } catch (err) {
      onNotify?.('Error al vincular: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  const lineasDisponibles = [...new Set((semilleros || [])
    .map(s => s.linea_investigacion)
    .filter(Boolean)
  )].sort();

  const filtered = (semilleros || []).filter(s => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (s.nombre || '').toLowerCase().includes(term) ||
      (s.sigla || '').toLowerCase().includes(term) ||
      (s.lider_nombre || '').toLowerCase().includes(term) ||
      (s.linea_investigacion || '').toLowerCase().includes(term) ||
      (s.grupo_nombre || s.grupo?.nombre || '').toLowerCase().includes(term);
    const matchesEstado = !estadoFilter || (s.estado || 'activo') === estadoFilter;
    const matchesLinea = !lineaFilter || (s.linea_investigacion || '') === lineaFilter;
    return matchesSearch && matchesEstado && matchesLinea;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setEstadoFilter('');
    setLineaFilter('');
  };

  const getDisplayStats = () => {
    if (semilleroStats) return semilleroStats;
    return {
      impacto: [
        { name: 'Publicaciones', value: 0 },
        { name: 'Eventos', value: 0 },
        { name: 'Proyectos', value: 0 },
        { name: 'Talleres', value: 0 }
      ],
      evolucion: [
        { mes: 'N/A', aprendices: 0 }
      ]
    };
  };

  const DRAWER_TABS = [
    { id: 'info', label: 'Información', icon: Info },
    { id: 'stats', label: 'Impacto', icon: BarChart3 },
    { id: 'investigadores', label: 'Investigadores', icon: Shield, count: investigadores.length },
    { id: 'aprendices', label: 'Aprendices', icon: GraduationCap, count: aprendices.length },
    { id: 'proyectos', label: 'Proyectos', icon: Target, count: proyectos.filter(p => p.semillero_id === selectedSemillero?.id).length },
    { id: 'formatos', label: 'Formatos', icon: FileText }
  ];

  if (loading && semilleros.length === 0) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-40 bg-slate-100 rounded-3xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-slate-100 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      
      {/* ── Header ── */}
      <div className="bg-white/40 backdrop-blur-md p-8 rounded-3xl border border-white shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex gap-5 items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
              <GraduationCap size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Semilleros de Investigación</h1>
              <p className="text-slate-500 font-medium mt-1">Dinamizando el relevo generacional de la ciencia CGAO.</p>
            </div>
          </div>
          {currentUser?.rol !== 'aprendiz' && (
            <div className="flex gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                className={`text-[10px] font-black uppercase tracking-widest ${isGroupPoolVisible ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}
                onClick={() => setIsGroupPoolVisible(!isGroupPoolVisible)}
              >
                <Layers size={14} className="mr-1.5" /> Pool Grupos
              </Button>
              <Button onClick={handleOpenCreate} variant="sena" className="h-12 px-8 shadow-xl shadow-emerald-500/30">
                <Plus size={20} className="mr-2" /> Crear Semillero
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ── Grupos Pool ── */}
      {isGroupPoolVisible && (
        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center gap-2">
              <Layers size={14} /> Grupos de Investigación Disponibles
            </p>
            <span className="text-[9px] text-indigo-600 font-bold uppercase italic">Arrastra un grupo hacia un semillero para vincularlo</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {grupos.map(g => (
              <div 
                key={g.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('grupoId', g.id)}
                className="flex-shrink-0 px-4 py-2 bg-white border border-indigo-200 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-400 transition-all flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-xs font-bold text-slate-700">{g.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Global Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Semilleros Activos" value={semilleros.length} icon={BookOpen} colorCls="text-emerald-700" bgCls="bg-emerald-100" />
        <StatCard label="Aprendices Vinculados" value={semilleros.reduce((a, b) => a + (b.total_aprendices || 0), 0)} icon={Users} colorCls="text-indigo-700" bgCls="bg-indigo-100" />
        <StatCard label="Horas de Formación" value={semilleros.reduce((a, b) => a + (b.horas_dedicadas || 0), 0)} icon={Clock} colorCls="text-amber-700" bgCls="bg-amber-100" />
        <StatCard label="Proyectos Impactados" value={proyectos.length} icon={Target} colorCls="text-rose-700" bgCls="bg-rose-100" />
      </div>

      {/* ── Search & Filters ── */}
      <div className="flex flex-col gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre, sigla, líder o línea de investigación..."
              aria-label="Buscar semilleros"
              className="w-full pl-10 pr-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="border-slate-200 bg-white" onClick={() => setShowAdvancedFilters(prev => !prev)} aria-expanded={showAdvancedFilters}>
            <Filter size={18} className="mr-2" /> Filtros Avanzados
            {estadoFilter || lineaFilter ? (
              <span className="ml-2 min-w-[18px] h-[18px] px-1 bg-emerald-600 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                {[estadoFilter, lineaFilter].filter(Boolean).length}
              </span>
            ) : null}
          </Button>
        </div>

        {showAdvancedFilters && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 p-4 bg-white rounded-xl border border-slate-200 animate-fadeIn">
            <div className="flex-1 space-y-1.5">
              <label htmlFor="semillero-estado-filter" className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Estado</label>
              <select
                id="semillero-estado-filter"
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <option value="">Todos los estados</option>
                {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
              </select>
            </div>
            <div className="flex-1 space-y-1.5">
              <label htmlFor="semillero-linea-filter" className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Línea de Investigación</label>
              <select
                id="semillero-linea-filter"
                value={lineaFilter}
                onChange={(e) => setLineaFilter(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
              >
                <option value="">Todas las líneas</option>
                {lineasDisponibles.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <Button variant="ghost" className="text-slate-500 hover:text-emerald-700" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        )}
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length === 0 && !loading ? (
          <div className="col-span-full">
            <EmptyState
              icon={GraduationCap}
              title={semilleros.length === 0 ? 'Aún no hay semilleros registrados' : 'No se encontraron semilleros con estos criterios'}
              description={semilleros.length === 0 ? 'Crea el primer semillero de investigación del centro.' : 'Ajusta los filtros o el término de búsqueda.'}
              action={semilleros.length > 0 ? <Button variant="outline" onClick={clearFilters}>Limpiar filtros</Button> : undefined}
            />
          </div>
        ) : (
          filtered.map(s => (
          <div
            key={s.id}
            onDragOver={(e) => { 
              if (e.dataTransfer.types.includes('grupoId')) {
                e.preventDefault(); 
                setDragOverSemilleroId(s.id); 
              }
            }}
            onDragLeave={() => setDragOverSemilleroId(null)}
            onDrop={(e) => handleDrop(e, s)}
            className={`transition-all rounded-[2rem] ${dragOverSemilleroId === s.id ? 'ring-4 ring-emerald-500 scale-[1.02] shadow-2xl z-10' : ''}`}
          >
            <SemilleroCard 
              semillero={s} 
              onEdit={handleOpenEdit} 
              onDelete={handleDelete}
              onDetail={handleOpenDetail}
              onAddAprendiz={handleOpenAprendices}
              canManage={currentUser?.rol !== 'aprendiz'}
            />
            {dragOverSemilleroId === s.id && (
              <div className="mt-2 px-3 py-1.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest text-center rounded-lg animate-pulse">
                Soltar para vincular al Grupo
              </div>
            )}
          </div>
          ))
        )}
      </div>

      {/* ── Detail Drawer (Estandarizado en Pila) ── */}
      <Drawer
        isOpen={detailOpen && !!selectedSemillero}
        onClose={() => setDetailOpen(false)}
        size="lg"
        variant="emerald"
        icon={GraduationCap}
        title={selectedSemillero?.nombre}
        badge={
          selectedSemillero && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="emerald" className="font-bold">SEMILLERO ACTIVO</Badge>
              <Badge variant="indigo" className="font-mono">{selectedSemillero.codigo || 'S-2026'}</Badge>
            </div>
          )
        }
        headerActions={
          selectedSemillero && currentUser?.rol !== 'aprendiz' && (
            <button 
              onClick={() => handleOpenEdit(selectedSemillero)} 
              className="p-2.5 bg-white text-blue-600 hover:bg-blue-50 rounded-xl shadow-sm border border-blue-100 transition-all focus:outline-none"
              title="Editar Semillero"
            >
              <Edit size={18} />
            </button>
          )
        }
        tabs={DRAWER_TABS}
        activeTab={activeTab}
        onTabChange={(tabId) => {
          setActiveTab(tabId);
          if (tabId === 'aprendices' && selectedSemillero) loadSemilleroMembers(selectedSemillero.id);
          if (tabId === 'investigadores' && selectedSemillero) loadSemilleroMembers(selectedSemillero.id);
        }}
        footer={
          <Button className="w-full py-2.5 text-sm font-bold" variant="outline" onClick={() => setDetailOpen(false)}>
            Cerrar Panel
          </Button>
        }
      >
        {selectedSemillero && activeTab === 'info' && (
          <div className="space-y-8 animate-fadeIn">
            <section>
              <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Info size={14} className="text-emerald-600" /> Descripción y Línea
              </h3>
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed text-sm font-medium">
                {selectedSemillero.descripcion || 'Sin descripción técnica disponible.'}
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <p className="text-[10px] font-black text-emerald-800 uppercase mb-1">Línea de Investigación</p>
                  <p className="font-bold text-slate-900">{selectedSemillero.linea_investigacion || 'No definida'}</p>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <p className="text-[10px] font-black text-slate-700 uppercase mb-2">Grupo Matriz</p>
                <p className="font-black text-slate-900 text-sm">{selectedSemillero.grupo_nombre || selectedSemillero.grupo?.nombre || 'No asignado'}</p>
              </div>
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <p className="text-[10px] font-black text-slate-700 uppercase mb-2">Aprendices</p>
                <div className="flex items-center justify-between">
                  <p className="font-black text-emerald-800 text-xl">{aprendices.length || selectedSemillero.total_aprendices || 0}</p>
                  <button 
                    onClick={() => { setActiveTab('aprendices'); loadSemilleroMembers(selectedSemillero.id); }} 
                    className="text-[10px] font-black text-indigo-700 hover:underline uppercase"
                  >
                    Ver Todos
                  </button>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp size={14} className="text-emerald-600" /> Dedicación Semanal
              </h3>
              <div className="flex items-center justify-between p-5 bg-amber-50 rounded-2xl border border-amber-200">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-800 rounded-xl"><Clock size={20} /></div>
                  <div>
                    <p className="text-xl font-black text-slate-900">{selectedSemillero.horas_dedicadas || 0} Horas</p>
                    <p className="text-[10px] font-black text-amber-800 uppercase">Tiempo de formación activa</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {selectedSemillero && activeTab === 'stats' && (
          <div className="space-y-10 animate-fadeIn">
            <section>
              <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
                <PieChart size={14} className="text-indigo-600" /> Logros del Semillero
              </h3>
              {loadingStats ? (
                <div className="h-64 flex items-center justify-center bg-slate-50 rounded-3xl"><Loader2 className="animate-spin text-indigo-600" /></div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePie>
                      <Pie 
                        data={getDisplayStats().impacto} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value"
                      >
                        {getDisplayStats().impacto.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    </RePie>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section>
              <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
                <BarChart3 size={14} className="text-emerald-600" /> Evolución de la Comunidad
              </h3>
              <div className="h-56 bg-slate-50 rounded-2xl p-6 border border-slate-200">
                {loadingStats ? (
                   <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-emerald-600" /></div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getDisplayStats().evolucion}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e1" />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#334155'}} />
                      <YAxis hide />
                      <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', backgroundColor: '#0f172a', color: '#ffffff', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                      <Bar dataKey="aprendices" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-4">
              <Award className="text-emerald-600 shrink-0" size={24} />
              <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                Este semillero cuenta actualmente con <strong className="font-black">{aprendices.length} aprendices vinculados</strong> y <strong className="font-black">{investigadores.length} investigadores</strong>, adscrito al grupo {selectedSemillero?.grupo?.nombre || 'General CGAO'}.
              </p>
            </div>
          </div>
        )}

        {selectedSemillero && (activeTab === 'investigadores' || activeTab === 'aprendices') && (
          <div className="space-y-8 animate-fadeIn">
            {currentUser?.rol !== 'aprendiz' && (
              <div 
                className={`bg-slate-50 p-6 rounded-3xl border-2 border-dashed transition-all ${dragOver ? 'border-emerald-500 bg-emerald-50 scale-[1.02]' : 'border-slate-100'}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <UserPlus size={14} className={activeTab === 'aprendices' ? 'text-indigo-600' : 'text-emerald-600'} /> Vincular {activeTab === 'aprendices' ? 'Aprendiz' : 'Investigador'}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <select 
                    className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
                    defaultValue=""
                    onChange={async (e) => {
                      const selectedUserId = e.target.value;
                      if (!selectedUserId) return;
                      e.target.value = "";
                      try {
                        if (activeTab === 'aprendices') {
                          await SemillerosAPI.addAprendiz(selectedSemillero.id, { user_id: selectedUserId, estado: 'activo' });
                        } else {
                          await SemillerosAPI.addInvestigador(selectedSemillero.id, { user_id: selectedUserId, rol_en_semillero: 'Coinvestigador' });
                        }
                        onNotify?.('Integrante vinculado correctamente', 'success');
                        await loadSemilleroMembers(selectedSemillero.id);
                        await loadData(false);
                      } catch (err) {
                        onNotify?.('Error al vincular: ' + (err.response?.data?.detail || err.message), 'error');
                      }
                    }}
                  >
                    <option value="">Seleccionar del directorio CGAO...</option>
                    {usuarios
                      .filter(u => !aprendices.some(a => a.user_id === u.id) && !investigadores.some(inv => inv.id === u.id))
                      .filter(u => activeTab === 'aprendices' ? u.rol === 'aprendiz' : u.rol !== 'aprendiz')
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.nombre}</option>
                      ))}
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'aprendices' ? (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <GraduationCap size={14} className="text-indigo-500" /> Aprendices Vinculados ({aprendices.length})
                </h4>
                {aprendices.length === 0 ? (
                  <div className="p-8 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase">Sin aprendices</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {aprendices.map(a => (
                      <div
                        key={a.id}
                        onClick={() => handleOpenAprendizDetail(a)}
                        className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-3xl hover:border-indigo-300 hover:bg-indigo-50/30 cursor-pointer transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black shrink-0 group-hover:scale-105 transition-transform">
                            {(a.nombre || '?').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors flex items-center gap-1.5 truncate">
                              {a.nombre}
                              <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{a.programa || 'Sin programa'} • Ficha: {a.ficha || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateCertificate(a);
                            }}
                            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                            title="Generar Certificado"
                          >
                            <Award size={18} />
                          </button>
                          {currentUser?.rol !== 'aprendiz' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRemoveConfirm({ type: 'aprendiz', id: a.id, name: a.nombre || 'Aprendiz' });
                              }}
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Desvincular"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield size={14} className="text-emerald-500" /> Investigadores ({investigadores.length})
                </h4>
                {investigadores.length === 0 ? (
                  <div className="p-8 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400 font-black uppercase">Sin investigadores</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {investigadores.map(inv => (
                      <div
                        key={inv.id}
                        onClick={() => handleOpenAprendizDetail({ ...inv, rol: 'investigador' })}
                        className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-3xl hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black shrink-0 group-hover:scale-105 transition-transform">
                            {(inv.nombre || '?').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1.5 truncate">
                              {inv.nombre}
                              <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-all shrink-0" />
                            </p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{inv.rol_en_semillero} • {inv.email}</p>
                          </div>
                        </div>
                        {currentUser?.rol !== 'aprendiz' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRemoveConfirm({ type: 'investigador', id: inv.id, name: inv.nombre || 'Investigador' });
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                            title="Desvincular"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {selectedSemillero && activeTab === 'proyectos' && (
          <div className="space-y-8 animate-fadeIn">
             <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Target size={14} className="text-indigo-500" /> Proyectos Vinculados ({proyectos.filter(p => p.semillero_id === selectedSemillero?.id).length})
              </h3>
              {proyectos.filter(p => p.semillero_id === selectedSemillero?.id).length === 0 ? (
                <div className="p-8 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 text-center">
                  <Target size={32} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-bold text-slate-600 mb-1">Sin proyectos asociados</p>
                  <p className="text-xs text-slate-400">Este semillero aún no tiene proyectos de investigación asignados.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {proyectos.filter(p => p.semillero_id === selectedSemillero?.id).map(p => (
                    <div key={p.id} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {p.codigo_sgps || 'S/C'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-500">• Estado: {p.estado}</span>
                        </div>
                        <p className="text-sm font-black text-slate-900">{p.nombre_corto || p.nombre}</p>
                        <p className="text-xs text-slate-500 font-medium">Presupuesto: ${(p.presupuesto_total || 0).toLocaleString('es-CO')}</p>
                      </div>

                      <div className="sm:w-48 bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black">
                          <span className="text-slate-400 uppercase">Avance</span>
                          <span className="text-emerald-700">{p.avance_porcentaje || 0}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              (p.avance_porcentaje || 0) >= 100 ? 'bg-emerald-500' :
                              (p.avance_porcentaje || 0) >= 50 ? 'bg-teal-500' :
                              (p.avance_porcentaje || 0) > 0 ? 'bg-amber-500' : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, p.avance_porcentaje || 0))}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-400 text-right font-medium">
                          {p.entregables_aprobados || 0}/{p.total_entregables || 0} entregables
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {selectedSemillero && activeTab === 'formatos' && (
          <div className="space-y-8 animate-fadeIn">
             <section>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <FileText size={14} className="text-rose-500" /> Formatos Etapa Productiva / D2
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { title: 'Bitácora de Seguimiento', type: 'bitacora' },
                  { title: 'Formato Planeación Etapa Productiva', type: 'etapa_productiva' },
                  { title: 'Informe Final de Proyecto', type: 'informe_final' }
                ].map((f, i) => (
                  <div 
                    key={i} 
                    onClick={() => handleDownloadFormato(f.type)}
                    className="p-4 bg-white border border-slate-200 rounded-2xl flex items-center justify-between hover:border-rose-300 transition-all cursor-pointer group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-rose-50 text-rose-600 rounded-xl group-hover:bg-rose-100 transition-colors">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{f.title}</p>
                        <p className="text-[10px] text-slate-500 uppercase">Plantilla Oficial SENA</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); handleDownloadFormato(f.type); }}
                      className="sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity"
                    >
                      <Download size={14} className="mr-2" /> Descargar
                    </Button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </Drawer>

      {/* ── Form Modal (Estandarizado en Pila) ── */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        size="lg"
        variant="emerald"
        icon={GraduationCap}
        title={isEditing ? 'Actualizar Semillero' : 'Nuevo Semillero de Investigación'}
        subtitle="Gestión de Talento Humano CGAO"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button variant="sena" className="bg-emerald-600 hover:bg-emerald-700 px-8" onClick={handleSubmit}>
              {isEditing ? 'Guardar Cambios' : 'Registrar Semillero'}
            </Button>
          </>
        }
      >
        <Input 
          label="Nombre del Semillero" 
          placeholder="Ej: Semillero de IA aplicada al Agro" 
          value={formData.nombre} 
          onChange={e => setFormData({...formData, nombre: e.target.value})} 
          required 
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Código / Sigla" 
            placeholder="Ej: SIA-2026" 
            value={formData.sigla || formData.codigo || ''} 
            onChange={e => setFormData({...formData, sigla: e.target.value, codigo: e.target.value})} 
          />
          <Select 
            label="Grupo de Investigación" 
            options={grupos.map(g => ({ value: g.id, label: g.nombre }))} 
            value={formData.grupo_id} 
            onChange={e => setFormData({...formData, grupo_id: e.target.value})} 
            required
          />
        </div>
        <Input 
          label="Línea de Investigación" 
          placeholder="Ej: Inteligencia Artificial y Big Data" 
          value={formData.linea_investigacion} 
          onChange={e => setFormData({...formData, linea_investigacion: e.target.value})} 
        />
        <TextArea 
          label="Descripción del Semillero" 
          rows={4} 
          value={formData.descripcion} 
          onChange={e => setFormData({...formData, descripcion: e.target.value})} 
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input 
            label="Horas de Dedicación" 
            type="number" 
            value={formData.horas_dedicadas} 
            onChange={e => setFormData({...formData, horas_dedicadas: e.target.value})} 
          />
          <Select 
            label="Estado" 
            options={ESTADOS} 
            value={formData.estado} 
            onChange={e => setFormData({...formData, estado: e.target.value})} 
          />
        </div>
      </Modal>

      {/* ── Confirm Delete Dialog (Estandarizado en Pila) ── */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDeleteAction}
        title="¿Eliminar Semillero?"
        description="Esta acción eliminará el semillero y desvinculará a todos sus miembros asociados. No se puede revertir."
        confirmText="Sí, Eliminar Semillero"
        variant="danger"
      />

      {/* ── Confirm Remove Member Dialog ── */}
      <ConfirmDialog
        isOpen={!!removeConfirm}
        onClose={() => setRemoveConfirm(null)}
        onConfirm={async () => {
          if (!removeConfirm) return;
          if (removeConfirm.type === 'aprendiz') {
            await handleRemoveAprendiz(removeConfirm.id);
          } else {
            await handleRemoveInvestigador(removeConfirm.id);
          }
          setRemoveConfirm(null);
        }}
        title={removeConfirm?.type === 'aprendiz' ? '¿Desvincular Aprendiz?' : '¿Desvincular Investigador?'}
        description={`¿Estás seguro de que deseas desvincular a ${removeConfirm?.name} del semillero? Esta acción no afecta su cuenta de usuario.`}
        confirmText="Desvincular"
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

export default SemillerosModule;
