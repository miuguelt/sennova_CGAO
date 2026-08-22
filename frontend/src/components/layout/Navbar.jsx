import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3, Users, FolderOpen, Layers, GraduationCap,
  Calendar, Award, FileText, Settings, Menu, Bell,
  User, LogOut, Lightbulb, Search, Command, X,
  Home, Briefcase, Book, Shield, MessageSquare,
  ChevronDown, ArrowRight, CheckCheck
} from 'lucide-react';
import { NotificacionesAPI } from '@/api/notificaciones';
import { MensajesAPI } from '@/api/mensajes';
import { navigateNotification, resolveNotificationTarget } from '@/utils/notificationNavigation';
import Badge from '../ui/Badge';

const PRIORIDAD_CLASS = {
  urgente: 'bg-rose-100 text-rose-700',
  alta:    'bg-amber-100 text-amber-700',
};

const Navbar = ({ currentUser, onLogout, onNavigate, onModuleAction, currentModule, onOpenSearch }) => {
  const [menuOpen, setMenuOpen]                           = useState(false);
  const [notificacionesPendientes, setNotificacionesPendientes] = useState(0);
  const [mensajesPendientes, setMensajesPendientes]       = useState(0);
  const [showNotificaciones, setShowNotificaciones]       = useState(false);
  const [notificaciones, setNotificaciones]               = useState([]);
  const [activeDropdown, setActiveDropdown]               = useState(null);
  
  const notifRef = useRef(null);
  const sidebarRef = useRef(null);
  const dropdownTimer = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    checkNotificaciones();
    checkMensajes();

    const onRealtimeSync = () => {
      checkMensajes();
      checkNotificaciones();
      if (showNotificaciones) {
        loadNotificaciones();
      }
    };

    window.addEventListener('sennova:mensaje_nuevo', onRealtimeSync);
    window.addEventListener('sennova:mensajes_leidos', onRealtimeSync);
    window.addEventListener('sennova:notificacion_update', onRealtimeSync);

    const id = setInterval(() => {
      checkNotificaciones();
      checkMensajes();
    }, 30_000);

    return () => {
      clearInterval(id);
      window.removeEventListener('sennova:mensaje_nuevo', onRealtimeSync);
      window.removeEventListener('sennova:mensajes_leidos', onRealtimeSync);
      window.removeEventListener('sennova:notificacion_update', onRealtimeSync);
    };
  }, [currentUser, showNotificaciones]);

  useEffect(() => {
    const onMousedown = (e) => {
      if (showNotificaciones && notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotificaciones(false);
      }
      if (menuOpen && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onMousedown);
    return () => document.removeEventListener('mousedown', onMousedown);
  }, [showNotificaciones, menuOpen]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [menuOpen]);

  const handleDropdownEnter = (label) => {
    if (dropdownTimer.current) clearTimeout(dropdownTimer.current);
    setActiveDropdown(label);
  };

  const handleDropdownLeave = () => {
    dropdownTimer.current = setTimeout(() => setActiveDropdown(null), 150);
  };

  const checkNotificaciones = async () => {
    try {
      const result = await NotificacionesAPI.checkPendientes();
      setNotificacionesPendientes(result.no_leidas || 0);
    } catch {}
  };

  const checkMensajes = async () => {
    try {
      const result = await MensajesAPI.getUnreadCount();
      setMensajesPendientes(result.no_leidos || 0);
    } catch {}
  };

  const loadNotificaciones = async () => {
    try {
      const result = await NotificacionesAPI.listar(null, 10);
      setNotificaciones(result || []);
    } catch {
      setNotificaciones([]);
    }
  };

  const handleToggleNotificaciones = async () => {
    if (!showNotificaciones) await loadNotificaciones();
    setShowNotificaciones(prev => !prev);
  };

  const marcarNotificacionLeida = async (id) => {
    try {
      await NotificacionesAPI.marcarLeida(id, true);
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
      setNotificacionesPendientes(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marcando notificación:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.leida) {
      await marcarNotificacionLeida(notif.id);
    }
    setShowNotificaciones(false);
    navigateNotification(notif, { onNavigate, onModuleAction });
  };

  const getNotifIcon = (tipo) => {
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

  const getMenuGroups = () => {
    const rol = currentUser?.rol;
    if (rol === 'admin') {
      return [
        {
          label: 'Gestión',
          items: [
            { id: 'dashboard', label: 'Dashboard General', icon: BarChart3 },
            { id: 'perfil',    label: 'Mi Perfil',        icon: User },
            { id: 'reportes',  label: 'Reportes y GTH-F-074', icon: FileText },
          ]
        },
        {
          label: 'Investigación',
          items: [
            { id: 'proyectos',     label: 'Proyectos I+D+i',       icon: FolderOpen },
            { id: 'bitacora',      label: 'Bitácoras Técnicas',    icon: Book },
            { id: 'cronograma',    label: 'Cronograma Entregables', icon: Calendar },
            { id: 'productos',     label: 'Productos Minciencias', icon: Award },
            { id: 'retos',         label: 'Banco de Retos',        icon: Lightbulb },
            { id: 'convocatorias', label: 'Convocatorias',         icon: Calendar },
          ]
        },
        {
          label: 'Grupo CGAO',
          items: [
            { id: 'grupos',         label: 'Grupo de Innovación CGAO', icon: Layers },
            { id: 'semilleros',     label: 'Semilleros de Investigación', icon: GraduationCap },
            { id: 'investigadores', label: 'Investigadores / Instructores', icon: Users },
            { id: 'aprendices',     label: 'Aprendices Semilleristas', icon: GraduationCap },
          ]
        },
        {
          label: 'Sistema',
          items: [
            { id: 'repositorio',   label: 'Repositorio & Formatos', icon: Book },
            { id: 'cvlac-admin',   label: 'Control CvLAC',          icon: FileText },
            { id: 'auditoria',     label: 'Auditoría & Logs',       icon: Shield },
            { id: 'configuracion', label: 'Configuración Global',   icon: Settings },
          ]
        }
      ];
    }

    if (rol === 'aprendiz') {
      return [
        {
          label: 'Mi Espacio',
          items: [
            { id: 'dashboard', label: 'Mi Tablero', icon: BarChart3 },
            { id: 'perfil',    label: 'Mi Perfil',  icon: User },
          ]
        },
        {
          label: 'Investigación Formativa',
          items: [
            { id: 'bitacora',      label: 'Mis Bitácoras',    icon: Book },
            { id: 'cronograma',    label: 'Mis Tareas & Hitos', icon: Calendar },
            { id: 'proyectos',     label: 'Mis Proyectos',    icon: FolderOpen },
            { id: 'retos',         label: 'Explorar Retos',   icon: Lightbulb },
          ]
        },
        {
          label: 'Formación',
          items: [
            { id: 'semilleros',  label: 'Mi Semillero',     icon: GraduationCap },
            { id: 'repositorio', label: 'Formatos & Guías', icon: Book },
          ]
        }
      ];
    }

    if (rol === 'instructor') {
      return [
        {
          label: 'Principal',
          items: [
            { id: 'dashboard', label: 'Mi Dashboard', icon: BarChart3 },
            { id: 'perfil',    label: 'Mi Perfil',    icon: User },
          ]
        },
        {
          label: 'I+D+i',
          items: [
            { id: 'proyectos',     label: 'Proyectos I+D+i',       icon: FolderOpen },
            { id: 'productos',     label: 'Productos Minciencias', icon: Award },
            { id: 'bitacora',      label: 'Bitácora & Tutoría',    icon: Book },
            { id: 'cronograma',    label: 'Cronograma Entregables', icon: Calendar },
            { id: 'retos',         label: 'Banco de Retos',        icon: Lightbulb },
            { id: 'convocatorias', label: 'Convocatorias',         icon: Calendar },
          ]
        },
        {
          label: 'Red Científica',
          items: [
            { id: 'grupos',         label: 'Grupo CGAO',           icon: Layers },
            { id: 'semilleros',     label: 'Semilleros Tutorados', icon: GraduationCap },
            { id: 'investigadores', label: 'Red de Docentes',      icon: Users },
            { id: 'aprendices',     label: 'Mis Aprendices',       icon: GraduationCap },
          ]
        },
        {
          label: 'Recursos',
          items: [
            { id: 'repositorio',   label: 'Repositorio & Formatos', icon: Book },
            { id: 'reportes',      label: 'Reportes y GTH-F-074',   icon: FileText },
          ]
        }
      ];
    }

    // Default: Rol Investigador SENNOVA
    return [
      {
        label: 'Principal',
        items: [
          { id: 'dashboard', label: 'Mi Dashboard', icon: BarChart3 },
          { id: 'perfil',    label: 'Mi Perfil',    icon: User },
        ]
      },
      {
        label: 'I+D+i',
        items: [
          { id: 'proyectos',     label: 'Proyectos I+D+i',         icon: FolderOpen },
          { id: 'productos',     label: 'Productos Minciencias',   icon: Award },
          { id: 'bitacora',      label: 'Bitácora & Coinvestigación', icon: Book },
          { id: 'cronograma',    label: 'Cronograma Entregables',  icon: Calendar },
          { id: 'retos',         label: 'Banco de Retos',          icon: Lightbulb },
          { id: 'convocatorias', label: 'Convocatorias',           icon: Calendar },
        ]
      },
      {
        label: 'Red Científica',
        items: [
          { id: 'grupos',         label: 'Grupo CGAO',             icon: Layers },
          { id: 'semilleros',     label: 'Semilleros de Investigación', icon: GraduationCap },
          { id: 'investigadores', label: 'Red de Investigadores',  icon: Users },
          { id: 'aprendices',     label: 'Aprendices Semilleristas', icon: GraduationCap },
        ]
      },
      {
        label: 'Recursos',
        items: [
          { id: 'repositorio',   label: 'Repositorio & Formatos', icon: Book },
          { id: 'reportes',      label: 'Reportes Científicos',   icon: FileText },
        ]
      }
    ];
  };

  const menuGroups = getMenuGroups();

  const bottomNavItems = currentUser?.rol === 'aprendiz' ? [
    { id: 'grupos', label: 'Inicio', icon: Home },
    { id: 'bitacora', label: 'Bitácoras', icon: Book },
    { id: 'mensajes', label: 'Mensajes', icon: MessageSquare, badge: mensajesPendientes },
    { id: 'notificaciones', label: 'Notif.', icon: Bell, badge: notificacionesPendientes },
    { id: 'menu', label: 'Más', icon: Menu, isToggle: true },
  ] : [
    { id: 'grupos', label: 'Inicio', icon: Home },
    { id: 'proyectos', label: 'Proyectos', icon: Briefcase },
    { id: 'mensajes', label: 'Mensajes', icon: MessageSquare, badge: mensajesPendientes },
    { id: 'notificaciones', label: 'Notif.', icon: Bell, badge: notificacionesPendientes },
    { id: 'menu', label: 'Más', icon: Menu, isToggle: true },
  ];

  const isModuleInGroup = (group) => group.items.some(item => item.id === currentModule);

  const getRoleLabel = () => {
    switch (currentUser?.rol) {
      case 'admin': return 'Líder SENNOVA';
      case 'instructor': return 'Instructor Investigador';
      case 'aprendiz': return 'Aprendiz Semillerista';
      default: return 'Investigador SENNOVA';
    }
  };

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-sm transition-all">
        <div className="px-4 sm:px-8 py-2.5">
          <div className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-8">
              {/* Brand Logo */}
              <div 
                className="flex items-center gap-3 cursor-pointer group" 
                onClick={() => onNavigate('grupos')}
                title="Ir al Grupo de Investigación CGAO (Inicio)"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-[#39A900] to-[#2d8000] rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-600/20 group-hover:scale-105 group-hover:shadow-lg transition-all duration-200">
                  <Lightbulb size={20} className="text-white" />
                </div>
                <div className="leading-tight hidden sm:block">
                  <p className="font-black text-slate-900 text-lg tracking-tight group-hover:text-emerald-700 transition-colors">SENNOVA</p>
                  <p className="text-[10px] text-emerald-700 font-black uppercase tracking-widest">CGAO VÉLEZ</p>
                </div>
              </div>

              {/* Desktop Navigation */}
              <nav className="hidden lg:flex items-center gap-1.5" aria-label="Navegación principal">
                {menuGroups.map((group) => {
                  const hasActive = isModuleInGroup(group);
                  const isOpen = activeDropdown === group.label;
                  return (
                    <div 
                      key={group.label} 
                      className="relative" 
                      onMouseEnter={() => handleDropdownEnter(group.label)} 
                      onMouseLeave={handleDropdownLeave}
                    >
                      <button 
                        type="button"
                        onClick={() => setActiveDropdown(isOpen ? null : group.label)}
                        aria-expanded={isOpen}
                        className={`group/btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                          hasActive 
                            ? 'bg-emerald-50 text-emerald-800 font-black ring-1 ring-emerald-300' 
                            : 'text-slate-700 font-bold hover:text-slate-950 hover:bg-slate-100'
                        }`}
                      >
                        <span>{group.label}</span>
                        <ChevronDown 
                          size={14} 
                          className={`transition-transform duration-200 ${
                            isOpen ? 'rotate-180 text-emerald-700' : 'text-slate-500 group-hover/btn:text-slate-800'
                          }`} 
                        />
                      </button>

                      {/* Dropdown Container with Hover Bridge */}
                      <div 
                        className={`absolute top-full left-0 pt-1.5 w-64 z-50 transition-all duration-200 origin-top-left ${
                          isOpen ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                        }`}
                      >
                        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/80 p-2 ring-1 ring-slate-900/5 max-h-[85vh] overflow-y-auto scrollbar-thin">
                          <div className="px-3 py-2 mb-1 border-b border-slate-100 flex items-center justify-between">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{group.label}</p>
                            <span className="text-[10px] font-black text-slate-700 px-1.5 py-0.5 rounded-full bg-slate-100">{group.items.length}</span>
                          </div>
                          <div className="space-y-0.5">
                            {group.items.map(({ id, label, icon: Icon }) => {
                              const active = currentModule === id;
                              return (
                                <button 
                                  key={id} 
                                  onClick={() => { onNavigate(id); setActiveDropdown(null); }} 
                                  title={label}
                                  className={`w-full group/item flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-left transition-all ${
                                    active 
                                      ? 'bg-gradient-to-r from-emerald-700 to-emerald-800 text-white font-black shadow-md shadow-emerald-700/20' 
                                      : 'text-slate-800 font-bold hover:bg-emerald-50 hover:text-emerald-900'
                                  }`}
                                >
                                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                    active 
                                      ? 'bg-white/20 text-white' 
                                      : 'bg-slate-100 text-slate-700 group-hover/item:bg-emerald-100 group-hover/item:text-emerald-800'
                                  }`}>
                                    <Icon size={15} />
                                  </div>
                                  <span className="truncate">{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* Right Tools & User Info */}
            <div className="flex items-center gap-3">
              <div className="hidden xl:block relative w-60 group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-700 transition-colors" />
                <input 
                  type="text" 
                  onClick={onOpenSearch} 
                  readOnly 
                  placeholder="Búsqueda rápida..." 
                  className="w-full pl-9 pr-12 py-2 bg-slate-100 border border-slate-200 focus:bg-white focus:border-emerald-500 rounded-xl text-xs font-bold text-slate-800 cursor-pointer transition-all outline-none" 
                />
                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-white text-slate-600 rounded-md text-[10px] font-black border border-slate-300 shadow-2xs">⌘K</kbd>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <button 
                  onClick={onOpenSearch} 
                  className="xl:hidden p-2.5 text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  title="Buscar" aria-label="Buscar"
                >
                  <Search size={20} aria-hidden="true" />
                </button>
                
                {/* Botón de Mensajes con Badge */}
                <button
                  onClick={() => onNavigate('mensajes')}
                  className={`relative p-2.5 rounded-xl transition-all ${
                    currentModule === 'mensajes'
                      ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300'
                      : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                  }`}
                  title="Mensajería" aria-label="Mensajería"
                >
                  <MessageSquare size={20} aria-hidden="true" />
                  {mensajesPendientes > 0 && (
                    <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 bg-emerald-700 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs leading-none">
                      {mensajesPendientes > 9 ? '9+' : mensajesPendientes}
                    </span>
                  )}
                </button>

                {/* Notificaciones */}
                <div className="relative" ref={notifRef}>
                  <button 
                    onClick={handleToggleNotificaciones} 
                    className={`relative p-2.5 rounded-xl transition-all ${
                      showNotificaciones 
                        ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-300' 
                        : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                    }`}
                    title="Notificaciones" aria-label="Notificaciones"
                  >
                    <Bell size={20} aria-hidden="true" />
                    {notificacionesPendientes > 0 && (
                      <span className="absolute top-2 right-2 min-w-[16px] h-4 px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-xs leading-none">
                        {notificacionesPendientes > 9 ? '9+' : notificacionesPendientes}
                      </span>
                    )}
                  </button>
                  {showNotificaciones && (
                    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-slideUp overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Notificaciones</h3>
                          {notificacionesPendientes > 0 && (
                            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                              {notificacionesPendientes} nuevas
                            </span>
                          )}
                        </div>
                        {notificacionesPendientes > 0 && (
                          <button 
                            onClick={async () => {
                              try {
                                await NotificacionesAPI.marcarTodasLeidas();
                                setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
                                setNotificacionesPendientes(0);
                              } catch (e) {
                                console.error('Error al marcar todas:', e);
                              }
                            }} 
                            className="text-[10px] text-emerald-700 font-bold uppercase tracking-wide hover:underline flex items-center gap-1"
                          >
                            <CheckCheck size={12} /> Marcar leídas
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-slate-100">
                        {notificaciones.length === 0 ? (
                          <div className="py-12 text-center text-sm text-slate-500 font-bold">
                            <Bell size={32} className="mx-auto text-slate-300 mb-2" />
                            Sin notificaciones recientes
                          </div>
                        ) : (
                          notificaciones.map(n => {
                            const IconComp = getNotifIcon(n.entidad_tipo || n.tipo);
                            return (
                              <button 
                                key={n.id} 
                                className={`w-full text-left px-4 py-3 hover:bg-slate-100/80 transition-colors flex items-start gap-3 group ${
                                  !n.leida ? 'bg-emerald-50/50' : ''
                                }`} 
                                onClick={() => handleNotificationClick(n)}
                              >
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                  !n.leida ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                                }`}>
                                  <IconComp size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className={`text-xs font-black truncate ${!n.leida ? 'text-slate-950' : 'text-slate-800'}`}>
                                      {n.titulo}
                                    </p>
                                    {!n.leida && (
                                      <span className="w-2 h-2 rounded-full bg-emerald-600 flex-shrink-0 animate-pulse" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-600 font-medium line-clamp-2 mt-0.5 leading-relaxed">
                                    {n.mensaje || n.titulo}
                                  </p>
                                  <div className="flex items-center justify-between mt-2">
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tight ${PRIORIDAD_CLASS[n.prioridad] ?? 'bg-slate-200 text-slate-800'}`}>
                                      {n.prioridad}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500">
                                      {new Date(n.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                      <div className="p-2 border-t border-slate-200 bg-slate-50">
                        <button 
                          onClick={() => { setShowNotificaciones(false); onNavigate('notificaciones'); }}
                          className="w-full py-2 px-3 text-center text-xs font-black text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span>Ver todas las notificaciones</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

                {/* Profile Pill */}
                <button 
                  type="button" 
                  onClick={() => onNavigate('perfil')} 
                  className="hidden sm:flex items-center gap-3 pl-3 pr-1.5 py-1 rounded-2xl bg-slate-50 border border-slate-300 hover:bg-white hover:border-emerald-300 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  title="Ver Mi Perfil"
                >
                  <div className="text-right leading-tight">
                    <p className="text-xs font-black text-slate-900">{(currentUser?.nombre || '').split(' ')[0]}</p>
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                      {getRoleLabel()}
                    </p>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-tr from-[#175200] to-emerald-600 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-inner">
                    {(currentUser?.nombre || '?').charAt(0)}
                  </div>
                </button>

                {/* Logout Button */}
                <button 
                  onClick={onLogout} 
                  className="p-2.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500" 
                  title="Cerrar sesión" aria-label="Cerrar sesión"
                >
                  <LogOut size={20} aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-[60] lg:hidden transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" onClick={() => setMenuOpen(false)} />
        <aside ref={sidebarRef} className={`absolute top-0 left-0 bottom-0 w-[290px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <button onClick={() => setMenuOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white hover:text-white transition-colors"><X size={18} /></button>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-xl font-black text-emerald-800 shadow-xl mb-3">{(currentUser?.nombre || '?').charAt(0)}</div>
              <h2 className="font-bold text-base leading-tight truncate text-white">{currentUser?.nombre}</h2>
              <p className="text-emerald-300 text-[11px] font-bold uppercase tracking-wider mt-0.5">
                {getRoleLabel()}
              </p>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto scrollbar-thin p-4 space-y-6">
            {menuGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <h3 className="px-3 py-1 text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">{group.label}</h3>
                <div className="space-y-0.5">
                  {group.items.map(({ id, label, icon: Icon }) => {
                    const active = currentModule === id;
                    return (
                      <button 
                        key={id} 
                        onClick={() => { onNavigate(id); setMenuOpen(false); }} 
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          active 
                            ? 'bg-emerald-50 text-emerald-900 shadow-sm ring-1 ring-emerald-300' 
                            : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                        }`}
                      >
                        <div className={`p-2 rounded-lg ${active ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-600'}`}>
                          <Icon size={18} />
                        </div>
                        <span className="truncate">{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-700 hover:bg-rose-50 transition-colors">
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[55] px-2 py-1.5 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.05)] flex items-center justify-around">
        {bottomNavItems.map(({ id, label, icon: Icon, badge, isToggle }) => {
          const active = isToggle ? menuOpen : currentModule === id;
          const handleClick = () => { if (isToggle) setMenuOpen(!menuOpen); else if (id === 'notificaciones') handleToggleNotificaciones(); else onNavigate(id); };
          return (
            <button key={id} onClick={handleClick} className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 max-w-[70px] ${active ? 'text-emerald-800' : 'text-slate-600 hover:text-slate-900'}`}>
              <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'scale-100'}`}><Icon size={22} strokeWidth={active ? 2.5 : 2} /></div>
              <span className={`text-[10px] font-bold tracking-tight transition-colors ${active ? 'text-emerald-900 font-black' : 'text-slate-600'}`}>{label}</span>
              {badge > 0 && <span className="absolute top-1.5 right-4 min-w-[15px] h-[15px] bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white leading-none">{badge > 9 ? '!' : badge}</span>}
              {active && !isToggle && <div className="absolute -bottom-1.5 w-1 h-1 bg-emerald-700 rounded-full shadow-[0_0_8px_rgba(5,150,105,0.6)]" />}
            </button>
          );
        })}
      </nav>
      <div className="lg:hidden h-16 pointer-events-none" />
    </>
  );
};

export default Navbar;
