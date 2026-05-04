import React, { useState, useEffect } from 'react';
import {
  FileText, Loader2, BarChart3, FolderOpen, Layers, Award,
  GraduationCap, AlertCircle, PieChart,
  TrendingUp, Activity, FileSpreadsheet,
  CloudDownload, ShieldCheck, Zap, Users, ChevronRight, RefreshCw,
  Search, Calendar, Filter, ArrowUpRight, CheckCircle2,
  Table as TableIcon, Download, Info, Globe
} from 'lucide-react';
import { ReportesAPI, DashboardAPI } from '../../api';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Select from '../ui/Select';

// ─── Constants ─────────────────────────────────────────────────────────────
const CATALOG = [
  { 
    id: 'proyectos', 
    title: 'Consolidado Proyectos',  
    desc: 'Métricas integrales de ejecución, equipo de investigación y presupuesto ejecutado.',          
    icon: FolderOpen,    
    color: 'text-emerald-600', 
    bg: 'bg-emerald-100',
    impact: 'Estratégico'
  },
  { 
    id: 'grupos',    
    title: 'Ranking de Grupos',       
    desc: 'Clasificación Minciencias, impacto institucional y red de colaboración científica.',    
    icon: Layers,        
    color: 'text-blue-600',     
    bg: 'bg-blue-100',
    impact: 'Institucional'
  },
  { 
    id: 'productos', 
    title: 'Producción Científica',   
    desc: 'Inventario de activos de conocimiento, productos verificados y propiedad intelectual.',       
    icon: Award,         
    color: 'text-amber-600',   
    bg: 'bg-amber-100',
    impact: 'Propiedad Intelectual'
  },
  { 
    id: 'semilleros',
    title: 'Impacto Semilleros',      
    desc: 'Población de aprendices, planes de formación y semilleristas en formación técnica.',        
    icon: GraduationCap, 
    color: 'text-indigo-600', 
    bg: 'bg-indigo-100',
    impact: 'Formación'
  },
];

// ─── Components ─────────────────────────────────────────────────────────────

const StatCard = ({ title, value, label, icon: Icon, colorCls, bgCls }) => (
  <Card className="p-6 border-0 shadow-sm ring-1 ring-slate-200/60 overflow-hidden relative group transition-all hover:shadow-md hover:ring-indigo-300">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110 ${bgCls}`} />
    <div className="flex items-start justify-between mb-6 relative z-10">
      <div className={`p-3 rounded-2xl ${bgCls} ${colorCls} shadow-sm group-hover:scale-110 transition-transform`}>
        <Icon size={22} />
      </div>
      <Badge variant="default" className="font-black text-[10px] uppercase tracking-widest bg-white/80 border-slate-100">{label}</Badge>
    </div>
    <div className="relative z-10">
      <h3 className="text-3xl font-black text-slate-900 leading-none mb-2 tabular-nums">{value}</h3>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
    </div>
  </Card>
);

// ─── Main Module ────────────────────────────────────────────────────────────

const ReportesModule = ({ currentUser, onNotify, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [año, setAño] = useState(new Date().getFullYear());
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [formato, setFormato] = useState('excel');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, a] = await Promise.all([
        ReportesAPI.getEstadisticasResumen(),
        DashboardAPI.getAnalyticsEvolucion(12),
      ]);
      setStats(s);
      setAnalytics(a);
    } catch (err) {
      console.error('Error cargando analíticas de impacto:', err);
    }
    setLoading(false);
  };

  const descargarReporte = async (tipo, params = {}) => {
    setLoading(true);
    try {
      let result;
      switch (tipo) {
        case 'proyectos':  result = await ReportesAPI.descargarConsolidadoProyectos(params.año || null, formato); break;
        case 'grupos':     result = await ReportesAPI.descargarConsolidadoGrupos(formato); break;
        case 'productos':  result = await ReportesAPI.descargarConsolidadoProductos(params.año || null, params.verificados || false, formato); break;
        case 'semilleros': result = await ReportesAPI.descargarConsolidadoSemilleros(formato); break;
        default: throw new Error('Tipología de reporte no identificada.');
      }
      onNotify?.(`Sincronización exitosa: El reporte "${result.filename}" ha sido generado.`, 'success');
    } catch (err) {
      onNotify?.('Error crítico en generación de reporte: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !stats) return (
    <div className="p-20 text-center animate-pulse">
      <Loader2 size={48} className="animate-spin mx-auto text-indigo-600 mb-6" />
      <p className="text-lg font-black text-slate-900 tracking-tight">Procesando Inteligencia de Negocios (BI)...</p>
      <p className="text-sm text-slate-500 font-medium mt-2">Consolidando métricas de impacto institucional CGAO</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn pb-24">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-3xl border border-white shadow-sm">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100 ring-1 ring-white/20">
            <BarChart3 size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2 text-emerald-600 mb-1">
              <TrendingUp size={14} />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">CGAO Intelligence Hub</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reportes & Analíticas</h1>
            <p className="text-sm text-slate-500 font-medium">Consolidación de indicadores de impacto nacional SENNOVA</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/80 p-2 rounded-2xl border border-slate-100 shadow-sm ring-1 ring-black/[0.03]">
            <Select
              className="border-0 ring-0 focus:ring-0 bg-transparent text-xs font-black uppercase tracking-wider"
              options={[{ value: 'excel', label: 'EXCEL / XLSX' }, { value: 'csv', label: 'CSV / TEXT' }]}
              value={formato}
              onChange={(e) => setFormato(e.target.value)}
            />
            <div className="w-px h-6 bg-slate-100 mx-1" />
            <button 
              onClick={loadData} 
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-emerald-600"
              title="Refrescar métricas"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Tasa de Verificación" value={`${stats?.productos_verificacion?.tasa_verificacion || 0}%`} label="CONFIABILIDAD" icon={ShieldCheck} colorCls="text-emerald-700" bgCls="bg-emerald-100" />
        <StatCard title="Producción Vigente" value={stats?.totales?.productos || 0} label={String(año)} icon={Zap} colorCls="text-amber-700" bgCls="bg-amber-100" />
        <StatCard title="Capital Humano" value={stats?.totales?.investigadores || 0} label="INVESTIGADORES" icon={Users} colorCls="text-blue-700" bgCls="bg-blue-100" />
        <StatCard title="Cartera de Proyectos" value={stats?.totales?.proyectos || 0} label="EJECUCIÓN" icon={Activity} colorCls="text-indigo-700" bgCls="bg-indigo-100" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Report Catalog ── */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileSpreadsheet size={14} className="text-emerald-500" /> Generador de Consolidados SIGP
            </h3>
            <Badge variant="success" className="text-[10px] font-black">LISTOS PARA EXPORTACIÓN</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CATALOG.map(rep => {
              const Icon = rep.icon;
              return (
                <Card key={rep.id} className="group hover:shadow-xl transition-all border-0 ring-1 ring-slate-200/60 hover:ring-emerald-400 overflow-hidden bg-white p-6">
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-6">
                      <div className={`p-4 rounded-2xl ${rep.bg} ${rep.color} shadow-lg shadow-slate-100 group-hover:scale-110 transition-transform`}>
                        <Icon size={24} />
                      </div>
                      <Badge variant="indigo" className="text-[9px] font-black uppercase tracking-wider bg-slate-50 text-slate-500 border-slate-100">
                        {rep.impact}
                      </Badge>
                    </div>
                    
                    <h4 className="font-black text-slate-900 text-lg mb-2 group-hover:text-emerald-700 transition-colors">{rep.title}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 flex-1">
                      {rep.desc}
                    </p>

                    <Button
                      variant="sena"
                      className="w-full justify-between py-4 shadow-lg shadow-emerald-100/50 group/btn overflow-hidden"
                      onClick={() => descargarReporte(rep.id, { año })}
                      disabled={loading}
                    >
                      <span className="flex items-center gap-2">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <CloudDownload size={16} />}
                        DESCARGAR {formato.toUpperCase()}
                      </span>
                      <ArrowUpRight size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform opacity-60" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ── Insights Sidebar ── */}
        <div className="space-y-8">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Análisis de Composición</h3>

          <Card className="p-8 border-0 bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors" />
            
            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Impacto Técnico</p>
                  <h4 className="text-xl font-black">Core de Producción</h4>
                </div>
                <PieChart size={28} className="text-emerald-400" />
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Investigación Aplicada</span>
                    <span className="text-lg font-black tabular-nums text-emerald-400">
                      {Math.round((stats?.totales?.proyectos / (stats?.totales?.productos || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 ring-1 ring-white/10">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.4)]" 
                      style={{ width: `${Math.min(100, (stats?.totales?.proyectos / (stats?.totales?.productos || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Desarrollo Tecnológico</span>
                    <span className="text-lg font-black tabular-nums text-indigo-400">
                      {Math.round((stats?.totales?.grupos / 10) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 ring-1 ring-white/10">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.4)]" 
                      style={{ width: `${Math.min(100, (stats?.totales?.grupos / 10) * 100)}%` }} 
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/10">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white/5 rounded-xl"><Info size={16} className="text-emerald-400" /></div>
                  <p className="text-xs text-slate-400 leading-relaxed italic font-medium">
                    "El CGAO mantiene una tendencia de crecimiento sostenido del 12% anual en producción científica verificada y validada por pares."
                  </p>
                </div>
              </div>
            </div>

            <div className="absolute -right-16 -bottom-16 opacity-5 pointer-events-none group-hover:scale-110 transition-transform">
              <BarChart3 size={240} strokeWidth={1} />
            </div>
          </Card>

          {/* ── Verification Alert ── */}
          <Card className="p-8 border-2 border-dashed border-slate-200 bg-white/40 backdrop-blur-sm flex flex-col items-center text-center group hover:border-indigo-400 hover:bg-white transition-all">
            <div className="p-4 bg-amber-100 text-amber-700 rounded-2xl mb-6 shadow-lg shadow-amber-50 group-hover:scale-110 transition-transform">
              <AlertCircle size={32} />
            </div>
            <h4 className="font-black text-slate-900 text-lg mb-2">Auditoría Pendiente</h4>
            <p className="text-xs text-slate-500 font-medium mb-8 leading-relaxed">
              Existen <span className="font-black text-amber-600">{stats?.productos_verificacion?.pendientes ?? 0} activos de conocimiento</span> esperando revisión técnica para su consolidación nacional.
            </p>
            <Button 
              variant="outline" 
              className="w-full bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 py-3 text-xs font-black uppercase tracking-widest" 
              onClick={() => onNavigate('productos')}
            >
              INICIAR VERIFICACIÓN <ChevronRight size={14} className="ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportesModule;
