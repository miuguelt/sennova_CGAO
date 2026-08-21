import React, { useState, useEffect, useRef } from 'react';
import {
  Plus, Search, Award, X, ExternalLink, Edit2,
  FileText, Code, Microscope, BookOpen,
  Trash2, ChevronRight, User, Users, Folder, Loader2,
  Globe, MoreVertical, Shield, CheckCircle2,
  TrendingUp, BarChart, Info, Zap, ArrowUpRight,
  Link as LinkIcon, Calendar, UploadCloud
} from 'lucide-react';
import { ProductosAPI } from '../../api/productos';
import { ProyectosAPI } from '../../api/proyectos';
import { DocumentosAPI } from '../../api/documentos';
import { CVLAC_URL_PLACEHOLDER } from '../../api/config';
import useClickOutside from '../../hooks/useClickOutside';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import EmptyState from '../ui/EmptyState';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TextArea from '../ui/TextArea';
import Modal from '../ui/Modal';
import Drawer from '../ui/Drawer';
import ConfirmDialog from '../ui/ConfirmDialog';


// ─── Tipología Minciencias ──────────────────────────────────────────────────
// Categoría A: Generación de Nuevo Conocimiento
const CATEGORIA_A = [
  { value: 'A1', label: 'A1 · Artículo en revista indexada (Q1-Q4)', Icon: BookOpen, color: 'text-blue-700',   bg: 'bg-blue-100',   border: 'border-blue-200',
    requisitos: ['Publicado en revista con ISSN', 'Indexada en Scopus, WoS o SJR', 'DOI registrado', 'Afiliación institucional SENA visible', 'Acceso abierto o repositorio'] },
  { value: 'A2', label: 'A2 · Libro resultado de investigación', Icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
    requisitos: ['ISBN registrado', 'Editorial con comité editorial', 'Proceso de evaluación por pares', 'Afiliación SENA en portada'] },
  { value: 'A3', label: 'A3 · Capítulo de libro resultado de investigación', Icon: FileText, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200',
    requisitos: ['ISBN del libro', 'Evaluación por pares del capítulo', 'DOI o URL del capítulo', 'Afiliación SENA del autor'] },
  { value: 'A4', label: 'A4 · Patente de invención', Icon: Award, color: 'text-violet-600', bg: 'bg-violet-100', border: 'border-violet-200',
    requisitos: ['Número de solicitud o concesión', 'Titular: SENA o investigador SENA', 'Fecha de solicitud oficial', 'Certificado SIC o entidad competente'] },
];

// Categoría B: Desarrollo Tecnológico e Innovación
const CATEGORIA_B = [
  { value: 'B1', label: 'B1 · Software (Registro de derechos de autor)', Icon: Code, color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200',
    requisitos: ['Registro DNDA o certificado', 'Documentación técnica del software', 'Funcionamiento demostrable', 'Contrato/acta de propiedad intelectual SENA'] },
  { value: 'B2', label: 'B2 · Planta piloto / Prototipo industrial', Icon: Microscope, color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200',
    requisitos: ['Informe técnico del prototipo', 'Pruebas de funcionamiento documentadas', 'Memoria descriptiva', 'Evaluación de impacto'] },
  { value: 'B3', label: 'B3 · Diseño industrial (Registro)', Icon: Code, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100',
    requisitos: ['Registro SIC o equivalente', 'Planos o especificaciones técnicas', 'Titular: SENA'] },
  { value: 'B6', label: 'B6 · Innovación en procesos/servicios', Icon: Zap, color: 'text-teal-700', bg: 'bg-teal-100', border: 'border-teal-200',
    requisitos: ['Informe de implementación', 'Evidencia de adopción por empresa/organización', 'Análisis de impacto documentado'] },
];

// Categoría C: Apropiación Social del Conocimiento
const CATEGORIA_C = [
  { value: 'C1', label: 'C1 · Evento científico (organización)', Icon: Globe, color: 'text-rose-700', bg: 'bg-rose-100', border: 'border-rose-200',
    requisitos: ['Informe del evento con asistentes', 'Programa oficial del evento', 'Memorias o publicación', 'Evidencia fotográfica'] },
  { value: 'C2', label: 'C2 · Ponencia en evento (con memorias)', Icon: Globe, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100',
    requisitos: ['Certificado de participación como ponente', 'Carta de aceptación del evento', 'Memorias o ISBN del evento', 'Afiliación SENA en el resumen'] },
  { value: 'C4', label: 'C4 · Curso / Diplomado de extensión', Icon: BookOpen, color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-200',
    requisitos: ['Programa curricular del curso', 'Lista de asistentes certificados', 'Acta de apertura y cierre', 'Evaluación de satisfacción'] },
  { value: 'C6', label: 'C6 · Producción técnica (normas, mapas, BD)', Icon: FileText, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100',
    requisitos: ['Documento técnico completo', 'Entidad adoptante', 'Fecha de publicación o adopción'] },
];

// Categoría D: Formación de Recursos Humanos
const CATEGORIA_D = [
  { value: 'D1', label: 'D1 · Trabajo de grado (pregrado/maestría)', Icon: Award, color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-200',
    requisitos: ['Acta de grado o certificado', 'Título de la tesis', 'Vinculación al proyecto SENNOVA', 'Nombre del director/asesor'] },
  { value: 'D2', label: 'D2 · Proyectos de Etapa Productiva SENA', Icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100',
    requisitos: ['Formato de etapa productiva diligenciado', 'Informe del aprendiz', 'Evaluación del instructor', 'Acta de inicio y fin'] },
  { value: 'D3', label: 'D3 · Jóvenes Investigadores', Icon: Users, color: 'text-pink-700', bg: 'bg-pink-100', border: 'border-pink-200',
    requisitos: ['Contrato o acuerdo formalizado', 'Actas de seguimiento mensuales', 'Informe de actividades', 'Certificado de participación'] },
];

const TODOS_TIPOS = [...CATEGORIA_A, ...CATEGORIA_B, ...CATEGORIA_C, ...CATEGORIA_D];

const CATEGORIAS_MINCIENCIAS = [
  { cat: 'A', label: 'A — Generación de Nuevo Conocimiento', tipos: CATEGORIA_A, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-500' },
  { cat: 'B', label: 'B — Desarrollo Tecnológico e Innovación', tipos: CATEGORIA_B, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-500' },
  { cat: 'C', label: 'C — Apropiación Social del Conocimiento', tipos: CATEGORIA_C, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500' },
  { cat: 'D', label: 'D — Formación de Recursos Humanos', tipos: CATEGORIA_D, color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200', dot: 'bg-purple-500' },
];

const getTipo = (v) => TODOS_TIPOS.find(t => t.value === v) ?? { Icon: Award, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', label: v, requisitos: [] };

// Tambien mantener TIPOS como alias para compatibilidad
const TIPOS = TODOS_TIPOS;

const EMPTY_FORM = {
  tipo: 'A1',
  categoria: 'A',
  nombre: '',
  descripcion: '',
  fecha_publicacion: new Date().toISOString().split('T')[0],
  doi: '',
  url: '',
  proyecto_id: '',
  año_reporte: new Date().getFullYear(),
  requisitos_cumplidos: {},
};

// ─── Components ─────────────────────────────────────────────────────────────

const StatCard = ({ label, value, icon: Icon, colorCls, bgCls }) => (
  <Card className="p-5 border border-slate-200 shadow-sm overflow-hidden relative group transition-all hover:shadow-md bg-white">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 ${bgCls}`} />
    <div className="flex items-center gap-4 relative">
      <div className={`p-3 rounded-2xl ${bgCls} ${colorCls} shadow-sm`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">{label}</p>
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

const ProductosModule = ({ currentUser, onNotify, initialAction, onActionHandled }) => {
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
  const [proyectoFilter, setProyectoFilter] = useState('');
  const [templateConfirm, setTemplateConfirm] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [cvlacUrl, setCvlacUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [isPoolVisible, setIsPoolVisible] = useState(false);
  const [dragOverId, setDragOverId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, id: null });

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (initialAction?.form === 'create') {
      handleOpenCreate();
      onActionHandled?.();
    } else if (initialAction?.form === 'view' && initialAction?.data?.id) {
      const targetId = String(initialAction.data.id);
      const found = productos.find(p => String(p.id) === targetId);
      if (found) {
        setSelectedProducto(found);
        setIsDetailOpen(true);
        onActionHandled?.();
      } else {
        ProductosAPI.get(targetId).then(p => {
          if (p) {
            setSelectedProducto(p);
            setIsDetailOpen(true);
            onActionHandled?.();
          }
        }).catch(() => {});
      }
    }
  }, [initialAction, productos, onActionHandled]);

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

  const handleDelete = (id, e) => {
    if (e) e.stopPropagation();
    setDeleteConfirm({ isOpen: true, id });
  };

  const confirmDeleteAction = async () => {
    const id = deleteConfirm.id;
    if (!id) return;
    try {
      await ProductosAPI.delete(id);
      onNotify?.('Producto eliminado del catálogo', 'success');
      setIsDetailOpen(false);
      setMenuOpenId(null);
      setDeleteConfirm({ isOpen: false, id: null });
      loadData();
    } catch (err) { 
      onNotify?.('Error al eliminar: ' + (err.message || ''), 'error'); 
    }
  };

  const handleDropProyecto = async (e, producto) => {
    e.preventDefault();
    setDragOverId(null);
    const proyectoId = e.dataTransfer.getData('proyectoId');
    if (!proyectoId) return;

    try {
      await ProductosAPI.update(producto.id, { ...producto, proyecto_id: proyectoId });
      onNotify?.('Proyecto vinculado al producto correctamente', 'success');
      loadData();
    } catch (err) {
      onNotify?.('Error al vincular proyecto', 'error');
    }
  };

  const handleToggleVerificar = async (id, current) => {
    try {
      await ProductosAPI.verificar(id, !current);
      onNotify?.(current ? 'Verificación revocada' : 'Producto verificado satisfactoriamente', 'success');
      setIsDetailOpen(false);
      setMenuOpenId(null);
      loadData();
    } catch (err) { onNotify?.('Error en verificación: ' + err.message, 'error'); }
  };

  const fileInputRefs = useRef({});

  const handleChecklistToggle = async (reqIndex, currentValue) => {
    if (!selectedProducto) return;
    const reqKey = `req_${reqIndex}`;
    const newCumplidos = { ...(selectedProducto.requisitos_cumplidos || {}), [reqKey]: !currentValue };

    try {
      const updated = await ProductosAPI.update(selectedProducto.id, {
        ...selectedProducto,
        requisitos_cumplidos: newCumplidos
      });
      setSelectedProducto(updated);
      setProductos(prev => prev.map(p => p.id === updated.id ? updated : p));
    } catch (err) {
      onNotify?.('Error al guardar requisito', 'error');
    }
  };

  const handleFileUpload = async (reqIndex, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      onNotify?.('El archivo excede los 10MB permitidos', 'error');
      return;
    }

    try {
      const uploadData = new FormData();
      uploadData.append('entidad_tipo', 'producto');
      uploadData.append('entidad_id', selectedProducto.id);
      uploadData.append('tipo', `checklist_req_${reqIndex}`);
      uploadData.append('file', file);
      
      onNotify?.('Subiendo evidencia...', 'info');
      await DocumentosAPI.upload(uploadData);
      
      // Auto check the requirement if it wasn't already checked
      const reqKey = `req_${reqIndex}`;
      if (!selectedProducto.requisitos_cumplidos?.[reqKey]) {
        await handleChecklistToggle(reqIndex, false);
      }
      
      onNotify?.('Evidencia subida exitosamente', 'success');
    } catch (err) {
      onNotify?.('Error subiendo evidencia: ' + err.message, 'error');
    }
  };

  const handleGenerateTemplate = () => {
    if (!proyectoFilter) return onNotify?.('Selecciona un proyecto para proyectar sus resultados automáticos', 'warning');
    setTemplateConfirm(proyectos.find(p => p.id === proyectoFilter) || { id: proyectoFilter, nombre: '' });
  };

  const confirmGenerateTemplate = async () => {
    setLoading(true);
    try {
      await ProductosAPI.generarDesdePlantilla(proyectoFilter);
      onNotify?.('Productos proyectados generados exitosamente', 'success');
      setTemplateConfirm(null);
      loadData();
    } catch (err) {
      onNotify?.('Error al generar plantilla: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const patch = (f) => (e) => {
    const val = e?.target ? e.target.value : e;
    setFormData(prev => ({ ...prev, [f]: val }));
  };

  const filtered = productos.filter(p =>
    (!searchTerm || (p.nombre || '').toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!tipoFilter || p.tipo === tipoFilter) &&
    (!statusFilter || (statusFilter === 'verificado' ? p.is_verificado : !p.is_verificado)) &&
    (!proyectoFilter || p.proyecto_id === proyectoFilter)
  );

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
        <Button variant="ghost" onClick={() => { setSelectedProducto(producto); setIsDetailOpen(true); setMenuOpenId(null); }} className="w-full justify-start px-4 py-2 rounded-none text-xs font-bold">
          <Info size={14} className="mr-2" /> Ver Ficha Técnica
        </Button>
        {currentUser?.rol === 'admin' && (
          <Button 
            variant="ghost"
            onClick={() => handleToggleVerificar(producto.id, producto.is_verificado)} 
            className={`w-full justify-start px-4 py-2 rounded-none text-xs font-bold border-t border-slate-100 ${producto.is_verificado ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
          >
            {producto.is_verificado ? <X size={14} className="mr-2" /> : <CheckCircle2 size={14} className="mr-2" />}
            {producto.is_verificado ? 'Revocar Verificación' : 'Verificar Producto'}
          </Button>
        )}
        {(currentUser?.rol === 'admin' || currentUser?.id === producto.owner_id) && (
          <>
            <Button variant="ghost" onClick={() => handleOpenEdit(producto)} className="w-full justify-start px-4 py-2 rounded-none text-xs font-bold text-amber-700 hover:bg-amber-50 border-t border-slate-100">
              <Edit2 size={14} className="mr-2" /> Editar Información
            </Button>
            <Button variant="ghost" onClick={(e) => handleDelete(producto.id, e)} className="w-full justify-start px-4 py-2 rounded-none text-xs font-bold text-rose-600 hover:bg-rose-50 border-t border-slate-100">
              <Trash2 size={14} className="mr-2" /> Eliminar Producto
            </Button>
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
          {proyectoFilter && filtered.length === 0 && (
            <Button onClick={handleGenerateTemplate} variant="outline" className="border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 transition-all">
              <Zap size={18} className="mr-2" /> Auto-Proyectar Resultados
            </Button>
          )}
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
          <StatCard label="Softwares / TI" value={productos.filter(p => p.tipo === 'software' || p.tipo === 'B1' || p.tipo?.toLowerCase()?.includes('software') || p.tipo?.toLowerCase()?.includes('app')).length} icon={Code} colorCls="text-blue-700" bgCls="bg-blue-100" />
          <StatCard label="Artículos / Papers" value={productos.filter(p => p.tipo === 'articulo' || p.tipo === 'A1' || p.tipo?.toLowerCase()?.includes('artículo') || p.tipo?.toLowerCase()?.includes('articulo')).length} icon={BookOpen} colorCls="text-rose-700" bgCls="bg-rose-100" />
        </div>
      )}

      {/* ── Filters & Tools ── */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white shadow-sm">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Search size={18} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar productos..." 
              className="bg-transparent border-none focus:ring-0 text-sm font-medium w-full"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none"
              value={tipoFilter}
              onChange={e => setTipoFilter(e.target.value)}
            >
              <option value="">Todas las Tipologías</option>
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <Button 
              variant="ghost" 
              size="sm" 
              className={`text-[10px] font-black uppercase tracking-widest ${isPoolVisible ? 'bg-indigo-100 text-indigo-700' : 'text-slate-400'}`}
              onClick={() => setIsPoolVisible(!isPoolVisible)}
            >
              <Folder size={14} className="mr-1.5" /> Pool Proyectos
            </Button>
            <Badge variant="indigo" className="font-bold">{filtered.length} Items</Badge>
          </div>
        </div>

        {/* Proyectos Pool */}
        {isPoolVisible && (
          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center gap-2"><Folder size={14} /> Proyectos Activos para Vincular</p>
              <span className="text-[9px] text-indigo-600 font-bold uppercase italic">Arrastra un proyecto hacia un producto</span>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {proyectos.map(p => (
                <div 
                  key={p.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('proyectoId', p.id)}
                  className="flex-shrink-0 px-4 py-2 bg-white border border-indigo-200 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-indigo-400 transition-all flex items-center gap-2"
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{p.nombre_corto || p.nombre}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
              <div
                key={p.id}
                onDragOver={(e) => { e.preventDefault(); setDragOverId(p.id); }}
                onDragLeave={() => setDragOverId(null)}
                onDrop={(e) => handleDropProyecto(e, p)}
                className={`transition-all rounded-[2rem] ${dragOverId === p.id ? 'ring-4 ring-indigo-500 scale-[1.02] shadow-2xl z-10' : ''}`}
              >
                <Card
                  className="group hover:shadow-xl transition-all ring-1 ring-slate-200/60 hover:ring-indigo-400 overflow-hidden cursor-pointer border-0 flex flex-col focus-visible:outline-none relative h-full"
                >
                  {/* Menu trigger */}
                  <div className="absolute top-4 right-4 z-10">
                  <Button 
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === p.id ? null : p.id); }}
                    className="h-8 w-8 bg-white/80 backdrop-blur-md border border-slate-100"
                  >
                    <MoreVertical size={16} />
                  </Button>
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
                {dragOverId === p.id && (
                  <div className="mt-2 px-3 py-1.5 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest text-center rounded-lg animate-pulse">
                    Soltar para vincular Proyecto
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="col-span-full">
            <EmptyState icon={Award} title="No se encontraron productos en el catálogo" description="Ajusta los filtros o registra tu primer producto de investigación." />
          </div>
        )}
      </div>

      {/* ── Detail Drawer (Estandarizado en Pila) ── */}
      {selectedProducto && (() => {
        const tipo = getTipo(selectedProducto.tipo);
        const { Icon } = tipo;
        const requisitos = tipo?.requisitos || [];
        const cumplidos = selectedProducto.requisitos_cumplidos || {};
        const nCumplidos = Object.values(cumplidos).filter(Boolean).length;

        return (
          <Drawer
            isOpen={isDetailOpen && !!selectedProducto}
            onClose={() => setIsDetailOpen(false)}
            size="lg"
            variant="indigo"
            title={selectedProducto.nombre}
            badge={
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-white/80 text-slate-700 uppercase tracking-widest text-[10px]">{tipo.label}</Badge>
                <Badge variant={selectedProducto.is_verificado ? 'success' : 'warning'} dot>
                  {selectedProducto.is_verificado ? 'VERIFICADO' : 'PENDIENTE'}
                </Badge>
              </div>
            }
            footer={
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button className="flex-1 justify-center order-2 sm:order-1" variant="secondary" onClick={() => setIsDetailOpen(false)}>Cerrar</Button>
                {(currentUser?.rol === 'admin' || currentUser?.id === selectedProducto.owner_id) && (
                  <Button 
                    className="flex-1 justify-center order-1 sm:order-2" 
                    variant="sena" 
                    onClick={() => handleOpenEdit(selectedProducto)}
                  >
                    <Edit2 size={16} className="mr-1.5" /> Editar Producto
                  </Button>
                )}
                {currentUser?.rol === 'admin' && (
                  <Button 
                    variant={selectedProducto.is_verificado ? 'outline' : 'primary'}
                    onClick={() => handleToggleVerificar(selectedProducto.id, selectedProducto.is_verificado)}
                    className={selectedProducto.is_verificado ? 'text-rose-600 hover:bg-rose-50 border-rose-200 justify-center' : 'justify-center'}
                  >
                    {selectedProducto.is_verificado ? <><X size={16} className="mr-1" /> Desverificar</> : <><CheckCircle2 size={16} className="mr-1" /> Verificar</>}
                  </Button>
                )}
              </div>
            }
          >
            <div className="space-y-6">
              {/* Requisitos Minciencias */}
              {requisitos.length > 0 && (
                <section className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-emerald-500" /> Trazabilidad Requisitos Minciencias
                    </h3>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-100/60 px-2.5 py-0.5 rounded-full">{nCumplidos}/{requisitos.length}</span>
                  </div>
                  <div className="h-2 bg-slate-200/70 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${Math.round((nCumplidos / requisitos.length) * 100)}%` }} />
                  </div>
                  <div className="space-y-2 mt-2">
                    {requisitos.map((req, i) => {
                      const checked = cumplidos[`req_${i}`] || false;
                      return (
                        <div key={i} className={`flex items-start justify-between gap-2.5 p-3 rounded-xl text-xs transition-colors ${
                          checked ? 'bg-emerald-50/80 border border-emerald-200' : 'bg-white border border-slate-200 hover:border-emerald-300'
                        }`}>
                          <label className="flex items-start gap-3 cursor-pointer flex-1">
                            <input 
                              type="checkbox" 
                              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              checked={checked}
                              onChange={() => handleChecklistToggle(i, checked)}
                            />
                            <span className={`font-medium leading-relaxed ${checked ? 'text-emerald-900 line-through opacity-70' : 'text-slate-700'}`}>
                              {req}
                            </span>
                          </label>
                          <div className="flex-shrink-0">
                            <input 
                              type="file" 
                              className="hidden" 
                              ref={el => fileInputRefs.current[i] = el}
                              onChange={(e) => handleFileUpload(i, e)}
                              accept=".pdf,.doc,.docx,.zip,.rar"
                            />
                            <button 
                              onClick={() => fileInputRefs.current[i]?.click()}
                              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 border ${
                                checked 
                                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' 
                                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                              }`}
                              title="Adjuntar Evidencia"
                            >
                              <UploadCloud size={14} />
                              <span className="text-[10px] font-bold">Evidencia</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              <section className="space-y-2">
                <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} className="text-indigo-600" /> Descripción Técnica
                </h3>
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 text-slate-800 text-xs font-medium leading-relaxed">
                  {selectedProducto.descripcion || 'Sin descripción técnica detallada en el repositorio.'}
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Folder size={12} className="text-emerald-600" /> Proyecto de Origen
                  </h3>
                  <p className="text-xs font-bold text-slate-900">{selectedProducto.proyecto_nombre || 'No asociado'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <User size={12} className="text-amber-600" /> Investigador Responsable
                  </h3>
                  <p className="text-xs font-bold text-slate-900">{selectedProducto.owner_nombre || 'No asignado'}</p>
                </div>
              </section>

              <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                    <Calendar size={12} className="text-blue-600" /> Fecha de Registro
                  </h3>
                  <p className="text-xs font-bold text-slate-900">{selectedProducto.fecha_publicacion || 'N/A'}</p>
                </div>
                {selectedProducto.doi && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <LinkIcon size={12} className="text-rose-600" /> DOI / Registro
                    </h3>
                    <p className="text-xs font-bold text-slate-900 truncate">{selectedProducto.doi}</p>
                  </div>
                )}
              </section>

              {selectedProducto.url && (
                <a
                  href={selectedProducto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-4 bg-slate-900 text-white rounded-2xl hover:bg-indigo-700 transition-all group shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/10 rounded-xl"><Globe size={18} /></div>
                    <div className="text-left">
                      <p className="text-xs font-black">Acceder al Producto</p>
                      <p className="text-[9px] text-white/60 font-medium tracking-wide">REPOSITORIO EXTERNO / PORTAL</p>
                    </div>
                  </div>
                  <ArrowUpRight size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                </a>
              )}
            </div>
          </Drawer>
        );
      })()}

      {/* ── Stepper Form Modal (Estandarizado en Pila) ── */}
      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setIsEditing(false); }}
        size="xl"
        variant="indigo"
        icon={isEditing ? Edit2 : Zap}
        title={isEditing ? 'Actualizar Producto' : 'Reportar Innovación'}
        subtitle={`Paso ${formStep} de 2 • ${formStep === 1 ? 'Identidad Minciencias' : 'Evidencia & Descripción'}`}
        footer={
          <div className="flex items-center justify-between w-full">
            <Button 
              variant="secondary" 
              onClick={() => formStep === 1 ? setShowForm(false) : setFormStep(s => s - 1)}
            >
              {formStep === 1 ? 'Cancelar' : 'Anterior'}
            </Button>
            <div className="flex gap-2">
              {formStep < 2 ? (
                <Button 
                  variant="primary" 
                  onClick={() => setFormStep(s => s + 1)}
                  disabled={!formData.nombre || !formData.proyecto_id}
                >
                  Siguiente <ChevronRight size={16} className="ml-1.5" />
                </Button>
              ) : (
                <Button variant="sena" onClick={handleSubmit}>
                  {isEditing ? 'Guardar Cambios' : 'Registrar Producto'}
                </Button>
              )}
            </div>
          </div>
        }
      >
        {/* Stepper Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 mb-6 overflow-hidden">
          <div className={`h-full bg-indigo-500 rounded-full transition-all duration-500 ${formStep === 1 ? 'w-1/2' : 'w-full'}`} />
        </div>

        <div className="space-y-6">
          {formStep === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <Input label="Nombre del Producto / Innovación" value={formData.nombre} onChange={patch('nombre')} required placeholder="Ej: Prototipo de sensor IoT..." />
              
              {/* Selector de Categoría Minciencias */}
              <div>
                <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3">Categoría Minciencias</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                  {CATEGORIAS_MINCIENCIAS.map(cat => (
                    <button
                      key={cat.cat}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, categoria: cat.cat, tipo: cat.tipos[0].value, requisitos_cumplidos: {} }))}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all text-xs font-bold ${
                        formData.categoria === cat.cat
                          ? `${cat.border} ${cat.bg} ${cat.color} shadow-sm`
                          : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${cat.dot} flex-shrink-0`} />
                      <span className="leading-tight">{cat.label}</span>
                    </button>
                  ))}
                </div>
                {/* Sub-tipos de la categoría seleccionada */}
                {formData.categoria && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tipo específico</p>
                    {CATEGORIAS_MINCIENCIAS.find(c => c.cat === formData.categoria)?.tipos.map(t => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, tipo: t.value, requisitos_cumplidos: {} }))}
                        className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex items-center justify-between ${
                          formData.tipo === t.value
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold'
                            : 'bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-100/50'
                        }`}
                      >
                        <span>{t.label}</span>
                        <Badge variant="outline" className="text-[9px] uppercase">{t.sub}</Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Select
                label="Proyecto Vinculado"
                value={formData.proyecto_id}
                onChange={patch('proyecto_id')}
                options={[
                  { value: '', label: 'Seleccionar proyecto...' },
                  ...proyectos.map(p => ({ value: p.id, label: `[${p.codigo_sgps || 'SGPS'}] ${p.nombre}` }))
                ]}
                required
              />

              <Select
                label="Estado de Verificación"
                value={formData.is_verificado ? 'verificado' : 'pendiente'}
                onChange={(val) => setFormData(prev => ({ ...prev, is_verificado: val === 'verificado' }))}
                options={[
                  { value: 'pendiente', label: 'Pendiente de Verificación' },
                  { value: 'verificado', label: 'Verificado por SENNOVA' }
                ]}
              />
            </div>
          )}

          {formStep === 2 && (
            <div className="space-y-5 animate-fadeIn">
              {/* Checklist de requisitos de Minciencias */}
              {(() => {
                const catObj = CATEGORIAS_MINCIENCIAS.find(c => c.cat === formData.categoria);
                const tipoInfo = catObj?.tipos.find(t => t.value === formData.tipo);
                if (!tipoInfo?.requisitos) return null;
                return (
                  <div>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Requisitos Minciencias para {formData.tipo}
                    </p>
                    <div className="space-y-2">
                      {tipoInfo.requisitos.map((req, i) => {
                        const key = `req_${i}`;
                        const checked = formData.requisitos_cumplidos?.[key] || false;
                        return (
                          <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            checked ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                          }`}>
                            <input
                              type="checkbox"
                              className="mt-0.5 w-4 h-4 accent-emerald-600 rounded flex-shrink-0"
                              checked={checked}
                              onChange={e => setFormData(prev => ({
                                ...prev,
                                requisitos_cumplidos: { ...prev.requisitos_cumplidos, [key]: e.target.checked }
                              }))}
                            />
                            <span className={`text-xs font-medium leading-relaxed ${
                              checked ? 'text-emerald-800 line-through opacity-70' : 'text-slate-700'
                            }`}>{req}</span>
                          </label>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.round((Object.values(formData.requisitos_cumplidos || {}).filter(Boolean).length / tipoInfo.requisitos.length) * 100)}%`
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-500">
                        {Object.values(formData.requisitos_cumplidos || {}).filter(Boolean).length}/{tipoInfo.requisitos.length} requisitos
                      </span>
                    </div>
                  </div>
                );
              })()}

              <Input label="URL de Repositorio o Publicación" value={formData.url} onChange={patch('url')} placeholder="https://github.com/..." />
              <Input label="DOI / Código de Registro" value={formData.doi} onChange={patch('doi')} placeholder="Ej: 10.1000/xyz123" />
              <TextArea label="Resumen Técnico y Resultados" value={formData.descripcion} onChange={patch('descripcion')} rows={4} placeholder="Describa el impacto, metodología y resultados clave..." />
            </div>
          )}
        </div>
      </Modal>

      {/* ── CVLAC Import Modal (Estandarizado en Pila) ── */}
      <Modal
        isOpen={showImportModal}
        onClose={() => { setShowImportModal(false); setImportResults(null); }}
        size="md"
        variant="indigo"
        icon={Globe}
        title="Importar desde CVLaC"
        subtitle="Sincronización Scienti Minciencias"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <Button variant="secondary" onClick={() => { setShowImportModal(false); setImportResults(null); }}>
              {importResults ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!importResults && (
              <Button 
                variant="sena" 
                disabled={isImporting || !cvlacUrl}
                onClick={async () => {
                  setIsImporting(true);
                  try {
                    const res = await ProductosAPI.importCVLaC(cvlacUrl);
                    setImportResults({
                      importados: res.importados,
                      errores: res.errores
                    });
                    onNotify?.(res.message, 'success');
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
        }
      >
        <div className="space-y-5">
          {!importResults ? (
            <>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
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
                <h3 className="text-base font-black text-slate-900">Sincronización Exitosa</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">Se han procesado los datos de su CVLAC.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-2xl font-black text-indigo-600">{importResults.importados || importResults.count || 0}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Productos Nuevos</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-2xl font-black text-slate-400">{importResults.errores || 0}</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duplicados/Error</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: null })}
        onConfirm={confirmDeleteAction}
        title="¿Eliminar Producto?"
        description="¿Estás seguro de eliminar este producto de investigación del catálogo? Esta acción no se puede deshacer."
        confirmText="Eliminar Producto"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!templateConfirm}
        onClose={() => setTemplateConfirm(null)}
        onConfirm={confirmGenerateTemplate}
        title="¿Generar productos proyectados?"
        description={`Se generarán los productos proyectados para "${templateConfirm?.nombre_corto || templateConfirm?.nombre}" según su tipología.`}
        confirmText="Generar"
        variant="warning"
      />
    </div>
  );
};

export default ProductosModule;
