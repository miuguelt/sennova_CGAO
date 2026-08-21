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
import Modal from '../ui/Modal';
import Drawer from '../ui/Drawer';
import ConfirmDialog from '../ui/ConfirmDialog';
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
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });
  
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

  const handleDelete = (id, e) => {
    if (e) e.stopPropagation();
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDeleteAction = async () => {
    const id = deleteConfirm.id;
    if (!id) return;
    try {
      await RetosAPI.delete(id);
      onNotify('Reto eliminado del banco de innovación', 'success');
      setIsDetailOpen(false);
      setDeleteConfirm({ isOpen: false, id: null });
      loadRetos();
    } catch (err) {
      onNotify('Error al eliminar el reto: ' + (err.message || ''), 'error');
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
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <Users size={14} className="text-amber-600" /> Semilleros Disponibles para Asignar
            </p>
            <span className="text-[9px] text-slate-600 font-bold uppercase italic">Arrastra un semillero hacia un reto</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {semilleros.map(s => (
              <div 
                key={s.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('semilleroId', s.id)}
                className="flex-shrink-0 px-4 py-2 bg-white border border-slate-300 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-amber-500 transition-all flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-600" />
                <span className="text-xs font-bold text-slate-800">{s.nombre}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grid de Retos ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
          <Loader2 className="animate-spin text-amber-600" size={40} />
          <p className="text-slate-600 font-bold animate-pulse">Sincronizando banco de retos...</p>
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
                className={`group p-0 overflow-hidden border transition-all cursor-pointer bg-white flex flex-col ${dragOverId === reto.id ? 'border-amber-500 ring-4 ring-amber-500/20 scale-[1.02] shadow-2xl z-10' : 'border-slate-200 hover:border-amber-400 hover:shadow-card-lg'}`}
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
                  
                  <p className="text-sm text-slate-700 line-clamp-3 mb-6 flex-1 italic font-medium">
                    "{reto.descripcion}"
                  </p>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-slate-700 font-bold">
                        <Building size={14} className="text-slate-600" />
                        <span className="truncate max-w-[150px]">{reto.empresa_solicitante || 'Empresa Privada'}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600">{new Date(reto.created_at).toLocaleDateString('es-CO')}</span>
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest w-fit ${sector.bg} ${sector.color}`}>
                        {reto.sector_productivo || 'General'}
                      </div>
                      {reto.semillero_asignado_id && (
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md w-fit border border-emerald-200">
                          <Users size={10} /> {semilleros.find(s => s.id === reto.semillero_asignado_id)?.nombre || reto.semillero_nombre || 'Semillero Asignado'}
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

      {/* ── Detail Drawer (Estandarizado en Pila) ── */}
      {selectedReto && (() => {
        const sector = getSectorIcon(selectedReto.sector_productivo);
        const estado = ESTADOS.find(e => e.value === selectedReto.estado) || ESTADOS[0];

        return (
          <Drawer
            isOpen={isDetailOpen && !!selectedReto}
            onClose={() => setIsDetailOpen(false)}
            size="lg"
            variant="warning"
            title={selectedReto.titulo}
            badge={
              <div className="flex flex-wrap gap-2">
                <Badge variant={estado.variant} className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">{estado.label}</Badge>
                <Badge variant="amber" className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">{selectedReto.prioridad} prioridad</Badge>
              </div>
            }
            footer={
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button variant="secondary" className="flex-1 justify-center order-2 sm:order-1" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
                {(currentUser?.rol === 'admin' || currentUser?.id === selectedReto.owner_id) && (
                  <Button 
                    variant="sena" 
                    className="flex-1 justify-center order-1 sm:order-2" 
                    onClick={(e) => handleOpenEdit(selectedReto, e)}
                  >
                    <Edit2 size={16} className="mr-1.5" /> Editar Reto
                  </Button>
                )}
                <Button variant="primary" className="bg-slate-900 hover:bg-black justify-center" onClick={() => window.print()}>
                  <ExternalLink size={16} className="mr-1.5" /> PDF
                </Button>
              </div>
            }
          >
            <div className="space-y-6">
              <section>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                  <Info size={14} className="text-amber-600" /> Descripción del Problema
                </h3>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-slate-800 leading-relaxed text-xs font-medium">
                  {selectedReto.descripcion}
                </div>
              </section>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-700 uppercase mb-1">Sector Impactado</p>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${sector.bg.replace('50', '500')}`} />
                    {selectedReto.sector_productivo}
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                  <p className="text-[10px] font-black text-slate-700 uppercase mb-1">Empresa / Origen</p>
                  <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <Building size={14} className="text-slate-600" />
                    {selectedReto.empresa_solicitante || 'No especificada'}
                  </p>
                </div>
                {selectedReto.semillero_asignado_id && (
                  <div className="sm:col-span-2 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
                    <p className="text-[10px] font-black text-emerald-800 uppercase mb-1">Semillero Vinculado a la Solución</p>
                    <p className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                      <Users size={14} className="text-emerald-600" />
                      {semilleros.find(s => s.id === selectedReto.semillero_asignado_id)?.nombre || selectedReto.semillero_nombre || 'Semillero Asignado'}
                    </p>
                  </div>
                )}
              </div>

              <section className="pt-2">
                <div className="p-5 bg-amber-50/80 rounded-2xl border border-amber-100 mb-4">
                  <h4 className="text-xs font-bold text-amber-900 mb-1.5 flex items-center gap-2">
                    <Mail size={16} /> ¿Quieres proponer una solución?
                  </h4>
                  <p className="text-xs text-amber-800/80 mb-3 leading-relaxed">
                    Si tienes una idea o proyecto que pueda resolver este reto, contacta directamente con el solicitante o coordina con el centro.
                  </p>
                  <a 
                    href={`mailto:${selectedReto.contacto_email}`} 
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-700 transition-all shadow-md shadow-amber-200"
                  >
                    Enviar propuesta a: {selectedReto.contacto_email || 'CGAO Investiga'}
                  </a>
                </div>
                
                {currentUser?.rol !== 'admin' && currentUser?.rol !== 'aprendiz' && (
                  <Button 
                    variant="primary" 
                    className="w-full py-3 bg-slate-900 hover:bg-black text-white shadow-xl flex items-center justify-center gap-2 text-xs font-bold"
                    onClick={() => {
                      onNotify('Iniciando formulación de proyecto de solución basada en este reto...', 'info');
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
                    <Zap size={16} fill="currentColor" className="text-amber-400" /> 
                    Formular Proyecto de Solución
                  </Button>
                )}
                {currentUser?.rol === 'aprendiz' && (
                  <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                    <p className="text-xs text-indigo-900 font-bold mb-1.5">¿Tienes una idea para este reto?</p>
                    <p className="text-[11px] text-slate-500 mb-3">Habla con tu instructor o tutor de semillero para registrar una propuesta formativa conjunta.</p>
                    <Button 
                      variant="outline" 
                      className="w-full bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50 text-xs font-bold justify-center"
                      onClick={() => onModuleAction?.({ module: 'semilleros' })}
                    >
                      Explorar Semilleros Disponibles
                    </Button>
                  </div>
                )}
              </section>
            </div>
          </Drawer>
        );
      })()}

      {/* ── Form Modal (Estandarizado en Pila) ── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        size="xl"
        variant="warning"
        icon={isEditing ? Edit2 : Lightbulb}
        title={isEditing ? 'Actualizar Reto' : 'Publicar Nuevo Reto'}
        subtitle="Banco institucional de retos e innovación CGAO"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)} className="w-full sm:w-auto justify-center">Cancelar</Button>
            <Button 
              variant="sena"
              onClick={handleSubmit} 
              disabled={!formData.titulo || !formData.descripcion}
              className="w-full sm:w-auto justify-center"
            >
              {isEditing ? 'Actualizar Reto' : 'Publicar Reto'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
      </Modal>

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDeleteAction}
        title="¿Eliminar Reto del Banco?"
        description="¿Estás seguro de eliminar este reto de innovación? Esta acción no se puede deshacer."
        confirmText="Eliminar Reto"
        variant="danger"
      />
    </div>
  );
};

export default RetosModule;
