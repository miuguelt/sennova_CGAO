import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import MensajeriaModule from '../components/messages/MensajeriaModule';

const chatMocks = vi.hoisted(() => ({
  realtime: null,
  isConnected: true,
  registrarPulsacion: vi.fn(),
  detenerPulso: vi.fn(),
}));

vi.mock('../api/mensajes', () => ({ MensajesAPI: {
  getConversaciones: vi.fn(), getConversacion: vi.fn(), marcarLeidos: vi.fn(), marcarEntregados: vi.fn(),
  notificarTyping: vi.fn(), connectStream: vi.fn(), enviar: vi.fn(), getStats: vi.fn(), getUnreadCount: vi.fn(),
  getDestinatarios: vi.fn(), getContacto: vi.fn(), eliminar: vi.fn(), subirAdjunto: vi.fn(), eliminarAdjunto: vi.fn(), urlAdjunto: vi.fn(),
} }));
vi.mock('../hooks/useRealtimeChat', () => ({
  useRealtimeChat: vi.fn((callbacks) => { chatMocks.realtime = callbacks; return { isConnected: chatMocks.isConnected }; }),
}));
vi.mock('../hooks/useTypingPulse', () => ({
  useTypingPulse: vi.fn(() => ({ registrarPulsacion: chatMocks.registrarPulsacion, detenerPulso: chatMocks.detenerPulso })),
}));

import { MensajesAPI } from '../api/mensajes';

const currentUser = { id: 'u-current', nombre: 'Carlos Coordinador', email: 'carlos@sena.edu.co', rol: 'admin' };
const partner = { id: 'u-ana', nombre: 'Ana Investigadora', email: 'ana@sena.edu.co', rol: 'investigador', rol_sennova: 'Investigadora Principal' };
const learner = { id: 'u-lucia', nombre: 'Lucía Aprendiz', email: 'lucia@soy.sena.edu.co', rol: 'aprendiz', programa_formacion: 'ADSO', ficha: 'ADSO-2026' };
const sentMessage = {
  id: 'm-mine', remitente_id: currentUser.id, destinatario_id: partner.id, asunto: 'Seguimiento',
  contenido: 'Informe enviado', created_at: '2026-09-30T15:00:00.000Z',
};
const incomingMessage = {
  id: 'm-incoming', remitente_id: partner.id, destinatario_id: currentUser.id,
  contenido: 'Avance recibido', created_at: '2026-09-30T15:05:00.000Z',
};
const conversation = (user, message = incomingMessage, unread = 1) => ({
  otro_usuario: user,
  ultimo_mensaje: message,
  no_leidos: unread,
  total_mensajes: 2,
});

function configureApi() {
  MensajesAPI.getConversaciones.mockResolvedValue([conversation(partner)]);
  MensajesAPI.getStats.mockResolvedValue({ total_recibidos: 2, no_leidos: 1, total_enviados: 1 });
  MensajesAPI.getConversacion.mockResolvedValue([sentMessage]);
  MensajesAPI.marcarLeidos.mockResolvedValue({ success: true, marcados: 1 });
  MensajesAPI.marcarEntregados.mockResolvedValue({ success: true });
  MensajesAPI.notificarTyping.mockResolvedValue({ success: true });
  MensajesAPI.getDestinatarios.mockResolvedValue([partner, learner]);
  MensajesAPI.getContacto.mockResolvedValue(partner);
  MensajesAPI.enviar.mockResolvedValue({ ...incomingMessage, id: 'm-new', remitente_id: currentUser.id, contenido: 'Respuesta enviada' });
}

describe('interacciones pendientes del módulo de mensajería', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatMocks.realtime = null;
    chatMocks.isConnected = true;
    configureApi();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('aplica eventos de mensajes nuevos, entrega, lectura, escritura y eliminación al chat abierto', async () => {
    const { container } = render(<MensajeriaModule currentUser={currentUser} initialContact={partner} />);
    await screen.findByText('Informe enviado');
    expect(screen.getByText('Seguimiento')).toBeVisible();
    expect(chatMocks.realtime).toBeTruthy();

    await act(async () => {
      chatMocks.realtime.onNewMessage({ ...incomingMessage, id: 'm-live', contenido: 'Mensaje en tiempo real' });
      chatMocks.realtime.onNewMessage({ ...incomingMessage, id: 'm-live', contenido: 'Mensaje en tiempo real' });
    });
    expect(screen.getAllByText('Mensaje en tiempo real')).toHaveLength(1);
    expect(MensajesAPI.marcarLeidos).toHaveBeenCalledWith(partner.id);

    expect(screen.getByTitle(/^Enviado a las/)).toBeInTheDocument();
    act(() => chatMocks.realtime.onMessagesDelivered({ destinatario_id: partner.id, timestamp: '2026-09-30T15:10:00.000Z' }));
    expect(screen.getByTitle(/^Entregado a las/)).toBeInTheDocument();
    act(() => chatMocks.realtime.onMessagesRead({ lector_id: partner.id, timestamp: '2026-09-30T15:12:00.000Z' }));
    expect(screen.getByTitle(/^Leído a las/)).toBeInTheDocument();

    vi.useFakeTimers();
    act(() => chatMocks.realtime.onTypingStatus({ remitente_id: partner.id, is_typing: true }));
    expect(screen.getByText('Ana Investigadora está escribiendo')).toBeVisible();
    act(() => { vi.advanceTimersByTime(4000); });
    expect(screen.queryByText('Ana Investigadora está escribiendo')).not.toBeInTheDocument();

    await act(async () => chatMocks.realtime.onMessageDeleted({ mensaje_id: 'm-mine' }));
    expect(screen.queryByText('Informe enviado')).not.toBeInTheDocument();
    expect(MensajesAPI.getConversaciones.mock.calls.length).toBeGreaterThan(1);
    expect(MensajesAPI.getStats.mock.calls.length).toBeGreaterThan(1);
    expect(container.querySelector('textarea')).toBeTruthy();
  });

  it('resuelve por nombre en conversaciones cargadas y por identificador en el directorio de respaldo', async () => {
    const onActionHandled = vi.fn();
    const view = render(<MensajeriaModule currentUser={currentUser} />);
    await screen.findByText('Ana Investigadora');

    view.rerender(<MensajeriaModule currentUser={currentUser} initialAction={{ form: 'chat', data: { id: partner.id } }} onActionHandled={onActionHandled} />);
    expect(await screen.findByPlaceholderText(/Escribe un mensaje para Ana Investigadora/i)).toBeVisible();
    expect(onActionHandled).toHaveBeenCalledOnce();
    expect(MensajesAPI.getContacto).not.toHaveBeenCalled();

    view.rerender(<MensajeriaModule currentUser={currentUser} initialAction={{ form: 'chat', data: { search: 'Dra. Ana Investigadora' } }} onActionHandled={onActionHandled} />);
    expect(await screen.findByPlaceholderText(/Escribe un mensaje para Ana Investigadora/i)).toBeVisible();
    expect(onActionHandled).toHaveBeenCalledTimes(2);
    expect(MensajesAPI.getContacto).not.toHaveBeenCalled();

    const unknownContact = { id: 'u-directorio', nombre: 'Paula Directora', email: 'paula@sena.edu.co', rol: 'admin' };
    MensajesAPI.getContacto.mockRejectedValueOnce(new Error('Contacto no encontrado'));
    MensajesAPI.getDestinatarios.mockResolvedValueOnce([unknownContact]);
    view.rerender(<MensajeriaModule currentUser={currentUser} initialAction={{ form: 'chat', data: { id: unknownContact.id } }} onActionHandled={onActionHandled} />);
    expect(await screen.findByPlaceholderText(/Escribe un mensaje para Paula Directora/i)).toBeVisible();
    expect(MensajesAPI.getContacto).toHaveBeenCalledWith(unknownContact.id);
    expect(MensajesAPI.getDestinatarios).toHaveBeenCalledWith();
    expect(onActionHandled).toHaveBeenCalledTimes(3);

    const matchedByName = { id: 'u-marta', nombre: 'Dra. Marta Rodríguez', email: 'marta@sena.edu.co', rol: 'investigador' };
    MensajesAPI.getDestinatarios.mockResolvedValueOnce([matchedByName]);
    view.rerender(<MensajeriaModule currentUser={currentUser} initialAction={{ form: 'chat', data: { search: 'Ing. Marta Rodríguez' } }} onActionHandled={onActionHandled} />);
    expect(await screen.findByPlaceholderText(/Escribe un mensaje para Dra\. Marta Rodríguez/i)).toBeVisible();
    expect(MensajesAPI.getDestinatarios).toHaveBeenCalledWith();
    expect(onActionHandled).toHaveBeenCalledTimes(4);
  });

  it('abre el chat básico como último respaldo cuando fallan las búsquedas de contacto', async () => {
    const onActionHandled = vi.fn();
    const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const spyError = vi.spyOn(console, 'error').mockImplementation(() => {});
    MensajesAPI.getContacto.mockRejectedValue(new Error('directorio individual no disponible'));
    MensajesAPI.getDestinatarios.mockRejectedValue(new Error('directorio general no disponible'));

    render(<MensajeriaModule currentUser={currentUser} onActionHandled={onActionHandled} initialAction={{ form: 'chat', data: { id: 'u-sin-registro' } }} />);
    expect(await screen.findByPlaceholderText(/Escribe un mensaje para Usuario SENNOVA/i)).toBeVisible();
    expect(onActionHandled).toHaveBeenCalledOnce();
    expect(spyWarn).toHaveBeenCalled();
    expect(spyError).toHaveBeenCalled();
  });

  it('usa el contacto devuelto por la API y comunica el error de envío sin texto de error', async () => {
    const onActionHandled = vi.fn();
    const notify = vi.fn();
    const view = render(<MensajeriaModule currentUser={currentUser} onNotify={notify} />);
    await screen.findByText('Ana Investigadora');
    const contact = { id: 'u-api', nombre: 'Contacto API', email: 'contacto@sena.edu.co', rol: 'investigador' };
    MensajesAPI.getContacto.mockResolvedValueOnce(contact);
    view.rerender(<MensajeriaModule currentUser={currentUser} onNotify={notify} initialAction={{ form: 'chat', data: { id: contact.id } }} onActionHandled={onActionHandled} />);
    const textarea = await screen.findByPlaceholderText(/Escribe un mensaje para Contacto API/i);
    expect(MensajesAPI.getContacto).toHaveBeenCalledWith(contact.id);
    expect(onActionHandled).toHaveBeenCalledOnce();

    MensajesAPI.enviar.mockRejectedValueOnce(new Error(''));
    fireEvent.change(textarea, { target: { value: 'Mensaje que no se envió' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Error al enviar el mensaje', 'error'));
    expect(textarea).toHaveValue('Mensaje que no se envió');
  });

  it('mantiene el sondeo de respaldo cuando el canal en tiempo real está desconectado', async () => {
    chatMocks.isConnected = false;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<MensajeriaModule currentUser={currentUser} />);
    await waitFor(() => expect(MensajesAPI.getConversaciones).toHaveBeenCalledTimes(1));
    await act(async () => { vi.advanceTimersByTime(15000); });
    await waitFor(() => expect(MensajesAPI.getConversaciones.mock.calls.length).toBeGreaterThan(1));
    expect(MensajesAPI.getStats.mock.calls.length).toBeGreaterThan(1);
  });

  it('filtra y limpia la bandeja, permite volver al listado y actualizar mensajes', async () => {
    MensajesAPI.getConversaciones.mockResolvedValue([
      conversation(partner),
      conversation(learner, { id: 'm-lucia', contenido: 'Consulta de ficha', created_at: '2026-09-29T13:00:00.000Z' }, 0),
    ]);
    const { container } = render(<MensajeriaModule currentUser={currentUser} />);
    fireEvent.click(await screen.findByText('Ana Investigadora'));
    await screen.findByText('Informe enviado');
    fireEvent.click(screen.getByTitle('Actualizar conversación'));
    await waitFor(() => expect(MensajesAPI.getConversacion).toHaveBeenCalledTimes(2));

    const backButton = container.querySelector('button.lg\\:hidden');
    fireEvent.click(backButton);
    expect(screen.getByPlaceholderText(/Buscar conversación o usuario/i)).toBeVisible();
    expect(screen.getAllByText('Ana Investigadora').length).toBeGreaterThan(0);
    expect(screen.getByText('Lucía Aprendiz')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Aprendices' }));
    expect(screen.queryAllByText('Ana Investigadora')).toHaveLength(0);
    expect(screen.getByText('Lucía Aprendiz')).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText(/Buscar conversación o usuario/i), { target: { value: 'sin coincidencias' } });
    expect(screen.getByText('No hay conversaciones')).toBeVisible();
    fireEvent.click(container.querySelector('input[placeholder="Buscar conversación o usuario..."]').parentElement.querySelector('button'));
    expect(screen.getByPlaceholderText(/Buscar conversación o usuario/i)).toHaveValue('');
    expect(screen.getByText('Lucía Aprendiz')).toBeVisible();
  });

  it('muestra el día y el mes para conversaciones anteriores a ayer', async () => {
    const oldDate = '2020-04-03T13:00:00.000Z';
    MensajesAPI.getConversaciones.mockResolvedValue([
      conversation(learner, { id: 'm-old', contenido: 'Registro antiguo', created_at: oldDate }, 0),
    ]);

    render(<MensajeriaModule currentUser={currentUser} />);

    expect(await screen.findByText('Registro antiguo')).toBeVisible();
    expect(screen.getByText(new Date(oldDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }))).toBeVisible();
  });

  it('busca destinatarios con espera, filtra por rol, abre el chat seleccionado y cierra el modal', async () => {
    MensajesAPI.getDestinatarios.mockImplementation(async (search = '', role = '') => [partner, learner].filter((person) =>
      (!search || `${person.nombre} ${person.email} ${person.programa_formacion || ''}`.toLowerCase().includes(search.toLowerCase())) &&
      (!role || person.rol === role)
    ));
    render(<MensajeriaModule currentUser={currentUser} />);
    await screen.findByText('Ana Investigadora');
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Mensaje' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo Mensaje' });
    expect(await within(dialog).findByText('ADSO (ADSO-2026)')).toBeVisible();
    fireEvent.change(within(dialog).getByPlaceholderText(/Buscar por nombre, email o programa/i), { target: { value: 'Lucía' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aprendices' }));
    await waitFor(() => expect(MensajesAPI.getDestinatarios).toHaveBeenCalledWith('Lucía', 'aprendiz'));
    const contactButton = await within(dialog).findByRole('button', { name: /Lucía Aprendiz/ });
    fireEvent.click(contactButton);
    expect(await screen.findByPlaceholderText(/Escribe un mensaje para Lucía Aprendiz/i)).toBeVisible();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByPlaceholderText(/Escribe un mensaje para Lucía Aprendiz/i)));

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Mensaje' }));
    const reopened = await screen.findByRole('dialog', { name: 'Nuevo Mensaje' });
    fireEvent.click(within(reopened).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Nuevo Mensaje' })).not.toBeInTheDocument();
  });

  it('muestra errores de carga y búsqueda de contactos y deja cerrar el modal por su encabezado', async () => {
    const notify = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    MensajesAPI.getDestinatarios.mockRejectedValueOnce(new Error('servicio de contactos no disponible'));
    render(<MensajeriaModule currentUser={currentUser} onNotify={notify} />);
    await screen.findByText('Ana Investigadora');
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Mensaje' }));
    const failedDialog = await screen.findByRole('dialog', { name: 'Nuevo Mensaje' });
    expect(await within(failedDialog).findByText('No se encontraron usuarios disponibles.')).toBeVisible();
    expect(notify).toHaveBeenCalledWith('Error al cargar contactos disponibles', 'error');
    fireEvent.click(within(failedDialog).getByRole('button', { name: 'Cerrar ventana modal' }));
    expect(screen.queryByRole('dialog', { name: 'Nuevo Mensaje' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Mensaje' }));
    const dialog = await screen.findByRole('dialog', { name: 'Nuevo Mensaje' });
    await within(dialog).findByText('Ana Investigadora');
    MensajesAPI.getDestinatarios.mockRejectedValueOnce(new Error('búsqueda no disponible'));
    fireEvent.change(within(dialog).getByPlaceholderText(/Buscar por nombre, email o programa/i), { target: { value: 'Ana' } });
    await waitFor(() => expect(MensajesAPI.getDestinatarios).toHaveBeenCalledWith('Ana', ''));
    await waitFor(() => expect(consoleError).toHaveBeenCalledWith('Error buscando destinatarios:', expect.any(Error)));
    expect(within(dialog).getByText('Ana Investigadora')).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Nuevo Mensaje' })).not.toBeInTheDocument();
  });

  it('usa la configuración visual predeterminada para roles no reconocidos en el directorio', async () => {
    MensajesAPI.getDestinatarios.mockResolvedValueOnce([{
      id: 'u-externa', nombre: 'Camila Externa', email: 'camila@example.org', rol: 'externa',
      programa_formacion: 'Electrónica', ficha: 'ELEC-9',
    }]);
    render(<MensajeriaModule currentUser={currentUser} />);
    await screen.findByText('Ana Investigadora');
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Mensaje' }));

    const dialog = await screen.findByRole('dialog', { name: 'Nuevo Mensaje' });
    expect(await within(dialog).findByRole('button', { name: /Camila Externa/ })).toBeVisible();
    expect(within(dialog).getByText('Electrónica (ELEC-9)')).toBeVisible();
  });

  it('usa las sugerencias de redacción y envía con Enter sin interceptar Shift+Enter', async () => {
    const notify = vi.fn();
    render(<MensajeriaModule currentUser={currentUser} initialContact={partner} onNotify={notify} />);
    const textarea = await screen.findByPlaceholderText(/Escribe un mensaje para Ana Investigadora/i);
    fireEvent.click(screen.getByRole('button', { name: '¡Hola! ¿Cómo estás?' }));
    expect(textarea).toHaveValue('¡Hola! ¿Cómo estás?');

    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(MensajesAPI.enviar).not.toHaveBeenCalled();
    fireEvent.change(textarea, { target: { value: 'Respuesta por teclado' } });
    fireEvent.keyDown(textarea, { key: 'Enter' });
    await waitFor(() => expect(MensajesAPI.enviar).toHaveBeenCalledWith({
      destinatario_id: partner.id, contenido: 'Respuesta por teclado', adjunto_ids: [],
    }));
    expect(screen.getByText('Respuesta enviada')).toBeVisible();
    expect(chatMocks.detenerPulso).toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it('conserva la vista utilizable y registra los errores de carga de estadísticas, bandeja, mensajes y lectura', async () => {
    const notify = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    MensajesAPI.getStats.mockRejectedValueOnce(new Error('estadísticas fuera de servicio'));
    MensajesAPI.getConversaciones.mockRejectedValueOnce(new Error('bandeja fuera de servicio'));
    MensajesAPI.getConversacion.mockRejectedValueOnce(new Error('chat fuera de servicio'));
    MensajesAPI.marcarLeidos.mockRejectedValueOnce(new Error('lectura fuera de servicio'));

    render(<MensajeriaModule currentUser={currentUser} initialContact={partner} onNotify={notify} />);

    expect(await screen.findByPlaceholderText(/Escribe un mensaje para Ana Investigadora/i)).toBeVisible();
    expect(await screen.findByText('No hay conversaciones')).toBeVisible();
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Error al cargar mensajes de la conversación', 'error'));

    expect(MensajesAPI.getStats).toHaveBeenCalledOnce();
    expect(MensajesAPI.getConversaciones).toHaveBeenCalledOnce();
    expect(MensajesAPI.getConversacion).toHaveBeenCalledWith(partner.id);
    expect(MensajesAPI.marcarLeidos).toHaveBeenCalledWith(partner.id);
    expect(consoleError).toHaveBeenCalledWith('Error cargando estadísticas de mensajes:', expect.any(Error));
    expect(consoleError).toHaveBeenCalledWith('Error al cargar conversaciones:', expect.any(Error));
    expect(consoleError).toHaveBeenCalledWith('Error marcando mensajes como leídos:', expect.any(Error));
  });
});
