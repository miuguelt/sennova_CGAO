import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
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
    connectStream: vi.fn(() => ({ close: vi.fn() })),
    enviar: vi.fn(),
    getStats: vi.fn(),
    getUnreadCount: vi.fn(),
    getDestinatarios: vi.fn(),
    getContacto: vi.fn(),
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
  rol_sennova: 'Investigadora Principal',
  sede: 'CGAO',
};

const mockConversacion = {
  otro_usuario: mockPartner,
  ultimo_mensaje: {
    id: 'msg-101',
    remitente_id: 'user-partner-2',
    destinatario_id: 'user-current-1',
    contenido: '¿Cómo va el proyecto de robótica?',
    created_at: new Date().toISOString(),
    leido: false,
  },
  no_leidos: 1,
  total_mensajes: 1,
};

describe('MensajeriaModule Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MensajesAPI.getConversaciones.mockResolvedValue([mockConversacion]);
    MensajesAPI.getStats.mockResolvedValue({ total_recibidos: 5, no_leidos: 1, total_enviados: 4 });
    MensajesAPI.getConversacion.mockResolvedValue([
      {
        id: 'msg-101',
        remitente_id: 'user-partner-2',
        destinatario_id: 'user-current-1',
        contenido: '¿Cómo va el proyecto de robótica?',
        created_at: new Date().toISOString(),
        leido: false,
      },
    ]);
    MensajesAPI.marcarLeidos.mockResolvedValue({ success: true, marcados: 1 });
    MensajesAPI.getDestinatarios.mockResolvedValue([mockPartner]);
    MensajesAPI.getContacto.mockResolvedValue(mockPartner);
    MensajesAPI.enviar.mockResolvedValue({
      id: 'msg-102',
      remitente_id: 'user-current-1',
      destinatario_id: 'user-partner-2',
      contenido: 'Va excelente, ya subimos el entregable.',
      created_at: new Date().toISOString(),
      leido: false,
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders module title and unread badge', async () => {
    render(<MensajeriaModule currentUser={mockCurrentUser} />);
    expect(screen.getByText(/Mensajería Interna SENNOVA/i)).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Ana Investigadora')).toBeInTheDocument();
    });
  });

  it('filters conversations by search term', async () => {
    render(<MensajeriaModule currentUser={mockCurrentUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('Ana Investigadora')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar conversación o usuario/i);
    fireEvent.change(searchInput, { target: { value: 'Inexistente' } });

    expect(screen.queryByText('Ana Investigadora')).not.toBeInTheDocument();
    expect(screen.getByText('No hay conversaciones')).toBeInTheDocument();
  });

  it('opens conversation on click and displays messages', async () => {
    render(<MensajeriaModule currentUser={mockCurrentUser} />);

    await waitFor(() => {
      expect(screen.getByText('Ana Investigadora')).toBeInTheDocument();
    });

    const convButton = screen.getByText('Ana Investigadora').closest('button');
    fireEvent.click(convButton);

    await waitFor(() => {
      expect(MensajesAPI.getConversacion).toHaveBeenCalledWith('user-partner-2');
      expect(screen.getByText('¿Cómo va el proyecto de robótica?')).toBeInTheDocument();
    });
  });

  it('sends a message when typing and submitting form', async () => {
    render(<MensajeriaModule currentUser={mockCurrentUser} initialContact={mockPartner} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Escribe un mensaje para Ana Investigadora/i)).toBeInTheDocument();
    });

    const textarea = screen.getByPlaceholderText(/Escribe un mensaje para Ana Investigadora/i);
    fireEvent.change(textarea, { target: { value: 'Va excelente, ya subimos el entregable.' } });

    const submitBtn = textarea.closest('form').querySelector('button[type="submit"]');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(MensajesAPI.enviar).toHaveBeenCalledWith({
        destinatario_id: 'user-partner-2',
        contenido: 'Va excelente, ya subimos el entregable.',
        adjunto_ids: [],
      });
      expect(screen.getByText('Va excelente, ya subimos el entregable.')).toBeInTheDocument();
    });
  });

  it('opens new message modal and lists available contacts', async () => {
    render(<MensajeriaModule currentUser={mockCurrentUser} />);

    const newChatBtn = screen.getByText('Nuevo Mensaje');
    fireEvent.click(newChatBtn);

    await waitFor(() => {
      expect(MensajesAPI.getDestinatarios).toHaveBeenCalled();
      expect(screen.getByText('Selecciona un usuario para iniciar el chat')).toBeInTheDocument();
      expect(screen.getAllByText('Ana Investigadora').length).toBeGreaterThan(0);
    });
  });

  it('automatically opens chat with sender when initialAction is provided', async () => {
    const onActionHandled = vi.fn();
    render(
      <MensajeriaModule
        currentUser={mockCurrentUser}
        initialAction={{
          form: 'chat',
          data: { id: 'user-partner-2', usuario_id: 'user-partner-2' }
        }}
        onActionHandled={onActionHandled}
      />
    );

    await waitFor(() => {
      expect(MensajesAPI.getConversacion).toHaveBeenCalledWith('user-partner-2');
      expect(screen.getByPlaceholderText(/Escribe un mensaje para Ana Investigadora/i)).toBeInTheDocument();
      expect(onActionHandled).toHaveBeenCalled();
    });
  });

  it('fetches contact via getContacto and opens chat when user is not in existing conversations', async () => {
    const mockNewContact = {
      id: 'user-new-3',
      nombre: 'Pedro Docente',
      email: 'pedro@sena.edu.co',
      rol: 'instructor'
    };
    MensajesAPI.getContacto.mockResolvedValue(mockNewContact);
    MensajesAPI.getConversacion.mockResolvedValue([]);

    const onActionHandled = vi.fn();
    render(
      <MensajeriaModule
        currentUser={mockCurrentUser}
        initialAction={{
          form: 'chat',
          data: { id: 'user-new-3' }
        }}
        onActionHandled={onActionHandled}
      />
    );

    await waitFor(() => {
      expect(MensajesAPI.getContacto).toHaveBeenCalledWith('user-new-3');
      expect(MensajesAPI.getConversacion).toHaveBeenCalledWith('user-new-3');
      expect(screen.getAllByText('Pedro Docente').length).toBeGreaterThan(0);
      expect(screen.getByPlaceholderText(/Escribe un mensaje para Pedro Docente/i)).toBeInTheDocument();
      expect(onActionHandled).toHaveBeenCalled();
    });
  });
});

