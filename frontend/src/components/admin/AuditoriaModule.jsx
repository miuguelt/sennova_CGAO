import React, { useState, useEffect } from 'react';
import { 
  Shield, Activity, History, Search, Filter, 
  Terminal, User, Globe, Clock, AlertTriangle,
  ChevronDown, ArrowUpRight, BarChart3, Database,
  Eye, RefreshCw, Download, Calendar, Layers,
  Server, Cpu, HardDrive
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { AuditAPI } from '../../api/audit';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const AuditoriaModule = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState('actividades'); // 'actividades' o 'técnicos'
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ limit: 50 });

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'actividades') {
        const data = await AuditAPI.getActividades(filters);
        setActividades(data);
      } else {
        const data = await AuditAPI.getLogs(filters);
        setLogs(data);
      }
      const s = await AuditAPI.getStats();
      setStats(s);
    } catch (err) {
      onNotify?.('Error al cargar datos de auditoría', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const getMethodBadge = (method) => {
    switch (method) {
      case 'POST': return <Badge variant="success" className="font-black text-[9px] px-1.5">POST</Badge>;
      case 'PUT': return <Badge variant="warning" className="font-black text-[9px] px-1.5">PUT</Badge>;
      case 'DELETE': return <Badge variant="destructive" className="font-black text-[9px] px-1.5">DEL</Badge>;
      case 'PATCH': return <Badge variant="indigo" className="font-black text-[9px] px-1.5">PATCH</Badge>;
      default: return <Badge variant="default" className="font-black text-[9px] px-1.5">{method}</Badge>;
    }
  };

  const getStatusBadge = (code) => {
    if (code >= 200 && code < 300) return <span className="text-emerald-500 font-bold">{code}</span>;
    if (code >= 400) return <span className="text-rose-500 font-bold">{code}</span>;
    return <span className="text-amber-500 font-bold">{code}</span>;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-20 px-4 md:px-0">
      
      {/* ── Dashboard Header ── */}
      <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-32 -mb-32" />
        
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="flex gap-4 md:gap-6 items-center">
            <div className="shrink-0 w-12 h-12 md:w-16 md:h-16 bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 rotate-3">
              <Shield size={24} className="text-slate-900 md:hidden" />
              <Shield size={32} className="text-slate-900 hidden md:block" />
            </div>
            <div>
              <h1 className="text-xl md:text-3xl font-black tracking-tight">Centro de Control y Auditoría</h1>
              <p className="text-slate-400 text-xs md:text-sm font-medium flex items-center gap-2 mt-1">
                <Terminal size={14} className="hidden sm:block" /> Monitorización en tiempo real del ecosistema
              </p>
            </div>
          </div>
          
          <div className="flex w-full lg:w-auto gap-3">
            <Button variant="outline" onClick={loadData} className="flex-1 lg:flex-none justify-center">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              <span className="ml-2 lg:hidden">Refrescar</span>
            </Button>
            <Button variant="sena" className="flex-1 lg:flex-none justify-center px-4 md:px-8">
              <Download size={18} className="mr-2" /> 
              <span className="hidden sm:inline">Exportar Logs</span>
              <span className="sm:hidden">Exportar</span>
            </Button>
          </div>
        </div>

        {/* Mini Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8 pt-8 border-t border-slate-800">
          <div className="space-y-1">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">Eventos Totales</p>
            <p className="text-xl md:text-2xl font-black">{stats?.total_logs || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">Actividades</p>
            <p className="text-xl md:text-2xl font-black">{stats?.total_actividades || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">Tasa de Error</p>
            <p className={`text-xl md:text-2xl font-black ${stats?.tasa_error > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {stats?.tasa_error?.toFixed(2)}%
            </p>
          </div>
          <div className="space-y-1 col-span-1">
            <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">Sistema</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm md:text-sm font-black text-emerald-400 uppercase tracking-tighter">Operativo</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs & Filters ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
            <div className="flex p-1 bg-slate-100 rounded-2xl w-full sm:w-auto border border-slate-200">
              <button 
                onClick={() => setActiveTab('actividades')}
                className={`flex-1 sm:px-6 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'actividades' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Activity size={14} /> Actividades
              </button>
              <button 
                onClick={() => setActiveTab('técnicos')}
                className={`flex-1 sm:px-6 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'técnicos' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Terminal size={14} /> Logs Técnicos
              </button>
            </div>

            <div className="relative group w-full sm:w-64 lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Búsqueda rápida..."
                className="w-full pl-11 pr-4 py-3 bg-white border-0 ring-1 ring-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all text-sm font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* ── Data Display (Table on Desktop, Cards on Mobile) ── */}
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Card className="border-0 shadow-xl shadow-slate-200/50 overflow-hidden bg-white/80 backdrop-blur-md">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Usuario</th>
                        {activeTab === 'actividades' ? (
                          <>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Acción</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Descripción</th>
                          </>
                        ) : (
                          <>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Método / Ruta</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                          </>
                        )}
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Origen</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {loading ? (
                        [1,2,3,4,5].map(i => (
                          <tr key={i} className="animate-pulse">
                            <td colSpan={5} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
                          </tr>
                        ))
                      ) : (
                        (activeTab === 'actividades' ? actividades : logs)
                        .filter(item => 
                          (item.user_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.descripcion || item.endpoint || '').toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .map((item, idx) => (
                          <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${idx % 2 === 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                  {item.user_nombre?.charAt(0) || '?'}
                                </div>
                                <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{item.user_nombre}</span>
                              </div>
                            </td>
                            {activeTab === 'actividades' ? (
                              <>
                                <td className="px-6 py-4">
                                  <Badge variant="outline" className="border-slate-200 text-[9px] font-black uppercase">{item.tipo_accion}</Badge>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-xs text-slate-500 font-medium max-w-[200px] lg:max-w-xs truncate" title={item.descripcion}>{item.descripcion}</p>
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    {getMethodBadge(item.method)}
                                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">{item.endpoint}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-sm">
                                  {getStatusBadge(item.status_code)}
                                </td>
                              </>
                            )}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold">
                                <Globe size={12} /> {item.ip_address || '0.0.0.0'}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-bold text-slate-700">
                                  {item.created_at ? format(new Date(item.created_at), 'dd MMM, yyyy', { locale: es }) : 'N/A'}
                                </span>
                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">
                                  {item.created_at ? format(new Date(item.created_at), 'HH:mm:ss') : 'N/A'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {loading ? (
                [1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl animate-pulse" />)
              ) : (
                (activeTab === 'actividades' ? actividades : logs)
                .filter(item => 
                  (item.user_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (item.descripcion || item.endpoint || '').toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((item, idx) => (
                  <Card key={item.id} className="p-5 border-0 shadow-md bg-white space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black ${idx % 2 === 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {item.user_nombre?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 leading-tight">{item.user_nombre}</p>
                          <div className="flex items-center gap-2 mt-1 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            <Clock size={10} /> {item.created_at ? format(new Date(item.created_at), 'HH:mm:ss') : 'N/A'}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="border-slate-100 text-[8px] font-black">
                        {activeTab === 'actividades' ? item.tipo_accion : item.method}
                      </Badge>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs text-slate-600 font-bold leading-relaxed break-words">
                        {activeTab === 'actividades' ? item.descripcion : item.endpoint}
                      </p>
                      {activeTab === 'técnicos' && (
                        <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-slate-400">Response Code</span>
                          {getStatusBadge(item.status_code)}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest pt-1">
                      <div className="flex items-center gap-1.5">
                        <Globe size={12} /> {item.ip_address || '0.0.0.0'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} /> {item.created_at ? format(new Date(item.created_at), 'dd MMM, yyyy', { locale: es }) : 'N/A'}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
            
            {!loading && (activeTab === 'actividades' ? actividades : logs).length === 0 && (
              <div className="py-20 text-center bg-white rounded-[2rem] border border-dashed border-slate-200">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Database size={32} className="text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-black">No se encontraron registros</h3>
                <p className="text-slate-400 text-sm font-medium">Intenta con otros términos de búsqueda.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar Stats ── */}
        <div className="w-full lg:w-80 space-y-6">
          <Card className="p-6 border-0 shadow-lg bg-emerald-600 text-white relative overflow-hidden">
            <BarChart3 className="absolute bottom-0 right-0 -mb-6 -mr-6 w-32 h-32 opacity-10 rotate-12" />
            <div className="relative z-10">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-80">Distribución de Actividad</h3>
              <div className="mt-6 space-y-4">
                {stats?.actividades_resumen && Object.entries(stats.actividades_resumen).map(([tipo, count]) => (
                  <div key={tipo} className="space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                      <span className="truncate max-w-[180px]">{tipo.replace('_', ' ')}</span>
                      <span>{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-1000" 
                        style={{ width: `${(count / (stats.total_actividades || 1)) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card className="p-6 border-0 shadow-lg bg-white space-y-6">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
               <History size={14} className="text-indigo-500" /> Salud de la Infraestructura
             </h3>
             
             <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3 md:gap-4">
               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <div className="flex items-center gap-3">
                   <Server size={18} className="text-slate-400" />
                   <span className="text-xs font-bold text-slate-700">Latency</span>
                 </div>
                 <span className="text-xs font-black text-emerald-600">24ms</span>
               </div>
               
               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <div className="flex items-center gap-3">
                   <Cpu size={18} className="text-slate-400" />
                   <span className="text-xs font-bold text-slate-700">CPU Load</span>
                 </div>
                 <span className="text-xs font-black text-amber-600">12%</span>
               </div>

               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <div className="flex items-center gap-3">
                   <HardDrive size={18} className="text-slate-400" />
                   <span className="text-xs font-bold text-slate-700">Disk Usage</span>
                 </div>
                 <span className="text-xs font-black text-indigo-600">42%</span>
               </div>
             </div>

             <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-3">
               <AlertTriangle className="text-indigo-600 shrink-0" size={18} />
               <p className="text-[10px] text-indigo-800 font-bold leading-relaxed">
                 Todos los sistemas reportan estados nominales. No se requieren acciones preventivas inmediatas.
               </p>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AuditoriaModule;
