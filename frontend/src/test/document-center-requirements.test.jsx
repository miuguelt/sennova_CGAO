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

describe('DocumentCenterModule, alcance de documentos', () => {
  afterEach(cleanup);

  it('no muestra requisitos de modelos internos sin respaldo documental', async () => {
    render(<DocumentCenterModule currentUser={{ id: 'admin-1', rol: 'admin' }} />);

    expect(await screen.findByRole('button', { name: /Bóveda de Evidencias CGAO/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Modelos de referencia/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Modelo con requisitos de evidencia')).not.toBeInTheDocument();
    expect(screen.queryByText('Soporte del proyecto')).not.toBeInTheDocument();
    expect(screen.queryByText('Aprobación del instructor')).not.toBeInTheDocument();
  });
});
