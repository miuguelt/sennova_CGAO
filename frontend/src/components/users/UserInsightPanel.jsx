import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Mail, MapPin, GraduationCap, ExternalLink, Activity, 
  ChevronRight, Calendar, User, Shield, Briefcase, Trophy, 
  DollarSign, Target, Info, Users, Save, RotateCcw, Trash2, Loader2, Plus, Edit3,
  MessageSquare, Key, TrendingUp, PieChart, Package, BookOpen, FileText, Download, Award, BarChart3,
  UploadCloud, CheckCircle2, AlertCircle, Eye, EyeOff, RefreshCw, Send, Lock, Copy, Check, Sparkles,
  Building2, Phone, Hash, BookMarked, Layers, FileCheck, CheckCircle, Clock
} from 'lucide-react';
import { 
  ResponsiveContainer, Cell, PieChart as RePie, Pie, Tooltip
} from 'recharts';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Modal from '../ui/Modal';
import ScrollableTabs from '../ui/ScrollableTabs';
import useModalStack from '../../hooks/useModalStack';
import { DashboardAPI as StatsAPI } from '../../api/dashboard';
import { ProyectosAPI } from '../../api/proyectos';
import { SemillerosAPI } from '../../api/semilleros';
import { ProductosAPI } from '../../api/productos';
import { ReportesAPI } from '../../api/reportes';
import { DocumentosAPI } from '../../api/documentos';
import { UsuariosAPI } from '../../api/usuarios';
import { NotificacionesAPI } from '../../api/notificaciones';

const UserInsightPanel = ({ user, isOpen, onClose, onNotify }) => {
  const { zIndex } = useModalStack({ isOpen: isOpen && !!user, onClose });
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ ...user });
  const [saving, setSaving] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  
  // Documentos de usuario
  const [userDocs, setUserDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef(null);

  // Estado para el detalle anidado y su edición
  const [nestedDetail, setNestedDetail] = useState(null); 
  const [isEditingNested, setIsEditingNested] = useState(false);
  const [editBuffer, setEditBuffer] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkType, setLinkType] = useState(null); // 'proyecto', 'producto', 'semillero'
  const [availableItems, setAvailableItems] = useState([]);
  const [linking, setLinking] = useState(false);

  // Estado para reseteo de contraseña
  const [showResetModal, setShowResetModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Estado para envío de mensajes y notificaciones
  const [showSendMessageModal, setShowSendMessageModal] = useState(false);
  const [messageSubject, setMessageSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [messagePriority, setMessagePriority] = useState('normal');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Estado para CVLaC
  const [showCvModal, setShowCvModal] = useState(false);
  const [cvUrlInput, setCvUrlInput] = useState('');

  const loadStats = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await StatsAPI.getUserImpact(user.id);
      setStats(data);
    } catch (err) {
      console.error("Error loading user impact:", err);
      onNotify?.('Error al cargar estadísticas de impacto', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadUserDocuments = async () => {
    if (!user?.id) return;
    setLoadingDocs(true);
    try {
      const docs = await DocumentosAPI.list({ entidad_tipo: 'user', entidad_id: user.id });
      setUserDocs(docs || []);
    } catch (err) {
      console.error("Error loading user docs:", err);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleUploadIdentityDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entidad_tipo', 'user');
      formData.append('entidad_id', user.id);
      formData.append('tipo', 'soporte_identidad');

      await DocumentosAPI.upload(formData);
      onNotify?.('Documento de soporte subido exitosamente', 'success');
      loadUserDocuments();
    } catch (err) {
      onNotify?.('Error al subir documento: ' + err.message, 'error');
    } finally {
      setUploadingDoc(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveCvUrl = async () => {
    try {
      await UsuariosAPI.update(user.id, { cv_lac_url: cvUrlInput });
      user.cv_lac_url = cvUrlInput;
      onNotify?.('URL de CVLaC actualizada correctamente', 'success');
      setShowCvModal(false);
    } catch (err) {
      onNotify?.('Error al guardar URL: ' + err.message, 'error');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await UsuariosAPI.update(user.id, editData);
      Object.assign(user, editData);
      onNotify?.('Datos actualizados correctamente', 'success');
      setEditMode(false);
      loadStats();
    } catch (err) {
      onNotify?.('Error al actualizar: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      onNotify?.('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }
    if (confirmPassword && newPassword !== confirmPassword) {
      onNotify?.('Las contraseñas no coinciden', 'error');
      return;
    }
    setResetting(true);
    try {
      await UsuariosAPI.resetPassword(user.id, newPassword);
      onNotify?.(`Contraseña de ${user.nombre} actualizada exitosamente`, 'success');
      setShowResetModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      onNotify?.('Error al resetear contraseña: ' + err.message, 'error');
    } finally {
      setResetting(false);
    }
  };

  const copyEmailToClipboard = () => {
    if (user?.email) {
      navigator.clipboard?.writeText(user.email);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
      onNotify?.('Correo copiado al portapapeles', 'info');
    }
  };

  useEffect(() => {
    if (isOpen && user?.id) {
      loadStats();
      loadUserDocuments();
      setEditData({ ...user });
      setCvUrlInput(user.cv_lac_url || '');
      setActiveTab('overview');
      setConfirmDeleteId(null);
      setShowResetModal(false);
      setShowSendMessageModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setMessageSubject('');
      setMessageBody('');
      setCopiedEmail(false);
    }
  }, [isOpen, user?.id]);

  const handleSaveNested = async () => {
    try {
      if (nestedDetail.type === 'proyecto') {
        await ProyectosAPI.update(editBuffer.id, {
          nombre_corto: editBuffer.nombre,
          objetivo_general: editBuffer.objetivo,
          presupuesto_total: Number(editBuffer.presupuesto) || 0
        });
      } else if (nestedDetail.type === 'producto') {
        await ProductosAPI.update(editBuffer.id, {
          nombre: editBuffer.nombre,
          descripcion: editBuffer.descripcion,
          tipo: editBuffer.tipo
        });
      } else if (nestedDetail.type === 'semillero') {
        await SemillerosAPI.update(editBuffer.id, {
          nombre: editBuffer.nombre,
          sede: editBuffer.sede
        });
      }
      onNotify?.('Elemento actualizado en la base de datos', 'success');
      await loadStats();
      setNestedDetail({ ...nestedDetail, data: editBuffer });
      setIsEditingNested(false);
    } catch (err) {
      onNotify?.('Error al guardar en base de datos: ' + err.message, 'error');
    }
  };

  const startEditing = () => {
    setEditBuffer({ ...nestedDetail.data });
    setIsEditingNested(true);
  };

  const handleDeleteNested = async () => {
    if (confirmDeleteId === nestedDetail.data.id) {
      try {
        if (nestedDetail.type === 'proyecto') {
          await ProyectosAPI.removeEquipo(nestedDetail.data.id, user.id);
        } else if (nestedDetail.type === 'producto') {
          await ProductosAPI.delete(nestedDetail.data.id);
        } else if (nestedDetail.type === 'semillero') {
          await SemillerosAPI.removeInvestigador(nestedDetail.data.id, user.id);
        }
        onNotify?.('Elemento desvinculado con éxito', 'success');
        await loadStats();
        setNestedDetail(null);
        setConfirmDeleteId(null);
      } catch (err) {
        onNotify?.('Error al desvincular: ' + err.message, 'error');
      }
    } else {
      setConfirmDeleteId(nestedDetail.data.id);
    }
  };

  const handleOpenLink = async (type) => {
    setLinkType(type);
    setAvailableItems([]);
    setShowLinkModal(true);
    setLinking(true);
    try {
      let items = [];
      if (type === 'proyecto') {
        const all = await ProyectosAPI.list();
        items = all.filter(p => !stats.proyectos_lista?.some(up => up.id === p.id));
      } else if (type === 'semillero') {
        const all = await SemillerosAPI.list();
        items = all.filter(s => !stats.semilleros_lista?.some(us => us.id === s.id));
      }
      setAvailableItems(items);
    } catch (err) {
      onNotify?.('Error al cargar items vinculables', 'error');
    }
    setLinking(false);
  };

  const handleLinkItem = async (itemId) => {
    try {
      if (linkType === 'proyecto') {
        await ProyectosAPI.addEquipo(itemId, user.id, user.rol === 'aprendiz' ? 'Aprendiz' : 'Investigador', 20);
      } else if (linkType === 'semillero') {
        if (user.rol === 'aprendiz') {
          await SemillerosAPI.addAprendiz(itemId, { 
            user_id: user.id,
            estado: 'Activo',
            fecha_ingreso: new Date().toISOString().split('T')[0]
          });
        } else {
          await SemillerosAPI.addInvestigador(itemId, {
            user_id: user.id,
            rol: 'Coinvestigador'
          });
        }
      }
      onNotify?.('Vinculación registrada en base de datos', 'success');
      setShowLinkModal(false);
      loadStats();
    } catch (err) {
      onNotify?.('Error al vincular: ' + err.message, 'error');
    }
  };

  if (!isOpen || !user) return null;

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6'];
  const formatCurrency = (val) => {
    const num = Number(val);
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(isNaN(num) ? 0 : num);
  };

  const identityDoc = userDocs.find(d => d.tipo === 'soporte_identidad' || d.tipo === 'documento_identidad') || userDocs[0];

  const NestedDetailModal = () => {
    if (!nestedDetail) return null;
    const { type, data } = nestedDetail;
    const getIcon = () => {
      if (type === 'proyecto') return Briefcase;
      if (type === 'producto') return Package;
      return GraduationCap;
    };
    const getVariant = () => {
      if (isEditingNested) return 'warning';
      if (type === 'proyecto') return 'emerald';
      if (type === 'producto') return 'indigo';
      return 'indigo';
    };

    return (
      <Modal
        isOpen={!!nestedDetail}
        onClose={() => !isEditingNested && setNestedDetail(null)}
        size="lg"
        variant={getVariant()}
        icon={getIcon()}
        title={isEditingNested ? `Editar ${type}` : data.nombre}
        subtitle={isEditingNested ? `Modificando información de ${type}` : `Detalle de ${type}`}
        footer={
          isEditingNested ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditingNested(false)}>
                <RotateCcw size={14} className="mr-2" /> Cancelar
              </Button>
              <Button variant="primary" size="sm" onClick={handleSaveNested}>
                <Save size={14} className="mr-2" /> Guardar Cambios
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant={confirmDeleteId === data.id ? "danger" : "outline"} 
                size="sm" 
                className={confirmDeleteId === data.id ? "" : "text-rose-600 border-rose-100 hover:bg-rose-50"}
                onClick={handleDeleteNested} 
              >
                <Trash2 size={14} className="mr-2" />
                {confirmDeleteId === data.id ? "¿Confirmar?" : `Desvincular`}
              </Button>
              <div className="flex-1" />
              <Button variant="outline" size="sm" onClick={() => setNestedDetail(null)}>Cerrar</Button>
              <Button variant="secondary" size="sm" onClick={startEditing}>
                <Edit3 size={14} className="mr-2" /> Editar
              </Button>
            </>
          )
        }
      >
        <div className="space-y-6">
          {type === 'proyecto' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Presupuesto Asignado</p>
                  {isEditingNested ? <Input type="number" value={editBuffer.presupuesto} onChange={e => setEditBuffer({...editBuffer, presupuesto: e.target.value})} /> : <p className="text-lg font-black text-slate-900">{formatCurrency(data.presupuesto)}</p>}
                </div>
                <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase mb-1">Ejecución Real</p>
                  {isEditingNested ? <Input type="number" value={editBuffer.ejecutado} onChange={e => setEditBuffer({...editBuffer, ejecutado: e.target.value})} /> : <p className="text-lg font-black text-emerald-700">{formatCurrency(data.ejecutado)}</p>}
                </div>
              </div>
              <section>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2"><Target size={14} /> Objetivo del Proyecto</h4>
                {isEditingNested ? <TextArea value={editBuffer.objetivo} onChange={e => setEditBuffer({...editBuffer, objetivo: e.target.value})} rows={3} /> : <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">{data.objetivo}</p>}
              </section>
              {!isEditingNested && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-slate-50 rounded-2xl"><p className="text-[10px] text-slate-400 font-bold uppercase">Estado</p><Badge variant="indigo" className="mt-1">{data.estado}</Badge></div>
                  <div className="text-center p-3 bg-slate-50 rounded-2xl"><p className="text-[10px] text-slate-400 font-bold uppercase">Equipo</p><p className="text-sm font-bold text-slate-800 mt-1">{data.equipo} Personas</p></div>
                  <div className="text-center p-3 bg-slate-50 rounded-2xl"><p className="text-[10px] text-slate-400 font-bold uppercase">Avance</p><p className="text-sm font-bold text-emerald-600 mt-1">{data.progreso}%</p></div>
                </div>
              )}
            </>
          )}

          {type === 'producto' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <p className="text-[10px] font-bold text-blue-600 uppercase mb-2">Descripción Técnica</p>
                {isEditingNested ? <TextArea value={editBuffer.descripcion} onChange={e => setEditBuffer({...editBuffer, descripcion: e.target.value})} /> : <p className="text-sm text-slate-700 leading-relaxed">{data.descripcion}</p>}
              </div>
              <Input label="Tipo MinCiencias" value={isEditingNested ? editBuffer.tipo : data.tipo} onChange={e => setEditBuffer({...editBuffer, tipo: e.target.value})} readOnly={!isEditingNested} />
              <Input label="Autores Registrados" value={isEditingNested ? editBuffer.autores : data.autores} onChange={e => setEditBuffer({...editBuffer, autores: e.target.value})} readOnly={!isEditingNested} />
            </div>
          )}

          {type === 'semillero' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 p-4 bg-slate-50 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Aprendices Activos</p>
                  {isEditingNested ? <Input type="number" value={editBuffer.estudiantes} onChange={e => setEditBuffer({...editBuffer, estudiantes: e.target.value})} /> : <p className="text-2xl font-black text-slate-900">{data.estudiantes}</p>}
                </div>
                <div className="flex-1 p-4 bg-slate-50 rounded-2xl text-right">
                  <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Sede / Centro</p>
                  {isEditingNested ? <Input value={editBuffer.sede} onChange={e => setEditBuffer({...editBuffer, sede: e.target.value})} /> : <Badge variant="indigo">{data.sede}</Badge>}
                </div>
              </div>
              <section>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Líneas de Investigación</h4>
                <div className="flex flex-wrap gap-2">{(data.lineas || []).map((l, i) => (<span key={i} className="px-3 py-1.5 bg-violet-50 text-violet-700 rounded-xl text-xs font-bold border border-violet-100">{l}</span>))}</div>
              </section>
            </div>
          )}
        </div>
      </Modal>
    );
  };

  const LinkModal = () => {
    if (!showLinkModal) return null;
    return (
      <Modal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        size="md"
        variant="emerald"
        icon={Plus}
        title={`Vincular ${linkType}`}
        subtitle="Catálogo SENNOVA disponible para asociar"
        footer={<Button variant="outline" size="sm" onClick={() => setShowLinkModal(false)}>Cerrar</Button>}
      >
        <div className="space-y-3">
          {linking ? (
            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
          ) : availableItems.length > 0 ? (
            availableItems.map(item => (
              <div 
                key={item.id} 
                className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer transition-all flex justify-between items-center group shadow-sm"
                onClick={() => handleLinkItem(item.id)}
              >
                <div>
                  <span className="text-sm font-black text-slate-800 group-hover:text-emerald-700">{item.nombre || item.titulo || item.nombre_corto}</span>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">{item.linea_investigacion || item.codigo_sgps || 'Registro SENNOVA'}</p>
                </div>
                <Plus size={16} className="text-slate-300 group-hover:text-emerald-500 group-hover:scale-110 transition-transform" />
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400">
              <Info size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">No hay {linkType}s disponibles</p>
              <p className="text-[10px] text-slate-400 mt-1">Todos los registros ya se encuentran vinculados a este perfil.</p>
            </div>
          )}
        </div>
      </Modal>
    );
  };

  const ResetModal = () => {
    if (!showResetModal) return null;

    const generateSecurePassword = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';
      let pass = 'Sennova.' + new Date().getFullYear() + '!';
      for (let i = 0; i < 4; i++) {
        pass += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      setNewPassword(pass);
      setConfirmPassword(pass);
      navigator.clipboard?.writeText(pass);
      onNotify?.('Contraseña generada y copiada al portapapeles', 'info');
    };

    const isLengthValid = newPassword.length >= 6;
    const isMatch = newPassword && confirmPassword && newPassword === confirmPassword;

    return (
      <Modal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        size="md"
        variant="warning"
        icon={Key}
        title="Cambiar Contraseña de Acceso"
        subtitle={`Usuario: ${user?.nombre}`}
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" size="sm" onClick={() => setShowResetModal(false)}>
              Cancelar
            </Button>
            <Button 
              variant="sena" 
              size="sm" 
              onClick={handleResetPassword} 
              disabled={resetting || !isLengthValid || !isMatch}
            >
              {resetting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Shield size={14} className="mr-1.5" />}
              Confirmar Cambio
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-amber-50/90 border border-amber-200/80 rounded-2xl flex items-start gap-3">
            <Shield size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800 leading-relaxed">
              Establecerás una nueva clave para <strong>{user?.nombre}</strong> ({user?.email}). El usuario podrá iniciar sesión inmediatamente.
            </div>
          </div>

          <div className="flex justify-between items-center pt-1">
            <span className="text-xs font-bold text-slate-700">Generador Rápido</span>
            <button
              type="button"
              onClick={generateSecurePassword}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-sm"
            >
              <Sparkles size={13} className="text-emerald-600" /> Generar Clave Segura
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nueva Contraseña <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input 
                  type={showPasswordText ? "text" : "password"} 
                  value={newPassword} 
                  onChange={e => setNewPassword(e.target.value)} 
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordText(!showPasswordText)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  title={showPasswordText ? "Ocultar" : "Mostrar"}
                >
                  {showPasswordText ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirmar Contraseña <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Input 
                  type={showPasswordText ? "text" : "password"} 
                  value={confirmPassword} 
                  onChange={e => setConfirmPassword(e.target.value)} 
                  placeholder="Repite la nueva contraseña"
                  className="pr-10"
                />
              </div>
            </div>

            {/* Checklist de validación */}
            <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs border border-slate-200/60">
              <div className="flex items-center gap-2">
                {isLengthValid ? (
                  <CheckCircle2 size={14} className="text-emerald-600" />
                ) : (
                  <AlertCircle size={14} className="text-slate-300" />
                )}
                <span className={isLengthValid ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                  Mínimo 6 caracteres
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isMatch ? (
                  <CheckCircle2 size={14} className="text-emerald-600" />
                ) : (
                  <AlertCircle size={14} className="text-slate-300" />
                )}
                <span className={isMatch ? "text-emerald-700 font-semibold" : "text-slate-500"}>
                  Las contraseñas coinciden
                </span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  const SendMessageModal = () => {
    if (!showSendMessageModal) return null;

    const templates = [
      {
        label: '📝 Actualizar CVLaC',
        title: 'Recordatorio: Actualización de CVLaC en MinCiencias',
        body: `Estimado(a) ${user?.nombre || 'investigador(a)'},\n\nLe recordamos mantener actualizada su información y producción académica en la plataforma CVLaC (MinCiencias) para el registro institucional en SENNOVA.`
      },
      {
        label: '📊 Avance de Proyecto',
        title: 'Solicitud de reporte de avances de proyecto',
        body: `Cordial saludo,\n\nPor favor verificar el avance de las actividades e hitos asignados en la plataforma SENNOVA y registrar las evidencias correspondientes.`
      },
      {
        label: '📦 Cargue de Entregables',
        title: 'Cargue pendiente de productos y evidencias',
        body: `Estimado(a) integrante del equipo,\n\nSe requiere subir los documentos de soporte y productos técnicos acordados en el plan de trabajo a la plataforma.`
      },
      {
        label: '🔔 Convocatoria SENNOVA',
        title: 'Novedades y fechas clave Convocatoria SENNOVA',
        body: `Le informamos sobre los nuevos lineamientos y cronograma de la Convocatoria SENNOVA. Por favor revise el módulo de convocatorias.`
      }
    ];

    const handleSendMessage = async () => {
      if (!messageSubject.trim()) {
        onNotify?.('Por favor ingresa el asunto del mensaje', 'warning');
        return;
      }
      if (!messageBody.trim()) {
        onNotify?.('Por favor escribe el contenido del mensaje', 'warning');
        return;
      }

      setSendingMessage(true);
      try {
        await NotificacionesAPI.enviarMensaje({
          user_id: user.id,
          titulo: messageSubject,
          mensaje: messageBody,
          prioridad: messagePriority,
          tipo: 'sistema',
          entidad_tipo: 'user_message',
          entidad_id: user.id
        });

        onNotify?.(`Mensaje enviado con éxito a ${user.nombre}`, 'success');
        setShowSendMessageModal(false);
        setMessageSubject('');
        setMessageBody('');
        setMessagePriority('normal');
      } catch (err) {
        console.error('Error enviando mensaje:', err);
        try {
          await NotificacionesAPI.crearSistema(user.id, messageSubject, messageBody, messagePriority);
          onNotify?.(`Mensaje enviado con éxito a ${user.nombre}`, 'success');
          setShowSendMessageModal(false);
          setMessageSubject('');
          setMessageBody('');
        } catch (fallbackErr) {
          onNotify?.('Error al enviar mensaje: ' + (fallbackErr.message || err.message), 'error');
        }
      } finally {
        setSendingMessage(false);
      }
    };

    const handleMailTo = () => {
      const subject = encodeURIComponent(messageSubject || 'Comunicación SENNOVA');
      const body = encodeURIComponent(messageBody || `Hola ${user?.nombre || ''},\n\n`);
      window.open(`mailto:${user.email}?subject=${subject}&body=${body}`, '_blank');
    };

    return (
      <Modal
        isOpen={showSendMessageModal}
        onClose={() => setShowSendMessageModal(false)}
        size="lg"
        variant="emerald"
        icon={MessageSquare}
        title="Enviar Mensaje / Notificación"
        subtitle={`Para: ${user?.nombre} (${user?.email})`}
        footer={
          <div className="flex items-center justify-between w-full">
            <button
              type="button"
              onClick={handleMailTo}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
              title="Abrir en tu cliente de correo predeterminado"
            >
              <Mail size={14} className="text-slate-500" />
              <span>Abrir en Correo (mailto)</span>
            </button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowSendMessageModal(false)}>
                Cancelar
              </Button>
              <Button variant="sena" size="sm" onClick={handleSendMessage} disabled={sendingMessage}>
                {sendingMessage ? (
                  <Loader2 size={14} className="animate-spin mr-1.5" />
                ) : (
                  <Send size={14} className="mr-1.5" />
                )}
                Enviar Notificación
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Destinatario resumen */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-indigo-700 text-white font-black flex items-center justify-center text-sm shadow-sm">
                {(user?.nombre || '?').charAt(0)}
              </div>
              <div>
                <p className="text-xs font-black text-slate-800">{user?.nombre}</p>
                <p className="text-[11px] text-slate-500">{user?.email}</p>
              </div>
            </div>
            <Badge variant="indigo" className="text-[10px] font-bold uppercase">{user?.rol}</Badge>
          </div>

          {/* Plantillas rápidas */}
          <div>
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" /> Plantillas Rápidas
            </label>
            <div className="flex flex-wrap gap-1.5">
              {templates.map((tpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setMessageSubject(tpl.title);
                    setMessageBody(tpl.body);
                  }}
                  className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 border border-slate-200 rounded-lg transition-all text-slate-700 font-medium text-left"
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Asunto / Título de la Notificación <span className="text-rose-500">*</span>
              </label>
              <Input
                value={messageSubject}
                onChange={e => setMessageSubject(e.target.value)}
                placeholder="Ej: Recordatorio de cargue de evidencias..."
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nivel de Prioridad
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'normal', label: 'Normal', color: 'border-emerald-300 bg-emerald-50 text-emerald-700' },
                  { id: 'alta', label: 'Alta', color: 'border-amber-300 bg-amber-50 text-amber-800' },
                  { id: 'urgente', label: 'Urgente', color: 'border-rose-300 bg-rose-50 text-rose-700' }
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setMessagePriority(p.id)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                      messagePriority === p.id 
                        ? `${p.color} ring-2 ring-emerald-500 font-black shadow-sm` 
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Mensaje / Contenido <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">{messageBody.length} caracteres</span>
              </div>
              <TextArea
                rows={4}
                value={messageBody}
                onChange={e => setMessageBody(e.target.value)}
                placeholder="Escribe el mensaje o instrucciones para este usuario..."
              />
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  const CvModal = () => {
    if (!showCvModal) return null;
    return (
      <Modal
        isOpen={showCvModal}
        onClose={() => setShowCvModal(false)}
        size="md"
        variant="emerald"
        icon={ExternalLink}
        title="Enlace Perfil CVLaC"
        subtitle="MinCiencias Scienti"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowCvModal(false)}>Cancelar</Button>
            <Button variant="sena" size="sm" onClick={handleSaveCvUrl}>
              <Save size={14} className="mr-2" /> Guardar Enlace
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            Ingrese la URL pública de la hoja de vida en MinCiencias (Scienti / CVLaC).
          </p>
          <Input 
            label="URL CVLaC" 
            type="url" 
            value={cvUrlInput} 
            onChange={e => setCvUrlInput(e.target.value)} 
            placeholder="https://scienti.minciencias.gov.co/cvlac/..." 
            autoFocus
          />
        </div>
      </Modal>
    );
  };

  return (
    <div 
      className="fixed inset-0 overflow-hidden print:static print:block print:overflow-visible"
      style={{ zIndex }}
    >
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity print:hidden animate-fadeIn" onClick={onClose} />
      
      <NestedDetailModal />
      <LinkModal />
      <ResetModal />
      <SendMessageModal />
      <CvModal />

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUploadIdentityDoc} 
        accept="application/pdf,image/*" 
        className="hidden" 
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10 print:static print:block print:w-full print:pl-0">
        <div className="w-screen max-w-3xl h-full bg-white shadow-2xl flex flex-col transform transition-transform duration-500 print:w-full print:max-w-none print:shadow-none print:transform-none print:static animate-slideInRight">
          
          {/* Header */}
          <div className="px-8 py-6 border-b border-slate-100 bg-white">
            <div className="flex items-start justify-between gap-4">
              
              {/* Usuario Info */}
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-indigo-700 text-white rounded-3xl flex items-center justify-center font-black text-2xl shadow-xl shadow-emerald-500/20 ring-4 ring-emerald-50 shrink-0">
                  {(user?.nombre || '?').charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">{user.nombre}</h2>
                    <Badge variant={user.is_active !== false ? "success" : "default"} className="font-black text-[9px] uppercase tracking-wider px-2.5 py-0.5">
                      {user.is_active !== false ? 'Verificado' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="text-slate-500 font-medium text-xs flex items-center gap-2 mt-1 flex-wrap">
                    <button 
                      type="button"
                      onClick={copyEmailToClipboard}
                      className="inline-flex items-center gap-1 hover:text-emerald-700 text-slate-600 transition-colors group"
                      title="Haz clic para copiar correo"
                    >
                      <Mail size={13} className="text-slate-400 group-hover:text-emerald-600" />
                      <span className="truncate max-w-[200px]">{user.email}</span>
                      {copiedEmail ? (
                        <Check size={12} className="text-emerald-600 animate-bounce ml-0.5" />
                      ) : (
                        <Copy size={11} className="text-slate-300 group-hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                      )}
                    </button>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 uppercase font-bold text-slate-600">
                      <Shield size={13} className="text-slate-400" />
                      {user.rol}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción claros y accesibles en la cabecera */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Botón Enviar Mensaje */}
                <button
                  type="button"
                  onClick={() => setShowSendMessageModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl font-bold text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  title="Enviar Mensaje o Notificación directa"
                >
                  <MessageSquare size={15} className="text-emerald-600 shrink-0" />
                  <span className="hidden sm:inline">Mensaje</span>
                </button>

                {/* Botón Cambiar Clave */}
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-xl font-bold text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                  title="Cambiar o Resetear Contraseña"
                >
                  <Key size={15} className="text-amber-600 shrink-0" />
                  <span className="hidden sm:inline">Cambiar Clave</span>
                </button>

                {/* Botón Editar Datos */}
                <button
                  type="button"
                  onClick={() => { setEditData({ ...user }); setEditMode(!editMode); }}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl font-bold text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
                    editMode 
                      ? 'bg-indigo-600 text-white border-indigo-600' 
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                  title={editMode ? "Volver a vista del perfil" : "Editar información del usuario"}
                >
                  <Edit3 size={15} className={editMode ? "text-white shrink-0" : "text-slate-600 shrink-0"} />
                  <span className="hidden sm:inline">{editMode ? 'Ver Perfil' : 'Editar'}</span>
                </button>

                {/* Botón Cerrar */}
                <button 
                  type="button"
                  onClick={onClose} 
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors ml-1 border border-transparent hover:border-slate-200"
                  title="Cerrar panel"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            {/* Tabs */}
            <ScrollableTabs
              tabs={[
                { id: 'overview', label: 'Resumen 360', icon: TrendingUp },
                { id: 'projects', label: 'Proyectos', icon: Briefcase, count: stats?.proyectos_count },
                { id: 'production', label: 'Producción', icon: Package, count: stats?.productos_count },
                { id: 'docs', label: 'Documentos', icon: FileText }
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              variant="emerald"
              size="md"
              className="mt-6 border-b border-slate-100 print:hidden bg-transparent"
              ariaLabel="Secciones del perfil de usuario"
            />
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-8 scrollbar-thin bg-white">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
                <Loader2 size={40} className="animate-spin text-emerald-600" />
                <p className="text-slate-500 font-bold text-sm">Calculando impacto 360° desde base de datos...</p>
              </div>
            ) : editMode ? (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input label="Nombre Completo" value={editData.nombre || ''} onChange={e => setEditData({...editData, nombre: e.target.value})} />
                  <Input label="Correo Electrónico" value={editData.email || ''} disabled className="bg-slate-50" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input label="Sede" value={editData.sede || ''} onChange={e => setEditData({...editData, sede: e.target.value})} />
                  <Input label="Regional" value={editData.regional || ''} onChange={e => setEditData({...editData, regional: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input label="Rol SENNOVA" value={editData.rol_sennova || ''} onChange={e => setEditData({...editData, rol_sennova: e.target.value})} />
                  <Input label="Nivel Académico" value={editData.nivel_academico || ''} onChange={e => setEditData({...editData, nivel_academico: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input label="Número de Ficha" value={editData.ficha || ''} onChange={e => setEditData({...editData, ficha: e.target.value})} />
                  <Input label="Programa de Formación" value={editData.programa_formacion || ''} onChange={e => setEditData({...editData, programa_formacion: e.target.value})} />
                </div>
                <Input label="URL CVLaC" value={editData.cv_lac_url || ''} onChange={e => setEditData({...editData, cv_lac_url: e.target.value})} />
                
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                  <Button variant="outline" onClick={() => setEditMode(false)}>Cancelar</Button>
                  <Button variant="sena" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 size={16} className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
                    Guardar Cambios
                  </Button>
                </div>
              </div>
            ) : (
              <>
            {activeTab === 'overview' && stats && (
              <div className="space-y-8 animate-fadeIn">
                <section>
                  <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Estado del Investigador / Aprendiz</h3>
                  <div className="p-5 bg-gradient-to-r from-emerald-50/90 to-indigo-50/70 rounded-2xl border border-emerald-200 text-slate-800 leading-relaxed italic text-sm font-semibold shadow-sm">
                    "{stats?.resumen_perfil}"
                  </div>
                </section>
                
                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Proyectos', val: stats?.proyectos_count, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
                    { label: 'Productos', val: stats?.productos_count, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                    { label: 'Semilleros', val: stats?.semilleros_count, color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
                    { label: 'Cumplimiento', val: `${stats?.cumplimiento}%`, color: 'text-amber-800', bg: 'bg-amber-50 border-amber-200' },
                  ].map((kpi, i) => (
                    <div key={i} className={`p-5 rounded-3xl ${kpi.bg} border hover:border-slate-300 transition-all text-center shadow-sm`}>
                      <p className="text-[10px] font-black uppercase text-slate-700 mb-1">{kpi.label}</p>
                      <p className={`text-3xl font-black ${kpi.color}`}>{kpi.val}</p>
                    </div>
                  ))}
                </div>

                {/* Gráficos de Perfil y Presupuesto */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-6 border border-slate-200 rounded-3xl shadow-sm bg-white">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <PieChart size={16} className="text-emerald-600" /> Perfil de Actividad
                    </h4>
                    {stats?.distribucion_perfil?.some(d => (d.value || 0) > 0) ? (
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="h-44 w-44 shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <RePie>
                              <Pie 
                                data={stats.distribucion_perfil.filter(d => (d.value || 0) > 0)} 
                                innerRadius={45} 
                                outerRadius={70} 
                                paddingAngle={6} 
                                dataKey="value"
                              >
                                {stats.distribucion_perfil.filter(d => (d.value || 0) > 0).map((entry, index) => (
                                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </RePie>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex-1 space-y-2 text-xs">
                          {stats.distribucion_perfil.filter(d => (d.value || 0) > 0).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                              <span className="flex items-center gap-2 font-bold text-slate-800">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                                {item.name}
                              </span>
                              <span className="font-black text-slate-900">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="h-48 flex flex-col items-center justify-center text-center p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                          <PieChart size={20} />
                        </div>
                        <p className="text-xs font-bold text-slate-700">Sin actividades registradas</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-medium">El usuario aún no tiene proyectos, productos ni semilleros vinculados</p>
                      </div>
                    )}
                  </Card>
                  
                  <Card className="p-6 border border-slate-200 rounded-3xl shadow-sm bg-white">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <BarChart3 size={16} className="text-blue-600" /> Ejecución Presupuestal
                    </h4>
                    <div className="space-y-4 pt-2">
                      <div>
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-slate-700 font-semibold">Ejecutado ({stats?.porcentaje_ejecucion ?? 0}%)</span>
                          <span className="font-bold text-slate-900">
                            {formatCurrency(stats?.presupuesto_ejecutado)} <span className="text-slate-500 font-semibold">/ {formatCurrency(stats?.presupuesto_total)}</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                          <div 
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full transition-all duration-700 rounded-full" 
                            style={{ width: `${Math.min(100, Math.max(0, stats?.porcentaje_ejecucion ?? 0))}%` }}
                          />
                        </div>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-slate-700 font-semibold">Saldo por Ejecutar:</span>
                        <span className="font-black text-indigo-800">
                          {formatCurrency(Math.max(0, (stats?.presupuesto_total || 0) - (stats?.presupuesto_ejecutado || 0)))}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 mt-1 font-medium">Relación calculada de forma dinámica con los hitos y proyectos asociados en la base de datos.</p>
                    </div>
                  </Card>
                </div>

                {/* Ficha Técnica / Datos Institucionales */}
                <Card className="p-6 border border-slate-200 rounded-3xl shadow-sm bg-white">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Shield size={16} className="text-indigo-600" /> Ficha Técnica Institucional
                    </h4>
                    <button
                      type="button"
                      onClick={() => { setEditData({ ...user }); setEditMode(true); }}
                      className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 hover:underline"
                    >
                      <Edit3 size={13} /> Modificar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1.5 mb-1">
                        <Building2 size={12} className="text-slate-500" /> Sede
                      </span>
                      <p className="font-black text-slate-900 text-sm">{user.sede || 'No especificada'}</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1.5 mb-1">
                        <MapPin size={12} className="text-slate-500" /> Regional
                      </span>
                      <p className="font-black text-slate-900 text-sm">{user.regional || 'Santander'}</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1.5 mb-1">
                        <Shield size={12} className="text-slate-500" /> Rol SENNOVA
                      </span>
                      <p className="font-black text-emerald-800 text-sm uppercase">{user.rol_sennova || user.rol || 'Investigador'}</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1.5 mb-1">
                        <GraduationCap size={12} className="text-slate-500" /> Nivel Académico
                      </span>
                      <p className="font-black text-slate-900 text-sm">{user.nivel_academico || 'Profesional / Especialista'}</p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1.5 mb-1">
                        <BookMarked size={12} className="text-slate-500" /> Programa / Ficha
                      </span>
                      <p className="font-black text-slate-900 text-sm">
                        {user.programa_formacion || (user.ficha ? `Ficha ${user.ficha}` : 'SENNOVA Staff')}
                      </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <span className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1.5 mb-1">
                        <ExternalLink size={12} className="text-slate-500" /> Plataforma CVLaC
                      </span>
                      {user.cv_lac_url ? (
                        <a 
                          href={user.cv_lac_url} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="font-bold text-emerald-700 hover:underline inline-flex items-center gap-1 truncate text-sm"
                        >
                          Ver Perfil <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No vinculada</span>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {activeTab === 'projects' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-slate-800">Proyectos Vinculados ({stats?.proyectos_lista?.length || 0})</h3>
                  <Button variant="outline" size="sm" onClick={() => handleOpenLink('proyecto')}>
                    <Plus size={14} className="mr-2" /> Vincular Proyecto
                  </Button>
                </div>
                {stats?.proyectos_lista?.length > 0 ? (
                  <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Proyecto</th>
                          <th className="px-4 py-3">Presupuesto</th>
                          <th className="px-4 py-3">Ejecutado</th>
                          <th className="px-4 py-3">Avance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {stats.proyectos_lista.map(p => (
                          <tr key={p.id} className="hover:bg-emerald-50/40 cursor-pointer transition-colors group" onClick={() => setNestedDetail({ type: 'proyecto', data: p })}>
                            <td className="px-4 py-3 font-bold text-slate-900 group-hover:text-emerald-700">
                              {p.nombre}
                              <p className="text-[10px] text-slate-500 font-normal">{p.rol}</p>
                            </td>
                            <td className="px-4 py-3 tabular-nums font-medium text-slate-600">{formatCurrency(p.presupuesto)}</td>
                            <td className="px-4 py-3 tabular-nums font-black text-emerald-600">{formatCurrency(p.ejecutado)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-slate-100 h-1.5 rounded-full min-w-[60px]">
                                  <div className="bg-emerald-500 h-full rounded-full shadow-sm shadow-emerald-200" style={{width: `${p.progreso}%`}}></div>
                                </div>
                                <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <Briefcase size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-700">Sin proyectos vinculados</p>
                    <p className="text-xs text-slate-400 mt-1">Utilice el botón superior para asociar proyectos de investigación.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'production' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-slate-800">Producción Técnica y Académica ({stats?.productos_lista?.length || 0})</h3>
                </div>
                {stats?.productos_lista?.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {stats.productos_lista.map(prod => (
                      <div key={prod.id} className="p-4 border border-slate-100 rounded-2xl flex items-center justify-between hover:border-blue-300 hover:bg-blue-50/40 cursor-pointer transition-all group shadow-sm bg-white" onClick={() => setNestedDetail({ type: 'producto', data: prod })}>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Package size={20} />
                          </div>
                          <div>
                            <p className="font-black text-slate-900 group-hover:text-blue-700 transition-colors text-sm">{prod.nombre}</p>
                            <p className="text-xs text-slate-500">{prod.tipo} • {prod.fecha || 'Sin fecha'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="indigo" className="text-[9px]">{prod.estado_registro}</Badge>
                          <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                    <Package size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-700">Sin productos registrados</p>
                    <p className="text-xs text-slate-400 mt-1">Este usuario aún no tiene entregables o productos reportados en la BD.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="space-y-8 animate-fadeIn">
                <h3 className="text-lg font-black text-slate-800">Expediente y Semilleros</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card CVLaC */}
                  <Card className="p-5 flex flex-col justify-between border-slate-100 hover:shadow-md transition-all rounded-3xl group bg-white">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                        <ExternalLink size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-black text-slate-900 text-sm">Plataforma CVLaC</p>
                          {user.cv_lac_url ? (
                            <Badge variant="success" className="text-[9px] font-black">Registrado</Badge>
                          ) : (
                            <Badge variant="warning" className="text-[9px] font-black">Pendiente</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Hoja de vida MinCiencias</p>
                        {user.cv_lac_url ? (
                          <p className="text-[10px] text-emerald-600 truncate mt-2 font-mono">{user.cv_lac_url}</p>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic mt-2">Sin URL vinculada</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                      {user.cv_lac_url && (
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => window.open(user.cv_lac_url, '_blank')}>
                          <Eye size={14} className="mr-1.5" /> Abrir CVLaC
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" className="flex-1 text-xs" onClick={() => setShowCvModal(true)}>
                        <Edit3 size={14} className="mr-1.5" /> {user.cv_lac_url ? 'Editar' : 'Vincular'}
                      </Button>
                    </div>
                  </Card>

                  {/* Card Soporte Identidad */}
                  <Card className="p-5 flex flex-col justify-between border-slate-100 hover:shadow-md transition-all rounded-3xl group bg-white">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center shrink-0">
                        <FileText size={24} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-black text-slate-900 text-sm">Soporte de Identidad</p>
                          {identityDoc ? (
                            <Badge variant="success" className="text-[9px] font-black">Cargado</Badge>
                          ) : (
                            <Badge variant="default" className="text-[9px] font-black">Sin Archivo</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Documento de identidad (PDF)</p>
                        {identityDoc ? (
                          <p className="text-[10px] text-rose-600 truncate mt-2 font-mono">{identityDoc.nombre_archivo}</p>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic mt-2">Sin soporte digital</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                      {identityDoc ? (
                        <>
                          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => window.open(DocumentosAPI.getViewUrl(identityDoc.id), '_blank')}>
                            <Eye size={14} className="mr-1.5" /> Ver PDF
                          </Button>
                          <Button variant="secondary" size="sm" className="flex-1 text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc}>
                            <RefreshCw size={14} className={`mr-1.5 ${uploadingDoc ? 'animate-spin' : ''}`} /> Actualizar
                          </Button>
                        </>
                      ) : (
                        <Button variant="sena" size="sm" className="w-full text-xs" onClick={() => fileInputRef.current?.click()} disabled={uploadingDoc}>
                          {uploadingDoc ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <UploadCloud size={14} className="mr-1.5" />}
                          Subir Soporte (PDF)
                        </Button>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Semilleros Vinculados */}
                <div className="space-y-4 pt-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <BookOpen size={15} className="text-indigo-500" /> Semilleros Vinculados ({stats?.semilleros_lista?.length || 0})
                    </h4>
                    <Button variant="outline" size="sm" onClick={() => handleOpenLink('semillero')}>
                      <Plus size={14} className="mr-2" /> Vincular Semillero
                    </Button>
                  </div>
                  
                  {stats?.semilleros_lista?.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {stats.semilleros_lista.map((sem, i) => (
                        <div key={i} className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/20 cursor-pointer transition-all group shadow-sm" onClick={() => setNestedDetail({ type: 'semillero', data: sem })}>
                          <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs group-hover:scale-110 transition-transform">
                              {i+1}
                            </div>
                            <div>
                              <span className="text-sm font-black text-slate-800 group-hover:text-indigo-700">{sem.nombre}</span>
                              <p className="text-[10px] text-slate-400 font-medium">Línea: {sem.lineas?.[0] || 'General'}</p>
                            </div>
                          </div>
                          <div className="flex gap-3 items-center">
                            <Badge variant="indigo" className="font-bold text-[10px]">{sem.estudiantes} Aprendices</Badge>
                            <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                      <GraduationCap size={36} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-sm font-bold text-slate-700">Sin semilleros vinculados</p>
                      <p className="text-xs text-slate-400 mt-1">Haga clic en "+ Vincular Semillero" para asignar este usuario a un semillero.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

          {/* Footer */}
          <div className="p-6 border-t border-slate-100 bg-slate-50/80 flex flex-wrap justify-between items-center gap-3 print:hidden rounded-b-3xl">
             <div className="flex flex-wrap gap-2">
               <Button variant="outline" size="sm" onClick={() => window.print()} className="rounded-xl">
                 <Download size={15} className="mr-2" /> Imprimir
               </Button>
               <Button 
                variant="sena" 
                size="sm" 
                className="rounded-xl shadow-md shadow-emerald-500/20"
                onClick={async () => {
                  try {
                    await ReportesAPI.descargarCertificadoInvestigador(user.id);
                    onNotify?.('Certificado generado correctamente', 'success');
                  } catch (err) {
                    onNotify?.('Error generando certificado: ' + err.message, 'error');
                  }
                }}
               >
                 <Award size={15} className="mr-2" /> Certificado
               </Button>
               <Button variant="outline" size="sm" className="rounded-xl" onClick={() => { setEditData({ ...user }); setEditMode(true); }}>
                 <Edit3 size={15} className="mr-2" /> Editar Datos
               </Button>
              </div>
              <Button variant="primary" className="rounded-xl px-6 bg-slate-900 hover:bg-black text-white shadow-lg" onClick={onClose}>
                Cerrar Panel
              </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default UserInsightPanel;
