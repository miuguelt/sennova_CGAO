import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Search, UserPlus, Filter, Mail,
  MapPin, GraduationCap, ExternalLink, Activity,
  MoreVertical, Edit, ShieldCheck, X, Loader2, Save,
  Trash2, ShieldAlert, Key, UserCheck, UserX,
  Building, GraduationCap as GradIcon, Target, BookOpen,
  Award, Zap, Calendar, Heart, Terminal, Cpu
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { UsuariosAPI } from '../../api/usuarios';
import { SemillerosAPI } from '../../api/semilleros';
import { ProyectosAPI } from '../../api/proyectos';
import UserInsightPanel from './UserInsightPanel';
import useClickOutside from '../../hooks/useClickOutside';

const AprendizCard = ({ user, onEdit, onDelete, onToggleActive, onViewActivity, semilleros = [], onLinkSemillero }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const menuRef = useRef(null);
  useClickOutside(menuRef, () => setShowMenu(false));

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('semilleroId')) {
      setIsDragOver(true);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const semilleroId = e.dataTransfer.getData('semilleroId');
    if (semilleroId) {
      onLinkSemillero(user.id, semilleroId);
    }
  };

  return (
    <Card 
      className={`p-6 flex flex-col gap-4 group transition-all cursor-pointer relative overflow-hidden border-0 ring-1 ring-slate-100 hover:ring-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 ${isDragOver ? 'ring-4 ring-indigo-500 bg-indigo-50 scale-[1.02]' : 'bg-white'}`}
      onClick={() => onViewActivity(user)}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Glow Effect */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />

      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
        >
          <MoreVertical size={18} />
        </button>
        {showMenu && (
          <div ref={menuRef} className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 animate-scaleIn origin-top-right z-50">
            <button onClick={(e) => { e.stopPropagation(); onEdit(user); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3">
              <Edit size={16} className="text-slate-400" /> Editar Datos
            </button>
            <button onClick={(e) => { e.stopPropagation(); onToggleActive(user); setShowMenu(false); }} className={`w-full text-left px-4 py-3 text-xs font-bold flex items-center gap-3 border-t border-slate-50 mt-1 pt-2 ${user.is_active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
              {user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}
              {user.is_active ? 'Desactivar Aprendiz' : 'Activar Aprendiz'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(user.id); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 border-t border-slate-50 mt-1 pt-2">
              <Trash2 size={16} /> Eliminar Registro
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-start relative z-10">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl transition-all shadow-lg uppercase ${user.is_active ? 'bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-indigo-500/20' : 'bg-slate-100 text-slate-400 shadow-none'}`}>
          {user.nombre.charAt(0)}
        </div>
        <div className="flex flex-col items-end gap-2 mr-8">
          <Badge variant="indigo" className="font-black text-[9px] uppercase tracking-[0.15em] px-2 py-1 bg-indigo-50 text-indigo-700 border-indigo-100">
            TALENTO SENNOVA
          </Badge>
          {!user.is_active && <Badge variant="default" className="text-[9px] font-black uppercase bg-slate-100 text-slate-500">Inactivo</Badge>}
        </div>
      </div>

      <div className="relative z-10">
        <h3 className="font-black text-slate-900 text-lg line-clamp-1 group-hover:text-indigo-600 transition-colors">{user.nombre}</h3>
        <div className="flex items-center gap-2 mt-2">
          <Badge className="bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 rounded-lg border-0">
            FICHA {user.ficha || 'N/A'}
          </Badge>
          <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">{user.programa_formacion || 'Sin Programa'}</span>
        </div>
      </div>

      <div className="space-y-3 mt-2 relative z-10">
        <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-600">
          <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400"><Mail size={14} /></div>
          <span className="truncate">{user.email}</span>
        </div>
        <div className="flex items-center gap-2.5 text-[11px] font-bold text-slate-600">
          <div className="p-1.5 bg-slate-50 rounded-lg text-slate-400"><Terminal size={14} /></div>
          <span className="truncate">{user.rol_sennova || 'Aprendiz Investigador'}</span>
        </div>
      </div>

      {isDragOver && (
        <div className="absolute inset-0 bg-indigo-600/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fadeIn z-20">
          <Zap size={48} className="text-white animate-pulse mb-4" />
          <h4 className="text-white font-black text-lg">Vincular Semillero</h4>
          <p className="text-indigo-100 text-xs mt-2 font-medium">Suelta el semillero aquí para asignar al aprendiz</p>
        </div>
      )}

      <div className="mt-auto pt-5 flex items-center justify-between relative z-10 border-t border-slate-50">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
            <Award size={14} />
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none">Estado Académico</span>
            <span className="text-[10px] font-black text-emerald-600 uppercase">Certificable</span>
          </div>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onViewActivity(user); }}
          className="flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest"
        >
          Perfil <Activity size={12} />
        </button>
      </div>
    </Card>
  );
};

const AprendicesModule = ({ onNotify, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [semilleros, setSemilleros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({ ficha: '', programa: '' });
  
  // Modales
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showInsight, setShowInsight] = useState(false);
  const [isPoolVisible, setIsPoolVisible] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'investigador',
    rol_sennova: 'Aprendiz Investigador',
    password: '',
    ficha: '',
    programa_formacion: '',
    documento: '',
    celular: '',
    regional: 'CGAO',
    sede: 'Vélez'
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, semillerosData] = await Promise.all([
        UsuariosAPI.list(),
        SemillerosAPI.list()
      ]);
      // Filtrar por los que parecen ser aprendices (tienen ficha o rol_sennova de aprendiz)
      const aprendices = (usersData || []).filter(u => 
        u.ficha || 
        u.programa_formacion || 
        (u.rol_sennova && u.rol_sennova.toLowerCase().includes('aprendiz')) ||
        u.rol === 'aprendiz'
      );
      setUsers(aprendices);
      setSemilleros(semillerosData || []);
    } catch (err) {
      onNotify?.('Error al cargar datos de aprendices', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenCreate = () => {
    setFormData({ 
      nombre: '', email: '', rol: 'investigador', rol_sennova: 'Aprendiz Investigador', 
      password: '', ficha: '', programa_formacion: '', documento: '', celular: '',
      regional: 'CGAO', sede: 'Vélez' 
    });
    setIsEditing(false);
    setShowForm(true);
  };

  const handleOpenEdit = (user) => {
    setFormData({ ...user, password: '' });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleSaveUser = async () => {
    setSaving(true);
    try {
      if (isEditing) {
        await UsuariosAPI.update(formData.id, formData);
        onNotify?.('Perfil de aprendiz actualizado', 'success');
      } else {
        await UsuariosAPI.create(formData);
        onNotify?.('Aprendiz registrado exitosamente', 'success');
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      onNotify?.('Error: ' + err.message, 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar permanentemente a este aprendiz?')) return;
    try {
      await UsuariosAPI.delete(id);
      onNotify?.('Aprendiz eliminado', 'success');
      loadData();
    } catch {
      onNotify?.('Error al eliminar', 'error');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await UsuariosAPI.toggleActive(user.id);
      onNotify?.(user.is_active ? 'Aprendiz desactivado' : 'Aprendiz activado', 'success');
      loadData();
    } catch {
      onNotify?.('Error al cambiar estado', 'error');
    }
  };

  const handleLinkSemillero = async (userId, semilleroId) => {
    try {
      await SemillerosAPI.addAprendiz(semilleroId, { user_id: userId, estado: 'Activo' });
      onNotify?.('Aprendiz vinculado al semillero con éxito', 'success');
    } catch (err) {
      onNotify?.('Error al vincular: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  const filteredUsers = (users || []).filter(u => {
    const matchesSearch = (u.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.ficha || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.programa_formacion || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-48 bg-slate-100 rounded-3xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-slate-100 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      
      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3 bg-gradient-to-br from-indigo-900 to-slate-900 p-10 rounded-[3rem] text-white shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
          <div className="relative z-10">
            <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] font-black uppercase tracking-[0.3em] mb-6">
              Módulo de Aprendices
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-black tracking-tight leading-none mb-6">Semilleros de <span className="text-indigo-400">Talento</span></h1>
            <p className="text-slate-400 font-medium max-w-lg leading-relaxed text-sm">
              Gestione la vinculación de aprendices a los proyectos de investigación. Monitoree sus fichas, programas de formación y cumplimiento de bitácoras.
            </p>
            <div className="flex flex-wrap gap-4 mt-10">
              <Button variant="sena" className="h-14 px-8 shadow-2xl shadow-emerald-500/20 text-sm" onClick={handleOpenCreate}>
                <UserPlus size={20} className="mr-3" /> Registrar Aprendiz
              </Button>
              <Button 
                variant="outline" 
                className={`h-14 px-6 border-slate-700 bg-slate-800/50 text-white hover:bg-slate-800 transition-all ${isPoolVisible ? 'ring-2 ring-indigo-500' : ''}`}
                onClick={() => setIsPoolVisible(!isPoolVisible)}
              >
                <Zap size={20} className={`mr-3 ${isPoolVisible ? 'text-indigo-400 animate-pulse' : 'text-slate-500'}`} /> Pool de Semilleros
              </Button>
            </div>
          </div>
        </div>
        
        <div className="lg:w-1/3 flex flex-col gap-4">
          <Card className="flex-1 p-8 bg-white border-0 ring-1 ring-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-center items-center text-center rounded-[3rem]">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-3xl mb-4 shadow-inner">
              <Users size={40} />
            </div>
            <p className="text-6xl font-black text-slate-900 tabular-nums tracking-tighter">{users.length}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3">Aprendices Activos</p>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-6 bg-slate-900 text-white border-0 rounded-[2rem] flex flex-col items-center justify-center">
              <Badge variant="indigo" className="mb-2 bg-indigo-500/20 text-indigo-300 border-0">{semilleros.length}</Badge>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Semilleros</p>
            </Card>
            <Card className="p-6 bg-indigo-600 text-white border-0 rounded-[2rem] flex flex-col items-center justify-center">
              <Badge className="mb-2 bg-white/20 text-white border-0">100%</Badge>
              <p className="text-[9px] font-black uppercase tracking-widest text-indigo-200">Retención</p>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Semilleros Pool ── */}
      {isPoolVisible && (
        <div className="bg-indigo-900 p-8 rounded-[2.5rem] shadow-2xl animate-fadeIn relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div>
              <h3 className="text-white font-black text-lg flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400"><BookOpen size={20} /></div>
                Semilleros de Investigación CGAO
              </h3>
              <p className="text-indigo-300 text-xs mt-1 font-medium italic">Arrastra un semillero hacia un aprendiz para vincularlo automáticamente.</p>
            </div>
            <Badge className="bg-white/10 text-white border-white/20 uppercase font-black text-[9px] tracking-widest px-3 py-1">
              Pool de Recursos
            </Badge>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-indigo-500/50 scrollbar-track-transparent">
            {semilleros.map(s => (
              <div 
                key={s.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('semilleroId', s.id);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                className="flex-shrink-0 w-64 p-5 bg-white/5 border border-white/10 rounded-2xl cursor-grab active:cursor-grabbing hover:bg-white/10 hover:border-indigo-400 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <Badge className="bg-indigo-500 text-white text-[8px] font-black uppercase tracking-tighter border-0">Semillero</Badge>
                  <Users size={12} className="text-indigo-400" />
                </div>
                <p className="text-xs font-black text-white line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors">{s.nombre}</p>
                <p className="text-[9px] text-slate-400 mt-2 flex items-center gap-1">
                   <Target size={10} /> {s.linea_investigacion || 'Línea General'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters & Search ── */}
      <div className="bg-white p-4 rounded-[2rem] shadow-sm ring-1 ring-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-xl">
            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, ficha o programa de formación..." 
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-0 ring-1 ring-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-bold placeholder:text-slate-400 shadow-inner"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Badge variant="indigo" className="h-12 px-6 font-black text-[10px] tracking-widest bg-indigo-50 text-indigo-600 border-indigo-100 uppercase">
             {filteredUsers.length} Aprendices Registrados
           </Badge>
        </div>
      </div>

      {/* ── Aprendices Grid ── */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredUsers.map(user => (
            <AprendizCard
              key={user.id}
              user={user}
              semilleros={semilleros}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onViewActivity={(u) => { setSelectedUser(u); setShowInsight(true); }}
              onLinkSemillero={handleLinkSemillero}
            />
          ))}
        </div>
      ) : (
        <div className="py-24 text-center bg-white rounded-[3rem] shadow-sm ring-1 ring-slate-100 border border-dashed border-slate-200">
           <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users size={40} className="text-slate-200" />
           </div>
           <h3 className="text-xl font-black text-slate-900">No se encontraron aprendices</h3>
           <p className="text-slate-500 text-sm mt-2 max-w-xs mx-auto font-medium">Ajuste los filtros de búsqueda o registre un nuevo aprendiz para el CGAO.</p>
           <Button variant="outline" className="mt-8 border-slate-200" onClick={() => setSearchTerm('')}>Limpiar Búsqueda</Button>
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
          <Card className="w-full max-w-3xl animate-scaleIn shadow-2xl border-0 overflow-hidden bg-white rounded-[2.5rem]">
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 px-10 py-8 text-white flex items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16" />
              <div className="flex items-center gap-6 relative z-10">
                <div className="p-4 bg-white/20 rounded-[1.5rem] backdrop-blur-md shadow-xl">
                  {isEditing ? <Edit size={28} /> : <UserPlus size={28} />}
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{isEditing ? 'Actualizar Ficha de Aprendiz' : 'Alta de Nuevo Aprendiz'}</h2>
                  <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.3em] mt-1 opacity-90">Gestión de Talento Humano - SENNOVA CGAO</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors relative z-10"><X size={28} /></button>
            </div>
            
            <div className="p-10 bg-white space-y-8 max-h-[75vh] overflow-y-auto scrollbar-thin">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input label="Nombre Completo" placeholder="Ej: Juan Perez" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required className="rounded-2xl" />
                <Input label="Correo Institucional" type="email" placeholder="email@soy.sena.edu.co" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required className="rounded-2xl" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-1">
                  <Input label="Número de Ficha" placeholder="2560892" value={formData.ficha} onChange={e => setFormData({...formData, ficha: e.target.value})} className="rounded-2xl" />
                </div>
                <div className="md:col-span-2">
                  <Input label="Programa de Formación" placeholder="ADSO, TPS, IRM..." value={formData.programa_formacion} onChange={e => setFormData({...formData, programa_formacion: e.target.value})} className="rounded-2xl" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input label="Número de Documento" placeholder="1098..." value={formData.documento} onChange={e => setFormData({...formData, documento: e.target.value})} className="rounded-2xl" />
                <Input label="Celular / WhatsApp" placeholder="310..." value={formData.celular} onChange={e => setFormData({...formData, celular: e.target.value})} className="rounded-2xl" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Select 
                  label="Rol en SENNOVA" 
                  options={[
                    { value: 'Aprendiz Investigador', label: 'Aprendiz Investigador' },
                    { value: 'Aprendiz Innovador', label: 'Aprendiz Innovador' },
                    { value: 'Aprendiz de Apoyo', label: 'Aprendiz de Apoyo' }
                  ]} 
                  value={formData.rol_sennova} 
                  onChange={e => setFormData({...formData, rol_sennova: e.target.value})} 
                  className="rounded-2xl"
                />
                <Input 
                  label={isEditing ? "Contraseña (dejar vacío para mantener)" : "Contraseña Temporal"} 
                  type="password" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  required={!isEditing} 
                  className="rounded-2xl"
                />
              </div>
            </div>

            <div className="px-10 py-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4 rounded-b-[2.5rem]">
              <Button variant="secondary" className="px-8 rounded-2xl h-12" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="sena" className="bg-indigo-600 hover:bg-indigo-700 px-10 rounded-2xl h-12 shadow-xl shadow-indigo-500/20" onClick={handleSaveUser} disabled={saving}>
                {saving ? <Loader2 size={18} className="animate-spin mr-3" /> : <Save size={18} className="mr-3" />}
                {isEditing ? 'Guardar Cambios' : 'Registrar Aprendiz'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <UserInsightPanel
        user={selectedUser}
        isOpen={showInsight}
        onClose={() => setShowInsight(false)}
        onNotify={onNotify}
      />
    </div>
  );
};

export default AprendicesModule;
