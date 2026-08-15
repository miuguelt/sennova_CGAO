import React, { useState, useEffect } from 'react';
import {
  Layers, Edit2, Globe, Star, Users, Award, Shield, ExternalLink,
  ArrowUpRight, Download, FileText, X, Loader2, ChevronRight,
  BookOpen, Target, Info, CheckCircle2, Upload, Folder,
  GraduationCap, FolderOpen, Building2, Calendar
} from 'lucide-react';
import { GruposAPI } from '../../api/grupos';
import { SemillerosAPI } from '../../api/semilleros';
import { UsuariosAPI } from '../../api/usuarios';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Badge from '../ui/Badge';
import Input from '../ui/Input';
import Select from '../ui/Select';
import TextArea from '../ui/TextArea';

// ─── Constantes CGAO ─────────────────────────────────────────────────────────
const CLASIFICACIONES = [
  { value: 'A1', label: 'Categoría A1 (Excelencia)' },
  { value: 'A',  label: 'Categoría A' },
  { value: 'B',  label: 'Categoría B' },
  { value: 'C',  label: 'Categoría C' },
  { value: 'Reconocido', label: 'Reconocido' },
  { value: 'S.C.', label: 'Sin Clasificación' }
];

const LINEAS_CGAO = [
  'Administración y Finanzas',
  'Agropecuaria y Agroindustria',
  'Biotecnología y Medio Ambiente',
  'Ciencias del Deporte y la Salud',
  'Construcción e Infraestructura',
  'Desarrollo de Software y Sistemas',
  'Ingeniería, Desarrollo Tecnológico y Robótica',
  'Pedagogía',
  'Sistemas Integrados de Gestión',
  'Turismo, Cultura y Gestión Musical',
];

// ─── InfoRow ──────────────────────────────────────────────────────────────────
const InfoRow = ({ label, value, icon: Icon }) => (
  <div className="flex items-start gap-4 py-4 border-b border-slate-50 last:border-0">
    {Icon && (
      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl mt-0.5">
        <Icon size={14} />
      </div>
    )}
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-800 break-words">{value || <span className="text-slate-300 italic font-normal">No configurado</span>}</p>
    </div>
  </div>
);

// ─── TabBtn ───────────────────────────────────────────────────────────────────
const TabBtn = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-3.5 text-xs font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${
      active
        ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
        : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
    }`}
  >
    <Icon size={14} />
    {label}
  </button>
);

// ─── Main Module ──────────────────────────────────────────────────────────────
const GrupoModule = ({ currentUser, onNotify, onNavigate }) => {
  const [grupo, setGrupo] = useState(null);
  const [semilleros, setSemilleros] = useState([]);
  const [investigadores, setInvestigadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [grupos, sems, users] = await Promise.all([
        GruposAPI.list(),
        SemillerosAPI.list(),
        UsuariosAPI.list(),
      ]);
      // Tomar el primer grupo (INVESTIGADORES CGAO — hay solo uno)
      const g = (grupos || [])[0] || null;
      setGrupo(g);
      setSemilleros(sems || []);
      setInvestigadores((users || []).filter(u => u.rol === 'investigador' || u.rol === 'admin'));
    } catch (err) {
      onNotify?.('Error al cargar datos del grupo: ' + err.message, 'error');
    }
    setLoading(false);
  };

  const handleEdit = () => {
    setFormData({
      ...grupo,
      lineas_investigacion: Array.isArray(grupo?.lineas_investigacion)
        ? grupo.lineas_investigacion.join(', ')
        : grupo?.lineas_investigacion || '',
    });
    setShowEditForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...formData,
        lineas_investigacion: typeof formData.lineas_investigacion === 'string'
          ? formData.lineas_investigacion.split(',').map(l => l.trim()).filter(Boolean)
          : formData.lineas_investigacion,
      };
      await GruposAPI.update(grupo.id, payload);
      onNotify?.('Información del grupo actualizada', 'success');
      setShowEditForm(false);
      loadData();
    } catch (err) {
      onNotify?.('Error al guardar: ' + err.message, 'error');
    }
    setSaving(false);
  };

  const patch = (field) => (e) => {
    const val = e?.target ? e.target.value : e;
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="p-4 bg-indigo-50 rounded-2xl animate-pulse">
          <Layers size={32} className="text-indigo-400" />
        </div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Cargando perfil del grupo...</p>
      </div>
    );
  }

  const lineas = Array.isArray(grupo?.lineas_investigacion)
    ? grupo.lineas_investigacion
    : typeof grupo?.lineas_investigacion === 'string'
      ? grupo.lineas_investigacion.split(',').map(l => l.trim()).filter(Boolean)
      : LINEAS_CGAO;

  const clasificacionBadge = {
    'A1': 'success', 'A': 'success', 'B': 'warning', 'C': 'indigo', 'Reconocido': 'indigo'
  }[grupo?.clasificacion] || 'default';

  return (
    <div className="space-y-6 animate-fadeIn pb-20">

      {/* ─── Header Institucional ────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-600 text-white shadow-2xl shadow-indigo-200/60">
        {/* Orbes decorativos */}
        <div className="absolute top-0 right-0 w-72 h-72 -mr-16 -mt-16 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 -ml-12 -mb-12 bg-indigo-900/20 rounded-full blur-2xl" />

        <div className="relative z-10 p-8">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="flex items-start gap-5">
              {/* Logo del grupo */}
              <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl shadow-lg ring-1 ring-white/30 flex-shrink-0">
                <Layers size={36} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <Badge className="bg-emerald-400/20 text-emerald-100 border-emerald-400/30 font-black text-[10px] uppercase tracking-widest">
                    VIGENTE
                  </Badge>
                  <Badge className="bg-white/20 text-white border-white/30 font-mono text-[10px]">
                    {grupo?.codigo_gruplac || 'GrupLAC por configurar'}
                  </Badge>
                  {grupo?.clasificacion && (
                    <Badge className="bg-amber-400/20 text-amber-100 border-amber-400/30 font-black">
                      CAT. {grupo.clasificacion}
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl font-black leading-tight mb-1">
                  {grupo?.nombre || 'INVESTIGADORES CGAO'}
                </h1>
                <p className="text-indigo-100 font-medium text-sm opacity-90 mb-2">
                  {grupo?.nombre_completo || 'Centro de Gestión Administrativa y Organizacional'}
                </p>
                {(grupo?.director_nombre) && (
                  <p className="text-indigo-200 text-xs font-bold flex items-center gap-2">
                    <Users size={12} /> Director(a): {grupo.director_nombre}
                  </p>
                )}
                {(grupo?.convocatoria_activa) && (
                  <p className="text-indigo-200 text-xs font-bold flex items-center gap-2 mt-1">
                    <Calendar size={12} /> {grupo.convocatoria_activa}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3 print:hidden">
              {grupo?.gruplac_url && (
                <a
                  href={grupo.gruplac_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-md rounded-xl border border-white/20 text-sm font-bold transition-all"
                >
                  <Globe size={16} /> GrupLAC <ArrowUpRight size={14} />
                </a>
              )}
              {currentUser?.rol === 'admin' && (
                <Button
                  onClick={handleEdit}
                  className="bg-white/15 hover:bg-white/25 border-white/20 text-white"
                  variant="outline"
                >
                  <Edit2 size={16} className="mr-2" /> Editar Perfil
                </Button>
              )}
            </div>
          </div>

          {/* Stats rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-white/20">
            {[
              { label: 'Semilleros', value: semilleros.length || 13, icon: Star },
              { label: 'Investigadores', value: investigadores.length, icon: Users },
              { label: 'Líneas', value: lineas.length, icon: Target },
              { label: 'Clasificación', value: grupo?.clasificacion || 'C', icon: Award },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/15">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className="text-indigo-200" />
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">{label}</p>
                </div>
                <p className="text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100 scrollbar-none print:hidden">
          <TabBtn active={activeTab === 'info'}       onClick={() => setActiveTab('info')}       icon={Info}          label="Información" />
          <TabBtn active={activeTab === 'semilleros'} onClick={() => setActiveTab('semilleros')} icon={GraduationCap} label="Semilleros" />
          <TabBtn active={activeTab === 'lineas'}     onClick={() => setActiveTab('lineas')}     icon={Target}        label="Líneas de Investigación" />
          <TabBtn active={activeTab === 'plan'}       onClick={() => setActiveTab('plan')}       icon={FolderOpen}    label="Plan Operativo" />
          <TabBtn active={activeTab === 'gruplac'}    onClick={() => setActiveTab('gruplac')}    icon={Globe}         label="GrupLAC / Control" />
        </div>

        {/* ─── Tab: Información ─────────────────────────────────────────── */}
        {activeTab === 'info' && (
          <div className="p-8 space-y-2 animate-fadeIn">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Building2 size={14} className="text-indigo-500" /> Datos Institucionales del Grupo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
              <div>
                <InfoRow icon={Layers}    label="Nombre del Grupo"      value={grupo?.nombre || 'INVESTIGADORES CGAO'} />
                <InfoRow icon={FileText}  label="Nombre Completo"       value={grupo?.nombre_completo} />
                <InfoRow icon={Shield}    label="Código GrupLAC"        value={grupo?.codigo_gruplac} />
                <InfoRow icon={Award}     label="Clasificación Minciencias" value={grupo?.clasificacion} />
                <InfoRow icon={Calendar}  label="Convocatoria Activa"   value={grupo?.convocatoria_activa || 'Convocatoria 957-2024'} />
              </div>
              <div>
                <InfoRow icon={Users}     label="Director(a)"           value={grupo?.director_nombre || 'Alba Zoraida Vargas Hurtado'} />
                <InfoRow icon={Globe}     label="Email Director(a)"     value={grupo?.director_email} />
                <InfoRow icon={Star}      label="Semilleros Adscritos"  value={`${semilleros.length} semilleros activos`} />
                <InfoRow icon={Users}     label="Investigadores"        value={`${investigadores.length} investigadores vinculados`} />
              </div>
            </div>
            {(grupo?.descripcion_grupo || grupo?.mision) && (
              <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                {grupo?.descripcion_grupo && (
                  <>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descripción</p>
                    <p className="text-sm text-slate-700 leading-relaxed mb-4">{grupo.descripcion_grupo}</p>
                  </>
                )}
                {grupo?.mision && (
                  <>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Misión</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{grupo.mision}</p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── Tab: Semilleros ──────────────────────────────────────────── */}
        {activeTab === 'semilleros' && (
          <div className="p-8 animate-fadeIn">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <GraduationCap size={14} className="text-amber-500" /> Semilleros de Investigación CGAO
              </h2>
              <Badge className="text-xs font-black bg-amber-50 text-amber-700 border-amber-200">
                {semilleros.length} semilleros
              </Badge>
            </div>

            {semilleros.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {semilleros.map((sem, idx) => (
                  <div
                    key={sem.id || idx}
                    className="group p-5 bg-white border border-slate-100 rounded-2xl hover:border-amber-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => onNavigate?.('semilleros')}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white flex items-center justify-center font-black text-sm shadow-lg shadow-amber-100">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg uppercase tracking-wide">
                            {sem.sigla || sem.nombre?.substring(0, 6)}
                          </span>
                          {sem.estado && (
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${
                              sem.estado === 'activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {sem.estado}
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-2 leading-relaxed">
                          {sem.nombre}
                        </p>
                        {(sem.lider_nombre || sem.lider) && (
                          <p className="text-[10px] text-slate-500 mt-1 font-medium">
                            👤 {sem.lider_nombre || sem.lider}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-bold">
                          <span>{sem.total_aprendices || 0} aprendices</span>
                          <span>·</span>
                          <span>{sem.total_investigadores || 0} investigadores</span>
                        </div>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 group-hover:text-amber-500 flex-shrink-0 mt-1 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <GraduationCap size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">Sin semilleros vinculados</p>
                <p className="text-[10px] text-slate-400 mt-1">No hay semilleros registrados en la base de datos para este grupo.</p>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <Button onClick={() => onNavigate?.('semilleros')} variant="outline" className="border-amber-200 text-amber-700 hover:bg-amber-50">
                <GraduationCap size={16} className="mr-2" /> Gestionar todos los Semilleros
              </Button>
            </div>
          </div>
        )}

        {/* ─── Tab: Líneas de Investigación ─────────────────────────────── */}
        {activeTab === 'lineas' && (
          <div className="p-8 animate-fadeIn">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Target size={14} className="text-indigo-500" /> Líneas de Investigación del Grupo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lineas.map((linea, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-200 hover:shadow-sm transition-all group"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-xs flex-shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                    {typeof linea === 'string' ? linea.trim() : linea}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Tab: Plan Operativo ──────────────────────────────────────── */}
        {activeTab === 'plan' && (
          <div className="p-8 animate-fadeIn">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <FolderOpen size={14} className="text-indigo-500" /> Plan Operativo del Centro
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Plan Operativo */}
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-300 transition-colors group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileText size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Plan Operativo</p>
                    <p className="text-xs text-slate-500 font-medium">Documento anual del grupo</p>
                  </div>
                </div>
                {grupo?.plan_operativo_path ? (
                  <a
                    href={`/api/documentos/download/${grupo.plan_operativo_path}`}
                    className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                    target="_blank" rel="noopener noreferrer"
                  >
                    <Download size={14} /> Descargar Plan Operativo
                  </a>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-400 italic mb-3">Plan operativo no cargado aún</p>
                    {currentUser?.rol === 'admin' && (
                      <label className="cursor-pointer">
                        <span className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-2">
                          <Upload size={14} /> Subir Plan Operativo
                        </span>
                        <input type="file" className="hidden" accept=".pdf,.doc,.docx" />
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* Formatos de Semilleros */}
              <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl hover:border-amber-300 transition-colors group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                    <BookOpen size={24} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">Formatos de Semillero</p>
                    <p className="text-xs text-slate-500 font-medium">Formatos de creación y seguimiento</p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 italic mb-3">Los formatos de cada semillero se gestionan desde el módulo de Semilleros</p>
                <Button
                  onClick={() => onNavigate?.('semilleros')}
                  variant="outline"
                  className="w-full border-amber-200 text-amber-700 hover:bg-amber-50 text-xs"
                >
                  <GraduationCap size={14} className="mr-2" /> Ir a Semilleros
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ─── Tab: GrupLAC / Control ───────────────────────────────────── */}
        {activeTab === 'gruplac' && (
          <div className="p-8 animate-fadeIn space-y-6">
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Globe size={14} className="text-indigo-500" /> Control GrupLAC — Scienti MinCiencias
            </h2>

            {/* Resultado medición */}
            <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl border border-indigo-100">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200">
                  <Award size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Resultado Convocatoria 957 - 2024</p>
                  <p className="text-lg font-black text-indigo-900">RECONOCIDO — Categoría C</p>
                  <p className="text-xs text-indigo-600 font-medium mt-1">
                    Directora: Alba Zoraida Vargas Hurtado • Grupo: INVESTIGADORES CGAO
                  </p>
                </div>
              </div>
              {grupo?.gruplac_url ? (
                <a
                  href={grupo.gruplac_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 flex items-center justify-between p-4 bg-white rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Globe size={18} className="text-indigo-600" />
                    <span className="text-sm font-bold text-slate-800">Ver perfil en Scienti · GrupLAC</span>
                  </div>
                  <ArrowUpRight size={18} className="text-indigo-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </a>
              ) : (
                <div className="mt-4 p-4 bg-white/60 rounded-xl border border-dashed border-indigo-200 text-center">
                  <p className="text-xs text-indigo-400 font-medium italic">URL de GrupLAC no configurada</p>
                  {currentUser?.rol === 'admin' && (
                    <button onClick={handleEdit} className="text-xs font-bold text-indigo-600 hover:underline mt-1 flex items-center gap-1 mx-auto">
                      <Edit2 size={12} /> Configurar ahora
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Control CvLAC */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} className="text-slate-500" /> Control CvLAC — Investigadores
                </h3>
                <Button onClick={() => onNavigate?.('cvlac-admin')} variant="outline" className="text-xs border-slate-200">
                  Ver Control CvLAC
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-2xl font-black text-emerald-700">
                    {investigadores.filter(i => i.estado_cv_lac === 'Actualizado').length}
                  </p>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-wide mt-1">Actualizados</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-2xl font-black text-amber-700">
                    {investigadores.filter(i => i.estado_cv_lac === 'Desactualizado').length}
                  </p>
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-wide mt-1">Por Actualizar</p>
                </div>
                <div className="p-4 bg-slate-100 rounded-xl border border-slate-200">
                  <p className="text-2xl font-black text-slate-700">
                    {investigadores.filter(i => !i.estado_cv_lac || i.estado_cv_lac === 'Sin CVLAC').length}
                  </p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wide mt-1">Sin CvLAC</p>
                </div>
              </div>
            </div>

            {/* Auditoría info */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-slate-200 text-slate-600 rounded-xl flex-shrink-0">
                  <Shield size={16} />
                </div>
                <div>
                  <p className="text-xs font-black text-slate-700 mb-1">Auditoría del Sistema</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    La auditoría registra todas las acciones de creación, edición y eliminación en la plataforma:
                    quién hizo el cambio, cuándo y qué modificó. Permite rastrear cambios en proyectos, productos, semilleros e investigadores.
                  </p>
                  {currentUser?.rol === 'admin' && (
                    <button onClick={() => onNavigate?.('auditoria')} className="text-xs font-bold text-indigo-600 hover:underline mt-2 flex items-center gap-1">
                      <ArrowUpRight size={12} /> Ver registros de auditoría
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Modal Editar Grupo ───────────────────────────────────────────── */}
      {showEditForm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="fixed inset-0" onClick={() => setShowEditForm(false)} aria-hidden="true" />
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl border-0 overflow-hidden animate-scaleIn relative z-10 rounded-3xl bg-white">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 sm:px-8 py-5 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md"><Edit2 size={20} /></div>
                <div>
                  <h2 className="text-lg font-black">Editar Perfil del Grupo</h2>
                  <p className="text-indigo-100 text-xs opacity-90 font-medium">INVESTIGADORES CGAO</p>
                </div>
              </div>
              <button onClick={() => setShowEditForm(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors text-indigo-100 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar space-y-4 bg-white flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nombre del Grupo" value={formData.nombre || ''} onChange={patch('nombre')} />
                <Input label="Código GrupLAC" value={formData.codigo_gruplac || ''} onChange={patch('codigo_gruplac')} placeholder="COL000XXXX" />
              </div>
              <Input label="Nombre Completo" value={formData.nombre_completo || ''} onChange={patch('nombre_completo')} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Director(a)" value={formData.director_nombre || ''} onChange={patch('director_nombre')} placeholder="Nombre completo" />
                <Input label="Email Director(a)" value={formData.director_email || ''} onChange={patch('director_email')} type="email" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Clasificación Minciencias" options={CLASIFICACIONES} value={formData.clasificacion || ''} onChange={patch('clasificacion')} />
                <Input label="Convocatoria Activa" value={formData.convocatoria_activa || ''} onChange={patch('convocatoria_activa')} placeholder="Ej: Convocatoria 957-2024" />
              </div>
              <Input label="URL GrupLAC (Scienti)" value={formData.gruplac_url || ''} onChange={patch('gruplac_url')} placeholder="https://scienti.minciencias.gov.co/gruplac/..." />
              <TextArea label="Descripción del Grupo" value={formData.descripcion_grupo || ''} onChange={patch('descripcion_grupo')} rows={3} placeholder="Breve descripción del grupo de investigación" />
              <TextArea label="Misión" value={formData.mision || ''} onChange={patch('mision')} rows={2} />
              <TextArea label="Visión" value={formData.vision || ''} onChange={patch('vision')} rows={2} />
              <TextArea
                label="Líneas de Investigación (separadas por coma)"
                value={formData.lineas_investigacion || ''}
                onChange={patch('lineas_investigacion')}
                rows={3}
                placeholder="Administración y Finanzas, Agropecuaria, Biotecnología..."
              />
            </div>

            <div className="px-6 sm:px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={() => setShowEditForm(false)}>Cancelar</Button>
              <Button variant="sena" onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 size={16} className="mr-2 animate-spin" />Guardando...</> : 'Guardar Cambios'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default GrupoModule;
