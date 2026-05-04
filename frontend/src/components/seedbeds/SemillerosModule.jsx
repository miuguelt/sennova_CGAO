import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Plus, Search, Filter, 
  Users, BookOpen, Clock, ChevronRight,
  UserPlus, Trash2, Edit, ExternalLink
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { SemillerosAPI } from '../../api/semilleros';
import { GruposAPI } from '../../api/grupos';

const SemilleroCard = ({ semillero, onEdit, onAddAprendiz }) => (
  <Card className="group hover:shadow-xl transition-all duration-300">
    <div className="p-6">
      <div className="flex justify-between items-start mb-4">
        <Badge variant={semillero.estado === 'activo' ? 'success' : 'warning'}>
          {semillero.estado === 'activo' ? 'Activo' : 'Inactivo'}
        </Badge>
        <span className="text-xs font-bold text-slate-400">#{semillero.id.slice(0, 8)}</span>
      </div>

      <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors mb-2">
        {semillero.nombre}
      </h3>
      
      <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <Users size={14} />
        <span>Grupo: {semillero.grupo?.nombre || 'No asignado'}</span>
      </div>

      <p className="text-sm text-slate-600 line-clamp-2 mb-6 h-10">
        {semillero.linea_investigacion || 'Sin línea de investigación definida.'}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Aprendices</p>
          <p className="text-xl font-bold text-slate-900">{semillero.total_aprendices || 0}</p>
        </div>
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dedicación</p>
          <p className="text-xl font-bold text-slate-900">{semillero.horas_dedicadas || 0}h</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="flex -space-x-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-500">
              U{i}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onEdit(semillero)}>
            <Edit size={14} />
          </Button>
          <Button variant="primary" size="sm" className="h-8 text-xs font-bold" onClick={() => onAddAprendiz(semillero.id)}>
            <UserPlus size={14} className="mr-1.5" /> Vincular
          </Button>
        </div>
      </div>
    </div>
  </Card>
);

const SemillerosModule = ({ onNotify }) => {
  const [semilleros, setSemilleros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSemillero, setSelectedSemillero] = useState(null);
  const [aprendizForm, setAprendizForm] = useState({
    nombre: '',
    documento: '',
    email: '',
    programa_formacion: '',
    ficha: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await SemillerosAPI.list();
      setSemilleros(data);
    } catch (err) {
      onNotify('Error al cargar semilleros', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddAprendiz = (semilleroId) => {
    setSelectedSemillero(semilleroId);
    setAprendizForm({ nombre: '', documento: '', email: '', programa_formacion: '', ficha: '' });
    setShowModal(true);
  };

  const saveAprendiz = async () => {
    if (!aprendizForm.nombre || !aprendizForm.documento) {
      onNotify('Por favor complete los campos obligatorios', 'warning');
      return;
    }
    try {
      await SemillerosAPI.addAprendiz(selectedSemillero, aprendizForm);
      onNotify('Aprendiz vinculado exitosamente', 'success');
      setShowModal(false);
      loadData();
    } catch (err) {
      onNotify('Error al vincular aprendiz', 'error');
    }
  };

  const filteredSemilleros = semilleros.filter(s => 
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.grupo?.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-slate-100 rounded-2xl"></div>)}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex gap-5 items-center">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <GraduationCap size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Semilleros de Investigación</h1>
              <p className="text-slate-500 mt-1">Fortaleciendo la formación técnica y tecnológica a través de la ciencia.</p>
            </div>
          </div>
          <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 h-12 px-6">
            <Plus size={20} className="mr-2" /> Crear Semillero
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar semillero por nombre o grupo..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="rounded-xl">
            <Filter size={18} className="mr-2" /> Filtros Avanzados
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredSemilleros.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSemilleros.map(s => (
            <SemilleroCard 
              key={s.id} 
              semillero={s} 
              onEdit={() => {}} 
              onAddAprendiz={handleAddAprendiz} 
            />
          ))}
        </div>
      ) : (
        <Card className="p-20 text-center border-dashed border-2 bg-slate-50/50">
          <div className="bg-white w-20 h-20 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-6">
            <BookOpen size={40} className="text-slate-200" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No hay semilleros registrados</h3>
          <p className="text-slate-500 mt-2 max-w-sm mx-auto">Comienza creando tu primer semillero de investigación para vincular aprendices y dinamizar el conocimiento.</p>
          <Button variant="primary" className="mt-8">Crear mi primer Semillero</Button>
        </Card>
      )}

      {/* Modal Vincular Aprendiz */}
      {showModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <Card className="w-full max-w-lg shadow-2xl animate-scaleIn border-0 overflow-hidden">
            <div className="bg-emerald-600 px-6 py-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserPlus size={24} />
                <h2 className="text-xl font-bold">Vincular Nuevo Aprendiz</h2>
              </div>
              <button onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            <div className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Nombre Completo</label>
                  <input 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={aprendizForm.nombre}
                    onChange={(e) => setAprendizForm({...aprendizForm, nombre: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Documento</label>
                  <input 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={aprendizForm.documento}
                    onChange={(e) => setAprendizForm({...aprendizForm, documento: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</label>
                <input 
                  type="email"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  value={aprendizForm.email}
                  onChange={(e) => setAprendizForm({...aprendizForm, email: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Programa de Formación</label>
                  <input 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={aprendizForm.programa_formacion}
                    onChange={(e) => setAprendizForm({...aprendizForm, programa_formacion: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Ficha</label>
                  <input 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    value={aprendizForm.ficha}
                    onChange={(e) => setAprendizForm({...aprendizForm, ficha: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end gap-3 border-t">
              <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
              <Button variant="primary" className="bg-emerald-600 hover:bg-emerald-700" onClick={saveAprendiz}>Vincular Aprendiz</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SemillerosModule;
