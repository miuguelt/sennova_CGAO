import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Send, Search, Plus, User, Check, CheckCheck,
  Clock, RefreshCw, X, Users, ArrowLeft, Sparkles, Filter,
  Shield, GraduationCap, Briefcase, Mail, Radio, Wifi, WifiOff,
  Paperclip
} from 'lucide-react';
import { MensajesAPI } from '@/api/mensajes';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';
import { useTypingPulse } from '@/hooks/useTypingPulse';
import MessageAttachments from './MessageAttachments';
import MessageComposer from './MessageComposer';
import { useMessageAttachments } from '@/hooks/useMessageAttachments';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import Modal from '../ui/Modal';

// Con el canal SSE abierto los cambios llegan como eventos; el sondeo periódico
// solo actúa como respaldo mientras el canal está caído o reconectando.
const SONDEO_RESPALDO_MS = 15000;

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
  instructor: {
    label: 'Instructor',
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

/**
 * Componente visual para los Checks de Confirmación de 3 Estados:
 * 1. Enviado (1 check gris tenue)
 * 2. Entregado (2 checks grises)
 * 3. Leído (2 checks verde esmeralda brillante)
 */
function MessageStatusCheck({ isMine, leido, entregado, fechaLectura, fechaEntrega, createdAt, formatHora, isDark = true }) {
  if (!isMine) return null;

  if (leido) {
    const tooltip = fechaLectura ? `Leído a las ${formatHora(fechaLectura)}` : 'Leído';
    return (
      <span title={tooltip} className="inline-flex items-center text-emerald-300 ml-1 transition-all">
        <CheckCheck size={14} className="stroke-[2.5]" />
      </span>
    );
  }

  if (entregado) {
    const tooltip = fechaEntrega ? `Entregado a las ${formatHora(fechaEntrega)}` : 'Entregado';
    return (
      <span title={tooltip} className={`inline-flex items-center ml-1 transition-all ${isDark ? 'text-emerald-100/70' : 'text-slate-400'}`}>
        <CheckCheck size={14} className="stroke-[2.5]" />
      </span>
    );
  }

  const tooltip = createdAt ? `Enviado a las ${formatHora(createdAt)}` : 'Enviado';
  return (
    <span title={tooltip} className={`inline-flex items-center ml-1 transition-all ${isDark ? 'text-emerald-100/50' : 'text-slate-400'}`}>
      <Check size={14} className="stroke-[2.5]" />
    </span>
  );
}

export default function MensajeriaModule({
  currentUser,
  onNotify,
  initialContact = null,
  initialAction = null,
  onActionHandled = null
}) {
  const [conversaciones, setConversaciones] = useState([]);
  const [selectedUser, setSelectedUser] = useState(initialContact);
  const [mensajes, setMensajes] = useState([]);
  const [loadingConversaciones, setLoadingConversaciones] = useState(true);
  const [loadingMensajes, setLoadingMensajes] = useState(false);
  const [sending, setSending] = useState(false);
  const [nuevoMensajeTexto, setNuevoMensajeTexto] = useState('');
  
  // Filtros y búsquedas
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('todos');
  
  // Modal nuevo mensaje
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [destinatarios, setDestinatarios] = useState([]);
  const [loadingDestinatarios, setLoadingDestinatarios] = useState(false);
  const [destinatarioSearch, setDestinatarioSearch] = useState('');
  const [destinatarioRol, setDestinatarioRol] = useState('');
  
  // Estado "Escribiendo..."
  const [partnerTyping, setPartnerTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  
  // Stats
  const [stats, setStats] = useState({ total_recibidos: 0, no_leidos: 0, total_enviados: 0 });

  // Adjuntos: subida, bandeja y descarte viven en su propio hook
  const adjuntos = useMessageAttachments({ onNotify });

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const handledActionRef = useRef(null);
  const activeTargetRef = useRef(null);
  const componentMountedRef = useRef(true);

  useEffect(() => {
    componentMountedRef.current = true;
    return () => {
      componentMountedRef.current = false;
    };
  }, []);

  // Formato de horas y fechas
  const formatHora = useCallback((dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true });
  }, []);

  const formatFecha = useCallback((dateStr) => {
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
  }, [formatHora]);

  const loadStats = useCallback(async () => {
    try {
      const data = await MensajesAPI.getStats();
      if (data) setStats(data);
    } catch (err) {
      console.error('Error cargando estadísticas de mensajes:', err);
    }
  }, []);

  const loadConversaciones = useCallback(async (showLoader = false) => {
    if (showLoader) setLoadingConversaciones(true);
    try {
      const data = await MensajesAPI.getConversaciones();
      setConversaciones(data || []);
    } catch (err) {
      console.error('Error al cargar conversaciones:', err);
    } finally {
      if (showLoader) setLoadingConversaciones(false);
    }
  }, []);

  const loadMensajes = useCallback(async (otroUsuarioId) => {
    setLoadingMensajes(true);
    try {
      const data = await MensajesAPI.getConversacion(otroUsuarioId);
      setMensajes(data || []);
    } catch (err) {
      onNotify?.('Error al cargar mensajes de la conversación', 'error');
    } finally {
      setLoadingMensajes(false);
    }
  }, [onNotify]);

  const marcarComoLeidos = useCallback(async (otroUsuarioId) => {
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
  }, [loadStats]);

  // Manejo de eventos en tiempo real (SSE)
  const handleNewMessage = useCallback((msg) => {
    if (!msg) return;

    // Si el mensaje corresponde a la conversación abierta actualmente
    if (selectedUser?.id && (msg.remitente_id === selectedUser.id || msg.destinatario_id === selectedUser.id)) {
      setMensajes(prev => {
        // Evitar duplicados
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Si el mensaje es recibido del contacto activo, marcar como leído inmediatamente
      if (msg.remitente_id === selectedUser.id) {
        marcarComoLeidos(selectedUser.id);
      }
    }

    loadConversaciones(false);
    loadStats();
  }, [selectedUser?.id, marcarComoLeidos, loadConversaciones, loadStats]);

  const handleMessagesDelivered = useCallback((data) => {
    // Si el destinatario activo recibió mensajes míos, actualizar sus estados a entregado
    if (data?.destinatario_id === selectedUser?.id || data?.remitente_id === currentUser?.id) {
      setMensajes(prev =>
        prev.map(m =>
          m.remitente_id === currentUser?.id ? { ...m, entregado: true, fecha_entrega: data.timestamp } : m
        )
      );
    }
    loadConversaciones(false);
  }, [selectedUser?.id, currentUser?.id, loadConversaciones]);

  const handleMessagesRead = useCallback((data) => {
    // Si el interlocutor leyó mis mensajes, actualizar los checks a leídos (verde)
    if (data?.lector_id === selectedUser?.id || data?.otro_usuario_id === selectedUser?.id) {
      setMensajes(prev =>
        prev.map(m =>
          m.remitente_id === currentUser?.id ? { ...m, leido: true, fecha_lectura: data.timestamp, entregado: true } : m
        )
      );
    }
    loadConversaciones(false);
    loadStats();
  }, [selectedUser?.id, currentUser?.id, loadConversaciones, loadStats]);

  const handleTypingStatus = useCallback((data) => {
    if (data?.remitente_id === selectedUser?.id) {
      setPartnerTyping(Boolean(data.is_typing));

      // Auto-limpieza a los 4 segundos por si no llega evento de stop
      clearTimeout(typingTimeoutRef.current);
      if (data.is_typing) {
        typingTimeoutRef.current = setTimeout(() => {
          setPartnerTyping(false);
        }, 4000);
      }
    }
  }, [selectedUser?.id]);

  const handleMessageDeleted = useCallback((data) => {
    if (data?.mensaje_id) {
      setMensajes(prev => prev.filter(m => m.id !== data.mensaje_id));
      loadConversaciones(false);
      loadStats();
    }
  }, [loadConversaciones, loadStats]);

  // Pulso "escribiendo..." del usuario hacia su interlocutor
  const { registrarPulsacion, detenerPulso } = useTypingPulse(selectedUser?.id);

  // Conexión reactiva en tiempo real con SSE
  const { isConnected } = useRealtimeChat({
    currentUser,
    selectedUserId: selectedUser?.id,
    onNewMessage: handleNewMessage,
    onMessagesDelivered: handleMessagesDelivered,
    onMessagesRead: handleMessagesRead,
    onTypingStatus: handleTypingStatus,
    onMessageDeleted: handleMessageDeleted,
  });

  // Carga inicial
  useEffect(() => {
    loadConversaciones(true);
    loadStats();
  }, [loadConversaciones, loadStats]);

  // Sondeo de respaldo: solo mientras el canal asíncrono no esté disponible.
  // Con SSE conectado los eventos ya traen cada cambio y sondear duplicaría carga.
  useEffect(() => {
    if (isConnected) return undefined;

    const pollTimer = setInterval(() => {
      loadConversaciones(false);
      loadStats();
    }, SONDEO_RESPALDO_MS);

    return () => clearInterval(pollTimer);
  }, [isConnected, loadConversaciones, loadStats]);

  // Manejo de redirección inicial / navegación directa al chat desde notificaciones u otras vistas
  useEffect(() => {
    const actionData = initialAction?.data || initialAction?.initialData || initialContact;
    if (!actionData) return;

    const targetUserId = typeof actionData === 'string'
      ? actionData
      : (actionData.usuario_id || actionData.contacto_id || actionData.id);

    if (!targetUserId) return;

    const actionKey = `${targetUserId}-${initialAction?.form || ''}`;
    if (handledActionRef.current === actionKey && selectedUser?.id === targetUserId) {
      return;
    }

    activeTargetRef.current = targetUserId;

    const resolveAndSelectUser = async () => {
      // 1. Si los datos ya vienen completos en actionData
      if (typeof actionData === 'object' && actionData.nombre && actionData.id) {
        if (componentMountedRef.current && activeTargetRef.current === targetUserId) {
          handledActionRef.current = actionKey;
          setSelectedUser(actionData);
          onActionHandled?.();
        }
        return;
      }

      // 2. Si ya está cargado en conversaciones existentes
      const foundInConversaciones = conversaciones.find(
        (c) => String(c.otro_usuario?.id) === String(targetUserId)
      );
      if (foundInConversaciones?.otro_usuario) {
        if (componentMountedRef.current && activeTargetRef.current === targetUserId) {
          handledActionRef.current = actionKey;
          setSelectedUser(foundInConversaciones.otro_usuario);
          onActionHandled?.();
        }
        return;
      }

      // 3. Consultar a la API el contacto por ID
      try {
        const contactData = await MensajesAPI.getContacto(targetUserId);
        if (componentMountedRef.current && activeTargetRef.current === targetUserId && contactData?.id) {
          handledActionRef.current = actionKey;
          setSelectedUser(contactData);
          onActionHandled?.();
          return;
        }
      } catch (err) {
        console.warn('Fallback al consultar contacto:', err);
      }

      // 4. Fallback: buscar en destinatarios
      try {
        const destList = await MensajesAPI.getDestinatarios();
        const foundInDest = destList?.find((u) => String(u.id) === String(targetUserId));
        if (componentMountedRef.current && activeTargetRef.current === targetUserId && foundInDest) {
          handledActionRef.current = actionKey;
          setSelectedUser(foundInDest);
          onActionHandled?.();
          return;
        }
      } catch (err) {
        console.error('Error buscando contacto en destinatarios:', err);
      }

      // 5. Fallback final: crear objeto básico para permitir abrir el chat y cargar mensajes
      if (componentMountedRef.current && activeTargetRef.current === targetUserId) {
        handledActionRef.current = actionKey;
        setSelectedUser({
          id: targetUserId,
          nombre: actionData.nombre || 'Usuario',
          rol: actionData.rol || 'investigador',
          email: actionData.email || '',
        });
        onActionHandled?.();
      }
    };

    resolveAndSelectUser();
  }, [initialAction, initialContact, conversaciones, selectedUser?.id, onActionHandled]);

  // Cuando cambia el usuario seleccionado
  useEffect(() => {
    if (selectedUser?.id) {
      loadMensajes(selectedUser.id);
      marcarComoLeidos(selectedUser.id);
      setPartnerTyping(false);
    } else {
      setMensajes([]);
      setPartnerTyping(false);
    }
  }, [selectedUser?.id, loadMensajes, marcarComoLeidos]);

  // Auto scroll al fondo al recibir o enviar mensajes o al activarse el typing
  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes, partnerTyping]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setNuevoMensajeTexto(text);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;

    registrarPulsacion();
  };

  const handleEnviarMensaje = async (e) => {
    e?.preventDefault();
    const contenido = nuevoMensajeTexto.trim();
    const tieneAdjuntos = adjuntos.ids.length > 0;
    if ((!contenido && !tieneAdjuntos) || !selectedUser?.id || sending || adjuntos.subiendo) return;

    setSending(true);
    detenerPulso();

    try {
      const response = await MensajesAPI.enviar({
        destinatario_id: selectedUser.id,
        contenido: contenido,
        adjunto_ids: adjuntos.ids,
      });

      // Actualizar mensajes localmente si no vino por SSE
      setMensajes(prev => {
        if (prev.some(m => m.id === response.id)) return prev;
        return [...prev, response];
      });

      setNuevoMensajeTexto('');
      adjuntos.limpiar();
      if (textareaRef.current) textareaRef.current.style.height = 'auto';

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
    setDestinatarioSearch('');
    setDestinatarioRol('');
    setShowNewChatModal(true);
    setLoadingDestinatarios(true);
    try {
      const data = await MensajesAPI.getDestinatarios('', '');
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

  // Debounce de la búsqueda de destinatarios (una petición por pausa, no por tecla)
  useEffect(() => {
    if (!showNewChatModal) return;
    if (destinatarioSearch === '' && destinatarioRol === '') return;
    const id = setTimeout(() => handleSearchDestinatarios(destinatarioSearch, destinatarioRol), 300);
    return () => clearTimeout(id);
  }, [destinatarioSearch, destinatarioRol, showNewChatModal]);

  const handleSelectDestinatario = (userObj) => {
    setSelectedUser(userObj);
    setShowNewChatModal(false);
    setTimeout(() => textareaRef.current?.focus(), 150);
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

  return (
    <div className="space-y-6">
      {/* Cabecera del Módulo */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-100">
            <MessageSquare size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Mensajería Interna SENNOVA
              </h1>
              {/* Indicador de conexión en tiempo real */}
              <span
                title={isConnected ? 'Conectado al canal asíncrono en tiempo real (SSE)' : 'Reconectando canal en tiempo real...'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isConnected
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isConnected ? 'Tiempo real' : 'Sincronizando'}
              </span>

              {stats.no_leidos > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-xs font-bold animate-pulse">
                  {stats.no_leidos} nuevo{stats.no_leidos > 1 ? 's' : ''}
                </span>
              )}
            </div>
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
        
        {/* PANEL IZQUIERDO: Lista de Conversaciones */}
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
                        <span className="text-[10px] text-slate-600 font-bold flex-shrink-0">
                          {formatFecha(conv.ultimo_mensaje?.created_at)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant={roleConfig.badgeVariant} className="text-[9px] py-0 px-1.5">
                          {roleConfig.label}
                        </Badge>
                      </div>

                      <p className={`text-xs truncate flex items-center gap-1 ${conv.no_leidos > 0 ? 'font-black text-slate-900' : 'text-slate-700 font-medium'}`}>
                        {isMine && (
                          <span className="inline-flex items-center text-slate-600 font-bold mr-0.5">
                            {conv.ultimo_mensaje?.leido ? (
                              <CheckCheck size={13} className="text-emerald-600 mr-1" title="Leído" />
                            ) : conv.ultimo_mensaje?.entregado ? (
                              <CheckCheck size={13} className="text-slate-500 mr-1" title="Entregado" />
                            ) : (
                              <Check size={13} className="text-slate-500 mr-1" title="Enviado" />
                            )}
                            Tú:
                          </span>
                        )}
                        <span className="truncate">{conv.ultimo_mensaje?.contenido || 'Sin mensajes'}</span>
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
                    className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
                    <p className="text-[11px] text-slate-600 font-medium truncate flex items-center gap-2">
                      {partnerTyping ? (
                        <span className="text-emerald-700 font-bold animate-pulse">
                          escribiendo...
                        </span>
                      ) : (
                        <>
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
                          {msg.contenido && <p>{msg.contenido}</p>}
                          <MessageAttachments adjuntos={msg.adjuntos} />
                          
                          {/* Pie de mensaje: Hora y Check de Confirmación de 3 Estados */}
                          <div className={`flex items-center justify-end gap-1 mt-1.5 text-[10px] ${isMine ? 'text-emerald-100/80' : 'text-slate-400'}`}>
                            <span>{formatHora(msg.created_at)}</span>
                            <MessageStatusCheck
                              isMine={isMine}
                              leido={msg.leido}
                              entregado={msg.entregado}
                              fechaLectura={msg.fecha_lectura}
                              fechaEntrega={msg.fecha_entrega}
                              createdAt={msg.created_at}
                              formatHora={formatHora}
                              isDark={isMine}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Indicador de "Escribiendo..." flotante */}
                {partnerTyping && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 bg-white border border-slate-200 rounded-2xl px-3.5 py-2 w-fit shadow-sm animate-fadeIn">
                    <span className="font-semibold">{selectedUser.nombre} está escribiendo</span>
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              <MessageComposer
                destinatarioNombre={selectedUser.nombre}
                texto={nuevoMensajeTexto}
                onTextoChange={handleInputChange}
                onSugerencia={(sugerencia) => {
                  setNuevoMensajeTexto(sugerencia);
                  textareaRef.current?.focus();
                }}
                onKeyDown={handleKeyDown}
                onEnviar={handleEnviarMensaje}
                textareaRef={textareaRef}
                adjuntos={adjuntos}
                enviando={sending}
              />
            </>
          ) : (
            /* Estado Vacío cuando no hay chat seleccionado */
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-slate-50/50">
              <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 shadow-md flex items-center justify-center text-emerald-600 mb-4">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-base font-black text-slate-800">Centro de Mensajería SENNOVA</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6 leading-relaxed">
                Selecciona una conversación del panel lateral o inicia un nuevo chat para coordinar proyectos, bitácoras y actividades de investigación con confirmación en tiempo real.
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

      {/* MODAL: Nuevo Mensaje */}
      <Modal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        size="md"
        variant="sena"
        icon={Users}
        title="Nuevo Mensaje"
        subtitle="Selecciona un usuario para iniciar el chat"
        footer={
          <div className="flex justify-end w-full">
            <Button variant="secondary" onClick={() => setShowNewChatModal(false)}>Cerrar</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Búsqueda y Filtros de Contactos */}
          <div className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, email o programa..."
                value={destinatarioSearch}
                onChange={(e) => setDestinatarioSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Filtros de rol */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: '', label: 'Todos' },
                { id: 'investigador', label: 'Investigadores' },
                { id: 'aprendiz', label: 'Aprendices' },
                { id: 'admin', label: 'Coordinadores' },
              ].map(tab => (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setDestinatarioRol(tab.id)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                    destinatarioRol === tab.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Destinatarios */}
          <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto custom-scrollbar rounded-2xl border border-slate-100 bg-slate-50/50 p-2">
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

                return (
                  <button
                    type="button"
                    key={dest.id}
                    onClick={() => handleSelectDestinatario(dest)}
                    className="w-full p-2.5 text-left flex items-center justify-between gap-3 hover:bg-white rounded-xl transition-all group hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${roleConfig.gradient} flex items-center justify-center text-white font-black text-xs shadow-sm flex-shrink-0`}>
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
      </Modal>
    </div>
  );
}
