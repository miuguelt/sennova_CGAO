import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Navbar from '../components/layout/Navbar';

vi.mock('@/api/notificaciones', () => ({
  NotificacionesAPI: {
    checkPendientes: vi.fn(),
    listar: vi.fn(),
    marcarLeida: vi.fn(),
    marcarTodasLeidas: vi.fn(),
  },
}));
vi.mock('@/api/mensajes', () => ({ MensajesAPI: { getUnreadCount: vi.fn() } }));

import { NotificacionesAPI } from '@/api/notificaciones';
import { MensajesAPI } from '@/api/mensajes';

const notifications = [
  {
    id: 'notif-1',
    tipo: 'proyecto',
    entidad_tipo: 'proyecto',
    entidad_id: 'project-1',
    titulo: 'Alerta realtime',
    mensaje: 'El proyecto tuvo una actualización',
    prioridad: 'alta',
    leida: false,
    created_at: '2026-09-20T10:00:00Z',
  },
  {
    id: 'notif-2',
    tipo: 'cronograma',
    entidad_tipo: 'entregable',
    entidad_id: 'task-2',
    titulo: 'Hito próximo',
    mensaje: 'Revisa la fecha de entrega',
    prioridad: 'normal',
    leida: false,
    created_at: '2026-09-21T10:00:00Z',
  },
];

const renderNavbar = (props = {}) => render(
  <Navbar
    currentUser={{ id: 'user-1', nombre: 'Camila Rojas', rol: 'admin' }}
    onNavigate={vi.fn()}
    onModuleAction={vi.fn()}
    onLogout={vi.fn()}
    onOpenSearch={vi.fn()}
    currentModule="dashboard"
    {...props}
  />,
);

describe('comportamientos pendientes del Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    NotificacionesAPI.checkPendientes.mockResolvedValue({ no_leidas: 2 });
    NotificacionesAPI.listar.mockResolvedValue(notifications);
    NotificacionesAPI.marcarLeida.mockResolvedValue({});
    NotificacionesAPI.marcarTodasLeidas.mockResolvedValue({});
    MensajesAPI.getUnreadCount.mockResolvedValue({ no_leidas: 1 });
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = '';
    vi.useRealTimers();
  });

  it('activa búsqueda, mensajería, perfil y cierre de sesión desde la barra superior', async () => {
    const onNavigate = vi.fn();
    const onOpenSearch = vi.fn();
    const onLogout = vi.fn();
    renderNavbar({ onNavigate, onOpenSearch, onLogout });
    await waitFor(() => expect(NotificacionesAPI.checkPendientes).toHaveBeenCalled());

    fireEvent.click(screen.getByPlaceholderText('Búsqueda rápida...'));
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(onOpenSearch).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: 'Mensajería' }));
    expect(onNavigate).toHaveBeenCalledWith('mensajes');
    fireEvent.click(screen.getByTitle('Ver Mi Perfil'));
    expect(onNavigate).toHaveBeenCalledWith('perfil');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('refresca notificaciones por eventos y marca todos los avisos como leídos', async () => {
    const { container } = renderNavbar();
    const toggle = screen.getByRole('button', { name: 'Notificaciones' });
    fireEvent.click(toggle);
    expect(await screen.findByText('Alerta realtime')).toBeVisible();
    expect(NotificacionesAPI.listar).toHaveBeenCalledWith(null, 10);
    const initialCheckCount = NotificacionesAPI.checkPendientes.mock.calls.length;
    const initialMessageCount = MensajesAPI.getUnreadCount.mock.calls.length;
    const initialListCount = NotificacionesAPI.listar.mock.calls.length;

    await act(async () => {
      window.dispatchEvent(new Event('sennova:mensaje_nuevo'));
      window.dispatchEvent(new Event('sennova:notificacion_update'));
    });
    await waitFor(() => {
      expect(NotificacionesAPI.checkPendientes.mock.calls.length).toBeGreaterThan(initialCheckCount);
      expect(MensajesAPI.getUnreadCount.mock.calls.length).toBeGreaterThan(initialMessageCount);
      expect(NotificacionesAPI.listar.mock.calls.length).toBeGreaterThan(initialListCount);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Marcar leídas' }));
    await waitFor(() => expect(NotificacionesAPI.marcarTodasLeidas).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: 'Marcar leídas' })).not.toBeInTheDocument();
    expect(screen.queryByText('2 nuevas')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Alerta realtime/ })).not.toHaveClass('bg-emerald-50/50');

    fireEvent.click(toggle);
    expect(screen.queryByText('Alerta realtime')).not.toBeInTheDocument();
    fireEvent.click(toggle);
    expect(await screen.findByText('Alerta realtime')).toBeVisible();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Alerta realtime')).not.toBeInTheDocument();
    expect(container.querySelector('header')).toBeInTheDocument();
  });

  it('abre y cierra menús de escritorio con hover y cancela el cierre pendiente al entrar a otro grupo', async () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    renderNavbar({ onNavigate });
    const management = screen.getByRole('button', { name: 'Gestión' });
    const research = screen.getByRole('button', { name: 'Investigación' });
    const managementGroup = management.closest('div.relative');
    const researchGroup = research.closest('div.relative');

    fireEvent.mouseEnter(management);
    expect(management).toHaveAttribute('aria-expanded', 'true');
    fireEvent.mouseLeave(managementGroup);
    fireEvent.mouseEnter(research);
    expect(research).toHaveAttribute('aria-expanded', 'true');
    await act(async () => { await vi.advanceTimersByTimeAsync(150); });
    expect(research).toHaveAttribute('aria-expanded', 'true');

    fireEvent.mouseLeave(researchGroup);
    await act(async () => { await vi.advanceTimersByTimeAsync(150); });
    expect(research).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(research);
    fireEvent.click(screen.getByTitle('Proyectos I+D+i'));
    expect(onNavigate).toHaveBeenCalledWith('proyectos');
    expect(research).toHaveAttribute('aria-expanded', 'false');
  });

  it('refresca contadores cada treinta segundos y permite salir del menú móvil de varias formas', async () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    const { container } = renderNavbar({
      currentUser: { id: 'learner-1', nombre: 'Felipe Aprendiz', rol: 'aprendiz' },
      onNavigate,
    });
    const drawer = container.querySelector('aside');
    const more = screen.getByRole('button', { name: 'Más' });

    expect(NotificacionesAPI.checkPendientes).toHaveBeenCalledTimes(1);
    expect(MensajesAPI.getUnreadCount).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });
    expect(NotificacionesAPI.checkPendientes).toHaveBeenCalledTimes(2);
    expect(MensajesAPI.getUnreadCount).toHaveBeenCalledTimes(2);

    fireEvent.click(more);
    expect(drawer.className).toContain('translate-x-0');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.mouseDown(document.body);
    expect(drawer.className).toContain('-translate-x-full');
    expect(document.body.style.overflow).toBe('');

    fireEvent.click(more);
    fireEvent.click(container.querySelector('div.fixed.inset-0 > div.absolute'));
    expect(drawer.className).toContain('-translate-x-full');
    fireEvent.click(more);
    fireEvent.click(within(drawer).getAllByRole('button')[0]);
    expect(drawer.className).toContain('-translate-x-full');

    fireEvent.click(more);
    fireEvent.click(within(drawer).getByRole('button', { name: 'Mi Semillero' }));
    expect(onNavigate).toHaveBeenCalledWith('semilleros');
    expect(drawer.className).toContain('-translate-x-full');

    fireEvent.click(screen.getByRole('button', { name: 'Mensajes' }));
    expect(onNavigate).toHaveBeenCalledWith('mensajes');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Notif\./ }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText('Alerta realtime')).toBeVisible();
  });
});
