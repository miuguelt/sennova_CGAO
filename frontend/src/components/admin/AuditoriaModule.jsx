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
    <div className="space-y-6 animate-fadeIn pb-20">
      
      {/* ── Dashboard Header ── */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -ml-32 -mb-32" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex gap-6 items-center">
            <div className="w-16 h-16 bg-gradient-to-tr from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 rotate-3">
              <Shield size={32} className="text-slate-900" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Centro de Control y Auditoría</h1>
              <p className="text-slate-400 font-medium flex items-center gap-2">
                <Terminal size={14} /> Monitorización en tiempo real del ecosistema SENNOVA
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </Button>
            <Button variant="sena" className="px-8">
              <Download size={18} className="mr-2" /> Exportar Logs
            </Button>
          </div>
        </div>

        {/* Mini Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 pt-10 border-t border-slate-800">
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Eventos Totales</p>
            <p className="text-2xl font-black">{stats?.total_logs || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Actividades Usuario</p>
            <p className="text-2xl font-black">{stats?.total_actividades || 0}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tasa de Error</p>
            <p className={`text-2xl font-black ${stats?.tasa_error > 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {stats?.tasa_error.toFixed(2)}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Status Sistema</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <p className="text-2xl font-black text-emerald-400 uppercase tracking-tighter text-sm">Operativo</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs & Filters ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 w-full space-y-6">
          <div className="flex p-1.5 bg-slate-100 rounded-2xl w-full max-w-md border border-slate-200">
            <button 
              onClick={() => setActiveTab('actividades')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'actividades' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Activity size={14} /> Actividades
            </button>
            <button 
              onClick={() => setActiveTab('técnicos')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'técnicos' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Terminal size={14} /> Logs Técnicos
            </button>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder={`Filtrar en ${activeTab === 'actividades' ? 'historial de acciones' : 'logs del servidor'}...`}
              className="w-full pl-12 pr-6 py-4 bg-white border-0 ring-1 ring-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 shadow-sm transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* ── Data Table / List ── */}
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
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Origen / IP</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    [1,2,3,4,5].map(i => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full"></div></td>
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
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black ${idx % 2 === 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                              {item.user_nombre?.charAt(0) || '?'}
                            </div>
                            <span className="text-sm font-bold text-slate-700">{item.user_nombre}</span>
                          </div>
                        </td>
                        {activeTab === 'actividades' ? (
                          <>
                            <td className="px-6 py-4">
                              <Badge variant="outline" className="border-slate-200 text-[9px] font-black uppercase">{item.tipo_accion}</Badge>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs text-slate-500 font-medium max-w-xs truncate" title={item.descripcion}>{item.descripcion}</p>
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
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
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
            {!loading && (activeTab === 'actividades' ? actividades : logs).length === 0 && (
              <div className="py-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <Database size={32} className="text-slate-300" />
                </div>
                <h3 className="text-slate-900 font-black">No se encontraron registros</h3>
                <p className="text-slate-400 text-sm font-medium">Ajusta los filtros o intenta refrescar la página.</p>
              </div>
            )}
          </Card>
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
                      <span>{tipo.replace('_', ' ')}</span>
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
             
             <div className="space-y-4">
               <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <div className="flex items-center gap-3">
                   <Server size={18} className="text-slate-400" />
                   <span className="text-xs font-bold text-slate-700">API Latency</span>
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
