import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart3, Users, FolderOpen, Layers, GraduationCap,
  Calendar, Award, FileText, Settings, Menu, Bell,
  User, LogOut, Lightbulb, Search, Command, X,
  Home, Briefcase, MoreHorizontal, Book, Shield
} from 'lucide-react';
import { NotificacionesAPI } from '@/api/notificaciones';
import Badge from '../ui/Badge';

const PRIORIDAD_CLASS = {
  urgente: 'bg-rose-100 text-rose-700',
  alta:    'bg-amber-100 text-amber-700',
};

const Navbar = ({ currentUser, onLogout, onNavigate, currentModule, onOpenSearch }) => {
  const [menuOpen, setMenuOpen]                           = useState(false);
  const [notificacionesPendientes, setNotificacionesPendientes] = useState(0);
  const [showNotificaciones, setShowNotificaciones]       = useState(false);
  const [notificaciones, setNotificaciones]               = useState([]);
  const [activeDropdown, setActiveDropdown]               = useState(null);
  
  const notifRef = useRef(null);
  const sidebarRef = useRef(null);
  const dropdownTimer = useRef(null);

  useEffect(() => {
    if (!currentUser) return;
    checkNotificaciones();
    const id = setInterval(checkNotificaciones, 60_000);
    return () => clearInterval(id);
  }, [currentUser]);

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

  const loadNotificaciones = async () => {
    try {
      const result = await NotificacionesAPI.listar(true, 10);
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
      setNotificaciones(prev => prev.filter(n => n.id !== id));
      setNotificacionesPendientes(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marcando notificación:', err);
    }
  };

  const menuGroups = currentUser?.rol === 'admin' ? [
    {
      label: 'Gestión',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'perfil',    label: 'Mi Perfil',  icon: User },
        { id: 'reportes',  label: 'Reportes',   icon: FileText },
      ]
    },
    {
      label: 'Investigación',
      items: [
        { id: 'proyectos',     label: 'Proyectos',     icon: FolderOpen },
        { id: 'bitacora',      label: 'Bitácora',      icon: Book },
        { id: 'cronograma',    label: 'Cronograma',    icon: Calendar },
        { id: 'productos',     label: 'Productos',     icon: Award },
        { id: 'retos',         label: 'Banco de Retos', icon: Lightbulb },
        { id: 'convocatorias', label: 'Convocatorias', icon: Calendar },
      ]
    },
    {
      label: 'Estructuras',
      items: [
        { id: 'grupos',         label: 'Grupos',        icon: Layers },
        { id: 'semilleros',     label: 'Semilleros',    icon: GraduationCap },
        { id: 'investigadores', label: 'Investigadores', icon: Users },
      ]
    },
    {
      label: 'Sistema',
      items: [
        { id: 'cvlac-admin',   label: 'Control CVLAC', icon: FileText },
        { id: 'auditoria',     label: 'Auditoría Completa', icon: Shield },
        { id: 'biblioteca',    label: 'Biblioteca',    icon: Layers },
        { id: 'configuracion', label: 'Configuración', icon: Settings },
      ]
    }
  ] : [
    {
      label: 'Principal',
      items: [
        { id: 'dashboard', label: 'Mi Dashboard', icon: BarChart3 },
        { id: 'perfil',    label: 'Mi Perfil',    icon: User },
      ]
    },
    {
      label: 'Investigación',
      items: [
        { id: 'mis-proyectos', label: 'Mis Proyectos', icon: FolderOpen },
        { id: 'mis-productos', label: 'Mis Productos', icon: Award },
        { id: 'retos',         label: 'Banco de Retos', icon: Lightbulb },
      ]
    }
  ];

  const bottomNavItems = [
    { id: 'dashboard', label: 'Inicio', icon: Home },
    { id: 'proyectos', label: 'Proyectos', icon: Briefcase },
    { id: 'productos', label: 'Productos', icon: Award },
    { id: 'notificaciones', label: 'Notif.', icon: Bell, badge: notificacionesPendientes },
    { id: 'menu', label: 'Más', icon: Menu, isToggle: true },
  ];

  const isModuleInGroup = (group) => group.items.some(item => item.id === currentModule);
  const iconButtonCls = 'p-2.5 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500';

  return (
    <>
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="px-4 sm:px-8 py-2.5">
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onNavigate('dashboard')}>
                <div className="w-10 h-10 bg-gradient-to-br from-[#39A900] to-[#2d8000] rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                  <Lightbulb size={20} className="text-white" />
                </div>
                <div className="leading-tight hidden sm:block">
                  <p className="font-black text-slate-900 text-lg tracking-tight">SENNOVA</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">CGAO VÉLEZ</p>
                </div>
              </div>

              <nav className="hidden lg:flex items-center gap-1">
                {menuGroups.map((group) => {
                  const hasActive = isModuleInGroup(group);
                  const isOpen = activeDropdown === group.label;
                  return (
                    <div key={group.label} className="relative px-1" onMouseEnter={() => handleDropdownEnter(group.label)} onMouseLeave={handleDropdownLeave}>
                      <button className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${hasActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}>
                        {group.label}
                        <div className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}><MoreHorizontal size={14} className="opacity-40" /></div>
                      </button>
                      <div className={`absolute top-full left-0 mt-1 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2 transition-all duration-200 origin-top-left z-50 ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
                        <div className="px-3 py-2 mb-1 border-b border-slate-50"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{group.label}</p></div>
                        {group.items.map(({ id, label, icon: Icon }) => {
                          const active = currentModule === id;
                          return (
                            <button key={id} onClick={() => { onNavigate(id); setActiveDropdown(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${active ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'}`}>
                              <Icon size={16} />{label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden xl:block relative w-64 group">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input type="text" onClick={onOpenSearch} readOnly placeholder="Búsqueda rápida..." className="w-full pl-10 pr-12 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-emerald-300 rounded-xl text-xs font-medium cursor-pointer transition-all border outline-none" />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-white text-slate-400 rounded-md text-[10px] font-bold border border-slate-200">⌘K</kbd>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <button onClick={onOpenSearch} className="xl:hidden p-2.5 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"><Search size={20} /></button>
                <div className="relative" ref={notifRef}>
                  <button onClick={handleToggleNotificaciones} className="relative p-2.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 rounded-xl transition-all">
                    <Bell size={20} />
                    {notificacionesPendientes > 0 && <span className="absolute top-2 right-2 w-4 h-4 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">{notificacionesPendientes > 9 ? '+' : notificacionesPendientes}</span>}
                  </button>
                  {showNotificaciones && (
                    <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 animate-slideUp overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Notificaciones</h3>
                        {notificacionesPendientes > 0 && <button onClick={async () => { await NotificacionesAPI.marcarTodasLeidas(); setNotificaciones([]); setNotificacionesPendientes(0); }} className="text-[10px] text-emerald-700 font-bold uppercase tracking-wide">Limpiar todo</button>}
                      </div>
                      <div className="max-h-80 overflow-y-auto scrollbar-thin divide-y divide-slate-50">
                        {notificaciones.length === 0 ? (
                          <div className="py-12 text-center text-sm text-slate-400 font-medium"><Bell size={32} className="mx-auto text-slate-200 mb-2" />Nada por aquí</div>
                        ) : (
                          notificaciones.map(n => (
                            <button key={n.id} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors" onClick={() => { marcarNotificacionLeida(n.id); if (n.entidad_tipo === 'proyecto') onNavigate('proyectos'); setShowNotificaciones(false); }}>
                              <p className="text-sm font-semibold text-slate-800 leading-snug">{n.titulo}</p>
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{n.mensaje || n.titulo}</p>
                              <div className="flex items-center justify-between mt-2.5">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${PRIORIDAD_CLASS[n.prioridad] ?? 'bg-slate-100 text-slate-600'}`}>{n.prioridad}</span>
                                <span className="text-[10px] font-medium text-slate-400">{new Date(n.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</span>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />
                <button type="button" onClick={() => onNavigate('perfil')} className="hidden sm:flex items-center gap-3 pl-2 pr-1 py-1 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                  <div className="text-right leading-none"><p className="text-xs font-black text-slate-900">{(currentUser?.nombre || '').split(' ')[0]}</p><p className="text-[10px] text-slate-500 font-bold uppercase">{currentUser?.rol}</p></div>
                  <div className="w-9 h-9 bg-gradient-to-tr from-emerald-600 to-emerald-400 rounded-xl flex items-center justify-center text-xs font-black text-white shadow-inner">{(currentUser?.nombre || '?').charAt(0)}</div>
                </button>
                <button onClick={onLogout} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Cerrar sesión"><LogOut size={20} /></button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={`fixed inset-0 z-[60] lg:hidden transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setMenuOpen(false)} />
        <aside ref={sidebarRef} className={`absolute top-0 left-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
            <button onClick={() => setMenuOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"><X size={18} /></button>
            <div className="relative z-10">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-xl font-bold text-emerald-700 shadow-xl mb-4">{(currentUser?.nombre || '?').charAt(0)}</div>
              <h2 className="font-bold text-lg leading-tight">{currentUser?.nombre}</h2>
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mt-1">{currentUser?.rol}</p>
            </div>
          </div>
          <div className="flex-grow overflow-y-auto scrollbar-thin p-4 space-y-6">
            {menuGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <h3 className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{group.label}</h3>
                <div className="space-y-0.5">
                  {group.items.map(({ id, label, icon: Icon }) => {
                    const active = currentModule === id;
                    return (
                      <button key={id} onClick={() => { onNavigate(id); setMenuOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${active ? 'bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-100' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}>
                        <div className={`p-2 rounded-lg ${active ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}><Icon size={18} /></div>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"><LogOut size={18} />Cerrar Sesión</button>
          </div>
        </aside>
      </div>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-[55] px-2 py-1.5 pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.05)] flex items-center justify-around">
        {bottomNavItems.map(({ id, label, icon: Icon, badge, isToggle }) => {
          const active = isToggle ? menuOpen : currentModule === id;
          const handleClick = () => { if (isToggle) setMenuOpen(!menuOpen); else if (id === 'notificaciones') handleToggleNotificaciones(); else onNavigate(id); };
          return (
            <button key={id} onClick={handleClick} className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all flex-1 max-w-[70px] ${active ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}>
              <div className={`transition-transform duration-200 ${active ? 'scale-110' : 'scale-100'}`}><Icon size={22} strokeWidth={active ? 2.5 : 2} /></div>
              <span className={`text-[10px] font-bold tracking-tight transition-colors ${active ? 'text-emerald-800' : 'text-slate-400'}`}>{label}</span>
              {badge > 0 && <span className="absolute top-1.5 right-4 min-w-[15px] h-[15px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white leading-none">{badge > 9 ? '!' : badge}</span>}
              {active && !isToggle && <div className="absolute -bottom-1.5 w-1 h-1 bg-emerald-600 rounded-full shadow-[0_0_8px_rgba(5,150,105,0.6)]" />}
            </button>
          );
        })}
      </nav>
      <div className="lg:hidden h-16 pointer-events-none" />
    </>
  );
};

export default Navbar;
