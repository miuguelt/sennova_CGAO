import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { Inbox, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';

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

// Mock Drawer y UserInsightPanel para evitar montajes DOM innecesarios
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

import ErrorBanner from '../components/ui/ErrorBanner';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import MessageComposer from '../components/messages/MessageComposer';
import Button from '../components/ui/Button';

import DashboardModule from '../components/dashboard/DashboardModule';
import ConvocatoriasModule from '../components/calls/ConvocatoriasModule';
import MensajeriaModule from '../components/messages/MensajeriaModule';

const mockAdminUser = {
  id: 'admin-adversarial-1',
  nombre: 'Auditor Adversarial SENNOVA',
  rol: 'admin',
};

const defaultAdjuntos = {
  ids: [],
  adjuntos: [],
  inputRef: { current: null },
  subiendo: false,
  agregarArchivos: vi.fn(),
  quitar: vi.fn(),
  limpiar: vi.fn(),
};

describe('Adversarial & Stress Verification: Hito 4 (M4 — Usabilidad Transversal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. Caídas Consecutivas de Red y Recuperación en ErrorBanner
  // ═══════════════════════════════════════════════════════════════════════════
  describe('1. Caídas consecutivas de red y resiliencia en ErrorBanner', () => {
    it('soporta múltiples caídas 500 consecutivas en Dashboard y recupera tras reintento exitoso', async () => {
      // 3 fallos consecutivos
      DashboardAPI.getStats
        .mockRejectedValueOnce(new Error('HTTP 500: Database connection pool exhausted'))
        .mockRejectedValueOnce(new Error('HTTP 500: Internal server error'))
        .mockRejectedValueOnce(new Error('HTTP 503: Service temporarily unavailable'))
        .mockResolvedValue({
          proyectos: { total: 4, activos: 3 },
          productos: { total: 10 },
          aprendices: { total: 25 },
          tareas_criticas: { vencidas: [], proximas: [] },
          historial_reciente: [],
        });
      DashboardAPI.getAnalyticsEvolucion.mockResolvedValue([]);
      DashboardAPI.getUserImpact.mockResolvedValue(null);

      render(<DashboardModule currentUser={mockAdminUser} />);

      // 1er fallo
      const alert1 = await screen.findByRole('alert');
      expect(alert1).toBeInTheDocument();
      expect(screen.getByText('Sincronización del Panel')).toBeInTheDocument();

      // 1er reintento -> 2do fallo
      const retryBtn1 = screen.getByRole('button', { name: /Reintentar carga/i });
      fireEvent.click(retryBtn1);
      await waitFor(() => {
        expect(DashboardAPI.getStats).toHaveBeenCalledTimes(2);
      });
      expect(await screen.findByRole('alert')).toBeInTheDocument();

      // 2do reintento -> 3er fallo (re-consultar el botón montado de nuevo)
      const retryBtn2 = await screen.findByRole('button', { name: /Reintentar carga/i });
      fireEvent.click(retryBtn2);
      await waitFor(() => {
        expect(DashboardAPI.getStats).toHaveBeenCalledTimes(3);
      });
      expect(await screen.findByRole('alert')).toBeInTheDocument();

      // 3er reintento -> éxito 200 OK
      const retryBtn3 = await screen.findByRole('button', { name: /Reintentar carga/i });
      fireEvent.click(retryBtn3);
      await waitFor(() => {
        expect(DashboardAPI.getStats).toHaveBeenCalledTimes(4);
      });

      // El ErrorBanner debe desaparecer y los datos válidos deben mostrarse
      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByRole('region', { name: 'Sin entregables vencidos' })).toBeInTheDocument();
      });
    });

    it('soporta caídas repetidas en ConvocatoriasModule sin dejar colgado el spinner ni duplicar alertas', async () => {
      ConvocatoriasAPI.list
        .mockRejectedValueOnce(new Error('Network timeout 504'))
        .mockRejectedValueOnce(new Error('Connection reset by peer'))
        .mockResolvedValueOnce([
          { id: 'conv-101', nombre: 'Convocatoria Innovación 2026', estado: 'abierta', año: 2026 },
        ]);
      ProyectosAPI.list.mockResolvedValue([]);

      render(<ConvocatoriasModule currentUser={mockAdminUser} />);

      // 1er fallo
      const alert1 = await screen.findByRole('alert');
      expect(alert1).toBeInTheDocument();
      const retryBtn1 = screen.getByRole('button', { name: /Reintentar carga/i });

      // Reintentar -> 2do fallo
      fireEvent.click(retryBtn1);
      await waitFor(() => {
        expect(ConvocatoriasAPI.list).toHaveBeenCalledTimes(2);
      });
      expect(await screen.findByRole('alert')).toBeInTheDocument();

      // Reintentar -> Éxito (re-consultar botón recién montado)
      const retryBtn2 = await screen.findByRole('button', { name: /Reintentar carga/i });
      fireEvent.click(retryBtn2);
      await waitFor(() => {
        expect(ConvocatoriasAPI.list).toHaveBeenCalledTimes(3);
      });

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        expect(screen.getByText('Convocatoria Innovación 2026')).toBeInTheDocument();
      });
    });

    it('soporta caídas repetidas en MensajeriaModule y restablece estado al reintentar', async () => {
      MensajesAPI.getConversaciones
        .mockRejectedValueOnce(new Error('Chat backend socket offline'))
        .mockRejectedValueOnce(new Error('Handshake timeout'))
        .mockResolvedValueOnce([]);
      MensajesAPI.getStats.mockResolvedValue({ total_recibidos: 0, no_leidos: 0, total_enviados: 0 });

      render(<MensajeriaModule currentUser={mockAdminUser} />);

      const alert1 = await screen.findByRole('alert');
      expect(alert1).toBeInTheDocument();
      const retryBtn1 = screen.getByRole('button', { name: /Reintentar/i });

      fireEvent.click(retryBtn1);
      await waitFor(() => {
        expect(MensajesAPI.getConversaciones).toHaveBeenCalledTimes(2);
      });

      const retryBtn2 = await screen.findByRole('button', { name: /Reintentar/i });
      fireEvent.click(retryBtn2);
      await waitFor(() => {
        expect(MensajesAPI.getConversaciones).toHaveBeenCalledTimes(3);
      });

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });

    it('gestiona ráfaga de 50 clics rápidos consecutivos sobre botón Reintentar en ErrorBanner aislado', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorBanner
          title="Fallo crítico del servidor"
          message="No se pudo contactar al gateway de datos."
          onRetry={handleRetry}
        />
      );

      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      for (let i = 0; i < 50; i++) {
        fireEvent.click(retryBtn);
      }

      expect(handleRetry).toHaveBeenCalledTimes(50);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('se comporta de forma segura cuando onRetry es asíncrono o lanza excepciones', async () => {
      const failingAsyncRetry = vi.fn().mockRejectedValue(new Error('Async retry failure'));
      render(
        <ErrorBanner
          title="Error en sincronización"
          message="No se completó la solicitud."
          onRetry={failingAsyncRetry}
        />
      );

      const retryBtn = screen.getByRole('button', { name: /Reintentar/i });
      expect(() => fireEvent.click(retryBtn)).not.toThrow();
      expect(failingAsyncRetry).toHaveBeenCalledTimes(1);
    });

    it('no renderiza botón de reintento si onRetry no es función ni se suministra', () => {
      const { rerender } = render(
        <ErrorBanner
          title="Error solo informativo"
          message="No hay acción correctiva disponible."
        />
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();

      rerender(
        <ErrorBanner
          title="Error con onRetry null"
          message="No hay acción."
          onRetry={null}
        />
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. Pruebas de Borde y Resistencia en EmptyState
  // ═══════════════════════════════════════════════════════════════════════════
  describe('2. Pruebas de borde, inyección y volumen en EmptyState', () => {
    it('soporta títulos y descripciones masivas (10,000 caracteres) sin quebrar el renderizado ni desbordar', () => {
      const longTitle = 'A'.repeat(5000);
      const longDescription = 'Texto descriptivo extremadamente largo '.repeat(500);

      render(
        <EmptyState
          icon={Inbox}
          title={longTitle}
          description={longDescription}
        />
      );

      const region = screen.getByRole('region', { name: longTitle });
      expect(region).toBeInTheDocument();

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toHaveLength(5000);

      const desc = screen.getByText((content) => content.startsWith('Texto descriptivo extremadamente largo'));
      expect(desc).toBeInTheDocument();
    });

    it('neutraliza cadenas con inyecciones XSS, etiquetas HTML y caracteres especiales sin ejecutar código', () => {
      const maliciousTitle = '<script>window.__xss_attack = true;</script><img src="invalid" onerror="window.__xss_img = true;" />';
      const maliciousDescription = '"><svg onload="window.__xss_svg = true;"><a href="javascript:alert(1)">Click</a>';

      render(
        <EmptyState
          icon={AlertTriangle}
          title={maliciousTitle}
          description={maliciousDescription}
        />
      );

      // React escapa automáticamente las cadenas en JSX: no se agregan nodos HTML de script o svg interactivos
      expect(window.__xss_attack).toBeUndefined();
      expect(window.__xss_img).toBeUndefined();
      expect(window.__xss_svg).toBeUndefined();

      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading.textContent).toBe(maliciousTitle);

      const desc = screen.getByText(maliciousDescription);
      expect(desc.textContent).toBe(maliciousDescription);
    });

    it('renderiza adecuadamente caracteres internacionales, emojis y cadenas Unicode complejas', () => {
      const unicodeTitle = '🚀 Investigación CGAO — 中文, العربية, עִברִית, Ñandú 100% Bogotá';
      const unicodeDesc = '🎯 Resultados filtrados: 𝟘𝟙𝟚𝟛 / ⟦⟧ ⟪⟫ ⚡️✨';

      render(
        <EmptyState
          icon={Sparkles}
          title={unicodeTitle}
          description={unicodeDesc}
        />
      );

      expect(screen.getByRole('region', { name: unicodeTitle })).toBeInTheDocument();
      expect(screen.getByText(unicodeTitle)).toBeInTheDocument();
      expect(screen.getByText(unicodeDesc)).toBeInTheDocument();
    });

    it('maneja con solidez valores nulos o atípicos en action sin renderizar contenedores vacíos', () => {
      const { container, rerender } = render(
        <EmptyState title="Sin acción nula" action={null} />
      );
      expect(screen.getByRole('region')).toBeInTheDocument();
      expect(container.querySelector('.mt-4')).toBeNull();

      rerender(<EmptyState title="Sin acción undefined" action={undefined} />);
      expect(container.querySelector('.mt-4')).toBeNull();

      rerender(<EmptyState title="Sin acción false" action={false} />);
      expect(container.querySelector('.mt-4')).toBeNull();
    });

    it('soporta múltiples botones y elementos interactivos complejos dentro de la ranura action', () => {
      const handleAction1 = vi.fn();
      const handleAction2 = vi.fn();

      render(
        <EmptyState
          icon={ShieldAlert}
          title="Filtro de seguridad avanzado"
          description="Selecciona una acción alternativa para continuar."
          action={
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={handleAction1}>Acción Secundaria</Button>
              <Button variant="primary" onClick={handleAction2}>Acción Primaria</Button>
            </div>
          }
        />
      );

      const btn1 = screen.getByRole('button', { name: 'Acción Secundaria' });
      const btn2 = screen.getByRole('button', { name: 'Acción Primaria' });

      fireEvent.click(btn1);
      fireEvent.click(btn2);

      expect(handleAction1).toHaveBeenCalledTimes(1);
      expect(handleAction2).toHaveBeenCalledTimes(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. Estrés en MessageComposer: Ráfagas de Envío y Teclado
  // ═══════════════════════════════════════════════════════════════════════════
  describe('3. Estrés en MessageComposer (ráfaga de clics y teclas durante envío)', () => {
    it('bloquea 100 clics de envío consecutivos mientras enviando=true sin disparar onEnviar', () => {
      const handleEnviar = vi.fn((e) => e?.preventDefault());

      const { container } = render(
        <MessageComposer
          destinatarioNombre="Investigador Senior"
          texto="Mensaje con contenido listo para enviar"
          onTextoChange={vi.fn()}
          onSugerencia={vi.fn()}
          onKeyDown={vi.fn()}
          onEnviar={handleEnviar}
          textareaRef={{ current: null }}
          adjuntos={defaultAdjuntos}
          enviando={true}
        />
      );

      const submitBtn = screen.getByRole('button', { name: 'Enviar mensaje' });
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveAttribute('aria-busy', 'true');

      // Intentar 100 clics en ráfaga
      for (let i = 0; i < 100; i++) {
        fireEvent.click(submitBtn);
      }

      // onEnviar no debe haberse llamado porque el botón está deshabilitado
      expect(handleEnviar).not.toHaveBeenCalled();

      // El spinner debe mantenerse activo y el icono Send ausente
      const spinner = container.querySelector('svg.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(container.querySelector('svg.lucide-send')).toBeNull();
    });

    it('en integración con MensajeriaModule, ráfaga de 30 pulsaciones de Enter no duplica envíos concurrentes', async () => {
      let resolveEnvio;
      const deferredEnvio = new Promise((resolve) => {
        resolveEnvio = resolve;
      });

      MensajesAPI.getConversaciones.mockResolvedValue([
        {
          id: 'conv-101',
          otro_usuario: {
            id: 'user-dest-2',
            nombre: 'Dra. María Investigadora',
            rol: 'investigador',
          },
          ultimo_mensaje: {
            id: 'msg-prev',
            contenido: 'Hola colega',
            created_at: new Date().toISOString(),
          },
          no_leidos: 0,
        },
      ]);
      MensajesAPI.getConversacion.mockResolvedValue([]);
      MensajesAPI.getStats.mockResolvedValue({ total_recibidos: 0, no_leidos: 0, total_enviados: 0 });
      MensajesAPI.enviar.mockReturnValue(deferredEnvio);

      render(<MensajeriaModule currentUser={mockAdminUser} />);

      // Seleccionar la conversación
      const conversationCard = await screen.findByText('Dra. María Investigadora');
      fireEvent.click(conversationCard);

      // Esperar a que se monte el MessageComposer
      const textarea = await screen.findByPlaceholderText(/Escribe un mensaje para Dra. María Investigadora/i);
      expect(textarea).toBeInTheDocument();

      // Escribir texto
      fireEvent.change(textarea, { target: { value: 'Avance de investigación urgente' } });

      // Disparar ráfaga de 30 Enter rápidos
      for (let i = 0; i < 30; i++) {
        fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
      }

      // Solo 1 llamada debe haber iniciado MensajesAPI.enviar
      expect(MensajesAPI.enviar).toHaveBeenCalledTimes(1);
      expect(MensajesAPI.enviar).toHaveBeenCalledWith({
        destinatario_id: 'user-dest-2',
        contenido: 'Avance de investigación urgente',
        adjunto_ids: [],
      });

      // Resolver la promesa de red
      await act(async () => {
        resolveEnvio({
          id: 'msg-created-1',
          emisor_id: mockAdminUser.id,
          destinatario_id: 'user-dest-2',
          contenido: 'Avance de investigación urgente',
          creado_en: new Date().toISOString(),
          adjuntos: [],
        });
      });

      // Verificar que el textarea se limpia y el estado finaliza
      await waitFor(() => {
        expect(textarea.value).toBe('');
      });
    });

    it('bloquea el botón de envío y tecla Enter si el texto son solo espacios en blanco y no hay adjuntos', () => {
      const handleEnviar = vi.fn((e) => e?.preventDefault());
      const handleKeyDown = vi.fn((e) => {
        if (e.key === 'Enter') handleEnviar(e);
      });

      render(
        <MessageComposer
          destinatarioNombre="Investigador"
          texto="     " // Solo espacios
          onTextoChange={vi.fn()}
          onSugerencia={vi.fn()}
          onKeyDown={handleKeyDown}
          onEnviar={handleEnviar}
          textareaRef={{ current: null }}
          adjuntos={defaultAdjuntos}
          enviando={false}
        />
      );

      const submitBtn = screen.getByRole('button', { name: 'Enviar mensaje' });
      expect(submitBtn).toBeDisabled();

      fireEvent.click(submitBtn);
      expect(handleEnviar).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. ConfirmDialog con Reintentos y Estados Asíncronos Concurrentes
  // ═══════════════════════════════════════════════════════════════════════════
  describe('4. ConfirmDialog con reintentos y estados asíncronos concurrentes', () => {
    it('se recupera limpiamente de un rechazo de onConfirm permitiendo reintentar la operación', async () => {
      let intento = 0;
      const mockConfirm = vi.fn(async () => {
        intento++;
        if (intento === 1) {
          throw new Error('Fallo de red al liquidar proyecto');
        }
        return { success: true };
      });

      // Interceptar unhandledRejection a nivel de proceso Node/Vitest para evitar fallo del runner
      const unhandledHandler = () => {};
      process.on('unhandledRejection', unhandledHandler);

      try {
        const handleClose = vi.fn();

        render(
          <ConfirmDialog
            isOpen={true}
            onClose={handleClose}
            onConfirm={mockConfirm}
            title="¿Confirmar liquidación?"
            confirmText="Liquidar"
          />
        );

        const confirmBtn = screen.getByRole('button', { name: 'Liquidar' });
        expect(confirmBtn).not.toBeDisabled();

        // 1er intento (rechaza)
        await act(async () => {
          fireEvent.click(confirmBtn);
        });

        expect(mockConfirm).toHaveBeenCalledTimes(1);

        // Tras fallar, submitting debe volver a false y el botón volver a estar habilitado
        await waitFor(() => {
          expect(confirmBtn).not.toBeDisabled();
          expect(screen.getByRole('button', { name: 'Liquidar' })).toBeInTheDocument();
        });

        // 2do intento (éxito)
        await act(async () => {
          fireEvent.click(confirmBtn);
        });

        expect(mockConfirm).toHaveBeenCalledTimes(2);
      } finally {
        process.off('unhandledRejection', unhandledHandler);
      }
    });

    it('bloquea 50 clics simultáneos mientras onConfirm asíncrono está en curso', async () => {
      let resolvePromise;
      const asyncOp = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const mockConfirm = vi.fn(() => asyncOp);

      render(
        <ConfirmDialog
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={mockConfirm}
          title="¿Eliminar registro masivo?"
          confirmText="Eliminar"
        />
      );

      const confirmBtn = screen.getByRole('button', { name: 'Eliminar' });

      // Primer clic que activa la operación asíncrona
      act(() => {
        fireEvent.click(confirmBtn);
      });

      expect(mockConfirm).toHaveBeenCalledTimes(1);

      // Ahora el botón pasa a loading / Procesando... y está disabled
      const processingBtn = screen.getByRole('button', { name: 'Procesando...' });
      expect(processingBtn).toBeDisabled();
      expect(processingBtn).toHaveAttribute('aria-busy', 'true');

      // Intentar 50 clics rápidos mientras sigue pendiente
      for (let i = 0; i < 50; i++) {
        fireEvent.click(processingBtn);
      }

      // No debe haberse vuelto a llamar
      expect(mockConfirm).toHaveBeenCalledTimes(1);

      // Resolver la promesa
      await act(async () => {
        resolvePromise();
      });

      // El botón vuelve a estar listo
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Eliminar' })).toBeInTheDocument();
      });
    });

    it('impide cerrar el diálogo con Escape o pulsar Cancelar mientras isLoading es true', () => {
      const handleClose = vi.fn();

      render(
        <ConfirmDialog
          isOpen={true}
          loading={true} // Forzado externamente
          onClose={handleClose}
          onConfirm={vi.fn()}
          title="Operación crítica en curso"
          cancelText="Abortar"
        />
      );

      const cancelBtn = screen.getByRole('button', { name: 'Abortar' });
      expect(cancelBtn).toBeDisabled();

      // Intentar hacer clic en cancelar
      fireEvent.click(cancelBtn);
      expect(handleClose).not.toHaveBeenCalled();

      // Intentar cerrar con tecla Escape
      fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
      expect(handleClose).not.toHaveBeenCalled();
    });

    it('sincroniza el botón con la prop externa loading dinámicamente', () => {
      const { rerender } = render(
        <ConfirmDialog
          isOpen={true}
          loading={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Verificación dinámica"
          confirmText="Ejecutar"
        />
      );

      expect(screen.getByRole('button', { name: 'Ejecutar' })).not.toBeDisabled();

      // Cambiar loading a true
      rerender(
        <ConfirmDialog
          isOpen={true}
          loading={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Verificación dinámica"
          confirmText="Ejecutar"
        />
      );

      const processingBtn = screen.getByRole('button', { name: 'Procesando...' });
      expect(processingBtn).toBeDisabled();
      expect(processingBtn).toHaveAttribute('aria-busy', 'true');

      // Volver a loading false
      rerender(
        <ConfirmDialog
          isOpen={true}
          loading={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
          title="Verificación dinámica"
          confirmText="Ejecutar"
        />
      );

      expect(screen.getByRole('button', { name: 'Ejecutar' })).not.toBeDisabled();
    });
  });
});
