import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, Search, Plus, User, Check, CheckCheck,
  Clock, RefreshCw, X, Users, ArrowLeft, Sparkles, Filter,
  Shield, GraduationCap, Briefcase, Mail
} from 'lucide-react';
import { MensajesAPI } from '@/api/mensajes';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Card from '../ui/Card';

const ROLE_CONFIG = {
  admin: {
    label: 'Coordinación SENNOVA',
    badgeVariant: 'sena',
    icon: Shield,
    color: 'emerald',
    gradient: 'from-emerald-600 to-teal-700'
  },
  investigador: {
    label: 'Investigador',
    badgeVariant: 'primary',
    icon: Briefcase,
    color: 'blue',
    gradient: 'from-blue-600 to-indigo-700'
  },
  aprendiz: {
    label: 'Aprendiz Semillero',
    badgeVariant: 'warning',
    icon: GraduationCap,
    color: 'amber',
    gradient: 'from-amber-500 to-orange-600'
  },
};

export default function MensajeriaModule({ currentUser, onNotify, initialContact = null }) {
  const [conversaciones, setConversaciones] = useState([]);
  const [selectedUser, setSelectedUser] = useState(initialContact);
  const [mensajes, setMensajes] = useState([]);
  const [loadingConversaciones, setLoadingConversaciones] = useState(true);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [sending, setSending] = useState(false);
  const [nuevoMensajeTexto, setNuevoMensajeTexto] = useState('');
  
  // Filtros y búsquedas
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('todos'); // todos, investigador, aprendiz, admin
  
  // Modal nuevo mensaje
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [destinatarios, setDestinatarios] = useState([]);
  const [loadingDestinatarios, setLoadingDestinatarios] = useState(false);
  const [destinatarioSearch, setDestinatarioSearch] = useState('');
  const [destinatarioRol, setDestinatarioRol] = useState('');
  
  // Stats
  const [stats, setStats] = useState({ total_recibidos: 0, no_leidos: 0, total_enviados: 0 });

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Carga inicial y polling
  useEffect(() => {
    loadConversaciones(true);
    loadStats();
    
    // Polling cada 8 segundos
    const pollTimer = setInterval(() => {
      loadConversaciones(false);
      if (selectedUser?.id) {
        loadMensajesSilencioso(selectedUser.id);
      }
      loadStats();
    }, 8000);

    return () => clearInterval(pollTimer);
  }, []);

  // Cuando cambia el usuario seleccionado
  useEffect(() => {
    if (selectedUser?.id) {
      loadMensajes(selectedUser.id);
      marcarComoLeidos(selectedUser.id);
    } else {
      setMensajes([]);
    }
  }, [selectedUser?.id]);

  // Auto scroll al fondo al recibir o enviar mensajes
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes]);

  const loadStats = async () => {
    try {
      const data = await MensajesAPI.getStats();
      if (data) setStats(data);
    } catch (err) {
      console.error('Error cargando estadísticas de mensajes:', err);
    }
  };

  const loadConversaciones = async (showLoader = false) => {
    if (showLoader) setLoadingConversaciones(true);
    try {
      const data = await MensajesAPI.getConversaciones();
      setConversaciones(data || []);
    } catch (err) {
      console.error('Error al cargar conversaciones:', err);
    } finally {
      if (showLoader) setLoadingConversaciones(false);
    }
  };

  const loadMensajes = async (otroUsuarioId) => {
    setLoadingMensajes(true);
    try {
      const data = await MensajesAPI.getConversacion(otroUsuarioId);
      setMensajes(data || []);
    } catch (err) {
      onNotify?.('Error al cargar mensajes de la conversación', 'error');
    } finally {
      setLoadingMensajes(false);
    }
  };

  const loadMensajesSilencioso = async (otroUsuarioId) => {
    try {
      const data = await MensajesAPI.getConversacion(otroUsuarioId);
      if (data && data.length !== mensajes.length) {
        setMensajes(data);
        marcarComoLeidos(otroUsuarioId);
      }
    } catch (err) {
      // Ignorar error de polling silencioso
    }
  };

  const marcarComoLeidos = async (otroUsuarioId) => {
    try {
      await MensajesAPI.marcarLeidos(otroUsuarioId);
      setConversaciones(prev =>
        prev.map(c =>
          c.otro_usuario.id === otroUsuarioId ? { ...c, no_leidos: 0 } : c
        )
      );
      loadStats();
    } catch (err) {
      console.error('Error marcando mensajes como leídos:', err);
    }
  };

  const handleEnviarMensaje = async (e) => {
    e?.preventDefault();
    const contenido = nuevoMensajeTexto.trim();
    if (!contenido || !selectedUser?.id || sending) return;

    setSending(true);
    try {
      const response = await MensajesAPI.enviar({
        destinatario_id: selectedUser.id,
        contenido: contenido,
      });

      // Actualizar mensajes localmente optimista
      setMensajes(prev => [...prev, response]);
      setNuevoMensajeTexto('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';

      // Actualizar lista de conversaciones
      loadConversaciones(false);
      loadStats();
    } catch (err) {
      onNotify?.(err.message || 'Error al enviar el mensaje', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviarMensaje();
    }
  };

  const openNewChatModal = async () => {
    setShowNewChatModal(true);
    setLoadingDestinatarios(true);
    try {
      const data = await MensajesAPI.getDestinatarios();
      setDestinatarios(data || []);
    } catch (err) {
      onNotify?.('Error al cargar contactos disponibles', 'error');
    } finally {
      setLoadingDestinatarios(false);
    }
  };

  const handleSearchDestinatarios = async (searchTermVal, rolVal) => {
    setLoadingDestinatarios(true);
    try {
      const data = await MensajesAPI.getDestinatarios(searchTermVal, rolVal);
      setDestinatarios(data || []);
    } catch (err) {
      console.error('Error buscando destinatarios:', err);
    } finally {
      setLoadingDestinatarios(false);
    }
  };

  const handleSelectDestinatario = (userObj) => {
    setSelectedUser(userObj);
    setShowNewChatModal(false);
  };

  // Filtrado de conversaciones
  const filteredConversaciones = conversaciones.filter(c => {
    const user = c.otro_usuario;
    const matchSearch =
      user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.programa_formacion && user.programa_formacion.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.ultimo_mensaje?.contenido && c.ultimo_mensaje.contenido.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchRole = roleFilter === 'todos' || user.rol === roleFilter;

    return matchSearch && matchRole;
  });

  const formatHora = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const formatFecha = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const hoy = new Date();
    const esHoy = d.toDateString() === hoy.toDateString();
    
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const esAyer = d.toDateString() === ayer.toDateString();

    if (esHoy) return formatHora(dateStr);
    if (esAyer) return 'Ayer';
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-100">
            <MessageSquare size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Mensajería Interna SENNOVA
              {stats.no_leidos > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold animate-pulse">
                  {stats.no_leidos} nuevo{stats.no_leidos > 1 ? 's' : ''}
                </span>
              )}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Comunicación directa y colaborativa entre Coordinación, Investigadores y Aprendices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={openNewChatModal}
            className="flex items-center gap-2 bg-[#39A900] hover:bg-[#2d8000] text-white shadow-md shadow-emerald-200"
          >
            <Plus size={18} />
            <span>Nuevo Mensaje</span>
          </Button>
        </div>
      </div>

      {/* Contenedor Principal de Mensajería: 2 Columnas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px] max-h-[750px]">
        
        {/* PANEL IZQUIERDO: Lista de Conversaciones (Oculto en móvil si hay chat seleccionado) */}
        <div className={`lg:col-span-5 xl:col-span-4 border-r border-slate-200 flex flex-col ${selectedUser ? 'hidden lg:flex' : 'flex'}`}>
          {/* Barra de búsqueda y filtros */}
          <div className="p-4 border-b border-slate-100 space-y-3 bg-slate-50/50">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar conversación o usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Pestañas de Filtro por Rol */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'investigador', label: 'Investigadores' },
                { id: 'aprendiz', label: 'Aprendices' },
                { id: 'admin', label: 'Coordinación' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setRoleFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    roleFilter === tab.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Listado de Conversaciones */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loadingConversaciones ? (
              <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <RefreshCw size={22} className="animate-spin text-emerald-600" />
                <span>Cargando conversaciones...</span>
              </div>
            ) : filteredConversaciones.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-300">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">No hay conversaciones</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {searchTerm ? 'No hay resultados con esa búsqueda.' : 'Inicia una conversación con cualquier colega o aprendiz.'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={openNewChatModal}
                  className="text-xs mt-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                >
                  Iniciar conversación
                </Button>
              </div>
            ) : (
              filteredConversaciones.map((conv) => {
                const partner = conv.otro_usuario;
                const isSelected = selectedUser?.id === partner.id;
                const roleConfig = ROLE_CONFIG[partner.rol] || ROLE_CONFIG.investigador;
                const RoleIcon = roleConfig.icon;
                const isMine = conv.ultimo_mensaje?.remitente_id === currentUser?.id;

                return (
                  <button
                    key={partner.id}
                    onClick={() => setSelectedUser(partner)}
                    className={`w-full p-4 text-left flex items-start gap-3.5 transition-all ${
                      isSelected
                        ? 'bg-emerald-50/80 border-l-4 border-l-emerald-600 shadow-sm'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Avatar con indicador de rol */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${roleConfig.gradient} flex items-center justify-center text-white font-black text-sm shadow-sm`}>
                        {partner.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow">
                        <RoleIcon size={10} className="text-slate-700" />
                      </div>
                    </div>

                    {/* Contenido de la conversación */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="text-xs font-black text-slate-900 truncate">
                          {partner.nombre}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">
                          {formatFecha(conv.ultimo_mensaje?.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant={roleConfig.badgeVariant} className="text-[9px] py-0 px-1.5">
                          {roleConfig.label}
                        </Badge>
                      </div>

                      <p className={`text-xs truncate ${conv.no_leidos > 0 ? 'font-black text-slate-900' : 'text-slate-500'}`}>
                        {isMine && <span className="text-slate-400 font-normal">Tú: </span>}
                        {conv.ultimo_mensaje?.contenido || 'Sin mensajes'}
                      </p>
                    </div>

                    {/* Badge de mensajes no leídos */}
                    {conv.no_leidos > 0 && (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 shadow-sm">
                        {conv.no_leidos > 9 ? '+9' : conv.no_leidos}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL DERECHO: Ventana de Chat Activo */}
        <div className={`lg:col-span-7 xl:col-span-8 flex flex-col bg-slate-50/30 ${!selectedUser ? 'hidden lg:flex' : 'flex'}`}>
          {selectedUser ? (
            <>
              {/* Cabecera del Chat Activo */}
              <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between gap-3 z-10 shadow-sm">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Botón Volver en Móvil */}
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <ArrowLeft size={20} />
                  </button>

                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${(ROLE_CONFIG[selectedUser.rol] || ROLE_CONFIG.investigador).gradient} flex items-center justify-center text-white font-black text-sm shadow-sm flex-shrink-0`}>
                    {selectedUser.nombre.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-black text-slate-900 truncate">
                        {selectedUser.nombre}
                      </h3>
                      <Badge variant={(ROLE_CONFIG[selectedUser.rol] || ROLE_CONFIG.investigador).badgeVariant} className="text-[10px] py-0 px-2">
                        {(ROLE_CONFIG[selectedUser.rol] || ROLE_CONFIG.investigador).label}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate flex items-center gap-2">
                      <span>{selectedUser.email}</span>
                      {selectedUser.programa_formacion && (
                        <>
                          <span>•</span>
                          <span className="text-amber-700 font-medium">{selectedUser.programa_formacion} {selectedUser.ficha ? `(${selectedUser.ficha})` : ''}</span>
                        </>
                      )}
                      {selectedUser.rol_sennova && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-medium">{selectedUser.rol_sennova}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadMensajes(selectedUser.id)}
                    title="Actualizar conversación"
                    className="p-2 rounded-xl text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    <RefreshCw size={16} className={loadingMensajes ? 'animate-spin text-emerald-600' : ''} />
                  </button>
                </div>
              </div>

              {/* Cuerpo del Chat: Burbujas de Mensajes */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-[#F8FAFC]">
                {loadingMensajes ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    <RefreshCw size={24} className="animate-spin text-emerald-600 mb-2" />
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-emerald-600 mb-3">
                      <Sparkles size={28} />
                    </div>
                    <h4 className="text-sm font-bold text-slate-700">Inicio de la conversación</h4>
                    <p className="text-xs text-slate-400 max-w-xs mt-1">
                      Envía un mensaje para comenzar a colaborar con <span className="font-semibold text-slate-600">{selectedUser.nombre}</span>.
                    </p>
                  </div>
                ) : (
                  mensajes.map((msg, index) => {
                    const isMine = msg.remitente_id === currentUser?.id;

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-sm text-xs leading-relaxed whitespace-pre-wrap break-words ${
                            isMine
                              ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-br-none shadow-emerald-200'
                              : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-none shadow-slate-100'
                          }`}
                        >
                          {msg.asunto && (
                            <p className={`font-black text-[11px] mb-1.5 pb-1 border-b ${isMine ? 'border-white/20 text-emerald-100' : 'border-slate-100 text-slate-900'}`}>
                              {msg.asunto}
                            </p>
                          )}
                          <p>{msg.contenido}</p>
                          
                          <div className={`flex items-center justify-end gap-1 mt-1.5 text-[10px] ${isMine ? 'text-emerald-100/80' : 'text-slate-400'}`}>
                            <span>{formatHora(msg.created_at)}</span>
                            {isMine && (
                              msg.leido ? (
                                <CheckCheck size={13} className="text-emerald-200" title="Leído" />
                              ) : (
                                <Check size={13} className="text-white/60" title="Enviado" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Respuestas Rápidas / Sugerencias */}
              <div className="px-4 py-2 bg-white/70 border-t border-slate-100 flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-shrink-0">Sugerencias:</span>
                {[
                  '¡Hola! ¿Cómo estás?',
                  '¿Me confirmas el avance del entregable?',
                  'Quedo atento a tus comentarios.',
                  'Excelente trabajo con la bitácora.',
                ].map((sug, i) => (
                  <button
                    key={i}
                    onClick={() => setNuevoMensajeTexto(sug)}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg text-[11px] text-slate-600 font-medium whitespace-nowrap transition-colors border border-transparent hover:border-emerald-200"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              {/* Área de Entrada de Mensaje */}
              <div className="p-4 bg-white border-t border-slate-200">
                <form onSubmit={handleEnviarMensaje} className="flex items-end gap-3">
                  <div className="flex-1 bg-slate-50 border border-slate-200 focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 rounded-2xl p-2.5 transition-all">
                    <textarea
                      ref={textareaRef}
                      rows={1}
                      value={nuevoMensajeTexto}
                      onChange={(e) => {
                        setNuevoMensajeTexto(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                      }}
                      onKeyDown={handleKeyDown}
                      placeholder={`Escribe un mensaje para ${selectedUser.nombre}... (Enter para enviar)`}
                      className="w-full bg-transparent border-0 resize-none outline-none text-xs font-medium text-slate-800 placeholder:text-slate-400 max-h-28"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!nuevoMensajeTexto.trim() || sending}
                    className="h-11 w-11 p-0 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <RefreshCw size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            /* Estado Vacío cuando no hay chat seleccionado */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-slate-50/50">
              <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-md flex items-center justify-center text-emerald-600 mb-4">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-base font-black text-slate-800">Centro de Mensajería SENNOVA</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6 leading-relaxed">
                Selecciona una conversación del panel lateral o inicia un nuevo chat para coordinar proyectos, bitácoras y actividades de investigación.
              </p>
              <Button
                onClick={openNewChatModal}
                className="flex items-center gap-2 bg-[#39A900] hover:bg-[#2d8000] text-white shadow-md shadow-emerald-100"
              >
                <Plus size={16} />
                <span>Iniciar nueva conversación</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Nuevo Mensaje / Directorio de Destinatarios */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
            {/* Cabecera del Modal */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Nuevo Mensaje</h3>
                  <p className="text-[11px] text-slate-400">Selecciona un usuario para iniciar el chat</p>
                </div>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Búsqueda y Filtros de Contactos */}
            <div className="p-4 border-b border-slate-100 space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, email o programa..."
                  value={destinatarioSearch}
                  onChange={(e) => {
                    setDestinatarioSearch(e.target.value);
                    handleSearchDestinatarios(e.target.value, destinatarioRol);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Filtros de rol */}
              <div className="flex items-center gap-1.5">
                {[
                  { id: '', label: 'Todos' },
                  { id: 'investigador', label: 'Investigadores' },
                  { id: 'aprendiz', label: 'Aprendices' },
                  { id: 'admin', label: 'Coordinadores' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setDestinatarioRol(tab.id);
                      handleSearchDestinatarios(destinatarioSearch, tab.id);
                    }}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      destinatarioRol === tab.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Lista de Destinatarios */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100 max-h-80">
              {loadingDestinatarios ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <RefreshCw size={22} className="animate-spin text-emerald-600" />
                  <span>Buscando contactos...</span>
                </div>
              ) : destinatarios.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No se encontraron usuarios disponibles.
                </div>
              ) : (
                destinatarios.map((dest) => {
                  const roleConfig = ROLE_CONFIG[dest.rol] || ROLE_CONFIG.investigador;
                  const RoleIcon = roleConfig.icon;

                  return (
                    <button
                      key={dest.id}
                      onClick={() => handleSelectDestinatario(dest)}
                      className="w-full p-3 text-left flex items-center justify-between gap-3 hover:bg-emerald-50/60 rounded-xl transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${roleConfig.gradient} flex items-center justify-center text-white font-black text-xs shadow-sm flex-shrink-0`}>
                          {dest.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700 truncate">
                            {dest.nombre}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {dest.email}
                          </p>
                          {dest.programa_formacion && (
                            <p className="text-[10px] text-amber-700 font-medium truncate">
                              {dest.programa_formacion} {dest.ficha ? `(${dest.ficha})` : ''}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant={roleConfig.badgeVariant} className="text-[9px]">
                          {roleConfig.label}
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
