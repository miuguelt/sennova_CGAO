import React, { useState, useEffect } from 'react';
import { 
  Book, Plus, Search, Filter, Clock, User, 
  Trash2, Edit2, ChevronRight, Save, X,
  FileText, MessageSquare, AlertCircle, CheckCircle2,
  MoreVertical, Calendar, Loader2, Zap, Image as ImageIcon,
  Paperclip, ExternalLink, PlayCircle, ShieldCheck, Lock
} from 'lucide-react';
import { BitacoraAPI } from '../../api/bitacora';
import { ProyectosAPI } from '../../api/proyectos';
import UserInsightPanel from '../users/UserInsightPanel';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Select from '../ui/Select';

const CATEGORIAS = [
  { value: 'técnica',     label: 'Observación Técnica', color: 'text-blue-600',    bg: 'bg-blue-50' },
  { value: 'administrativa', label: 'Gestión Administrativa', color: 'text-amber-600', bg: 'bg-amber-50' },
  { value: 'resultado',   label: 'Resultado / Hallazgo', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { value: 'incidencia',  label: 'Incidencia / Problema', color: 'text-rose-600',    bg: 'bg-rose-50' },
];

const getCat = (v) => CATEGORIAS.find(c => c.value === v) || CATEGORIAS[0];
const selectValue = (eventOrValue) => eventOrValue?.target ? eventOrValue.target.value : eventOrValue;

const BitacoraModule = ({ currentUser, onNotify, initialAction, onActionHandled }) => {
  const [proyectos, setProyectos] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ titulo: '', contenido: '', categoria: 'técnica', adjuntos: [] });
  const [mediaUrl, setMediaUrl] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showInsight, setShowInsight] = useState(false);

  useEffect(() => {
    loadProyectos();
  }, []);

  useEffect(() => {
    if (initialAction?.form === 'create') {
      setShowForm(true);
      setIsEditing(false);
      onActionHandled?.();
    }
  }, [initialAction, onActionHandled]);

  useEffect(() => {
    if (selectedProjectId) loadEntries();
    else setEntries([]);
  }, [selectedProjectId]);

  const loadProyectos = async () => {
    try {
      const data = await ProyectosAPI.list();
      setProyectos(data || []);
      if (data?.length > 0) setSelectedProjectId(data[0].id);
    } catch (err) {
      onNotify?.('Error al cargar proyectos', 'error');
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await BitacoraAPI.listarPorProyecto(selectedProjectId);
      setEntries(data || []);
    } catch (err) {
      onNotify?.('Error al cargar bitácora', 'error');
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!selectedProjectId) {
      onNotify?.('Selecciona o crea un proyecto antes de registrar una bitácora', 'warning');
      return;
    }

    if (!formData.titulo || !formData.contenido) {
      onNotify?.('Por favor completa todos los campos', 'warning');
      return;
    }
    try {
      if (isEditing) {
        await BitacoraAPI.update(formData.id, formData);
        onNotify?.('Entrada actualizada', 'success');
      } else {
        await BitacoraAPI.crear({ ...formData, proyecto_id: selectedProjectId });
        onNotify?.('Nueva entrada registrada', 'success');
      }
      setShowForm(false);
      setFormData({ titulo: '', contenido: '', categoria: 'técnica', adjuntos: [] });
      setMediaUrl('');
      setIsEditing(false);
      loadEntries();
    } catch (err) {
      onNotify?.('Error al guardar: ' + err.message, 'error');
    }
  };

  const handleEdit = (entry) => {
    setFormData(entry);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta entrada de forma permanente?')) return;
    try {
      await BitacoraAPI.delete(id);
      onNotify?.('Entrada eliminada', 'success');
      loadEntries();
    } catch (err) {
      onNotify?.('Error al eliminar', 'error');
    }
  };

  const handleSign = async (entryId) => {
    try {
      await BitacoraAPI.sign(entryId);
      onNotify?.('Entrada firmada digitalmente con éxito', 'success');
      loadEntries();
    } catch (err) {
      onNotify?.('Error al firmar: ' + (err.response?.data?.detail || err.message), 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
            <Book size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Bitácora de Investigación</h1>
            <p className="text-sm text-slate-500 font-medium">Registro técnico y diario de campo digital con soporte multimedia</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => { setShowForm(true); setIsEditing(false); setFormData({ titulo: '', contenido: '', categoria: 'técnica', adjuntos: [] }); }}
            variant="sena"
            disabled={!selectedProjectId}
            title={!selectedProjectId ? 'Crea o selecciona un proyecto primero' : undefined}
          >
            <Plus size={18} className="mr-2" /> Nueva Entrada
          </Button>
          <Button
            onClick={async () => {
              try {
                setLoading(true);
                const { PlantillasAPI } = await import('../../api/plantillas');
                const { PDFGenerator } = await import('../../utils/pdfGenerator');
                const data = await PlantillasAPI.getBitacoraOficial(selectedProjectId);
                PDFGenerator.generateBitacoraReport(data);
                onNotify?.('Reporte de bitácora generado', 'success');
              } catch (err) {
                onNotify?.('Error al exportar: ' + err.message, 'error');
              } finally {
                setLoading(false);
              }
            }}
            variant="outline"
            disabled={!selectedProjectId || entries.length === 0}
            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
          >
            <FileText size={18} className="mr-2" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* ── Project Selector ── */}
      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row items-center gap-4">
        <label className="text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Proyecto Seleccionado:</label>
        <select 
          className="flex-1 w-full px-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
        >
          {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre_corto || p.nombre}</option>)}
        </select>
        <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-100">{(entries || []).length} Entradas</Badge>
      </div>

      {/* ── Entries List ── */}
      <div className="grid grid-cols-1 gap-6 relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-slate-100 hidden md:block" />
        
        {loading ? (
          <div className="py-20 text-center">
            <Loader2 size={40} className="animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-500 font-bold italic">Consultando archivos de bitácora...</p>
          </div>
        ) : (entries || []).length > 0 ? (
          (entries || []).map(entry => {
            const cat = getCat(entry.categoria);
            return (
              <div key={entry.id} className="relative md:pl-20 animate-slideIn">
                {/* Timeline Dot */}
                <div className="absolute left-[26px] top-6 w-3 h-3 rounded-full bg-white border-4 border-indigo-500 shadow-sm hidden md:block z-10" />
                
                <Card className="p-0 overflow-hidden border-0 ring-1 ring-slate-100 hover:ring-indigo-300 hover:shadow-xl transition-all group bg-white">
                  <div className="p-5 md:p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={`${cat.bg} ${cat.color} text-[9px] font-black uppercase tracking-widest border-0`}>
                            {cat.label}
                          </Badge>
                          <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                            <Calendar size={12} /> {new Date(entry.fecha || entry.created_at).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                          </span>
                        </div>
                        <h3 className="text-lg font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{entry.titulo}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Botón de Firma Condicional */}
                        {((currentUser.rol !== 'aprendiz' && !entry.is_firmado_investigador) || 
                          (currentUser.rol === 'aprendiz' && !entry.is_firmado_aprendiz)) && (
                          <button 
                            onClick={() => handleSign(entry.id)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-200 group/sign"
                            title="Generar Firma Digital SENNOVA"
                          >
                            <ShieldCheck size={14} className="group-hover/sign:scale-110 transition-all" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Firmar Registro</span>
                          </button>
                        )}
                        
                        {!entry.is_firmado_investigador && !entry.is_firmado_aprendiz && (
                          <>
                            <button 
                              onClick={() => handleEdit(entry)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDelete(entry.id)}
                              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        )}

                        {(entry.is_firmado_investigador || entry.is_firmado_aprendiz) && (
                          <div className="flex items-center gap-1 p-2 bg-slate-50 text-slate-400 rounded-xl border border-slate-100" title="Registro Protegido">
                            <Lock size={14} />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="prose prose-slate max-w-none mb-6">
                      <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                        {entry.contenido}
                      </p>
                    </div>

                    {/* Status de Firma Dual */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${entry.is_firmado_investigador ? 'bg-emerald-50/30 border-emerald-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${entry.is_firmado_investigador ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-slate-200 text-slate-400'}`}>
                            <ShieldCheck size={16} />
                          </div>
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-tighter ${entry.is_firmado_investigador ? 'text-emerald-700' : 'text-slate-500'}`}>Investigador / Instructor</p>
                            <p className="text-[9px] font-medium text-slate-400">
                              {entry.is_firmado_investigador ? `Firmado: ${new Date(entry.fecha_firma_investigador).toLocaleDateString()}` : 'Pendiente de firma'}
                            </p>
                          </div>
                        </div>
                        {entry.is_firmado_investigador && <CheckCircle2 size={14} className="text-emerald-500" />}
                      </div>

                      <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${entry.is_firmado_aprendiz ? 'bg-indigo-50/30 border-indigo-100' : 'bg-slate-50 border-slate-100 opacity-60'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${entry.is_firmado_aprendiz ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200' : 'bg-slate-200 text-slate-400'}`}>
                            <User size={16} />
                          </div>
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-tighter ${entry.is_firmado_aprendiz ? 'text-indigo-700' : 'text-slate-500'}`}>Talento / Aprendiz</p>
                            <p className="text-[9px] font-medium text-slate-400">
                              {entry.is_firmado_aprendiz ? `Firmado: ${new Date(entry.fecha_firma_aprendiz).toLocaleDateString()}` : 'Pendiente de firma'}
                            </p>
                          </div>
                        </div>
                        {entry.is_firmado_aprendiz && <CheckCircle2 size={14} className="text-indigo-500" />}
                      </div>
                    </div>

                    {/* Multimedia Gallery */}
                    {entry.adjuntos && entry.adjuntos.length > 0 && (
                      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                        {entry.adjuntos.map((adj, idx) => {
                          const url = typeof adj === 'string' ? adj : adj.url;
                          const tipo = typeof adj === 'string' ? '' : adj.tipo;
                          const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) || tipo?.startsWith('image/');
                          
                          return (
                            <a 
                              key={idx} 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="group/media relative aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 block"
                            >
                              {isImage ? (
                                <img src={url} alt="Evidencia" className="w-full h-full object-cover group-hover/media:scale-110 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                                  <FileText size={24} className="text-slate-400" />
                                  <span className="text-[10px] font-black text-slate-500 uppercase truncate w-full text-center">{typeof adj === 'string' ? 'Ver Adjunto' : adj.nombre}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                                <ExternalLink size={20} className="text-white" />
                              </div>
                            </a>
                          );
                        })}
                      </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                      <div 
                        className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 p-1 rounded-lg transition-colors"
                        onClick={() => { setSelectedUser({ id: entry.usuario_id, nombre: entry.user_nombre }); setShowInsight(true); }}
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                          {(entry.user_nombre || '?').charAt(0)}
                        </div>
                        <span className="text-[11px] font-bold text-slate-500">
                          Registrado por <span className="text-slate-900">{entry.user_nombre}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <Clock size={12} />
                        <span className="text-[10px] font-bold tabular-nums">
                          {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })
        ) : (
          <div className="py-20 text-center bg-white/50 rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Book size={32} className="text-slate-300" />
            </div>
            <h3 className="text-slate-900 font-bold">Bitácora Vacía</h3>
            <p className="text-slate-500 text-sm mt-1">Comienza a registrar tus hallazgos técnicos para este proyecto.</p>
          </div>
        )}
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <Card className="w-full max-w-2xl shadow-2xl animate-scaleIn overflow-hidden border-0">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-6 text-white relative">
              <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"><X size={20} /></button>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><Book size={24} /></div>
                <div>
                  <h2 className="text-xl font-black">{isEditing ? 'Editar Entrada' : 'Nueva Entrada de Bitácora'}</h2>
                  <p className="text-indigo-100 text-xs font-medium uppercase tracking-widest mt-1">Registrando conocimiento técnico</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-white space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="Título de la entrada" 
                  placeholder="Ej: Prueba de laboratorio #1..." 
                  value={formData.titulo} 
                  onChange={(e) => setFormData({...formData, titulo: e.target.value})} 
                  required 
                />
                <Select 
                  label="Categoría" 
                  options={CATEGORIAS}
                  value={formData.categoria}
                  onChange={(val) => setFormData({...formData, categoria: selectValue(val)})}
                />
              </div>
              <TextArea 
                label="Contenido técnico / Observaciones" 
                placeholder="Escribe aquí los detalles de la actividad, hallazgos o problemas encontrados..." 
                value={formData.contenido} 
                onChange={(e) => setFormData({...formData, contenido: e.target.value})} 
                rows={10} 
                required
              />

              {/* Multimedia Upload Support */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Paperclip size={14} className="text-indigo-500" /> Evidencias Multimedia (URLs)
                </h3>
                  <Input 
                    type="file"
                    className="flex-1"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file || !formData.id && !isEditing) {
                        if (!isEditing) onNotify?.('Guarda la entrada primero para subir adjuntos', 'info');
                        return;
                      }
                      
                      try {
                        const fd = new FormData();
                        fd.append('file', file);
                        const updatedEntry = await BitacoraAPI.uploadAdjunto(formData.id, fd);
                        setFormData(updatedEntry);
                        onNotify?.('Archivo subido con éxito', 'success');
                        loadEntries();
                      } catch (err) {
                        onNotify?.('Error al subir: ' + err.message, 'error');
                      }
                    }}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic">* Los adjuntos se vinculan automáticamente al seleccionar el archivo (solo en edición).</p>
                </div>
                
                {formData.adjuntos?.length > 0 && (
                  <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    {formData.adjuntos.map((adj, idx) => {
                      const isImage = adj.tipo?.startsWith('image/');
                      return (
                        <div key={idx} className="relative group aspect-video rounded-xl overflow-hidden border border-slate-200 bg-white">
                          {isImage ? (
                            <img src={adj.url} alt={adj.nombre} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center p-2">
                              <FileText size={24} className="text-slate-300 mb-1" />
                              <p className="text-[8px] font-bold text-slate-500 truncate w-full text-center">{adj.nombre}</p>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <a href={adj.url} target="_blank" rel="noreferrer" className="p-1.5 bg-white rounded-lg text-slate-900"><ExternalLink size={14} /></a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleSubmit}>
                {isEditing ? 'Actualizar Registro' : 'Guardar en Bitácora'}
              </Button>
            </div>
          </Card>
        </div>
      )}
      <UserInsightPanel
        user={selectedUser}
        isOpen={showInsight}
        onClose={() => setShowInsight(false)}
        onNotify={onNotify}
      />
    </div>
  );
};

export default BitacoraModule;
