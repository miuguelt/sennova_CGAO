import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { toast } from 'react-hot-toast';
import { useUnsavedChangesGuard } from '../context/UnsavedChangesContext';

const { authState, refreshState, appViewState } = vi.hoisted(() => ({
  authState: { currentUser: { id: 'learner-1', nombre: 'Aprendiz', rol: 'aprendiz' }, logout: vi.fn() },
  refreshState: { listener: null, navbarMounts: 0 },
  appViewState: { save: vi.fn(), discard: vi.fn() },
}));

vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: () => ({
    currentUser: authState.currentUser,
    loading: authState.loading || false,
    login: vi.fn(),
    register: vi.fn(),
    logout: authState.logout,
    updateUser: vi.fn(),
    apiError: null,
  }),
}));
vi.mock('../components/layout/Navbar', () => ({
  default: ({ onNavigate, onModuleAction, onOpenSearch, onLogout }) => {
    React.useEffect(() => { refreshState.navbarMounts += 1; }, []);
    return (
    <div>
      <button onClick={() => onNavigate('investigadores')}>Abrir investigadores</button>
      <button onClick={() => onNavigate('proyectos')}>Abrir proyectos</button>
      <button onClick={() => onNavigate('grupos')}>Volver al grupo</button>
      <button onClick={onLogout}>Cerrar sesión</button>
      <button onClick={() => onNavigate('auditoria')}>Abrir auditoría</button>
      <button onClick={() => onModuleAction({ module: 'proyectos', form: 'create' })}>Crear proyecto</button>
      {onOpenSearch && <button onClick={onOpenSearch}>Abrir búsqueda desde menú</button>}
    </div>
    );
  },
}));
vi.mock('../components/dashboard/DashboardModule', () => ({
  default: ({ currentUser, onNewProject, onModuleAction, onOpenSearch, onNotify }) => (
    <div data-testid="vista-dashboard">
      {currentUser?.rol === 'aprendiz' ? (
        <button onClick={() => onModuleAction({ module: 'proyectos' })}>Ver mis proyectos desde el panel</button>
      ) : (
        <button onClick={onNewProject}>Crear actividad formativa</button>
      )}
      {onOpenSearch && <button onClick={onOpenSearch}>Abrir búsqueda global</button>}
      <button onClick={() => onNotify('Aviso de prueba', 'success')}>Mostrar aviso</button>
    </div>
  ),
}));
vi.mock('../components/projects/ProyectosModule', () => ({
  default: ({ initialAction, onActionHandled, refreshVersion }) => {
    const [evidenceOpen, setEvidenceOpen] = React.useState(false);
    return (
    <div data-testid="vista-proyectos" data-action={initialAction?.form || ''}>
      {initialAction && <button onClick={onActionHandled}>Acción gestionada</button>}
      <button onClick={() => setEvidenceOpen(true)}>Abrir expediente documental</button>
      {evidenceOpen && <div data-testid="expediente-abierto" data-revision={refreshVersion}>Expediente abierto</div>}
    </div>
    );
  },
}));
vi.mock('../components/users/InvestigadoresModule', () => ({ default: () => <div data-testid="vista-investigadores" /> }));
vi.mock('../components/auth/LoginScreen', () => ({ default: () => null }));
vi.mock('../components/products/ProductosModule', () => ({ default: () => null }));
vi.mock('../components/groups/GrupoModule', () => ({
  default: ({ onNavigate, refreshVersion }) => {
    const [opened, setOpened] = React.useState(false);
    const [text, setText] = React.useState('Idea inicial');
    const [dirty, setDirty] = React.useState(false);
    const guard = useUnsavedChangesGuard();
    React.useEffect(() => guard.registerSession('grupo-proyecto-de-prueba', {
      dirty, save: appViewState.save, discard: () => { appViewState.discard(); setDirty(false); setText('Idea inicial'); },
    }), [guard, dirty]);
    return (
    <div data-testid="vista-grupos">
      <button onClick={() => onNavigate('dashboard')}>Abrir tablero desde grupo</button>
      <button onClick={() => setOpened(true)}>Abrir proyecto del grupo</button>
      {opened && <input aria-label="Borrador del grupo" value={text} onChange={event => { setText(event.target.value); setDirty(true); }} data-revision={refreshVersion} />}
    </div>
    );
  },
}));
vi.mock('../components/seedbeds/SemillerosModule', () => ({ default: () => null }));
vi.mock('../components/calls/ConvocatoriasModule', () => ({ default: () => null }));
vi.mock('../components/reports/ReportesModule', () => ({ default: () => null }));
vi.mock('../components/settings/ConfiguracionModule', () => ({ default: () => null }));
vi.mock('../components/deliverables/CronogramaModule', () => ({ default: () => null }));
vi.mock('../components/projects/PresupuestoModule', () => ({ default: () => null }));
vi.mock('../components/ideas/RetosModule', () => ({ default: () => null }));
vi.mock('../components/admin/CVLACAdminModule', () => ({ default: () => null }));
vi.mock('../components/admin/AuditoriaModule', () => ({ default: () => null }));
vi.mock('../components/admin/DocumentCenterModule', () => ({ default: () => null }));
vi.mock('../components/profile/PerfilModule', () => ({ default: () => null }));
vi.mock('../components/notifications/NotificacionesModule', () => ({ default: () => null }));
vi.mock('../components/users/AprendicesModule', () => ({ default: () => null }));
vi.mock('../components/messages/MensajeriaModule', () => ({ default: () => null }));
vi.mock('../components/common/GlobalSearch', () => ({
  default: ({ onClose, onNavigate }) => (
    <div data-testid="busqueda-global">
      <button onClick={() => onNavigate({ type: 'grupo' })}>Abrir grupo desde búsqueda</button>
      <button onClick={() => onNavigate({ type: 'proyecto' })}>Abrir proyecto desde búsqueda</button>
      <button onClick={onClose}>Cerrar búsqueda</button>
    </div>
  ),
}));
vi.mock('../components/common/QuickActionHub', () => ({
  default: ({ isOpen, onClose }) => (
    <div data-testid="acciones-rapidas" data-open={String(isOpen)}>
      {isOpen && <button onClick={onClose}>Cerrar acciones rápidas</button>}
    </div>
  ),
}));
vi.mock('react-hot-toast', () => ({ Toaster: () => null, toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../utils/dataRefresh', () => ({ subscribeToDataRefresh: (listener) => {
  refreshState.listener = listener;
  return () => { refreshState.listener = null; };
} }));

import React from 'react';

describe('Acceso a vistas desde la aplicación', () => {
  it('actualiza el grupo sin desmontar el proyecto ni su borrador en edición', () => {
    authState.currentUser = { id: 'admin-1', rol: 'admin' };
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir proyecto del grupo' }));
    fireEvent.change(screen.getByLabelText('Borrador del grupo'), { target: { value: 'Trabajo sin guardar' } });
    act(() => refreshState.listener({ endpoint: '/proyectos/example/documentacion/comunes', method: 'PUT' }));
    expect(screen.getByLabelText('Borrador del grupo')).toHaveValue('Trabajo sin guardar');
    expect(screen.getByLabelText('Borrador del grupo')).toHaveAttribute('data-revision', '1');
  });
  it('mantiene abierto el expediente mientras refresca proyectos tras adjuntar un documento', () => {
    authState.currentUser = { id: 'admin-1', rol: 'admin' };
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir proyectos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir expediente documental' }));
    expect(screen.getByTestId('expediente-abierto')).toHaveAttribute('data-revision', '0');
    act(() => refreshState.listener({ endpoint: '/documentos/upload', method: 'POST' }));
    expect(screen.getByTestId('expediente-abierto')).toHaveAttribute('data-revision', '1');
  });
  beforeEach(() => {
    authState.currentUser = { id: 'learner-1', nombre: 'Aprendiz', rol: 'aprendiz' };
    authState.loading = false;
    authState.logout.mockReset();
    appViewState.save.mockReset().mockResolvedValue(true);
    appViewState.discard.mockReset();
  });

  function editGroupProject() {
    authState.currentUser = { id: 'admin-1', rol: 'admin' };
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir proyecto del grupo' }));
    fireEvent.change(screen.getByLabelText('Borrador del grupo'), { target: { value: 'Trabajo en construcción' } });
  }

  it('protege la navegación a otro módulo y conserva la edición al cancelar', () => {
    editGroupProject();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir proyectos' }));
    expect(screen.getByRole('dialog', { name: 'Cambios pendientes por guardar' })).toBeVisible();
    expect(screen.queryByTestId('vista-proyectos')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.getByLabelText('Borrador del grupo')).toHaveValue('Trabajo en construcción');
    expect(appViewState.save).not.toHaveBeenCalled();
    expect(appViewState.discard).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al grupo' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Borrador del grupo')).toHaveValue('Trabajo en construcción');
  });

  it('guarda la edición antes de navegar a otra vista', async () => {
    editGroupProject();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir investigadores' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
    await waitFor(() => expect(screen.getByTestId('vista-investigadores')).toBeInTheDocument());
    expect(appViewState.save).toHaveBeenCalledOnce();
    expect(appViewState.discard).not.toHaveBeenCalled();
  });

  it('no cierra la sesión si el guardado falla y permite salir después de guardar', async () => {
    appViewState.save.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    editGroupProject();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(authState.logout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron guardar todos los cambios');
    expect(screen.getByLabelText('Borrador del grupo')).toHaveValue('Trabajo en construcción');
    expect(authState.logout).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
    await waitFor(() => expect(authState.logout).toHaveBeenCalledOnce());
  });

  it('inicia una acción nueva solo después del descarte explícito de los cambios', () => {
    editGroupProject();
    fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
    expect(screen.queryByTestId('vista-proyectos')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Descartar y salir' }));
    expect(screen.getByTestId('vista-proyectos')).toHaveAttribute('data-action', 'create');
    expect(appViewState.discard).toHaveBeenCalledOnce();
    expect(appViewState.save).not.toHaveBeenCalled();
  });

  it('mantiene el borrador al abrir la búsqueda y protege la salida desde un resultado', () => {
    editGroupProject();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir búsqueda desde menú' }));
    expect(screen.getByLabelText('Borrador del grupo')).toHaveValue('Trabajo en construcción');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir proyecto desde búsqueda' }));
    expect(screen.getByRole('dialog', { name: 'Cambios pendientes por guardar' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.getByTestId('vista-grupos')).toBeInTheDocument();
    expect(screen.getByLabelText('Borrador del grupo')).toHaveValue('Trabajo en construcción');
  });

  it('redirige al aprendiz desde una vista de gestión y le permite abrir sus proyectos', () => {
    render(<App />);
    expect(screen.getByTestId('vista-grupos')).toBeInTheDocument();
    expect(screen.queryByTestId('vista-dashboard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('busqueda-global')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir investigadores' }));
    expect(screen.getByTestId('vista-grupos')).toBeInTheDocument();
    expect(screen.queryByTestId('vista-investigadores')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir tablero desde grupo' }));
    expect(screen.getByTestId('vista-dashboard')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ver mis proyectos desde el panel' }));
    expect(screen.getByTestId('vista-proyectos')).toHaveAttribute('data-action', '');
    expect(screen.queryByText(/Bitácora/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Abrir proyectos' }));
    expect(screen.getByTestId('vista-proyectos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
    expect(screen.getByTestId('vista-proyectos')).toHaveAttribute('data-action', '');
  });

  it('permite que el aprendiz consulte proyectos y bloquea su creación', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir tablero desde grupo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver mis proyectos desde el panel' }));
    expect(screen.getByTestId('vista-proyectos')).toHaveAttribute('data-action', '');
    fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
    expect(screen.getByTestId('vista-proyectos')).toHaveAttribute('data-action', '');
  });

  it('conserva el acceso amplio del rol investigador a proyectos, gestión y acciones de creación', () => {
    authState.currentUser = { id: 'instructor-1', nombre: 'Instructor', rol: 'investigador' };
    render(<App />);
    expect(screen.getByTestId('vista-grupos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir tablero desde grupo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir búsqueda global' }));
    expect(screen.getByTestId('busqueda-global')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear actividad formativa' }));
    expect(screen.getByTestId('vista-proyectos')).toHaveAttribute('data-action', 'create');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir investigadores' }));
    expect(screen.getByTestId('vista-investigadores')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
    expect(screen.getByTestId('vista-proyectos')).toHaveAttribute('data-action', 'create');
  });

  it('limita la búsqueda por teclado del aprendiz y permite sus acciones rápidas', () => {
    render(<App />);
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.queryByTestId('busqueda-global')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'j', ctrlKey: true });
    expect(screen.getByTestId('acciones-rapidas')).toHaveAttribute('data-open', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar acciones rápidas' }));
    expect(screen.getByTestId('acciones-rapidas')).toHaveAttribute('data-open', 'false');
  });

  it('conserva la búsqueda y la navegación del personal cuando la vista actual queda restringida', () => {
    authState.currentUser = { id: 'admin-1', nombre: 'Administrador', rol: 'admin' };
    const { rerender } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir auditoría' }));
    expect(screen.queryByTestId('vista-dashboard')).not.toBeInTheDocument();

    authState.currentUser = { id: 'instructor-1', nombre: 'Instructor', rol: 'investigador' };
    rerender(<App />);
    expect(screen.getByTestId('vista-dashboard')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Crear actividad formativa' }));
    expect(screen.getByTestId('vista-proyectos')).toHaveAttribute('data-action', 'create');

    authState.currentUser = { id: 'admin-1', nombre: 'Administrador', rol: 'admin' };
    rerender(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir auditoría' }));
    authState.currentUser = { id: 'instructor-1', nombre: 'Instructor', rol: 'investigador' };
    rerender(<App />);
    expect(screen.getByTestId('vista-dashboard')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir búsqueda global' }));
    expect(screen.getByTestId('busqueda-global')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir grupo desde búsqueda' }));
    expect(screen.getByTestId('vista-grupos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar búsqueda' }));
    expect(screen.getByTestId('busqueda-global')).toBeInTheDocument();
  });

  it('notifica, completa acciones de módulo y aplica el refresco global de datos', () => {
    authState.currentUser = { id: 'staff-1', nombre: 'Instructora', rol: 'investigador' };
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir tablero desde grupo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar aviso' }));
    expect(toast.success).toHaveBeenCalledWith('Aviso de prueba');

    fireEvent.click(screen.getByRole('button', { name: 'Crear proyecto' }));
    const projectView = screen.getByTestId('vista-proyectos');
    expect(projectView).toHaveAttribute('data-action', 'create');
    fireEvent.click(screen.getByRole('button', { name: 'Acción gestionada' }));
    expect(screen.getByTestId('vista-proyectos')).toHaveAttribute('data-action', '');

    const mountedBeforeRefresh = refreshState.navbarMounts;
    expect(refreshState.listener).toBeTypeOf('function');
    act(() => refreshState.listener({ endpoint: '/proyectos' }));
    expect(refreshState.navbarMounts).toBe(mountedBeforeRefresh + 1);

    fireEvent.click(screen.getByRole('button', { name: 'Abrir búsqueda desde menú' }));
    expect(screen.getByTestId('busqueda-global')).toBeInTheDocument();
  });

  it('muestra el Grupo CGAO primero para todos los roles autenticados', () => {
    const users = [
      { id: 'admin-1', nombre: 'Administrador', rol: 'admin' },
      { id: 'investigator-1', nombre: 'Investigador', rol: 'investigador' },
      { id: 'instructor-1', nombre: 'Instructor', rol: 'investigador' },
      { id: 'learner-1', nombre: 'Aprendiz', rol: 'aprendiz' },
    ];

    users.forEach((user) => {
      cleanup();
      authState.currentUser = user;
      render(<App />);
      expect(screen.getByTestId('vista-grupos')).toBeInTheDocument();
      expect(screen.queryByTestId('vista-dashboard')).not.toBeInTheDocument();
    });
  });

  it('conserva el Grupo CGAO como inicio después de cargar la sesión', () => {
    authState.loading = true;
    authState.currentUser = null;
    const { rerender } = render(<App />);
    expect(screen.getByText('Cargando SENNOVA CGAO...')).toBeInTheDocument();

    authState.loading = false;
    authState.currentUser = { id: 'instructor-1', nombre: 'Instructor', rol: 'investigador' };
    rerender(<App />);

    expect(screen.getByTestId('vista-grupos')).toBeInTheDocument();
    expect(screen.queryByTestId('vista-dashboard')).not.toBeInTheDocument();
  });
});
