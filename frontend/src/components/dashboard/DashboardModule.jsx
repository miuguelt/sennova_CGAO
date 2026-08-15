import React, { useState, useEffect } from 'react';
import { 
  Users, Briefcase, FileText, GraduationCap, 
  Trophy, TrendingUp, Calendar, ArrowRight,
  Plus, Search, Filter, Activity, Zap, 
  Clock, AlertCircle, CheckCircle2, User, 
  ChevronRight, Sparkles, Target, BarChart3, ArrowUpRight,
  FolderOpen, Award, BookOpen, Shield, Settings,
  Layers, Lightbulb, Book, HelpCircle, FileSpreadsheet,
  Check, Lock, ExternalLink
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip as ReTooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie 
} from 'recharts';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { DashboardAPI } from '../../api/dashboard';
import { PlantillasAPI } from '../../api/plantillas';
import { PDFGenerator } from '../../utils/pdfGenerator';
import UserInsightPanel from '../users/UserInsightPanel';

const StatCard = ({ title, value, icon: Icon, color, trend, subtitle, onClick }) => (
  <Card 
    className={`p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 ring-1 ring-slate-200/60 bg-white ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div className={`absolute top-0 right-0 w-32 h-32 -translate-y-1/2 translate-x-1/2 rounded-full opacity-[0.04] group-hover:scale-150 transition-transform duration-700 ${color}`} />
    <div className="flex items-start justify-between relative z-10">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <h3 className="text-3xl font-black text-slate-900 mt-1 tracking-tighter tabular-nums">{value}</h3>
        {trend ? (
          <div className="flex items-center mt-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded-full">
            <TrendingUp size={10} className="mr-1" />
            <span>{trend} este mes</span>
          </div>
        ) : (
          <p className="text-[10px] text-slate-400 font-medium mt-2">{subtitle || 'Actualizado en tiempo real'}</p>
        )}
      </div>
      <div className={`p-3 rounded-2xl shadow-md ${color} text-white transform group-hover:rotate-6 transition-transform`}>
        <Icon size={22} strokeWidth={2.5} />
      </div>
    </div>
  </Card>
);

const DashboardModule = ({ currentUser, onOpenSearch, onNewProject, onNotify, onModuleAction }) => {
  const [stats, setStats] = useState({
    proyectos: { activos: 0, total: 0 },
    productos: { total: 0, verificados: 0 },
    aprendices: { total: 0, activos: 0 },
    investigadores: 0,
    instructores: 0,
    bitacoras: { total: 0, firmadas_tutor: 0, firmadas_aprendiz: 0, pendientes: 0 },
    tareas_criticas: { proximas: [], vencidas: [] },
    historial_reciente: []
  });
  const [evolution, setEvolution] = useState([]);
  const [showInsight, setShowInsight] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userImpact, setUserImpact] = useState(null);
  const [loading, setLoading] = useState(true);

  const rol = currentUser?.rol || 'investigador';
  const isAprendiz = rol === 'aprendiz';
  const isAdmin = rol === 'admin';
  const isInvestigador = !isAprendiz && !isAdmin;

  useEffect(() => {
    loadDashboardData();
  }, [currentUser?.id]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, evoData] = await Promise.all([
        DashboardAPI.getStats().catch(() => null),
        DashboardAPI.getAnalyticsEvolucion(12).catch(() => [])
      ]);
      if (statsData) setStats(statsData);
      if (Array.isArray(evoData)) setEvolution(evoData);

      if (currentUser?.id) {
        const impact = await DashboardAPI.getUserImpact(currentUser.id).catch(() => null);
        if (impact) setUserImpact(impact);
      }
    } catch (err) {
      console.error('Error cargando datos del dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMonthlyReport = async () => {
    try {
      onNotify?.('Generando reporte institucional del mes...', 'info');
      window.print();
    } catch (err) {
      onNotify?.('Error al generar reporte', 'error');
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DASHBOARD DEL APRENDIZ (Investigación Formativa)
  // ═══════════════════════════════════════════════════════════════════════════
  const ApprenticeDashboard = () => (
    <div className="space-y-8 animate-fadeIn">
      {/* Banner de Bienvenida Formativa */}
      <div className="bg-gradient-to-br from-emerald-800 via-teal-900 to-slate-900 p-8 sm:p-10 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-emerald-200 border border-white/10">
              <GraduationCap size={14} /> Espacio de Investigación Formativa • SENNOVA CGAO
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Hola, {currentUser?.nombre || 'Aprendiz'} 👋
            </h1>
            <p className="text-emerald-100/90 text-sm sm:text-base font-medium max-w-xl leading-relaxed">
              {currentUser?.programa_formacion 
                ? `${currentUser.programa_formacion} • Ficha ${currentUser?.ficha || 'SENA'}` 
                : 'Bienvenido a tu panel de semillerista. Registra tus bitácoras de campo, consulta tus entregables y participa en los retos de innovación regional.'}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button 
                variant="sena" 
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-900/30"
                onClick={() => onModuleAction?.({ module: 'bitacora', form: 'create' })}
              >
                <Plus size={18} className="mr-2" /> Nueva Bitácora de Campo
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-emerald-900 font-bold"
                onClick={() => onModuleAction?.({ module: 'cronograma' })}
              >
                <Calendar size={18} className="mr-2" /> Mis Tareas y Entregables
              </Button>
              <Button 
                variant="outline" 
                className="bg-white/10 border-white/20 text-white hover:bg-white hover:text-emerald-900 font-bold"
                onClick={() => onModuleAction?.({ module: 'retos' })}
              >
                <Zap size={18} className="mr-2" /> Explorar Retos CGAO
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 p-5 bg-white/10 rounded-3xl backdrop-blur-md border border-white/15 w-full sm:w-auto self-stretch sm:self-auto justify-around sm:justify-start">
            <div className="text-center px-3">
              <p className="text-3xl font-black text-white">{userImpact?.semilleros_count || (stats.aprendices?.total ? 1 : 0)}</p>
              <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider mt-1">Semillero</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center px-3">
              <p className="text-3xl font-black text-emerald-300">{stats.proyectos?.total || userImpact?.proyectos_count || 0}</p>
              <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider mt-1">Proyectos</p>
            </div>
            <div className="h-10 w-px bg-white/20" />
            <div className="text-center px-3">
              <p className="text-3xl font-black text-amber-300">{stats.bitacoras?.total || 0}</p>
              <p className="text-[10px] font-bold text-emerald-200 uppercase tracking-wider mt-1">Bitácoras</p>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Formativas del Aprendiz */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Semillero Vinculado" 
          value={userImpact?.semilleros_count || 1} 
          icon={GraduationCap} 
          color="bg-emerald-600" 
          subtitle="SITEC / CGAO Vélez" 
          onClick={() => onModuleAction?.({ module: 'semilleros' })}
        />
        <StatCard 
          title="Proyectos Asignados" 
          value={stats.proyectos?.total || userImpact?.proyectos_count || 0} 
          icon={FolderOpen} 
          color="bg-indigo-600" 
          subtitle="Proyectos I+D+i en equipo" 
          onClick={() => onModuleAction?.({ module: 'proyectos' })}
        />
        <StatCard 
          title="Bitácoras Registradas" 
          value={stats.bitacoras?.total || 0} 
          icon={Book} 
          color="bg-amber-600" 
          subtitle={`${stats.bitacoras?.firmadas_aprendiz || 0} firmadas por ti`} 
          onClick={() => onModuleAction?.({ module: 'bitacora' })}
        />
        <StatCard 
          title="Cumplimiento de Tareas" 
          value={`${userImpact?.cumplimiento || 100}%`} 
          icon={Target} 
          color="bg-teal-600" 
          subtitle="Entregables al día" 
          onClick={() => onModuleAction?.({ module: 'cronograma' })}
        />
      </div>

      {/* Contenido Principal Formativo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Columna Izquierda: Entregables y Bitácoras */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Tareas y Entregables Próximos */}
          <Card className="p-8 border-0 shadow-sm overflow-hidden bg-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Mis Compromisos & Entregables</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Actividades asignadas en tu semillero y proyecto</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => onModuleAction?.({ module: 'cronograma' })}
              >
                Ver Cronograma <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>

            <div className="space-y-4">
              {stats.tareas_criticas?.proximas?.length > 0 ? (
                stats.tareas_criticas.proximas.map(task => (
                  <div key={task.id} className="flex items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-slate-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                      <Calendar size={20} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black text-slate-900">{task.titulo}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{task.proyecto}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-emerald-600">{new Date(task.fecha).toLocaleDateString('es-CO')}</p>
                      <Badge variant="emerald" className="mt-1 text-[8px]">EN CURSO</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <CheckCircle2 size={36} className="text-emerald-500 mx-auto mb-2 opacity-60" />
                  <p className="text-slate-600 font-bold text-sm">¡Estás al día con tus entregables!</p>
                  <p className="text-slate-400 text-xs mt-0.5">No tienes tareas vencidas ni pendientes urgentes.</p>
                </div>
              )}
            </div>
          </Card>

          {/* Estado de Bitácoras de Campo */}
          <Card className="p-8 border-0 shadow-sm overflow-hidden bg-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Diario Técnico & Bitácoras</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Registro de avances técnicos y evidencias prácticas</p>
              </div>
              <Button 
                variant="sena" 
                size="sm" 
                className="text-xs"
                onClick={() => onModuleAction?.({ module: 'bitacora', form: 'create' })}
              >
                <Plus size={14} className="mr-1" /> Nueva Entrada
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase">Total Entradas</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{stats.bitacoras?.total || 0}</p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                <p className="text-[10px] font-black text-emerald-700 uppercase">Firmadas por Tutor</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{stats.bitacoras?.firmadas_tutor || 0}</p>
              </div>
              <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
                <p className="text-[10px] font-black text-indigo-700 uppercase">Firmadas por Ti</p>
                <p className="text-2xl font-black text-indigo-700 mt-1">{stats.bitacoras?.firmadas_aprendiz || 0}</p>
              </div>
            </div>

            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 flex items-start gap-4">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl mt-0.5">
                <BookOpen size={18} />
              </div>
              <div className="flex-1 text-xs text-indigo-900 leading-relaxed">
                <p className="font-bold mb-0.5">Firma Digital SENNOVA</p>
                <p className="text-indigo-700/90">
                  Recuerda firmar tus entradas de bitácora tras registrarlas. El tutor e investigador asignado validará técnicamente tus evidencias para tu informe de etapa productiva.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Columna Derecha: Ficha Académica & Retos */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Ficha Académica del Aprendiz */}
          <Card className="p-8 bg-slate-900 text-white border-0 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -mr-16 -mt-16" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <GraduationCap size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Ficha Académica</h3>
                  <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Aprendiz Investigador</p>
                </div>
              </div>

              <div className="space-y-4 text-xs font-medium">
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Documento</span>
                  <span className="font-mono text-white">{currentUser?.documento || '1098123001'}</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Ficha SENA</span>
                  <Badge variant="emerald" className="font-mono font-black">{currentUser?.ficha || '2670123'}</Badge>
                </div>
                <div className="flex justify-between items-center pb-3 border-b border-white/10">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Centro / Sede</span>
                  <span className="text-white font-bold">{currentUser?.sede || 'CGAO Vélez'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Estado</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Activo en Semillero
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-center bg-white/5 hover:bg-white/10 border-white/15 text-white text-xs font-bold"
                  onClick={() => onModuleAction?.({ module: 'perfil' })}
                >
                  <User size={14} className="mr-2 text-emerald-400" /> Ver Perfil Completo
                </Button>
              </div>
            </div>
          </Card>

          {/* Banco de Retos de Innovación */}
          <Card className="p-8 border-0 shadow-sm overflow-hidden bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider flex items-center gap-2">
                <Lightbulb size={16} className="text-amber-500" /> Retos Abiertos CGAO
              </h3>
              <Badge variant="warning" className="text-[9px]">INNOVACIÓN</Badge>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
              Explora las problemáticas regionales del sector agropecuario, turístico y tecnológico para desarrollar soluciones con tu semillero.
            </p>
            <Button 
              variant="outline" 
              className="w-full justify-between text-xs font-bold border-amber-200 text-amber-800 hover:bg-amber-50"
              onClick={() => onModuleAction?.({ module: 'retos' })}
            >
              <span>Explorar Banco de Retos</span>
              <ArrowRight size={14} />
            </Button>
          </Card>

          {/* Formatos y Repositorio */}
          <Card className="p-8 border-0 shadow-sm overflow-hidden bg-white">
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileSpreadsheet size={16} className="text-indigo-500" /> Formatos de Etapa Productiva
            </h3>
            <div className="space-y-3">
              <button 
                onClick={() => onModuleAction?.({ module: 'repositorio' })}
                className="w-full p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-xl text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">Guía de Bitácoras SENA</p>
                  <p className="text-[9px] text-slate-400">Instrucciones y criterios de evaluación</p>
                </div>
                <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-600" />
              </button>
              <button 
                onClick={() => onModuleAction?.({ module: 'repositorio' })}
                className="w-full p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-100 rounded-xl text-left transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">Plantillas de Certificación</p>
                  <p className="text-[9px] text-slate-400">Descarga de formatos oficiales CGAO</p>
                </div>
                <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-600" />
              </button>
            </div>
          </Card>

        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. DASHBOARD DEL ADMINISTRADOR (Líder SENNOVA CGAO)
  // ═══════════════════════════════════════════════════════════════════════════
  const AdminDashboard = () => (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Institucional de Administración */}
      <div className="bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Shield size={18} />
            </div>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-[0.3em]">Dirección y Coordinación SENNOVA CGAO</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
            Panel Institucional • {currentUser?.nombre || 'Administrador'}
          </h1>
          <p className="text-slate-500 mt-3 font-medium max-w-xl leading-relaxed text-sm">
            Supervisión global de convocatorias, productos Minciencias, proyectos en ejecución y talento científico del Centro de Gestión Agroempresarial y del Oriente.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Button 
            variant="outline"
            onClick={onOpenSearch}
            className="px-5 bg-white/80 hover:bg-white"
          >
            <Search size={16} className="text-slate-400 mr-2" />
            <span>Buscar</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 bg-slate-200 text-[10px] rounded-md ml-3 text-slate-700 font-mono">Ctrl K</kbd>
          </Button>
          <Button 
            variant="indigo"
            onClick={() => onModuleAction?.({ module: 'reportes' })}
            className="px-5"
          >
            <FileText size={16} className="mr-2" />
            <span>Reportes CGAO</span>
          </Button>
          <Button 
            variant="sena" 
            className="px-6 shadow-xl shadow-emerald-600/20" 
            onClick={onNewProject}
          >
            <Plus size={18} className="mr-2" strokeWidth={3} /> Nuevo Proyecto
          </Button>
        </div>
      </div>

      {/* KPIs Globales del Centro CGAO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Proyectos Totales Centro" 
          value={stats.proyectos?.total || 0} 
          icon={Briefcase} 
          color="bg-emerald-600" 
          trend={stats.proyectos?.trend} 
          subtitle={`${stats.proyectos?.activos || 0} en ejecución activa`}
          onClick={() => onModuleAction?.({ module: 'proyectos' })}
        />
        <StatCard 
          title="Productos Minciencias" 
          value={stats.productos?.total || 0} 
          icon={Trophy} 
          color="bg-indigo-600" 
          trend={stats.productos?.trend} 
          subtitle={`${stats.productos?.verificados || 0} verificados`}
          onClick={() => onModuleAction?.({ module: 'productos' })}
        />
        <StatCard 
          title="Investigadores & Docentes" 
          value={stats.investigadores || 0} 
          icon={Users} 
          color="bg-amber-600" 
          subtitle={`${stats.instructores || 0} instructores`}
          onClick={() => onModuleAction?.({ module: 'investigadores' })}
        />
        <StatCard 
          title="Aprendices en Semilleros" 
          value={stats.aprendices?.total || 0} 
          icon={GraduationCap} 
          color="bg-rose-600" 
          subtitle={`${stats.aprendices?.activos || 0} activos`}
          onClick={() => onModuleAction?.({ module: 'aprendices' })}
        />
      </div>

      {/* Gráfico y Paneles Institucionales */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        <div className="lg:col-span-8 space-y-8">
          
          {/* Gráfico de Evolución Global */}
          <Card className="p-8 border-0 shadow-sm overflow-hidden bg-white">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Evolución de Producción Científica CGAO</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Histórico de proyectos y productos generados en el centro</p>
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
                    <linearGradient id="adminColorPrj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="adminColorProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes_nombre" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                  <YAxis hide />
                  <ReTooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="proyectos_nuevos" stroke="#10b981" strokeWidth={3.5} fillOpacity={1} fill="url(#adminColorPrj)" name="Proyectos" />
                  <Area type="monotone" dataKey="productos_nuevos" stroke="#6366f1" strokeWidth={3.5} fillOpacity={1} fill="url(#adminColorProd)" name="Productos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Vencimientos y Entregables del Centro */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-0 border-0 shadow-sm overflow-hidden bg-white">
              <div className="p-6 bg-rose-50/60 border-b border-rose-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Entregables Vencidos Centro</h3>
                  <p className="text-[10px] text-rose-600 font-medium">Requieren intervención institucional</p>
                </div>
                <Badge variant="danger">{stats?.tareas_criticas?.vencidas?.length || 0}</Badge>
              </div>
              <div className="divide-y divide-slate-50">
                {stats?.tareas_criticas?.vencidas?.length > 0 ? (
                  stats.tareas_criticas.vencidas.map(task => (
                    <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onModuleAction?.({ module: 'cronograma' })}>
                      <div>
                        <p className="text-xs font-black text-slate-900">{task.titulo}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{task.proyecto}</p>
                      </div>
                      <span className="text-[10px] font-black text-rose-600">{new Date(task.fecha).toLocaleDateString('es-CO')}</span>
                    </div>
                  ))
                ) : (
                  <p className="p-6 text-center text-xs text-slate-400 italic">No hay entregables vencidos reportados en el centro.</p>
                )}
              </div>
            </Card>

            <Card className="p-0 border-0 shadow-sm overflow-hidden bg-white">
              <div className="p-6 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Próximos Entregables CGAO</h3>
                  <p className="text-[10px] text-emerald-600 font-medium">Vencimientos en los próximos 30 días</p>
                </div>
                <Badge variant="emerald">{stats?.tareas_criticas?.proximas?.length || 0}</Badge>
              </div>
              <div className="divide-y divide-slate-50">
                {stats?.tareas_criticas?.proximas?.length > 0 ? (
                  stats.tareas_criticas.proximas.slice(0, 5).map(task => (
                    <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onModuleAction?.({ module: 'cronograma' })}>
                      <div>
                        <p className="text-xs font-black text-slate-900">{task.titulo}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{task.proyecto}</p>
                      </div>
                      <span className="text-[10px] font-black text-emerald-600">{new Date(task.fecha).toLocaleDateString('es-CO')}</span>
                    </div>
                  ))
                ) : (
                  <p className="p-6 text-center text-xs text-slate-400 italic">Sin compromisos programados para este periodo.</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Columna Derecha: Acciones Institucionales & Auditoría en Vivo */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Accesos de Control de Centro */}
          <Card className="p-8 bg-slate-900 text-white border-0 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl -mr-16 -mt-16" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <Shield size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">Acciones Institucionales</h3>
                  <p className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">Control Maestro</p>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-white/5 hover:bg-white/10 border-white/15 text-white text-xs font-bold"
                  onClick={() => onModuleAction?.({ module: 'cvlac-admin' })}
                >
                  <FileText size={16} className="mr-3 text-emerald-400" /> Control y Monitoreo CvLAC
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-white/5 hover:bg-white/10 border-white/15 text-white text-xs font-bold"
                  onClick={() => onModuleAction?.({ module: 'auditoria' })}
                >
                  <Activity size={16} className="mr-3 text-indigo-400" /> Registro de Auditoría en Vivo
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-white/5 hover:bg-white/10 border-white/15 text-white text-xs font-bold"
                  onClick={() => onModuleAction?.({ module: 'reportes' })}
                >
                  <FileSpreadsheet size={16} className="mr-3 text-amber-400" /> Consolidado SIGP & GTH-F-074
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start bg-white/5 hover:bg-white/10 border-white/15 text-white text-xs font-bold"
                  onClick={() => onModuleAction?.({ module: 'configuracion' })}
                >
                  <Settings size={16} className="mr-3 text-slate-300" /> Configuración del Sistema
                </Button>
              </div>
            </div>
          </Card>

          {/* Registro de Auditoría en Vivo */}
          <Card className="p-0 border-0 shadow-sm overflow-hidden bg-white">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Actividad Reciente del Sistema</h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">Auditoría en tiempo real</p>
              </div>
              <Activity size={18} className="text-emerald-500" />
            </div>
            <div className="divide-y divide-slate-50">
              {stats.historial_reciente?.slice(0, 6).map(item => (
                <div key={item.id} className="p-4 flex gap-3 hover:bg-slate-50 transition-colors">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-snug">
                      <span className="font-black text-slate-900">{item.usuario}</span>: {item.descripcion}
                    </p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                      {new Date(item.fecha).toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
              ))}
              {(!stats.historial_reciente || stats.historial_reciente.length === 0) && (
                <p className="p-6 text-center text-xs text-slate-400 italic">No hay registros de actividad recientes.</p>
              )}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. DASHBOARD DEL INVESTIGADOR / INSTRUCTOR
  // ═══════════════════════════════════════════════════════════════════════════
  const ResearcherDashboard = () => (
    <div className="space-y-8 animate-fadeIn">
      {/* Header del Investigador */}
      <div className="bg-white/40 backdrop-blur-md p-8 rounded-[2.5rem] border border-white shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <Sparkles size={18} fill="currentColor" className="opacity-50" />
            </div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Portafolio Científico I+D+i</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-none">
            Hola, {(currentUser?.nombre || '').split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 mt-3 font-medium max-w-md leading-relaxed text-sm">
            Tienes <span className="text-indigo-600 font-bold">{stats?.tareas_criticas?.proximas?.length || 0} entregables</span> programados para esta etapa. Sigue impulsando la ciencia en el CGAO.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Button 
            variant="outline"
            onClick={onOpenSearch}
            className="px-5 bg-white/80 hover:bg-white"
          >
            <Search size={16} className="text-slate-400 mr-2" />
            <span>Búsqueda</span>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 bg-slate-200 text-[10px] rounded-md ml-3 text-slate-700 font-mono">Ctrl K</kbd>
          </Button>
          <Button 
            variant="indigo"
            onClick={handleGenerateMonthlyReport}
            className="px-5"
          >
            <FileText size={16} className="mr-2" />
            <span>Reporte GTH-F-074</span>
          </Button>
          <Button 
            variant="sena" 
            className="px-6 shadow-xl shadow-emerald-600/20" 
            onClick={onNewProject}
          >
            <Plus size={18} className="mr-2" strokeWidth={3} /> Nuevo Proyecto
          </Button>
        </div>
      </div>

      {/* AI Recommendations */}
      {userImpact && (
        <Card className="p-0 border-0 bg-gradient-to-r from-indigo-900 to-slate-900 text-white overflow-hidden shadow-2xl relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />
          <div className="flex flex-col lg:flex-row items-stretch">
            <div className="p-8 lg:w-2/3 space-y-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <Sparkles size={20} fill="currentColor" />
                </div>
                <h3 className="text-xl font-black tracking-tight">Recomendaciones Estratégicas AI</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(userImpact.cumplimiento < 90 || stats.tareas_criticas?.vencidas?.length > 0) && (
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-4 items-start hover:bg-white/10 transition-colors">
                    <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg"><AlertCircle size={18} /></div>
                    <div>
                      <p className="text-sm font-bold">Optimizar Cumplimiento</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                        Tienes {stats.tareas_criticas?.vencidas?.length || 0} tareas pendientes. Resolverlas hoy incrementará tu índice de impacto.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-4 items-start hover:bg-white/10 transition-colors">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg"><Target size={18} /></div>
                  <div>
                    <p className="text-sm font-bold">Convocatorias SENNOVA</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Consulta las convocatorias abiertas para postular proyectos de innovación con tus semilleros.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-4 items-start hover:bg-white/10 transition-colors">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg"><Users size={18} /></div>
                  <div>
                    <p className="text-sm font-bold">Tutoría de Aprendices</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Revisa y valida digitalmente las bitácoras de campo pendientes de tus semilleristas.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex gap-4 items-start hover:bg-white/10 transition-colors">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg"><BookOpen size={18} /></div>
                  <div>
                    <p className="text-sm font-bold">Productos Minciencias</p>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
                      Registra los artículos, ponencias y software resultantes de tus proyectos aprobados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-8 lg:w-1/3 bg-white/5 border-l border-white/5 flex flex-col justify-center items-center text-center space-y-4">
              <div className="relative">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/10" />
                  <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (251.2 * (userImpact.cumplimiento || 100)) / 100} className="text-emerald-500" strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xl font-black">{userImpact.cumplimiento || 100}%</div>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Nivel de Desempeño</p>
                <p className="text-[10px] text-emerald-400 font-black uppercase tracking-tighter mt-1">Impacto Investigativo</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 w-full text-xs font-bold" 
                onClick={() => onModuleAction?.({ module: 'proyectos' })}
              >
                Ver Mis Proyectos
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Mis Proyectos I+D+i" 
          value={stats.proyectos?.activos || stats.proyectos?.total || 0} 
          icon={Briefcase} 
          color="bg-indigo-600" 
          trend={stats.proyectos?.trend} 
          onClick={() => onModuleAction?.({ module: 'proyectos' })}
        />
        <StatCard 
          title="Mis Productos Minciencias" 
          value={stats.productos?.total || 0} 
          icon={Trophy} 
          color="bg-emerald-600" 
          trend={stats.productos?.trend} 
          onClick={() => onModuleAction?.({ module: 'productos' })}
        />
        <StatCard 
          title="Cumplimiento Técnico" 
          value={`${userImpact?.cumplimiento || 100}%`} 
          icon={Target} 
          color="bg-amber-500" 
          subtitle="Metas logradas en cronograma" 
          onClick={() => onModuleAction?.({ module: 'cronograma' })}
        />
        <StatCard 
          title="Aprendices Tutelados" 
          value={stats.aprendices?.total || userImpact?.aprendices_count || 0} 
          icon={GraduationCap} 
          color="bg-rose-500" 
          subtitle="En mis semilleros" 
          onClick={() => onModuleAction?.({ module: 'aprendices' })}
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          
          <Card className="p-8 border-0 shadow-sm overflow-hidden bg-white">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-slate-900 text-lg">Evolución de Producción Científica</h3>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Tendencia en los últimos 12 meses</p>
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
                  <XAxis dataKey="mes_nombre" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
                  <YAxis hide />
                  <ReTooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="proyectos_nuevos" stroke="#10b981" strokeWidth={3.5} fillOpacity={1} fill="url(#colorPrj)" name="Proyectos" />
                  <Area type="monotone" dataKey="productos_nuevos" stroke="#6366f1" strokeWidth={3.5} fillOpacity={1} fill="url(#colorProd)" name="Productos" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-0 border-0 shadow-sm overflow-hidden bg-white">
              <div className="p-6 bg-rose-50/50 border-b border-rose-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Tareas Vencidas</h3>
                <Badge variant="danger">{stats?.tareas_criticas?.vencidas?.length || 0}</Badge>
              </div>
              <div className="divide-y divide-slate-50">
                {stats?.tareas_criticas?.vencidas?.map(task => (
                  <div key={task.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onModuleAction?.({ module: 'cronograma' })}>
                    <div>
                      <p className="text-xs font-black text-slate-900">{task.titulo}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{task.proyecto}</p>
                    </div>
                    <span className="text-[10px] font-black text-rose-600">{new Date(task.fecha).toLocaleDateString('es-CO')}</span>
                  </div>
                ))}
                {(!stats.tareas_criticas?.vencidas || stats.tareas_criticas.vencidas.length === 0) && (
                  <p className="p-6 text-center text-xs text-slate-400 italic">No tienes tareas vencidas pendientes.</p>
                )}
              </div>
            </Card>

            <Card className="p-0 border-0 shadow-sm overflow-hidden bg-white">
              <div className="p-6 bg-indigo-50/50 border-b border-indigo-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">Actividad de Mis Proyectos</h3>
                <Activity size={16} className="text-indigo-400" />
              </div>
              <div className="divide-y divide-slate-50">
                {stats.historial_reciente?.slice(0, 4).map(item => (
                  <div key={item.id} className="p-4 flex gap-3 hover:bg-slate-50 transition-colors">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 leading-snug"><span className="text-indigo-600">{item.usuario}</span> {item.descripcion}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{new Date(item.fecha).toLocaleTimeString('es-CO')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Columna Derecha: Impacto 360 & Próximos Vencimientos */}
        <div className="lg:col-span-4 space-y-8">
          <Card 
            className="p-8 border-0 shadow-sm overflow-hidden bg-slate-900 text-white cursor-pointer hover:shadow-2xl hover:shadow-emerald-500/10 transition-all group"
            onClick={() => { setSelectedUser(currentUser); setShowInsight(true); }}
          >
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Impacto 360</p>
                  <p className="text-4xl font-black text-emerald-400 tracking-tighter">
                    {userImpact ? (userImpact.proyectos_count * 100) + (userImpact.productos_count * 50) + (userImpact.cumplimiento * 2) : '---'}
                  </p>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Nivel {userImpact?.productos_count > 5 ? 'Senior' : 'Junior'}</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-400">
                  <span>Cumplimiento Global</span>
                  <span>{userImpact?.cumplimiento || 100}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{width: `${userImpact?.cumplimiento || 100}%`}} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-lg font-black text-white">{userImpact?.proyectos_count || 0}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Proyectos</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-lg font-black text-white">{userImpact?.productos_count || 0}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Productos</p>
                </div>
                <div className="text-center p-3 bg-white/5 rounded-2xl border border-white/5">
                  <p className="text-lg font-black text-white">{userImpact?.semilleros_count || 0}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Semilleros</p>
                </div>
              </div>
              <Button variant="ghost" className="w-full text-white hover:bg-white/10 text-[10px] font-black uppercase tracking-widest">Ver Perfil Completo <ArrowUpRight size={14} className="ml-2" /></Button>
            </div>
          </Card>

          <Card className="p-8 border-0 shadow-sm bg-white overflow-hidden">
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-wider mb-6">Próximos Vencimientos</h3>
            <div className="space-y-6">
              {stats.tareas_criticas?.proximas?.slice(0, 4).map(task => (
                <div key={task.id} className="flex gap-4 relative">
                  <div className="w-px h-full bg-slate-100 absolute left-2 top-8" />
                  <div className="w-4 h-4 rounded-full bg-indigo-500 shrink-0 z-10" />
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-tight">{task.titulo}</p>
                    <p className="text-[10px] text-indigo-600 font-bold mt-1 uppercase">{new Date(task.fecha).toLocaleDateString('es-CO')}</p>
                  </div>
                </div>
              ))}
              {(!stats.tareas_criticas?.proximas || stats.tareas_criticas.proximas.length === 0) && (
                <p className="text-center text-xs text-slate-400 italic">No hay vencimientos próximos.</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20 animate-fadeIn">
      {isAprendiz ? <ApprenticeDashboard /> : isAdmin ? <AdminDashboard /> : <ResearcherDashboard />}
      
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
