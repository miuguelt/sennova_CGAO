import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Navbar from '../components/layout/Navbar';

// Mocking the APIs
vi.mock('@/api/notificaciones', () => ({
  NotificacionesAPI: {
    checkPendientes: vi.fn().mockResolvedValue({ no_leidas: 3 }),
    listar: vi.fn().mockResolvedValue([
      { id: '1', titulo: 'Alerta de Proyecto', prioridad: 'alta', created_at: new Date().toISOString() }
    ]),
    marcarLeida: vi.fn().mockResolvedValue({}),
    marcarTodasLeidas: vi.fn().mockResolvedValue({})
  }
}));

vi.mock('@/api/mensajes', () => ({
  MensajesAPI: {
    getUnreadCount: vi.fn().mockResolvedValue({ no_leidos: 2 })
  }
}));

describe('🧭 Auditoría y Pruebas de Menú por Perspectiva de Usuario', () => {
  const onNavigateMock = vi.fn();
  const onLogoutMock = vi.fn();
  const onOpenSearchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Perspectiva Líder SENNOVA (Admin): Tiene acceso a todos los grupos de gestión, I+D, Grupo CGAO y Sistema', async () => {
    const adminUser = {
      id: 'usr-admin-1',
      nombre: 'Sandra Líder',
      email: 'sandra@sena.edu.co',
      rol: 'admin'
    };

    render(
      <Navbar
        currentUser={adminUser}
        onNavigate={onNavigateMock}
        onLogout={onLogoutMock}
        onOpenSearch={onOpenSearchMock}
        currentModule="dashboard"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Líder SENNOVA/i).length).toBeGreaterThanOrEqual(1);
    });

    // Verificamos los grupos de navegación de Admin
    expect(screen.getAllByText('Gestión').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Investigación').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Grupo CGAO').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sistema').length).toBeGreaterThanOrEqual(1);

    // Abrimos el menú 'Sistema' para verificar submenús de superadmin
    const sistemaButtons = screen.getAllByText('Sistema');
    fireEvent.click(sistemaButtons[0]);

    expect(screen.getAllByText('Auditoría & Logs').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Configuración Global').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Control CvLAC').length).toBeGreaterThanOrEqual(1);

    // Al hacer clic en un ítem, debe navegar correctamente
    const auditoriaItems = screen.getAllByText('Auditoría & Logs');
    fireEvent.click(auditoriaItems[0]);
    expect(onNavigateMock).toHaveBeenCalledWith('auditoria');
  });

  it('2. Perspectiva Instructor: Tiene acceso a I+D+i, Tutoría de Bitácora, Semilleros y Reportes, pero NO a Sistema/Auditoría', async () => {
    const instructorUser = {
      id: 'usr-inst-1',
      nombre: 'Carlos Instructor',
      email: 'carlos@sena.edu.co',
      rol: 'instructor'
    };

    render(
      <Navbar
        currentUser={instructorUser}
        onNavigate={onNavigateMock}
        onLogout={onLogoutMock}
        onOpenSearch={onOpenSearchMock}
        currentModule="dashboard"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Instructor Investigador/i).length).toBeGreaterThanOrEqual(1);
    });

    // Menús docentes
    expect(screen.getAllByText('Principal').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('I+D+i').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Red Científica').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Recursos').length).toBeGreaterThanOrEqual(1);

    // NO debe tener acceso al grupo Sistema
    expect(screen.queryByText('Sistema')).not.toBeInTheDocument();

    // Al abrir I+D+i, verifica Bitácora & Tutoría
    const idiButtons = screen.getAllByText('I+D+i');
    fireEvent.click(idiButtons[0]);
    expect(screen.getAllByText('Bitácora & Tutoría').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Proyectos I+D+i').length).toBeGreaterThanOrEqual(1);

    // Al abrir Recursos, verifica Reportes GTH-F-074
    const recursosButtons = screen.getAllByText('Recursos');
    fireEvent.click(recursosButtons[0]);
    expect(screen.getAllByText('Reportes y GTH-F-074').length).toBeGreaterThanOrEqual(1);
  });

  it('3. Perspectiva Investigador SENNOVA: Tiene acceso a Proyectos, Productos Minciencias, Red y Banco de Retos', async () => {
    const investigadorUser = {
      id: 'usr-inv-1',
      nombre: 'Elena Investigadora',
      email: 'elena@sena.edu.co',
      rol: 'investigador'
    };

    render(
      <Navbar
        currentUser={investigadorUser}
        onNavigate={onNavigateMock}
        onLogout={onLogoutMock}
        onOpenSearch={onOpenSearchMock}
        currentModule="dashboard"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Investigador SENNOVA/i).length).toBeGreaterThanOrEqual(1);
    });

    // Secciones principales
    expect(screen.getAllByText('Principal').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('I+D+i').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Red Científica').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Recursos').length).toBeGreaterThanOrEqual(1);

    // NO debe tener acceso a Sistema
    expect(screen.queryByText('Sistema')).not.toBeInTheDocument();

    // Abrimos Red Científica
    const redButtons = screen.getAllByText('Red Científica');
    fireEvent.click(redButtons[0]);
    expect(screen.getAllByText('Grupo CGAO').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Red de Investigadores').length).toBeGreaterThanOrEqual(1);
  });

  it('4. Perspectiva Aprendiz Semillerista: Interfaz formativa restringida sin menús de administración', async () => {
    const aprendizUser = {
      id: 'usr-apr-1',
      nombre: 'Felipe Aprendiz',
      email: 'felipe@sena.edu.co',
      rol: 'aprendiz'
    };

    render(
      <Navbar
        currentUser={aprendizUser}
        onNavigate={onNavigateMock}
        onLogout={onLogoutMock}
        onOpenSearch={onOpenSearchMock}
        currentModule="dashboard"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Aprendiz Semillerista/i).length).toBeGreaterThanOrEqual(1);
    });

    // Menús formativos
    expect(screen.getAllByText('Mi Espacio').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Investigación Formativa').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Formación').length).toBeGreaterThanOrEqual(1);

    // NO debe ver grupos de Staff/Admin
    expect(screen.queryByText('Gestión')).not.toBeInTheDocument();
    expect(screen.queryByText('Sistema')).not.toBeInTheDocument();

    // Al abrir Investigación Formativa, ve 'Mis Bitácoras', 'Mis Tareas & Hitos', 'Mis Proyectos', 'Explorar Retos'
    const invFormButtons = screen.getAllByText('Investigación Formativa');
    fireEvent.click(invFormButtons[0]);
    expect(screen.getAllByText('Mis Bitácoras').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mis Tareas & Hitos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Mis Proyectos').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Explorar Retos').length).toBeGreaterThanOrEqual(1);

    // Al abrir Formación, ve 'Mi Semillero' y 'Formatos & Guías'
    const formacionButtons = screen.getAllByText('Formación');
    fireEvent.click(formacionButtons[0]);
    expect(screen.getAllByText('Mi Semillero').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Formatos & Guías').length).toBeGreaterThanOrEqual(1);
  });

  it('5. Insignias de Mensajería y Notificaciones cargan y se muestran correctamente', async () => {
    const user = {
      id: 'usr-test-1',
      nombre: 'Prueba Notif',
      rol: 'instructor'
    };

    render(
      <Navbar
        currentUser={user}
        onNavigate={onNavigateMock}
        onLogout={onLogoutMock}
        onOpenSearch={onOpenSearchMock}
        currentModule="dashboard"
      />
    );

    await waitFor(() => {
      // Badge de mensajes (2)
      expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
      // Badge de notificaciones (3)
      expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
    });
  });
});
