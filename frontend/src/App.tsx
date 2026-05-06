import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import LoginScreen from './components/auth/LoginScreen';
import DashboardModule from './components/dashboard/DashboardModule';
import ProyectosModule from './components/projects/ProyectosModule';
import InvestigadoresModule from './components/users/InvestigadoresModule';
import ProductosModule from './components/products/ProductosModule';
import GruposModule from './components/groups/GruposModule';
import SemillerosModule from './components/seedbeds/SemillerosModule';
import ConvocatoriasModule from './components/calls/ConvocatoriasModule';
import ReportesModule from './components/reports/ReportesModule';
import ConfiguracionModule from './components/settings/ConfiguracionModule';
import BitacoraModule from './components/projects/BitacoraModule';
import CronogramaModule from './components/deliverables/CronogramaModule';
import RetosModule from './components/ideas/RetosModule';
import CVLACAdminModule from './components/admin/CVLACAdminModule';
import AuditoriaModule from './components/admin/AuditoriaModule';
import DocumentCenterModule from './components/admin/DocumentCenterModule';
import PerfilModule from './components/profile/PerfilModule';
import NotificacionesModule from './components/notifications/NotificacionesModule';
import GlobalSearch from './components/common/GlobalSearch';
import QuickActionHub from './components/common/QuickActionHub';
import { Toaster, toast } from 'react-hot-toast';

function AppContent() {
  const { currentUser, login, register, logout, updateUser } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const onNotify = (message, type = 'success') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast(message);
  };

  useEffect(() => {
    const onKeydown = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();

      if (key === 'k') {
        event.preventDefault();
        setIsSearchOpen(true);
      }

      if (key === 'j') {
        event.preventDefault();
        setIsQuickActionsOpen(true);
      }
    };

    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={async (e, p) => {
          try {
            await login(e, p);
            return { success: true };
          } catch (err) {
            return { success: false, error: err.message };
          }
        }}
        onRegister={async (data) => {
          try {
            await register(data);
            return { success: true };
          } catch (err) {
            return { success: false, error: err.message };
          }
        }}
        apiError={null}
      />
    );
  }

  const navigateTo = (view) => {
    setCurrentView(view);
  };

  const handleModuleAction = ({ module, form, initialData }) => {
    setPendingAction({ module, form, initialData });
    setCurrentView(module);
  };

  const handleActionHandled = () => {
    setPendingAction(null);
  };

  const handleSearchNavigate = (result) => {
    const routeByType = {
      proyecto: 'proyectos',
      proyectos: 'proyectos',
      investigador: 'investigadores',
      investigadores: 'investigadores',
      grupo: 'grupos',
      grupos: 'grupos',
      producto: 'productos',
      productos: 'productos',
    };

    const routeByUrl = {
      '/proyectos': 'proyectos',
      '/investigadores': 'investigadores',
      '/grupos': 'grupos',
      '/productos': 'productos',
    };

    const nextView = routeByUrl[result?.url] || routeByType[result?.type] || 'dashboard';
    setCurrentView(nextView);
  };

  const renderView = () => {
    const props = { currentUser, onNotify, onNavigate: navigateTo, onModuleAction: handleModuleAction };
    const actionFor = (module) => (pendingAction?.module === module ? { form: pendingAction.form, data: pendingAction.initialData } : undefined);
    
    switch (currentView) {
      case 'dashboard':      return <DashboardModule {...props} onOpenSearch={() => setIsSearchOpen(true)} onNewProject={() => handleModuleAction({ module: 'proyectos', form: 'create' })} />;
      case 'perfil':         return <PerfilModule {...props} onUpdateUser={updateUser} />;
      case 'proyectos':      return <ProyectosModule {...props} initialAction={actionFor('proyectos')} onActionHandled={handleActionHandled} />;
      case 'mis-proyectos':  return <ProyectosModule {...props} initialAction={actionFor('mis-proyectos')} onActionHandled={handleActionHandled} />;
      case 'investigadores': return <InvestigadoresModule {...props} />;
      case 'productos':      return <ProductosModule {...props} />;
      case 'mis-productos':  return <ProductosModule {...props} />;
      case 'grupos':         return <GruposModule {...props} />;
      case 'semilleros':     return <SemillerosModule {...props} />;
      case 'convocatorias':  return <ConvocatoriasModule {...props} />;
      case 'reportes':       return <ReportesModule {...props} />;
      case 'configuracion':  return <ConfiguracionModule {...props} onUpdateUser={updateUser} />;
      case 'bitacora':       return <BitacoraModule {...props} />;
      case 'cronograma':     return <CronogramaModule {...props} />;
      case 'retos':          return <RetosModule {...props} onModuleAction={handleModuleAction} />;
      case 'notificaciones': return <NotificacionesModule {...props} />;
      case 'cvlac_admin':    return <CVLACAdminModule {...props} />;
      case 'cvlac-admin':    return <CVLACAdminModule {...props} />;
      case 'auditoria':      return currentUser?.rol === 'admin' ? <AuditoriaModule {...props} /> : <DashboardModule {...props} onOpenSearch={() => setIsSearchOpen(true)} onNewProject={() => handleModuleAction({ module: 'proyectos', form: 'create' })} />;
      case 'documentos':     return <DocumentCenterModule {...props} />;
      case 'biblioteca':     return <DocumentCenterModule {...props} />;
      default:               return <DashboardModule {...props} onOpenSearch={() => setIsSearchOpen(true)} onNewProject={() => handleModuleAction({ module: 'proyectos', form: 'create' })} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar 
        currentUser={currentUser} 
        currentModule={currentView} 
        onNavigate={navigateTo} 
        onLogout={logout} 
        onOpenSearch={() => setIsSearchOpen(true)}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 print:max-w-none print:p-0 print:m-0 print:pt-0">
        {renderView()}
      </main>
      <GlobalSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onNavigate={handleSearchNavigate}
      />
      <QuickActionHub
        isOpen={isQuickActionsOpen}
        onClose={() => setIsQuickActionsOpen(false)}
        onAction={handleModuleAction}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" />
      <AppContent />
    </AuthProvider>
  );
}
