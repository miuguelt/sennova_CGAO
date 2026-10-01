import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProjectSourceDocuments from '../components/projects/ProjectSourceDocuments';
import { DocumentosAPI } from '../api/documentos';

vi.mock('../api/documentos', () => ({
  DocumentosAPI: {
    getProyectoDocumentos: vi.fn(),
    download: vi.fn(),
  },
}));

describe('ProjectSourceDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    DocumentosAPI.getProyectoDocumentos.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('lista y descarga el DOCX fuente guardado con el proyecto', async () => {
    DocumentosAPI.getProyectoDocumentos.mockResolvedValue([
      { id: 'doc-1', tipo: 'formulacion_proyecto', nombre_archivo: 'proyecto-cap.docx' },
      { id: 'doc-2', tipo: 'acta', nombre_archivo: 'acta.pdf' },
    ]);
    DocumentosAPI.download.mockResolvedValue({
      nombre_archivo: 'proyecto-cap.docx',
      content_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      data_base64: btoa('contenido docx'),
    });
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:formulation');
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    let downloadedName;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      downloadedName = this.download;
    });

    render(<ProjectSourceDocuments projectId="project-1" />);

    expect(await screen.findByText('proyecto-cap.docx')).toBeInTheDocument();
    expect(screen.queryByText('acta.pdf')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Descargar formulación original/i }));

    await waitFor(() => expect(DocumentosAPI.download).toHaveBeenCalledWith('doc-1'));
    await waitFor(() => expect(downloadedName).toBe('proyecto-cap.docx'));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:formulation');
  });

  it('indica cuando el proyecto aún no tiene una formulación adjunta', async () => {
    render(<ProjectSourceDocuments projectId="project-2" />);

    expect(await screen.findByText(/Aún no hay una formulación DOCX adjunta/i)).toBeInTheDocument();
  });

  it('permite reintentar si no se pueden consultar los documentos', async () => {
    DocumentosAPI.getProyectoDocumentos.mockRejectedValueOnce(new Error('Servicio no disponible'));
    render(<ProjectSourceDocuments projectId="project-3" />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio no disponible');
    DocumentosAPI.getProyectoDocumentos.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: /Reintentar/i }));
    expect(await screen.findByText(/Aún no hay una formulación DOCX adjunta/i)).toBeInTheDocument();
  });
});
