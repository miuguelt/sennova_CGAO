import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import DocumentCenterModule from '../components/admin/DocumentCenterModule';

vi.mock('../api/documentos', () => ({
  DocumentosAPI: { list: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../api/proyectos', () => ({
  ProyectosAPI: { list: vi.fn().mockResolvedValue([]) },
}));

vi.mock('../api/plantillas', () => ({
  PlantillasAPI: { getReporteMensual: vi.fn() },
}));

vi.mock('../utils/pdfGenerator', () => ({
  PDFGenerator: { generateMonthlyReport: vi.fn() },
}));

vi.mock('../data/sennovaFormats', () => ({
  SENNOVA_FORMATS: [{
    id: 'modelo-prueba',
    codigo: 'GIC-F-001',
    titulo: 'Modelo con requisitos de evidencia',
    categoria: 'contractual',
    categoriaLabel: 'Gestión Contractual',
    color: 'emerald',
    extension: 'html',
    descripcion: 'Modelo usado para validar la presentación de requisitos.',
    aplicaA: 'Proyectos de investigación',
    requisitos: ['Soporte del proyecto', 'Aprobación del instructor'],
    templateContent: 'Contenido de referencia',
  }],
  downloadFormatTemplate: vi.fn(),
}));

describe('DocumentCenterModule, presentación de requisitos', () => {
  afterEach(cleanup);

  it('muestra cada requisito disponible en la tarjeta del modelo', async () => {
    render(<DocumentCenterModule currentUser={{ id: 'admin-1', rol: 'admin' }} />);

    expect(await screen.findByText('Modelo con requisitos de evidencia')).toBeInTheDocument();
    expect(screen.getByText('Soporte del proyecto')).toBeInTheDocument();
    expect(screen.getByText('Aprobación del instructor')).toBeInTheDocument();
  });
});
