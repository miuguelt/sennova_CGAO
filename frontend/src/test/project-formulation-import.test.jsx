import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProjectFormulationImport from '../components/projects/ProjectFormulationImport';
import { ProyectosAPI } from '../api/proyectos';

vi.mock('../api/proyectos', () => ({
  ProyectosAPI: { analyzeFormulation: vi.fn() },
}));

describe('ProjectFormulationImport', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('aclara que la lectura no certifica el cumplimiento institucional', () => {
    render(<ProjectFormulationImport onAnalysis={vi.fn()} onFileChange={vi.fn()} />);

    expect(screen.getByText(/no certifica el cumplimiento ni reemplaza el formato institucional vigente/i)).toBeInTheDocument();
  });

  it('rejects a file that is not DOCX and explains the allowed format', async () => {
    const onAnalysis = vi.fn();
    const onFileChange = vi.fn();
    render(<ProjectFormulationImport onAnalysis={onAnalysis} onFileChange={onFileChange} />);

    fireEvent.change(screen.getByLabelText(/seleccionar formulación/i), {
      target: { files: [new File(['pdf'], 'formulacion.pdf', { type: 'application/pdf' })] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(/solo se admiten archivos \.docx/i);
    expect(ProyectosAPI.analyzeFormulation).not.toHaveBeenCalled();
    expect(onAnalysis).not.toHaveBeenCalled();
    expect(onFileChange).toHaveBeenCalledWith(null);
  });

  it('blocks files larger than 10 MB before sending them to the API', async () => {
    render(<ProjectFormulationImport onAnalysis={vi.fn()} onFileChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/seleccionar formulación/i), {
      target: { files: [new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'proyecto.docx')] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(/supera el límite de 10 MB/i);
    expect(ProyectosAPI.analyzeFormulation).not.toHaveBeenCalled();
  });

  it('analyzes a DOCX and returns suggested fields plus the original file', async () => {
    const analysis = {
      suggested_fields: { nombre: 'Proyecto de prueba', objetivo_general: 'Objetivo importado' },
      campos_no_detectados: ['descripcion'],
      referencias_detectadas: { grupo: 'Grupo existente' },
    };
    const onAnalysis = vi.fn();
    const onFileChange = vi.fn();
    const file = new File(['docx'], 'proyecto.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    ProyectosAPI.analyzeFormulation.mockResolvedValue(analysis);
    render(<ProjectFormulationImport onAnalysis={onAnalysis} onFileChange={onFileChange} />);

    fireEvent.change(screen.getByLabelText(/seleccionar formulación/i), { target: { files: [file] } });

    expect(await screen.findByText(/lectura lista/i)).toBeInTheDocument();
    expect(screen.getByText(/2 campos encontrados/i)).toBeInTheDocument();
    expect(screen.getByText(/grupo existente/i)).toBeInTheDocument();
    expect(ProyectosAPI.analyzeFormulation).toHaveBeenCalledWith(file);
    expect(onFileChange).toHaveBeenCalledWith(file);
    expect(onAnalysis).toHaveBeenCalledWith(analysis);
  });

  it('shows loading and exposes a retry when analysis fails', async () => {
    let finishAnalysis;
    ProyectosAPI.analyzeFormulation
      .mockImplementationOnce(() => new Promise((resolve, reject) => {
        finishAnalysis = { resolve, reject };
      }))
      .mockResolvedValueOnce({ suggested_fields: { nombre: 'Proyecto de prueba' } });
    const file = new File(['docx'], 'proyecto.docx');
    render(<ProjectFormulationImport onAnalysis={vi.fn()} onFileChange={vi.fn()} />);

    fireEvent.change(screen.getByLabelText(/seleccionar formulación/i), { target: { files: [file] } });
    expect(screen.getByText(/leyendo la formulación/i)).toBeInTheDocument();
    finishAnalysis.reject(new Error('No se pudo leer el archivo'));

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo leer el archivo');
    fireEvent.click(screen.getByRole('button', { name: /intentar de nuevo/i }));
    expect(await screen.findByText(/lectura lista/i)).toBeInTheDocument();
    expect(ProyectosAPI.analyzeFormulation).toHaveBeenCalledTimes(2);
  });

  it('clears the analyzed file so project creation can continue without it', async () => {
    const onAnalysis = vi.fn();
    const onFileChange = vi.fn();
    ProyectosAPI.analyzeFormulation.mockResolvedValue({ suggested_fields: { nombre: 'Proyecto de prueba' } });
    render(<ProjectFormulationImport onAnalysis={onAnalysis} onFileChange={onFileChange} />);
    fireEvent.change(screen.getByLabelText(/seleccionar formulación/i), {
      target: { files: [new File(['docx'], 'proyecto.docx')] },
    });
    await waitFor(() => expect(onAnalysis).toHaveBeenCalledOnce());

    fireEvent.click(screen.getByRole('button', { name: /quitar archivo/i }));

    expect(onFileChange).toHaveBeenLastCalledWith(null);
    expect(await screen.findByText(/si ya tienes la formulación/i)).toBeInTheDocument();
  });
});
