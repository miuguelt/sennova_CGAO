import React, { useState, useEffect } from 'react';
import { 
  Calendar, CheckCircle2, AlertCircle, Clock, Plus, 
  Search, Filter, ChevronRight, MoreVertical, Edit2, 
  Trash2, User, Folder, Loader2, CheckSquare, ListTodo,
  TrendingUp, CalendarDays, ArrowUpRight, Send, AlertTriangle
} from 'lucide-react';
import { EntregablesAPI } from '../../api/entregables';
import { ProyectosAPI } from '../../api/proyectos';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TextArea from '../ui/TextArea';

const selectValue = (eventOrValue) => eventOrValue?.target ? eventOrValue.target.value : eventOrValue;

const ESTADOS = [
  { value: 'pendiente',         label: 'Pendiente',         color: 'text-slate-500',   bg: 'bg-slate-100' },
  { value: 'en_desarrollo',    label: 'En Desarrollo',     color: 'text-blue-600',    bg: 'bg-blue-100' },
  { value: 'enviado',          label: 'Enviado',           color: 'text-indigo-600',  bg: 'bg-indigo-100' },
  { value: 'aprobado',         label: 'Aprobado',          color: 'text-emerald-600', bg: 'bg-emerald-100' },
  { value: 'ajustes_requeridos', label: 'Requiere Ajustes', color: 'text-rose-600',    bg: 'bg-rose-100' },
];

const getEstado = (val) => ESTADOS.find(e => e.value === val) || ESTADOS[0];

const EMPTY_FORM = {
  fase: 'Fase I',
  titulo: '',
  descripcion: '',
  tipo: 'documento',
  fecha_entrega: new Date().toISOString().split('T')[0],
  proyecto_id: '',
  responsable_id: '',
};

const CronogramaModule = ({ currentUser, onNotify }) => {
  const [entregables, setEntregables] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [filterProyecto, setFilterProyecto] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [view, setView] = useState('list'); // list, timeline

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eData, pData] = await Promise.all([
        EntregablesAPI.listarMisEntregables(),
        ProyectosAPI.list()
      ]);
      setEntregables(eData || []);
      setProyectos(pData || []);
    } catch (err) {
      onNotify?.('Error al cargar cronograma', 'error');
    }
    setLoading(false);
  };

  const handleCreate = () => {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setShowForm(true);
  };

  const handleEdit = (entregable) => {
    setFormData({ ...entregable });
    setIsEditing(true);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    try {
      if (isEditing) {
        await EntregablesAPI.update(formData.id, formData);
        onNotify?.('Entregable actualizado', 'success');
      } else {
        await EntregablesAPI.create(formData);
        onNotify?.('Nuevo entregable programado', 'success');
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      onNotify?.('Error al guardar: ' + err.message, 'error');
    }
  };

  const handleCambiarEstado = async (id, estado) => {
    try {
      await EntregablesAPI.cambiarEstado(id, estado);
      onNotify?.(`Estado actualizado a ${estado}`, 'success');
      loadData();
    } catch (err) {
      onNotify?.('Error al cambiar estado', 'error');
    }
  };

  const filtered = entregables.filter(e => {
    const matchProj = !filterProyecto || e.proyecto_id === filterProyecto;
    const matchEst  = !filterEstado   || e.estado === filterEstado;
    return matchProj && matchEst;
  });

  const getDíasRestantesColor = (dias) => {
    if (dias === null) return 'text-slate-400';
    if (dias < 0) return 'text-rose-600 font-black';
    if (dias <= 3) return 'text-amber-600 font-bold';
    return 'text-emerald-600';
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
            <CalendarDays size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Cronograma de Entregables</h1>
            <p className="text-sm text-slate-500 font-medium">Seguimiento de hitos y compromisos de investigación</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreate} variant="sena" className="shadow-lg shadow-emerald-200/50">
            <Plus size={18} className="mr-2" /> Programar Entregable
          </Button>
        </div>
      </div>

      {/* ── Dashboard Mini Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-0 ring-1 ring-slate-100 flex items-center gap-4">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl"><ListTodo size={20} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
            <p className="text-xl font-black text-slate-900">{entregables.length}</p>
          </div>
        </Card>
        <Card className="p-4 border-0 ring-1 ring-slate-100 flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-xl"><Clock size={20} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pendientes</p>
            <p className="text-xl font-black text-slate-900">{entregables.filter(e => e.estado === 'pendiente' || e.estado === 'en_desarrollo').length}</p>
          </div>
        </Card>
        <Card className="p-4 border-0 ring-1 ring-slate-100 flex items-center gap-4">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl"><AlertTriangle size={20} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Críticos (≤3d)</p>
            <p className="text-xl font-black text-slate-900">{entregables.filter(e => e.dias_restantes !== null && e.dias_restantes <= 3 && e.estado !== 'aprobado').length}</p>
          </div>
        </Card>
        <Card className="p-4 border-0 ring-1 ring-slate-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl"><CheckCircle2 size={20} /></div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aprobados</p>
            <p className="text-xl font-black text-slate-900">{entregables.filter(e => e.estado === 'aprobado').length}</p>
          </div>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col lg:flex-row gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        <select 
          className="flex-1 px-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl text-sm font-bold text-slate-700"
          value={filterProyecto}
          onChange={(e) => setFilterProyecto(e.target.value)}
        >
          <option value="">Todos los Proyectos</option>
          {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre_corto || p.nombre}</option>)}
        </select>
        <select 
          className="w-full lg:w-48 px-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl text-sm font-bold text-slate-700"
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
        >
          <option value="">Todos los Estados</option>
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <div className="flex bg-white p-1 rounded-xl ring-1 ring-slate-200">
          <button 
            onClick={() => setView('list')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${view === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}
          >
            Lista
          </button>
          <button 
            onClick={() => setView('timeline')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${view === 'timeline' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'}`}
          >
            Timeline
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="py-20 text-center">
          <Loader2 size={40} className="animate-spin text-emerald-600 mx-auto mb-4" />
          <p className="text-slate-500 font-bold italic tracking-wide">Cargando hoja de ruta...</p>
        </div>
      ) : filtered.length > 0 ? (
        view === 'list' ? (
          <div className="grid grid-cols-1 gap-4">
            {filtered.map(e => {
              const est = getEstado(e.estado);
              return (
                <Card key={e.id} className="p-0 overflow-hidden border-0 ring-1 ring-slate-200 hover:ring-indigo-300 hover:shadow-lg transition-all group">
                  <div className="flex flex-col md:flex-row md:items-center p-5 gap-6">
                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-24 h-24 bg-slate-50 rounded-2xl border border-slate-100 group-hover:bg-indigo-50 transition-colors">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{e.fase}</p>
                      <p className="text-2xl font-black text-slate-900 tabular-nums">
                        {new Date(e.fecha_entrega).getDate()}
                      </p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">
                        {new Date(e.fecha_entrega).toLocaleString('es-CO', { month: 'short' })}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-black text-slate-900 text-base truncate">{e.titulo}</h3>
                        <Badge variant="outline" className={`text-[10px] uppercase tracking-widest ${est.bg} ${est.color}`}>
                          {est.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3">{e.descripcion || 'Sin descripción detallada.'}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold">
                        <span className="flex items-center gap-1 text-slate-400">
                          <Folder size={14} className="text-indigo-400" /> {e.proyecto_nombre || 'Proyecto SENNOVA'}
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <User size={14} className="text-amber-400" /> {e.responsable_nombre || 'Sin asignar'}
                        </span>
                        <span className={`flex items-center gap-1 ${getDíasRestantesColor(e.dias_restantes)}`}>
                          <Clock size={14} /> 
                          {e.dias_restantes === null ? 'Sin fecha' : 
                           e.dias_restantes < 0 ? `Vencido hace ${Math.abs(e.dias_restantes)} días` : 
                           e.dias_restantes === 0 ? '¡VENCE HOY!' : 
                           `Faltan ${e.dias_restantes} días`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 md:pl-6 md:border-l border-slate-100">
                      {e.estado === 'pendiente' && (
                        <Button variant="primary" size="sm" onClick={() => handleCambiarEstado(e.id, 'en_desarrollo')}>
                          Iniciar <ChevronRight size={14} className="ml-1" />
                        </Button>
                      )}
                      {e.estado === 'en_desarrollo' && (
                        <Button variant="sena" size="sm" onClick={() => handleCambiarEstado(e.id, 'enviado')}>
                          Enviar <Send size={14} className="ml-1" />
                        </Button>
                      )}
                      <button 
                        onClick={() => handleEdit(e)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                      >
                        <Edit2 size={18} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/50 backdrop-blur-md rounded-3xl border border-white p-8">
             {/* Simple Timeline View */}
             <div className="space-y-12">
               {['Fase I', 'Fase II', 'Fase III', 'Fase Final'].map(fase => {
                 const items = filtered.filter(i => i.fase === fase);
                 if (items.length === 0) return null;
                 return (
                   <div key={fase} className="relative pl-8 border-l-2 border-indigo-100 pb-4">
                     <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white shadow-sm" />
                     <h3 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-6 flex items-center gap-4">
                       {fase}
                       <div className="h-px flex-1 bg-indigo-50" />
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {items.map(item => (
                         <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                           <div className="flex justify-between items-start mb-2">
                             <p className="text-xs font-black text-slate-800">{item.titulo}</p>
                             <Badge variant="default" className="text-[10px]">{item.estado}</Badge>
                           </div>
                           <p className="text-[10px] text-slate-500 mb-4">{new Date(item.fecha_entrega).toLocaleDateString()}</p>
                           <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                             <div 
                               className={`h-full rounded-full ${item.estado === 'aprobado' ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                               style={{width: item.estado === 'aprobado' ? '100%' : '30%'}}
                             />
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        )
      ) : (
        <div className="py-20 text-center bg-white/50 rounded-3xl border border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar size={32} className="text-slate-300" />
          </div>
          <h3 className="text-slate-900 font-bold">Sin entregables programados</h3>
          <p className="text-slate-500 text-sm mt-1">Usa filtros o crea una nueva tarea para comenzar.</p>
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <Card className="w-full max-w-xl shadow-2xl animate-scaleIn overflow-hidden border-0">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-6 text-white relative">
              <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"><Trash2 size={20} className="rotate-45" /></button>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md"><CalendarDays size={24} /></div>
                <div>
                  <h2 className="text-xl font-black">{isEditing ? 'Editar Entregable' : 'Nueva Tarea / Entregable'}</h2>
                  <p className="text-emerald-100 text-xs font-medium uppercase tracking-widest mt-1">Gestión de cronograma operativo</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-white space-y-5 max-h-[70vh] overflow-y-auto scrollbar-thin">
              <Input label="Título de la Tarea / Entregable" value={formData.titulo} onChange={(e) => setFormData({...formData, titulo: e.target.value})} required />
              <div className="grid grid-cols-2 gap-4">
                <Select 
                  label="Fase del Proyecto" 
                  options={['Fase I', 'Fase II', 'Fase III', 'Fase Final'].map(f => ({value: f, label: f}))}
                  value={formData.fase}
                  onChange={(val) => setFormData({...formData, fase: selectValue(val)})}
                />
                <Input 
                  label="Fecha Límite" 
                  type="date" 
                  value={formData.fecha_entrega} 
                  onChange={(e) => setFormData({...formData, fecha_entrega: e.target.value})} 
                />
              </div>
              <Select 
                label="Proyecto Vinculado" 
                options={proyectos.map(p => ({value: p.id, label: p.nombre_corto || p.nombre}))}
                value={formData.proyecto_id}
                onChange={(val) => setFormData({...formData, proyecto_id: selectValue(val)})}
                required
              />
              <TextArea label="Instrucciones / Descripción" value={formData.descripcion} onChange={(e) => setFormData({...formData, descripcion: e.target.value})} rows={4} />
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="sena" onClick={handleSubmit}>
                {isEditing ? 'Guardar Cambios' : 'Agendar Entregable'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CronogramaModule;
