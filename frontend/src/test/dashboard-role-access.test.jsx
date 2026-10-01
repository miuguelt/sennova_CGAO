import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DashboardModule from '../components/dashboard/DashboardModule';
import { DashboardAPI } from '../api/dashboard';

vi.mock('../api/dashboard', () => ({
  DashboardAPI: {
    getStats: vi.fn(),
    getAnalyticsEvolucion: vi.fn(),
    getUserImpact: vi.fn(),
  },
}));

vi.mock('../components/users/UserInsightPanel', () => ({ default: () => null }));

describe('Acceso a datos del panel principal por rol', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('no solicita analítica institucional para el aprendiz', async () => {
    DashboardAPI.getStats.mockResolvedValue(null);
    DashboardAPI.getUserImpact.mockResolvedValue(null);
    const onModuleAction = vi.fn();

    render(<DashboardModule currentUser={{ id: 'learner-1', nombre: 'Aprendiz', rol: 'aprendiz' }} onModuleAction={onModuleAction} />);

    await waitFor(() => expect(DashboardAPI.getStats).toHaveBeenCalledOnce());
    expect(document.body.textContent).toContain('Hola, Aprendiz');
    expect(document.body.textContent).not.toContain('Descarga de formatos oficiales CGAO');
    expect(screen.queryByText(/bitácora/i)).not.toBeInTheDocument();
    expect(screen.getByText('Mis Compromisos & Entregables')).toBeInTheDocument();
    expect(DashboardAPI.getAnalyticsEvolucion).not.toHaveBeenCalled();
    expect(DashboardAPI.getUserImpact).toHaveBeenCalledWith('learner-1');

    fireEvent.click(screen.getByRole('button', { name: 'Ver mis proyectos' }));
    expect(onModuleAction).toHaveBeenCalledWith({ module: 'proyectos' });

    fireEvent.click(screen.getByRole('button', { name: 'Ver proyectos' }));
    expect(onModuleAction).toHaveBeenLastCalledWith({ module: 'proyectos' });
  });

  it('conserva la consulta analítica del personal y maneja un error sin fallar el panel', async () => {
    DashboardAPI.getStats.mockResolvedValue(null);
    DashboardAPI.getAnalyticsEvolucion.mockRejectedValue(new Error('Analítica no disponible'));
    DashboardAPI.getUserImpact.mockResolvedValue(null);

    render(<DashboardModule currentUser={{ id: 'instructor-1', nombre: 'Instructor', rol: 'investigador' }} />);

    await waitFor(() => expect(DashboardAPI.getAnalyticsEvolucion).toHaveBeenCalledWith(12));
    expect(document.body.textContent).toContain('Hola, Instructor');
    expect(DashboardAPI.getStats).toHaveBeenCalledOnce();
    expect(screen.queryByText('Analítica no disponible')).not.toBeInTheDocument();
  });

  it('muestra el panel administrativo y sus accesos a reportes', async () => {
    DashboardAPI.getStats.mockResolvedValue({});
    DashboardAPI.getAnalyticsEvolucion.mockResolvedValue([]);
    DashboardAPI.getUserImpact.mockResolvedValue(null);

    render(
      <DashboardModule
        currentUser={{ id: 'admin-1', nombre: 'Administradora', rol: 'admin' }}
      />
    );

    await waitFor(() => expect(document.body.textContent).toContain('Panel Institucional • Administradora'));
  });
});
