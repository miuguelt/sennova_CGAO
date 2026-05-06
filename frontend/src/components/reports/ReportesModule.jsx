import React, { useState, useEffect } from 'react';
import {
  FileText, Loader2, BarChart3, FolderOpen, Layers, Award,
  GraduationCap, AlertCircle, PieChart as PieIcon,
  TrendingUp, Activity, FileSpreadsheet,
  CloudDownload, ShieldCheck, Zap, Users, ChevronRight, RefreshCw,
  Search, Calendar, Filter, ArrowUpRight, CheckCircle2,
  Table as TableIcon, Download, Info, Globe, Printer,
  ArrowDownRight, Target, BarChart, Briefcase, Trophy
} from 'lucide-react';
import { 
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area,
  LineChart, Line, Legend
} from 'recharts';
import { ReportesAPI } from '../../api/reportes';
import { DashboardAPI } from '../../api/dashboard';
import { ProyectosAPI } from '../../api/proyectos';
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

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

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

const MetricCard = ({ label, value, trend, icon: Icon, colorCls }) => (
  <Card className="p-6 border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden relative group">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-5 group-hover:scale-110 transition-transform ${colorCls.replace('text', 'bg')}`} />
    <div className="flex items-center justify-between relative z-10">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">{value}</h3>
        {trend && (
          <div className={`flex items-center mt-2 text-[10px] font-bold ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {trend > 0 ? <ArrowUpRight size={10} className="mr-1" /> : <ArrowDownRight size={10} className="mr-1" />}
            <span>{Math.abs(trend)}% vs mes anterior</span>
          </div>
        )}
      </div>
      <div className={`p-3 rounded-2xl ${colorCls.replace('text', 'bg')} ${colorCls} shadow-sm transform group-hover:rotate-12 transition-transform`}>
        <Icon size={24} />
      </div>
    </div>
  </Card>
);

// ─── Main Module ────────────────────────────────────────────────────────────

const ReportesModule = ({ currentUser, onNotify, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' or 'catalog'
  const [loading, setLoading] = useState(false);
  const [año, setAño] = useState(new Date().getFullYear());
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [formato, setFormato] = useState('excel');
  const [projectsData, setProjectsData] = useState([]);
  const [isSigned, setIsSigned] = useState(false);
  const [signatureHash, setSignatureHash] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, a, p] = await Promise.all([
        ReportesAPI.getEstadisticasResumen(),
        DashboardAPI.getAnalyticsEvolucion(12),
        ProyectosAPI.list()
      ]);
      setStats(s);
      setAnalytics(a);
      setProjectsData(p || []);
    } catch (err) {
      console.error('Error cargando analíticas:', err);
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
      onNotify?.(`Generación exitosa: El reporte "${result.filename}" está listo.`, 'success');
    } catch (err) {
      onNotify?.('Error en generación: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = () => {
    const hash = btoa(Math.random().toString()).substring(0, 16).toUpperCase();
    setSignatureHash('SENNOVA-' + hash);
    setIsSigned(true);
    onNotify?.('Reporte validado digitalmente: ' + hash, 'success');
  };

  const handlePrint = () => window.print();

  if (loading && !stats) return (
    <div className="p-20 text-center animate-pulse">
      <Loader2 size={48} className="animate-spin mx-auto text-emerald-600 mb-6" />
      <p className="text-lg font-black text-slate-900 tracking-tight text-center">Consolidando Inteligencia SENNOVA...</p>
    </div>
  );

  // Data helpers for charts
  const proyectosPorEstado = [
    { name: 'Formulación', value: projectsData.filter(p => p.estado === 'Formulación').length },
    { name: 'Aprobado', value: projectsData.filter(p => p.estado === 'Aprobado').length },
    { name: 'En ejecución', value: projectsData.filter(p => p.estado === 'En ejecución').length },
    { name: 'Finalizado', value: projectsData.filter(p => p.estado === 'Finalizado').length },
  ].filter(d => d.value > 0);

  const presupuestoPorTipo = projectsData.reduce((acc, p) => {
    const tipo = p.tipologia || 'Otro';
    acc[tipo] = (acc[tipo] || 0) + (p.presupuesto_total || 0);
    return acc;
  }, {});

  const presupuestoChartData = Object.entries(presupuestoPorTipo).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-8 animate-fadeIn pb-24">

      {/* ── Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white shadow-sm no-print">
        <div className="flex items-center gap-5">
          <div className="p-4 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100 ring-1 ring-white/20">
            <BarChart3 size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Reportes & Analítica</h1>
            <p className="text-sm text-slate-500 font-medium">Consolidación de indicadores de impacto nacional SENNOVA</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'analytics' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
            >
              <PieIcon size={14} className="inline mr-2" /> Analítica
            </button>
            <button 
              onClick={() => setActiveTab('catalog')}
              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'catalog' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
            >
              <FileSpreadsheet size={14} className="inline mr-2" /> Consolidados
            </button>
          </div>
          <Button variant="outline" onClick={handlePrint} className="bg-white border-slate-200" title="Imprimir Reporte">
            <Printer size={16} />
          </Button>
          <Button variant="sena" onClick={handleSign} title="Firma Electrónica" disabled={isSigned}>
            <Zap size={16} className={isSigned ? 'text-emerald-400' : ''} />
            {isSigned ? 'Firmado' : 'Firmar'}
          </Button>
        </div>
      </div>

      {/* ── Print-only Header ── */}
      <div className="hidden print:block mb-10 border-b-4 border-emerald-600 pb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase">Reporte Ejecutivo de Gestión Científica</h1>
            <p className="text-emerald-600 font-black tracking-widest mt-1">SISTEMA SENNOVA - CENTRO CGAO</p>
          </div>
          <div className="text-right flex flex-col items-end gap-2">
            <div>
              <p className="text-xs font-bold text-slate-500">FECHA DE GENERACIÓN</p>
              <p className="text-lg font-black text-slate-900">{new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            {isSigned && (
              <div className="bg-emerald-50 border-2 border-emerald-500 p-2 rounded-lg flex items-center gap-2">
                <ShieldCheck size={24} className="text-emerald-600" />
                <div className="text-left">
                  <p className="text-[8px] font-black text-emerald-700 uppercase leading-none">Documento Validado</p>
                  <p className="text-[10px] font-black text-slate-900 tabular-nums">{signatureHash}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'analytics' ? (
        <div className="space-y-8 animate-fadeIn">
          {/* Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard label="Proyectos Totales" value={projectsData.length} trend={12} icon={Briefcase} colorCls="text-emerald-600" />
            <MetricCard label="Productos Registrados" value={stats?.totales?.productos || 0} trend={5} icon={Trophy} colorCls="text-indigo-600" />
            <MetricCard label="Presupuesto Ejecutado" value={`$${(projectsData.reduce((a,b) => a + (b.presupuesto_total || 0), 0) / 1e6).toFixed(1)}M`} trend={8} icon={Zap} colorCls="text-amber-600" />
            <MetricCard label="Talento Humano" value={stats?.totales?.investigadores || 0} icon={Users} colorCls="text-rose-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <Card className="p-8 border-0 shadow-sm ring-1 ring-slate-100">
              <h3 className="font-black text-slate-900 text-lg mb-8">Estado de la Cartera</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={proyectosPorEstado} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value">
                      {proyectosPorEstado.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-8 border-0 shadow-sm ring-1 ring-slate-100">
              <h3 className="font-black text-slate-900 text-lg mb-8">Inversión por Tipología</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={presupuestoChartData} layout="vertical">
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{fontSize: 10, fontWeight: 'bold'}} />
                    <Tooltip cursor={{fill: 'transparent'}} formatter={(v) => `$${v.toLocaleString('es-CO')}`} />
                    <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={40}>
                      {presupuestoChartData.map((e, i) => <Cell key={i} fill={COLORS[(i+2)%COLORS.length]} />)}
                    </Bar>
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Top Projects Table */}
          <Card className="p-0 border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-lg">Proyectos de Mayor Impacto</h3>
              <Badge variant="emerald" className="font-black text-[10px]">TOP 5 SIGP</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Proyecto</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Productos</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Inversión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {projectsData.sort((a,b) => (b.presupuesto_total || 0) - (a.presupuesto_total || 0)).slice(0, 5).map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-8 py-5">
                        <p className="text-sm font-black text-slate-900">{p.nombre_corto || p.nombre}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{p.codigo_sgps}</p>
                      </td>
                      <td className="px-8 py-5">
                        <Badge variant="indigo" className="font-black">{p.total_productos || 0}</Badge>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-slate-900 tabular-nums">
                        ${(p.presupuesto_total || 0).toLocaleString('es-CO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
          {/* Catalog */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {CATALOG.map(rep => (
                <Card key={rep.id} className="group hover:shadow-xl transition-all border-0 ring-1 ring-slate-200/60 hover:ring-emerald-400 p-6 bg-white">
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-6">
                      <div className={`p-4 rounded-2xl ${rep.bg} ${rep.color} shadow-lg transition-transform group-hover:scale-110`}>
                        <rep.icon size={24} />
                      </div>
                      <Badge variant="default" className="text-[9px] font-black uppercase tracking-wider">{rep.impact}</Badge>
                    </div>
                    <h4 className="font-black text-slate-900 text-lg mb-2">{rep.title}</h4>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed mb-8 flex-1">{rep.desc}</p>
                    <div className="flex gap-2">
                      <Select 
                        className="flex-1 text-[10px] font-black uppercase"
                        options={[{ value: 'excel', label: 'EXCEL' }, { value: 'csv', label: 'CSV' }]}
                        value={formato}
                        onChange={(e) => setFormato(e.target.value)}
                      />
                      <Button variant="sena" className="flex-1" onClick={() => descargarReporte(rep.id, { año })} disabled={loading}>
                        <CloudDownload size={14} className="mr-2" /> GENERAR
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar Insights */}
          <div className="space-y-8">
            <Card className="p-8 border-0 bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-colors" />
              <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Impacto Técnico</p>
                    <h4 className="text-xl font-black">Core de Producción</h4>
                  </div>
                  <PieIcon size={28} className="text-emerald-400" />
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Verificación de Activos</span>
                      <span className="text-lg font-black tabular-nums text-emerald-400">{stats?.productos_verificacion?.tasa_verificacion || 0}%</span>
                    </div>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden p-0.5 ring-1 ring-white/10">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats?.productos_verificacion?.tasa_verificacion || 0}%` }} />
                    </div>
                  </div>
                </div>
                <div className="pt-8 border-t border-white/10 flex items-start gap-4">
                  <Info size={16} className="text-emerald-400 shrink-0" />
                  <p className="text-[10px] text-slate-400 leading-relaxed italic font-medium">
                    Los consolidados SIGP son compatibles con los formatos de auditoría institucional del SENA.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportesModule;
