import React, { useState, useEffect } from 'react';
import { 
  FileText, Upload, Search, Filter, Download, 
  Trash2, File, FileCode, FileImage, ExternalLink,
  Plus, CheckCircle, Clock, AlertCircle, Grid, 
  List, MoreVertical, HardDrive, ShieldCheck,
  RefreshCw, ChevronRight, Share2, Info
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { DocumentosAPI } from '../../api/documentos';

const FileIcon = ({ type, size = 24 }) => {
  if (type?.includes('pdf')) return <FileText className="text-rose-500" size={size} />;
  if (type?.includes('image')) return <FileImage className="text-blue-500" size={size} />;
  if (type?.includes('doc') || type?.includes('word')) return <File className="text-sky-500" size={size} />;
  if (type?.includes('excel') || type?.includes('sheet')) return <File className="text-emerald-500" size={size} />;
  return <FileCode className="text-slate-500" size={size} />;
};

const DocumentCenterModule = ({ onNotify }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [filterType, setFilterType] = useState('all');
  const [isUploading, setIsUploading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await DocumentosAPI.list();
      setDocuments(data);
    } catch (err) {
      onNotify?.('Error al cargar documentos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    onNotify?.('Cifrando y subiendo archivo...', 'info');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipo', 'evidencia');
      
      await DocumentosAPI.upload(formData);
      onNotify?.('Evidencia almacenada en la bóveda', 'success');
      loadData();
    } catch (err) {
      onNotify?.('Error en la carga: ' + err.message, 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const blob = await DocumentosAPI.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.nombre_archivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      onNotify?.('Error al recuperar archivo', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Seguro que deseas purgar esta evidencia de forma permanente?')) return;
    try {
      await DocumentosAPI.delete(id);
      onNotify?.('Documento eliminado del registro', 'success');
      loadData();
    } catch (err) {
      onNotify?.('Error al eliminar', 'error');
    }
  };

  const filteredDocs = documents.filter(d => {
    const matchesSearch = d.nombre_archivo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || d.tipo === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-48 bg-slate-100 rounded-[2.5rem]"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-40 bg-slate-50 rounded-3xl"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700 pb-20">
      
      {/* ── Premium Vault Header ── */}
      <div className="bg-slate-900 p-10 rounded-[3rem] text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative z-10">
          <div className="flex gap-6 items-center">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10 shadow-inner">
              <ShieldCheck size={32} className="text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Bóveda de Evidencias</h1>
              <p className="text-slate-400 font-medium mt-1">Almacenamiento seguro para activos de investigación SENNOVA.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="hidden sm:flex items-center gap-6 px-8 py-4 bg-white/5 rounded-3xl border border-white/5">
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Archivos</p>
                <p className="text-xl font-black text-white">{documents.length}</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Carga Global</p>
                <p className="text-xl font-black text-white">42%</p>
              </div>
            </div>
            
            <label className="cursor-pointer group">
              <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
              <div className={`h-full bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-[1.5rem] font-black transition-all shadow-xl shadow-emerald-500/20 flex items-center gap-3 active:scale-95 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isUploading ? <RefreshCw className="animate-spin" size={20} /> : <Plus size={20} strokeWidth={3} />}
                {isUploading ? 'Cifrando...' : 'Nueva Evidencia'}
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* ── Control Bar ── */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-white/60 backdrop-blur-sm p-4 rounded-[2rem] border border-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {['all', 'evidencia', 'contrato', 'entregable', 'cvlac_pdf'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                filterType === type 
                  ? 'bg-slate-900 text-white shadow-lg' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {type === 'all' ? 'Todos' : type.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar evidencias..." 
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Gallery / List View ── */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredDocs.map(doc => (
            <Card key={doc.id} className="p-0 border-0 shadow-sm hover:shadow-2xl hover:shadow-slate-200 transition-all duration-500 group overflow-hidden bg-white">
              <div className="h-32 bg-slate-50 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200/20 to-transparent group-hover:scale-110 transition-transform duration-700"></div>
                <FileIcon type={doc.content_type} size={48} />
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 bg-white rounded-xl shadow-lg text-slate-400 hover:text-emerald-600 transition-colors">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className="text-sm font-black text-slate-900 truncate flex-1" title={doc.nombre_archivo}>
                    {doc.nombre_archivo}
                  </p>
                  <Badge variant="outline" className="text-[8px] font-black uppercase shrink-0 py-0.5 px-1.5 border-slate-100 bg-slate-50 text-slate-400">
                    {(doc.content_type || '').split('/')[1] || 'FILE'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between mt-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {new Date(doc.created_at).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                  </p>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleDownload(doc)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                    >
                      <Download size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden border-0 shadow-sm bg-white rounded-[2rem]">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Archivo</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Relación</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredDocs.map(doc => (
                  <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <FileIcon type={doc.content_type} />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{doc.nombre_archivo}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{doc.tipo.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2">
                        <Badge variant="info" className="text-[10px] uppercase font-black tracking-tighter">{doc.entidad_tipo || 'General'}</Badge>
                        <span className="text-xs text-slate-400 font-medium truncate max-w-[100px]">ID: {doc.entidad_id?.slice(0, 8)}...</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-500 font-medium">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleDownload(doc)} className="p-2 text-slate-400 hover:text-emerald-600 transition-all"><Download size={18} /></button>
                        <button onClick={() => handleDelete(doc.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-all"><Trash2 size={18} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Empty State ── */}
      {filteredDocs.length === 0 && (
        <div className="py-20 text-center bg-white/40 rounded-[3rem] border border-dashed border-slate-200">
          <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
            <Info size={32} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-black text-slate-900">Bóveda Vacía</h3>
          <p className="text-slate-400 max-w-sm mx-auto mt-2 font-medium">No se encontraron evidencias para los filtros aplicados. Comience subiendo un nuevo documento técnico.</p>
        </div>
      )}
    </div>
  );
};

export default DocumentCenterModule;
