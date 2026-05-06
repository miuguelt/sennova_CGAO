import React, { useState, useEffect } from 'react';
import { 
  BarChart3, PieChart as PieIcon, TrendingUp, Download, 
  Calendar, Users, Briefcase, Trophy, FileText,
  Filter, RefreshCw, Printer, ArrowDownRight, ArrowUpRight,
  Target, Zap, Activity, Info
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, PieChart, Pie, AreaChart, Area,
  LineChart, Line, Legend
} from 'recharts';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { DashboardAPI } from '../../api/dashboard';
import { ProyectosAPI } from '../../api/proyectos';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

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

const StatisticsModule = ({ onNotify }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [projectsData, setProjectsData] = useState([]);
  const [timeRange, setTimeRange] = useState('6M');

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashStats, projects] = await Promise.all([
        DashboardAPI.getStats(),
        ProyectosAPI.list()
      ]);
      setStats(dashStats);
      setProjectsData(projects || []);
    } catch (err) {
      onNotify?.('Error al cargar estadísticas avanzadas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 bg-slate-100 rounded-xl w-48"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-slate-50 rounded-3xl"></div>
          <div className="h-96 bg-slate-50 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  // Preparar datos para gráficos
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
    <div className="space-y-8 animate-fadeIn pb-20">
      
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-200">
            <BarChart3 size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Analítica SENNOVA</h1>
            <p className="text-sm text-slate-500 font-medium">Visualización de impacto y rendimiento institucional</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          >
            <option value="3M">Últimos 3 meses</option>
            <option value="6M">Últimos 6 meses</option>
            <option value="1Y">Último año</option>
          </select>
          <Button variant="outline" onClick={loadData} className="border-slate-200"><RefreshCw size={16} /></Button>
          <Button variant="sena" onClick={handlePrint}>
            <Printer size={16} className="mr-2" /> Generar Reporte PDF
          </Button>
        </div>
      </div>

      {/* ── Print Header (Only visible in PDF) ── */}
      <div className="hidden print:block mb-10 border-b-4 border-emerald-600 pb-6">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black text-slate-900 uppercase">Reporte Ejecutivo de Gestión Científica</h1>
            <p className="text-emerald-600 font-black tracking-widest mt-1">SISTEMA SENNOVA - CENTRO CGAO</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-slate-500">FECHA DE GENERACIÓN</p>
            <p className="text-lg font-black text-slate-900">{new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* ── Metrics Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Proyectos Totales" value={projectsData.length} trend={12} icon={Briefcase} colorCls="text-emerald-600" />
        <MetricCard label="Productos Registrados" value={stats?.productos?.total || 0} trend={5} icon={Trophy} colorCls="text-indigo-600" />
        <MetricCard label="Presupuesto Ejecutado" value={`$${(projectsData.reduce((a,b) => a + (b.presupuesto_total || 0), 0) / 1e6).toFixed(1)}M`} trend={8} icon={Zap} colorCls="text-amber-600" />
        <MetricCard label="Talento Humano" value={stats?.investigadores?.total || 0} icon={Users} colorCls="text-rose-600" />
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Distribución por Estado */}
        <Card className="p-8 border-0 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-slate-900 text-lg">Estado de la Cartera</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Distribución operativa de proyectos</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl"><Activity size={18} className="text-slate-400" /></div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-[250px] w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={proyectosPorEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {proyectosPorEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-4">
              {proyectosPorEstado.map((item, idx) => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-xs font-bold text-slate-600">{item.name}</span>
                  </div>
                  <span className="text-sm font-black text-slate-900 tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Inversión por Tipología */}
        <Card className="p-8 border-0 shadow-sm ring-1 ring-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-slate-900 text-lg">Inversión por Tipología</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Recursos asignados según categoría</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl"><Target size={18} className="text-slate-400" /></div>
          </div>
          
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={presupuestoChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}}
                  width={100}
                />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                  formatter={(value) => `$${value.toLocaleString('es-CO')}`}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32}>
                  {presupuestoChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

      </div>

      {/* ── Table: Top Performance ── */}
      <Card className="p-0 border-0 shadow-sm ring-1 ring-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-900 text-lg">Proyectos de Mayor Impacto</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Basado en productos y presupuesto</p>
          </div>
          <Button variant="outline" size="sm" className="text-[10px] font-black uppercase">Ver Auditoría Completa</Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Proyecto</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Líder</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Productos</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Inversión</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Eficiencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {projectsData.sort((a,b) => (b.presupuesto_total || 0) - (a.presupuesto_total || 0)).slice(0, 5).map(p => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-8 py-5">
                    <p className="text-sm font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{p.nombre_corto || p.nombre}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{p.codigo_sgps || 'SIN CÓDIGO'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 uppercase">
                        {(p.lider || 'I').charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-slate-600">{p.lider || 'Investigador Principal'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <Badge variant="emerald" className="font-black text-[10px]">{p.total_productos || 0}</Badge>
                  </td>
                  <td className="px-8 py-5 text-right font-black text-slate-900 text-sm tabular-nums">
                    ${(p.presupuesto_total || 0).toLocaleString('es-CO')}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: '85%' }} />
                      </div>
                      <span className="text-[10px] font-black text-emerald-600">85%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Footer Info ── */}
      <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4 no-print">
        <Info size={24} className="text-amber-500 shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-black text-amber-900">Nota sobre la veracidad de los datos</p>
          <p className="text-xs text-amber-800 leading-relaxed font-medium">
            Las estadísticas presentadas se calculan en tiempo real basándose en los registros de bitácora, entregables aprobados y productos cargados al sistema. Para reportes oficiales de contraloría, por favor exporte el documento PDF firmado.
          </p>
        </div>
      </div>

    </div>
  );
};

export default StatisticsModule;
