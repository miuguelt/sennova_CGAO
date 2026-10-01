import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import DocumentCenterModule from '../components/admin/DocumentCenterModule';
import { DocumentosAPI } from '../api/documentos';
import { ProyectosAPI } from '../api/proyectos';
import { PlantillasAPI } from '../api/plantillas';
import { PDFGenerator } from '../utils/pdfGenerator';

vi.mock('../api/documentos', () => ({
  DocumentosAPI: {
    list: vi.fn(),
    upload: vi.fn(),
  },
}));

vi.mock('../api/proyectos', () => ({
  ProyectosAPI: {
    list: vi.fn(),
  },
}));

vi.mock('../api/plantillas', () => ({
  PlantillasAPI: { getReporteMensual: vi.fn() },
}));

vi.mock('../utils/pdfGenerator', () => ({
  PDFGenerator: { generateMonthlyReport: vi.fn() },
}));

describe('DocumentCenterModule, modelos de referencia', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('aclara que las descargas HTML no reemplazan los formatos controlados', async () => {
    DocumentosAPI.list.mockResolvedValue([]);
    ProyectosAPI.list.mockResolvedValue([]);

    render(<DocumentCenterModule currentUser={{ id: 'admin-1', rol: 'admin' }} />);

    expect(await screen.findByText(/Modelos internos pendientes de validación/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Modelos de referencia/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Formatos & Plantillas Oficiales/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Descargar modelo HTML/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Descarga formatos oficiales SENA\/SENNOVA/i)).not.toBeInTheDocument();
  });

  it('envía la descripción de la evidencia junto con el archivo', async () => {
    DocumentosAPI.list.mockResolvedValue([]);
    DocumentosAPI.upload.mockResolvedValue({});
    ProyectosAPI.list.mockResolvedValue([{ id: 'proyecto-1', codigo_sgps: 'SGPS-26', nombre: 'Proyecto de prueba' }]);

    render(<DocumentCenterModule currentUser={{ id: 'admin-1', rol: 'admin' }} onNotify={vi.fn()} />);
    await screen.findByText(/Modelos internos pendientes de validación/i);
    fireEvent.click(screen.getByRole('button', { name: /Subir Evidencia/i }));

    const file = new File(['%PDF-1.4 evidencia'], 'acta-inicio.pdf', { type: 'application/pdf' });
    fireEvent.change(document.getElementById('vault-file-input'), { target: { files: [file] } });
    fireEvent.change(screen.getAllByRole('combobox')[2], { target: { value: 'proyecto-1' } });
    fireEvent.change(screen.getByPlaceholderText(/Soporte de pruebas de laboratorio/i), {
      target: { value: 'GIC-F-037, acta de inicio, versión por confirmar' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Almacenar en Bóveda/i }));

    await waitFor(() => expect(DocumentosAPI.upload).toHaveBeenCalledOnce());
    const uploadedForm = DocumentosAPI.upload.mock.calls[0][0];
    expect(uploadedForm.get('descripcion')).toBe('GIC-F-037, acta de inicio, versión por confirmar');
  });

  it('genera un reporte de apoyo desde los modelos inteligentes', async () => {
    const monthlyReport = { usuario: 'Investigador CGAO', periodo: '2026-09' };
    DocumentosAPI.list.mockResolvedValue([]);
    ProyectosAPI.list.mockResolvedValue([]);
    PlantillasAPI.getReporteMensual.mockResolvedValue(monthlyReport);

    render(<DocumentCenterModule currentUser={{ id: 'staff-1', rol: 'investigador' }} />);
    await screen.findByText(/Modelos internos pendientes de validación/i);
    fireEvent.click(screen.getAllByRole('button', { name: /Generar reporte PDF de apoyo/i })[0]);

    await waitFor(() => expect(PlantillasAPI.getReporteMensual).toHaveBeenCalledWith('staff-1'));
    expect(PDFGenerator.generateMonthlyReport).toHaveBeenCalledWith(monthlyReport);
  });

  it('muestra la descripción en las vistas de tarjetas y tabla de la bóveda', async () => {
    DocumentosAPI.list.mockResolvedValue([{
      id: 'documento-1',
      nombre_archivo: 'informe-semestral.pdf',
      descripcion: 'Informe de avance del aprendiz',
      tipo: 'informe',
      entidad_tipo: 'proyecto',
      entidad_id: 'proyecto-1',
      owner_id: 'staff-1',
      content_type: 'application/pdf',
      created_at: '2026-09-01T12:00:00Z',
    }]);
    ProyectosAPI.list.mockResolvedValue([{ id: 'proyecto-1', nombre: 'Proyecto ADSO', codigo_sgps: 'SGPS-26' }]);

    render(<DocumentCenterModule currentUser={{ id: 'staff-1', rol: 'investigador' }} />);
    await screen.findByText(/Modelos internos pendientes de validación/i);
    fireEvent.click(screen.getByRole('button', { name: /Bóveda de Evidencias CGAO/i }));

    expect(await screen.findByText('Informe de avance del aprendiz')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vista en tabla' }));
    expect(screen.getAllByText('Informe de avance del aprendiz')).toHaveLength(1);
  });
});
