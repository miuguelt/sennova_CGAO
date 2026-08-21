import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, AlertCircle, CheckCircle2, Eye, EyeOff, Loader2,
  Shield, GraduationCap, Briefcase, User as UserIcon, Sparkles
} from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import DevLoginPanel from './DevLoginPanel';

const LoginScreen = ({ onLogin, onRegister, apiError: externalApiError }) => {
  const [isLogin,      setIsLogin]      = useState(true);
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [nombre,       setNombre]       = useState('');
  const [rol,          setRol]          = useState('investigador');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  useEffect(() => {
    if (externalApiError) setError(externalApiError);
  }, [externalApiError]);

  const isSuccess = error.includes('exitoso');

  const switchMode = (login) => {
    setIsLogin(login);
    setError('');
    setPassword('');
    setShowPassword(false);
  };

  const handleTestCredential = (testEmail, testPassword) => {
    setEmail(testEmail);
    setPassword(testPassword);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError('Ingresa tu correo institucional');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Ingresa un correo institucional válido');
      return;
    }

    if (!password) {
      setError('Ingresa tu contraseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const result = await onLogin(cleanEmail, password);
        if (!result.success) setError(result.error);
      } else {
        if (!nombre.trim()) {
          setError('El nombre es requerido');
          setLoading(false);
          return;
        }
        const result = await onRegister({ 
          email: cleanEmail, 
          password, 
          nombre: nombre.trim(),
          rol: rol
        });
        if (!result.success) {
          setError(result.error);
        } else {
          switchMode(true);
          setError('Registro exitoso. Ahora puedes iniciar sesión.');
        }
      }
    } catch {
      setError('Error inesperado. Inténtalo de nuevo.');
    }

    setLoading(false);
  };

  const UserTypeCard = ({ icon: Icon, title, desc, colorCls, bgCls }) => (
    <div className={`p-4 rounded-2xl border border-slate-100 bg-white shadow-sm flex flex-col items-center text-center space-y-2 hover:shadow-md transition-all`}>
      <div className={`p-3 rounded-xl ${bgCls} ${colorCls}`}>
        <Icon size={20} />
      </div>
      <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">{title}</h4>
      <p className="text-[10px] text-slate-500 leading-tight">{desc}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Info and User Types */}
        <div className="hidden lg:block space-y-10">
          <div className="space-y-4">
            <div className="w-20 h-20 bg-gradient-to-br from-[#39A900] to-[#2d8000] rounded-[2rem] flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/20 rotate-3">
              <Lightbulb size={40} className="text-white" />
            </div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-none">
              Ecosistema de <br />
              <span className="text-emerald-600">Investigación</span>
            </h1>
            <p className="text-lg text-slate-500 font-medium max-w-md leading-relaxed">
              Plataforma integral para la gestión de proyectos, semilleros y producción científica del Centro de Operaciones CGAO.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <UserTypeCard 
              icon={Briefcase} 
              title="Investigador" 
              desc="Lidera proyectos y gestiona producción."
              colorCls="text-indigo-600"
              bgCls="bg-indigo-50"
            />
            <UserTypeCard 
              icon={GraduationCap} 
              title="Aprendiz" 
              desc="Participa en semilleros y bitácoras."
              colorCls="text-emerald-600"
              bgCls="bg-emerald-50"
            />
            <UserTypeCard 
              icon={Shield} 
              title="Administrador" 
              desc="Control total y auditoría del sistema."
              colorCls="text-amber-600"
              bgCls="bg-amber-50"
            />
          </div>

          <div className="flex items-center gap-4 p-5 bg-white/50 backdrop-blur-sm rounded-3xl border border-white shadow-sm">
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">U{i}</div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-white bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">+50</div>
            </div>
            <p className="text-xs font-bold text-slate-600">Únete a la red de investigadores del SENA.</p>
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div className="w-full max-w-sm mx-auto">
          {/* Logo Mobile */}
          <div className="text-center mb-8 lg:hidden">
            <div className="w-16 h-16 bg-gradient-to-br from-[#39A900] to-[#2d8000] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
              <Lightbulb size={30} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">SENNOVA CGAO</h1>
            <p className="text-sm text-slate-500 mt-0.5">Sistema de Gestión Investigativa</p>
          </div>

          <Card className="p-8 shadow-2xl shadow-slate-200/50 border-0 ring-1 ring-slate-100">
            {/* Tab switcher */}
            <div role="tablist" aria-label="Modo de acceso" className="flex gap-1 mb-8 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
              {[
                { label: 'Ingreso', value: true },
                { label: 'Registro',    value: false },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  role="tab"
                  aria-selected={isLogin === value}
                  onClick={() => switchMode(value)}
                  className={[
                    'flex-1 py-3 text-xs font-black uppercase tracking-widest rounded-xl transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                    isLogin === value
                      ? 'bg-white text-slate-950 shadow-md border border-slate-200'
                      : 'text-slate-600 hover:text-slate-950 font-bold',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Alert */}
            {error && (
              <div
                role="alert"
                className={[
                  'mb-6 px-4 py-3 rounded-2xl text-xs font-bold flex items-start gap-3 border animate-fadeIn',
                  isSuccess
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-rose-50 text-rose-900 border-rose-300',
                ].join(' ')}
              >
                {isSuccess
                  ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5 text-emerald-700" aria-hidden="true" />
                  : <AlertCircle  size={16} className="flex-shrink-0 mt-0.5 text-rose-700" aria-hidden="true" />
                }
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <>
                  <Input
                    label="Nombre completo"
                    placeholder="Tu nombre completo"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    autoComplete="name"
                    required
                  />
                  <Select
                    label="Tipo de Usuario"
                    options={[
                      { value: 'investigador', label: 'Investigador SENNOVA' },
                      { value: 'instructor',   label: 'Instructor Investigador / Tutor' },
                      { value: 'aprendiz',     label: 'Aprendiz (Semillero de Investigación)' }
                    ]}
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                    required
                  />
                </>
              )}

              <Input
                label="Correo institucional"
                type="email"
                placeholder="nombre@sena.edu.co"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />

              <Button
                type="submit"
                variant="sena"
                size="lg"
                className="w-full h-14 text-sm font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20"
                disabled={loading}
              >
                {loading && <Loader2 size={18} className="animate-spin mr-2" aria-hidden="true" />}
                {isLogin ? 'Iniciar Sesión' : 'Unirse Ahora'}
              </Button>
            </form>
            {isLogin && import.meta.env.DEV && (
              <div className="mt-6 border-t border-slate-100 pt-6">
                <DevLoginPanel onSelect={(id, pass) => {
                  setEmail(id);
                  setPassword(pass);
                }} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
