import React, { useState, useEffect } from 'react';
import { 
  Users, Search, UserPlus, Filter, Mail, 
  MapPin, GraduationCap, ExternalLink, Activity,
  MoreVertical, Edit, ShieldCheck
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { UsuariosAPI } from '../../api/usuarios';

const UserCard = ({ user, onEdit, onViewActivity }) => (
  <Card className="p-5 flex flex-col gap-4 group hover:border-emerald-500 transition-colors">
    <div className="flex justify-between items-start">
      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xl group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors uppercase">
        {user.nombre.charAt(0)}
      </div>
      <div className="flex gap-2">
        <Badge variant={user.rol === 'admin' ? 'danger' : 'success'} dot={user.is_active}>
          {user.rol === 'admin' ? 'Admin' : 'Investigador'}
        </Badge>
      </div>
    </div>

    <div>
      <h3 className="font-bold text-slate-900 line-clamp-1">{user.nombre}</h3>
      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
        <Mail size={12} /> {user.email}
      </p>
    </div>

    <div className="space-y-2 mt-auto">
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <MapPin size={12} className="text-slate-400" />
        <span>{user.regional || 'No definida'} / {user.sede || 'No definida'}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-600">
        <GraduationCap size={12} className="text-slate-400" />
        <span>{user.nivel_academico || 'No definido'}</span>
      </div>
    </div>

    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
      <Button variant="ghost" size="sm" className="h-8 text-xs font-bold" onClick={() => onViewActivity(user)}>
        <Activity size={14} className="mr-1.5" /> Actividad
      </Button>
      {user.cv_lac_url && (
        <a 
          href={user.cv_lac_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-all"
          title="Ver CVLAC"
        >
          <ExternalLink size={16} />
        </a>
      )}
    </div>
  </Card>
);

const InvestigadoresModule = ({ onNotify }) => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({ rol: '', sede: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        UsuariosAPI.list(),
        UsuariosAPI.getStats()
      ]);
      setUsers(usersData);
      setStats(statsData);
    } catch (err) {
      onNotify('Error al cargar datos de investigadores', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRol = filter.rol ? u.rol === filter.rol : true;
    return matchesSearch && matchesRol;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-slate-100 rounded-2xl w-full"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome & Stats */}
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-2/3 bg-white p-8 rounded-2xl border border-slate-200 flex flex-col justify-center">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Investigadores</h1>
          <p className="text-slate-500 mt-2 max-w-lg">
            Directorio centralizado del talento humano de investigación. Gestiona roles, perfiles académicos y vinculaciones institucionales.
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Button variant="primary" className="bg-slate-900 hover:bg-slate-800">
              <UserPlus size={18} className="mr-2" /> Agregar Investigador
            </Button>
            <Button variant="outline">
              <ShieldCheck size={18} className="mr-2" /> Auditoría de Roles
            </Button>
          </div>
        </div>
        
        <div className="lg:w-1/3 grid grid-cols-2 gap-4">
          <Card className="p-6 bg-emerald-600 text-white flex flex-col justify-between">
            <Users size={24} className="opacity-50" />
            <div className="mt-4">
              <p className="text-4xl font-bold">{stats?.total || 0}</p>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80 mt-1">Total Activos</p>
            </div>
          </Card>
          <Card className="p-6 bg-blue-600 text-white flex flex-col justify-between">
            <GraduationCap size={24} className="opacity-50" />
            <div className="mt-4">
              <p className="text-4xl font-bold">{stats?.por_nivel?.Doctorado || 0}</p>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80 mt-1">Doctores</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre o email..." 
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="text-sm bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 focus:ring-2 focus:ring-emerald-500/20 outline-none"
            value={filter.rol}
            onChange={(e) => setFilter({...filter, rol: e.target.value})}
          >
            <option value="">Todos los roles</option>
            <option value="admin">Administrador</option>
            <option value="investigador">Investigador</option>
          </select>
        </div>
        <p className="text-xs text-slate-400 font-medium">Mostrando {filteredUsers.length} investigadores</p>
      </div>

      {/* User Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredUsers.map(user => (
          <UserCard 
            key={user.id} 
            user={user} 
            onEdit={() => {}} 
            onViewActivity={(u) => console.log('Activity', u.id)} 
          />
        ))}
      </div>
    </div>
  );
};

export default InvestigadoresModule;
