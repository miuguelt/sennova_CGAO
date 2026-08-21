import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, Upload, Search, Filter, Download, 
  Trash2, File, FileCode, FileImage, ExternalLink,
  Plus, CheckCircle, Clock, AlertCircle, Grid, 
  List, MoreVertical, HardDrive, ShieldCheck,
  RefreshCw, ChevronRight, Share2, Info, Sparkles,
  Printer, Eye, BookOpen, Award, FolderOpen, Layers,
  Users, Check, Copy, ArrowUpRight, FileSpreadsheet,
  HelpCircle, X, Shield, Book, BookmarkCheck, FileCheck2
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Modal from '../ui/Modal';
import { DocumentosAPI } from '../../api/documentos';
import { ProyectosAPI } from '../../api/proyectos';
import { PlantillasAPI } from '../../api/plantillas';
import { PDFGenerator } from '../../utils/pdfGenerator';
import { SENNOVA_FORMATS, downloadFormatTemplate } from '../../data/sennovaFormats';

const FileIcon = ({ type, size = 24 }) => {
  const mime = (type || '').toLowerCase();
  if (mime.includes('pdf')) return <FileText className="text-rose-500" size={size} />;
  if (mime.includes('image') || mime.includes('png') || mime.includes('jpg')) return <FileImage className="text-blue-500" size={size} />;
  if (mime.includes('doc') || mime.includes('word')) return <File className="text-sky-600" size={size} />;
  if (mime.includes('excel') || mime.includes('sheet') || mime.includes('csv')) return <FileSpreadsheet className="text-emerald-600" size={size} />;
  return <FileCode className="text-indigo-500" size={size} />;
};

const DocumentCenterModule = ({ currentUser, onNotify, onNavigate }) => {
  // Estado principal
  const [activeTab, setActiveTab] = useState('formatos'); // 'formatos' | 'boveda' | 'minciencias'
  const [documents, setDocuments] = useState([]);
  const [proyectos, setProyectos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterType, setFilterType] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Modales
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSmartGenModalOpen, setIsSmartGenModalOpen] = useState(false);
  const [previewFormat, setPreviewFormat] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Estado del formulario de subida
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTipo, setUploadTipo] = useState('evidencia');
  const [uploadEntidadTipo, setUploadEntidadTipo] = useState('proyecto');
  const [uploadEntidadId, setUploadEntidadId] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Estado del generador inteligente
  const [smartDocType, setSmartDocType] = useState('monthly_report');
  const [selectedSmartProjectId, setSelectedSmartProjectId] = useState('');
  const [isGeneratingSmart, setIsGeneratingSmart] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Carga de datos
  const loadData = async () => {
    setLoading(true);
    try {
      const [docsData, projsData] = await Promise.all([
        DocumentosAPI.list().catch(() => []),
        ProyectosAPI.list().catch(() => [])
      ]);
      setDocuments(Array.isArray(docsData) ? docsData : []);
      setProyectos(Array.isArray(projsData) ? projsData : []);
      if (projsData && projsData.length > 0 && !selectedSmartProjectId) {
        setSelectedSmartProjectId(projsData[0].id);
      }
    } catch (err) {
      onNotify?.('Error al sincronizar datos del repositorio', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Proyectos map para nombres legibles
  const proyectosMap = useMemo(() => {
    const map = {};
    proyectos.forEach(p => {
      map[p.id] = p;
    });
    return map;
  }, [proyectos]);

  // Manejador de subida estructurada de archivo
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      onNotify?.('Seleccione un archivo para cargar', 'warning');
      return;
    }

    setIsUploading(true);
    onNotify?.('Procesando y registrando documento en la bóveda...', 'info');

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('tipo', uploadTipo);
      
      if (uploadEntidadTipo === 'proyecto' && uploadEntidadId) {
        formData.append('entidad_tipo', 'proyecto');
        formData.append('entidad_id', uploadEntidadId);
      } else {
        formData.append('entidad_tipo', 'general');
        formData.append('entidad_id', currentUser?.id || 'cgao-general');
      }

      await DocumentosAPI.upload(formData);
      onNotify?.('Documento almacenado correctamente en el repositorio CGAO', 'success');
      
      // Limpiar formulario y cerrar modal
      setUploadFile(null);
      setUploadTipo('evidencia');
      setUploadEntidadId('');
      setIsUploadModalOpen(false);
      
      // Recargar lista y cambiar a la pestaña de bóveda
      await loadData();
      setActiveTab('boveda');
    } catch (err) {
      onNotify?.('Error al subir documento: ' + (err.message || 'Verifique formato y tamaño'), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Manejador de descarga de documentos de la bóveda
  const handleDownloadDoc = async (doc) => {
    try {
      onNotify?.(`Preparando descarga de ${doc.nombre_archivo}...`, 'info');
      const response = await DocumentosAPI.download(doc.id);
      
      if (response && response.data_base64) {
        const byteCharacters = atob(response.data_base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: response.content_type || 'application/octet-stream' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', doc.nombre_archivo);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else {
        // Fallback a enlace directo
        window.open(DocumentosAPI.getViewUrl(doc.id), '_blank');
      }
      onNotify?.('Archivo descargado con éxito', 'success');
    } catch (err) {
      // Fallback a visualizador directo
      window.open(DocumentosAPI.getViewUrl(doc.id), '_blank');
    }
  };

  // Manejador de eliminación
  const handleDeleteDoc = async (doc) => {
    if (!window.confirm(`¿Seguro que deseas eliminar permanentemente el archivo "${doc.nombre_archivo}"?`)) return;
    try {
      await DocumentosAPI.delete(doc.id);
      onNotify?.('Documento eliminado de la bóveda', 'success');
      loadData();
    } catch (err) {
      onNotify?.('Error al eliminar documento: ' + (err.message || 'Permiso denegado'), 'error');
    }
  };

  // Generador de plantillas inteligentes oficiales
  const handleGenerateSmartDoc = async (type, targetProjectId = null) => {
    const projId = targetProjectId || selectedSmartProjectId || proyectos[0]?.id;
    setIsGeneratingSmart(true);
    onNotify?.('Generando documento oficial con datos de la BD...', 'info');

    try {
      if (type === 'monthly_report') {
        const data = await PlantillasAPI.getReporteMensual(currentUser?.id);
        PDFGenerator.generateMonthlyReport(data);
        onNotify?.('Informe mensual GTH-F-074 generado con éxito', 'success');
      } else if (type === 'bitacora_oficial') {
        if (!projId) throw new Error('Seleccione un proyecto para consolidar su bitácora');
        const data = await PlantillasAPI.getBitacoraOficial(projId);
        PDFGenerator.generateBitacoraReport(data);
        onNotify?.('Bitácora técnica oficial generada con éxito', 'success');
      } else if (type === 'presupuesto_detalle') {
        if (!projId) throw new Error('Seleccione un proyecto para exportar el presupuesto');
        const data = await PlantillasAPI.getReportePresupuesto(projId);
        PDFGenerator.generateBudgetReport(data);
        onNotify?.('Reporte financiero y presupuesto generado con éxito', 'success');
      } else if (type === 'etapa_productiva') {
        if (!projId) throw new Error('Seleccione un proyecto');
        let proj = proyectosMap[projId] || proyectos.find(p => p.id === projId) || proyectos[0];
        try {
          const fullProj = await ProyectosAPI.get(proj.id);
          if (fullProj && fullProj.id) proj = fullProj;
        } catch {
          // fallback
        }
        PDFGenerator.generateEtapaProductiva(proj);
        onNotify?.('Formato de etapa productiva generado', 'success');
      } else if (type === 'ficha_proyecto') {
        if (!projId) throw new Error('Seleccione un proyecto');
        let proj = proyectosMap[projId] || proyectos.find(p => p.id === projId) || proyectos[0];
        let team = [];
        try {
          const [fullProj, teamData] = await Promise.all([
            ProyectosAPI.get(proj.id).catch(() => null),
            ProyectosAPI.getInvestigadores(proj.id).catch(() => [])
          ]);
          if (fullProj && fullProj.id) proj = fullProj;
          if (teamData && teamData.length > 0) team = teamData;
        } catch {
          // fallback
        }
        PDFGenerator.generateProjectPDF(proj, team.length > 0 ? team : proj.equipo);
        onNotify?.('Ficha técnica del proyecto generada', 'success');
      }
      setIsSmartGenModalOpen(false);
    } catch (err) {
      onNotify?.('Error al generar plantilla: ' + (err.message || 'Verifique que existan registros asociados'), 'error');
    } finally {
      setIsGeneratingSmart(false);
    }
  };

  // Filtros de formatos institucionales
  const filteredFormats = useMemo(() => {
    return SENNOVA_FORMATS.filter(fmt => {
      const matchSearch = fmt.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          fmt.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          fmt.descripcion.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = filterCategory === 'all' || fmt.categoria === filterCategory;
      return matchSearch && matchCat;
    });
  }, [searchTerm, filterCategory]);

  // Filtros de documentos de la bóveda
  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      const matchSearch = (doc.nombre_archivo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (doc.tipo || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchType = filterType === 'all' || doc.tipo === filterType;
      const matchProj = filterProject === 'all' || doc.entidad_id === filterProject;
      return matchSearch && matchType && matchProj;
    });
  }, [documents, searchTerm, filterType, filterProject]);

  // Métricas SSoT calculadas de la BD real
  const stats = useMemo(() => {
    const totalDocs = documents.length;
    const totalFormats = SENNOVA_FORMATS.length;
    const projectDocs = documents.filter(d => d.entidad_tipo === 'proyecto');
    const uniqueProjectsCount = new Set(projectDocs.map(d => d.entidad_id)).size;
    const myDocsCount = documents.filter(d => d.owner_id === currentUser?.id).length;

    return {
      totalDocs,
      totalFormats,
      uniqueProjectsCount,
      myDocsCount
    };
  }, [documents, currentUser]);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    onNotify?.('Texto de plantilla copiado al portapapeles', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse pb-16">
        <div className="h-56 bg-slate-200/60 rounded-[3rem]"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 bg-slate-100 rounded-3xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 pb-20">
      
      {/* ── Banner Principal Institucional CGAO (SSoT) ── */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 p-8 sm:p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl border border-emerald-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>SENA CGAO • Repositorio Institucional & Normatividad CTeI</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Repositorio & Formatos SENNOVA
            </h1>
            <p className="text-slate-300 text-sm sm:text-base font-normal max-w-2xl leading-relaxed">
              Descarga formatos oficiales SENA/SENNOVA, gestiona evidencias de proyectos de investigación aplicada y consulta las guías de tipologías Minciencias.
            </p>
          </div>

          {/* Métricas Reales SSoT */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-4 px-6 py-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner">
              <div className="text-center">
                <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Plantillas</p>
                <p className="text-2xl font-black text-white">{stats.totalFormats}</p>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div className="text-center">
                <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Evidencias</p>
                <p className="text-2xl font-black text-white">{stats.totalDocs}</p>
              </div>
              <div className="w-px h-8 bg-white/15" />
              <div className="text-center">
                <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">Proyectos</p>
                <p className="text-2xl font-black text-white">{proyectos.length}</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2.5">
              <Button 
                variant="sena" 
                onClick={() => setIsUploadModalOpen(true)}
                className="shadow-xl shadow-emerald-500/20 font-bold px-5 py-3.5 rounded-2xl flex items-center gap-2 justify-center"
              >
                <Plus size={18} strokeWidth={2.5} />
                <span>Subir Evidencia</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsSmartGenModalOpen(true)}
                className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-bold px-4 py-3.5 rounded-2xl flex items-center gap-2 justify-center"
                title="Generar documentos inteligentes con datos reales"
              >
                <Sparkles size={18} className="text-amber-300" />
                <span className="hidden sm:inline">Generador Rápido</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Navegación por Pestañas ── */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-200/70 backdrop-blur-md rounded-2xl border border-slate-300/50 max-w-fit">
        <button
          onClick={() => { setActiveTab('formatos'); setSearchTerm(''); }}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'formatos'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <BookOpen size={16} />
          <span>Formatos & Plantillas Oficiales</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === 'formatos' ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-700'}`}>
            {SENNOVA_FORMATS.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('boveda'); setSearchTerm(''); }}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'boveda'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <ShieldCheck size={16} />
          <span>Bóveda de Evidencias CGAO</span>
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === 'boveda' ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-700'}`}>
            {documents.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('minciencias'); setSearchTerm(''); }}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'minciencias'
              ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Award size={16} />
          <span>Guías & Normatividad Minciencias</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          PESTAÑA 1: FORMATOS & PLANTILLAS SENNOVA CGAO
      ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'formatos' && (
        <div className="space-y-6">
          {/* Barra de Filtros de Formatos */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'contractual', label: 'Contractual & GTH' },
                { id: 'semilleros', label: 'Semilleros & F-023' },
                { id: 'formulacion', label: 'Formulación SGPS' },
                { id: 'legal', label: 'Propiedad Intelectual' },
                { id: 'proyectos', label: 'Gestión & Cierre' },
                { id: 'divulgacion', label: 'Ponencias & CTeI' },
                { id: 'logistica', label: 'Salidas de Campo' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterCategory === cat.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por código, nombre o tema..." 
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Grid de Formatos Institucionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFormats.map(fmt => (
              <Card 
                key={fmt.id} 
                className="p-6 bg-white rounded-3xl border border-slate-200/80 hover:border-emerald-500/40 hover:shadow-xl hover:shadow-emerald-900/5 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-2.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[11px] font-black tracking-wide uppercase ${
                        fmt.extension === 'docx' ? 'bg-sky-100 text-sky-700' :
                        fmt.extension === 'xlsx' ? 'bg-emerald-100 text-emerald-700' :
                        fmt.extension === 'pptx' ? 'bg-purple-100 text-purple-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        .{fmt.extension}
                      </span>
                      <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {fmt.codigo}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-black uppercase text-slate-600 bg-slate-50 border-slate-200">
                      {fmt.categoriaLabel}
                    </Badge>
                  </div>

                  <p className="text-xs font-black text-emerald-700 tracking-wider mb-1">
                    {fmt.codigo}
                  </p>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                    {fmt.titulo}
                  </h3>
                  <p className="text-xs text-slate-500 font-normal mt-2.5 leading-relaxed line-clamp-3">
                    {fmt.descripcion}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <p className="text-[11px] text-slate-600 font-medium">
                      <strong className="text-slate-800">Aplica a:</strong> {fmt.aplicaA}
                    </p>
                    {fmt.requisitos && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {fmt.requisitos.map((req, rIdx) => (
                          <span key={rIdx} className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check size={10} className="text-emerald-600" />
                            {req}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="sena" 
                      onClick={() => downloadFormatTemplate(fmt)}
                      className="flex-1 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Download size={14} />
                      <span>Descargar Formato</span>
                    </Button>

                    <Button 
                      variant="outline" 
                      onClick={() => setPreviewFormat(fmt)}
                      className="p-2.5 text-slate-600 hover:text-slate-900 border-slate-200 rounded-xl"
                      title="Ver estructura y contenido del formato"
                    >
                      <Eye size={15} />
                    </Button>
                  </div>

                  {fmt.isSmartTemplate && (
                    <button
                      onClick={() => handleGenerateSmartDoc(fmt.smartType)}
                      disabled={isGeneratingSmart}
                      className="w-full text-center text-xs font-bold text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 py-2 rounded-xl border border-emerald-200/70 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sparkles size={13} className="text-amber-500" />
                      <span>Generar con datos del sistema</span>
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PESTAÑA 2: BÓVEDA DE EVIDENCIAS & ARCHIVOS DE PROYECTOS
      ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'boveda' && (
        <div className="space-y-6">
          {/* Barra de Control y Filtros */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'evidencia', label: 'Evidencias' },
                { id: 'informe', label: 'Informes' },
                { id: 'acta', label: 'Actas' },
                { id: 'contrato', label: 'Contratos' },
                { id: 'soporte_minciencias', label: 'Minciencias' },
                { id: 'cvlac_pdf', label: 'CvLAC' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFilterType(type.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    filterType === type.id 
                      ? 'bg-slate-900 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
              {/* Filtro por Proyecto */}
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="all">Todos los proyectos ({proyectos.length})</option>
                {proyectos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.codigo_sgps ? `[${p.codigo_sgps}] ` : ''}{p.nombre.slice(0, 35)}...
                  </option>
                ))}
              </select>

              {/* Búsqueda */}
              <div className="relative w-full sm:w-56">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Buscar archivo..." 
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* Switch Grid / List */}
              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                  title="Vista en tarjetas"
                >
                  <Grid size={16} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-600 hover:text-slate-900'}`}
                  title="Vista en tabla"
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Vista en Cuadrícula (Grid) */}
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredDocs.map(doc => {
                const proyectoAsociado = doc.entidad_tipo === 'proyecto' ? proyectosMap[doc.entidad_id] : null;

                return (
                  <Card key={doc.id} className="p-0 border border-slate-200/80 shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden bg-white rounded-3xl flex flex-col justify-between">
                    <div>
                      <div className="h-28 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center relative overflow-hidden border-b border-slate-100">
                        <FileIcon type={doc.content_type || doc.nombre_archivo} size={40} />
                        <div className="absolute top-2.5 right-2.5">
                          <Badge variant="outline" className="text-[9px] font-black uppercase py-0.5 px-2 bg-white shadow-sm border-slate-300 text-slate-800">
                            {doc.tipo ? doc.tipo.replace('_', ' ') : 'ARCHIVO'}
                          </Badge>
                        </div>
                      </div>

                      <div className="p-5 space-y-2">
                        <p className="text-sm font-bold text-slate-900 line-clamp-2" title={doc.nombre_archivo}>
                          {doc.nombre_archivo}
                        </p>

                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[10px] font-bold text-slate-600 uppercase">
                            {proyectoAsociado ? (
                              <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md line-clamp-1 border border-emerald-200">
                                {proyectoAsociado.codigo_sgps || proyectoAsociado.nombre.slice(0, 20)}
                              </span>
                            ) : (
                              <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                {doc.entidad_tipo || 'General'}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 pb-5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        {new Date(doc.created_at).toLocaleDateString('es-CO', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1.5 text-slate-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Previsualizar / Detalles"
                        >
                          <Eye size={15} />
                        </button>
                        <button 
                          onClick={() => handleDownloadDoc(doc)}
                          className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Descargar"
                        >
                          <Download size={15} />
                        </button>
                        {(currentUser?.rol === 'admin' || doc.owner_id === currentUser?.id) && (
                          <button 
                            onClick={() => handleDeleteDoc(doc)}
                            className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                            title="Eliminar de la bóveda"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            /* Vista en Tabla */
            <Card className="overflow-hidden border border-slate-200 shadow-sm bg-white rounded-3xl p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-wider">Documento</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-wider">Categoría</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-wider">Proyecto / Entidad</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-wider">Fecha Carga</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-700 uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDocs.map(doc => {
                      const proyectoAsociado = doc.entidad_tipo === 'proyecto' ? proyectosMap[doc.entidad_id] : null;

                      return (
                        <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <FileIcon type={doc.content_type || doc.nombre_archivo} size={20} />
                              <div>
                                <p className="text-xs font-bold text-slate-900">{doc.nombre_archivo}</p>
                                <span className="text-[10px] text-slate-600 font-semibold">ID: {doc.id.slice(0, 8)}...</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-800 bg-white border-slate-300">
                              {(doc.tipo || 'evidencia').replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            {proyectoAsociado ? (
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-emerald-900 line-clamp-1">{proyectoAsociado.nombre}</span>
                                <span className="text-[10px] text-slate-600 font-mono font-semibold">SGPS: {proyectoAsociado.codigo_sgps || 'N/A'}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600 font-semibold italic">Documento General</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-700 font-semibold">
                            {new Date(doc.created_at).toLocaleDateString('es-CO')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => setPreviewDoc(doc)} className="p-1.5 text-slate-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all" title="Ver Detalles">
                                <Eye size={16} />
                              </button>
                              <button onClick={() => handleDownloadDoc(doc)} className="p-1.5 text-slate-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-all" title="Descargar">
                                <Download size={16} />
                              </button>
                              {(currentUser?.rol === 'admin' || doc.owner_id === currentUser?.id) && (
                                <button onClick={() => handleDeleteDoc(doc)} className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all" title="Eliminar">
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Estado Vacío */}
          {filteredDocs.length === 0 && (
            <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No se encontraron evidencias</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
                No hay documentos que coincidan con los filtros aplicados. Puedes cargar actas, informes de avance o soportes técnicos de tus proyectos.
              </p>
              <Button 
                variant="sena" 
                onClick={() => setIsUploadModalOpen(true)} 
                className="mt-5 text-xs font-bold px-5 py-2.5 rounded-xl inline-flex items-center gap-2"
              >
                <Plus size={15} />
                <span>Cargar Nueva Evidencia</span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PESTAÑA 3: GUÍAS & NORMATIVIDAD MINCIENCIAS
      ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'minciencias' && (
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-teal-900 to-slate-900 p-8 rounded-3xl text-white shadow-xl">
            <div className="max-w-3xl space-y-2">
              <span className="text-xs font-black uppercase tracking-widest text-teal-300 bg-teal-500/20 px-3 py-1 rounded-full border border-teal-400/30">
                Modelo de Reconocimiento y Medición de Grupos de CTeI
              </span>
              <h2 className="text-2xl sm:text-3xl font-black">
                Criterios de Homologación y Tipologías Minciencias
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Referencia oficial para categorizar la producción científica del Grupo de Innovación CGAO y sus investigadores en las plataformas CvLAC y GrupLAC.
              </p>
            </div>
          </div>

          {/* 4 Grandes Tipologías */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* GNC */}
            <Card className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                  1
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Generación de Nuevo Conocimiento (GNC)</h3>
                  <p className="text-xs text-slate-500">Aportes significativos al estado del arte científico</p>
                </div>
              </div>
              <ul className="text-xs text-slate-600 space-y-2.5 pt-2 border-t border-slate-100">
                <li className="flex items-start gap-2">
                  <BookmarkCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span><strong>Artículos Científicos (A1, A2, B, C):</strong> Indexados en Publindex/Scopus/WoS con filiación institucional SENA.</span>
                </li>
                <li className="flex items-start gap-2">
                  <BookmarkCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span><strong>Libros de Investigación:</strong> Evaluación por pares anónimos y constancia de editorial reconocida.</span>
                </li>
                <li className="flex items-start gap-2">
                  <BookmarkCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <span><strong>Capítulos de Libro:</strong> Con ISBN y certificado de aprobación del comité editorial.</span>
                </li>
              </ul>
            </Card>

            {/* DTI */}
            <Card className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  2
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Desarrollo Tecnológico e Innovación (DTI)</h3>
                  <p className="text-xs text-slate-500">Prototipos, software y soluciones agroindustriales</p>
                </div>
              </div>
              <ul className="text-xs text-slate-600 space-y-2.5 pt-2 border-t border-slate-100">
                <li className="flex items-start gap-2">
                  <BookmarkCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Software y Soporte Lógico:</strong> Certificado de registro oficial ante la DNDA y manuales técnicos.</span>
                </li>
                <li className="flex items-start gap-2">
                  <BookmarkCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Prototipos Industriales / Plantas Piloto:</strong> Ficha técnica de validación en entorno real (TRL 5-7).</span>
                </li>
                <li className="flex items-start gap-2">
                  <BookmarkCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Diseños Industriales / Patentes:</strong> Solicitud o concesión de patente ante la SIC.</span>
                </li>
              </ul>
            </Card>

            {/* ASC */}
            <Card className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                  3
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Apropiación Social del Conocimiento (ASC)</h3>
                  <p className="text-xs text-slate-500">Transferencia y divulgación a la comunidad de Vélez</p>
                </div>
              </div>
              <ul className="text-xs text-slate-600 space-y-2.5 pt-2 border-t border-slate-100">
                <li className="flex items-start gap-2">
                  <BookmarkCheck size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>Ponencias y Eventos Científicos:</strong> Certificado de ponente y memorias del evento con ISBN/ISSN.</span>
                </li>
                <li className="flex items-start gap-2">
                  <BookmarkCheck size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>Informes Técnicos Finales:</strong> Aprobación de la subdirección CGAO y registro en repositorio.</span>
                </li>
                <li className="flex items-start gap-2">
                  <BookmarkCheck size={16} className="text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>Cartillas y Manuales Didácticos:</strong> Material de transferencia para productores campesinos.</span>
                </li>
              </ul>
            </Card>

            {/* FRH */}
            <Card className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-black">
                  4
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Formación de Recurso Humano (FRH)</h3>
                  <p className="text-xs text-slate-500">Capacitación y tutoría de aprendices semilleristas</p>
                </div>
              </div>
              <ul className="text-xs text-slate-700 space-y-2.5 pt-2 border-t border-slate-100">
                <li className="flex items-start gap-2">
                  <BookmarkCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Tutoría de Semilleros (SIACF, SEMIPROVEL, SIAMB):</strong> Certificados institucionales de vinculación.</span>
                </li>
                <li className="flex items-start gap-2">
                  <BookmarkCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Bitácoras de Etapa Productiva:</strong> Formato F-023 diligenciado con juicio evaluativo aprobado.</span>
                </li>
                <li className="flex items-start gap-2">
                  <BookmarkCheck size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Dirección de Proyectos de Innovación:</strong> Actas de sustanciación de proyectos de aprendices.</span>
                </li>
              </ul>
            </Card>
          </div>

          {/* Accesos Rápidos a Plataformas */}
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              Enlaces Directos a Plataformas Oficiales de CTeI
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a 
                href="https://scienti.minciencias.gov.co/cvlac" 
                target="_blank" 
                rel="noreferrer"
                className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">Plataforma CvLAC</p>
                  <p className="text-[11px] text-slate-600 font-medium">Minciencias Colombia</p>
                </div>
                <ExternalLink size={16} className="text-slate-500 group-hover:text-emerald-600" />
              </a>

              <a 
                href="http://sgps.sena.edu.co" 
                target="_blank" 
                rel="noreferrer"
                className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">Sistema SGPS SENA</p>
                  <p className="text-[11px] text-slate-600 font-medium">Gestión de Proyectos SENNOVA</p>
                </div>
                <ExternalLink size={16} className="text-slate-500 group-hover:text-emerald-600" />
              </a>

              <a 
                href="http://dnda.gov.co" 
                target="_blank" 
                rel="noreferrer"
                className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">Registro DNDA</p>
                  <p className="text-[11px] text-slate-600 font-medium">Dirección Nacional de Derecho de Autor</p>
                </div>
                <ExternalLink size={16} className="text-slate-500 group-hover:text-emerald-600" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: SUBIR NUEVA EVIDENCIA
      ─────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Cargar Nueva Evidencia a la Bóveda"
        subtitle="Almacenamiento seguro y trazabilidad de soportes técnicos SENNOVA CGAO"
        icon={Upload}
        variant="emerald"
        size="lg"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-5">
          {/* File Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Archivo / Evidencia (PDF, DOCX, XLSX, PNG, JPG - Máx 10MB) *
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/50 cursor-pointer transition-colors">
              <input 
                type="file" 
                id="vault-file-input"
                className="hidden" 
                onChange={(e) => setUploadFile(e.target.files[0])}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              />
              <label htmlFor="vault-file-input" className="cursor-pointer space-y-2 block">
                <Upload size={28} className="mx-auto text-slate-400" />
                {uploadFile ? (
                  <div>
                    <p className="text-sm font-bold text-emerald-700">{uploadFile.name}</p>
                    <p className="text-[11px] text-slate-400">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-700">Haz clic para examinar o arrastra el archivo</p>
                    <p className="text-[10px] text-slate-400">Formatos admitidos: Documentos PDF, Office o Imágenes</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Tipo de Documento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tipo de Soporte *
              </label>
              <select
                value={uploadTipo}
                onChange={(e) => setUploadTipo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="evidencia">Evidencia Técnica de Entregable</option>
                <option value="informe">Informe de Avance / Mensual GTH</option>
                <option value="acta">Acta de Reunión / Inicio / Cierre</option>
                <option value="contrato">Contrato / Certificado Laboral</option>
                <option value="soporte_minciencias">Soporte Minciencias / DNDA</option>
                <option value="cvlac_pdf">Respaldo CvLAC (PDF)</option>
                <option value="otro">Otro Documento</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Vincular a Entidad *
              </label>
              <select
                value={uploadEntidadTipo}
                onChange={(e) => setUploadEntidadTipo(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="proyecto">Proyecto de Investigación (I+D+i)</option>
                <option value="general">Documento General / Institucional</option>
              </select>
            </div>
          </div>

          {/* Proyecto Selector si aplica */}
          {uploadEntidadTipo === 'proyecto' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Seleccionar Proyecto I+D+i Asociado *
              </label>
              <select
                value={uploadEntidadId}
                onChange={(e) => setUploadEntidadId(e.target.value)}
                required={uploadEntidadTipo === 'proyecto'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="">-- Seleccione un proyecto del CGAO --</option>
                {proyectos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.codigo_sgps ? `[${p.codigo_sgps}] ` : ''}{p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Notas / Descripción */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Observaciones / Descripción del Documento (Opcional)
            </label>
            <textarea
              rows={2}
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
              placeholder="Ej: Soporte de pruebas de laboratorio de la fase II del proyecto..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsUploadModalOpen(false)}
              disabled={isUploading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="sena" 
              disabled={isUploading || !uploadFile}
              className="font-bold flex items-center gap-2"
            >
              {isUploading ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
              <span>{isUploading ? 'Cifrando y Subiendo...' : 'Almacenar en Bóveda'}</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: VISTA PREVIA DE ESTRUCTURA DE FORMATO
      ─────────────────────────────────────────────────────────────── */}
      {previewFormat && (
        <Modal
          isOpen={Boolean(previewFormat)}
          onClose={() => setPreviewFormat(null)}
          title={previewFormat.titulo}
          subtitle={`Código Oficial: ${previewFormat.codigo} | Versión ${previewFormat.version || '1.0'}`}
          icon={FileText}
          variant="sena"
          size="xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl">
              <span className="text-xs font-bold text-slate-700">
                Estructura y Campos del Documento
              </span>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => copyToClipboard(previewFormat.templateContent, previewFormat.id)}
                  className="text-xs flex items-center gap-1.5 bg-white"
                >
                  {copiedId === previewFormat.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedId === previewFormat.id ? 'Copiado' : 'Copiar Texto'}</span>
                </Button>
                <Button 
                  size="sm" 
                  variant="sena"
                  onClick={() => downloadFormatTemplate(previewFormat)}
                  className="text-xs flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Descargar Plantilla</span>
                </Button>
              </div>
            </div>

            <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-xs overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed shadow-inner">
              {previewFormat.templateContent}
            </div>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/60 flex items-start gap-3">
              <Info size={18} className="text-emerald-700 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <strong>Instrucciones:</strong> Este formato puede ser descargado y editado en Microsoft Word o LibreOffice. Al guardarlo para subirlo a la bóveda de evidencias, se recomienda exportarlo en formato <strong>PDF</strong> para preservar las firmas y la validez institucional.
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: DETALLES DE EVIDENCIA EN BÓVEDA
      ─────────────────────────────────────────────────────────────── */}
      {previewDoc && (
        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title={previewDoc.nombre_archivo}
          subtitle={`Almacenado el ${new Date(previewDoc.created_at).toLocaleDateString('es-CO', { dateStyle: 'full' })}`}
          icon={FileCheck2}
          variant="emerald"
          size="lg"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Tipo de Documento</p>
                <p className="text-xs font-bold text-slate-900 uppercase mt-0.5">{(previewDoc.tipo || 'Evidencia').replace('_', ' ')}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Entidad Vinculada</p>
                <p className="text-xs font-bold text-emerald-800 mt-0.5">
                  {previewDoc.entidad_tipo === 'proyecto' && proyectosMap[previewDoc.entidad_id]
                    ? proyectosMap[previewDoc.entidad_id].nombre
                    : previewDoc.entidad_tipo || 'General'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Formato MIME</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{previewDoc.content_type || 'Desconocido'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Identificador Único (UUID)</p>
                <p className="text-xs font-mono text-slate-800 font-bold mt-0.5">{previewDoc.id}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button 
                variant="outline" 
                onClick={() => window.open(DocumentosAPI.getViewUrl(previewDoc.id), '_blank')}
                className="w-full sm:w-auto text-xs font-bold flex items-center justify-center gap-2"
              >
                <ExternalLink size={15} />
                <span>Abrir en Nueva Pestaña</span>
              </Button>
              <Button 
                variant="sena" 
                onClick={() => handleDownloadDoc(previewDoc)}
                className="w-full sm:w-auto text-xs font-bold flex items-center justify-center gap-2"
              >
                <Download size={15} />
                <span>Descargar Archivo</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: GENERADOR RÁPIDO INTELIGENTE
      ─────────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isSmartGenModalOpen}
        onClose={() => setIsSmartGenModalOpen(false)}
        title="Generador Rápido de Documentos Oficiales"
        subtitle="Generación automática en PDF conectada a la base de datos de SENNOVA CGAO"
        icon={Sparkles}
        variant="indigo"
        size="lg"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipo de Documento a Generar *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'monthly_report', label: 'Informe Mensual GTH-F-074', desc: 'Con actividades del usuario autenticado' },
                { id: 'bitacora_oficial', label: 'Bitácora Técnica Consolidada', desc: 'Con firmas y hashes de integridad' },
                { id: 'presupuesto_detalle', label: 'Informe Financiero de Proyecto', desc: 'Desglose por rubros SENNOVA' },
                { id: 'ficha_proyecto', label: 'Ficha Técnica Oficial de Proyecto', desc: 'Objetivos, equipo y vigencia' }
              ].map(item => (
                <div 
                  key={item.id}
                  onClick={() => setSmartDocType(item.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                    smartDocType === item.id 
                      ? 'border-indigo-600 bg-indigo-50/70 shadow-sm' 
                      : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">{item.label}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {smartDocType !== 'monthly_report' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Seleccionar Proyecto I+D+i *
              </label>
              <select
                value={selectedSmartProjectId}
                onChange={(e) => setSelectedSmartProjectId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {proyectos.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.codigo_sgps ? `[${p.codigo_sgps}] ` : ''}{p.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-200/60 text-xs text-indigo-950 leading-relaxed flex items-start gap-2.5">
            <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
            <span>
              El documento se generará en formato PDF con la identidad visual corporativa del SENA CGAO Vélez, listo para imprimir, firmar o radicar ante la coordinación SENNOVA.
            </span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsSmartGenModalOpen(false)}
              disabled={isGeneratingSmart}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="sena" 
              onClick={() => handleGenerateSmartDoc(smartDocType)}
              disabled={isGeneratingSmart}
              className="font-bold flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isGeneratingSmart ? <RefreshCw className="animate-spin" size={16} /> : <Printer size={16} />}
              <span>{isGeneratingSmart ? 'Generando PDF...' : 'Generar PDF Oficial'}</span>
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default DocumentCenterModule;
