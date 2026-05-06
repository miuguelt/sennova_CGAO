import React, { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, FileText, CheckCircle, 
  Clock, Plus, Search, Filter, ArrowUpRight,
  MoreVertical, Edit, Trash2, ExternalLink,
  X, Info, Target, AlertCircle, Loader2
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import TextArea from '../ui/TextArea';
import Select from '../ui/Select';
import { ConvocatoriasAPI } from '../../api/convocatorias';

const ESTADOS = [
  { value: 'abierta', label: 'Abierta', variant: 'success', icon: CheckCircle },
  { value: 'en_evaluacion', label: 'En Evaluación', variant: 'warning', icon: Search },
  { value: 'resultados_publicados', label: 'Resultados', variant: 'indigo', icon: FileText },
  { value: 'cerrada', label: 'Cerrada', variant: 'default', icon: Clock }
];

const EMPTY_FORM = {
  nombre: '',
  año: new Date().getFullYear(),
  numero_oe: '',
  fecha_inicio: '',
  fecha_cierre: '',
  descripcion: '',
  enlace_externo: '',
  estado: 'abierta'
};

const StatusBadge = ({ status }) => {
  const config = ESTADOS.find(e => e.value === status) || ESTADOS[3];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} dot className="text-[10px] font-black uppercase tracking-tighter">
      <Icon size={12} className="mr-1" />
      {config.label}
    </Badge>
  );
};

const ConvocatoriaCard = ({ convocatoria, onEdit, onDelete, onDetail }) => {
  const daysLeft = () => {
    if (!convocatoria.fecha_cierre) return null;
    const diff = new Date(convocatoria.fecha_cierre) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const dl = daysLeft();

  return (
    <Card 
      onClick={onDetail}
      className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-emerald-500 cursor-pointer bg-white"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <StatusBadge status={convocatoria.estado} />
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(convocatoria); }} 
              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              <Edit size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(convocatoria.id); }} 
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2 line-clamp-2 leading-snug group-hover:text-emerald-700 transition-colors">
          {convocatoria.nombre}
        </h3>
        
        <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <span>{convocatoria.año}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText size={14} />
            <span>OE: {convocatoria.numero_oe || 'N/A'}</span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-400 uppercase tracking-wider">Fecha Cierre</span>
            <span className={dl > 0 && dl <= 15 ? 'text-amber-600 font-bold' : 'text-slate-700'}>
              {convocatoria.fecha_cierre || 'No definida'}
            </span>
          </div>
          {dl !== null && dl > 0 && (
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${dl <= 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min(100, (dl / 30) * 100)}%` }}
              ></div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500">
              {convocatoria.total_proyectos || 0}
            </div>
            <span className="pl-4 text-xs font-medium text-slate-500 self-center">Proyectos vinculados</span>
          </div>
          <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 p-0 h-auto font-bold group/btn">
            Detalles <ArrowUpRight size={14} className="ml-1 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

const ConvocatoriasModule = ({ currentUser, onNotify }) => {
  const [convocatorias, setConvocatorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState({ estado: '' });
  
  // Modales
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedConvocatoria, setSelectedConvocatoria] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await ConvocatoriasAPI.list();
      setConvocatorias(data || []);
    } catch (err) {
      onNotify('Error al cargar convocatorias', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreate = () => {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleOpenEdit = (convocatoria) => {
    setFormData({ ...convocatoria });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta convocatoria? Esta acción no se puede deshacer.')) return;
    try {
      await ConvocatoriasAPI.delete(id);
      onNotify('Convocatoria eliminada correctamente', 'success');
      loadData();
      if (selectedConvocatoria?.id === id) setDetailOpen(false);
    } catch (err) {
      onNotify('Error al eliminar la convocatoria', 'error');
    }
  };

  const handleSubmit = async () => {
    try {
      if (isEditing) {
        await ConvocatoriasAPI.update(formData.id, formData);
        onNotify('Convocatoria actualizada con éxito', 'success');
      } else {
        await ConvocatoriasAPI.create(formData);
        onNotify('Convocatoria creada exitosamente', 'success');
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      onNotify(err.message || 'Error al procesar la convocatoria', 'error');
    }
  };

  const filteredConvocatorias = (convocatorias || []).filter(c => {
    const matchesSearch = (c.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.numero_oe || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filter.estado ? c.estado === filter.estado : true;
    return matchesSearch && matchesEstado;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-emerald-500" size={40} />
          <p className="text-slate-500 font-medium">Sincronizando convocatorias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* ── Header & Search ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Convocatorias</h1>
          <p className="text-slate-500 text-sm">Gestiona y consulta las convocatorias institucionales y externas.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Buscar convocatoria..."
              className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            value={filter.estado}
            onChange={(e) => setFilter({...filter, estado: e.target.value})}
          >
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>

          {currentUser?.rol === 'admin' && (
            <Button onClick={handleOpenCreate} variant="primary" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
              <Plus size={18} className="mr-2" /> Nueva Convocatoria
            </Button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      {filteredConvocatorias.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConvocatorias.map((c) => (
            <ConvocatoriaCard 
              key={c.id} 
              convocatoria={c} 
              onEdit={handleOpenEdit} 
              onDelete={handleDelete}
              onDetail={() => { setSelectedConvocatoria(c); setDetailOpen(true); }}
            />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-4 border border-slate-100">
            <Filter size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No se encontraron convocatorias</h3>
          <p className="text-slate-500 mt-1 max-w-xs mx-auto">Prueba ajustando los filtros o el término de búsqueda.</p>
          <Button variant="outline" className="mt-6" onClick={() => { setSearchTerm(''); setFilter({ estado: '' }); }}>
            Limpiar filtros
          </Button>
        </Card>
      )}

      {/* ── Detail Side-Over ── */}
      {detailOpen && selectedConvocatoria && (
        <div className="fixed inset-0 z-[100] overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fadeIn" onClick={() => setDetailOpen(false)} />
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col animate-slideInRight">
              <div className="px-8 py-8 border-b border-slate-100 bg-emerald-50">
                <div className="flex items-start justify-between mb-6">
                  <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600">
                    <Calendar size={24} />
                  </div>
                  <div className="flex gap-2">
                    {currentUser?.rol === 'admin' && (
                      <>
                        <button onClick={() => handleOpenEdit(selectedConvocatoria)} className="p-2.5 bg-white text-blue-600 hover:bg-blue-50 rounded-xl shadow-sm border border-blue-100 transition-all"><Edit size={18} /></button>
                        <button onClick={() => handleDelete(selectedConvocatoria.id)} className="p-2.5 bg-white text-rose-600 hover:bg-rose-50 rounded-xl shadow-sm border border-rose-100 transition-all"><Trash2 size={18} /></button>
                      </>
                    )}
                    <button onClick={() => setDetailOpen(false)} className="p-2.5 bg-white text-slate-400 hover:text-slate-600 rounded-xl shadow-sm border border-slate-100 transition-all ml-2"><X size={18} /></button>
                  </div>
                </div>
                <h2 className="text-2xl font-black text-slate-900 leading-tight mb-4">{selectedConvocatoria.nombre}</h2>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={selectedConvocatoria.estado} />
                  <Badge variant="emerald" className="px-3 py-1 text-xs font-bold uppercase tracking-wider">{selectedConvocatoria.año} Institucional</Badge>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-thin">
                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Info size={14} className="text-emerald-500" /> Descripción de la Convocatoria
                  </h3>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-slate-700 leading-relaxed text-sm shadow-inner">
                    {selectedConvocatoria.descripcion || 'Sin descripción técnica disponible para esta convocatoria.'}
                  </div>
                </section>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Código OE</p>
                    <p className="font-bold text-slate-900 flex items-center gap-2">
                      <FileText size={14} className="text-slate-400" />
                      {selectedConvocatoria.numero_oe || 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Proyectos Vinculados</p>
                    <p className="font-bold text-emerald-600 flex items-center gap-2">
                      <Target size={14} />
                      {selectedConvocatoria.total_proyectos || 0} Iniciativas
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                   <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Clock size={14} className="text-amber-500" /> Cronograma de Cierre
                  </h3>
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <div>
                      <p className="text-[10px] font-bold text-amber-700 uppercase">Fecha Límite</p>
                      <p className="font-black text-slate-900">{selectedConvocatoria.fecha_cierre || 'No definida'}</p>
                    </div>
                    {selectedConvocatoria.fecha_cierre && (
                      <Badge variant="amber" className="font-black">
                        {Math.ceil((new Date(selectedConvocatoria.fecha_cierre) - new Date()) / (1000 * 60 * 60 * 24))} días restantes
                      </Badge>
                    )}
                  </div>
                </div>

                {selectedConvocatoria.enlace_externo && (
                  <Button 
                    onClick={() => window.open(selectedConvocatoria.enlace_externo, '_blank')}
                    variant="outline" 
                    className="w-full py-4 border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={18} /> Ver Términos de Referencia
                  </Button>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setDetailOpen(false)}>Cerrar</Button>
                <Button 
                  variant="primary" 
                  className="flex-1 bg-slate-900 hover:bg-black"
                  onClick={() => {
                    onNotify('Redirigiendo a registro de proyectos...', 'info');
                    // Aquí se navegaría a Proyectos con la convocatoria seleccionada
                  }}
                >
                  Postular Proyecto
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-[110] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scaleIn border-0 shadow-2xl">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-white">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">{isEditing ? 'Actualizar Convocatoria' : 'Nueva Convocatoria'}</h2>
                <p className="text-xs text-emerald-700 font-bold uppercase tracking-widest mt-1">Gestión SENNOVA CGAO</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white transition-all"><X size={20} /></button>
            </div>
            
            <div className="p-8 overflow-y-auto space-y-6 scrollbar-thin">
              <Input 
                label="Nombre de la Convocatoria" 
                placeholder="Ej: Convocatoria Nacional de Proyectos I+D+i 2026" 
                value={formData.nombre} 
                onChange={e => setFormData({...formData, nombre: e.target.value})} 
                required 
              />
              
              <TextArea 
                label="Descripción y Alcance" 
                placeholder="Detalla los objetivos, requisitos y población objetivo..." 
                value={formData.descripcion} 
                onChange={e => setFormData({...formData, descripcion: e.target.value})} 
                rows={4} 
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="Año" 
                  type="number"
                  value={formData.año} 
                  onChange={e => setFormData({...formData, año: e.target.value})} 
                />
                <Input 
                  label="Número OE / Referencia" 
                  placeholder="Ej: 2026-741" 
                  value={formData.numero_oe} 
                  onChange={e => setFormData({...formData, numero_oe: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label="Fecha Inicio" 
                  type="date"
                  value={formData.fecha_inicio} 
                  onChange={e => setFormData({...formData, fecha_inicio: e.target.value})} 
                />
                <Input 
                  label="Fecha Cierre" 
                  type="date"
                  value={formData.fecha_cierre} 
                  onChange={e => setFormData({...formData, fecha_cierre: e.target.value})} 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select 
                  label="Estado Actual" 
                  value={formData.estado} 
                  onChange={e => setFormData({...formData, estado: e.target.value})} 
                  options={ESTADOS} 
                />
                <Input 
                  label="Enlace a TdR (URL)" 
                  placeholder="https://sena.edu.co/convocatoria..." 
                  value={formData.enlace_externo} 
                  onChange={e => setFormData({...formData, enlace_externo: e.target.value})} 
                />
              </div>
            </div>

            <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <Button variant="outline" onClick={() => setShowForm(false)} className="px-6">Cancelar</Button>
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 h-11" 
                onClick={handleSubmit} 
                disabled={!formData.nombre}
              >
                {isEditing ? 'Guardar Cambios' : 'Crear Convocatoria'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ConvocatoriasModule;
