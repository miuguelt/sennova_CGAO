import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import MensajeriaModule from '../components/messages/MensajeriaModule';
import { MensajesAPI } from '../api/mensajes';

vi.mock('../api/mensajes', () => ({
  MensajesAPI: {
    getConversaciones: vi.fn(),
    getConversacion: vi.fn(),
    marcarLeidos: vi.fn(),
    marcarEntregados: vi.fn(),
    notificarTyping: vi.fn(),
    connectStream: vi.fn(),
    enviar: vi.fn(),
    getStats: vi.fn(),
    getUnreadCount: vi.fn(),
    getDestinatarios: vi.fn(),
    eliminar: vi.fn(),
  },
}));

const mockCurrentUser = {
  id: 'user-current-1',
  nombre: 'Carlos Coordinador',
  email: 'carlos@sena.edu.co',
  rol: 'admin',
};

const mockPartner = {
  id: 'user-partner-2',
  nombre: 'Ana Investigadora',
  email: 'ana@sena.edu.co',
  rol: 'investigador',
};

/** Canal SSE que confirma la conexión, como hace el backend con `event: connected`. */
const streamConectado = () =>
  MensajesAPI.connectStream.mockImplementation((onEvent, onError, onOpen) => {
    onOpen?.();
    return { close: vi.fn() };
  });

/** Canal caído: el navegador no pudo abrir el EventSource. */
const streamCaido = () =>
  MensajesAPI.connectStream.mockImplementation(() => null);

describe('Mensajería asíncrona (SSE + pulsos de escritura)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MensajesAPI.getConversaciones.mockResolvedValue([]);
    MensajesAPI.getStats.mockResolvedValue({ total_recibidos: 0, no_leidos: 0, total_enviados: 0 });
    MensajesAPI.getConversacion.mockResolvedValue([]);
    MensajesAPI.marcarLeidos.mockResolvedValue({ success: true, marcados: 0 });
    MensajesAPI.notificarTyping.mockResolvedValue({ success: true });
    streamConectado();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emite un solo pulso de "escribiendo" aunque se pulsen muchas teclas', async () => {
    render(<MensajeriaModule currentUser={mockCurrentUser} initialContact={mockPartner} />);

    const textarea = await screen.findByPlaceholderText(/Escribe un mensaje para Ana Investigadora/i);

    'Hola Ana'.split('').forEach((_, i) => {
      fireEvent.change(textarea, { target: { value: 'Hola Ana'.slice(0, i + 1) } });
    });

    const pulsosActivos = MensajesAPI.notificarTyping.mock.calls.filter(
      ([, activo]) => activo === true
    );
    expect(pulsosActivos).toHaveLength(1);
    expect(pulsosActivos[0]).toEqual(['user-partner-2', true]);
  });

  it('no repite el sondeo periódico mientras el canal SSE está conectado', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<MensajeriaModule currentUser={mockCurrentUser} />);

    await waitFor(() => expect(MensajesAPI.getConversaciones).toHaveBeenCalledTimes(1));

    await act(async () => {
      vi.advanceTimersByTime(35000);
    });

    expect(MensajesAPI.getConversaciones).toHaveBeenCalledTimes(1);
  });

  it('mantiene el sondeo de respaldo cuando el canal SSE no está disponible', async () => {
    streamCaido();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<MensajeriaModule currentUser={mockCurrentUser} />);

    await waitFor(() => expect(MensajesAPI.getConversaciones).toHaveBeenCalledTimes(1));

    await act(async () => {
      vi.advanceTimersByTime(16000);
    });

    await waitFor(() =>
      expect(MensajesAPI.getConversaciones.mock.calls.length).toBeGreaterThan(1)
    );
  });
});
