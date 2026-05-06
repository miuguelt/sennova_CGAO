import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, FileText, GraduationCap, 
  Trophy, TrendingUp, Calendar, ArrowRight,
  Plus, Search, Filter, Activity, Zap, 
  Clock, AlertCircle, CheckCircle2, User, 
  ChevronRight, Sparkles, Target, BarChart3, ArrowUpRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as ReTooltip, ResponsiveContainer, 
  BarChart, Bar, Cell 
} from 'recharts';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { DashboardAPI } from '../../api/dashboard';
import UserInsightPanel from '../users/UserInsightPanel';

const StatCard = ({ title, value, icon: Icon, color, trend, subtitle }) => (
  <Card className="p-6 relative overflow-hidden group hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-500 border-0 ring-1 ring-slate-100">
    <div className={`absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 rounded-full opacity-[0.03] group-hover:scale-150 transition-transform duration-700 ${color}`} />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tighter">{value}</h3>
        {trend ? (
          <div className="flex items-center mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
            <TrendingUp size={10} className="mr-1" />
            <span>{trend} este mes</span>
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 font-medium mt-2">{subtitle || 'Datos actualizados'}</p>
        )}
      </div>
      <div className={`p-3 rounded-2xl shadow-lg ${color} text-white transform group-hover:rotate-12 transition-transform`}>
        <Icon size={24} strokeWidth={2.5} />
      </div>
    </div>
  </Card>
);

const DashboardModule = ({ currentUser, onOpenSearch, onNewProject, onNotify }) => {
  const [data, setData] = useState(null);
  const [evolution, setEvolution] = useState([]);
  const [showInsight, setShowInsight] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userImpact, setUserImpact] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        const [statsData, evoData] = await Promise.all([
          DashboardAPI.getStats(),
          DashboardAPI.getAnalyticsEvolucion(6)
        ]);
        
        setData(statsData);
        setEvolution(evoData.evolucion_mensual || []);
        
        if (currentUser?.id) {
          const impact = await DashboardAPI.getUserImpact(currentUser.id);
          setUserImpact(impact);
        }
      } catch (err) {
        console.error("Dashboard error:", err);
        onNotify?.('Error al sincronizar datos del tablero', 'warning');
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-20 bg-slate-100 rounded-3xl w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl"></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-slate-50 rounded-3xl"></div>
          <div className="h-96 bg-slate-50 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  const stats = data || {};

  return (
    <div className="space-y-8 pb-20 animate-in fade-in zoom-in-95 duration-700">
      
      {/* ── Header Premium ── */}
      <div className="bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Sparkles size={18} fill="currentColor" className="opacity-50" />
            </div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Centro de Operaciones</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
            Hola, {(currentUser?.nombre || '').split(' ')[0] || 'Investigador'}
          </h1>
          <p className="text-slate-500 mt-3 font-medium max-w-md leading-relaxed">
            Tienes <span className="text-indigo-600 font-bold">{stats?.tareas_criticas?.proximas?.length || 0} entregables</span> programados para esta semana. Sigue impulsando la ciencia.
          </p>
        </div>
        
        <div className="flex items-center gap-3 relative z-10">
          <button 
            onClick={onOpenSearch}
            className="flex items-center gap-3 px-6 py-3 bg-white/80 hover:bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 transition-all shadow-sm hover:shadow-md"
          >
            <Search size={18} className="text-slate-400" />
            <span>Búsqueda Global</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 bg-slate-200 text-[10px] rounded-md ml-4 text-slate-700 font-mono">Ctrl K</kbd>
          </button>
          <button 
            onClick={() => onNavigate('reportes')}
            className="flex items-center gap-3 px-6 py-3 bg-white/80 hover:bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-600 transition-all shadow-sm hover:shadow-md"
          >
            <BarChart3 size={18} className="text-emerald-500" />
            <span>Analíticas</span>
          </button>
          <Button variant="sena" className="h-12 px-8 rounded-2xl shadow-xl shadow-emerald-600/20" onClick={onNewProject}>
            <Plus size={20} className="mr-2" strokeWidth={3} /> Nuevo Proyecto
          </Button>
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Proyectos Activos" 
          value={stats.proyectos?.activos || 0} 
          icon={Briefcase} 
          color="bg-indigo-600"
          trend="+2"
        />
        <StatCard 
          title="Productos Científicos" 
          value={stats.productos?.total || 0} 
          icon={Trophy} 
          color="bg-emerald-600"
          trend="+4"
        />
        <StatCard 
          title="Cumplimiento Real" 
          value={`${userImpact?.cumplimiento || 0}%`} 
          icon={Target} 
          color="bg-amber-500"
          subtitle="Basado en metas logradas"
        />
        <StatCard 
          title="Presupuesto Bajo Gestión" 
          value={`$${((userImpact?.presupuesto_total || 0) / 1e6).toFixed(1)}M`} 
          icon={Zap} 
          color="bg-rose-500"
          subtitle="Presupuesto total liderado"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ── Main Production Chart ── */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="p-8 border-0 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Evolución de Producción</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Nuevos Proyectos vs Productos</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-600">Proyectos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-indigo-500" />
                  <span className="text-[10px] font-bold text-slate-600">Productos</span>
                </div>
              </div>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={evolution}>
                  <defs>
                    <linearGradient id="colorPrj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="mes_nombre" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}}
                  />
                  <YAxis hide />
                  <ReTooltip 
                    contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="proyectos_nuevos" 
                    stroke="#10b981" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorPrj)" 
                    name="Proyectos"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="productos_nuevos" 
                    stroke="#6366f1" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorProd)" 
                    name="Productos"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* ── Critical Deliverables ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-0 border-0 shadow-sm overflow-hidden">
              <div className="p-6 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-500 text-white rounded-xl">
                    <AlertCircle size={18} />
                  </div>
                  <h3 className="font-bold text-slate-900">Entregables Vencidos</h3>
                </div>
                <Badge variant="danger" className="rounded-lg">{stats?.tareas_criticas?.vencidas?.length || 0}</Badge>
              </div>
              <div className="divide-y divide-slate-50">
                {stats?.tareas_criticas?.vencidas?.length > 0 ? (
                  stats.tareas_criticas.vencidas.map(task => (
                    <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{task.titulo}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{task.proyecto}</p>
                      </div>
                      <p className="text-xs font-bold text-rose-500 tabular-nums">{new Date(task.fecha).toLocaleDateString()}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 italic text-sm">Todo al día por aquí ✨</div>
                )}
              </div>
            </Card>

            <Card className="p-0 border-0 shadow-sm overflow-hidden">
              <div className="p-6 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 text-white rounded-xl">
                    <Clock size={18} />
                  </div>
                  <h3 className="font-bold text-slate-900">Próximos Vencimientos</h3>
                </div>
                <Badge variant="info" className="rounded-lg">{stats?.tareas_criticas?.proximas?.length || 0}</Badge>
              </div>
              <div className="divide-y divide-slate-50">
                {stats?.tareas_criticas?.proximas?.length > 0 ? (
                  stats.tareas_criticas.proximas.map(task => (
                    <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{task.titulo}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{task.proyecto}</p>
                      </div>
                      <p className="text-xs font-bold text-indigo-500 tabular-nums">{new Date(task.fecha).toLocaleDateString()}</p>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400 italic text-sm">No hay tareas próximas</div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Sidebar: Global Activity & Impact ── */}
        <div className="lg:col-span-4 space-y-8">
          
          <Card 
            className="p-0 border-0 shadow-sm overflow-hidden bg-slate-900 text-white cursor-pointer hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group"
            onClick={() => { setSelectedUser(currentUser); setShowInsight(true); }}
          >
            <div className="p-8 space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impacto Global</p>
                  <p className="text-4xl font-black text-emerald-400 tracking-tighter">842</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nivel</p>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Investigador Senior</Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                  <span>Cumplimiento Metas</span>
                  <span>{userImpact?.cumplimiento || 0}%</span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{width: `${userImpact?.cumplimiento || 0}%`}} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-4">
                <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                  <p className="text-xl font-black text-white">{userImpact?.proyectos_count || 0}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">PRJs</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                  <p className="text-xl font-black text-white">{userImpact?.productos_count || 0}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">PRODs</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-white/10 transition-colors">
                  <p className="text-xl font-black text-white">{userImpact?.semilleros_count || 0}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">SEMs</p>
                </div>
              </div>
            </div>
            <div className="px-8 py-4 bg-white/5 border-t border-white/5 flex items-center justify-between group-hover:bg-emerald-500 group-hover:text-white transition-all">
              <span className="text-[10px] font-black uppercase tracking-widest">Ver Perfil Completo</span>
              <ArrowUpRight size={14} />
            </div>
          </Card>

          {/* Global Activity Feed */}
          <Card className="p-0 border-0 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900">Actividad Global</h3>
              <Activity size={16} className="text-slate-400" />
            </div>
            <div className="divide-y divide-slate-50 max-h-[350px] overflow-y-auto scrollbar-thin">
              {(stats?.historial_reciente || []).map((item) => (
                <div key={item.id} className="flex gap-4 p-3 rounded-2xl hover:bg-slate-50 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-md transition-all">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-slate-900 font-bold truncate">
                      <span className="text-indigo-600">{item.usuario}</span> {item.descripcion}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{item.accion}</span>
                      <span className="text-[10px] text-slate-300">•</span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(item.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full py-4 text-xs font-bold text-slate-500 hover:text-emerald-600 bg-slate-50/50 uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
              Ver Auditoría Completa <ChevronRight size={14} />
            </button>
          </Card>
        </div>
      </div>
      <UserInsightPanel
        user={selectedUser}
        isOpen={showInsight}
        onClose={() => setShowInsight(false)}
        onNotify={onNotify}
      />
    </div>
  );
};

export default DashboardModule;
