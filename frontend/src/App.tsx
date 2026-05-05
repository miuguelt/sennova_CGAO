import React, { useState } from 'react';
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
import DocumentCenterModule from './components/admin/DocumentCenterModule';
import PerfilModule from './components/profile/PerfilModule';
import NotificacionesModule from './components/notifications/NotificacionesModule';
import { Toaster, toast } from 'react-hot-toast';

function AppContent() {
  const { currentUser, login, register, logout, updateUser } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');

  const onNotify = (message, type = 'success') => {
    if (type === 'success') toast.success(message);
    else if (type === 'error') toast.error(message);
    else toast(message);
  };

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
      />
    );
  }

  const renderView = () => {
    const props = { currentUser, onNotify, onNavigate: setCurrentView };
    
    switch (currentView) {
      case 'dashboard':      return <DashboardModule {...props} />;
      case 'perfil':         return <PerfilModule {...props} onUpdateUser={updateUser} />;
      case 'proyectos':      return <ProyectosModule {...props} />;
      case 'mis-proyectos':  return <ProyectosModule {...props} />;
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
      case 'retos':          return <RetosModule {...props} />;
      case 'notificaciones': return <NotificacionesModule {...props} />;
      case 'cvlac_admin':    return <CVLACAdminModule {...props} />;
      case 'cvlac-admin':    return <CVLACAdminModule {...props} />;
      case 'documentos':     return <DocumentCenterModule {...props} />;
      case 'biblioteca':     return <DocumentCenterModule {...props} />;
      default:               return <DashboardModule {...props} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar 
        currentUser={currentUser} 
        currentModule={currentView} 
        onNavigate={setCurrentView} 
        onLogout={logout} 
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {renderView()}
      </main>
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
