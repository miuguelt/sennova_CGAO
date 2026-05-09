import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Layers, Users, ExternalLink,
  Edit2, ChevronRight, X, Globe, Star,
  Loader2, Trash2, MoreVertical, Shield, Award, 
  Info, ArrowUpRight, Zap, UserPlus, Target,
  BarChart3, PieChart, Download, FileText,
  Activity, TrendingUp, CheckCircle2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart as RePie, Pie 
} from 'recharts';
import { GruposAPI } from '../../api/grupos';
import { UsuariosAPI } from '../../api/usuarios';
import { SemillerosAPI } from '../../api/semilleros';
import useClickOutside from '../../hooks/useClickOutside';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TextArea from '../ui/TextArea';

// ─── Constants ─────────────────────────────────────────────────────────────
const CLASIFICACIONES = [
  { value: 'A1', label: 'Categoría A1 (Excelencia)' },
  { value: 'A', label: 'Categoría A' },
  { value: 'B', label: 'Categoría B' },
  { value: 'C', label: 'Categoría C' },
  { value: 'Reconocido', label: 'Reconocido' },
  { value: 'S.C.', label: 'Sin Clasificación' }
];

const ROLES_GRUPO = [
  { value: 'Líder', label: 'Líder de Grupo' },
  { value: 'Investigador', label: 'Investigador Principal' },
  { value: 'Coinvestigador', label: 'Coinvestigador' },
  { value: 'Asesor', label: 'Asesor Externo' },
  { value: 'Aprendiz', label: 'Aprendiz Investigador' }
];

const EMPTY_FORM = {
  nombre: '',
  nombre_completo: '',
  codigo_gruplac: '',
  clasificacion: 'C',
  gruplac_url: '',
  lineas_investigacion: '',
  is_publico: true,
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// ─── Components ─────────────────────────────────────────────────────────────

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

const GroupCardSkeleton = () => (
  <Card className="p-6 border-0 ring-1 ring-slate-100 animate-pulse">
    <div className="flex justify-between items-start mb-6">
      <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
      <div className="w-20 h-6 bg-slate-100 rounded-lg" />
    </div>
    <div className="space-y-3">
      <div className="h-5 w-3/4 bg-slate-200 rounded" />
      <div className="h-3 w-full bg-slate-100 rounded" />
      <div className="h-3 w-5/6 bg-slate-100 rounded" />
    </div>
    <div className="mt-8 pt-6 border-t border-slate-50 flex gap-4">
      <div className="h-4 w-20 bg-slate-100 rounded" />
      <div className="h-4 w-20 bg-slate-100 rounded" />
    </div>
  </Card>
);

// ─── Main Module ────────────────────────────────────────────────────────────

const GruposModule = ({ currentUser, onNotify }) => {
  const [grupos, setGrupos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [showMembers, setShowMembers] = useState(false);
  const [integrantes, setIntegrantes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [selectedGrupo, setSelectedGrupo] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [memberForm, setMemberForm] = useState({ user_id: '', rol: 'Investigador' });
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [grupoSemilleros, setGrupoSemilleros] = useState([]);
  const [loadingSemilleros, setLoadingSemilleros] = useState(false);
  const [isPoolVisible,    setIsPoolVisible]    = useState(false);
  const [dragOverGroup,     setDragOverGroup]     = useState(false);
  const [talentTab,        setTalentTab]        = useState('investigadores');
  const [memberToLink,     setMemberToLink]     = useState(null);
  const [linkingRole,      setLinkingRole]      = useState('Investigador');
  
  // Stats
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [g, u] = await Promise.all([GruposAPI.list(), UsuariosAPI.list()]);
      setGrupos(g || []);
      setUsuarios(u || []);
    } catch (err) {
      onNotify?.('Error al cargar datos: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setFormStep(1);
    setShowForm(true);
    setMenuOpenId(null);
  };

  const handleOpenEdit = (grupo) => {
    setFormData({
      ...grupo,
      lineas_investigacion: Array.isArray(grupo.lineas_investigacion)
        ? grupo.lineas_investigacion.join(', ')
        : grupo.lineas_investigacion
    });
    setIsEditing(true);
    setFormStep(1);
    setShowForm(true);
    setIsDetailOpen(false);
    setMenuOpenId(null);
  };

  const handleSubmit = async () => {
    try {
      if (isEditing) {
        await GruposAPI.update(formData.id, formData);
        onNotify?.('Grupo institucional actualizado', 'success');
      } else {
        await GruposAPI.create(formData);
        onNotify?.('Nuevo grupo de investigación registrado', 'success');
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      onNotify?.('Error: ' + err.message, 'error');
    }
  };

  const handleOpenMembers = async (grupo) => {
    setSelectedGrupo(grupo);
    setShowMembers(true);
    setMenuOpenId(null);
    setLoadingMembers(true);
    try {
      const m = await GruposAPI.getMembers(grupo.id);
      setIntegrantes(m || []);
    } catch {
      onNotify?.('Error al cargar integrantes', 'error');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberForm.user_id) return;
    try {
      await GruposAPI.addMember(selectedGrupo.id, memberForm);
      onNotify?.('Investigador vinculado correctamente', 'success');
      setMemberForm({ user_id: '', rol: 'Investigador' });
      const m = await GruposAPI.getMembers(selectedGrupo.id);
      setIntegrantes(m || []);
      loadData();
    } catch (err) {
      onNotify?.('Error al vincular: ' + err.message, 'error');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!memberId) return;
    try {
      await GruposAPI.removeMember(selectedGrupo.id, memberId);
      onNotify?.('Investigador desvinculado exitosamente', 'success');
      const m = await GruposAPI.getMembers(selectedGrupo.id);
      setIntegrantes(m || []);
      loadData();
    } catch (err) {
      onNotify?.('Error al desvincular: ' + err.message, 'error');
    }
  };

  const handleDragUserStart = (e, user) => {
    e.dataTransfer.setData('userId', user.id);
    e.dataTransfer.setData('source', 'talent-pool-group');
  };

  const handleGroupDrop = async (e) => {
    e.preventDefault();
    setDragOverGroup(false);
    const source = e.dataTransfer.getData('source');
    if (source !== 'talent-pool-group') return;
    
    const userId = e.dataTransfer.getData('userId');
    if (!userId || !selectedGrupo) return;
    
    try {
      await GruposAPI.addMember(selectedGrupo.id, { user_id: userId, rol: 'Investigador' });
      onNotify?.('Investigador vinculado exitosamente', 'success');
      const m = await GruposAPI.getMembers(selectedGrupo.id);
      setIntegrantes(m || []);
      loadData();
    } catch (err) {
      onNotify?.('Error al vincular: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este grupo de investigación? Esta acción es crítica.')) return;
    try {
      await GruposAPI.delete(id);
      onNotify?.('Grupo eliminado del sistema', 'success');
      loadData();
      setMenuOpenId(null);
    } catch (err) {
      onNotify?.('Error al eliminar: ' + err.message, 'error');
    }
  };

  const patch = (f) => (e) => {
    const val = e?.target ? e.target.value : e;
    setFormData(prev => ({ ...prev, [f]: val }));
  };

  const filtered = (grupos || []).filter(g => 
    (g.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.codigo_gruplac || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.nombre_completo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Simulated Stats Data
  const getMockStats = (grupo) => ({
    produccion: [
      { name: 'Artículos', value: (grupo.total_integrantes || 2) * 3 },
      { name: 'Software', value: (grupo.total_integrantes || 1) * 2 },
      { name: 'Libros', value: 1 },
      { name: 'Prototipos', value: 4 },
      { name: 'Consultoría', value: 2 }
    ],
    cumplimiento: 85,
    impacto_regional: [
      { month: 'Ene', valor: 40 },
      { month: 'Feb', valor: 55 },
      { month: 'Mar', valor: 70 },
      { month: 'Abr', valor: 65 },
      { month: 'May', valor: 85 }
    ]
  });

  const loadGrupoSemilleros = async (grupoId) => {
    setLoadingSemilleros(true);
    try {
      const allSem = await SemillerosAPI.list();
      const filtered = allSem.filter(s => s.grupo_id === grupoId);
      setGrupoSemilleros(filtered);
    } catch {
      setGrupoSemilleros([]);
    }
    setLoadingSemilleros(false);
  };

  const handleOpenDetail = (grupo) => {
    setSelectedGrupo(grupo);
    setIsDetailOpen(true);
    setActiveTab('overview');
    loadGrupoSemilleros(grupo.id);
  };

  const ActionMenu = ({ grupo }) => {
    const menuRef = useRef(null);
    useClickOutside(menuRef, () => menuOpenId === grupo.id && setMenuOpenId(null));

    if (menuOpenId !== grupo.id) return null;

    return (
      <div 
        ref={menuRef}
        className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/60 py-2 z-30 animate-scaleIn origin-top-right"
      >
        <button onClick={() => { setSelectedGrupo(grupo); setIsDetailOpen(true); setActiveTab('overview'); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors">
          <Info size={14} /> Ver Expediente
        </button>
        <button onClick={() => handleOpenMembers(grupo)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 transition-colors">
          <Users size={14} /> Gestionar Equipo
        </button>
        {currentUser?.rol === 'admin' && (
          <>
            <button onClick={() => handleOpenEdit(grupo)} className="w-full text-left px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition-colors border-t border-slate-100 mt-1 pt-2">
              <Edit2 size={14} /> Editar Información
            </button>
            <button onClick={() => handleDelete(grupo.id)} className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border-t border-slate-100 mt-1 pt-2">
              <Trash2 size={14} /> Eliminar Grupo
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20 print:p-0">

      {/* ─── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
            <Layers size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Grupos de Investigación</h1>
            <p className="text-sm text-slate-500 font-medium">Motores de generación de conocimiento del CGAO</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => window.print()} variant="outline" className="border-slate-200">
            <Download size={18} className="mr-2" /> Reporte Global
          </Button>
          <Button onClick={handleOpenCreate} variant="sena" className="shadow-lg shadow-emerald-200/50">
            <Plus size={18} className="mr-2" /> Nuevo Grupo
          </Button>
        </div>
      </div>

      {/* ─── Global Stats ─────────────────────────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
          <StatCard label="Grupos Activos" value={grupos.length} icon={Shield} colorCls="text-indigo-700" bgCls="bg-indigo-100" />
          <StatCard label="Investigadores" value={grupos.reduce((acc, g) => acc + (g.total_integrantes || 0), 0)} icon={Users} colorCls="text-emerald-700" bgCls="bg-emerald-100" />
          <StatCard label="Categoría A1/A" value={grupos.filter(g => ['A1', 'A'].includes(g.clasificacion)).length} icon={Award} colorCls="text-amber-700" bgCls="bg-amber-100" />
          <StatCard label="Producción Estimada" value={grupos.length * 12} icon={Zap} colorCls="text-blue-700" bgCls="bg-blue-100" />
        </div>
      )}

      {/* ─── Search ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, sigla o código Gruplac..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ─── Grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 print:hidden">
        {loading ? (
          Array(6).fill(0).map((_, i) => <GroupCardSkeleton key={i} />)
        ) : filtered.length > 0 ? (
          filtered.map(g => (
            <Card
              key={g.id}
              className="group hover:shadow-xl transition-all ring-1 ring-slate-200/60 hover:ring-indigo-400 overflow-hidden cursor-pointer border-0 flex flex-col focus-visible:outline-none relative"
            >
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === g.id ? null : g.id); }}
                  className="p-1.5 bg-white/80 backdrop-blur-md hover:bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <MoreVertical size={16} />
                </button>
                <ActionMenu grupo={g} />
              </div>

              <div className="p-6 flex-1" onClick={() => { setSelectedGrupo(g); setIsDetailOpen(true); setActiveTab('overview'); }}>
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                    <Layers size={24} />
                  </div>
                  <div className="text-right">
                    <Badge variant={['A1', 'A'].includes(g.clasificacion) ? 'success' : 'indigo'} className="font-black text-[10px]">
                      CAT. {g.clasificacion || 'S/C'}
                    </Badge>
                  </div>
                </div>

                <h3 className="font-black text-slate-900 text-lg leading-tight mb-2 group-hover:text-indigo-700 transition-colors">
                  {g.nombre}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-6 font-medium">
                  {g.nombre_completo || 'Grupo de investigación orientado a la innovación regional.'}
                </p>

                <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg"><Users size={14} /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Equipo</p>
                      <p className="text-sm font-black text-slate-700">{g.total_integrantes ?? 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg"><Star size={14} /></div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Semilleros</p>
                      <p className="text-sm font-black text-slate-700">{g.total_semilleros ?? 0}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between group-hover:bg-indigo-600 transition-all duration-300" onClick={() => { setSelectedGrupo(g); setIsDetailOpen(true); setActiveTab('overview'); }}>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-white transition-colors">Explorar Ecosistema</span>
                <div className="p-1 bg-white rounded-lg shadow-sm group-hover:bg-indigo-500 transition-colors">
                  <ArrowUpRight size={14} className="text-indigo-600 group-hover:text-white transition-colors" />
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <div className="p-4 bg-slate-100 rounded-full w-fit mx-auto mb-4 text-slate-300"><Layers size={48} /></div>
            <p className="text-slate-500 font-bold italic">No se encontraron grupos de investigación.</p>
          </div>
        )}
      </div>

      {/* ─── Detail Side-Over (with Stats) ────────────────────────────── */}
      {isDetailOpen && selectedGrupo && (
        <div className="fixed inset-0 z-[100] overflow-hidden print:static print:block print:overflow-visible">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fadeIn print:hidden" onClick={() => setIsDetailOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10 print:static print:block print:w-full print:pl-0">
            <div className="w-screen max-w-3xl bg-white shadow-2xl flex flex-col animate-slideInRight print:w-full print:max-w-none print:shadow-none print:static">

              {/* Header Detail */}
              <div className="px-8 py-8 border-b border-slate-100 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg ring-1 ring-white/30">
                      <Layers size={32} />
                    </div>
                    <div className="flex gap-2 print:hidden">
                      <button onClick={() => window.print()} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20"><Download size={20} /></button>
                      <button onClick={() => setIsDetailOpen(false)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all border border-white/20"><X size={20} /></button>
                    </div>
                  </div>
                  <h2 className="text-2xl font-black leading-tight mb-2">{selectedGrupo.nombre}</h2>
                  <p className="text-indigo-100 font-medium mb-4 text-sm opacity-90">{selectedGrupo.nombre_completo}</p>
                  <div className="flex gap-3">
                    <Badge variant="success" className="bg-emerald-400/20 text-emerald-100 border-emerald-400/30">VIGENTE</Badge>
                    <Badge variant="indigo" className="bg-white/20 text-white border-white/30 font-mono">CÓD: {selectedGrupo.codigo_gruplac || 'N/A'}</Badge>
                    <Badge variant="amber" className="bg-amber-400/20 text-amber-100 border-amber-400/30">CAT. {selectedGrupo.clasificacion}</Badge>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex px-8 border-b border-slate-100 bg-slate-50/50 print:hidden">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Información
                </button>
                <button 
                  onClick={() => setActiveTab('stats')}
                  className={`px-6 py-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${activeTab === 'stats' ? 'border-indigo-600 text-indigo-700 bg-white' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Estadísticas e Impacto
                </button>
              </div>

              {/* Body Detail */}
              <div className="flex-1 overflow-y-auto px-8 py-8 scrollbar-thin bg-white">
                {activeTab === 'overview' ? (
                  <div className="space-y-10 animate-fadeIn">
                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Target size={14} className="text-indigo-500" /> Líneas de Investigación
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedGrupo.lineas_investigacion ? (
                          (typeof selectedGrupo.lineas_investigacion === 'string' 
                            ? selectedGrupo.lineas_investigacion.split(',') 
                            : Array.isArray(selectedGrupo.lineas_investigacion)
                            ? selectedGrupo.lineas_investigacion
                            : []
                          ).map((l, i) => (
                            <span key={i} className="px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100 shadow-sm">
                              {typeof l === 'string' ? l.trim() : l}
                            </span>
                          ))
                        ) : (
                          <p className="text-sm text-slate-400 italic">No definidas aún.</p>
                        )}
                      </div>
                    </section>

                    <section className="grid grid-cols-2 gap-4">
                      <Card className="p-5 border-slate-100 shadow-sm bg-slate-50/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Capital Humano</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg"><Users size={18} /></div>
                            <span className="text-xl font-black text-slate-900">{selectedGrupo.total_integrantes}</span>
                          </div>
                          <button onClick={() => { setIsDetailOpen(false); handleOpenMembers(selectedGrupo); }} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Gestionar</button>
                        </div>
                      </Card>
                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Star size={14} className="text-amber-500" /> Semilleros Adscritos
                      </h3>
                      <div className="space-y-3">
                        {loadingSemilleros ? (
                          <div className="animate-pulse space-y-2">
                            <div className="h-10 bg-slate-100 rounded-xl" />
                            <div className="h-10 bg-slate-100 rounded-xl" />
                          </div>
                        ) : grupoSemilleros.length > 0 ? (
                          grupoSemilleros.map(sem => (
                            <div key={sem.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-amber-300 hover:shadow-sm transition-all group">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:scale-110 transition-transform">
                                  <Star size={16} fill="currentColor" className="opacity-50" />
                                </div>
                                <div>
                                  <p className="text-xs font-black text-slate-900 group-hover:text-amber-700 transition-colors">{sem.nombre}</p>
                                  <p className="text-[10px] text-slate-500 font-bold uppercase">{sem.sede} • {sem.estudiantes || 0} Aprendices</p>
                                </div>
                              </div>
                              <ChevronRight size={14} className="text-slate-300 group-hover:text-amber-500 group-hover:translate-x-1 transition-all" />
                            </div>
                          ))
                        ) : (
                          <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                            <p className="text-xs text-slate-400 font-medium italic">Sin semilleros vinculados actualmente</p>
                          </div>
                        )}
                      </div>
                    </section>
                    </section>

                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Info size={14} className="text-indigo-500" /> Perfil GrupLAC
                      </h3>
                      {selectedGrupo.gruplac_url ? (
                        <a
                          href={selectedGrupo.gruplac_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-between p-5 bg-white border-2 border-indigo-600/10 rounded-2xl hover:bg-indigo-50 transition-all group shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><Globe size={20} /></div>
                            <div>
                              <p className="text-sm font-black text-slate-900">Scienti - MinCiencias</p>
                              <p className="text-xs text-slate-500 font-medium">{selectedGrupo.codigo_gruplac}</p>
                            </div>
                          </div>
                          <ArrowUpRight size={20} className="text-indigo-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </a>
                      ) : (
                        <div className="p-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
                          <p className="text-xs text-slate-400 font-medium italic">Enlace a GrupLAC no configurado</p>
                        </div>
                      )}
                    </section>
                  </div>
                ) : (
                  <div className="space-y-10 animate-fadeIn">
                    {/* Simulated Stats */}
                    <div className="grid grid-cols-2 gap-6">
                      <section>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <PieChart size={14} className="text-indigo-500" /> Mix de Producción
                        </h3>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <RePie>
                              <Pie 
                                data={getMockStats(selectedGrupo).produccion} 
                                innerRadius={60} 
                                outerRadius={80} 
                                paddingAngle={5} 
                                dataKey="value"
                              >
                                {getMockStats(selectedGrupo).produccion.map((entry, index) => (
                                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </RePie>
                          </ResponsiveContainer>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                          <BarChart3 size={14} className="text-emerald-500" /> Cumplimiento de Metas
                        </h3>
                        <div className="h-64 flex flex-col justify-center items-center">
                           <div className="relative w-40 h-40">
                              <svg className="w-full h-full" viewBox="0 0 100 100">
                                <circle className="text-slate-100 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                                <circle className="text-emerald-500 stroke-current" strokeWidth="8" strokeLinecap="round" cx="50" cy="50" r="40" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - 0.85)}></circle>
                              </svg>
                              <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-slate-900">85%</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase">OE-2026</span>
                              </div>
                           </div>
                           <p className="mt-4 text-xs font-bold text-slate-500 italic text-center">Basado en el cumplimiento de entregables técnicos del periodo.</p>
                        </div>
                      </section>
                    </div>

                    <section>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <TrendingUp size={14} className="text-indigo-500" /> Evolución de Impacto Regional (Impact Score)
                      </h3>
                      <div className="h-56 bg-slate-50 rounded-2xl p-6 border border-slate-100">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={getMockStats(selectedGrupo).impacto_regional}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                            <YAxis hide />
                            <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                            <Bar dataKey="valor" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                    
                    <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                       <div className="flex items-center gap-3 mb-3">
                          <CheckCircle2 size={18} className="text-indigo-600" />
                          <h4 className="text-xs font-black text-indigo-900 uppercase">Conclusiones de Rendimiento</h4>
                       </div>
                       <p className="text-xs text-indigo-700/80 leading-relaxed">
                          El grupo presenta una tendencia de crecimiento sólida en la categoría **C**. Se recomienda fortalecer la vinculación de semilleros de investigación para aumentar el capital humano de base y aspirar a la categoría **B** en la próxima medición de MinCiencias.
                       </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Detail */}
              <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex gap-4 print:hidden">
                <Button className="flex-1" variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar Expediente</Button>
                {currentUser?.rol === 'admin' && (
                  <Button className="flex-1" variant="sena" onClick={() => handleOpenEdit(selectedGrupo)}>
                    <Edit2 size={16} className="mr-2" /> Actualizar Datos
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Form Modal ────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <Card className="w-full max-w-xl shadow-2xl animate-scaleIn overflow-hidden border-0">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-6 text-white relative">
              <button 
                onClick={() => setShowForm(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  {isEditing ? <Edit2 size={24} /> : <Zap size={24} />}
                </div>
                <div>
                  <h2 className="text-xl font-black">{isEditing ? 'Actualizar Grupo' : 'Nuevo Grupo de Investigación'}</h2>
                  <p className="text-indigo-100 text-xs font-medium opacity-80 uppercase tracking-widest mt-1">
                    Paso {formStep} de 3 • {formStep === 1 ? 'Identidad' : formStep === 2 ? 'Clasificación' : 'Conocimiento'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex h-1 bg-slate-100">
              <div className={`h-full bg-indigo-500 transition-all duration-500 ${formStep === 1 ? 'w-1/3' : formStep === 2 ? 'w-2/3' : 'w-full'}`} />
            </div>

            <div className="p-8 bg-white min-h-[360px] max-h-[60vh] overflow-y-auto scrollbar-thin">
              {formStep === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <Input label="Sigla o Nombre Corto" value={formData.nombre} onChange={patch('nombre')} placeholder="Ej: GIDTA" required />
                  <Input label="Nombre Completo Institucional" value={formData.nombre_completo} onChange={patch('nombre_completo')} placeholder="Ej: Grupo de Investigación en Tecnologías Aplicadas" required />
                  <Input label="Código GrupLAC" value={formData.codigo_gruplac} onChange={patch('codigo_gruplac')} placeholder="COL000XXXX" />
                </div>
              )}

              {formStep === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <Select label="Clasificación Minciencias" options={CLASIFICACIONES} value={formData.clasificacion} onChange={patch('clasificacion')} />
                  <Input label="URL Perfil GrupLAC" value={formData.gruplac_url} onChange={patch('gruplac_url')} placeholder="https://scienti.minciencias.gov.co/gruplac/..." />
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3">
                    <Award size={24} className="text-indigo-600" />
                    <div>
                      <p className="text-xs font-black text-indigo-800 uppercase tracking-tight">Categorización de Excelencia</p>
                      <p className="text-[10px] text-indigo-600 font-medium leading-tight">La clasificación impacta en la visibilidad y puntaje del Centro de Formación.</p>
                    </div>
                  </div>
                </div>
              )}

              {formStep === 3 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <TextArea 
                    label="Líneas de Investigación" 
                    value={formData.lineas_investigacion} 
                    onChange={patch('lineas_investigacion')} 
                    rows={5} 
                    placeholder="Ingrese las líneas separadas por comas (Ej: IA, Big Data, Agroindustria)" 
                  />
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-3">
                      <Globe size={20} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-tight">Perfil Público en Portal</span>
                    </div>
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 accent-emerald-600 rounded-lg" 
                      checked={formData.is_publico} 
                      onChange={e => setFormData({...formData, is_publico: e.target.checked})} 
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => formStep === 1 ? setShowForm(false) : setFormStep(s => s - 1)}
              >
                {formStep === 1 ? 'Cancelar' : 'Anterior'}
              </Button>
              <div className="flex gap-3">
                {formStep < 3 ? (
                  <Button 
                    variant="primary" 
                    onClick={() => setFormStep(s => s + 1)}
                    disabled={formStep === 1 && (!formData.nombre || !formData.nombre_completo)}
                  >
                    Siguiente <ChevronRight size={16} className="ml-2" />
                  </Button>
                ) : (
                  <Button variant="sena" onClick={handleSubmit}>
                    {isEditing ? 'Actualizar Información' : 'Registrar Grupo'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── Member Management Modal ───────────────────────────────────── */}
      {showMembers && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <Card className="w-full max-w-2xl relative z-10 animate-scaleIn flex flex-col max-h-[85vh] border-0 shadow-2xl overflow-hidden">
            <div className="px-8 py-6 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><Users size={24} /></div>
                <div>
                  <h2 className="text-xl font-black">Equipo de Investigación</h2>
                  <p className="text-emerald-100 text-xs font-medium opacity-80 uppercase tracking-widest mt-1">{selectedGrupo?.nombre}</p>
                </div>
              </div>
              <button onClick={() => setShowMembers(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-8 scrollbar-thin bg-white">
              <div className="space-y-8 relative">
                <div 
                  className={`bg-slate-50 p-6 rounded-[2rem] border-2 border-dashed transition-all relative ${dragOverGroup ? 'border-emerald-500 bg-emerald-50 scale-[1.02]' : 'border-slate-100'}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverGroup(true); }}
                  onDragLeave={() => setDragOverGroup(false)}
                  onDrop={handleGroupDrop}
                >
                  {/* Talent Pool Floating Sidebar for Group 2.0 */}
                  {isPoolVisible && (
                    <div className="absolute left-0 top-0 bottom-0 w-full sm:w-72 bg-white border-r border-slate-200 z-50 shadow-2xl flex flex-col animate-slideInLeft rounded-l-[2rem] overflow-hidden ring-1 ring-slate-200">
                      <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap size={14} className="text-emerald-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Talento Disponible</span>
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
                          .filter(u => !integrantes.some(m => m.id === u.id))
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

                  {/* Role/Hours Prompt Overlay for Group */}
                  {memberToLink && (
                    <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-fadeIn text-center rounded-[2rem]">
                      <div className="w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/10">
                        <Users size={32} />
                      </div>
                      <h4 className="text-sm font-black text-slate-900 mb-1">Vincular a {memberToLink.nombre}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Configuración de Rol</p>
                      
                      <div className="w-full max-w-xs space-y-4">
                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Rol en el Grupo</label>
                          <select 
                            value={linkingRole}
                            onChange={(e) => setLinkingRole(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                          >
                            {ROLES_GRUPO.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        </div>

                        <div className="flex gap-3 pt-4">
                          <Button variant="secondary" className="flex-1" onClick={() => setMemberToLink(null)}>Cancelar</Button>
                          <Button variant="sena" className="flex-1" onClick={async () => {
                            try {
                              await GruposAPI.addMember(selectedGrupo.id, { user_id: memberToLink.id, rol: linkingRole });
                              onNotify?.('Integrante vinculado correctamente', 'success');
                              setMemberToLink(null);
                              const m = await GruposAPI.getMembers(selectedGrupo.id);
                              setIntegrantes(m || []);
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
                    <div className="flex flex-col">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <UserPlus size={14} className="text-emerald-600" /> Vincular Integrante
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium">Busca o arrastra talento al grupo</p>
                    </div>
                    <Button 
                      onClick={() => setIsPoolVisible(!isPoolVisible)} 
                      variant={isPoolVisible ? "secondary" : "outline"}
                      size="xs"
                      className="text-[9px] font-black uppercase tracking-widest px-3 py-1.5"
                    >
                      {isPoolVisible ? 'Cerrar Directorio' : 'Abrir Talent Pool'}
                    </Button>
                  </div>
                  
                  <div className="flex flex-col gap-4">
                    <div className="p-5 bg-slate-900 rounded-2xl space-y-4 shadow-xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl -mr-12 -mt-12 transition-transform group-hover:scale-110" />
                      <div className="relative z-10 flex gap-3">
                        <div className="relative flex-1">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                            <Search size={16} />
                          </div>
                          <select 
                            className="w-full pl-11 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-xs font-bold text-white focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
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
                            <option value="">Buscar talento en el directorio CGAO...</option>
                            {usuarios.filter(u => !integrantes.some(m => m.id === u.id)).map(u => (
                              <option key={u.id} value={u.id}>{u.nombre} {u.ficha ? `(Aprendiz)` : '(Investigador)'}</option>
                            ))}
                          </select>
                        </div>
                        <div className="hidden sm:flex items-center px-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">
                          <Plus size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pb-10">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Activity size={14} /> Directorio de Integrantes ({integrantes.length})
                    </h4>
                  </div>
                  
                  {loadingMembers ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                      <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
                      <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Cargando equipo...</p>
                    </div>
                  ) : integrantes.length === 0 ? (
                    <div className="text-center py-16 bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
                      <Users size={48} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Sin investigadores vinculados</p>
                      <p className="text-[10px] text-slate-400 mt-1 italic">Use el buscador o el directorio de talento para vincular investigadores</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {integrantes.map(i => (
                        <div key={i.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-3xl hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg ${i.rol_en_grupo === 'Aprendiz' ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-500/20' : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20'}`}>
                              {i.nombre?.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors">{i.nombre}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={`text-[9px] border-slate-100 uppercase font-black tracking-tighter ${i.rol_en_grupo === 'Aprendiz' ? 'text-indigo-600 bg-indigo-50/50' : 'text-emerald-600 bg-emerald-50/50'}`}>
                                  {i.rol_en_grupo || 'Miembro'}
                                </Badge>
                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1 uppercase tracking-tighter">
                                  {i.email}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Desvincular a ${i.nombre}?`)) {
                                handleRemoveMember(i.id);
                              }
                            }} 
                            className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            title="Desvincular"
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
            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button variant="primary" onClick={() => setShowMembers(false)}>Cerrar Gestión</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GruposModule;
