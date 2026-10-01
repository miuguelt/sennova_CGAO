import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import NotificacionesModule from '../components/notifications/NotificacionesModule';
import { NotificacionesAPI } from '../api/notificaciones';

vi.mock('../api/notificaciones', () => ({
  NotificacionesAPI: {
    listar: vi.fn(),
    checkPendientes: vi.fn(),
    marcarLeida: vi.fn(),
    marcarTodasLeidas: vi.fn(),
    eliminar: vi.fn(),
    limpiarLeidas: vi.fn(),
  },
}));

vi.mock('../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, onClose, onConfirm, title, confirmText }) => (
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <button onClick={onClose}>Cancelar</button>
        <button onClick={onConfirm}>{confirmText}</button>
      </div>
    ) : null
  ),
}));

const makeNotification = (id, { leida = false, prioridad = 'normal', tipo = 'proyecto' } = {}) => ({
  id,
  tipo,
  titulo: `Alerta ${id}`,
  mensaje: `Mensaje de prueba ${id}`,
  entidad_tipo: tipo,
  entidad_id: `entidad-${id}`,
  prioridad,
  leida,
  created_at: '2026-08-18T10:00:00Z',
});

const user = { id: 'usuario-1', rol: 'investigador' };
const renderNotifications = (onNotify = vi.fn()) => render(
  <NotificacionesModule currentUser={user} onNotify={onNotify} onNavigate={vi.fn()} onModuleAction={vi.fn()} />,
);

describe('NotificacionesModule, filtros, estados y paginación', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
    NotificacionesAPI.listar.mockResolvedValue([makeNotification('n-1')]);
    NotificacionesAPI.checkPendientes.mockResolvedValue({ total: 1, no_leidas: 1 });
    NotificacionesAPI.marcarLeida.mockResolvedValue({});
    NotificacionesAPI.marcarTodasLeidas.mockResolvedValue({});
    NotificacionesAPI.eliminar.mockResolvedValue({});
    NotificacionesAPI.limpiarLeidas.mockResolvedValue({});
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('filtra por estado, carga la siguiente página y agrega los resultados', async () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => makeNotification(`n-${index}`));
    NotificacionesAPI.listar
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([makeNotification('n-next')])
      .mockResolvedValueOnce([makeNotification('n-unread')])
      .mockResolvedValueOnce([makeNotification('n-read', { leida: true })]);
    renderNotifications();

    expect(await screen.findByText('Alerta n-0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cargar más notificaciones/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cargar más notificaciones/i }));
    expect(await screen.findByText('Alerta n-next')).toBeInTheDocument();
    await waitFor(() => expect(NotificacionesAPI.listar).toHaveBeenNthCalledWith(2, null, 50, 50));

    fireEvent.click(screen.getByRole('button', { name: 'No leídas' }));
    expect(await screen.findByText('Alerta n-unread')).toBeInTheDocument();
    await waitFor(() => expect(NotificacionesAPI.listar).toHaveBeenNthCalledWith(3, true, 50, 0));
    fireEvent.click(screen.getByRole('button', { name: 'Leídas' }));
    expect(await screen.findByText('Alerta n-read')).toBeInTheDocument();
    await waitFor(() => expect(NotificacionesAPI.listar).toHaveBeenNthCalledWith(4, 'leidas', 50, 0));
  }, 15000);

  it('combina búsqueda con prioridad y muestra el estado vacío si no hay coincidencias', async () => {
    NotificacionesAPI.listar.mockResolvedValue([
      makeNotification('cosecha', { prioridad: 'alta' }),
      makeNotification('riego', { prioridad: 'normal' }),
      makeNotification('otra', { prioridad: 'alta', tipo: 'semillero' }),
    ]);
    renderNotifications();
    expect(await screen.findByText('Alerta cosecha')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Buscar por título, contenido o tipo/i), { target: { value: 'COSECHA' } });
    fireEvent.click(screen.getByRole('button', { name: 'alta' }));
    expect(screen.getByText('Alerta cosecha')).toBeInTheDocument();
    expect(screen.queryByText('Alerta riego')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por título, contenido o tipo/i), { target: { value: 'inexistente' } });
    expect(screen.getByText('No hay notificaciones')).toBeInTheDocument();
  });

  it('actualiza una alerta leída, revierte su estado desde el detalle y reporta fallas', async () => {
    const onNotify = vi.fn();
    NotificacionesAPI.marcarLeida
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('sin conexión'));
    renderNotifications(onNotify);
    expect(await screen.findByText('Alerta n-1')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Marcar como leída'));
    await waitFor(() => expect(NotificacionesAPI.marcarLeida).toHaveBeenCalledWith('n-1', true));
    fireEvent.click(screen.getByTitle('Ver detalles de la alerta'));
    expect(await screen.findByRole('heading', { name: 'Detalle de Notificación' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar no leída' }));
    await waitFor(() => expect(NotificacionesAPI.marcarLeida).toHaveBeenCalledWith('n-1', false));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    fireEvent.click(screen.getByTitle('Marcar como leída'));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al actualizar notificación', 'error'));
  });

  it('confirma marcar todas como leídas y conserva la alerta si la API falla', async () => {
    const onNotify = vi.fn();
    NotificacionesAPI.marcarTodasLeidas.mockRejectedValueOnce(new Error('sin permisos'));
    renderNotifications(onNotify);
    expect(await screen.findByText('Alerta n-1')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Marcar todas leídas/i }));
    let dialog = screen.getByRole('dialog', { name: '¿Marcar todas como leídas?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: '¿Marcar todas como leídas?' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Marcar todas leídas/i }));
    dialog = screen.getByRole('dialog', { name: '¿Marcar todas como leídas?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Marcar leídas' }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al actualizar notificaciones', 'error'));
    expect(screen.getByText('Alerta n-1')).toBeInTheDocument();
  });

  it('actualiza la alerta abierta al marcar todo, navega y elimina desde el detalle', async () => {
    const onNotify = vi.fn();
    const onModuleAction = vi.fn();
    NotificacionesAPI.listar.mockResolvedValue([makeNotification('n-leida', { leida: true })]);
    NotificacionesAPI.checkPendientes.mockResolvedValue({ total: 1, no_leidas: 0 });
    render(
      <NotificacionesModule
        currentUser={user}
        onNotify={onNotify}
        onNavigate={vi.fn()}
        onModuleAction={onModuleAction}
      />,
    );
    expect(await screen.findByText('Alerta n-leida')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Ver detalles de la alerta'));
    fireEvent.click(screen.getByRole('button', { name: 'Marcar no leída' }));
    await waitFor(() => expect(NotificacionesAPI.marcarLeida).toHaveBeenCalledWith('n-leida', false));
    expect(screen.getByRole('button', { name: /Marcar todas leídas/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Marcar todas leídas/i }));
    fireEvent.click(within(screen.getByRole('dialog', { name: '¿Marcar todas como leídas?' })).getByRole('button', { name: 'Marcar leídas' }));
    await waitFor(() => expect(NotificacionesAPI.marcarTodasLeidas).toHaveBeenCalledOnce());
    expect(onNotify).toHaveBeenCalledWith('Todas las notificaciones marcadas como leídas', 'success');
    expect(screen.getByRole('button', { name: 'Marcar no leída' })).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('dialog', { name: 'Detalle de Notificación' })).getByRole('button', { name: 'Ver Proyecto' }));
    expect(onModuleAction).toHaveBeenCalledWith({
      module: 'proyectos', form: 'view', initialData: { id: 'entidad-n-leida' },
    });
    fireEvent.click(screen.getByTitle('Ver detalles de la alerta'));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: '¿Eliminar notificación?' })).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(NotificacionesAPI.eliminar).toHaveBeenCalledWith('n-leida'));
    expect(onNotify).toHaveBeenCalledWith('Notificación eliminada', 'success');
  });

  it('elimina una alerta tras confirmar y muestra un error cuando falla la API', async () => {
    const onNotify = vi.fn();
    NotificacionesAPI.eliminar.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('bloqueado'));
    renderNotifications(onNotify);
    expect(await screen.findByText('Alerta n-1')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Eliminar notificación'));
    const dialog = screen.getByRole('dialog', { name: '¿Eliminar notificación?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(NotificacionesAPI.eliminar).toHaveBeenCalledWith('n-1'));
    expect(onNotify).toHaveBeenCalledWith('Notificación eliminada', 'success');
    expect(screen.queryByText('Alerta n-1')).not.toBeInTheDocument();

    NotificacionesAPI.listar.mockResolvedValueOnce([makeNotification('n-2')]);
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    expect(await screen.findByText('Alerta n-2')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Eliminar notificación'));
    fireEvent.click(within(screen.getByRole('dialog', { name: '¿Eliminar notificación?' })).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al eliminar notificación', 'error'));
  });

  it('limpia las alertas leídas y maneja fallas de carga o depuración', async () => {
    const onNotify = vi.fn();
    NotificacionesAPI.listar
      .mockResolvedValueOnce([makeNotification('n-old', { leida: true })])
      .mockResolvedValueOnce([makeNotification('n-new')])
      .mockRejectedValueOnce(new Error('servidor fuera de línea'));
    NotificacionesAPI.limpiarLeidas.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('sin permisos'));
    renderNotifications(onNotify);
    expect(await screen.findByText('Alerta n-old')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Limpiar leídas/i }));
    fireEvent.click(within(screen.getByRole('dialog', { name: '¿Limpiar notificaciones leídas?' })).getByRole('button', { name: 'Limpiar' }));
    await waitFor(() => expect(NotificacionesAPI.limpiarLeidas).toHaveBeenCalledWith(30));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Notificaciones leídas limpiadas', 'success'));
    expect(await screen.findByText('Alerta n-new')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Limpiar leídas/i }));
    fireEvent.click(within(screen.getByRole('dialog', { name: '¿Limpiar notificaciones leídas?' })).getByRole('button', { name: 'Limpiar' }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al limpiar notificaciones', 'error'));
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al cargar notificaciones', 'error'));
  });
});
