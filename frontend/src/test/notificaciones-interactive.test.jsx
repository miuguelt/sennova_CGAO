import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { resolveNotificationTarget, navigateNotification } from '../utils/notificationNavigation';
import NotificacionesModule from '../components/notifications/NotificacionesModule';
import Navbar from '../components/layout/Navbar';
import { NotificacionesAPI } from '../api/notificaciones';

vi.mock('../api/notificaciones', () => ({
  NotificacionesAPI: {
    listar: vi.fn(),
    checkPendientes: vi.fn(),
    marcarLeida: vi.fn(),
    marcarTodasLeidas: vi.fn(),
    eliminar: vi.fn(),
    limpiarLeidas: vi.fn(),
  }
}));

vi.mock('../api/mensajes', () => ({
  MensajesAPI: {
    getUnreadCount: vi.fn().mockResolvedValue({ no_leidos: 0 }),
  }
}));

describe('Notification Routing and Navigation', () => {
  it('resolves correct targets for different notification types', () => {
    expect(resolveNotificationTarget({ entidad_tipo: 'proyecto', entidad_id: 'p-123' })).toEqual({
      module: 'proyectos',
      action: { module: 'proyectos', form: 'view', initialData: { id: 'p-123' } },
      label: 'Ver Proyecto'
    });

    expect(resolveNotificationTarget({ entidad_tipo: 'entregable', entidad_id: 'e-456' })).toEqual({
      module: 'cronograma',
      action: { module: 'cronograma', form: 'view', initialData: { id: 'e-456', entregable_id: 'e-456', proyecto_id: 'e-456' } },
      label: 'Ver Entregable'
    });

    expect(resolveNotificationTarget({ entidad_tipo: 'convocatoria', entidad_id: 'c-789' })).toEqual({
      module: 'convocatorias',
      action: { module: 'convocatorias', form: 'view', initialData: { id: 'c-789' } },
      label: 'Ver Convocatoria'
    });

    expect(resolveNotificationTarget({ entidad_tipo: 'semillero', entidad_id: 'sem-101' })).toEqual({
      module: 'semilleros',
      action: { module: 'semilleros', form: 'view', initialData: { id: 'sem-101' } },
      label: 'Ver Semillero'
    });

    expect(resolveNotificationTarget({ entidad_tipo: 'reto', entidad_id: 'reto-202' })).toEqual({
      module: 'retos',
      action: { module: 'retos', form: 'view', initialData: { id: 'reto-202' } },
      label: 'Ver Reto'
    });

    expect(resolveNotificationTarget({ entidad_tipo: 'producto', entidad_id: 'prod-1' })).toEqual({
      module: 'productos',
      action: { module: 'productos', form: 'view', initialData: { id: 'prod-1' } },
      label: 'Ver Producto'
    });

    const msgTarget = resolveNotificationTarget({ entidad_tipo: 'mensaje', entidad_id: 'user-123' });
    expect(msgTarget.module).toBe('mensajes');
    expect(msgTarget.action).toEqual(expect.objectContaining({
      module: 'mensajes',
      form: 'chat',
      initialData: expect.objectContaining({ id: 'user-123', usuario_id: 'user-123', contacto_id: 'user-123' })
    }));
    expect(msgTarget.label).toBe('Ir al Chat');

    expect(resolveNotificationTarget({ entidad_tipo: 'bitacora', entidad_id: 'b-99' })).toEqual({
      module: 'bitacora',
      action: { module: 'bitacora', form: 'view', initialData: { id: 'b-99' } },
      label: 'Ver Bitácora'
    });

    expect(resolveNotificationTarget({ tipo: 'cvlac' })).toEqual({
      module: 'perfil',
      action: null,
      label: 'Ver Perfil / CvLAC'
    });

    expect(resolveNotificationTarget({ tipo: 'sistema', mensaje: 'Actualización general' })).toEqual({
      module: null,
      action: null,
      label: null
    });
  });

  it('dispatches onModuleAction when action exists, otherwise onNavigate', () => {
    const onNavigate = vi.fn();
    const onModuleAction = vi.fn();

    // With action
    navigateNotification(
      { entidad_tipo: 'proyecto', entidad_id: 'p-1' },
      { onNavigate, onModuleAction }
    );
    expect(onModuleAction).toHaveBeenCalledWith({
      module: 'proyectos',
      form: 'view',
      initialData: { id: 'p-1' }
    });

    // Without action (general module)
    navigateNotification(
      { entidad_tipo: 'reporte' },
      { onNavigate, onModuleAction }
    );
    expect(onNavigate).toHaveBeenCalledWith('reportes');

    // General notification without entity
    navigateNotification(
      { tipo: 'sistema' },
      { onNavigate, onModuleAction }
    );
    expect(onNavigate).toHaveBeenCalledWith('notificaciones');
  });
});

describe('NotificacionesModule UI & Click Actions', () => {
  const mockNotifications = [
    {
      id: 'notif-1',
      tipo: 'proyecto',
      titulo: 'Proyecto Aprobado',
      mensaje: 'Tu proyecto ha sido aprobado por el comité',
      entidad_tipo: 'proyecto',
      entidad_id: 'proj-100',
      prioridad: 'alta',
      leida: false,
      created_at: '2026-08-18T10:00:00Z'
    },
    {
      id: 'notif-2',
      tipo: 'sistema',
      titulo: 'Mantenimiento del Sistema',
      mensaje: 'Habrá mantenimiento preventivo este fin de semana',
      entidad_tipo: null,
      entidad_id: null,
      prioridad: 'normal',
      leida: true,
      created_at: '2026-08-17T09:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    NotificacionesAPI.listar.mockResolvedValue(mockNotifications);
    NotificacionesAPI.checkPendientes.mockResolvedValue({ total: 2, no_leidas: 1 });
    NotificacionesAPI.marcarLeida.mockResolvedValue({ message: 'ok' });
    NotificacionesAPI.marcarTodasLeidas.mockResolvedValue({ message: 'ok' });
    NotificacionesAPI.eliminar.mockResolvedValue({ message: 'ok' });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders notifications list and shows badges and counts', async () => {
    render(
      <NotificacionesModule 
        currentUser={{ id: 'u-1', rol: 'investigador' }}
        onNotify={vi.fn()}
        onNavigate={vi.fn()}
        onModuleAction={vi.fn()}
      />
    );

    expect(await screen.findByText('Proyecto Aprobado')).toBeTruthy();
    expect(screen.getByText('Mantenimiento del Sistema')).toBeTruthy();
    expect(screen.getByText('1 pendientes')).toBeTruthy();
    expect(screen.getByText('Nuevo')).toBeTruthy();
  });

  it('clicking a notification card marks it as read and directly navigates to resource', async () => {
    const onModuleAction = vi.fn();
    const onNavigate = vi.fn();

    render(
      <NotificacionesModule 
        currentUser={{ id: 'u-1', rol: 'investigador' }}
        onNotify={vi.fn()}
        onNavigate={onNavigate}
        onModuleAction={onModuleAction}
      />
    );

    const notifCard = await screen.findByText('Proyecto Aprobado');
    fireEvent.click(notifCard);

    // Should call API to mark as read
    await waitFor(() => {
      expect(NotificacionesAPI.marcarLeida).toHaveBeenCalledWith('notif-1', true);
      expect(onModuleAction).toHaveBeenCalledWith({
        module: 'proyectos',
        form: 'view',
        initialData: { id: 'proj-100' }
      });
    });
  });

  it('clicking Ver detalle button opens detail modal without full navigation', async () => {
    render(
      <NotificacionesModule 
        currentUser={{ id: 'u-1', rol: 'investigador' }}
        onNotify={vi.fn()}
        onNavigate={vi.fn()}
        onModuleAction={vi.fn()}
      />
    );

    const detailButtons = await screen.findAllByTitle('Ver detalles de la alerta');
    fireEvent.click(detailButtons[0]);

    // Should show modal with full details
    expect(await screen.findByText('Detalle de Notificación')).toBeTruthy();
  });

  it('clicking action button in notification directly navigates to resource', async () => {
    const onModuleAction = vi.fn();
    const onNavigate = vi.fn();

    render(
      <NotificacionesModule 
        currentUser={{ id: 'u-1', rol: 'investigador' }}
        onNotify={vi.fn()}
        onNavigate={onNavigate}
        onModuleAction={onModuleAction}
      />
    );

    const actionBtn = await screen.findByText('Ver Proyecto');
    fireEvent.click(actionBtn);

    await waitFor(() => {
      expect(onModuleAction).toHaveBeenCalledWith({
        module: 'proyectos',
        form: 'view',
        initialData: { id: 'proj-100' }
      });
    });
  });

  it('clicking a message notification in NotificacionesModule navigates directly to chat', async () => {
    const onModuleAction = vi.fn();
    const onNavigate = vi.fn();

    NotificacionesAPI.listar.mockResolvedValue([
      {
        id: 'notif-chat-1',
        tipo: 'mensaje',
        titulo: 'Mensaje de Juan Perez',
        mensaje: '¿Podemos revisar el avance del semillero hoy?',
        entidad_tipo: 'user_message',
        entidad_id: 'user-juan-555',
        prioridad: 'normal',
        leida: false,
        created_at: '2026-08-18T10:30:00Z'
      }
    ]);

    render(
      <NotificacionesModule 
        currentUser={{ id: 'u-1', rol: 'investigador' }}
        onNotify={vi.fn()}
        onNavigate={onNavigate}
        onModuleAction={onModuleAction}
      />
    );

    const card = await screen.findByText('Mensaje de Juan Perez');
    fireEvent.click(card);

    await waitFor(() => {
      expect(NotificacionesAPI.marcarLeida).toHaveBeenCalledWith('notif-chat-1', true);
      expect(onModuleAction).toHaveBeenCalledWith(expect.objectContaining({
        module: 'mensajes',
        form: 'chat',
        initialData: expect.objectContaining({
          id: 'user-juan-555',
          usuario_id: 'user-juan-555',
          contacto_id: 'user-juan-555'
        })
      }));
    });
  });

  it('clicking a convocatoria notification navigates to convocatorias with view action', async () => {
    const onModuleAction = vi.fn();
    const onNavigate = vi.fn();

    NotificacionesAPI.listar.mockResolvedValue([
      {
        id: 'notif-conv-1',
        tipo: 'convocatoria',
        titulo: 'Nueva Convocatoria: SENNOVA 2026',
        mensaje: 'Abierta convocatoria de proyectos de innovación',
        entidad_tipo: 'convocatoria',
        entidad_id: 'conv-2026',
        prioridad: 'alta',
        leida: false,
        created_at: '2026-08-18T08:00:00Z'
      }
    ]);

    render(
      <NotificacionesModule 
        currentUser={{ id: 'u-1', rol: 'investigador' }}
        onNotify={vi.fn()}
        onNavigate={onNavigate}
        onModuleAction={onModuleAction}
      />
    );

    const card = await screen.findByText('Nueva Convocatoria: SENNOVA 2026');
    fireEvent.click(card);

    await waitFor(() => {
      expect(onModuleAction).toHaveBeenCalledWith({
        module: 'convocatorias',
        form: 'view',
        initialData: { id: 'conv-2026' }
      });
    });
  });
});

describe('Navbar Notification Dropdown Interactions', () => {
  const mockNotifications = [
    {
      id: 'notif-1',
      tipo: 'proyecto',
      titulo: 'Proyecto Aprobado',
      mensaje: 'Tu proyecto ha sido aprobado',
      entidad_tipo: 'proyecto',
      entidad_id: 'proj-100',
      prioridad: 'alta',
      leida: false,
      created_at: '2026-08-18T10:00:00Z'
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    NotificacionesAPI.checkPendientes.mockResolvedValue({ total: 1, no_leidas: 1 });
    NotificacionesAPI.listar.mockResolvedValue(mockNotifications);
    NotificacionesAPI.marcarLeida.mockResolvedValue({ message: 'ok' });
    NotificacionesAPI.marcarTodasLeidas.mockResolvedValue({ message: 'ok' });
  });

  afterEach(() => {
    cleanup();
  });

  it('toggles notification dropdown and allows clicking an item to navigate', async () => {
    const onNavigate = vi.fn();
    const onModuleAction = vi.fn();

    render(
      <Navbar 
        currentUser={{ id: 'u-1', nombre: 'Carlos Gomez', rol: 'investigador' }}
        onNavigate={onNavigate}
        onModuleAction={onModuleAction}
        onLogout={vi.fn()}
        currentModule="dashboard"
        onOpenSearch={vi.fn()}
      />
    );

    // Bell button
    const bellBtn = screen.getByTitle('Notificaciones');
    fireEvent.click(bellBtn);

    // List item should appear
    const item = await screen.findByText('Proyecto Aprobado');
    expect(item).toBeTruthy();

    // Click item
    fireEvent.click(item);

    await waitFor(() => {
      expect(NotificacionesAPI.marcarLeida).toHaveBeenCalledWith('notif-1', true);
      expect(onModuleAction).toHaveBeenCalledWith({
        module: 'proyectos',
        form: 'view',
        initialData: { id: 'proj-100' }
      });
    });
  });

  it('clicking "Ver todas las notificaciones" in dropdown navigates to notificaciones module', async () => {
    const onNavigate = vi.fn();

    render(
      <Navbar 
        currentUser={{ id: 'u-1', nombre: 'Carlos Gomez', rol: 'investigador' }}
        onNavigate={onNavigate}
        onModuleAction={vi.fn()}
        onLogout={vi.fn()}
        currentModule="dashboard"
        onOpenSearch={vi.fn()}
      />
    );

    const bellBtn = screen.getByTitle('Notificaciones');
    fireEvent.click(bellBtn);

    const viewAllBtn = await screen.findByText('Ver todas las notificaciones');
    fireEvent.click(viewAllBtn);

    expect(onNavigate).toHaveBeenCalledWith('notificaciones');
  });

  it('clicking a message notification in dropdown dispatches chat action with sender ID', async () => {
    const onNavigate = vi.fn();
    const onModuleAction = vi.fn();

    NotificacionesAPI.listar.mockResolvedValue([
      {
        id: 'notif-msg-1',
        tipo: 'mensaje',
        titulo: 'Mensaje de Maria Gomez',
        mensaje: 'Hola, revisaste el avance?',
        entidad_tipo: 'mensaje',
        entidad_id: 'user-maria-999',
        prioridad: 'normal',
        leida: false,
        created_at: '2026-08-18T11:00:00Z'
      }
    ]);

    render(
      <Navbar 
        currentUser={{ id: 'u-1', nombre: 'Carlos Gomez', rol: 'investigador' }}
        onNavigate={onNavigate}
        onModuleAction={onModuleAction}
        onLogout={vi.fn()}
        currentModule="dashboard"
        onOpenSearch={vi.fn()}
      />
    );

    const bellBtn = screen.getByTitle('Notificaciones');
    fireEvent.click(bellBtn);

    const msgNotif = await screen.findByText('Mensaje de Maria Gomez');
    fireEvent.click(msgNotif);

    await waitFor(() => {
      expect(NotificacionesAPI.marcarLeida).toHaveBeenCalledWith('notif-msg-1', true);
      expect(onModuleAction).toHaveBeenCalledWith(expect.objectContaining({
        module: 'mensajes',
        form: 'chat',
        initialData: expect.objectContaining({
          id: 'user-maria-999',
          usuario_id: 'user-maria-999',
          contacto_id: 'user-maria-999'
        })
      }));
    });
  });
});

