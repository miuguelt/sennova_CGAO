import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Search, UserPlus, Filter, Mail,
  MapPin, GraduationCap, ExternalLink, Activity,
  MoreVertical, Edit, ShieldCheck, X, Loader2, Save,
  Trash2, ShieldAlert, Key, UserCheck, UserX,
  Building, GraduationCap as GradIcon, Target
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { UsuariosAPI } from '../../api/usuarios';
import UserInsightPanel from './UserInsightPanel';
import useClickOutside from '../../hooks/useClickOutside';

const UserCard = ({ user, onEdit, onDelete, onToggleActive, onViewActivity }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  useClickOutside(menuRef, () => setShowMenu(false));

  return (
    <Card 
      className="p-5 flex flex-col gap-4 group hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-500/10 transition-all cursor-pointer relative"
      onClick={() => onViewActivity(user)}
    >
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
        >
          <MoreVertical size={16} />
        </button>
        {showMenu && (
          <div ref={menuRef} className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-scaleIn origin-top-right">
            <button onClick={(e) => { e.stopPropagation(); onEdit(user); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
              <Edit size={14} /> Editar Perfil
            </button>
            <button onClick={(e) => { e.stopPropagation(); onToggleActive(user); setShowMenu(false); }} className={`w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 border-t border-slate-50 mt-1 pt-2 ${user.is_active ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>
              {user.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
              {user.is_active ? 'Desactivar Cuenta' : 'Activar Cuenta'}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(user.id); setShowMenu(false); }} className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-50 mt-1 pt-2">
              <Trash2 size={14} /> Eliminar Permanente
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-between items-start">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl transition-colors uppercase ${user.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
          {user.nombre.charAt(0)}
        </div>
        <div className="flex gap-2 mr-6">
          <Badge variant={user.rol === 'admin' ? 'danger' : 'success'} className="font-black text-[9px] uppercase tracking-wider">
            {user.rol === 'admin' ? 'ADMIN' : 'INVESTIGADOR'}
          </Badge>
          {!user.is_active && <Badge variant="default" className="text-[9px] font-black uppercase">Inactivo</Badge>}
        </div>
      </div>

      <div>
        <h3 className="font-black text-slate-900 line-clamp-1 group-hover:text-emerald-700 transition-colors">{user.nombre}</h3>
        <p className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5 mt-1">
          <Mail size={12} className="text-slate-400" /> {user.email}
        </p>
      </div>

      <div className="space-y-2.5 mt-auto">
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
          <MapPin size={12} className="text-slate-400" />
          <span className="truncate">{user.sede || 'Sin Sede'} / {user.regional || 'CGAO'}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
          <GradIcon size={12} className="text-slate-400" />
          <span className="truncate">{user.nivel_academico || 'No definido'}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <Activity size={14} className="text-emerald-500" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Impacto: {user.impacto || 0}%</span>
        </div>
        {user.cv_lac_url && (
          <a 
            href={user.cv_lac_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>
    </Card>
  );
};

const InvestigadoresModule = ({ onNotify }) => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({ rol: '', is_active: '' });
  
  // Modales
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'investigador',
    password: '',
    regional: 'CGAO',
    sede: '',
    nivel_academico: '',
    cv_lac_url: ''
  });
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        UsuariosAPI.list(),
        UsuariosAPI.getStats()
      ]);
      setUsers(usersData || []);
      setStats(statsData);
    } catch (err) {
      onNotify?.('Error al cargar datos de investigadores', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenCreate = () => {
    setFormData({ nombre: '', email: '', rol: 'investigador', password: '', regional: 'CGAO', sede: '', nivel_academico: '', cv_lac_url: '' });
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
        onNotify?.('Perfil actualizado correctamente', 'success');
      } else {
        await UsuariosAPI.create(formData);
        onNotify?.('Investigador registrado exitosamente', 'success');
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      onNotify?.('Error en la operación: ' + err.message, 'error');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar permanentemente a este usuario? Esta acción es irreversible.')) return;
    try {
      await UsuariosAPI.delete(id);
      onNotify?.('Usuario eliminado', 'success');
      loadData();
    } catch {
      onNotify?.('Error al eliminar', 'error');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await UsuariosAPI.toggleActive(user.id);
      onNotify?.(user.is_active ? 'Cuenta desactivada' : 'Cuenta activada', 'success');
      loadData();
    } catch {
      onNotify?.('Error al cambiar estado', 'error');
    }
  };

  const filteredUsers = (users || []).filter(u => {
    const matchesSearch = (u.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRol = filter.rol ? u.rol === filter.rol : true;
    const matchesActive = filter.is_active !== '' ? u.is_active === (filter.is_active === 'true') : true;
    return matchesSearch && matchesRol && matchesActive;
  });

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-40 bg-slate-100 rounded-3xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      
      {/* ── Welcome & Stats ── */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3 bg-white/40 backdrop-blur-md p-10 rounded-3xl border border-white shadow-sm flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none mb-4">Talento SENNOVA</h1>
            <p className="text-slate-500 font-medium max-w-lg leading-relaxed">
              Gestione el capital intelectual del Centro. Supervise perfiles, asigne roles de administración y audite el impacto académico de cada investigador.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Button variant="sena" className="h-12 px-8 shadow-xl shadow-emerald-500/30" onClick={handleOpenCreate}>
                <UserPlus size={20} className="mr-2" /> Nuevo Investigador
              </Button>
              <Button variant="outline" className="h-12 px-6 border-slate-200 bg-white" onClick={() => setShowAuditModal(true)}>
                <ShieldCheck size={20} className="mr-2" /> Auditoría de Roles
              </Button>
            </div>
          </div>
        </div>
        
        <div className="lg:w-1/3 grid grid-cols-2 gap-4">
          <Card className="p-8 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex flex-col justify-between border-0 shadow-xl shadow-emerald-500/20">
            <Users size={32} className="opacity-50" />
            <div>
              <p className="text-5xl font-black tabular-nums">{stats?.total || users.length}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-2">Investigadores</p>
            </div>
          </Card>
          <Card className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex flex-col justify-between border-0 shadow-xl shadow-indigo-500/20">
            <GraduationCap size={32} className="opacity-50" />
            <div>
              <p className="text-5xl font-black tabular-nums">{stats?.por_nivel?.Doctorado || 0}</p>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-2">Doctorados</p>
            </div>
          </Card>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filtrar por nombre, email o especialidad..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="px-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
            value={filter.rol}
            onChange={(e) => setFilter({...filter, rol: e.target.value})}
          >
            <option value="">Todos los Roles</option>
            <option value="admin">Administradores</option>
            <option value="investigador">Investigadores</option>
          </select>
          <select 
            className="px-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
            value={filter.is_active}
            onChange={(e) => setFilter({...filter, is_active: e.target.value})}
          >
            <option value="">Todos los Estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
        <Badge variant="indigo" className="h-10 px-4 font-black">EXHIBIENDO {filteredUsers.length} PERFILES</Badge>
      </div>

      {/* ── User Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredUsers.map(user => (
          <UserCard
            key={user.id}
            user={user}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            onToggleActive={handleToggleActive}
            onViewActivity={(u) => { setSelectedUser(u); setShowActivityModal(true); }}
          />
        ))}
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <Card className="w-full max-w-2xl animate-scaleIn shadow-2xl border-0 overflow-hidden">
            <div className="bg-emerald-600 px-8 py-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  {isEditing ? <Edit size={24} /> : <UserPlus size={24} />}
                </div>
                <div>
                  <h2 className="text-xl font-black">{isEditing ? 'Actualizar Investigador' : 'Nuevo Registro de Investigador'}</h2>
                  <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mt-1 opacity-80">Sincronización de Talento CGAO</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-8 bg-white space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
              <div className="grid grid-cols-2 gap-6">
                <Input label="Nombre Completo" value={formData.nombre} onChange={e => setFormData({...formData, nombre: e.target.value})} required />
                <Input label="Correo Institucional" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <Select 
                  label="Rol en Plataforma" 
                  options={[{ value: 'investigador', label: 'Investigador' }, { value: 'admin', label: 'Administrador' }]} 
                  value={formData.rol} 
                  onChange={e => setFormData({...formData, rol: e.target.value})} 
                />
                <Input 
                  label={isEditing ? "Contraseña (dejar vacío para mantener)" : "Contraseña Temporal"} 
                  type="password" 
                  value={formData.password} 
                  onChange={e => setFormData({...formData, password: e.target.value})} 
                  required={!isEditing} 
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Input label="Regional" value={formData.regional} onChange={e => setFormData({...formData, regional: e.target.value})} />
                <Input label="Sede / Centro" placeholder="CGAO Vélez" value={formData.sede} onChange={e => setFormData({...formData, sede: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Select 
                  label="Nivel Académico" 
                  options={[
                    { value: 'Técnico', label: 'Técnico' },
                    { value: 'Tecnólogo', label: 'Tecnólogo' },
                    { value: 'Profesional', label: 'Profesional' },
                    { value: 'Especialización', label: 'Especialización' },
                    { value: 'Maestría', label: 'Maestría' },
                    { value: 'Doctorado', label: 'Doctorado' }
                  ]} 
                  value={formData.nivel_academico} 
                  onChange={e => setFormData({...formData, nivel_academico: e.target.value})} 
                />
                <Input label="URL Perfil CVLAC" placeholder="https://scienti.minciencias.gov.co/..." value={formData.cv_lac_url} onChange={e => setFormData({...formData, cv_lac_url: e.target.value})} />
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="sena" className="bg-emerald-600 hover:bg-emerald-700 px-8" onClick={handleSaveUser} disabled={saving}>
                {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
                {isEditing ? 'Guardar Cambios' : 'Registrar Investigador'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Audit Modal ── */}
      {showAuditModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <Card className="w-full max-w-2xl animate-scaleIn shadow-2xl border-0 overflow-hidden">
            <div className="bg-slate-900 px-8 py-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md"><ShieldAlert size={24} className="text-amber-500" /></div>
                <div>
                  <h2 className="text-xl font-black">Auditoría de Control y Roles</h2>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Supervisión de Acceso al Ecosistema</p>
                </div>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
            </div>
            
            <div className="p-8 bg-white space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100">
                  <p className="text-4xl font-black text-rose-700">{users.filter(u => u.rol === 'admin').length}</p>
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mt-1">Administradores</p>
                  <p className="text-[9px] text-rose-500 mt-2 italic font-medium">Control total sobre infraestructura y datos.</p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                  <p className="text-4xl font-black text-emerald-700">{users.filter(u => u.rol === 'investigador').length}</p>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Investigadores</p>
                  <p className="text-[9px] text-emerald-500 mt-2 italic font-medium">Acceso operativo a proyectos y productos.</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Key size={14} className="text-indigo-500" /> Privilegios y Seguridad
                </h4>
                <div className="max-h-64 overflow-y-auto pr-2 scrollbar-thin">
                  {users.map(u => (
                    <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${u.rol === 'admin' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {u.nombre.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{u.nombre}</p>
                          <p className="text-[10px] font-medium text-slate-500">{u.email}</p>
                        </div>
                      </div>
                      <Badge variant={u.rol === 'admin' ? 'danger' : 'success'} className="text-[8px] font-black">
                        {u.rol.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <Button variant="primary" onClick={() => setShowAuditModal(false)}>Cerrar Supervisión</Button>
            </div>
          </Card>
        </div>
      )}

      <UserInsightPanel
        user={selectedUser}
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        onNotify={onNotify}
      />
    </div>
  );
};

export default InvestigadoresModule;
