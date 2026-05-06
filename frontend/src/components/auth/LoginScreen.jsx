import React, { useState, useEffect } from 'react';
import { Lightbulb, AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Input from '../ui/Input';

const LoginScreen = ({ onLogin, onRegister, apiError: externalApiError }) => {
  const [isLogin,      setIsLogin]      = useState(true);
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [nombre,       setNombre]       = useState('');
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
        const result = await onRegister({ email: cleanEmail, password, nombre: nombre.trim() });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/40 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#39A900] to-[#2d8000] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <Lightbulb size={30} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">SENNOVA CGAO</h1>
          <p className="text-sm text-slate-500 mt-0.5">Sistema de Gestión Investigativa</p>
        </div>

        <Card className="p-6">
          {/* Tab switcher */}
          <div role="tablist" aria-label="Modo de acceso" className="flex gap-1 mb-5 p-1 bg-slate-100 rounded-lg">
            {[
              { label: 'Iniciar Sesión', value: true },
              { label: 'Registrarse',    value: false },
            ].map(({ label, value }) => (
              <button
                key={label}
                role="tab"
                aria-selected={isLogin === value}
                onClick={() => switchMode(value)}
                className={[
                  'flex-1 py-2 text-sm font-medium rounded-md transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
                  isLogin === value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700',
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
                'mb-5 px-3 py-2.5 rounded-lg text-sm flex items-start gap-2 border',
                isSuccess
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200',
              ].join(' ')}
            >
              {isSuccess
                ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
                : <AlertCircle  size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
              }
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                label="Nombre completo"
                placeholder="Tu nombre completo"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                autoComplete="name"
                required
              />
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
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              }
            />

            <Button
              type="submit"
              variant="sena"
              size="lg"
              className="w-full mt-2"
              disabled={loading}
            >
              {loading && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
              {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
            </Button>
          </form>

          {/* Dev credentials — remove in production */}
          {isLogin && (
            <details className="mt-5 group">
              <summary className="text-xs text-slate-400 cursor-pointer select-none hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded">
                Credenciales de prueba
              </summary>
              <div className="mt-2 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-1">
                <p><span className="font-semibold text-slate-700">Admin:</span> admin@sena.edu.co / 123456</p>
                <p><span className="font-semibold text-slate-700">Investigador:</span> mtejedorm@sena.edu.co / 123456</p>
              </div>
            </details>
          )}
        </Card>

        <p className="text-center text-xs text-slate-400 mt-6">
          Sistema SENNOVA CGAO © 2025
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;
