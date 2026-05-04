import React, { useState, useEffect } from 'react';
import { 
  Bell, CheckCircle2, AlertTriangle, Clock, Trash2, 
  Filter, Search, ArrowRight, Info, ExternalLink,
  ChevronRight, Calendar, Loader2, Mail
} from 'lucide-react';
import { NotificacionesAPI } from '../../api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';

const PRIORIDAD_COLORS = {
  baja:   'text-slate-500 bg-slate-100 border-slate-200',
  normal: 'text-blue-600 bg-blue-50 border-blue-100',
  alta:   'text-amber-600 bg-amber-50 border-amber-100',
  urgente: 'text-rose-600 bg-rose-50 border-rose-100',
};

const TIPO_ICONS = {
  entregable:  Calendar,
  convocatoria: Mail,
  producto:    Info,
  sistema:     Info,
};

const NotificacionesModule = ({ currentUser, onNotify, onNavigate }) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todas'); // todas, leidas, no_leidas
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, noLeidas: 0 });

  useEffect(() => {
    loadNotificaciones();
  }, [filter]);

  const loadNotificaciones = async () => {
    setLoading(true);
    try {
      const leidas = filter === 'leidas' ? true : (filter === 'no_leidas' ? false : null);
      const data = await NotificacionesAPI.listar(leidas);
      setNotificaciones(data || []);
      
      const statsData = await NotificacionesAPI.checkPendientes();
      setStats({
        total: statsData.total || 0,
        noLeidas: statsData.no_leidas || 0
      });
    } catch (err) {
      onNotify?.('Error al cargar notificaciones', 'error');
    }
    setLoading(false);
  };

  const handleMarcarLeida = async (id) => {
    try {
      await NotificacionesAPI.marcarLeida(id, true);
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
      setStats(prev => ({ ...prev, noLeidas: Math.max(0, prev.noLeidas - 1) }));
    } catch (err) {
      onNotify?.('Error al actualizar notificación', 'error');
    }
  };

  const handleMarcarTodasLeidas = async () => {
    if (!window.confirm('¿Marcar todas las notificaciones como leídas?')) return;
    try {
      await NotificacionesAPI.marcarTodasLeidas();
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
      setStats(prev => ({ ...prev, noLeidas: 0 }));
      onNotify?.('Todas las notificaciones marcadas como leídas', 'success');
    } catch (err) {
      onNotify?.('Error al actualizar notificaciones', 'error');
    }
  };

  const handleEliminar = async (id) => {
    try {
      await NotificacionesAPI.eliminar(id);
      setNotificaciones(prev => prev.filter(n => n.id !== id));
      onNotify?.('Notificación eliminada', 'success');
    } catch (err) {
      onNotify?.('Error al eliminar notificación', 'error');
    }
  };

  const handleAction = (n) => {
    if (n.entidad_tipo === 'proyecto') onNavigate('proyectos');
    else if (n.entidad_tipo === 'entregable') onNavigate('proyectos'); // Temporalmente a proyectos
    else if (n.entidad_tipo === 'convocatoria') onNavigate('convocatorias');
    else if (n.entidad_tipo === 'producto') onNavigate('productos');
    
    if (!n.leida) handleMarcarLeida(n.id);
  };

  const filtered = notificaciones.filter(n => 
    n.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    n.mensaje.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
            <Bell size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Centro de Notificaciones</h1>
            <p className="text-sm text-slate-500 font-medium">Mantente al día con los hitos de tu investigación</p>
          </div>
        </div>
        <div className="flex gap-2">
          {stats.noLeidas > 0 && (
            <Button onClick={handleMarcarTodasLeidas} variant="outline" className="bg-white">
              Marcar todas como leídas
            </Button>
          )}
          <Button onClick={loadNotificaciones} variant="secondary">
            <Clock size={18} className="mr-2" /> Actualizar
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col lg:flex-row gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar en mensajes..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['todas', 'no_leidas', 'leidas'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                filter === f 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-white text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 ring-1 ring-slate-200'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 size={40} className="animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-500 font-bold">Sincronizando alertas...</p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map(n => {
            const Icon = TIPO_ICONS[n.entidad_tipo] || Info;
            return (
              <Card 
                key={n.id} 
                className={`p-0 overflow-hidden border-0 ring-1 transition-all group ${
                  n.leida ? 'ring-slate-100 opacity-80' : 'ring-indigo-200 shadow-md bg-indigo-50/30'
                }`}
              >
                <div className="flex items-stretch">
                  {/* Priority Bar */}
                  <div className={`w-1.5 ${
                    n.prioridad === 'urgente' ? 'bg-rose-500' : 
                    n.prioridad === 'alta' ? 'bg-amber-500' : 
                    'bg-indigo-400'
                  }`} />
                  
                  <div className="flex-1 p-5 flex flex-col md:flex-row md:items-center gap-4">
                    <div className={`p-3 rounded-2xl flex-shrink-0 ${n.leida ? 'bg-slate-100 text-slate-400' : 'bg-white text-indigo-600 shadow-sm'}`}>
                      <Icon size={24} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`font-bold text-sm truncate ${n.leida ? 'text-slate-600' : 'text-slate-900'}`}>
                          {n.titulo}
                        </h3>
                        {!n.leida && <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />}
                        <Badge variant="outline" className={`text-[9px] uppercase tracking-widest ${PRIORIDAD_COLORS[n.prioridad]}`}>
                          {n.prioridad}
                        </Badge>
                      </div>
                      <p className={`text-xs leading-relaxed line-clamp-2 ${n.leida ? 'text-slate-400' : 'text-slate-500'}`}>
                        {n.mensaje}
                      </p>
                      <div className="flex items-center gap-4 mt-3">
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <Clock size={12} /> {new Date(n.created_at).toLocaleString()}
                        </span>
                        {n.entidad_tipo && (
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                            {n.entidad_tipo}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:pl-4">
                      {n.entidad_id && (
                        <Button 
                          onClick={() => handleAction(n)} 
                          variant="primary" 
                          size="sm"
                          className="text-[10px] h-8"
                        >
                          Ir al recurso <ChevronRight size={14} className="ml-1" />
                        </Button>
                      )}
                      {!n.leida && (
                        <button 
                          onClick={() => handleMarcarLeida(n.id)}
                          className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-colors"
                          title="Marcar como leída"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleEliminar(n.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="py-20 text-center bg-white/50 rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell size={32} className="text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-bold">No hay notificaciones</h3>
            <p className="text-slate-500 text-sm mt-1">Todo está bajo control por ahora.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificacionesModule;
