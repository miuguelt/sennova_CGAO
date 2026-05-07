import React, { useState, useEffect, useRef } from 'react';
import { 
  GraduationCap, Plus, Search, Filter, 
  Users, BookOpen, Clock, ChevronRight,
  UserPlus, Trash2, Edit, ExternalLink,
  X, Info, Target, ArrowUpRight, Loader2,
  TrendingUp, BarChart3, PieChart, Download,
  CheckCircle2, AlertCircle, Award
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart as RePie, Pie 
} from 'recharts';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Select from '../ui/Select';
import { SemillerosAPI } from '../../api/semilleros';
import { GruposAPI } from '../../api/grupos';
import { UsuariosAPI } from '../../api/usuarios';
import { PlantillasAPI } from '../../api/plantillas';
import { PDFGenerator } from '../../utils/pdfGenerator';
import useClickOutside from '../../hooks/useClickOutside';

const ESTADOS = [
  { value: 'activo', label: 'Activo', variant: 'success' },
  { value: 'inactivo', label: 'Inactivo', variant: 'default' },
  { value: 'en_convocatoria', label: 'En Convocatoria', variant: 'warning' }
];

const ROLES_SEMILLERO = [
  { value: 'Investigador Principal', label: 'Investigador Principal' },
  { value: 'Coinvestigador', label: 'Coinvestigador' },
  { value: 'Tutor', label: 'Tutor de Semillero' },
  { value: 'Mentor', label: 'Mentor Externo' }
];

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

const EMPTY_FORM = {
  nombre: '',
  codigo: '',
  linea_investigacion: '',
  grupo_id: '',
  descripcion: '',
  estado: 'activo',
  horas_dedicadas: 0,
  is_publico: true
};

const StatCard = ({ label, value, icon: Icon, colorCls, bgCls }) => (
  <Card className="p-5 border-0 shadow-sm ring-1 ring-slate-200/60 overflow-hidden relative group transition-all hover:shadow-md">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 ${bgCls}`} />
    <div className="flex items-center gap-4 relative">
      <div className={`p-3 rounded-2xl ${bgCls} ${colorCls} shadow-sm`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
      </div>
    </div>
  </Card>
);

const SemilleroCard = ({ semillero, onEdit, onDelete, onDetail, onAddAprendiz }) => (
  <Card 
    className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-emerald-500 cursor-pointer bg-white"
    onClick={() => onDetail(semillero)}
  >
    <div className="p-6">
      <div className="flex justify-between items-start mb-4">
        <Badge variant={ESTADOS.find(e => e.value === semillero.estado)?.variant || 'default'} className="font-black text-[10px] uppercase">
          {ESTADOS.find(e => e.value === semillero.estado)?.label || semillero.estado}
        </Badge>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(semillero); }} 
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50"
          >
            <Edit size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(semillero.id); }} 
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-700 transition-colors mb-2 line-clamp-1">
        {semillero.nombre}
      </h3>
      
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4 font-medium">
        <Users size={14} className="text-slate-400" />
        <span className="truncate">Grupo: {semillero.grupo_nombre || semillero.grupo?.nombre || 'No asignado'}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Aprendices</p>
          <p className="text-lg font-black text-slate-900">{semillero.total_aprendices || 0}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-inner">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Dedicación</p>
          <p className="text-lg font-black text-slate-900">{semillero.horas_dedicadas || 0}h</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex -space-x-2">
          {Array(Math.min(3, semillero.total_aprendices || 0)).fill(0).map((_, i) => (
            <div key={i} className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-emerald-700">
              A{i+1}
            </div>
          ))}
          {semillero.total_aprendices > 3 && (
            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
              +{semillero.total_aprendices - 3}
            </div>
          )}
        </div>
        <Button 
          variant="primary" 
          size="sm" 
          className="h-8 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700" 
          onClick={(e) => { e.stopPropagation(); onAddAprendiz(semillero); }}
        >
          <UserPlus size={14} className="mr-1.5" /> Vincular
        </Button>
      </div>
    </div>
  </Card>
);

const SemillerosModule = ({ currentUser, onNotify }) => {
  const [semilleros, setSemilleros] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modales
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [memberForm, setMemberForm] = useState({ user_id: '', rol: 'Aprendiz' });
  const [isPoolVisible,    setIsPoolVisible]    = useState(false);
  const [usuarios,         setUsuarios]         = useState([]);
  const [selectedSemillero, setSelectedSemillero] = useState(null);
  const [showMemberModal,  setShowMemberModal]  = useState(false);
  const [aprendices,       setAprendices]       = useState([]);
  const [investigadores,   setInvestigadores]   = useState([]);
  const [talentTab,        setTalentTab]        = useState('aprendices'); 
  const [memberToLink,     setMemberToLink]     = useState(null);
  const [linkingRole,      setLinkingRole]      = useState('Aprendiz');
  const [linkMode,         setLinkMode]         = useState('existing'); 
  const [aprendizForm, setAprendizForm] = useState({ 
    user_id: '', 
    estado: 'activo',
    // Fields for 'new' mode (User + Link)
    email: '',
    nombre: '',
    password: 'password123', // Default or random
    documento: '',
    celular: '',
    ficha: '',
    programa_formacion: ''
  });
  const [investigadorForm, setInvestigadorForm] = useState({ user_id: '', rol_en_semillero: 'Coinvestigador' });
  const [semilleroStats, setSemilleroStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [dragOverSemilleroId, setDragOverSemilleroId] = useState(null);
  const [isGroupPoolVisible, setIsGroupPoolVisible] = useState(false);

  // Stats logic
  const [activeTab, setActiveTab] = useState('info');

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, g, u] = await Promise.all([
        SemillerosAPI.list(), 
        GruposAPI.list(),
        UsuariosAPI.list()
      ]);
      setSemilleros(s || []);
      setGrupos(g || []);
      setUsuarios(u || []);
    } catch (err) {
      onNotify('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenCreate = () => {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleOpenEdit = (s) => {
    setFormData({ ...s, grupo_id: s.grupo_id || s.grupo?.id || '' });
    setIsEditing(true);
    setShowForm(true);
    setDetailOpen(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que desea eliminar este semillero?')) return;
    try {
      await SemillerosAPI.delete(id);
      onNotify('Semillero eliminado', 'success');
      loadData();
      setDetailOpen(false);
    } catch {
      onNotify('Error al eliminar', 'error');
    }
  };

  const handleSubmit = async () => {
    try {
      if (isEditing) {
        await SemillerosAPI.update(formData.id, formData);
        onNotify('Semillero actualizado', 'success');
      } else {
        await SemillerosAPI.create(formData);
        onNotify('Semillero creado con éxito', 'success');
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      onNotify('Error al guardar semillero', 'error');
    }
  };

  const handleOpenDetail = async (s) => {
    setSelectedSemillero(s);
    setDetailOpen(true);
    setActiveTab('info');
    setLoadingStats(true);
    try {
      const stats = await SemillerosAPI.getStats(s.id);
      setSemilleroStats(stats);
    } catch {
      setSemilleroStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleOpenAprendices = async (s) => {
    setSelectedSemillero(s);
    setShowMemberModal(true);
    setMemberType('aprendiz');
    try {
      const [data, semData] = await Promise.all([
        SemillerosAPI.listAprendices(s.id),
        SemillerosAPI.get(s.id)
      ]);
      setAprendices(data || []);
      setInvestigadores(semData.investigadores || []);
    } catch {
      onNotify('Error al cargar integrantes', 'error');
    }
  };

  const handleAddAprendiz = async () => {
    try {
      if (memberType === 'aprendiz') {
        if (linkMode === 'existing') {
          if (!aprendizForm.user_id) {
            onNotify('Debe seleccionar un usuario', 'warning');
            return;
          }
          await SemillerosAPI.addAprendiz(selectedSemillero.id, {
            user_id: aprendizForm.user_id,
            estado: aprendizForm.estado
          });
        } else {
          if (!aprendizForm.email || !aprendizForm.nombre) {
            onNotify('Email y nombre son obligatorios', 'warning');
            return;
          }
          await SemillerosAPI.addAprendizFull(selectedSemillero.id, aprendizForm);
        }
        onNotify('Aprendiz vinculado exitosamente', 'success');
      } else {
        if (!investigadorForm.user_id) {
          onNotify('Debe seleccionar un investigador', 'warning');
          return;
        }
        await SemillerosAPI.addInvestigador(selectedSemillero.id, investigadorForm);
        onNotify('Investigador vinculado exitosamente', 'success');
      }
      
      setAprendizForm({ 
        user_id: '', estado: 'activo', email: '', nombre: '', 
        password: 'password123', documento: '', celular: '', ficha: '', programa_formacion: '' 
      });
      setInvestigadorForm({ user_id: '', rol_en_semillero: 'Coinvestigador' });
      
      const [data, semData] = await Promise.all([
        SemillerosAPI.listAprendices(selectedSemillero.id),
        SemillerosAPI.get(selectedSemillero.id)
      ]);
      setAprendices(data || []);
      setInvestigadores(semData.investigadores || []);
      loadData();
    } catch (err) {
      onNotify('Error al vincular: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  const handleGenerateCertificate = async (aprendiz) => {
    try {
      const data = await PlantillasAPI.getDatosCertificado(selectedSemillero.id, aprendiz.id);
      PDFGenerator.generateCertificate(data);
      onNotify('Certificado generado y descargado', 'success');
    } catch {
      onNotify('Error al generar certificado PDF', 'error');
    }
  };

  const handleRemoveAprendiz = async (aprendizId) => {
    try {
      await SemillerosAPI.deleteAprendiz(selectedSemillero.id, aprendizId);
      onNotify('Aprendiz desvinculado', 'success');
      const data = await SemillerosAPI.listAprendices(selectedSemillero.id);
      setAprendices(data || []);
      loadData();
    } catch {
      onNotify('Error al desvincular', 'error');
    }
  };

  const handleDragStart = (e, user) => {
    e.dataTransfer.setData('userId', user.id);
  };

  const handleDrop = async (e, semillero) => {
    e.preventDefault();
    setDragOverSemilleroId(null);
    
    const userId = e.dataTransfer.getData('userId');
    const grupoId = e.dataTransfer.getData('grupoId');

    if (grupoId && semillero) {
      try {
        await SemillerosAPI.update(semillero.id, { ...semillero, grupo_id: grupoId });
        onNotify('Grupo vinculado al semillero', 'success');
        loadData();
      } catch (err) {
        onNotify('Error al vincular grupo', 'error');
      }
      return;
    }

    if (!userId || !selectedSemillero) return;
    
    try {
      if (memberType === 'aprendiz') {
        await SemillerosAPI.addAprendiz(selectedSemillero.id, {
          user_id: userId,
          semillero_id: selectedSemillero.id,
          estado: 'activo'
        });
        onNotify('Aprendiz vinculado exitosamente', 'success');
      } else {
        await SemillerosAPI.addInvestigador(selectedSemillero.id, {
          user_id: userId,
          rol_en_semillero: 'Coinvestigador'
        });
        onNotify('Investigador vinculado exitosamente', 'success');
      }
      
      const [data, semData] = await Promise.all([
        SemillerosAPI.listAprendices(selectedSemillero.id),
        SemillerosAPI.get(selectedSemillero.id)
      ]);
      setAprendices(data || []);
      setInvestigadores(semData.investigadores || []);
      loadData();
    } catch (err) {
      onNotify('Error al vincular: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  const handleAddMember = async () => {
    if (!memberForm.user_id) return;
    try {
      await SemillerosAPI.addAprendiz(selectedSemillero.id, memberForm);
      onNotify?.('Aprendiz vinculado', 'success');
      setMemberForm({ user_id: '', rol: 'Aprendiz' });
      const data = await SemillerosAPI.listAprendices(selectedSemillero.id);
      setAprendices(data || []);
      loadData();
    } catch (err) {
      onNotify?.('Error al vincular: ' + err.message, 'error');
    }
  };

  const [detailOpen, setDetailOpen] = useState(false);

  const filtered = (semilleros || []).filter(s => 
    (s.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.grupo_nombre || s.grupo?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (loading) {
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
        <StatCard label="Proyectos Impactados" value={semilleros.length * 2} icon={Target} colorCls="text-rose-700" bgCls="bg-rose-100" />
      </div>

      {/* ── Search & Filters ── */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre o grupo de investigación..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" className="border-slate-200 bg-white">
          <Filter size={18} className="mr-2" /> Filtros Avanzados
        </Button>
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(s => (
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
            />
            {dragOverSemilleroId === s.id && (
              <div className="mt-2 px-3 py-1.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest text-center rounded-lg animate-pulse">
                Soltar para vincular al Grupo
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Detail Side-Over ── */}
      {detailOpen && selectedSemillero && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fadeIn" onClick={() => setDetailOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col animate-slideInRight">
              
              <div className="px-8 py-8 border-b border-slate-100 bg-emerald-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/50 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 bg-white rounded-2xl shadow-lg text-emerald-600">
                      <GraduationCap size={32} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenEdit(selectedSemillero)} className="p-2.5 bg-white text-blue-600 hover:bg-blue-50 rounded-xl shadow-sm border border-blue-100 transition-all"><Edit size={18} /></button>
                      <button onClick={() => setDetailOpen(false)} className="p-2.5 bg-white text-slate-400 hover:text-slate-600 rounded-xl shadow-sm border border-slate-100 transition-all ml-2"><X size={18} /></button>
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2">{selectedSemillero.nombre}</h2>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="emerald" className="font-bold">SEMILLERO ACTIVO</Badge>
                    <Badge variant="indigo" className="font-mono">{selectedSemillero.codigo || 'S-2026'}</Badge>
                  </div>
                </div>
              </div>

              <div className="flex border-b border-slate-100 bg-slate-50/50">
                <button onClick={() => setActiveTab('info')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest ${activeTab === 'info' ? 'text-emerald-700 border-b-2 border-emerald-600 bg-white' : 'text-slate-400'}`}>Información</button>
                <button onClick={() => setActiveTab('stats')} className={`flex-1 py-4 text-xs font-black uppercase tracking-widest ${activeTab === 'stats' ? 'text-emerald-700 border-b-2 border-emerald-600 bg-white' : 'text-slate-400'}`}>Impacto</button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-thin bg-white">
                {activeTab === 'info' ? (
                  <div className="space-y-8 animate-fadeIn">
                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Info size={14} className="text-emerald-500" /> Descripción y Línea
                      </h3>
                      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed text-sm font-medium shadow-inner">
                        {selectedSemillero.descripcion || 'Sin descripción técnica disponible.'}
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Línea de Investigación</p>
                          <p className="font-bold">{selectedSemillero.linea_investigacion || 'No definida'}</p>
                        </div>
                      </div>
                    </section>

                    <section className="grid grid-cols-2 gap-4">
                      <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Grupo Matriz</p>
                        <p className="font-black text-slate-900 text-sm">{selectedSemillero.grupo_nombre || selectedSemillero.grupo?.nombre || 'No asignado'}</p>
                      </div>
                      <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Aprendices</p>
                        <div className="flex items-center justify-between">
                          <p className="font-black text-emerald-600 text-xl">{selectedSemillero.total_aprendices}</p>
                          <button onClick={() => handleOpenAprendices(selectedSemillero)} className="text-[10px] font-black text-indigo-600 hover:underline uppercase">Ver Todos</button>
                        </div>
                      </div>
                    </section>

                    <section>
                       <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <TrendingUp size={14} className="text-emerald-500" /> Dedicación Semanal
                      </h3>
                      <div className="flex items-center justify-between p-5 bg-amber-50 rounded-2xl border border-amber-100">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl"><Clock size={20} /></div>
                          <div>
                            <p className="text-xl font-black text-slate-900">{selectedSemillero.horas_dedicadas} Horas</p>
                            <p className="text-[10px] font-black text-amber-700 uppercase">Tiempo de formación activa</p>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="space-y-10 animate-fadeIn">
                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <PieChart size={14} className="text-indigo-500" /> Logros del Semillero
                      </h3>
                      {loadingStats ? (
                        <div className="h-64 flex items-center justify-center bg-slate-50 rounded-3xl"><Loader2 className="animate-spin text-indigo-500" /></div>
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
                                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </RePie>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </section>

                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <BarChart3 size={14} className="text-emerald-500" /> Evolución de la Comunidad
                      </h3>
                      <div className="h-56 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                        {loadingStats ? (
                           <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getDisplayStats().evolucion}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                              <YAxis hide />
                              <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                              <Bar dataKey="aprendices" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </section>

                    <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-4">
                      <Award className="text-emerald-600 shrink-0" size={24} />
                      <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                        Este semillero ha incrementado su base de aprendices en un **300%** este trimestre, consolidándose como uno de los más activos del centro.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                <Button className="flex-1" variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
                <Button className="flex-1" variant="sena" onClick={() => handleOpenAprendices(selectedSemillero)}>
                  <Users size={16} className="mr-2" /> Gestionar Aprendices
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <Card className="w-full max-w-xl shadow-2xl animate-scaleIn overflow-hidden border-0">
            <div className="bg-emerald-600 px-8 py-6 text-white relative">
              <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
              <h2 className="text-xl font-black">{isEditing ? 'Actualizar Semillero' : 'Nuevo Semillero de Investigación'}</h2>
              <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">Gestión de Talento Humano CGAO</p>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin bg-white">
              <Input label="Nombre del Semillero" placeholder="Ej: Semillero de IA aplicada al Agro" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Código / Sigla" placeholder="Ej: SIA-2026" value={formData.codigo} onChange={e => setFormData({...formData, codigo: e.target.value})} />
                <Select 
                  label="Grupo de Investigación" 
                  options={grupos.map(g => ({ value: g.id, label: g.nombre }))} 
                  value={formData.grupo_id} 
                  onChange={e => setFormData({...formData, grupo_id: e.target.value})} 
                  required
                />
              </div>
              <Input label="Línea de Investigación" placeholder="Ej: Inteligencia Artificial y Big Data" value={formData.linea_investigacion} onChange={e => setFormData({...formData, linea_investigacion: e.target.value})} />
              <TextArea label="Descripción del Semillero" rows={4} value={formData.descripcion} onChange={e => setFormData({...formData, descripcion: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Horas de Dedicación" type="number" value={formData.horas_dedicadas} onChange={e => setFormData({...formData, horas_dedicadas: e.target.value})} />
                <Select label="Estado" options={ESTADOS} value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} />
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="sena" className="bg-emerald-600 hover:bg-emerald-700 px-8" onClick={handleSubmit}>
                {isEditing ? 'Guardar Cambios' : 'Registrar Semillero'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Member Modal ── */}
      {showMemberModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <Card className="w-full max-w-2xl animate-scaleIn flex flex-col max-h-[85vh] border-0 shadow-2xl overflow-hidden">
            <div className="px-8 py-6 bg-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><Users size={24} /></div>
                <div>
                  <h2 className="text-xl font-black">Directorio de Aprendices</h2>
                  <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">{selectedSemillero?.nombre}</p>
                </div>
              </div>
              <button onClick={() => setShowMemberModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col scrollbar-thin bg-white relative">
              
              <div className="p-8 space-y-8 flex-1">
                {/* Member Type Selector */}
                <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 mb-6">
                  <button 
                    onClick={() => setMemberType('aprendiz')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${memberType === 'aprendiz' ? 'bg-white text-indigo-700 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <GraduationCap size={16} /> Directorio de Aprendices
                  </button>
                  <button 
                    onClick={() => setMemberType('investigador')}
                    className={`flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${memberType === 'investigador' ? 'bg-white text-emerald-700 shadow-md ring-1 ring-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    <Users size={16} /> Equipo de Investigadores
                  </button>
                </div>

                <div 
                  className={`bg-slate-50 p-6 rounded-3xl border-2 border-dashed transition-all ${dragOver ? 'border-emerald-500 bg-emerald-50 scale-[1.02]' : 'border-slate-100'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                >
                  {memberToLink && (
                    <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-fadeIn text-center rounded-[2rem]">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${talentTab === 'aprendices' ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'}`}>
                        <Users size={32} />
                      </div>
                      <h4 className="text-sm font-black text-slate-900 mb-1">Vincular a {memberToLink.nombre}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Configuración de Rol</p>
                      
                      <div className="w-full max-w-xs space-y-4">
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rol en el Semillero</label>
                          <select 
                            value={linkingRole}
                            onChange={(e) => setLinkingRole(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                          >
                            {talentTab === 'aprendices' 
                              ? <option value="Aprendiz">Aprendiz Investigador</option>
                              : ROLES_SEMILLERO.map(r => <option key={r.value} value={r.value}>{r.label}</option>)
                            }
                          </select>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button variant="secondary" className="flex-1" onClick={() => setMemberToLink(null)}>Cancelar</Button>
                          <Button variant="sena" className="flex-1" onClick={async () => {
                            try {
                              if (talentTab === 'aprendices') {
                                await SemillerosAPI.addAprendiz(selectedSemillero.id, { user_id: memberToLink.id, estado: 'activo' });
                              } else {
                                await SemillerosAPI.addInvestigador(selectedSemillero.id, { user_id: memberToLink.id, rol_en_semillero: linkingRole });
                              }
                              onNotify?.('Integrante vinculado correctamente', 'success');
                              setMemberToLink(null);
                              const [data, semData] = await Promise.all([
                                SemillerosAPI.listAprendices(selectedSemillero.id),
                                SemillerosAPI.get(selectedSemillero.id)
                              ]);
                              setAprendices(data || []);
                              setInvestigadores(semData.investigadores || []);
                              loadData();
                            } catch (err) {
                              onNotify?.('Error al vincular: ' + err.message, 'error');
                            }
                          }}>Vincular</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <UserPlus size={14} className={talentTab === 'aprendices' ? 'text-indigo-600' : 'text-emerald-600'} /> Vincular Talento
                    </p>
                    <button onClick={() => setIsPoolVisible(!isPoolVisible)} className={`text-[10px] font-black uppercase hover:underline ${talentTab === 'aprendices' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                      {isPoolVisible ? 'Cerrar Directorio' : 'Abrir Pool'}
                    </button>
                  </div>

                  <div className="flex flex-col gap-4">
                    {talentTab === 'aprendices' && (
                      <div className="flex bg-slate-100 p-1 rounded-xl mb-2">
                        <button onClick={() => setLinkMode('existing')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${linkMode === 'existing' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Vincular Existente</button>
                        <button onClick={() => setLinkMode('new')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${linkMode === 'new' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Registrar y Vincular</button>
                      </div>
                    )}

                    <div className="p-5 bg-slate-900 rounded-2xl space-y-4 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl -mr-12 -mt-12" />
                      
                      {linkMode === 'new' && talentTab === 'aprendices' ? (
                        <div className="space-y-4 relative z-10">
                           <div className="grid grid-cols-2 gap-3">
                              <input placeholder="Email" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white" value={aprendizForm.email} onChange={e => setAprendizForm({...aprendizForm, email: e.target.value})} />
                              <input placeholder="Nombre" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white" value={aprendizForm.nombre} onChange={e => setAprendizForm({...aprendizForm, nombre: e.target.value})} />
                           </div>
                           <Button variant="sena" className="w-full h-10 text-[10px]" onClick={handleAddAprendiz}>Registrar Aprendiz</Button>
                        </div>
                      ) : (
                        <div className="relative z-10 flex gap-3">
                          <select 
                            className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                            onChange={(e) => {
                              const u = usuarios.find(usr => usr.id === e.target.value);
                              if (u) {
                                setMemberToLink(u);
                                setLinkingRole(talentTab === 'aprendices' ? 'Aprendiz' : 'Investigador');
                              }
                              e.target.value = ""; 
                            }}
                            value=""
                          >
                            <option value="">Buscar en el directorio CGAO...</option>
                            {usuarios
                              .filter(u => !aprendices.some(a => a.user_id === u.id) && !investigadores.some(inv => inv.id === u.id))
                              .filter(u => talentTab === 'aprendices' ? (u.ficha || u.programa_formacion) : (!u.ficha && !u.programa_formacion))
                              .map(u => (
                                <option key={u.id} value={u.id}>{u.nombre} {u.ficha ? `(Ficha: ${u.ficha})` : ''}</option>
                              ))}
                          </select>
                          <div className={`hidden sm:flex items-center px-4 rounded-xl text-[10px] font-black uppercase tracking-widest ${talentTab === 'aprendices' ? 'bg-indigo-600' : 'bg-emerald-600'} text-white`}>
                            <Plus size={16} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pb-10">
                  {/* Aprendices List */}
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
                          <div key={a.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-3xl hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-500/20">
                                {(a.nombre || '?').charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors">{a.nombre}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                  {a.programa || 'Sin programa'} • Ficha: {a.ficha || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleGenerateCertificate(a)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl" title="Generar Certificado"><Award size={18} /></button>
                              <button onClick={() => handleRemoveAprendiz(a.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl" title="Desvincular"><Trash2 size={18} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Investigadores List */}
                  <div className="space-y-4 pt-6 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Shield size={14} className="text-emerald-500" /> Equipo de Investigadores ({investigadores.length})
                    </h4>
                    {investigadores.length === 0 ? (
                      <div className="p-8 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100 text-center">
                        <p className="text-[10px] text-slate-400 font-black uppercase">Sin investigadores</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {investigadores.map(inv => (
                          <div key={inv.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-3xl hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-emerald-500/20">
                                {(inv.nombre || '?').charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">{inv.nombre}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                  {inv.rol_en_semillero} • {inv.email}
                                </p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRemoveInvestigador(inv.id)} 
                              className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                              disabled={inv.id === selectedSemillero.owner_id}
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button variant="primary" onClick={() => setShowMemberModal(false)}>Cerrar Gestión</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SemillerosModule;
