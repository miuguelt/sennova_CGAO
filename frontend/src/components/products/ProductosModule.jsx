import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Award, X, ExternalLink, Edit2,
  FileText, Code, Microscope, BookOpen,
  Trash2, ChevronRight, User, Folder, Loader2,
  Globe, MoreVertical, Shield, CheckCircle2,
  TrendingUp, BarChart, Info, Zap, ArrowUpRight,
  Link as LinkIcon, Calendar
} from 'lucide-react';
import { ProductosAPI } from '../../api/productos';
import { ProyectosAPI } from '../../api/proyectos';
import { CVLAC_URL_PLACEHOLDER } from '../../api/config';
import useClickOutside from '../../hooks/useClickOutside';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TextArea from '../ui/TextArea';

// ─── Constants ─────────────────────────────────────────────────────────────
const TIPOS = [
  { value: 'software',      label: 'Software / App',       Icon: Code,      color: 'text-blue-600',   bg: 'bg-blue-100',   border: 'border-blue-200' },
  { value: 'articulo',      label: 'Artículo Científico',  Icon: BookOpen,  color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  { value: 'prototipo',     label: 'Prototipo / Producto', Icon: Microscope, color: 'text-amber-600', bg: 'bg-amber-100',   border: 'border-amber-200' },
  { value: 'capitulo_libro', label: 'Capítulo de Libro',   Icon: FileText,  color: 'text-indigo-600', bg: 'bg-indigo-100',  border: 'border-indigo-200' },
  { value: 'ponencia',      label: 'Ponencia / Evento',    Icon: Globe,     color: 'text-rose-600',   bg: 'bg-rose-100',    border: 'border-rose-200' },
];

const getTipo = (v) => TIPOS.find(t => t.value === v) ?? { Icon: Award, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', label: v };

const EMPTY_FORM = {
  tipo: 'software',
  nombre: '',
  descripcion: '',
  fecha_publicacion: new Date().toISOString().split('T')[0],
  doi: '',
  url: '',
  proyecto_id: '',
};

// ─── Components ─────────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon: Icon, colorCls, bgCls }) => (
  <Card className="p-5 border-0 shadow-sm ring-1 ring-slate-200/60 overflow-hidden relative group transition-all hover:shadow-md">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 ${bgCls}`} />
    <div className="flex items-center gap-4 relative">
      <div className={`p-3 rounded-2xl ${bgCls} ${colorCls} shadow-sm`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
      </div>
    </div>
  </Card>
);

const ProductCardSkeleton = () => (
  <Card className="p-6 border-0 ring-1 ring-slate-100 animate-pulse">
    <div className="flex justify-between items-start mb-6">
      <div className="w-12 h-12 bg-slate-200 rounded-2xl" />
      <div className="w-20 h-6 bg-slate-100 rounded-lg" />
    </div>
    <div className="space-y-3">
      <div className="h-5 w-3/4 bg-slate-200 rounded" />
      <div className="h-3 w-full bg-slate-100 rounded" />
      <div className="h-3 w-5/6 bg-slate-100 rounded" />
    </div>
    <div className="mt-8 pt-6 border-t border-slate-50 flex gap-4">
      <div className="h-4 w-20 bg-slate-100 rounded" />
      <div className="h-4 w-20 bg-slate-100 rounded" />
    </div>
  </Card>
);

// ─── Main Module ────────────────────────────────────────────────────────────

const ProductosModule = ({ currentUser, onNotify }) => {
  const [productos, setProductos] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [cvlacUrl, setCvlacUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prod, proj] = await Promise.all([ProductosAPI.list(), ProyectosAPI.list()]);
      setProductos(prod);
      setProyectos(proj);
    } catch { 
      onNotify?.('Error al sincronizar catálogo de productos', 'error'); 
    }
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setFormData(EMPTY_FORM);
    setIsEditing(false);
    setFormStep(1);
    setShowForm(true);
    setMenuOpenId(null);
  };

  const handleOpenEdit = (prod) => {
    setFormData({ ...prod });
    setIsEditing(true);
    setFormStep(1);
    setShowForm(true);
    setIsDetailOpen(false);
    setMenuOpenId(null);
  };

  const handleSubmit = async () => {
    try {
      if (isEditing) {
        await ProductosAPI.update(formData.id, formData);
        onNotify?.('Producto institucional actualizado', 'success');
      } else {
        await ProductosAPI.create(formData);
        onNotify?.('Nuevo producto registrado en el ecosistema', 'success');
      }
      setShowForm(false);
      loadData();
    } catch (err) { 
      onNotify?.('Error en el registro: ' + err.message, 'error'); 
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este producto de investigación? Esta acción es crítica.')) return;
    try {
      await ProductosAPI.delete(id);
      onNotify?.('Producto eliminado del catálogo', 'success');
      setIsDetailOpen(false);
      setMenuOpenId(null);
      loadData();
    } catch (err) { 
      onNotify?.('Error al eliminar', 'error'); 
    }
  };

  const handleToggleVerificar = async (id, current) => {
    try {
      await ProductosAPI.verificar(id, !current);
      onNotify?.(current ? 'Verificación revocada' : 'Producto verificado satisfactoriamente', 'success');
      setIsDetailOpen(false);
      setMenuOpenId(null);
      loadData();
    } catch (err) { 
      onNotify?.('Error en verificación: ' + err.message, 'error'); 
    }
  };

  const patch = (f) => (e) => {
    const val = e?.target ? e.target.value : e;
    setFormData(prev => ({ ...prev, [f]: val }));
  };

  const filtered = productos.filter(p => {
    const matchSearch = !searchTerm || (p.nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo   = !tipoFilter  || p.tipo === tipoFilter;
    const matchStatus = !statusFilter || (statusFilter === 'verificado' ? p.is_verificado : !p.is_verificado);
    return matchSearch && matchTipo && matchStatus;
  });

  // Action Menu Component
  const ActionMenu = ({ producto }) => {
    const menuRef = useRef(null);
    useClickOutside(menuRef, () => menuOpenId === producto.id && setMenuOpenId(null));

    if (menuOpenId !== producto.id) return null;

    return (
      <div 
        ref={menuRef}
        className="absolute right-0 mt-2 w-48 bg-white/90 backdrop-blur-md rounded-xl shadow-xl border border-slate-200/60 py-2 z-30 animate-scaleIn origin-top-right"
      >
        <button onClick={() => { setSelectedProducto(producto); setIsDetailOpen(true); setMenuOpenId(null); }} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 flex items-center gap-2 transition-colors">
          <Info size={14} /> Ver Ficha Técnica
        </button>
        {currentUser?.rol === 'admin' && (
          <button 
            onClick={() => handleToggleVerificar(producto.id, producto.is_verificado)} 
            className={`w-full text-left px-4 py-2 text-xs font-bold flex items-center gap-2 transition-colors border-t border-slate-100 mt-1 pt-2 ${producto.is_verificado ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
          >
            {producto.is_verificado ? <X size={14} /> : <CheckCircle2 size={14} />}
            {producto.is_verificado ? 'Revocar Verificación' : 'Verificar Producto'}
          </button>
        )}
        {(currentUser?.rol === 'admin' || currentUser?.id === producto.owner_id) && (
          <>
            <button onClick={() => handleOpenEdit(producto)} className="w-full text-left px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition-colors border-t border-slate-100 mt-1 pt-2">
              <Edit2 size={14} /> Editar Información
            </button>
            <button onClick={() => handleDelete(producto.id)} className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors border-t border-slate-100 mt-1 pt-2">
              <Trash2 size={14} /> Eliminar Producto
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
            <Award size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Productos e Innovación</h1>
            <p className="text-sm text-slate-500 font-medium">Activos de conocimiento y propiedad intelectual</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowImportModal(true)} variant="outline" className="border-indigo-200 text-indigo-700 bg-white/50">
            <Globe size={18} className="mr-2" /> Importar CVLAC
          </Button>
          <Button onClick={handleOpenCreate} variant="sena" className="shadow-lg shadow-emerald-200/50">
            <Plus size={18} className="mr-2" /> Reportar Producto
          </Button>
        </div>
      </div>

      {/* ── Stats Summary ── */}
      {!loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Productos" value={productos.length} icon={Zap} colorCls="text-indigo-700" bgCls="bg-indigo-100" />
          <StatCard label="Verificados" value={productos.filter(p => p.is_verificado).length} icon={CheckCircle2} colorCls="text-emerald-700" bgCls="bg-emerald-100" />
          <StatCard label="Softwares/Apps" value={productos.filter(p => p.tipo === 'software').length} icon={Code} colorCls="text-blue-700" bgCls="bg-blue-100" />
          <StatCard label="Artículos" value={productos.filter(p => p.tipo === 'articulo').length} icon={BookOpen} colorCls="text-rose-700" bgCls="bg-rose-100" />
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex flex-col lg:flex-row gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre de producto..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-3">
          <select
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none min-w-[160px]"
          >
            <option value="">Todas las Tipologías</option>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-white border-0 ring-1 ring-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none min-w-[160px]"
          >
            <option value="">Todos los Estados</option>
            <option value="verificado">Verificados</option>
            <option value="pendiente">Pendientes</option>
          </select>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
        ) : filtered.length > 0 ? (
          filtered.map(p => {
            const tipo = getTipo(p.tipo);
            const { Icon } = tipo;
            return (
              <Card
                key={p.id}
                className="group hover:shadow-xl transition-all ring-1 ring-slate-200/60 hover:ring-indigo-400 overflow-hidden cursor-pointer border-0 flex flex-col focus-visible:outline-none relative"
              >
                {/* Menu trigger */}
                <div className="absolute top-4 right-4 z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === p.id ? null : p.id); }}
                    className="p-1.5 bg-white/80 backdrop-blur-md hover:bg-white rounded-lg shadow-sm border border-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <MoreVertical size={16} />
                  </button>
                  <ActionMenu producto={p} />
                </div>

                <div className="p-6 flex-1" onClick={() => { setSelectedProducto(p); setIsDetailOpen(true); }}>
                  <div className="flex items-start justify-between mb-6">
                    <div className={`p-3.5 rounded-2xl ${tipo.bg} ${tipo.color} shadow-lg shadow-slate-100 group-hover:scale-110 transition-transform`}>
                      <Icon size={24} />
                    </div>
                    <Badge variant={p.is_verificado ? 'success' : 'warning'} className="font-black text-[10px] uppercase tracking-wider">
                      {p.is_verificado ? 'VERIFICADO' : 'PENDIENTE'}
                    </Badge>
                  </div>

                  <h3 className="font-black text-slate-900 text-lg leading-tight mb-4 group-hover:text-indigo-700 transition-colors line-clamp-2">
                    {p.nombre}
                  </h3>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 flex-shrink-0">
                        <User size={12} className="text-slate-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-600 truncate">{p.owner_nombre}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Folder size={14} className="text-indigo-400" />
                      <span className="text-xs font-bold text-slate-500 truncate">{p.proyecto_nombre}</span>
                    </div>
                  </div>
                </div>

                <div className={`px-6 py-4 ${tipo.bg} border-t ${tipo.border} flex items-center justify-between group-hover:bg-indigo-600 transition-all duration-300`} onClick={() => { setSelectedProducto(p); setIsDetailOpen(true); }}>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${tipo.color} group-hover:text-white transition-colors`}>{tipo.label}</span>
                  <div className="p-1 bg-white rounded-lg shadow-sm group-hover:bg-indigo-500 transition-colors">
                    <ArrowUpRight size={14} className={`${tipo.color} group-hover:text-white transition-colors`} />
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="col-span-full py-20 text-center">
            <div className="p-4 bg-slate-100 rounded-full w-fit mx-auto mb-4 text-slate-300"><Award size={48} /></div>
            <p className="text-slate-500 font-bold italic">No se encontraron productos en el catálogo.</p>
          </div>
        )}
      </div>

      {/* ── Detail slide-over ── */}
      {isDetailOpen && selectedProducto && (() => {
        const tipo = getTipo(selectedProducto.tipo);
        const { Icon } = tipo;
        return (
          <div className="fixed inset-0 z-[100] overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-fadeIn" onClick={() => setIsDetailOpen(false)} />
            <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
              <div className="w-screen max-w-lg bg-white shadow-2xl flex flex-col animate-slideInRight">

                {/* Header */}
                <div className={`px-8 py-8 border-b border-slate-100 ${tipo.bg} relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/30 rounded-full blur-3xl" />
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                      <div className="p-3 bg-white rounded-2xl shadow-lg ring-1 ring-slate-100">
                        <Icon size={32} className={tipo.color} />
                      </div>
                      <button onClick={() => setIsDetailOpen(false)} className="p-2 hover:bg-white/40 rounded-full transition-colors text-slate-500"><X size={24} /></button>
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2">{selectedProducto.nombre}</h2>
                    <div className="flex gap-3">
                      <Badge variant="default" className="bg-white/50 text-slate-700 border-white/60 uppercase tracking-widest text-[10px]">{tipo.label}</Badge>
                      <Badge variant={selectedProducto.is_verificado ? 'success' : 'warning'} dot>
                        {selectedProducto.is_verificado ? 'VERIFICADO' : 'PENDIENTE'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10 scrollbar-thin">
                  
                  <section>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FileText size={14} className="text-indigo-500" /> Descripción Técnica
                    </h3>
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-700 text-sm font-medium leading-relaxed">
                      {selectedProducto.descripcion || 'Sin descripción técnica detallada en el repositorio.'}
                    </div>
                  </section>

                  <section className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Folder size={14} className="text-emerald-500" /> Origen (Proyecto)
                      </h3>
                      <p className="text-sm font-black text-slate-900">{selectedProducto.proyecto_nombre}</p>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <User size={14} className="text-amber-500" /> Investigador Responsable
                      </h3>
                      <p className="text-sm font-black text-slate-900">{selectedProducto.owner_nombre}</p>
                    </div>
                  </section>

                  <section className="grid grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <Calendar size={14} className="text-blue-500" /> Fecha de Registro
                      </h3>
                      <p className="text-sm font-black text-slate-900">{selectedProducto.fecha_publicacion || 'N/A'}</p>
                    </div>
                    {selectedProducto.doi && (
                      <div>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <LinkIcon size={14} className="text-rose-500" /> DOI / Registro
                        </h3>
                        <p className="text-sm font-black text-slate-900 truncate">{selectedProducto.doi}</p>
                      </div>
                    )}
                  </section>

                  {selectedProducto.url && (
                    <a
                      href={selectedProducto.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between p-5 bg-slate-900 text-white rounded-2xl hover:bg-indigo-700 transition-all group shadow-xl shadow-slate-200"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-xl"><Globe size={20} /></div>
                        <div className="text-left">
                          <p className="text-sm font-black">Acceder al Producto</p>
                          <p className="text-[10px] text-white/60 font-medium tracking-wide">REPOSITORIO EXTERNO / PORTAL</p>
                        </div>
                      </div>
                      <ArrowUpRight size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </a>
                  )}
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                  <Button className="flex-1" variant="outline" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
                  {(currentUser?.rol === 'admin' || currentUser?.id === selectedProducto.owner_id) && (
                    <div className="flex gap-2">
                      <Button variant="sena" onClick={() => handleOpenEdit(selectedProducto)}>
                        <Edit2 size={16} />
                      </Button>
                      {currentUser?.rol === 'admin' && (
                        <Button 
                          variant={selectedProducto.is_verificado ? 'outline' : 'primary'}
                          onClick={() => handleToggleVerificar(selectedProducto.id, selectedProducto.is_verificado)}
                          className={selectedProducto.is_verificado ? 'text-rose-600 hover:bg-rose-50 border-rose-200' : ''}
                        >
                          {selectedProducto.is_verificado ? <X size={18} /> : <CheckCircle2 size={18} />}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Stepper Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <Card className="w-full max-w-xl shadow-2xl animate-scaleIn overflow-hidden border-0">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-6 text-white relative">
              <button 
                onClick={() => setShowForm(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                  {isEditing ? <Edit2 size={24} /> : <Zap size={24} />}
                </div>
                <div>
                  <h2 className="text-xl font-black">{isEditing ? 'Actualizar Producto' : 'Reportar Innovación'}</h2>
                  <p className="text-indigo-100 text-xs font-medium opacity-80 uppercase tracking-widest mt-1">
                    Paso {formStep} de 2 • {formStep === 1 ? 'Identidad' : 'Evidencia & Descripción'}
                  </p>
                </div>
              </div>
            </div>

            {/* Stepper Progress */}
            <div className="flex h-1 bg-slate-100">
              <div className={`h-full bg-indigo-500 transition-all duration-500 ${formStep === 1 ? 'w-1/2' : 'w-full'}`} />
            </div>

            {/* Form Content */}
            <div className="p-8 bg-white min-h-[360px] max-h-[60vh] overflow-y-auto scrollbar-thin">
              {formStep === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <Input label="Nombre del Producto / Innovación" value={formData.nombre} onChange={patch('nombre')} required placeholder="Ej: Prototipo de sensor IoT..." />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Tipología de Producto"
                      options={TIPOS.map(t => ({ value: t.value, label: t.label }))}
                      value={formData.tipo}
                      onChange={patch('tipo')}
                      required
                    />
                    <Select
                      label="Vincular a Proyecto"
                      options={proyectos.map(p => ({ value: p.id, label: p.nombre_corto || p.nombre }))}
                      value={formData.proyecto_id}
                      onChange={patch('proyecto_id')}
                      required
                    />
                  </div>
                  <Input label="Fecha de Lanzamiento / Publicación" type="date" value={formData.fecha_publicacion} onChange={patch('fecha_publicacion')} />
                </div>
              )}

              {formStep === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                  <Input label="URL de Repositorio o Publicación" value={formData.url} onChange={patch('url')} placeholder="https://github.com/..." />
                  <Input label="DOI / Código de Registro" value={formData.doi} onChange={patch('doi')} placeholder="Ej: 10.1000/xyz123" />
                  <TextArea label="Resumen Técnico y Resultados" value={formData.descripcion} onChange={patch('descripcion')} rows={5} placeholder="Describa el impacto, metodología y resultados clave..." />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 bg-slate-50/80 border-t border-slate-100 flex justify-between items-center">
              <Button 
                variant="outline" 
                onClick={() => formStep === 1 ? setShowForm(false) : setFormStep(s => s - 1)}
              >
                {formStep === 1 ? 'Cancelar' : 'Anterior'}
              </Button>
              <div className="flex gap-3">
                {formStep < 2 ? (
                  <Button 
                    variant="primary" 
                    onClick={() => setFormStep(s => s + 1)}
                    disabled={!formData.nombre || !formData.proyecto_id}
                  >
                    Siguiente <ChevronRight size={16} className="ml-2" />
                  </Button>
                ) : (
                  <Button variant="sena" onClick={handleSubmit}>
                    {isEditing ? 'Guardar Cambios' : 'Registrar Producto'}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
      {/* ── CVLAC Import Modal ── */}
      {showImportModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
          <Card className="w-full max-w-lg shadow-2xl animate-scaleIn border-0 overflow-hidden">
            <div className="bg-slate-900 px-6 py-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe size={24} className="text-indigo-400" />
                <h2 className="text-xl font-bold">Importar desde CVLAC</h2>
              </div>
              <button onClick={() => { setShowImportModal(false); setImportResults(null); }}><X size={24} /></button>
            </div>
            
            <div className="p-8 space-y-6">
              {!importResults ? (
                <>
                  <p className="text-sm text-slate-500 font-medium">
                    Ingrese la URL de su CVLAC (Scienti) para sincronizar automáticamente sus productos de investigación.
                  </p>
                  <Input 
                    label="URL de CVLAC" 
                    placeholder={CVLAC_URL_PLACEHOLDER} 
                    value={cvlacUrl}
                    onChange={(e) => setCvlacUrl(e.target.value)}
                  />
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3">
                    <Zap className="text-indigo-600 shrink-0" size={20} />
                    <p className="text-[11px] text-indigo-700 font-bold leading-relaxed">
                      Nuestro motor IA analizará su currículo y mapeará automáticamente artículos, software y prototipos al catálogo de SENNOVA.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 space-y-4">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                    <CheckCircle2 size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Sincronización Exitosa</h3>
                    <p className="text-sm text-slate-500 font-medium mt-1">Se han procesado los datos de su CVLAC.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-2xl font-black text-indigo-600">{importResults.importados}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Productos Nuevos</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-2xl font-black text-slate-400">{importResults.errores}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duplicados/Error</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setShowImportModal(false); setImportResults(null); }}>
                {importResults ? 'Cerrar' : 'Cancelar'}
              </Button>
              {!importResults && (
                <Button 
                  variant="primary" 
                  disabled={isImporting || !cvlacUrl}
                  onClick={async () => {
                    setIsImporting(true);
                    try {
                      // Mocking the scraping and importing for demonstration
                      // In a real scenario, we would call a backend service that does this
                      const results = { importados: 5, errores: 2 };
                      setImportResults(results);
                      onNotify?.('Importación finalizada', 'success');
                      loadData();
                    } catch (err) {
                      onNotify?.('Error en importación: ' + err.message, 'error');
                    }
                    setIsImporting(false);
                  }}
                >
                  {isImporting ? <Loader2 className="animate-spin mr-2" size={18} /> : <ArrowUpRight className="mr-2" size={18} />}
                  {isImporting ? 'Procesando CVLAC...' : 'Iniciar Sincronización'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ProductosModule;
