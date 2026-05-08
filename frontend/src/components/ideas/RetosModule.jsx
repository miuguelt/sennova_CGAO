import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Lightbulb, Target, Briefcase, Building, 
  ChevronRight, Loader2, X, Edit2, Trash2, Filter,
  Mail, MessageSquare, Clock, AlertCircle, Info,
  ExternalLink, Building2, Globe, Laptop, Zap, Users
} from 'lucide-react';
import { RetosAPI } from '../../api/retos';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Select from '../ui/Select';
import { SemillerosAPI } from '../../api/semilleros';

const SECTORES = [
  { value: 'Agroindustria', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { value: 'Tecnología', icon: Laptop, color: 'text-blue-600', bg: 'bg-blue-50' },
  { value: 'Servicios', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { value: 'Comercio', icon: Globe, color: 'text-rose-600', bg: 'bg-rose-50' },
  { value: 'Otro', icon: Briefcase, color: 'text-slate-600', bg: 'bg-slate-50' },
];

const ESTADOS = [
  { value: 'abierto', label: 'Abierto', variant: 'success' },
  { value: 'en_estudio', label: 'En Estudio', variant: 'warning' },
  { value: 'asignado', label: 'Asignado', variant: 'indigo' },
  { value: 'resuelto', label: 'Resuelto', variant: 'default' },
];

const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  sector_productivo: 'Agroindustria',
  empresa_solicitante: '',
  contacto_email: '',
  estado: 'abierto', 
  prioridad: 'media',
  semillero_asignado_id: ''
};

const RetosModule = ({ currentUser, onNotify, onModuleAction }) => {
  const [retos, setRetos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedReto, setSelectedReto] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [semilleros, setSemilleros] = useState([]);
  const [dragOverId, setDragOverId] = useState(null);

  useEffect(() => { 
    loadRetos(); 
    loadSemilleros();
  }, []);

  const loadSemilleros = async () => {
    try {
      const data = await SemillerosAPI.list();
      setSemilleros(data || []);
    } catch (err) {
      console.error('Error loading semilleros', err);
    }
  };

  const loadRetos = async () => {
    setLoading(true);
    try {
      const data = await RetosAPI.list();
      setRetos(data || []);
    } catch (err) {
      onNotify('Error cargando el banco de retos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleOpenEdit = (reto, e) => {
    if (e) e.stopPropagation();
    setFormData({ ...reto });
    setIsEditing(true);
    setShowModal(true);
    setIsDetailOpen(false);
  };

  const handleSubmit = async () => {
    try {
      if (isEditing) {
        await RetosAPI.update(formData.id, formData);
        onNotify('Reto actualizado correctamente', 'success');
      } else {
        await RetosAPI.create(formData);
        onNotify('Reto publicado exitosamente', 'success');
      }
      setShowModal(false);
      loadRetos();
    } catch (err) {
      onNotify(err.message || 'Error al procesar el reto', 'error');
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('¿Estás seguro de eliminar este reto del banco?')) return;
    try {
      await RetosAPI.delete(id);
      onNotify('Reto eliminado del sistema', 'success');
      setIsDetailOpen(false);
      loadRetos();
    } catch (err) {
      onNotify('Error al eliminar el reto', 'error');
    }
  };

  const handleDropSemillero = async (e, reto) => {
    e.preventDefault();
    setDragOverId(null);
    const semilleroId = e.dataTransfer.getData('semilleroId');
    if (!semilleroId) return;

    try {
      await RetosAPI.update(reto.id, { 
        ...reto, 
        semillero_asignado_id: semilleroId,
        estado: 'asignado' 
      });
      onNotify('Semillero asignado al reto correctamente', 'success');
      loadRetos();
    } catch (err) {
      onNotify('Error al asignar semillero', 'error');
    }
  };

  const filteredRetos = retos.filter(r => {
    const matchesSearch = r.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.empresa_solicitante?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector = !sectorFilter || r.sector_productivo === sectorFilter;
    const matchesEstado = !estadoFilter || r.estado === estadoFilter;
    return matchesSearch && matchesSector && matchesEstado;
  });

  const getSectorIcon = (sector) => {
    const s = SECTORES.find(x => x.value === sector) || SECTORES[4];
    return s;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-10 print:hidden">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 text-amber-600 mb-1">
            <Zap size={16} fill="currentColor" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Semillero de Oportunidades</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Banco de Retos</h1>
          <p className="text-sm text-slate-500 max-w-xl">Identificación de necesidades del sector productivo para transformarlas en proyectos de investigación e innovación.</p>
        </div>
        <Button onClick={handleOpenCreate} variant="primary" className="bg-amber-600 hover:bg-amber-700 h-11 px-6 shadow-lg shadow-amber-200/50 border-0">
          <Plus size={18} className="mr-2" /> Publicar Reto
        </Button>
      </div>

      {/* ── Filtros y Pool ── */}
      <div className="flex flex-col gap-4">
        <Card variant="ghost" className="p-2 flex flex-col lg:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar por título, empresa o palabras clave..." 
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <select 
              className="flex-1 lg:w-48 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500"
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
            >
              <option value="">Todos los Sectores</option>
              {SECTORES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
            </select>
            <select 
              className="flex-1 lg:w-40 px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500"
              value={estadoFilter}
              onChange={e => setEstadoFilter(e.target.value)}
            >
              <option value="">Cualquier Estado</option>
              {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
            <Badge variant="amber" className="hidden lg:flex h-10 px-4 items-center font-bold">{filteredRetos.length} Retos</Badge>
          </div>
        </Card>

        {/* Pool de Semilleros para Arrastrar */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} className="text-amber-500" /> Semilleros Disponibles para Asignar
            </p>
            <span className="text-[9px] text-slate-400 font-bold uppercase italic">Arrastra un semillero hacia un reto</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {semilleros.map(s => (
              <div 
                key={s.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('semilleroId', s.id)}
                className="flex-shrink-0 px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-amber-400 transition-all flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold text-slate-700">{s.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid de Retos ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Loader2 className="animate-spin text-amber-500" size={40} />
          <p className="text-slate-400 font-medium animate-pulse">Sincronizando banco de retos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRetos.map(reto => {
            const sector = getSectorIcon(reto.sector_productivo);
            const estado = ESTADOS.find(e => e.value === reto.estado) || ESTADOS[0];
            const Icon = sector.icon;

            return (
              <Card 
                key={reto.id} 
                onClick={() => { setSelectedReto(reto); setIsDetailOpen(true); }}
                onDragOver={(e) => { e.preventDefault(); setDragOverId(reto.id); }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => handleDropSemillero(e, reto)}
                className={`group p-0 overflow-hidden border-0 ring-1 transition-all cursor-pointer bg-white flex flex-col ${dragOverId === reto.id ? 'ring-4 ring-amber-500 scale-[1.02] shadow-2xl z-10' : 'ring-slate-200 hover:ring-amber-400 hover:shadow-card-lg'}`}
              >
                <div className={`h-1.5 w-full ${sector.bg.replace('bg-', 'bg-').replace('50', '500')}`} />
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-lg ${sector.bg} ${sector.color} group-hover:scale-110 transition-transform`}>
                      <Icon size={20} />
                    </div>
                    <Badge variant={estado.variant} dot className="text-[10px] font-black uppercase tracking-tighter">
                      {estado.label}
                    </Badge>
                  </div>

                  <h3 className="font-black text-slate-900 text-lg mb-2 line-clamp-2 leading-tight group-hover:text-amber-700 transition-colors">
                    {reto.titulo}
                  </h3>
                  
                  <p className="text-sm text-slate-500 line-clamp-3 mb-6 flex-1 italic">
                    "{reto.descripcion}"
                  </p>

                  <div className="space-y-3 pt-4 border-t border-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
                        <Building size={14} className="text-slate-400" />
                        <span className="truncate max-w-[150px]">{reto.empresa_solicitante || 'Empresa Privada'}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(reto.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest w-fit ${sector.bg} ${sector.color}`}>
                        {reto.sector_productivo || 'General'}
                      </div>
                      {reto.semillero_asignado_id && (
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md w-fit border border-emerald-100">
                          <Users size={10} /> {reto.semillero_nombre || 'Semillero Asignado'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {filteredRetos.length === 0 && (
            <div className="col-span-full py-24 text-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <Target size={40} className="text-amber-300" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">No encontramos lo que buscas</h3>
              <p className="text-slate-500 max-w-sm mx-auto">Ajusta los filtros o busca con palabras más generales para encontrar retos de investigación.</p>
              <Button variant="outline" className="mt-6" onClick={() => { setSearchTerm(''); setSectorFilter(''); setEstadoFilter(''); }}>
                Limpiar Filtros
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Detail Side-Over ── */}
      {isDetailOpen && selectedReto && (() => {
        const sector = getSectorIcon(selectedReto.sector_productivo);
        const estado = ESTADOS.find(e => e.value === selectedReto.estado) || ESTADOS[0];
        const Icon = sector.icon;

        return (
          <div className="fixed inset-0 z-[100] overflow-hidden print:static print:block print:overflow-visible">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fadeIn print:hidden" onClick={() => setIsDetailOpen(false)} />
            <div className="absolute inset-y-0 right-0 max-w-full flex print:static print:block print:w-full">
              <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col animate-slideInRight print:w-full print:max-w-none print:shadow-none print:animate-none print:static">
                {/* Header Detail */}
                <div className={`px-8 py-8 border-b border-slate-100 ${sector.bg}`}>
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-amber-600">
                      <Icon size={24} />
                    </div>
                    <div className="flex gap-2">
                      {(currentUser?.rol === 'admin' || currentUser?.id === selectedReto.owner_id) && (
                        <>
                          <button onClick={(e) => handleOpenEdit(selectedReto, e)} className="p-2.5 bg-white text-blue-600 hover:bg-blue-50 rounded-xl shadow-sm border border-blue-100 transition-all"><Edit2 size={18} /></button>
                          <button onClick={(e) => handleDelete(selectedReto.id, e)} className="p-2.5 bg-white text-rose-600 hover:bg-rose-50 rounded-xl shadow-sm border border-rose-100 transition-all"><Trash2 size={18} /></button>
                        </>
                      )}
                      <button onClick={() => setIsDetailOpen(false)} className="p-2.5 bg-white text-slate-400 hover:text-slate-600 rounded-xl shadow-sm border border-slate-100 transition-all ml-2"><X size={18} /></button>
                    </div>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight mb-4">{selectedReto.titulo}</h2>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={estado.variant} className="px-3 py-1 text-xs font-bold uppercase tracking-wider">{estado.label}</Badge>
                    <Badge variant="amber" className="px-3 py-1 text-xs font-bold uppercase tracking-wider">{selectedReto.prioridad} prioridad</Badge>
                  </div>
                </div>

                {/* Body Detail */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
                  <section>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Info size={14} className="text-amber-500" /> Descripción del Problema
                    </h3>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed text-sm shadow-inner">
                      {selectedReto.descripcion}
                    </div>
                  </section>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Sector Impactado</p>
                      <p className="font-bold text-slate-900 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${sector.bg.replace('50', '500')}`} />
                        {selectedReto.sector_productivo}
                      </p>
                    </div>
                    <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Empresa / Origen</p>
                      <p className="font-bold text-slate-900 flex items-center gap-2">
                        <Building size={14} className="text-slate-400" />
                        {selectedReto.empresa_solicitante || 'No especificada'}
                      </p>
                    </div>
                  </div>

                  <section className="pt-4">
                    <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 mb-4">
                      <h4 className="font-bold text-amber-900 mb-2 flex items-center gap-2">
                        <Mail size={18} /> ¿Quieres proponer una solución?
                      </h4>
                      <p className="text-sm text-amber-800/80 mb-4 leading-relaxed">
                        Si tienes una idea o proyecto que pueda resolver este reto, contacta directamente con el solicitante o coordina con el centro.
                      </p>
                      <a 
                        href={`mailto:${selectedReto.contacto_email}`} 
                        className="w-full flex items-center justify-center gap-2 py-3 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 transition-all shadow-md shadow-amber-200"
                      >
                        Enviar propuesta a: {selectedReto.contacto_email || 'CGAO Investiga'}
                      </a>
                    </div>
                    
                    {currentUser?.rol !== 'admin' && (
                      <Button 
                        variant="primary" 
                        className="w-full py-4 bg-slate-900 hover:bg-black text-white shadow-xl flex items-center justify-center gap-2"
                        onClick={() => {
                          onNotify('Iniciando propuesta de proyecto basada en este reto...', 'info');
                          onModuleAction?.({ 
                            module: 'proyectos', 
                            form: 'create', 
                            initialData: { 
                              nombre: selectedReto.titulo, 
                              descripcion: selectedReto.descripcion,
                              reto_origen_id: selectedReto.id 
                            } 
                          });
                        }}
                      >
                        <Zap size={18} fill="currentColor" className="text-amber-400" /> 
                        Postular Proyecto de Solución
                      </Button>
                    )}
                  </section>
                </div>

                {/* Footer Detail */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 print:hidden">
                  <Button variant="secondary" className="flex-1" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
                  <Button variant="primary" className="flex-1 bg-slate-900 hover:bg-black" onClick={() => window.print()}>
                    <ExternalLink size={16} className="mr-2" /> Exportar PDF
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Form Modal (Crear/Editar) ── */}
      {showModal && (
        <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn border-0 shadow-2xl">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-white">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{isEditing ? 'Actualizar Reto' : 'Publicar Nuevo Reto'}</h2>
                <p className="text-xs text-amber-700 font-bold uppercase tracking-widest mt-1">Liderazgo Sennova CGAO</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white transition-all"><X size={20} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-6 scrollbar-thin">
              <Input 
                label="Título del Reto de Investigación" 
                placeholder="Ej: Análisis de eficiencia energética en calderas industriales..." 
                value={formData.titulo} 
                onChange={e => setFormData({...formData, titulo: e.target.value})} 
                required 
              />
              
              <TextArea 
                label="Descripción Técnica y Necesidad" 
                placeholder="Detalla el problema, el contexto y qué se espera lograr..." 
                value={formData.descripcion} 
                onChange={e => setFormData({...formData, descripcion: e.target.value})} 
                rows={5} 
                required 
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select 
                  label="Sector Productivo" 
                  value={formData.sector_productivo} 
                  onChange={e => setFormData({...formData, sector_productivo: e.target.value})}
                  options={SECTORES.map(s => ({ value: s.value, label: s.value }))}
                />
                <Input 
                  label="Empresa / Organización Solicitante" 
                  placeholder="Nombre de la empresa o grupo" 
                  value={formData.empresa_solicitante} 
                  onChange={e => setFormData({...formData, empresa_solicitante: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="Email de Contacto" 
                  type="email" 
                  placeholder="ejemplo@empresa.com" 
                  value={formData.contacto_email} 
                  onChange={e => setFormData({...formData, contacto_email: e.target.value})} 
                />
                <Select 
                  label="Prioridad de Atención" 
                  value={formData.prioridad} 
                  onChange={e => setFormData({...formData, prioridad: e.target.value})} 
                  options={[
                    { value: 'baja', label: 'Baja - Largo Plazo' },
                    { value: 'media', label: 'Media - Trimestral' },
                    { value: 'alta', label: 'Alta - Urgente' }
                  ]} 
                />
              </div>

              {isEditing && (
                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Select 
                    label="Estado de Gestión" 
                    value={formData.estado} 
                    onChange={e => setFormData({...formData, estado: e.target.value})} 
                    options={ESTADOS} 
                  />
                  <Select 
                    label="Semillero Asignado" 
                    value={formData.semillero_asignado_id} 
                    onChange={e => setFormData({...formData, semillero_asignado_id: e.target.value})} 
                    options={[
                      { value: '', label: 'Sin asignar' },
                      ...semilleros.map(s => ({ value: s.id, label: s.nombre }))
                    ]} 
                  />
                </div>
              )}
            </div>

            <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <Button variant="outline" onClick={() => setShowModal(false)} className="px-6">Cancelar</Button>
              <Button 
                className="bg-amber-600 hover:bg-amber-700 text-white px-8 h-11" 
                onClick={handleSubmit} 
                disabled={!formData.titulo || !formData.descripcion}
              >
                {isEditing ? 'Actualizar Información' : 'Publicar en el Banco'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RetosModule;
