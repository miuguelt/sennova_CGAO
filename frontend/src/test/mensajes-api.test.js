import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetchAPI = vi.fn();
vi.mock('../api/config', () => ({
  fetchAPI: mockFetchAPI,
  setAuthToken: vi.fn(),
  getHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
  API_URL: '/api',
}));

describe('MensajesAPI', () => {
  beforeEach(() => {
    mockFetchAPI.mockReset();
  });

  it('getConversaciones llama a /mensajes/conversaciones', async () => {
    const { MensajesAPI } = await import('../api/mensajes');
    mockFetchAPI.mockResolvedValue([]);
    await MensajesAPI.getConversaciones();
    expect(mockFetchAPI).toHaveBeenCalledWith('/mensajes/conversaciones');
  });

  it('getConversacion llama a /mensajes/conversacion/:id con paginación', async () => {
    const { MensajesAPI } = await import('../api/mensajes');
    mockFetchAPI.mockResolvedValue([]);
    await MensajesAPI.getConversacion('user-123', 0, 50);
    expect(mockFetchAPI).toHaveBeenCalledWith('/mensajes/conversacion/user-123?skip=0&limit=50');
  });

  it('marcarLeidos llama a POST /mensajes/conversacion/:id/marcar-leidos', async () => {
    const { MensajesAPI } = await import('../api/mensajes');
    mockFetchAPI.mockResolvedValue({ success: true, marcados: 2 });
    await MensajesAPI.marcarLeidos('user-123');
    expect(mockFetchAPI).toHaveBeenCalledWith(
      '/mensajes/conversacion/user-123/marcar-leidos',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('enviar llama a POST /mensajes con body JSON', async () => {
    const { MensajesAPI } = await import('../api/mensajes');
    mockFetchAPI.mockResolvedValue({ id: 'msg-1', contenido: 'Hola' });
    const payload = {
      destinatario_id: 'user-456',
      contenido: 'Hola mundo',
      asunto: 'Saludo',
      es_anuncio: false,
    };
    await MensajesAPI.enviar(payload);
    expect(mockFetchAPI).toHaveBeenCalledWith('/mensajes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  });

  it('getStats llama a /mensajes/stats', async () => {
    const { MensajesAPI } = await import('../api/mensajes');
    mockFetchAPI.mockResolvedValue({ total_recibidos: 5, no_leidos: 2, total_enviados: 3 });
    const res = await MensajesAPI.getStats();
    expect(mockFetchAPI).toHaveBeenCalledWith('/mensajes/stats');
    expect(res.no_leidos).toBe(2);
  });

  it('getUnreadCount llama a /mensajes/unread-count', async () => {
    const { MensajesAPI } = await import('../api/mensajes');
    mockFetchAPI.mockResolvedValue({ no_leidos: 3 });
    const res = await MensajesAPI.getUnreadCount();
    expect(mockFetchAPI).toHaveBeenCalledWith('/mensajes/unread-count');
    expect(res.no_leidos).toBe(3);
  });

  it('getDestinatarios filtra por search y rol', async () => {
    const { MensajesAPI } = await import('../api/mensajes');
    mockFetchAPI.mockResolvedValue([]);
    await MensajesAPI.getDestinatarios('Carlos', 'investigador');
    expect(mockFetchAPI).toHaveBeenCalledWith('/mensajes/destinatarios?search=Carlos&rol=investigador');
  });

  it('eliminar llama a DELETE /mensajes/:id', async () => {
    const { MensajesAPI } = await import('../api/mensajes');
    mockFetchAPI.mockResolvedValue({ success: true });
    await MensajesAPI.eliminar('msg-999');
    expect(mockFetchAPI).toHaveBeenCalledWith('/mensajes/msg-999', {
      method: 'DELETE',
    });
  });
});
