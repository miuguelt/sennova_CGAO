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
import Modal from '../ui/Modal';
import Drawer from '../ui/Drawer';
import ConfirmDialog from '../ui/ConfirmDialog';

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
  <Card className="p-5 border border-slate-200/80 shadow-sm overflow-hidden relative group transition-all hover:shadow-md bg-white">
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
  const [semilleros, setSemilleros] = useState([]);
  const [grupoStats, setGrupoStats] = useState(null);
  const [loadingSemilleros, setLoadingSemilleros] = useState(false);
  const [isPoolVisible,    setIsPoolVisible]    = useState(false);
  const [dragOverGroup,     setDragOverGroup]     = useState(false);
  const [talentTab,        setTalentTab]        = useState('investigadores');
  const [memberToLink,     setMemberToLink]     = useState(null);
  const [linkingRole,      setLinkingRole]      = useState('Investigador');
  
  // Tabs & Stats
  const [activeTab, setActiveTab] = useState('overview');

  // Confirmation dialogs
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });
  const [removeMemberConfirm, setRemoveMemberConfirm] = useState({ isOpen: false, id: null, name: '' });

  useEffect(() => { loadData(true); }, []);

  const loadData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [g, u, sems] = await Promise.all([
        GruposAPI.list(),
        UsuariosAPI.list(),
        SemillerosAPI.list().catch(() => [])
      ]);
      const gList = g || [];
      setGrupos(gList);
      setUsuarios(u || []);
      setSemilleros(sems || []);
      setSelectedGrupo(prev => {
        if (!prev) return null;
        const updated = gList.find(x => x.id === prev.id);
        return updated ? { ...prev, ...updated } : prev;
      });
    } catch (err) {
      onNotify?.('Error al cargar datos: ' + err.message, 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
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
    setMenuOpenId(null);
  };

  const handleSubmit = async () => {
    try {
      if (isEditing) {
        await GruposAPI.update(formData.id, formData);
        onNotify?.('Grupo institucional actualizado', 'success');
        if (selectedGrupo?.id === formData.id) {
          setSelectedGrupo(prev => ({ ...prev, ...formData }));
        }
      } else {
        await GruposAPI.create(formData);
        onNotify?.('Grupo institucional registrado exitosamente', 'success');
      }
      setShowForm(false);
      await loadData(false);
    } catch (err) {
      onNotify?.('Error al guardar grupo: ' + err.message, 'error');
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirm.id) return;
    try {
      await GruposAPI.delete(deleteConfirm.id);
      onNotify?.('Grupo institucional eliminado', 'success');
      setDeleteConfirm({ isOpen: false, id: null });
      if (selectedGrupo?.id === deleteConfirm.id) {
        setIsDetailOpen(false);
      }
      await loadData(false);
    } catch (err) {
      onNotify?.('Error al eliminar grupo: ' + err.message, 'error');
    }
  };

  const handleOpenMembers = async (grupo) => {
    setSelectedGrupo(grupo);
    setShowMembers(true);
    setLoadingMembers(true);
    setMenuOpenId(null);
    try {
      const data = await GruposAPI.getMembers(grupo.id);
      setIntegrantes(data || []);
    } catch (err) {
      onNotify?.('Error al cargar integrantes: ' + err.message, 'error');
    }
    setLoadingMembers(false);
  };

  const handleOpenDetail = async (grupo) => {
    setSelectedGrupo(grupo);
    setIsDetailOpen(true);
    setActiveTab('overview');
    setLoadingSemilleros(true);
    try {
      const [m, sems, stats] = await Promise.all([
        GruposAPI.getMembers(grupo.id).catch(() => []),
        SemillerosAPI.list().catch(() => []),
        GruposAPI.getStats(grupo.id).catch(() => null)
      ]);
      setIntegrantes(m || []);
      setGrupoSemilleros((sems || []).filter(s => s.grupo_id === grupo.id || s.grupo?.id === grupo.id));
      setGrupoStats(stats || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSemilleros(false);
    }
  };

  const handleAddMember = async () => {
    if (!memberForm.user_id) return;
    try {
      await GruposAPI.addMember(selectedGrupo.id, memberForm);
      onNotify?.('Integrante vinculado correctamente', 'success');
      setMemberForm({ user_id: '', rol: 'Investigador' });
      const data = await GruposAPI.getMembers(selectedGrupo.id);
      setIntegrantes(data || []);
      await loadData(false);
    } catch (err) {
      onNotify?.('Error al vincular: ' + err.message, 'error');
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await GruposAPI.removeMember(selectedGrupo.id, userId);
      onNotify?.('Integrante desvinculado correctamente', 'success');
      const data = await GruposAPI.getMembers(selectedGrupo.id);
      setIntegrantes(data || []);
      await loadData(false);
    } catch (err) {
      onNotify?.('Error al desvincular: ' + err.message, 'error');
    }
  };

  const handleGroupDrop = async (e) => {
    e.preventDefault();
    setDragOverGroup(false);
    const userId = e.dataTransfer.getData('userId');
    if (!userId || !selectedGrupo) return;

    try {
      await GruposAPI.addMember(selectedGrupo.id, {
        user_id: userId,
        rol: talentTab === 'aprendices' ? 'Aprendiz' : 'Investigador'
      });
      onNotify?.('Talento vinculado al grupo exitosamente', 'success');
      const m = await GruposAPI.getMembers(selectedGrupo.id);
      setIntegrantes(m || []);
      await loadData(false);
    } catch (err) {
      onNotify?.('Error al vincular talento: ' + err.message, 'error');
    }
  };

  const handleDragUserStart = (e, user) => {
    e.dataTransfer.setData('userId', user.id);
  };

  const patch = (key) => (e) => setFormData({ ...formData, [key]: e.target.value });

  const filtered = grupos.filter(g =>
    (g.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.codigo_gruplac || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.nombre_completo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const semillerosAdscritos = semilleros.filter(s => s.grupo_id || s.grupo?.id).length;

  const categoriaMaxima = (() => {
    const presentes = [...new Set(grupos.map(g => g.clasificacion).filter(Boolean))];
    if (!presentes.length) return 'S.C.';
    return presentes.sort((a, b) => CLASIFICACIONES.findIndex(c => c.value === a) - CLASIFICACIONES.findIndex(c => c.value === b))[0];
  })();

  const DRAWER_TABS = [
    { id: 'overview', label: 'Información', icon: Info },
    { id: 'stats', label: 'Estadísticas e Impacto', icon: BarChart3 },
    { id: 'members', label: 'Equipo', icon: Users, count: integrantes.length },
    { id: 'semilleros', label: 'Semilleros', icon: Target, count: grupoSemilleros.length }
  ];

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      
      {/* ─── Header Section ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-3xl border border-white shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
            <Layers size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Grupos de Investigación</h1>
            <p className="text-slate-500 font-medium mt-1">Estructura matriz de I+D+i del Centro de Gestión Agroempresarial del Oriente</p>
          </div>
        </div>
        
        {currentUser?.rol === 'admin' && (
          <Button onClick={handleOpenCreate} variant="sena" className="h-12 px-8 shadow-xl shadow-indigo-500/20">
            <Plus size={20} className="mr-2" /> Nuevo Grupo
          </Button>
        )}
      </div>

      {/* ─── Metrics Summary ───────────────────────────────────────────── */}      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Grupos Institucionales" value={grupos.length} icon={Layers} colorCls="text-indigo-600" bgCls="bg-indigo-100" />
        <StatCard label="Investigadores Matriz" value={grupos.reduce((acc, g) => acc + (g.total_investigadores || 0), 0)} icon={Users} colorCls="text-emerald-600" bgCls="bg-emerald-100" />
        <StatCard label="Categoría Máxima" value={categoriaMaxima} icon={Award} colorCls="text-amber-600" bgCls="bg-amber-100" />
        <StatCard label="Semilleros Adscritos" value={semillerosAdscritos} icon={Target} colorCls="text-rose-600" bgCls="bg-rose-100" />
      </div>

      {/* ─── Search and Filters ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por sigla, nombre completo o código GrupLAC..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* ─── Groups Grid ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => <GroupCardSkeleton key={i} />)
        ) : filtered.length > 0 ? (
          filtered.map(grupo => (
            <Card 
              key={grupo.id}
              className="p-6 border-0 shadow-sm ring-1 ring-slate-200/60 hover:shadow-xl hover:ring-indigo-500/30 transition-all duration-300 group flex flex-col justify-between cursor-pointer bg-white"
              onClick={() => handleOpenDetail(grupo)}
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="p-3.5 bg-indigo-50 text-indigo-700 rounded-2xl group-hover:scale-105 transition-transform">
                    <Layers size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="indigo" className="font-mono text-[10px] font-black">
                      CAT. {grupo.clasificacion || 'S.C.'}
                    </Badge>
                    {currentUser?.rol === 'admin' && (
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === grupo.id ? null : grupo.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                          <MoreVertical size={16} />
                        </button>
                        {menuOpenId === grupo.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-30 animate-scaleIn">
                            <button onClick={() => handleOpenEdit(grupo)} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Edit2 size={14} /> Editar Datos</button>
                            <button onClick={() => handleOpenMembers(grupo)} className="w-full px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Users size={14} /> Gestionar Equipo</button>
                            <div className="my-1 border-t border-slate-100" />
                            <button onClick={() => handleDelete(grupo.id)} className="w-full px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"><Trash2 size={14} /> Eliminar Grupo</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors leading-tight mb-2">
                  {grupo.nombre}
                </h3>
                <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-6">
                  {grupo.nombre_completo || 'Sin nombre institucional registrado.'}
                </p>

                <div className="space-y-2 mb-6 bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-400 font-medium">GrupLAC:</span> <span className="font-mono text-slate-700">{grupo.codigo_gruplac || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-400 font-medium">Integrantes:</span> <span className="text-indigo-600 font-black">{grupo.total_investigadores || 0} asignados</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">Ver Expediente Completo <ArrowUpRight size={14} /></span>
                {grupo.gruplac_url && (
                  <a
                    href={grupo.gruplac_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                    title="Minciencias Scienti"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
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

      {/* ─── Detail Drawer (Estandarizado en Pila) ────────────────────── */}
      <Drawer
        isOpen={isDetailOpen && !!selectedGrupo}
        onClose={() => setIsDetailOpen(false)}
        size="xl"
        variant="indigo"
        icon={Layers}
        title={selectedGrupo?.nombre}
        subtitle={selectedGrupo?.nombre_completo}
        badge={
          selectedGrupo && (
            <div className="flex flex-wrap gap-2">
              <Badge variant="success" className="bg-emerald-400/20 text-emerald-100 border-emerald-400/30">VIGENTE</Badge>
              <Badge variant="indigo" className="bg-white/20 text-white border-white/30 font-mono">CÓD: {selectedGrupo.codigo_gruplac || 'N/A'}</Badge>
              <Badge variant="amber" className="bg-amber-400/20 text-amber-100 border-amber-400/30">CAT. {selectedGrupo.clasificacion}</Badge>
            </div>
          )
        }
        headerActions={
          selectedGrupo && (
            <div className="flex gap-2">
              <button 
                onClick={() => window.print()} 
                className="p-2.5 bg-white/90 hover:bg-white text-slate-600 rounded-xl shadow-sm border border-slate-200 transition-all"
                title="Imprimir Expediente"
              >
                <Download size={18} />
              </button>
              {currentUser?.rol === 'admin' && (
                <button 
                  onClick={() => handleOpenEdit(selectedGrupo)} 
                  className="p-2.5 bg-white/90 hover:bg-white text-indigo-600 rounded-xl shadow-sm border border-indigo-100 transition-all"
                  title="Editar Grupo"
                >
                  <Edit2 size={18} />
                </button>
              )}
            </div>
          )
        }
        tabs={DRAWER_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button className="flex-1" variant="outline" onClick={() => setIsDetailOpen(false)}>
              Cerrar Expediente
            </Button>
            {currentUser?.rol === 'admin' && (
              <Button className="flex-1" variant="sena" onClick={() => handleOpenEdit(selectedGrupo)}>
                <Edit2 size={16} className="mr-2" /> Actualizar Datos
              </Button>
            )}
          </div>
        }
      >
        {selectedGrupo && activeTab === 'overview' && (
          <div className="space-y-10 animate-fadeIn">
            <section>
              <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Target size={14} className="text-indigo-600" /> Líneas de Investigación
              </h3>
              <div className="flex flex-wrap gap-2">
                {selectedGrupo.lineas_investigacion ? (
                  (typeof selectedGrupo.lineas_investigacion === 'string' 
                    ? selectedGrupo.lineas_investigacion.split(',') 
                    : Array.isArray(selectedGrupo.lineas_investigacion)
                    ? selectedGrupo.lineas_investigacion
                    : []
                  ).map((l, i) => (
                    <span key={i} className="px-4 py-2 bg-indigo-50 text-indigo-800 rounded-xl text-xs font-bold border border-indigo-200 shadow-sm">
                      {typeof l === 'string' ? l.trim() : l}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 italic font-medium">No definidas aún.</p>
                )}
              </div>
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <p className="text-[10px] font-black text-slate-700 uppercase mb-2">Clasificación Minciencias</p>
                <p className="font-black text-slate-900 text-xl">Categoría {selectedGrupo.clasificacion || 'S.C.'}</p>
                <p className="text-xs text-emerald-800 font-bold mt-1">Convocatoria Nacional 957</p>
              </div>
              <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <p className="text-[10px] font-black text-slate-700 uppercase mb-2">Investigadores Asignados</p>
                <p className="font-black text-indigo-700 text-xl">{integrantes.length || selectedGrupo.total_investigadores || 0}</p>
                <p className="text-xs text-slate-600 font-bold mt-1">Directorio Activo</p>
              </div>
            </section>
          </div>
        )}

        {selectedGrupo && activeTab === 'stats' && (
          <div className="space-y-8 animate-fadeIn">
            <section>
              <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-6 flex items-center gap-2">
                <PieChart size={14} className="text-indigo-600" /> Distribución de Producción
              </h3>
              {grupoStats?.produccion?.some(p => p.value > 0) ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePie>
                      <Pie 
                        data={grupoStats.produccion.filter(p => p.value > 0)} 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="value"
                      >
                        {grupoStats.produccion.filter(p => p.value > 0).map((entry, index) => (
                          <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePie>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                  <Award size={36} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs text-slate-500 font-bold">Sin productos Minciencias registrados para este grupo</p>
                  <p className="text-[10px] text-slate-400 mt-1 italic">La distribución de producción se calculará al vincular productos a sus proyectos.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {selectedGrupo && activeTab === 'members' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Activity size={14} /> Equipo de Trabajo ({integrantes.length})
              </h4>
              {currentUser?.rol === 'admin' && (
                <Button size="xs" variant="outline" onClick={() => handleOpenMembers(selectedGrupo)}>
                  <UserPlus size={14} className="mr-1" /> Gestionar
                </Button>
              )}
            </div>

            {integrantes.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                <Users size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-400 font-bold">Sin miembros asignados a este grupo</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {integrantes.map(i => (
                  <div key={i.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 transition-all shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                        {i.nombre?.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{i.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{i.rol_en_grupo || 'Miembro'} • {i.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedGrupo && activeTab === 'semilleros' && (
          <div className="space-y-4 animate-fadeIn">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Target size={14} /> Semilleros Vinculados ({grupoSemilleros.length})
            </h4>
            {grupoSemilleros.length === 0 ? (
              <div className="text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                <Target size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-400 font-bold">Sin semilleros vinculados a este grupo</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {grupoSemilleros.map(s => (
                  <div key={s.id} className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 transition-all flex items-center justify-between shadow-sm">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{s.nombre}</p>
                      <p className="text-[10px] text-slate-400 font-mono uppercase">{s.codigo || 'S-2026'} • {s.total_aprendices || 0} Aprendices</p>
                    </div>
                    <Badge variant="emerald">{s.estado || 'Activo'}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ─── Create/Edit Modal (Estandarizado en Pila) ────────────────── */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        size="lg"
        variant="indigo"
        icon={isEditing ? Edit2 : Zap}
        title={isEditing ? 'Actualizar Grupo' : 'Nuevo Grupo de Investigación'}
        subtitle={`Paso ${formStep} de 3 • ${formStep === 1 ? 'Identidad' : formStep === 2 ? 'Clasificación' : 'Conocimiento'}`}
        footer={
          <div className="flex justify-between items-center w-full">
            <Button 
              variant="outline" 
              onClick={() => formStep === 1 ? setShowForm(false) : setFormStep(s => s - 1)}
            >
              {formStep === 1 ? 'Cancelar' : 'Anterior'}
            </Button>
            <div>
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
        }
      >
        <div className="flex h-1.5 bg-slate-100 rounded-full mb-6 overflow-hidden">
          <div className={`h-full bg-indigo-600 transition-all duration-500 ${formStep === 1 ? 'w-1/3' : formStep === 2 ? 'w-2/3' : 'w-full'}`} />
        </div>

        {formStep === 1 && (
          <div className="space-y-5 animate-fadeIn">
            <Input label="Sigla o Nombre Corto" value={formData.nombre} onChange={patch('nombre')} placeholder="Ej: GIDTA" required />
            <Input label="Nombre Completo Institucional" value={formData.nombre_completo} onChange={patch('nombre_completo')} placeholder="Ej: Grupo de Investigación en Tecnologías Aplicadas" required />
            <Input label="Código GrupLAC" value={formData.codigo_gruplac} onChange={patch('codigo_gruplac')} placeholder="COL000XXXX" />
          </div>
        )}

        {formStep === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <Select label="Clasificación Minciencias" options={CLASIFICACIONES} value={formData.clasificacion} onChange={patch('clasificacion')} />
            <Input label="URL Perfil GrupLAC" value={formData.gruplac_url} onChange={patch('gruplac_url')} placeholder="https://scienti.minciencias.gov.co/gruplac/..." />
            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex items-center gap-3">
              <Award size={24} className="text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs font-black text-indigo-800 uppercase tracking-tight">Categorización de Excelencia</p>
                <p className="text-[10px] text-indigo-600 font-medium leading-tight">La clasificación impacta en la visibilidad y puntaje del Centro de Formación.</p>
              </div>
            </div>
          </div>
        )}

        {formStep === 3 && (
          <div className="space-y-5 animate-fadeIn">
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
      </Modal>

      {/* ─── Member Management Modal (Estandarizado en Pila) ───────────── */}
      <Modal
        isOpen={showMembers}
        onClose={() => setShowMembers(false)}
        size="xl"
        variant="emerald"
        icon={Users}
        title="Equipo de Investigación"
        subtitle={selectedGrupo?.nombre}
        footer={
          <Button variant="primary" onClick={() => setShowMembers(false)}>
            Cerrar Gestión
          </Button>
        }
      >
        <div className="space-y-8 relative">
          <div 
            className={`bg-slate-50 p-6 rounded-3xl border-2 border-dashed transition-all relative ${dragOverGroup ? 'border-emerald-500 bg-emerald-50 scale-[1.02]' : 'border-slate-100'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOverGroup(true); }}
            onDragLeave={() => setDragOverGroup(false)}
            onDrop={handleGroupDrop}
          >
            {/* Talent Pool Floating Sidebar */}
            {isPoolVisible && (
              <div className="absolute left-0 top-0 bottom-0 w-full sm:w-72 bg-white border-r border-slate-200 z-50 shadow-2xl flex flex-col animate-slideInLeft rounded-l-3xl overflow-hidden ring-1 ring-slate-200">
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Talento Disponible</span>
                  </div>
                  <button onClick={() => setIsPoolVisible(false)} className="p-1 hover:bg-white/10 rounded-lg"><X size={14} /></button>
                </div>

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
                    .filter(u => talentTab === 'aprendices' ? u.rol === 'aprendiz' : u.rol !== 'aprendiz')
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

            {/* Role Prompt Overlay */}
            {memberToLink && (
              <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-fadeIn text-center rounded-3xl">
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
                          setLinkingRole(u.rol === 'aprendiz' ? 'Aprendiz' : 'Investigador');
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

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Activity size={14} /> Directorio de Integrantes ({integrantes.length})
            </h4>
            
            {loadingMembers ? (
              <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                <Loader2 size={48} className="text-indigo-500 animate-spin mb-4" />
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Cargando equipo...</p>
              </div>
            ) : integrantes.length === 0 ? (
              <div className="text-center py-16 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
                <Users size={48} className="mx-auto text-slate-200 mb-4" />
                <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Sin investigadores vinculados</p>
                <p className="text-[10px] text-slate-400 mt-1 italic">Use el buscador o el directorio de talento para vincular investigadores</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {integrantes.map(i => (
                  <div key={i.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all duration-300">
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
                      onClick={() => setRemoveMemberConfirm({ isOpen: true, id: i.id, name: i.nombre })} 
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
      </Modal>

      {/* ─── Confirm Delete Dialog ─────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDeleteAction}
        title="¿Eliminar Grupo de Investigación?"
        description="Esta acción eliminará el grupo institucional de investigación. No se puede revertir."
        confirmText="Sí, Eliminar Grupo"
        variant="danger"
      />

      {/* ─── Confirm Remove Member Dialog ──────────────────────────────── */}
      <ConfirmDialog
        isOpen={removeMemberConfirm.isOpen}
        onClose={() => setRemoveMemberConfirm({ isOpen: false, id: null, name: '' })}
        onConfirm={async () => {
          await handleRemoveMember(removeMemberConfirm.id);
          setRemoveMemberConfirm({ isOpen: false, id: null, name: '' });
        }}
        title="¿Desvincular Integrante?"
        description={`¿Estás seguro de que deseas desvincular a ${removeMemberConfirm.name} del grupo?`}
        confirmText="Desvincular"
        variant="danger"
      />

    </div>
  );
};

export default GruposModule;
