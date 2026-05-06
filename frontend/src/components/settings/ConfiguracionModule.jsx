import React, { useState } from 'react';
import { 
  User, Shield, Bell, Database, Globe, 
  Lock, Save, RefreshCw, LogOut, CheckCircle2,
  Cpu, HardDrive, Activity, Zap, Key, 
  Eye, EyeOff, Trash2, Smartphone, Mail,
  ExternalLink, Download, AlertTriangle,
  ChevronRight, Calendar, Clock, FileText
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { AuthAPI } from '../../api/auth';
import { SystemAPI } from '../../api/system';

const SidebarItem = ({ id, label, icon: Icon, active, onClick }) => (
  <button
    onClick={() => onClick(id)}
    className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 ${
      active 
        ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' 
        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
    }`}
  >
    <Icon size={18} strokeWidth={active ? 2.5 : 2} />
    {label}
  </button>
);

const SectionHeader = ({ title, subtitle }) => (
  <div className="mb-8">
    <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
    <p className="text-slate-500 text-sm mt-1 font-medium">{subtitle}</p>
  </div>
);

const ConfiguracionModule = ({ currentUser, onUpdateUser, onNotify }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [profile, setProfile] = useState({
    nombre: currentUser?.nombre || '',
    email: currentUser?.email || '',
    sede: currentUser?.sede || '',
    regional: currentUser?.regional || '',
    nivel_academico: currentUser?.nivel_academico || '',
    cv_lac_url: currentUser?.cv_lac_url || ''
  });

  const handleBackup = async () => {
    onNotify?.('Generando respaldo de base de datos...', 'info');
    try {
      // Para descargas de archivos solemos necesitar un link directo o manejar el blob
      // Por simplicidad en este entorno, informamos el inicio
      const res = await SystemAPI.getBackup();
      if (res.url) {
        onNotify?.('Backup iniciado en servidor: ' + res.url, 'success');
      } else {
        onNotify?.('Copia de seguridad generada localmente', 'success');
      }
    } catch (err) {
      onNotify?.('Error al generar backup: ' + err.message, 'error');
    }
  };

  const handleClearCache = async () => {
    onNotify?.('Optimizando infraestructura...', 'info');
    try {
      await SystemAPI.clearCache();
      onNotify?.('Caché del sistema depurada correctamente', 'success');
    } catch (err) {
      onNotify?.('Error al limpiar caché', 'error');
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await AuthAPI.updateMe(profile);
      onNotify?.('Perfil institucional actualizado', 'success');
      onUpdateUser?.();
    } catch (err) {
      onNotify?.('Error al actualizar: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Control de Sistema</h1>
        <p className="text-slate-500 mt-2 font-medium">Gestiona tu identidad digital y parámetros de la plataforma.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Sidebar Nav */}
        <div className="lg:col-span-3 space-y-2">
          <SidebarItem id="account" label="Mi Cuenta" icon={User} active={activeTab === 'account'} onClick={setActiveTab} />
          <SidebarItem id="security" label="Seguridad" icon={Shield} active={activeTab === 'security'} onClick={setActiveTab} />
          <SidebarItem id="notifications" label="Notificaciones" icon={Bell} active={activeTab === 'notifications'} onClick={setActiveTab} />
          {currentUser?.rol === 'admin' && (
            <div className="pt-4 mt-4 border-t border-slate-100">
              <p className="px-5 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Admin Panel</p>
              <SidebarItem id="system" label="Infraestructura" icon={Cpu} active={activeTab === 'system'} onClick={setActiveTab} />
            </div>
          )}
          
          <div className="pt-8">
            <button 
              onClick={() => AuthAPI.logout()}
              className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all"
            >
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9">
          
          <Card className="p-8 md:p-10 border-0 shadow-2xl shadow-slate-200/50 min-h-[600px] relative overflow-hidden bg-white">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            {activeTab === 'account' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <SectionHeader 
                  title="Identidad Institucional" 
                  subtitle="Información técnica vinculada a tu perfil de investigador SENNOVA."
                />
                
                <form onSubmit={handleUpdateProfile} className="space-y-8">
                  <div className="flex flex-col md:flex-row items-center gap-8 mb-10 pb-10 border-b border-slate-50">
                    <div className="relative group">
                      <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-3xl font-black shadow-2xl shadow-emerald-500/20 transform group-hover:rotate-6 transition-transform">
                        {(profile.nombre || '?').charAt(0)}
                      </div>
                      <button type="button" className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-600 hover:text-emerald-600 transition-colors">
                        <Smartphone size={16} />
                      </button>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">{profile.nombre || 'Sin nombre'}</h4>
                      <p className="text-sm text-slate-500 font-medium">{profile.email}</p>
                      <div className="flex gap-2 mt-3">
                        <Badge variant="outline" className="bg-emerald-50 border-emerald-100 text-emerald-700 font-black text-[10px]">{currentUser?.rol_sennova || 'S/R'}</Badge>
                        <Badge variant="outline" className="bg-slate-50 border-slate-100 text-slate-500 font-black text-[10px]">{profile.sede || 'Sede No Definida'}</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Completo</label>
                      <input 
                        className="w-full px-5 py-3.5 bg-slate-50 border-0 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all shadow-inner"
                        value={profile.nombre}
                        onChange={(e) => setProfile({...profile, nombre: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel Académico</label>
                      <select 
                        className="w-full px-5 py-3.5 bg-slate-50 border-0 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all shadow-inner appearance-none"
                        value={profile.nivel_academico}
                        onChange={(e) => setProfile({...profile, nivel_academico: e.target.value})}
                      >
                        <option value="">Seleccionar nivel</option>
                        <option value="Técnico">Técnico</option>
                        <option value="Tecnólogo">Tecnólogo</option>
                        <option value="Profesional">Profesional</option>
                        <option value="Especialización">Especialización</option>
                        <option value="Maestría">Maestría</option>
                        <option value="Doctorado">Doctorado</option>
                      </select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL CVLAC (Scienti)</label>
                      <div className="relative">
                        <input 
                          className="w-full px-5 py-3.5 bg-slate-50 border-0 rounded-2xl text-sm font-bold text-slate-700 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all shadow-inner"
                          placeholder="https://scienti.minciencias.gov.co/..."
                          value={profile.cv_lac_url}
                          onChange={(e) => setProfile({...profile, cv_lac_url: e.target.value})}
                        />
                        <a href={profile.cv_lac_url} target="_blank" rel="noreferrer" className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-500 transition-colors">
                          <ExternalLink size={16} />
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-10">
                    <Button type="submit" variant="sena" disabled={loading} className="h-12 px-10 rounded-2xl shadow-xl shadow-emerald-600/20">
                      {loading ? <RefreshCw size={18} className="animate-spin mr-2" /> : <Save size={18} className="mr-2" strokeWidth={3} />}
                      Actualizar Perfil
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <SectionHeader 
                  title="Acceso y Seguridad" 
                  subtitle="Protege tu cuenta con parámetros de autenticación fuertes."
                />
                
                <div className="space-y-10">
                  <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                      <div className="flex items-center gap-5">
                        <div className="p-4 bg-white rounded-2xl text-indigo-600 shadow-lg shadow-indigo-100">
                          <Key size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900">Autenticación por Contraseña</p>
                          <p className="text-xs text-slate-500 mt-1 font-medium italic">Última actualización: Hace 3 meses</p>
                        </div>
                      </div>
                      <Button variant="outline" className="rounded-xl border-slate-200">Cambiar Contraseña</Button>
                    </div>
                  </div>

                  <div className="space-y-6 px-4">
                    <div className="flex items-center justify-between py-4 border-b border-slate-50">
                      <div className="flex items-center gap-4">
                        <Mail className="text-slate-400" size={20} />
                        <div>
                          <p className="text-sm font-bold text-slate-900">Sesiones Activas</p>
                          <p className="text-xs text-slate-400">Ver y cerrar sesiones en otros dispositivos</p>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-300" size={18} />
                    </div>
                    <div className="flex items-center justify-between py-4 border-b border-slate-50">
                      <div className="flex items-center gap-4">
                        <Zap className="text-slate-400" size={20} />
                        <div>
                          <p className="text-sm font-bold text-slate-900">Logs de Inicio</p>
                          <p className="text-xs text-slate-400">Historial de accesos recientes</p>
                        </div>
                      </div>
                      <ChevronRight className="text-slate-300" size={18} />
                    </div>
                  </div>

                  <div className="p-6 bg-rose-50 rounded-3xl border border-rose-100 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white text-rose-500 rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                        <Trash2 size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-rose-700">Eliminar Cuenta</p>
                        <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest mt-0.5">Esta acción es irreversible</p>
                      </div>
                    </div>
                    <button className="text-rose-600 font-black text-xs hover:underline decoration-2 underline-offset-4">Solicitar Baja</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <SectionHeader 
                  title="Preferencias de Alertas" 
                  subtitle="Configura los canales y la frecuencia de tus notificaciones."
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { id: 'n1', label: 'Cierre de Convocatorias', desc: 'Alertas 15, 5 y 1 día antes del cierre.', icon: Calendar, color: 'text-emerald-500' },
                    { id: 'n2', label: 'Entregables Próximos', desc: 'Avisos sobre hitos de tus proyectos.', icon: Clock, color: 'text-blue-500' },
                    { id: 'n3', label: 'Resumen de Auditoría', desc: 'Reporte semanal de cambios en el sistema.', icon: FileText, color: 'text-amber-500' },
                    { id: 'n4', label: 'Productos Verificados', desc: 'Notificación cuando un admin apruebe un producto.', icon: CheckCircle2, color: 'text-purple-500' },
                  ].map(n => (
                    <label key={n.id} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer group flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className={`p-2 rounded-xl bg-white shadow-sm group-hover:scale-110 transition-transform ${n.color}`}>
                          <n.icon size={20} />
                        </div>
                        <input type="checkbox" defaultChecked className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500/20 border-slate-200" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{n.label}</p>
                        <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-1">{n.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                <SectionHeader 
                  title="Estado de Infraestructura" 
                  subtitle="Monitoreo de servicios core y herramientas de mantenimiento."
                />
                
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Servidor API</p>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-lg font-black tracking-tight">ONLINE</span>
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Latencia</p>
                      <div className="flex items-center gap-2">
                        <Zap size={18} className="text-amber-500" />
                        <span className="text-lg font-black text-slate-700 tracking-tight">24ms</span>
                      </div>
                    </div>
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Almacenamiento</p>
                      <div className="flex items-center gap-2">
                        <HardDrive size={18} className="text-indigo-500" />
                        <span className="text-lg font-black text-slate-700 tracking-tight">42%</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">Herramientas de Recuperación</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button 
                        onClick={handleBackup}
                        className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-[2rem] hover:shadow-xl hover:shadow-slate-200/50 hover:border-indigo-200 transition-all text-left group"
                      >
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-110 transition-transform">
                          <Download size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">Exportar Dump SQL</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Respaldo completo</p>
                        </div>
                      </button>
                      <button 
                        onClick={handleClearCache}
                        className="flex items-center gap-4 p-5 bg-white border border-slate-100 rounded-[2rem] hover:shadow-xl hover:shadow-slate-200/50 hover:border-amber-200 transition-all text-left group"
                      >
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
                          <RefreshCw size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-800">Limpiar Caché RAG</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Optimizar memoria</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex gap-4">
                    <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Zona de Riesgo Administrativo</p>
                      <p className="text-xs text-amber-600 leading-relaxed mt-1">
                        Cualquier modificación en esta sección puede afectar la disponibilidad de los servicios para todos los investigadores. Proceda con precaución.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </Card>
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionModule;
