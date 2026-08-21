import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Users, Search, UserPlus, Filter, Mail,
  MapPin, GraduationCap, ExternalLink, Activity,
  MoreVertical, Edit, ShieldCheck, X, Loader2, Save,
  Trash2, ShieldAlert, Key, UserCheck, UserX,
  Building, Target, BookOpen,
  Award, Zap, Calendar, Terminal, Download,
  Phone, CheckCircle2, AlertTriangle, ArrowRight,
  Sparkles, RefreshCw, Layers, ChevronDown
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import ConfirmDialog from '../ui/ConfirmDialog';
import { UsuariosAPI } from '../../api/usuarios';
import { SemillerosAPI } from '../../api/semilleros';
import { AprendicesAPI } from '../../api/aprendices';
import UserInsightPanel from './UserInsightPanel';
import useClickOutside from '../../hooks/useClickOutside';

// Programas comunes de formación en el CGAO Vélez
const CGAO_PROGRAMS = [
  'Análisis y Desarrollo de Software (ADSO)',
  'Técnico en Programación de Software (TPS)',
  'Técnico en Sistemas e Infraestructura TI',
  'Procesamiento de Alimentos y Agroindustria',
  'Guianza Turística y Patrimonio Cultural',
  'Gestión Empresarial y Emprendimiento',
  'Contabilidad y Finanzas',
  'Producción Agropecuaria y Bioprocesos'
];

const ROLES_SENNOVA_OPTIONS = [
  { value: 'Aprendiz Investigador', label: 'Aprendiz Investigador' },
  { value: 'Líder Semillerista', label: 'Líder Semillerista' },
  { value: 'Aprendiz Innovador', label: 'Aprendiz Innovador' },
  { value: 'Aprendiz de Apoyo Técnico', label: 'Aprendiz de Apoyo Técnico' }
];

const ESTADOS_VINCULACION = [
  { value: 'Activo', label: 'Activo' },
  { value: 'En Formación', label: 'En Formación' },
  { value: 'Egresado', label: 'Egresado / Graduado' },
  { value: 'Retirado', label: 'Retirado' }
];

/**
 * Tarjeta individual de Aprendiz Semillerista
 */
const AprendizCard = ({ 
  user, 
  onEdit, 
  onDelete, 
  onToggleActive, 
  onViewActivity, 
  semilleros = [], 
  onLinkSemillero,
  onOpenQuickLink
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const menuRef = useRef(null);
  useClickOutside(menuRef, () => setShowMenu(false));

  const handleDragOver = (e) => {
    e.preventDefault();
    if (e.dataTransfer.types.includes('semilleroid')) {
      setIsDragOver(true);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const semilleroId = e.dataTransfer.getData('semilleroId') || e.dataTransfer.getData('semilleroid');
    if (semilleroId) {
      onLinkSemillero(user.id, semilleroId);
    }
  };

  const semilleroAsignado = semilleros.find(s => s.id === user.vinculacion?.semillero_id);
  const isLinked = Boolean(user.vinculacion && semilleroAsignado);

  return (
    <Card 
      className={`p-6 flex flex-col justify-between group transition-all duration-300 relative overflow-hidden bg-white border border-slate-200/80 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/10 rounded-3xl ${
        isDragOver ? 'ring-4 ring-indigo-500 bg-indigo-50/70 scale-[1.02]' : ''
      }`}
      onClick={() => onViewActivity(user)}
      onDragOver={handleDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
    >
      {/* Glow de fondo */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />

      {/* Menú de opciones */}
      <div className="absolute top-4 right-4 z-20">
        <button 
          onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition-colors"
          title="Opciones de aprendiz"
        >
          <MoreVertical size={18} />
        </button>
        {showMenu && (
          <div ref={menuRef} className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2 animate-scaleIn origin-top-right z-50">
            <button onClick={(e) => { e.stopPropagation(); onEdit(user); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3"><Edit size={16} className="text-slate-400" /> Editar Ficha y Datos</button>
            <button onClick={(e) => { e.stopPropagation(); onOpenQuickLink(user); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50 flex items-center gap-3 border-t border-slate-50"><GraduationCap size={16} className="text-indigo-500" /> {isLinked ? 'Cambiar Semillero' : 'Vincular a Semillero'}</button>
            <button onClick={(e) => { e.stopPropagation(); onToggleActive(user); setShowMenu(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold flex items-center gap-3 border-t border-slate-50 ${user.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}>{user.is_active ? <UserX size={16} /> : <UserCheck size={16} />}{user.is_active ? 'Desactivar Aprendiz' : 'Activar Aprendiz'}</button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(user.id); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 border-t border-slate-50"><Trash2 size={16} /> Eliminar Aprendiz</button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {/* Cabecera de la Tarjeta */}
        <div className="flex items-start gap-3.5 pr-8">
          <div className={`w-13 h-13 min-w-[3.25rem] rounded-2xl flex items-center justify-center font-black text-xl shadow-md uppercase transition-all ${
            user.is_active 
              ? 'bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-indigo-500/20 ring-2 ring-indigo-100' 
              : 'bg-slate-100 text-slate-400 ring-1 ring-slate-200'
          }`}>
            {user.nombre?.charAt(0) || 'A'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <Badge variant="indigo" className="font-extrabold text-[9px] uppercase tracking-wider px-2 py-0.5">
                {user.rol_sennova || 'Aprendiz'}
              </Badge>
              {user.is_active ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Activo
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                  Inactivo
                </span>
              )}
            </div>
            <h3 className="font-black text-slate-900 text-base leading-tight group-hover:text-indigo-600 transition-colors line-clamp-1">
              {user.nombre}
            </h3>
          </div>
        </div>

        {/* Ficha y Programa de Formación */}
        <div className="bg-slate-50/90 p-3 rounded-2xl border border-slate-200/70 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black font-mono bg-slate-900 text-white px-2 py-0.5 rounded-md tracking-wider">
              FICHA {user.ficha || 'S/N'}
            </span>
            {user.documento && (
              <span className="text-[10px] font-bold text-slate-500">
                CC: {user.documento}
              </span>
            )}
          </div>
          <p className="text-xs font-bold text-slate-700 leading-snug line-clamp-2" title={user.programa_formacion || 'Sin Programa de Formación'}>
            {user.programa_formacion || 'Programa no especificado'}
          </p>
        </div>

        {/* Datos de Contacto */}
        <div className="space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-2 truncate">
            <Mail size={13} className="text-slate-400 shrink-0" />
            <span className="truncate font-medium text-slate-600 hover:text-indigo-600" title={user.email}>{user.email}</span>
          </div>
          {user.celular && (
            <div className="flex items-center gap-2 truncate">
              <Phone size={13} className="text-emerald-500 shrink-0" />
              <a 
                href={`https://wa.me/57${user.celular.replace(/\D/g, '')}`} 
                target="_blank" 
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-slate-600 hover:text-emerald-600 hover:underline"
              >
                {user.celular}
              </a>
            </div>
          )}
        </div>

        {/* Semillero Vinculado / Estado de Vinculación */}
        {isLinked ? (
          <div className="p-3 bg-gradient-to-br from-indigo-50 to-blue-50/60 rounded-2xl border border-indigo-100/90 relative group/semillero">
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1">
                <GraduationCap size={12} className="text-indigo-600" /> Semillero CGAO
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); onOpenQuickLink(user); }}
                className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 underline"
              >
                Cambiar
              </button>
            </div>
            <p className="text-xs font-black text-slate-900 line-clamp-1">
              {semilleroAsignado?.sigla ? `${semilleroAsignado.sigla} — ` : ''}{semilleroAsignado?.nombre}
            </p>
            {semilleroAsignado?.linea_investigacion && (
              <p className="text-[10px] font-medium text-indigo-800/80 mt-0.5 line-clamp-1">
                📍 {semilleroAsignado.linea_investigacion}
              </p>
            )}
          </div>
        ) : (
          <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/70 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              <div>
                <p className="text-[10px] font-black text-amber-800 uppercase tracking-tight">Sin Semillero</p>
                <p className="text-[10px] text-amber-700 font-medium">Pendiente por vincular</p>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onOpenQuickLink(user); }}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors shrink-0 shadow-xs"
            >
              + Vincular
            </button>
          </div>
        )}
      </div>

      {/* Overlay de Drag & Drop */}
      {isDragOver && (
        <div className="absolute inset-0 bg-indigo-700/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center animate-fadeIn z-30 text-white">
          <Zap size={44} className="text-amber-300 animate-pulse mb-2" />
          <h4 className="font-black text-lg">Asignar Semillero</h4>
          <p className="text-indigo-100 text-xs mt-1 font-medium">Suelta aquí para vincular a este aprendiz</p>
        </div>
      )}

      {/* Footer de la tarjeta */}
      <div className="mt-4 pt-3.5 flex items-center justify-between border-t border-slate-100 relative z-10">
        <div className="flex items-center gap-1.5">
          <Award size={14} className="text-emerald-600" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">
            {user.vinculacion?.estado || (user.is_active ? 'Activo' : 'Inactivo')}
          </span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onViewActivity(user); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all text-[10px] font-black uppercase tracking-wider shadow-2xs"
        >
          Perfil & Bitácoras <Activity size={12} />
        </button>
      </div>
    </Card>
  );
};

/**
 * Componente Principal del Módulo de Aprendices y Semilleristas CGAO
 */
const AprendicesModule = ({ onNotify, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [semilleros, setSemilleros] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSemilleroFilter, setSelectedSemilleroFilter] = useState('ALL');
  const [selectedProgramaFilter, setSelectedProgramaFilter] = useState('ALL');
  const [selectedEstadoFilter, setSelectedEstadoFilter] = useState('ALL');

  // Modales y Paneles
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showInsight, setShowInsight] = useState(false);
  const [isPoolVisible, setIsPoolVisible] = useState(true);
  
  // Modal de Vinculación Rápida
  const [quickLinkModal, setQuickLinkModal] = useState({ isOpen: false, user: null, semilleroId: '', estado: 'Activo' });
  const [linkingQuick, setLinkingQuick] = useState(false);

  // Formulario de Aprendiz
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    rol: 'aprendiz',
    rol_sennova: 'Aprendiz Investigador',
    password: '',
    ficha: '',
    programa_formacion: '',
    documento: '',
    celular: '',
    regional: 'Santander',
    sede: 'Centro de Gestión Empresarial del Oriente - Vélez',
    semillero_id: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });
  const [toggleConfirm, setToggleConfirm] = useState(null);

  const loadData = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const [usersData, semillerosData, linkedAprendices] = await Promise.all([
        UsuariosAPI.list({ rol: 'aprendiz' }),
        SemillerosAPI.list(),
        AprendicesAPI.list()
      ]);
      
      // Mapear vinculaciones por user_id
      const vinculacionesMap = (linkedAprendices || []).reduce((acc, curr) => {
        if (curr.user_id) acc[curr.user_id] = curr;
        return acc;
      }, {});

      // Filtrar usuarios aprendices y enriquecer
      const aprendices = (usersData || []).filter(u => 
        u.ficha || 
        u.programa_formacion || 
        (u.rol_sennova && u.rol_sennova.toLowerCase().includes('aprendiz')) ||
        u.rol === 'aprendiz'
      ).map(u => ({
        ...u,
        vinculacion: vinculacionesMap[u.id] || null
      }));

      setUsers(aprendices);
      setSemilleros(semillerosData || []);
    } catch (err) {
      onNotify?.('Error al cargar datos de aprendices y semilleros', 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => { loadData(true); }, []);

  // KPIs Calculados
  const stats = useMemo(() => {
    const total = users.length;
    const activos = users.filter(u => u.is_active).length;
    const vinculados = users.filter(u => u.vinculacion && u.vinculacion.semillero_id).length;
    const huerfanos = total - vinculados;
    const porcentajeVinculacion = total > 0 ? Math.round((vinculados / total) * 100) : 0;

    return {
      total,
      activos,
      vinculados,
      huerfanos,
      porcentajeVinculacion,
      semillerosCount: semilleros.length
    };
  }, [users, semilleros]);

  // Programas únicos presentes en la base de datos
  const availablePrograms = useMemo(() => {
    const progSet = new Set();
    users.forEach(u => {
      if (u.programa_formacion && u.programa_formacion.trim()) {
        progSet.add(u.programa_formacion.trim());
      }
    });
    return Array.from(progSet).sort();
  }, [users]);

  // Manejo de Creación / Edición
  const handleOpenCreate = () => {
    setFormData({ 
      nombre: '', 
      email: '', 
      rol: 'aprendiz', 
      rol_sennova: 'Aprendiz Investigador', 
      password: '', 
      ficha: '', 
      programa_formacion: CGAO_PROGRAMS[0], 
      documento: '', 
      celular: '',
      regional: 'Santander', 
      sede: 'Centro de Gestión Empresarial del Oriente - Vélez',
      semillero_id: semilleros[0]?.id || ''
    });
    setIsEditing(false);
    setShowForm(true);
  };

  const handleOpenEdit = (user) => {
    setFormData({ 
      ...user, 
      password: '',
      semillero_id: user.vinculacion?.semillero_id || ''
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleSaveUser = async () => {
    if (!formData.nombre.trim() || !formData.email.trim()) {
      onNotify?.('Nombre y correo institucional son obligatorios', 'error');
      return;
    }

    setSaving(true);
    try {
      let userId = formData.id;
      if (isEditing) {
        await UsuariosAPI.update(formData.id, formData);
        onNotify?.('Ficha de aprendiz actualizada exitosamente', 'success');
      } else {
        const newUser = await UsuariosAPI.create(formData);
        userId = newUser.id;
        onNotify?.('Aprendiz semillerista registrado con éxito', 'success');
      }

      // Si se seleccionó un semillero en el formulario, asegurar la vinculación
      if (formData.semillero_id && userId) {
        try {
          await SemillerosAPI.addAprendiz(formData.semillero_id, {
            user_id: userId,
            estado: 'Activo',
            fecha_ingreso: new Date().toISOString().split('T')[0]
          });
        } catch (linkErr) {
          console.warn('Nota de vinculación:', linkErr);
        }
      }

      setShowForm(false);
      loadData();
    } catch (err) {
      onNotify?.('Error al guardar: ' + (err.response?.data?.detail || err.message), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDeleteAction = async () => {
    if (!deleteConfirm.id) return;
    try {
      await UsuariosAPI.delete(deleteConfirm.id);
      onNotify?.('Aprendiz eliminado permanentemente', 'success');
      setDeleteConfirm({ isOpen: false, id: null });
      loadData();
    } catch (err) {
      onNotify?.('Error al eliminar registro', 'error');
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await UsuariosAPI.toggleActive(user.id);
      onNotify?.(user.is_active ? 'Aprendiz desactivado' : 'Aprendiz activado', 'success');
      loadData();
    } catch (err) {
      onNotify?.('Error al cambiar estado académico', 'error');
    }
  };

  const handleLinkSemillero = async (userId, semilleroId, estado = 'Activo') => {
    try {
      await SemillerosAPI.addAprendiz(semilleroId, { 
        user_id: userId, 
        estado,
        fecha_ingreso: new Date().toISOString().split('T')[0]
      });
      onNotify?.('Aprendiz vinculado exitosamente al semillero', 'success');
      loadData();
    } catch (err) {
      onNotify?.('Error al vincular: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  // Abrir Modal de Vinculación Rápida
  const handleOpenQuickLink = (user) => {
    setQuickLinkModal({
      isOpen: true,
      user,
      semilleroId: user.vinculacion?.semillero_id || semilleros[0]?.id || '',
      estado: user.vinculacion?.estado || 'Activo'
    });
  };

  const handleConfirmQuickLink = async () => {
    if (!quickLinkModal.user || !quickLinkModal.semilleroId) return;
    setLinkingQuick(true);
    try {
      await handleLinkSemillero(quickLinkModal.user.id, quickLinkModal.semilleroId, quickLinkModal.estado);
      setQuickLinkModal({ isOpen: false, user: null, semilleroId: '', estado: 'Activo' });
    } finally {
      setLinkingQuick(false);
    }
  };

  // Exportar Listado SENNOVA a CSV (Compatible con Excel UTF-8)
  const handleExportCSV = () => {
    if (filteredUsers.length === 0) {
      onNotify?.('No hay datos para exportar con los filtros actuales', 'warning');
      return;
    }

    const headers = [
      'Nombre Completo',
      'Documento',
      'Ficha',
      'Programa de Formacion',
      'Email Institucional',
      'Celular',
      'Semillero Asignado',
      'Rol SENNOVA',
      'Estado',
      'Sede'
    ];

    const rows = filteredUsers.map(u => {
      const sem = semilleros.find(s => s.id === u.vinculacion?.semillero_id);
      return [
        `"${(u.nombre || '').replace(/"/g, '""')}"`,
        `"${u.documento || ''}"`,
        `"${u.ficha || ''}"`,
        `"${(u.programa_formacion || '').replace(/"/g, '""')}"`,
        `"${u.email || ''}"`,
        `"${u.celular || ''}"`,
        `"${(sem?.nombre || 'Sin Asignar').replace(/"/g, '""')}"`,
        `"${u.rol_sennova || 'Aprendiz'}"`,
        `"${u.vinculacion?.estado || (u.is_active ? 'Activo' : 'Inactivo')}"`,
        `"${u.sede || 'Centro de Gestión Empresarial del Oriente'}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SENNOVA_CGAO_Aprendices_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onNotify?.('Listado exportado exitosamente', 'success');
  };

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    return (users || []).filter(u => {
      // Búsqueda por texto
      const search = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        (u.nombre || '').toLowerCase().includes(search) ||
        (u.ficha || '').toLowerCase().includes(search) ||
        (u.documento || '').toLowerCase().includes(search) ||
        (u.email || '').toLowerCase().includes(search) ||
        (u.programa_formacion || '').toLowerCase().includes(search);

      if (!matchesSearch) return false;

      // Filtro por Semillero
      if (selectedSemilleroFilter === 'UNASSIGNED') {
        if (u.vinculacion && u.vinculacion.semillero_id) return false;
      } else if (selectedSemilleroFilter !== 'ALL') {
        if (!u.vinculacion || u.vinculacion.semillero_id !== selectedSemilleroFilter) return false;
      }

      // Filtro por Programa
      if (selectedProgramaFilter !== 'ALL') {
        if ((u.programa_formacion || '').trim() !== selectedProgramaFilter) return false;
      }

      // Filtro por Estado
      if (selectedEstadoFilter === 'ACTIVE' && !u.is_active) return false;
      if (selectedEstadoFilter === 'INACTIVE' && u.is_active) return false;

      return true;
    });
  }, [users, searchTerm, selectedSemilleroFilter, selectedProgramaFilter, selectedEstadoFilter]);

  if (loading && users.length === 0) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-56 bg-slate-200/70 rounded-3xl w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-slate-200/70 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-slate-200/70 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      
      {/* ── BANNER PRINCIPAL SENNOVA CGAO ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 sm:p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/15 rounded-full -translate-y-1/3 translate-x-1/3 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Badge className="bg-indigo-500/25 text-indigo-200 border-indigo-500/40 text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1">
                SENNOVA • Regional Santander
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-black uppercase tracking-wider px-3 py-1">
                Centro de Gestión Empresarial del Oriente
              </Badge>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight mb-4">
              Semilleros de <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-100">Talento</span> CGAO
            </h1>
            <p className="text-slate-300 font-normal max-w-2xl text-sm sm:text-base leading-relaxed mb-8">
              Gestión formativa y seguimiento integral a los aprendices semilleristas vinculados a los proyectos I+D+i en las sedes Vélez, Barbosa y provincia de Vélez.
            </p>

            <div className="flex flex-wrap items-center gap-3.5">
              <Button 
                variant="sena" 
                className="h-12 px-6 shadow-xl shadow-emerald-900/30 text-sm font-bold" 
                onClick={handleOpenCreate}
              >
                <UserPlus size={18} className="mr-2" /> Registrar Aprendiz
              </Button>
              
              <button
                onClick={() => setIsPoolVisible(!isPoolVisible)}
                className={`h-12 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 border ${
                  isPoolVisible 
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400/40' 
                    : 'bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white border-white/20'
                }`}
              >
                <Zap size={16} className={isPoolVisible ? 'text-amber-300 animate-pulse' : 'text-slate-400'} />
                {isPoolVisible ? 'Ocultar Semilleros' : 'Pool de Semilleros'}
              </button>

              <button
                onClick={handleExportCSV}
                className="h-12 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 transition-all flex items-center gap-2"
                title="Exportar listado a Excel/CSV"
              >
                <Download size={16} className="text-emerald-400" /> Exportar Reporte
              </button>
            </div>
          </div>
        </div>
        
        {/* KPIs Laterales */}
        <div className="lg:col-span-4 grid grid-cols-2 gap-4">
          <Card className="p-5 bg-white border border-slate-200/80 shadow-md rounded-[2rem] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Users size={22} />
              </div>
              <Badge variant="indigo" className="text-[10px] font-black">TOTAL</Badge>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">{stats.total}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Aprendices Registrados</p>
            </div>
          </Card>

          <Card className="p-5 bg-white border border-slate-200/80 shadow-md rounded-[2rem] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                <GraduationCap size={22} />
              </div>
              <Badge variant="emerald" className="text-[10px] font-black">{stats.porcentajeVinculacion}%</Badge>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-emerald-700 tracking-tight tabular-nums">{stats.vinculados}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Con Semillero Asignado</p>
            </div>
          </Card>

          <Card className={`p-5 border shadow-md rounded-[2rem] flex flex-col justify-between ${
            stats.huerfanos > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-slate-200/80'
          }`}>
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-2xl ${stats.huerfanos > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                <AlertTriangle size={22} />
              </div>
              {stats.huerfanos > 0 && (
                <span className="animate-pulse bg-amber-200 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase">
                  Pendientes
                </span>
              )}
            </div>
            <div className="mt-3">
              <p className={`text-3xl font-black tracking-tight tabular-nums ${stats.huerfanos > 0 ? 'text-amber-800' : 'text-slate-800'}`}>
                {stats.huerfanos}
              </p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Sin Semillero</p>
            </div>
          </Card>

          <Card className="p-5 bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-0 shadow-md rounded-[2rem] flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="p-2.5 bg-white/10 text-indigo-300 rounded-2xl">
                <BookOpen size={22} />
              </div>
              <Badge className="bg-white/20 text-white border-0 text-[10px] font-black">CGAO</Badge>
            </div>
            <div className="mt-3">
              <p className="text-3xl font-black text-white tracking-tight tabular-nums">{stats.semillerosCount}</p>
              <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider mt-0.5">Semilleros Activos</p>
            </div>
          </Card>
        </div>
      </div>

      {/* ── POOL DE SEMILLEROS CGAO (Panel desplegable y arrastrable) ── */}
      {isPoolVisible && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-indigo-900/50 text-white relative overflow-hidden animate-fadeIn">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white flex items-center gap-2.5">
                <BookOpen size={22} className="text-indigo-400" />
                Semilleros de Investigación del Centro CGAO
              </h3>
              <p className="text-indigo-200 text-xs sm:text-sm mt-1 font-medium">
                Arrastra una tarjeta hacia un aprendiz abajo para vincularlo de inmediato, o haz clic para filtrar.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedSemilleroFilter !== 'ALL' && (
                <button
                  onClick={() => setSelectedSemilleroFilter('ALL')}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-indigo-200 text-xs font-bold rounded-xl border border-white/10 transition-colors"
                >
                  Mostrar Todos
                </button>
              )}
              <Badge className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 uppercase font-black text-[9px] tracking-widest px-3 py-1">
                Catálogo Activo
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 relative z-10">
            {semilleros.map(s => {
              const semAprendices = users.filter(u => u.vinculacion?.semillero_id === s.id);
              const isFilterSelected = selectedSemilleroFilter === s.id;

              return (
                <div 
                  key={s.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('semilleroId', s.id);
                    e.dataTransfer.setData('semilleroid', s.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => setSelectedSemilleroFilter(isFilterSelected ? 'ALL' : s.id)}
                  className={`p-5 rounded-2xl cursor-grab active:cursor-grabbing transition-all border group relative ${
                    isFilterSelected 
                      ? 'bg-indigo-600/90 border-indigo-300 ring-2 ring-indigo-400 shadow-lg' 
                      : 'bg-white/10 border-white/15 hover:bg-white/15 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase font-mono bg-indigo-500 text-white px-2.5 py-0.5 rounded-lg">
                      {s.sigla || s.nombre.substring(0, 8)}
                    </span>
                    <span className="text-[10px] font-bold text-indigo-200 bg-white/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Users size={11} /> {semAprendices.length}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-white line-clamp-2 leading-snug group-hover:text-indigo-200 transition-colors mb-2">
                    {s.nombre}
                  </h4>

                  {s.linea_investigacion && (
                    <p className="text-[11px] text-slate-300 font-medium line-clamp-2 flex items-start gap-1 leading-relaxed">
                      <Target size={12} className="text-indigo-400 shrink-0 mt-0.5" />
                      {s.linea_investigacion}
                    </p>
                  )}

                  {s.lider_nombre && (
                    <p className="text-[10px] text-indigo-300/90 font-bold mt-3 truncate border-t border-white/10 pt-2">
                      Líder: <span className="text-white">{s.lider_nombre}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── BARRA DE BÚSQUEDA Y FILTROS AVANZADOS ── */}
      <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-200/80 space-y-4">
        
        {/* Fila 1: Búsqueda y Filtros de Estado */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, documento, ficha o programa de formación..." 
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-none transition-all text-sm font-semibold text-slate-800 placeholder:text-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filtro de Estado */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setSelectedEstadoFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${selectedEstadoFilter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedEstadoFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition-all ${selectedEstadoFilter === 'ACTIVE' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-emerald-600'}`}
              >
                Activos
              </button>
              <button
                onClick={() => setSelectedEstadoFilter('INACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition-all ${selectedEstadoFilter === 'INACTIVE' ? 'bg-white text-slate-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Inactivos
              </button>
            </div>

            {/* Contador de Resultados */}
            <Badge variant="indigo" className="h-10 px-4 font-black text-xs uppercase tracking-wider">
              {filteredUsers.length} Aprendices
            </Badge>
          </div>
        </div>

        {/* Fila 2: Filtros por Semillero y Programa */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
            <Filter size={12} /> Semillero:
          </span>

          <button
            onClick={() => setSelectedSemilleroFilter('ALL')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border ${
              selectedSemilleroFilter === 'ALL' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            Todos ({users.length})
          </button>

          {semilleros.map(s => {
            const count = users.filter(u => u.vinculacion?.semillero_id === s.id).length;
            const isSelected = selectedSemilleroFilter === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSemilleroFilter(isSelected ? 'ALL' : s.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  isSelected 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                    : 'bg-indigo-50/60 text-indigo-800 border-indigo-100 hover:bg-indigo-100/60'
                }`}
              >
                <span>{s.sigla || s.nombre}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-indigo-200/60 text-indigo-900'}`}>
                  {count}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setSelectedSemilleroFilter(selectedSemilleroFilter === 'UNASSIGNED' ? 'ALL' : 'UNASSIGNED')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
              selectedSemilleroFilter === 'UNASSIGNED' 
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs' 
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle size={12} />
            <span>Sin Semillero</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedSemilleroFilter === 'UNASSIGNED' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'}`}>
              {stats.huerfanos}
            </span>
          </button>

          {/* Selector de Programas si hay múltiples */}
          {availablePrograms.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Programa:</span>
              <select
                value={selectedProgramaFilter}
                onChange={(e) => setSelectedProgramaFilter(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Todos los Programas ({availablePrograms.length})</option>
                {availablePrograms.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── GRID DE APRENDICES ── */}
      {filteredUsers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredUsers.map(user => (
            <AprendizCard
              key={user.id}
              user={user}
              semilleros={semilleros}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onToggleActive={(user) => setToggleConfirm(user)}
              onViewActivity={(u) => { setSelectedUser(u); setShowInsight(true); }}
              onLinkSemillero={handleLinkSemillero}
              onOpenQuickLink={handleOpenQuickLink}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-white rounded-[2.5rem] shadow-sm border border-dashed border-slate-200">
          <div className="w-18 h-18 bg-indigo-50 text-indigo-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Users size={36} />
          </div>
          <h3 className="text-lg font-black text-slate-900">No se encontraron aprendices semilleristas</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto font-medium">
            Intenta cambiar los filtros de búsqueda o registra un nuevo aprendiz en el Centro de Gestión Empresarial del Oriente.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => { 
                setSearchTerm(''); 
                setSelectedSemilleroFilter('ALL'); 
                setSelectedProgramaFilter('ALL'); 
                setSelectedEstadoFilter('ALL'); 
              }}
            >
              Restablecer Filtros
            </Button>
            <Button variant="sena" onClick={handleOpenCreate}>
              <UserPlus size={16} className="mr-2" /> Registrar Aprendiz
            </Button>
          </div>
        </div>
      )}

      {/* ── MODAL: VINCULACIÓN RÁPIDA DE SEMILLERO ── */}
      <Modal
        isOpen={quickLinkModal.isOpen}
        onClose={() => setQuickLinkModal({ isOpen: false, user: null, semilleroId: '', estado: 'Activo' })}
        size="md"
        variant="indigo"
        icon={GraduationCap}
        title="Vincular Aprendiz a Semillero"
        subtitle={`Asignación para ${quickLinkModal.user?.nombre || 'el aprendiz'}`}
        footer={
          <>
            <Button variant="outline" onClick={() => setQuickLinkModal({ isOpen: false, user: null, semilleroId: '', estado: 'Activo' })}>
              Cancelar
            </Button>
            <Button variant="indigo" onClick={handleConfirmQuickLink} disabled={linkingQuick || !quickLinkModal.semilleroId}>
              {linkingQuick ? <Loader2 size={16} className="animate-spin mr-2" /> : <CheckCircle2 size={16} className="mr-2" />}
              Confirmar Vinculación
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl">
            <p className="text-xs font-black text-indigo-900">Aprendiz Seleccionado:</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">{quickLinkModal.user?.nombre}</p>
            <p className="text-xs text-slate-500">Ficha: {quickLinkModal.user?.ficha || 'S/N'} • {quickLinkModal.user?.programa_formacion}</p>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
              Seleccionar Semillero CGAO:
            </label>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {semilleros.map(s => {
                const isSelected = quickLinkModal.semilleroId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setQuickLinkModal({ ...quickLinkModal, semilleroId: s.id })}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isSelected 
                        ? 'bg-indigo-50/90 border-indigo-400 ring-2 ring-indigo-500 shadow-xs' 
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase font-mono bg-indigo-600 text-white px-2 py-0.5 rounded-md">
                          {s.sigla || 'SEM'}
                        </span>
                        <h4 className="text-xs font-black text-slate-900">{s.nombre}</h4>
                      </div>
                      {s.linea_investigacion && (
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">📍 {s.linea_investigacion}</p>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle2 size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Estado de Vinculación"
              options={ESTADOS_VINCULACION}
              value={quickLinkModal.estado}
              onChange={(e) => setQuickLinkModal({ ...quickLinkModal, estado: e.target.value })}
            />
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Centro / Regional
              </label>
              <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600">
                CGAO • Santander
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ── MODAL: FORMULARIO DE REGISTRO / EDICIÓN ── */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        size="xl"
        variant="indigo"
        icon={isEditing ? Edit : UserPlus}
        title={isEditing ? 'Actualizar Ficha de Aprendiz' : 'Alta de Nuevo Aprendiz Semillerista'}
        subtitle="Gestión de Talento Humano e Investigación Formativa - SENNOVA CGAO"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button variant="sena" className="px-8 shadow-lg" onClick={handleSaveUser} disabled={saving}>
              {saving ? <Loader2 size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" />}
              {isEditing ? 'Guardar Cambios' : 'Registrar Aprendiz'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input 
              label="Nombre Completo *" 
              placeholder="Ej: Juan David Pérez" 
              value={formData.nombre} 
              onChange={e => setFormData({...formData, nombre: e.target.value})} 
              required 
            />
            <Input 
              label="Correo Institucional SENA *" 
              type="email" 
              placeholder="usuario@soy.sena.edu.co" 
              value={formData.email} 
              onChange={e => setFormData({...formData, email: e.target.value})} 
              required 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1">
              <Input 
                label="Número de Ficha" 
                placeholder="2560892" 
                value={formData.ficha} 
                onChange={e => setFormData({...formData, ficha: e.target.value})} 
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                Programa de Formación
              </label>
              <input
                type="text"
                list="cgao-programs-list"
                placeholder="Seleccione o escriba el programa de formación"
                value={formData.programa_formacion}
                onChange={e => setFormData({...formData, programa_formacion: e.target.value})}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm font-semibold text-slate-800"
              />
              <datalist id="cgao-programs-list">
                {CGAO_PROGRAMS.map(prog => (
                  <option key={prog} value={prog} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input 
              label="Documento de Identidad" 
              placeholder="C.C. / T.I. 1098..." 
              value={formData.documento} 
              onChange={e => setFormData({...formData, documento: e.target.value})} 
            />
            <Input 
              label="Celular / WhatsApp" 
              placeholder="310 123 4567" 
              value={formData.celular} 
              onChange={e => setFormData({...formData, celular: e.target.value})} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Select 
              label="Rol en SENNOVA" 
              options={ROLES_SENNOVA_OPTIONS} 
              value={formData.rol_sennova} 
              onChange={e => setFormData({...formData, rol_sennova: e.target.value})} 
            />
            <Select 
              label="Semillero Asignado" 
              options={[
                { value: '', label: 'Sin Semillero (Asignar después)' },
                ...semilleros.map(s => ({ value: s.id, label: `${s.sigla ? s.sigla + ' — ' : ''}${s.nombre}` }))
              ]} 
              value={formData.semillero_id} 
              onChange={e => setFormData({...formData, semillero_id: e.target.value})} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
            <Input 
              label="Sede / Centro" 
              value={formData.sede} 
              onChange={e => setFormData({...formData, sede: e.target.value})} 
            />
            <Input 
              label={isEditing ? "Contraseña (dejar vacío para mantener)" : "Contraseña Temporal *"} 
              type="password" 
              placeholder={isEditing ? "••••••••" : "Mínimo 6 caracteres"}
              value={formData.password} 
              onChange={e => setFormData({...formData, password: e.target.value})} 
              required={!isEditing} 
            />
          </div>
        </div>
      </Modal>

      {/* ── DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN ── */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDeleteAction}
        title="¿Eliminar Aprendiz Semillerista?"
        description="Esta acción eliminará el usuario y sus vinculaciones de semillero de manera permanente. Esta acción no se puede deshacer."
        confirmText="Eliminar Aprendiz"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!toggleConfirm}
        onClose={() => setToggleConfirm(null)}
        onConfirm={async () => {
          if (!toggleConfirm) return;
          await handleToggleActive(toggleConfirm);
          setToggleConfirm(null);
        }}
        title={toggleConfirm?.is_active ? '¿Desactivar Aprendiz?' : '¿Activar Aprendiz?'}
        description={toggleConfirm?.is_active ? `¿Desactivar la cuenta de ${toggleConfirm.nombre}? No podrá acceder al sistema hasta ser reactivado.` : `¿Activar la cuenta de ${toggleConfirm.nombre}? Podrá acceder al sistema nuevamente.`}
        confirmText={toggleConfirm?.is_active ? 'Desactivar' : 'Activar'}
        variant={toggleConfirm?.is_active ? 'danger' : 'success'}
      />

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
