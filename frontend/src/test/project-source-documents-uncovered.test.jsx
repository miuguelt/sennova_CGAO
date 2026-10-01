import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProjectSourceDocuments from '../components/projects/ProjectSourceDocuments';
import { DocumentosAPI } from '../api/documentos';

vi.mock('../api/documentos', () => ({
  DocumentosAPI: {
    getProyectoDocumentos: vi.fn(),
    download: vi.fn(),
  },
}));

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

describe('flujos adicionales de la formulación fuente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DocumentosAPI.getProyectoDocumentos.mockResolvedValue([]);
    DocumentosAPI.download.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('mantiene la consulta en curso visible y descarta la respuesta del proyecto anterior', async () => {
    const staleRequest = deferred();
    DocumentosAPI.getProyectoDocumentos.mockImplementation((projectId) => (
      projectId === 'project-old'
        ? staleRequest.promise
        : Promise.resolve([{ id: 'current-doc', tipo: 'formulacion_proyecto', nombre_archivo: 'actual.docx' }])
    ));

    const view = render(<ProjectSourceDocuments projectId="project-old" />);
    expect(screen.getByRole('status')).toHaveTextContent('Consultando archivo');
    view.rerender(<ProjectSourceDocuments projectId="project-current" />);
    expect(await screen.findByText('actual.docx')).toBeVisible();

    await act(async () => {
      staleRequest.reject(new Error('Respuesta tardía del proyecto anterior'));
      await staleRequest.promise.catch(() => {});
    });
    expect(screen.getByText('actual.docx')).toBeVisible();
    expect(screen.queryByText('Respuesta tardía del proyecto anterior')).not.toBeInTheDocument();
    expect(DocumentosAPI.getProyectoDocumentos).toHaveBeenNthCalledWith(1, 'project-old');
    expect(DocumentosAPI.getProyectoDocumentos).toHaveBeenNthCalledWith(2, 'project-current');
  });

  it('usa el mensaje de consulta predeterminado y deja el estado vacío ante una respuesta no válida', async () => {
    DocumentosAPI.getProyectoDocumentos
      .mockRejectedValueOnce({})
      .mockResolvedValueOnce({ documentos: [{ id: 'ignored', tipo: 'formulacion_proyecto' }] });
    render(<ProjectSourceDocuments projectId="project-invalid" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible consultar los documentos del proyecto.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Aún no hay una formulación DOCX adjunta a este proyecto.')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(DocumentosAPI.getProyectoDocumentos).toHaveBeenCalledTimes(2);
  });

  it('muestra los errores de descarga, habilita el reintento y descarga con nombre y tipo de respaldo', async () => {
    DocumentosAPI.getProyectoDocumentos.mockResolvedValue([
      { id: 'doc-source', tipo: 'formulacion_proyecto', content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    ]);
    DocumentosAPI.download
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('El servidor no respondió'))
      .mockResolvedValueOnce({ data_base64: btoa('contenido fuente') });

    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:source-doc');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let savedAs;
    const clickAnchor = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      savedAs = this.download;
    });
    render(<ProjectSourceDocuments projectId="project-download" />);

    expect(await screen.findByText('Formulación DOCX')).toBeVisible();
    const downloadButton = screen.getByRole('button', { name: 'Descargar formulación original' });
    fireEvent.click(downloadButton);
    expect(await screen.findByRole('alert')).toHaveTextContent('El documento no contiene datos descargables.');
    expect(downloadButton).toBeEnabled();

    fireEvent.click(downloadButton);
    expect(await screen.findByRole('alert')).toHaveTextContent('El servidor no respondió');
    expect(downloadButton).toBeEnabled();

    fireEvent.click(downloadButton);
    await waitFor(() => expect(clickAnchor).toHaveBeenCalledOnce());
    expect(DocumentosAPI.download).toHaveBeenNthCalledWith(1, 'doc-source');
    expect(DocumentosAPI.download).toHaveBeenNthCalledWith(2, 'doc-source');
    expect(DocumentosAPI.download).toHaveBeenNthCalledWith(3, 'doc-source');
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(createObjectURL.mock.calls[0][0].type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(savedAs).toBe('formulacion.docx');
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:source-doc'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(downloadButton).toBeEnabled();
  });
});
