import React, { useState, useEffect } from 'react';
import { 
  Bell, CheckCircle2, AlertTriangle, Clock, Trash2, 
  Filter, Search, ArrowRight, Info, ExternalLink,
  ChevronRight, Calendar, Loader2, Mail, MailOpen,
  FolderOpen, Award, MessageSquare, Book, User,
  Layers, GraduationCap, Lightbulb, FileText, CheckCheck,
  RefreshCw, Sparkles, Eye, X
} from 'lucide-react';
import { NotificacionesAPI } from '@/api/notificaciones';
import { navigateNotification, resolveNotificationTarget } from '@/utils/notificationNavigation';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';

const PRIORIDAD_COLORS = {
  baja:   'text-slate-600 bg-slate-100 border-slate-200',
  normal: 'text-blue-700 bg-blue-50 border-blue-200',
  alta:   'text-amber-700 bg-amber-50 border-amber-200',
  urgente: 'text-rose-700 bg-rose-50 border-rose-200',
};

const getTipoIcon = (tipo) => {
  switch ((tipo || '').toLowerCase()) {
    case 'proyecto': return FolderOpen;
    case 'entregable':
    case 'cronograma': return Calendar;
    case 'convocatoria': return Calendar;
    case 'producto': return Award;
    case 'mensaje': return MessageSquare;
    case 'bitacora': return Book;
    case 'perfil':
    case 'cvlac': return User;
    case 'semillero':
    case 'semilleros': return GraduationCap;
    case 'grupo':
    case 'grupos': return Layers;
    case 'reto':
    case 'retos': return Lightbulb;
    case 'reporte':
    case 'reportes': return FileText;
    default: return Bell;
  }
};

const NotificacionesModule = ({ currentUser, onNotify, onNavigate, onModuleAction }) => {
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('todas'); // todas, leidas, no_leidas
  const [priorityFilter, setPriorityFilter] = useState('todas'); // todas, urgente, alta, normal, baja
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ total: 0, noLeidas: 0 });
  const [selectedNotif, setSelectedNotif] = useState(null);

  useEffect(() => {
    loadNotificaciones();
  }, [filter]);

  const loadNotificaciones = async () => {
    setLoading(true);
    try {
      let data = [];
      if (filter === 'no_leidas') {
        data = await NotificacionesAPI.listar(true);
      } else if (filter === 'leidas') {
        data = await NotificacionesAPI.listar('leidas');
      } else {
        data = await NotificacionesAPI.listar(null);
      }
      setNotificaciones(Array.isArray(data) ? data : []);
      
      const statsData = await NotificacionesAPI.checkPendientes();
      setStats({
        total: statsData.total || (Array.isArray(data) ? data.length : 0),
        noLeidas: statsData.no_leidas || 0
      });
    } catch (err) {
      onNotify?.('Error al cargar notificaciones', 'error');
    }
    setLoading(false);
  };

  const handleMarcarLeida = async (id, leida = true) => {
    try {
      await NotificacionesAPI.marcarLeida(id, leida);
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida } : n));
      setStats(prev => ({ 
        ...prev, 
        noLeidas: Math.max(0, prev.noLeidas + (leida ? -1 : 1)) 
      }));
      if (selectedNotif?.id === id) {
        setSelectedNotif(prev => prev ? { ...prev, leida } : null);
      }
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
      if (selectedNotif) {
        setSelectedNotif(prev => prev ? { ...prev, leida: true } : null);
      }
      onNotify?.('Todas las notificaciones marcadas como leídas', 'success');
    } catch (err) {
      onNotify?.('Error al actualizar notificaciones', 'error');
    }
  };

  const handleEliminar = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await NotificacionesAPI.eliminar(id);
      setNotificaciones(prev => prev.filter(n => n.id !== id));
      if (selectedNotif?.id === id) {
        setSelectedNotif(null);
      }
      onNotify?.('Notificación eliminada', 'success');
    } catch (err) {
      onNotify?.('Error al eliminar notificación', 'error');
    }
  };

  const handleLimpiarLeidas = async () => {
    if (!window.confirm('¿Eliminar notificaciones leídas de más de 30 días?')) return;
    try {
      await NotificacionesAPI.limpiarLeidas(30);
      onNotify?.('Notificaciones leídas limpiadas', 'success');
      loadNotificaciones();
    } catch (err) {
      onNotify?.('Error al limpiar notificaciones', 'error');
    }
  };

  const handleRowClick = (n) => {
    if (!n.leida) {
      handleMarcarLeida(n.id, true);
    }
    setSelectedNotif(n);
  };

  const handleAction = (n, e) => {
    if (e) e.stopPropagation();
    if (!n.leida) {
      handleMarcarLeida(n.id, true);
    }
    setSelectedNotif(null);
    navigateNotification(n, { onNavigate, onModuleAction });
  };

  const filtered = notificaciones.filter(n => {
    const matchesSearch = 
      (n.titulo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.mensaje || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (n.entidad_tipo || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPriority = 
      priorityFilter === 'todas' || 
      (n.prioridad || '').toLowerCase() === priorityFilter.toLowerCase();

    return matchesSearch && matchesPriority;
  });

  const selectedTarget = selectedNotif ? resolveNotificationTarget(selectedNotif) : null;
  const SelectedIcon = selectedNotif ? getTipoIcon(selectedNotif.entidad_tipo || selectedNotif.tipo) : Bell;

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl shadow-lg shadow-emerald-600/20">
            <Bell size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Centro de Notificaciones</h1>
              {stats.noLeidas > 0 && (
                <span className="bg-emerald-100 text-emerald-800 text-xs font-black px-2.5 py-0.5 rounded-full">
                  {stats.noLeidas} pendientes
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 font-medium">Alertas, convocatorias, entregables y eventos de tu ecosistema</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.noLeidas > 0 && (
            <Button onClick={handleMarcarTodasLeidas} variant="outline" className="bg-white text-xs font-bold">
              <CheckCheck size={16} className="mr-1.5 text-emerald-600" /> Marcar todas leídas
            </Button>
          )}
          <Button onClick={handleLimpiarLeidas} variant="outline" className="bg-white text-xs font-bold text-slate-600 hover:text-rose-600">
            <Trash2 size={16} className="mr-1.5" /> Limpiar leídas
          </Button>
          <Button onClick={loadNotificaciones} variant="secondary" className="text-xs font-bold">
            <RefreshCw size={16} className="mr-1.5" /> Actualizar
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="flex flex-col lg:flex-row gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por título, contenido o tipo..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-sm font-medium outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Status filter tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'no_leidas', label: 'No leídas' },
            { id: 'leidas', label: 'Leídas' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                filter === f.id 
                ? 'bg-white text-emerald-800 shadow-xs' 
                : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Priority filter pills */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {['todas', 'urgente', 'alta', 'normal', 'baja'].map(p => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                priorityFilter === p
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ── */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-slate-200">
            <Loader2 size={36} className="animate-spin text-emerald-600 mx-auto mb-3" />
            <p className="text-slate-600 font-bold text-sm">Sincronizando notificaciones...</p>
          </div>
        ) : filtered.length > 0 ? (
          filtered.map(n => {
            const Icon = getTipoIcon(n.entidad_tipo || n.tipo);
            const target = resolveNotificationTarget(n);
            return (
              <div
                key={n.id} 
                onClick={() => handleRowClick(n)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  !n.leida 
                    ? 'bg-emerald-50/40 border-emerald-200 shadow-sm hover:border-emerald-300 hover:shadow-md' 
                    : 'bg-white border-slate-200/80 opacity-90 hover:opacity-100 hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors ${
                    !n.leida ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' : 'bg-slate-100 text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700'
                  }`}>
                    <Icon size={20} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`font-bold text-sm truncate ${!n.leida ? 'text-slate-900 font-black' : 'text-slate-700'}`}>
                        {n.titulo}
                      </h3>
                      {!n.leida && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white animate-pulse">
                          Nuevo
                        </span>
                      )}
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${PRIORIDAD_COLORS[n.prioridad] || PRIORIDAD_COLORS.normal}`}>
                        {n.prioridad}
                      </span>
                      {n.entidad_tipo && (
                        <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {n.entidad_tipo}
                        </span>
                      )}
                    </div>

                    <p className={`text-xs leading-relaxed line-clamp-2 ${!n.leida ? 'text-slate-700' : 'text-slate-500'}`}>
                      {n.mensaje}
                    </p>

                    <div className="flex items-center gap-4 mt-2">
                      <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                        <Clock size={12} /> {new Date(n.created_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Eye size={12} /> Ver detalle
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center" onClick={e => e.stopPropagation()}>
                  {target?.label && (
                    <Button 
                      onClick={(e) => handleAction(n, e)} 
                      variant="primary" 
                      size="sm"
                      className="text-xs h-8 px-3 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      {target.label} <ChevronRight size={14} className="ml-1" />
                    </Button>
                  )}
                  <button 
                    onClick={() => handleMarcarLeida(n.id, !n.leida)}
                    className={`p-2 rounded-xl transition-colors ${
                      !n.leida 
                        ? 'text-emerald-700 hover:bg-emerald-100' 
                        : 'text-slate-400 hover:text-emerald-700 hover:bg-slate-100'
                    }`}
                    title={!n.leida ? 'Marcar como leída' : 'Marcar como no leída'}
                  >
                    {!n.leida ? <CheckCircle2 size={18} /> : <Mail size={18} />}
                  </button>
                  <button 
                    onClick={(e) => handleEliminar(n.id, e)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Eliminar notificación"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Bell size={32} />
            </div>
            <h3 className="text-slate-800 font-bold text-base">No hay notificaciones</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
              No tienes alertas con los filtros seleccionados.
            </p>
          </div>
        )}
      </div>

      {/* ── Notification Detail Modal ── */}
      {selectedNotif && (
        <Modal
          isOpen={!!selectedNotif}
          onClose={() => setSelectedNotif(null)}
          title="Detalle de Notificación"
          maxWidth="max-w-lg"
        >
          <div className="space-y-5">
            <div className="flex items-start gap-3.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-600/20">
                <SelectedIcon size={24} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-900 text-base leading-snug">
                  {selectedNotif.titulo}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${PRIORIDAD_COLORS[selectedNotif.prioridad] || PRIORIDAD_COLORS.normal}`}>
                    Prioridad {selectedNotif.prioridad}
                  </span>
                  {selectedNotif.entidad_tipo && (
                    <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                      {selectedNotif.entidad_tipo}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 font-medium">
                    {new Date(selectedNotif.created_at).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Mensaje</h4>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {selectedNotif.mensaje}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleMarcarLeida(selectedNotif.id, !selectedNotif.leida)}
                  className="text-xs font-bold flex-1 sm:flex-initial"
                >
                  {selectedNotif.leida ? <Mail size={14} className="mr-1.5" /> : <CheckCircle2 size={14} className="mr-1.5 text-emerald-600" />}
                  {selectedNotif.leida ? 'Marcar no leída' : 'Marcar leída'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleEliminar(selectedNotif.id, e)}
                  className="text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-200"
                >
                  <Trash2 size={14} className="mr-1.5" /> Eliminar
                </Button>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {selectedTarget?.label && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={(e) => handleAction(selectedNotif, e)}
                    className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                  >
                    {selectedTarget.label} <ArrowRight size={14} className="ml-1.5" />
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedNotif(null)}
                  className="text-xs font-bold"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default NotificacionesModule;

