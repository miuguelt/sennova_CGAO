import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Layers, Users, ExternalLink,
  Edit2, ChevronRight, X, Globe, Star,
  Loader2, Trash2, MoreVertical, Shield, Award, 
  Info, ArrowUpRight, Zap, UserPlus, Target
} from 'lucide-react';
import { GruposAPI, UsuariosAPI } from '../../api/index.js';
import useClickOutside from '../../hooks/useClickOutside.js';
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
  { value: 'Asesor', label: 'Asesor Externo' }
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
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [memberForm, setMemberForm] = useState({ user_id: '', rol: 'Investigador' });
  const [menuOpenId, setMenuOpenId] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [g, u] = await Promise.all([GruposAPI.list(), UsuariosAPI.list()]);
      setGrupos(g);
      setUsuarios(u);
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
    try {
      const m = await GruposAPI.getMembers(grupo.id);
      setIntegrantes(m);
    } catch {
      onNotify?.('Error al cargar integrantes', 'error');
    }
  };

  const handleAddMember = async () => {
    try {
      await GruposAPI.addMember(selectedGrupo.id, memberForm);
      onNotify?.('Investigador vinculado correctamente', 'success');
      setMemberForm({ user_id: '', rol: 'Investigador' });
      const m = await GruposAPI.getMembers(selectedGrupo.id);
      setIntegrantes(m);
      loadData();
    } catch (err) {
      onNotify?.('Error al vincular: ' + err.message, 'error');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!memberId) return;
    
    onNotify?.('Procesando desvinculación...', 'info');
    
    try {
      await GruposAPI.removeMember(selectedGrupo.id, memberId);
      onNotify?.('Investigador desvinculado exitosamente', 'success');
      const m = await GruposAPI.getMembers(selectedGrupo.id);
      setIntegrantes(m);
      loadData();
    } catch (err) {
      console.error('Error removeMember:', err);
      onNotify?.('Error al desvincular: ' + (err.message || 'Error desconocido'), 'error');
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

  const filtered = grupos.filter(g =>
    g.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.codigo_gruplac?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const ActionMenu = ({ grupo }) => {
    const menuRef = useRef(null);
    useClickOutside(menuRef, () => menuOpenId === grupo.id && setMenuOpenId(null));

    if (menuOpenId !== grupo.id) return null;

    return (
      <div 
        ref={menuRef}
        className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/60 py-2 z-30 animate-scaleIn origin-top-right"
      >
        <button onClick={() => { setSelectedGrupo(grupo); setIsDetailOpen(true); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors">
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
    <div className="space-y-6 animate-fadeIn pb-20">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
            <Layers size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Grupos de Investigación</h1>
            <p className="text-sm text-slate-500 font-medium">Motores de generación de conocimiento del CGAO</p>
          </div>
        </div>
        <Button onClick={handleOpenCreate} variant="sena" className="shadow-lg shadow-emerald-200/50">
          <Plus size={18} className="mr-2" /> Nuevo Grupo
        </Button>
      </div>

      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Grupos Activos" value={grupos.length} icon={Shield} colorCls="text-indigo-700" bgCls="bg-indigo-100" />
          <StatCard label="Investigadores" value={grupos.reduce((acc, g) => acc + (g.total_integrantes || 0), 0)} icon={Users} colorCls="text-emerald-700" bgCls="bg-emerald-100" />
          <StatCard label="Categoría A1/A" value={grupos.filter(g => ['A1', 'A'].includes(g.clasificacion)).length} icon={Award} colorCls="text-amber-700" bgCls="bg-amber-100" />
          <StatCard label="Semilleros" value={grupos.reduce((acc, g) => acc + (g.total_semilleros || 0), 0)} icon={Star} colorCls="text-blue-700" bgCls="bg-blue-100" />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

              <div className="p-6 flex-1" onClick={() => { setSelectedGrupo(g); setIsDetailOpen(true); }}>
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

              <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between group-hover:bg-indigo-600 transition-all duration-300" onClick={() => { setSelectedGrupo(g); setIsDetailOpen(true); }}>
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

      {isDetailOpen && selectedGrupo && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fadeIn" onClick={() => setIsDetailOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col animate-slideInRight">

              <div className="px-8 py-8 border-b border-slate-100 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg ring-1 ring-white/30">
                      <Layers size={32} />
                    </div>
                    <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
                  </div>
                  <h2 className="text-2xl font-black leading-tight mb-2">{selectedGrupo.nombre}</h2>
                  <div className="flex gap-3">
                    <Badge variant="success" className="bg-emerald-400/20 text-emerald-100 border-emerald-400/30">VIGENTE</Badge>
                    <Badge variant="indigo" className="bg-white/20 text-white border-white/30 font-mono">CÓD: {selectedGrupo.codigo_gruplac || 'N/A'}</Badge>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-thin">
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
                        <span key={i} className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-100">
                          {typeof l === 'string' ? l.trim() : l}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-slate-400 italic">No definidas aún.</p>
                    )}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Users size={14} className="text-emerald-500" /> Capital Humano
                    </h3>
                    <Badge variant="indigo" className="px-3">{selectedGrupo.total_integrantes} Integrantes</Badge>
                  </div>
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 border-dashed text-center">
                    <p className="text-sm text-slate-500 font-medium mb-4">Gestione los investigadores vinculados a este núcleo de investigación.</p>
                    <Button 
                      variant="outline" 
                      className="w-full bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                      onClick={() => { setIsDetailOpen(false); handleOpenMembers(selectedGrupo); }}
                    >
                      Ver Directorio del Grupo
                    </Button>
                  </div>
                </section>

                {selectedGrupo.gruplac_url && (
                  <a
                    href={selectedGrupo.gruplac_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-5 bg-white border-2 border-indigo-600/10 rounded-2xl hover:bg-indigo-50 transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100"><Globe size={20} /></div>
                      <div>
                        <p className="text-sm font-black text-slate-900">Plataforma GrupLAC</p>
                        <p className="text-xs text-slate-500 font-medium">Consulte el perfil oficial en MinCiencias</p>
                      </div>
                    </div>
                    <ArrowUpRight size={20} className="text-indigo-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </a>
                )}
              </div>

              <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                <Button className="flex-1" variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
                {currentUser?.rol === 'admin' && (
                  <Button className="flex-1" variant="sena" onClick={() => handleOpenEdit(selectedGrupo)}>
                    <Edit2 size={16} className="mr-2" /> Editar Grupo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-5">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <UserPlus size={14} className="text-emerald-600" /> Vincular Nuevo Integrante
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select 
                    label="Seleccionar Investigador"
                    options={usuarios.map(u => ({ value: u.id, label: u.nombre }))}
                    value={memberForm.user_id}
                    onChange={e => setMemberForm({...memberForm, user_id: e.target.value})}
                  />
                  <Select 
                    label="Rol en el Grupo"
                    options={ROLES_GRUPO}
                    value={memberForm.rol}
                    onChange={e => setMemberForm({...memberForm, rol: e.target.value})}
                  />
                </div>
                <Button variant="sena" className="w-full py-3 shadow-lg shadow-emerald-200/50" onClick={handleAddMember} disabled={!memberForm.user_id}>
                  Vincular al Ecosistema del Grupo
                </Button>
              </div>

                <div className="space-y-3 pb-10">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Directorio de Integrantes ({integrantes.length})</h4>
                  {integrantes.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-100">
                      <Users size={32} className="mx-auto text-slate-300 mb-3" />
                      <p className="text-slate-400 font-bold text-sm italic">No hay investigadores vinculados.</p>
                    </div>
                  ) : (
                    integrantes.map(i => (
                      <div key={i.id} className="group flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-300 hover:shadow-md transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-sm">
                            {i.nombre?.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors">{i.nombre}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                              {i.email} • <span className="text-emerald-600">{i.rol_en_grupo}</span>
                            </p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Desvincular a ${i.nombre}?`)) {
                              handleRemoveMember(i.id);
                            }
                          }} 
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all z-20"
                          title="Desvincular"
                        >
                          <Trash2 size={18} className="pointer-events-none" />
                        </button>
                      </div>
                    ))
                  )}
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
