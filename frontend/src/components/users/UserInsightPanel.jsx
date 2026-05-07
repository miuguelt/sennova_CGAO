import React, { useState, useEffect } from 'react';
import { 
  X, Mail, MapPin, GraduationCap, ExternalLink, Activity, 
  ChevronRight, Calendar, User, Shield, Briefcase, Trophy, 
  DollarSign, Target, Info, Users, Save, RotateCcw, Trash2, Loader2, Plus, Edit3
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart as RePie, Pie
} from 'recharts';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import { DashboardAPI as StatsAPI } from '../../api/dashboard';
import { ProyectosAPI } from '../../api/proyectos';
import { SemillerosAPI } from '../../api/semilleros';
import { ReportesAPI } from '../../api/reportes';

const UserInsightPanel = ({ user, isOpen, onClose, onNotify }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ ...user });
  const [saving, setSaving] = useState(false);
  
  // Estado para el detalle anidado y su edición
  const [nestedDetail, setNestedDetail] = useState(null); 
  const [isEditingNested, setIsEditingNested] = useState(false);
  const [editBuffer, setEditBuffer] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkType, setLinkType] = useState(null); // 'proyecto', 'producto', 'semillero'
  const [availableItems, setAvailableItems] = useState([]);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
  const loadStats = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await StatsAPI.getUserImpact(user.id);
      setStats(data);
    } catch (err) {
      console.error("Error loading user impact:", err);
      onNotify?.('Error al cargar estadísticas de impacto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { UsuariosAPI } = await import('../../api/usuarios');
      await UsuariosAPI.update(user.id, editData);
      onNotify?.('Datos actualizados correctamente', 'success');
      setEditMode(false);
      // Recargar datos si es necesario (el padre debería refrescar si el objeto user cambió)
    } catch (err) {
      onNotify?.('Error al actualizar: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen && user?.id) {
      loadStats();
      setEditData({ ...user });
      setActiveTab('overview');
      setConfirmDeleteId(null);
    }
  }, [isOpen, user?.id]);

  const handleSaveNested = () => {
    const updatedStats = { ...stats };
    const listKey = `${nestedDetail.type}s_lista`;
    
    if (updatedStats[listKey]) {
      updatedStats[listKey] = updatedStats[listKey].map(item => 
        item.id === editBuffer.id ? editBuffer : item
      );
      setStats(updatedStats);
    }
    
    setNestedDetail({ ...nestedDetail, data: editBuffer });
    setIsEditingNested(false);
  };

  const startEditing = () => {
    setEditBuffer({ ...nestedDetail.data });
    setIsEditingNested(true);
  };
  const handleDeleteNested = () => {
    if (confirmDeleteId === nestedDetail.data.id) {
      const updatedStats = { ...stats };
      const listKey = `${nestedDetail.type}s_lista`;
      const countKey = `${nestedDetail.type}s_count`;
      
      if (updatedStats[listKey]) {
        updatedStats[listKey] = updatedStats[listKey].filter(item => item.id !== nestedDetail.data.id);
        if (updatedStats[countKey] > 0) updatedStats[countKey] -= 1;
        setStats(updatedStats);
      }
      
      setNestedDetail(null);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(nestedDetail.data.id);
    }
  };

  const handleOpenLink = async (type) => {
    setLinkType(type);
    setAvailableItems([]);
    setShowLinkModal(true);
    setLinking(true);
    try {
      let items = [];
      if (type === 'proyecto') {
        const all = await ProyectosAPI.list();
        items = all.filter(p => !stats.proyectos_lista?.some(up => up.id === p.id));
      } else if (type === 'semillero') {
        const all = await SemillerosAPI.list();
        items = all.filter(s => !stats.semilleros_lista?.some(us => us.id === s.id));
      }
      setAvailableItems(items);
    } catch (err) {
      onNotify?.('Error al cargar items vinculables', 'error');
    }
    setLinking(false);
  };

  const handleLinkItem = async (itemId) => {
    try {
      if (linkType === 'proyecto') {
        await ProyectosAPI.addEquipo(itemId, user.id, 'Investigador', 20);
      } else if (linkType === 'semillero') {
        await SemillerosAPI.addAprendiz(itemId, { 
          nombre: user.nombre, 
          email: user.email,
          documento: 'S/D',
          ficha: 'N/A',
          programa: 'N/A'
        });
      }
      onNotify?.('Vinculación exitosa', 'success');
      setShowLinkModal(false);
      loadStats();
    } catch (err) {
      onNotify?.('Error al vincular: ' + err.message, 'error');
    }
  };

  if (!isOpen) return null;

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6'];
  const formatCurrency = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);

  const TabButton = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 ${
        activeTab === id 
          ? 'border-emerald-600 text-emerald-700 bg-emerald-50/30' 
          : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  const NestedDetailModal = () => {
    if (!nestedDetail) return null;
    const { type, data } = nestedDetail;

    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => !isEditingNested && setNestedDetail(null)} />
        <Card variant="elevated" className="w-full max-w-xl animate-scaleIn relative z-[260] overflow-hidden">
          
          <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between ${isEditingNested ? 'bg-amber-50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                {type === 'proyecto' && <Briefcase className={isEditingNested ? 'text-amber-600' : 'text-emerald-600'} size={20} />}
                {type === 'producto' && <Package className={isEditingNested ? 'text-amber-600' : 'text-blue-600'} size={20} />}
                {type === 'semillero' && <GraduationCap className={isEditingNested ? 'text-amber-600' : 'text-violet-600'} size={20} />}
              </div>
              <div>
                {isEditingNested ? (
                   <input className="text-lg font-black text-slate-900 bg-transparent border-b-2 border-amber-300 focus:outline-none" value={editBuffer.nombre} onChange={e => setEditBuffer({...editBuffer, nombre: e.target.value})} />
                ) : (
                  <h3 className="text-lg font-black text-slate-900">{data.nombre}</h3>
                )}
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{isEditingNested ? `Editando ${type}` : `Detalle de ${type}`}</p>
              </div>
            </div>
            {!isEditingNested && (
              <Button variant="ghost" size="icon" onClick={() => setNestedDetail(null)} className="h-8 w-8 rounded-lg">
                <X size={18} className="text-slate-500" />
              </Button>
            )}
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
            {type === 'proyecto' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Presupuesto Asignado</p>
                    {isEditingNested ? <Input type="number" value={editBuffer.presupuesto} onChange={e => setEditBuffer({...editBuffer, presupuesto: e.target.value})} /> : <p className="text-lg font-black text-slate-900">{formatCurrency(data.presupuesto)}</p>}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Ejecución Real</p>
                    {isEditingNested ? <Input type="number" value={editBuffer.ejecutado} onChange={e => setEditBuffer({...editBuffer, ejecutado: e.target.value})} /> : <p className="text-lg font-black text-slate-900">{formatCurrency(data.ejecutado)}</p>}
                  </div>
                </div>
                <section>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2"><Target size={14} /> Objetivo del Proyecto</h4>
                  {isEditingNested ? <TextArea value={editBuffer.objetivo} onChange={e => setEditBuffer({...editBuffer, objetivo: e.target.value})} rows={3} /> : <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">{data.objetivo}</p>}
                </section>
                {!isEditingNested && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 bg-slate-50 rounded-lg"><p className="text-[10px] text-slate-400 font-bold uppercase">Estado</p><Badge variant="indigo" className="mt-1">{data.estado}</Badge></div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg"><p className="text-[10px] text-slate-400 font-bold uppercase">Equipo</p><p className="text-sm font-bold text-slate-800 mt-1">{data.equipo} Personas</p></div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg"><p className="text-[10px] text-slate-400 font-bold uppercase">Avance</p><p className="text-sm font-bold text-emerald-600 mt-1">{data.progreso}%</p></div>
                  </div>
                )}
              </>
            )}

            {type === 'producto' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">Descripción Técnica</p>
                  {isEditingNested ? <TextArea value={editBuffer.descripcion} onChange={e => setEditBuffer({...editBuffer, descripcion: e.target.value})} /> : <p className="text-sm text-slate-700 leading-relaxed">{data.descripcion}</p>}
                </div>
                <Input label="Tipo" value={isEditingNested ? editBuffer.tipo : data.tipo} onChange={e => setEditBuffer({...editBuffer, tipo: e.target.value})} readOnly={!isEditingNested} />
                <Input label="Autores" value={isEditingNested ? editBuffer.autores : data.autores} onChange={e => setEditBuffer({...editBuffer, autores: e.target.value})} readOnly={!isEditingNested} />
              </div>
            )}

            {type === 'semillero' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Estudiantes</p>
                    {isEditingNested ? <Input type="number" value={editBuffer.estudiantes} onChange={e => setEditBuffer({...editBuffer, estudiantes: e.target.value})} /> : <p className="text-lg font-black text-slate-900">{data.estudiantes}</p>}
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Sede</p>
                    {isEditingNested ? <Input value={editBuffer.sede} onChange={e => setEditBuffer({...editBuffer, sede: e.target.value})} /> : <Badge variant="indigo">{data.sede}</Badge>}
                  </div>
                </div>
                <section>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Líneas de Investigación</h4>
                  <div className="flex flex-wrap gap-2">{(data.lineas || []).map((l, i) => (<span key={i} className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-lg text-xs font-bold border border-violet-100">{l}</span>))}</div>
                </section>
              </div>
            )}
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
            {isEditingNested ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsEditingNested(false)}>
                  <RotateCcw size={14} className="mr-2" /> Cancelar
                </Button>
                <Button variant="primary" size="sm" onClick={handleSaveNested}>
                  <Save size={14} className="mr-2" /> Guardar Cambios
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant={confirmDeleteId === data.id ? "danger" : "outline"} 
                  size="sm" 
                  className={confirmDeleteId === data.id ? "" : "text-rose-600 border-rose-100 hover:bg-rose-50"}
                  onClick={handleDeleteNested} 
                >
                  <Trash2 size={14} className="mr-2" />
                  {confirmDeleteId === data.id ? "¿Confirmar?" : `Desvincular`}
                </Button>
                <div className="flex-1" />
                <Button variant="outline" size="sm" onClick={() => setNestedDetail(null)}>Cerrar</Button>
                <Button variant="secondary" size="sm" onClick={startEditing}>
                  <Edit3 size={14} className="mr-2" /> Editar
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const LinkModal = () => {
    if (!showLinkModal) return null;
    return (
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowLinkModal(false)} />
        <Card variant="elevated" className="w-full max-w-md animate-scaleIn relative z-[260] overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-black text-slate-900 uppercase text-sm tracking-widest flex items-center gap-2">
              <Plus size={16} className="text-emerald-500" /> Vincular {linkType}
            </h3>
            <button onClick={() => setShowLinkModal(false)}><X size={18} className="text-slate-400" /></button>
          </div>
          <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
            {linking ? (
              <div className="flex justify-center p-10"><Loader2 className="animate-spin text-emerald-500" /></div>
            ) : availableItems.length > 0 ? (
              availableItems.map(item => (
                <div 
                  key={item.id} 
                  className="p-4 bg-white border border-slate-100 rounded-xl hover:border-emerald-300 hover:bg-emerald-50 cursor-pointer transition-all flex justify-between items-center group"
                  onClick={() => handleLinkItem(item.id)}
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-emerald-700">{item.nombre || item.titulo}</span>
                  <Plus size={14} className="text-slate-300 group-hover:text-emerald-500" />
                </div>
              ))
            ) : (
              <p className="text-center py-10 text-slate-400 text-xs italic">No hay {linkType}s disponibles para vincular.</p>
            )}
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden print:static print:block print:overflow-visible">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity print:hidden" onClick={onClose} />
      
      <NestedDetailModal />
      <LinkModal />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 print:static print:block print:w-full print:pl-0">
        <div className="w-screen max-w-3xl bg-white shadow-2xl flex flex-col transform transition-transform duration-500 print:w-full print:max-w-none print:shadow-none print:transform-none print:static">
          
          <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg ring-4 ring-emerald-50">{(user?.nombre || '?').charAt(0)}</div>
                <div>
                  <div className="flex items-center gap-2"><h2 className="text-2xl font-black text-slate-900">{user.nombre}</h2><Badge variant="success">Verificado</Badge></div>
                  <p className="text-slate-500 flex items-center gap-2 mt-1"><Mail size={14} /> {user.email} • <Shield size={14} /> {user.rol}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" title="Enviar Mensaje"><MessageSquare size={16} /></Button>
                <Button variant="outline" size="sm" title="Cambiar Clave"><Key size={16} /></Button>
                <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full ml-2"><X size={24} className="text-slate-400" /></button>
              </div>
            </div>
            <div className="flex mt-8 border-b border-slate-100 print:hidden">
              <TabButton id="overview" label="Resumen 360" icon={TrendingUp} />
              <TabButton id="projects" label="Proyectos" icon={Briefcase} />
              <TabButton id="production" label="Producción" icon={Package} />
              <TabButton id="docs" label="Documentos" icon={FileText} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 scrollbar-thin bg-white">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4">
                <Loader2 size={40} className="animate-spin text-emerald-600" />
                <p className="text-slate-500 font-bold italic">Calculando impacto 360°...</p>
              </div>
            ) : editMode ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-2 gap-6">
                  <Input label="Nombre Completo" value={editData.nombre} onChange={e => setEditData({...editData, nombre: e.target.value})} />
                  <Input label="Correo Electrónico" value={editData.email} disabled className="bg-slate-50" />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <Input label="Sede" value={editData.sede} onChange={e => setEditData({...editData, sede: e.target.value})} />
                  <Input label="Regional" value={editData.regional} onChange={e => setEditData({...editData, regional: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <Input label="Rol SENNOVA" value={editData.rol_sennova || ''} onChange={e => setEditData({...editData, rol_sennova: e.target.value})} />
                  <Input label="Nivel Académico" value={editData.nivel_academico || ''} onChange={e => setEditData({...editData, nivel_academico: e.target.value})} />
                </div>
                <Input label="URL CVLAC" value={editData.cv_lac_url || ''} onChange={e => setEditData({...editData, cv_lac_url: e.target.value})} />
                
                <div className="flex justify-end gap-3 pt-6">
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                  <Button variant="sena" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            ) : (
              <>
            {activeTab === 'overview' && stats && (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <section><h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Estado del Investigador</h3><div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 text-slate-700 leading-relaxed italic">"{stats?.resumen_perfil}"</div></section>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Proyectos', val: stats?.proyectos_count, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Productos', val: stats?.productos_count, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Ratio Prod.', val: stats?.proyectos_count > 0 ? (stats.productos_count / stats.proyectos_count).toFixed(1) : '0.0', color: 'text-violet-600', bg: 'bg-violet-50' },
                    { label: 'Cumplimiento', val: `${stats?.cumplimiento}%`, color: 'text-amber-600', bg: 'bg-amber-50' },
                  ].map((kpi, i) => (
                    <div key={i} className={`p-4 rounded-2xl ${kpi.bg} border border-transparent hover:border-slate-200 transition-all text-center`}><p className="text-[10px] font-bold uppercase text-slate-500 mb-1">{kpi.label}</p><p className={`text-2xl font-black ${kpi.color}`}>{kpi.val}</p></div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <Card className="p-5 border-slate-100"><h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><PieChart size={16} className="text-emerald-500" /> Perfil de Actividad</h4><div className="h-48"><ResponsiveContainer width="100%" height="100%"><RePie><Pie data={stats?.distribucion_perfil || []} innerRadius={40} outerRadius={70} paddingAngle={5} dataKey="value">{(stats?.distribucion_perfil || []).map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></RePie></ResponsiveContainer></div></Card>
                  <Card className="p-5 border-slate-100"><h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-blue-500" /> Ejecución Presupuestal</h4><div className="space-y-4 pt-4"><div><div className="flex justify-between text-xs mb-2"><span className="text-slate-500">Ejecutado</span><span className="font-bold text-slate-900">{formatCurrency(stats?.presupuesto_ejecutado)}</span></div><div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden"><div className="bg-blue-500 h-full w-[66%]"></div></div></div><p className="text-[10px] text-slate-500 mt-2">Relación basada en proyectos asignados.</p></div></Card>
                </div>
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800">Proyectos Vinculados</h3>
                  <Button variant="outline" size="sm" onClick={() => handleOpenLink('proyecto')}>
                    <Plus size={14} className="mr-2" /> Vincular Proyecto
                  </Button>
                </div>
                <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]"><tr><th className="px-4 py-3">Proyecto</th><th className="px-4 py-3">Presupuesto</th><th className="px-4 py-3">Ejecutado</th><th className="px-4 py-3">Avance</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {(stats?.proyectos_lista || []).map(p => (
                        <tr key={p.id} className="hover:bg-emerald-50/40 cursor-pointer transition-colors group" onClick={() => setNestedDetail({ type: 'proyecto', data: p })}><td className="px-4 py-3 font-bold text-slate-900 group-hover:text-emerald-700">{p.nombre}<p className="text-[10px] text-slate-500 font-normal">{p.rol}</p></td><td className="px-4 py-3 tabular-nums font-medium text-slate-600">{formatCurrency(p.presupuesto)}</td><td className="px-4 py-3 tabular-nums font-black text-emerald-600">{formatCurrency(p.ejecutado)}</td><td className="px-4 py-3"><div className="flex items-center gap-2"><div className="flex-1 bg-slate-100 h-1.5 rounded-full min-w-[60px]"><div className="bg-emerald-500 h-full rounded-full shadow-sm shadow-emerald-200" style={{width: `${p.progreso}%`}}></div></div><ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" /></div></td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'production' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-800">Producción Técnica y Académica</h3>
                <div className="grid grid-cols-1 gap-3">
                  {(stats?.productos_lista || []).map(prod => (
                    <div key={prod.id} className="p-4 border border-slate-100 rounded-xl flex items-center justify-between hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-all group" onClick={() => setNestedDetail({ type: 'producto', data: prod })}><div className="flex items-center gap-4"><div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"><Package size={20} /></div><div><p className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">{prod.nombre}</p><p className="text-xs text-slate-500">{prod.tipo} • {prod.fecha}</p></div></div><ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" /></div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="space-y-6">
                <h3 className="text-lg font-bold text-slate-800">Expediente y Semilleros</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-5 flex items-center justify-between border-slate-100 hover:shadow-md transition-all cursor-pointer" onClick={() => window.open(user.cv_lac_url, '_blank')}><div className="flex items-center gap-4"><div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center"><ExternalLink size={24} /></div><div><p className="font-bold text-slate-900">Plataforma CVLaC</p><p className="text-xs text-slate-500">Hoja de vida MinCiencias</p></div></div></Card>
                  <Card className="p-5 flex items-center justify-between border-slate-100 hover:shadow-md transition-all cursor-pointer"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center"><FileText size={24} /></div><div><p className="font-bold text-slate-900">Soporte Identidad</p><p className="text-xs text-slate-500">Documento cargado (PDF)</p></div></div></Card>
                </div>
                <div className="space-y-3 pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><BookOpen size={14} className="text-indigo-500" /> Semilleros Vinculados</h4>
                    <Button variant="outline" size="sm" onClick={() => handleOpenLink('semillero')}>
                      <Plus size={14} className="mr-2" /> Vincular Semillero
                    </Button>
                  </div>
                  {(stats?.semilleros_lista || []).map((sem, i) => (
                    <div key={i} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/20 cursor-pointer transition-all group" onClick={() => setNestedDetail({ type: 'semillero', data: sem })}><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">{i+1}</div><span className="text-sm font-bold text-slate-700 group-hover:text-indigo-700">{sem.nombre}</span></div><div className="flex gap-4 items-center"><Badge variant="indigo">{sem.estudiantes} Estudiantes</Badge><ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" /></div></div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center print:hidden">
             <div className="flex gap-2">
               <Button variant="outline" size="sm" onClick={() => window.print()}><Download size={16} className="mr-2" /> Imprimir</Button>
               <Button 
                variant="sena" 
                size="sm" 
                onClick={async () => {
                  try {
                    await ReportesAPI.descargarCertificadoInvestigador(user.id);
                    onNotify?.('Certificado generado correctamente', 'success');
                  } catch (err) {
                    onNotify?.('Error generando certificado: ' + err.message, 'error');
                  }
                }}
               >
                 <Award size={16} className="mr-2" /> Certificado
               </Button>
                <Button variant="outline" size="sm" onClick={() => { setEditData({ ...user }); setEditMode(true); }}><Edit3 size={16} className="mr-2" /> Editar Datos</Button>
              </div>
              <Button variant="primary" onClick={onClose}>Cerrar Panel</Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserInsightPanel;
