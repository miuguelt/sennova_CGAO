import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

// APIs Mocks
vi.mock('../api/dashboard', () => ({
  DashboardAPI: {
    getStats: vi.fn(),
    getAnalyticsEvolucion: vi.fn(),
    getUserImpact: vi.fn(),
  },
}));

vi.mock('../api/convocatorias', () => ({
  ConvocatoriasAPI: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api/proyectos', () => ({
  ProyectosAPI: {
    list: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../api/mensajes', () => ({
  MensajesAPI: {
    getConversaciones: vi.fn(),
    getConversacion: vi.fn(),
    marcarLeidos: vi.fn(),
    marcarEntregados: vi.fn(),
    notificarTyping: vi.fn(),
    connectStream: vi.fn(() => ({ close: vi.fn() })),
    enviar: vi.fn(),
    getStats: vi.fn(),
    getUnreadCount: vi.fn(),
    getDestinatarios: vi.fn(),
    getContacto: vi.fn(),
    eliminar: vi.fn(),
  },
}));

// Modal & Drawer Mocks to avoid full DOM overlays in integration tests
vi.mock('../components/ui/Drawer', () => ({
  default: ({ isOpen, onClose, title, headerActions, footer, children }) =>
    isOpen ? (
      <section role="dialog" aria-label={title}>
        <button type="button" onClick={onClose}>Cerrar drawer</button>
        {headerActions}
        {children}
        {footer}
      </section>
    ) : null,
}));

vi.mock('../components/users/UserInsightPanel', () => ({
  default: () => null,
}));

import { DashboardAPI } from '../api/dashboard';
import { ConvocatoriasAPI } from '../api/convocatorias';
import { ProyectosAPI } from '../api/proyectos';
import { MensajesAPI } from '../api/mensajes';

import DashboardModule from '../components/dashboard/DashboardModule';
import ConvocatoriasModule from '../components/calls/ConvocatoriasModule';
import MensajeriaModule from '../components/messages/MensajeriaModule';
import MessageComposer from '../components/messages/MessageComposer';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const mockAdminUser = {
  id: 'admin-user-1',
  nombre: 'Coordinador SENNOVA',
  rol: 'admin',
};

describe('Usabilidad Transversal e Interacciones Estandarizadas (M4 — Requisito R3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. DashboardModule: ErrorBanner y EmptyState
  // ═══════════════════════════════════════════════════════════════════════════
  describe('DashboardModule: Retroalimentación y Estados Vacíos', () => {
    it('muestra ErrorBanner accesible con botón de reintento ante fallo de getStats', async () => {
      DashboardAPI.getStats.mockRejectedValueOnce(new Error('Fallo de conexión con la base de datos'));
      DashboardAPI.getAnalyticsEvolucion.mockResolvedValue([]);
      DashboardAPI.getUserImpact.mockResolvedValue(null);

      render(<DashboardModule currentUser={mockAdminUser} />);

      const alert = await screen.findByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('Sincronización del Panel')).toBeInTheDocument();
      expect(screen.getByText('No fue posible sincronizar las estadísticas del sistema.')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /Reintentar carga/i });
      expect(retryBtn).toBeInTheDocument();

      // Al pulsar reintentar, ejecuta de nuevo getStats
      DashboardAPI.getStats.mockResolvedValueOnce({
        proyectos: { total: 2, activos: 2 },
        productos: { total: 0 },
        aprendices: { total: 0 },
        tareas_criticas: { vencidas: [], proximas: [] },
        historial_reciente: [],
      });

      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(DashboardAPI.getStats).toHaveBeenCalledTimes(2);
      });
    });

    it('renderiza componentes EmptyState en entregables vencidos, actividad y próximos vencimientos', async () => {
      DashboardAPI.getStats.mockResolvedValue({
        proyectos: { total: 1, activos: 1 },
        productos: { total: 0 },
        aprendices: { total: 0 },
        tareas_criticas: { vencidas: [], proximas: [] },
        historial_reciente: [],
      });
      DashboardAPI.getAnalyticsEvolucion.mockResolvedValue([]);
      DashboardAPI.getUserImpact.mockResolvedValue(null);

      render(<DashboardModule currentUser={mockAdminUser} />);

      await waitFor(() => {
        expect(screen.getByRole('region', { name: 'Sin entregables vencidos' })).toBeInTheDocument();
        expect(screen.getByText('No hay entregables vencidos reportados en el centro.')).toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Sin actividad reciente' })).toBeInTheDocument();
        expect(screen.getByText('No hay registros de actividad recientes en el centro.')).toBeInTheDocument();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ConvocatoriasModule: ErrorBanner y EmptyState
  // ═══════════════════════════════════════════════════════════════════════════
  describe('ConvocatoriasModule: Recuperación de Red y Estado Vacío', () => {
    it('muestra ErrorBanner con botón de reintento ante fallo al listar convocatorias', async () => {
      ConvocatoriasAPI.list.mockRejectedValueOnce(new Error('Error de red al consultar convocatorias'));
      ProyectosAPI.list.mockResolvedValue([]);

      render(<ConvocatoriasModule currentUser={mockAdminUser} />);

      const alert = await screen.findByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('Error de sincronización de convocatorias')).toBeInTheDocument();
      expect(screen.getByText('No fue posible sincronizar el listado de convocatorias.')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /Reintentar carga/i });
      expect(retryBtn).toBeInTheDocument();

      ConvocatoriasAPI.list.mockResolvedValueOnce([
        { id: 'c-1', nombre: 'Convocatoria 2026', estado: 'abierta', año: 2026 },
      ]);

      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(ConvocatoriasAPI.list).toHaveBeenCalledTimes(2);
      });
    });

    it('renderiza EmptyState con botón de limpiar filtros cuando no hay convocatorias', async () => {
      ConvocatoriasAPI.list.mockResolvedValue([]);
      ProyectosAPI.list.mockResolvedValue([]);

      render(<ConvocatoriasModule currentUser={mockAdminUser} />);

      const emptyRegion = await screen.findByRole('region', { name: 'No se encontraron convocatorias' });
      expect(emptyRegion).toBeInTheDocument();
      expect(screen.getByText('Prueba ajustando los filtros o el término de búsqueda.')).toBeInTheDocument();

      const clearBtn = screen.getByRole('button', { name: 'Limpiar filtros' });
      expect(clearBtn).toBeInTheDocument();
      fireEvent.click(clearBtn);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. MensajeriaModule: ErrorBanner y EmptyState
  // ═══════════════════════════════════════════════════════════════════════════
  describe('MensajeriaModule: Notificación de Conectividad y Estados Vacíos', () => {
    it('muestra ErrorBanner en la barra lateral ante fallo al cargar conversaciones', async () => {
      MensajesAPI.getConversaciones.mockRejectedValueOnce(new Error('Servicio de mensajería no disponible'));
      MensajesAPI.getStats.mockResolvedValue({ total_recibidos: 0, no_leidos: 0, total_enviados: 0 });

      render(<MensajeriaModule currentUser={mockAdminUser} />);

      const alert = await screen.findByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('Error al cargar conversaciones')).toBeInTheDocument();
      expect(screen.getByText('No fue posible sincronizar las conversaciones.')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      expect(retryBtn).toBeInTheDocument();

      MensajesAPI.getConversaciones.mockResolvedValueOnce([]);
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(MensajesAPI.getConversaciones).toHaveBeenCalledTimes(2);
      });
    });

    it('muestra EmptyState cuando no hay conversaciones activas y en el contenedor central no seleccionado', async () => {
      MensajesAPI.getConversaciones.mockResolvedValue([]);
      MensajesAPI.getStats.mockResolvedValue({ total_recibidos: 0, no_leidos: 0, total_enviados: 0 });

      render(<MensajeriaModule currentUser={mockAdminUser} initialContact={null} />);

      // Lista lateral vacía
      const emptyConversaciones = await screen.findByRole('region', { name: 'No hay conversaciones' });
      expect(emptyConversaciones).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Iniciar conversación' })).toBeInTheDocument();

      // Contenedor central sin chat seleccionado
      const emptyCentro = screen.getByRole('region', { name: 'Centro de Mensajería SENNOVA' });
      expect(emptyCentro).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Iniciar nueva conversación' })).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. MessageComposer: Contrato C2 (Button loading)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('MessageComposer: Botón de Envío con Contrato C2', () => {
    const defaultAdjuntos = {
      ids: [],
      adjuntos: [],
      inputRef: { current: null },
      subiendo: false,
      agregarArchivos: vi.fn(),
      quitar: vi.fn(),
    };

    it('muestra spinner accesible con aria-busy="true" y estado deshabilitado cuando enviando es true', () => {
      const { container } = render(
        <MessageComposer
          destinatarioNombre="Investigador"
          texto="Avance listo"
          onTextoChange={vi.fn()}
          onSugerencia={vi.fn()}
          onKeyDown={vi.fn()}
          onEnviar={vi.fn()}
          textareaRef={{ current: null }}
          adjuntos={defaultAdjuntos}
          enviando={true}
        />
      );

      const submitBtn = screen.getByRole('button', { name: 'Enviar mensaje' });
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveAttribute('aria-busy', 'true');

      const spinner = container.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('muestra el icono Send y se habilita cuando no está enviando y hay contenido', () => {
      const { container } = render(
        <MessageComposer
          destinatarioNombre="Investigador"
          texto="Mensaje de prueba"
          onTextoChange={vi.fn()}
          onSugerencia={vi.fn()}
          onKeyDown={vi.fn()}
          onEnviar={vi.fn()}
          textareaRef={{ current: null }}
          adjuntos={defaultAdjuntos}
          enviando={false}
        />
      );

      const submitBtn = screen.getByRole('button', { name: 'Enviar mensaje' });
      expect(submitBtn).not.toBeDisabled();
      expect(submitBtn).not.toHaveAttribute('aria-busy');

      const sendIcon = container.querySelector('svg.lucide-send');
      expect(sendIcon).toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ConfirmDialog: Contrato C2 (Button loading)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('ConfirmDialog: Contrato C2 en Botón de Confirmación', () => {
    it('muestra estado loading con aria-busy="true", spinner y texto "Procesando..." cuando loading es true', () => {
      const { container } = render(
        <ConfirmDialog
          isOpen={true}
          loading={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="¿Eliminar entregable?"
          description="Esta acción eliminará el archivo seleccionado."
          confirmText="Eliminar soporte"
        />
      );

      const confirmBtn = screen.getByRole('button', { name: 'Procesando...' });
      expect(confirmBtn).toBeDisabled();
      expect(confirmBtn).toHaveAttribute('aria-busy', 'true');

      const spinner = container.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });

    it('se habilita con el texto confirmText normal cuando loading es false', () => {
      render(
        <ConfirmDialog
          isOpen={true}
          loading={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="¿Eliminar entregable?"
          description="Esta acción eliminará el archivo seleccionado."
          confirmText="Eliminar soporte"
        />
      );

      const confirmBtn = screen.getByRole('button', { name: 'Eliminar soporte' });
      expect(confirmBtn).not.toBeDisabled();
      expect(confirmBtn).not.toHaveAttribute('aria-busy');
    });
  });
});
