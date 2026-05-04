import React, { useState, useEffect } from 'react';
import { RefreshCw, Server, Plus, Zap } from 'lucide-react';

// Context & API
import { AuthProvider, useAuth } from './context/AuthContext';
import { API_URL } from './api/index.js';

// Components
import Navbar from './components/layout/Navbar';
import LoginScreen from './components/auth/LoginScreen';
import Card from './components/ui/Card';
import Button from './components/ui/Button';
import GlobalSearch from './components/common/GlobalSearch';
import Toast from './components/ui/Toast';
import QuickActionHub from './components/common/QuickActionHub';

// Modules
import DashboardModule from './components/dashboard/DashboardModule';
import PerfilModule from './components/profile/PerfilModule';
import InvestigadoresModule from './components/users/InvestigadoresModule';
import ProyectosModule from './components/projects/ProyectosModule';
import GruposModule from './components/groups/GruposModule';
import SemillerosModule from './components/seedbeds/SemillerosModule';
import ConvocatoriasModule from './components/calls/ConvocatoriasModule';
import ProductosModule from './components/products/ProductosModule';
import ConfiguracionModule from './components/settings/ConfiguracionModule';
import ReportesModule from './components/reports/ReportesModule';
import CVLACAdminModule from './components/admin/CVLACAdminModule';
import DocumentCenterModule from './components/admin/DocumentCenterModule';
import RetosModule from './components/ideas/RetosModule';
import NotificacionesModule from './components/notifications/NotificacionesModule';
import CronogramaModule from './components/deliverables/CronogramaModule';
import BitacoraModule from './components/projects/BitacoraModule';

const AppContent = () => {
  const { 
    currentUser, loading, login, register, logout, 
    updateUser, apiError, apiConnected, retryConnection 
  } = useAuth();
  
  const [currentModule, setCurrentModule] = useState('dashboard');
  const [initialModuleAction, setInitialModuleAction] = useState(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isActionHubOpen, setIsActionHubOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const showNotify = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleNavigate = (module, action = null) => {
    setInitialModuleAction(action);
    setCurrentModule(module);
  };

  // Atajos de Teclado Globales
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+K -> Búsqueda
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Ctrl+J -> Centro de Acción
      if ((e.ctrlKey || e.metaKey) && e.key === 'j') {
        e.preventDefault();
        setIsActionHubOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGlobalNavigate = (result) => {
    // Mapeo de tipos de resultado a módulos
    const moduleMap = {
      'proyecto': 'proyectos',
      'investigador': 'investigadores',
      'grupo': 'grupos',
      'producto': 'productos'
    };
    
    const targetModule = moduleMap[result.type];
    if (targetModule) {
      handleNavigate(targetModule);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw size={48} className="animate-spin mx-auto text-emerald-600 mb-4" />
          <p className="text-slate-500">Conectando al servidor...</p>
          <p className="text-xs text-slate-400 mt-2">{API_URL}</p>
        </div>
      </div>
    );
  }

  if (!apiConnected) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Server size={32} className="text-rose-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Servidor No Disponible</h2>
          <p className="text-slate-500 mb-4">
            No se puede conectar al backend. Verifica que el servidor esté corriendo en:
          </p>
          <code className="block bg-slate-100 p-2 rounded text-sm mb-6">{API_URL}</code>
          <div className="space-y-2 text-sm text-slate-500 mb-6 text-left">
            <p>Para iniciar el backend:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Abre una terminal</li>
              <li>Ve a la carpeta <code>backend/</code></li>
              <li>Ejecuta: <code>uvicorn app.main:app --reload</code></li>
            </ol>
          </div>
          {apiError && (
            <div className="bg-rose-50 text-rose-700 p-3 rounded-lg text-sm mb-4">
              {apiError}
            </div>
          )}
          <Button onClick={retryConnection} variant="primary" className="w-full">
            <RefreshCw size={16} className="mr-2" /> Reintentar Conexión
          </Button>
        </Card>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={login} onRegister={register} apiError={apiError} />;
  }

  const renderModule = () => {
    switch (currentModule) {
      case 'dashboard':
        return (
          <DashboardModule 
            currentUser={currentUser} 
            onNotify={showNotify} 
            onOpenSearch={() => setIsSearchOpen(true)}
            onNewProject={() => handleNavigate('proyectos', 'create')}
          />
        );
      case 'perfil':
        return <PerfilModule currentUser={currentUser} onUpdateUser={updateUser} onNotify={showNotify} />;
      case 'investigadores':
        return (
          <InvestigadoresModule 
            currentUser={currentUser} 
            onNotify={showNotify} 
            initialAction={initialModuleAction}
            onActionHandled={() => setInitialModuleAction(null)}
          />
        );
      case 'proyectos':
      case 'mis-proyectos':
        return (
          <ProyectosModule 
            currentUser={currentUser} 
            onNotify={showNotify} 
            initialAction={initialModuleAction}
            onActionHandled={() => setInitialModuleAction(null)}
          />
        );
      case 'grupos':
        return <GruposModule currentUser={currentUser} onNotify={showNotify} />;
      case 'semilleros':
        return <SemillerosModule currentUser={currentUser} onNotify={showNotify} />;
      case 'convocatorias':
        return (
          <ConvocatoriasModule 
            currentUser={currentUser} 
            onNotify={showNotify} 
            onNewProject={() => handleNavigate('proyectos', 'create')}
          />
        );
      case 'productos':
      case 'mis-productos':
        return (
          <ProductosModule 
            currentUser={currentUser} 
            onNotify={showNotify} 
            initialAction={initialModuleAction}
            onActionHandled={() => setInitialModuleAction(null)}
          />
        );
      case 'configuracion':
        return <ConfiguracionModule currentUser={currentUser} onUpdateUser={updateUser} onNotify={showNotify} />;
      case 'reportes':
        return (
          <ReportesModule 
            currentUser={currentUser} 
            onNotify={showNotify} 
            onNavigate={handleNavigate}
          />
        );
      case 'cvlac-admin':
        return <CVLACAdminModule currentUser={currentUser} onNotify={showNotify} />;
      case 'biblioteca':
        return <DocumentCenterModule onNotify={showNotify} />;
      case 'retos':
        return <RetosModule currentUser={currentUser} onNotify={showNotify} />;
      case 'notificaciones':
        return <NotificacionesModule currentUser={currentUser} onNotify={showNotify} onNavigate={setCurrentModule} />;
      case 'cronograma':
        return <CronogramaModule currentUser={currentUser} onNotify={showNotify} />;
      case 'bitacora':
        return <BitacoraModule currentUser={currentUser} onNotify={showNotify} />;
      default:
        return (
          <DashboardModule 
            currentUser={currentUser} 
            onNotify={showNotify} 
            onOpenSearch={() => setIsSearchOpen(true)}
            onNewProject={() => handleNavigate('proyectos', 'create')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative overflow-x-hidden">
      {/* Notificaciones */}
      {toast && (
        <div className="fixed top-20 left-4 right-4 sm:left-auto sm:top-24 sm:right-6 z-[200] flex justify-center sm:block pointer-events-none">
          <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
        </div>
      )}

      {/* Componentes de Productividad */}
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onNavigate={handleGlobalNavigate}
      />
      <QuickActionHub 
        isOpen={isActionHubOpen} 
        onClose={() => setIsActionHubOpen(false)} 
        onAction={(action) => handleNavigate(action.module, action.form)}
      />

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={() => setIsActionHubOpen(true)}
        className="fixed bottom-24 sm:bottom-8 right-6 sm:right-8 z-[140] w-14 h-14 sm:w-16 sm:h-16 bg-slate-900 text-white rounded-full shadow-2xl hover:bg-emerald-600 hover:scale-110 active:scale-95 transition-all flex items-center justify-center group border-4 border-white"
        title="Acciones Rápidas (Ctrl+J)"
      >
        <Plus size={28} className="sm:w-8 sm:h-8 group-hover:rotate-90 transition-transform duration-300" />
        <div className="absolute -top-12 right-0 bg-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-100 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          <span className="text-slate-900 text-xs font-semibold flex items-center gap-2">
            <Zap size={12} fill="currentColor" className="text-amber-500" /> Command Center
          </span>
        </div>
      </button>

      <Navbar 
        currentUser={currentUser} 
        onLogout={logout} 
        onNavigate={handleNavigate} 
        currentModule={currentModule} 
        onOpenSearch={() => setIsSearchOpen(true)}
      />
      <main className="max-w-7xl mx-auto w-full flex-grow p-4 pb-20 sm:pb-4">
        {renderModule()}
      </main>
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-slate-500 gap-2">
            <p>"Nuestro grupo no solo hace investigación — la gestiona con inteligencia."</p>
            <p>Sistema SENNOVA CGAO © 2025</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
