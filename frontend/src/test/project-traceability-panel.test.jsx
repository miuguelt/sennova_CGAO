import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProjectTraceabilityPanel from '../components/projects/ProjectTraceabilityPanel';

describe('ProjectTraceabilityPanel', () => {
  it('renders the traceability panel correctly with empty documents', () => {
    render(<ProjectTraceabilityPanel documentos={[]} />);
    expect(screen.getByText('Trazabilidad del expediente')).toBeInTheDocument();
    expect(screen.getByText('0 de 0 documentos con archivo vigente')).toBeInTheDocument();
  });

  it('calculates the progress correctly', () => {
    const mockDocuments = [
      { clave: 'form1', carpeta: '1ProyectoFormulado', titulo: 'Formulación del proyecto', historial: [{ estado: 'revisado', vigente: true, disponible: true }] },
      { clave: 'acta1', carpeta: '2ActadeInicio', titulo: 'Acta de inicio', historial: [{ estado: 'borrador', vigente: true, disponible: true }] },
      { clave: 'prod1', carpeta: '3Productos', titulo: 'Informe producto', datos: { a: 1 } }, // Borrador
      { clave: 'inf1', carpeta: '4InformesBimensuales', titulo: 'Informe 1' }, // Falta
    ];

    render(<ProjectTraceabilityPanel documentos={mockDocuments} />);
    // total = 4
    // completo/generado = 2
    // progress = 50%
    expect(screen.getByText('2 de 4 documentos con archivo vigente')).toBeInTheDocument();
    
    // Check if titles render
    expect(screen.getByText(/Formulación del proyecto/)).toBeInTheDocument();
    expect(screen.getByText(/Acta de inicio/)).toBeInTheDocument();
    expect(screen.getByText(/Informe producto/)).toBeInTheDocument();
    expect(screen.getByText(/Informe 1/)).toBeInTheDocument();

    // Check states
    expect(screen.getByText('Revisado')).toBeInTheDocument();
    expect(screen.getByText('Generado')).toBeInTheDocument();
    expect(screen.getByText('En borrador')).toBeInTheDocument();
    expect(screen.getByText('Falta')).toBeInTheDocument();
  });

  it('conserva el historial sin presentar versiones anteriores como documentos terminados', () => {
    render(<ProjectTraceabilityPanel documentos={[
      { clave: 'viejo', carpeta: '1ProyectoFomulado', titulo: 'Versión anterior', datos: { texto: 'Actualización' }, historial: [{ estado: 'revisado', vigente: false, disponible: true }] },
      { clave: 'legado', carpeta: '1ProyectoFormulado', titulo: 'Documento importado', datos: {}, historial: [{ estado: 'borrador', vigente: true, disponible: true }] },
      { clave: 'sin-archivo', carpeta: 'otra', titulo: 'Archivo no disponible', datos: {}, historial: [{ estado: 'borrador', vigente: true, disponible: false }] },
    ]} />);
    expect(screen.getByText('1 de 3 documentos con archivo vigente')).toBeVisible();
    expect(screen.getByRole('heading', { name: '1. Formulación' })).toBeVisible();
    expect(screen.getByText(/Versión anterior/)).toBeVisible();
    expect(screen.getByText(/Documento importado/)).toBeVisible();
    expect(screen.queryByText('Revisado')).not.toBeInTheDocument();
    expect(screen.getByText('En borrador')).toBeVisible();
    expect(screen.getByText('Falta')).toBeVisible();
  });
});
