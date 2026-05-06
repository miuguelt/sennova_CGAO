import React, { useState, useEffect } from 'react';
import { 
  Calendar, MapPin, FileText, CheckCircle, 
  Clock, Plus, Search, Filter, ArrowUpRight,
  MoreVertical, Edit, Trash2, ExternalLink
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { ConvocatoriasAPI } from '../../api/convocatorias';

const StatusBadge = ({ status }) => {
  const configs = {
    'abierta': { color: 'bg-emerald-100 text-emerald-700', label: 'Abierta', icon: CheckCircle },
    'cerrada': { color: 'bg-slate-100 text-slate-700', label: 'Cerrada', icon: Clock },
    'en_evaluacion': { color: 'bg-amber-100 text-amber-700', label: 'En Evaluación', icon: Search },
    'resultados_publicados': { color: 'bg-blue-100 text-blue-700', label: 'Resultados', icon: FileText }
  };
  
  const config = configs[status] || { color: 'bg-slate-100 text-slate-700', label: status };
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${config.color}`}>
      {Icon && <Icon size={12} />}
      {config.label}
    </span>
  );
};

const ConvocatoriaCard = ({ convocatoria, onEdit, onDelete }) => {
  const daysLeft = () => {
    if (!convocatoria.fecha_cierre) return null;
    const diff = new Date(convocatoria.fecha_cierre) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const dl = daysLeft();

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 border-l-4 border-l-emerald-500">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <StatusBadge status={convocatoria.estado} />
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(convocatoria)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors">
              <Edit size={16} />
            </button>
            <button onClick={() => onDelete(convocatoria.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors">
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
            <span>OE: {convocatoria.numero_oe}</span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-xs font-medium">
            <span className="text-slate-400 uppercase tracking-wider">Fecha Cierre</span>
            <span className={dl > 0 && dl <= 15 ? 'text-amber-600' : 'text-slate-700'}>
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
              {convocatoria.total_proyectos}
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
  const [filter, setFilter] = useState({ estado: '', año: '' });
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await ConvocatoriasAPI.list();
      setConvocatorias(data);
    } catch (err) {
      onNotify('Error al cargar convocatorias', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredConvocatorias = convocatorias.filter(c => {
    const matchesSearch = (c.nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.numero_oe || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filter.estado ? c.estado === filter.estado : true;
    const matchesAño = filter.año ? c.año.toString() === filter.año : true;
    return matchesSearch && matchesEstado && matchesAño;
  });

  const years = [...new Set(convocatorias.map(c => c.año))].sort((a, b) => b - a);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-500 animate-spin"></div>
          <p className="text-slate-500 font-medium">Cargando convocatorias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Convocatorias</h1>
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
            <option value="abierta">Abierta</option>
            <option value="cerrada">Cerrada</option>
            <option value="en_evaluacion">En Evaluación</option>
            <option value="resultados_publicados">Resultados</option>
          </select>

          {currentUser?.rol === 'admin' && (
            <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
              <Plus size={18} className="mr-2" /> Nueva Convocatoria
            </Button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filteredConvocatorias.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredConvocatorias.map((c) => (
            <ConvocatoriaCard key={c.id} convocatoria={c} onEdit={(c) => console.log('Edit', c)} onDelete={(id) => console.log('Delete', id)} />
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center border-dashed border-2 border-slate-200 bg-slate-50/50">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mx-auto mb-4 border border-slate-100">
            <Filter size={32} className="text-slate-300" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No se encontraron convocatorias</h3>
          <p className="text-slate-500 mt-1 max-w-xs mx-auto">Prueba ajustando los filtros o el término de búsqueda.</p>
          <Button variant="outline" className="mt-6" onClick={() => { setSearchTerm(''); setFilter({ estado: '', año: '' }); }}>
            Limpiar filtros
          </Button>
        </Card>
      )}
    </div>
  );
};

export default ConvocatoriasModule;
