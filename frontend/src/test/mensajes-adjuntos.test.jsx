import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import MensajeriaModule from '../components/messages/MensajeriaModule';
import MessageAttachments from '../components/messages/MessageAttachments';
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
    eliminar: vi.fn(),
    subirAdjunto: vi.fn(),
    eliminarAdjunto: vi.fn(),
    urlAdjunto: vi.fn((id) => `/api/mensajes/adjuntos/${id}?token=abc`),
  },
}));

const currentUser = { id: 'user-1', nombre: 'Coordinador', email: 'c@sena.edu.co', rol: 'admin' };
const partner = { id: 'user-2', nombre: 'Ana Investigadora', email: 'ana@sena.edu.co', rol: 'investigador' };

const archivo = (nombre, tipo) => new File(['contenido'], nombre, { type: tipo });

describe('Adjuntos de mensajería', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MensajesAPI.getConversaciones.mockResolvedValue([]);
    MensajesAPI.getStats.mockResolvedValue({ total_recibidos: 0, no_leidos: 0, total_enviados: 0 });
    MensajesAPI.getConversacion.mockResolvedValue([]);
    MensajesAPI.marcarLeidos.mockResolvedValue({ success: true, marcados: 0 });
    MensajesAPI.notificarTyping.mockResolvedValue({ success: true });
    MensajesAPI.subirAdjunto.mockImplementation(async (file) => ({
      id: `adj-${file.name}`,
      nombre_archivo: file.name,
      content_type: file.type,
      categoria: file.type.startsWith('image/') ? 'imagen' : 'documento',
      tamano_bytes: 1024,
      previsualizable: file.type.startsWith('image/'),
    }));
    MensajesAPI.enviar.mockResolvedValue({
      id: 'msg-1',
      remitente_id: 'user-1',
      destinatario_id: 'user-2',
      contenido: 'Con evidencia',
      created_at: new Date().toISOString(),
      adjuntos: [],
    });
  });

  describe('MessageAttachments', () => {
    it('muestra las imágenes en línea y los documentos como descarga', () => {
      render(
        <MessageAttachments
          adjuntos={[
            { id: 'a1', nombre_archivo: 'captura.png', categoria: 'imagen', tamano_bytes: 2048, previsualizable: true, content_type: 'image/png' },
            { id: 'a2', nombre_archivo: 'informe.pdf', categoria: 'documento', tamano_bytes: 1572864, previsualizable: false, content_type: 'application/pdf' },
          ]}
        />
      );

      const imagen = screen.getByAltText('captura.png');
      expect(imagen).toBeInTheDocument();
      expect(imagen.getAttribute('src')).toContain('/mensajes/adjuntos/a1');

      expect(screen.getByText('informe.pdf')).toBeInTheDocument();
      // Separador decimal colombiano: coma, no punto
      expect(screen.getByText('1,5 MB')).toBeInTheDocument();
    });

    it('reproduce video y audio con controles nativos', () => {
      const { container } = render(
        <MessageAttachments
          adjuntos={[
            { id: 'v1', nombre_archivo: 'clip.mp4', categoria: 'video', tamano_bytes: 5000, previsualizable: true, content_type: 'video/mp4' },
            { id: 's1', nombre_archivo: 'nota.mp3', categoria: 'audio', tamano_bytes: 4000, previsualizable: true, content_type: 'audio/mpeg' },
          ]}
        />
      );

      expect(container.querySelector('video[controls]')).toBeTruthy();
      expect(container.querySelector('audio[controls]')).toBeTruthy();
    });

    it('reserva el espacio de la imagen para que la burbuja no colapse', () => {
      // Sin dimensiones declaradas, una imagen aún no cargada aporta un ancho
      // mínimo de cero: la burbuja se estrecha y el texto se parte letra a letra.
      render(
        <MessageAttachments
          adjuntos={[
            { id: 'a1', nombre_archivo: 'captura.png', categoria: 'imagen', tamano_bytes: 2048, previsualizable: true, content_type: 'image/png' },
          ]}
        />
      );

      const imagen = screen.getByAltText('captura.png');
      expect(Number(imagen.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(imagen.getAttribute('height'))).toBeGreaterThan(0);
      expect(imagen.closest('div').className).toMatch(/w-\d/);
    });

    it('no renderiza nada cuando el mensaje no trae adjuntos', () => {
      const { container } = render(<MessageAttachments adjuntos={[]} />);
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Envío con adjuntos', () => {
    it('sube el archivo elegido y lo envía junto al mensaje', async () => {
      const { container } = render(
        <MensajeriaModule currentUser={currentUser} initialContact={partner} />
      );

      const input = container.querySelector('input[type="file"]');
      expect(input).toBeTruthy();

      fireEvent.change(input, { target: { files: [archivo('captura.png', 'image/png')] } });

      await waitFor(() => expect(MensajesAPI.subirAdjunto).toHaveBeenCalledTimes(1));
      await screen.findByText('captura.png');

      const textarea = screen.getByPlaceholderText(/Escribe un mensaje para Ana Investigadora/i);
      fireEvent.change(textarea, { target: { value: 'Con evidencia' } });
      fireEvent.click(textarea.closest('form').querySelector('button[type="submit"]'));

      await waitFor(() =>
        expect(MensajesAPI.enviar).toHaveBeenCalledWith({
          destinatario_id: 'user-2',
          contenido: 'Con evidencia',
          adjunto_ids: ['adj-captura.png'],
        })
      );
    });

    it('permite enviar solo archivos, sin texto', async () => {
      const { container } = render(
        <MensajeriaModule currentUser={currentUser} initialContact={partner} />
      );

      fireEvent.change(container.querySelector('input[type="file"]'), {
        target: { files: [archivo('informe.pdf', 'application/pdf')] },
      });
      await screen.findByText('informe.pdf');

      const submit = container.querySelector('form button[type="submit"]');
      expect(submit).not.toBeDisabled();
      fireEvent.click(submit);

      await waitFor(() =>
        expect(MensajesAPI.enviar).toHaveBeenCalledWith(
          expect.objectContaining({ contenido: '', adjunto_ids: ['adj-informe.pdf'] })
        )
      );
    });

    it('descarta el adjunto en el servidor si el usuario lo quita antes de enviar', async () => {
      MensajesAPI.eliminarAdjunto.mockResolvedValue({ success: true });
      const { container } = render(
        <MensajeriaModule currentUser={currentUser} initialContact={partner} />
      );

      fireEvent.change(container.querySelector('input[type="file"]'), {
        target: { files: [archivo('captura.png', 'image/png')] },
      });
      await screen.findByText('captura.png');

      fireEvent.click(screen.getByTitle('Quitar captura.png'));

      await waitFor(() =>
        expect(MensajesAPI.eliminarAdjunto).toHaveBeenCalledWith('adj-captura.png')
      );
      expect(screen.queryByText('captura.png')).not.toBeInTheDocument();
    });

    it('avisa cuando el servidor rechaza el archivo', async () => {
      MensajesAPI.subirAdjunto.mockRejectedValue(new Error('Formato no admitido'));
      const onNotify = vi.fn();
      const { container } = render(
        <MensajeriaModule currentUser={currentUser} initialContact={partner} onNotify={onNotify} />
      );

      fireEvent.change(container.querySelector('input[type="file"]'), {
        target: { files: [archivo('virus.exe', 'application/octet-stream')] },
      });

      await waitFor(() =>
        expect(onNotify).toHaveBeenCalledWith(expect.stringContaining('Formato no admitido'), 'error')
      );
    });
  });
});
