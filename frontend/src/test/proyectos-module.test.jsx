import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ProyectosModule from '../components/projects/ProyectosModule';
import { ProyectosAPI } from '../api/proyectos';
import { UsuariosAPI } from '../api/usuarios';
import { SemillerosAPI } from '../api/semilleros';
import { GruposAPI } from '../api/grupos';
import { RetosAPI } from '../api/retos';
import { ConvocatoriasAPI } from '../api/convocatorias';
import { PDFGenerator } from '../utils/pdfGenerator';

vi.mock('../api/proyectos', () => ({
  ProyectosAPI: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    addEquipo: vi.fn(),
    removeEquipo: vi.fn(),
    checkLiquidacion: vi.fn(),
    getElaboracionStatus: vi.fn(),
  }
}));

vi.mock('../api/usuarios', () => ({
  UsuariosAPI: {
    list: vi.fn()
  }
}));

vi.mock('../api/semilleros', () => ({
  SemillerosAPI: {
    list: vi.fn()
  }
}));

vi.mock('../api/grupos', () => ({
  GruposAPI: {
    list: vi.fn()
  }
}));

vi.mock('../api/retos', () => ({
  RetosAPI: {
    list: vi.fn()
  }
}));

vi.mock('../api/convocatorias', () => ({
  ConvocatoriasAPI: {
    list: vi.fn()
  }
}));

vi.mock('../utils/pdfGenerator', () => ({
  PDFGenerator: {
    generateProjectPDF: vi.fn(),
    generateEtapaProductiva: vi.fn(),
    generateSeguimiento: vi.fn(),
    generateInformeFinal: vi.fn(),
    generateBitacoraReport: vi.fn(),
  }
}));

describe('ProyectosModule', () => {
  const mockUser = {
    id: 'user-1',
    nombre: 'Admin SENNOVA',
    rol: 'admin'
  };

  const mockProyecto = {
    id: 'p-1',
    nombre: 'Plataforma SENNOVA 2026',
    nombre_corto: 'SENNOVA Core',
    codigo_sgps: 'SGPS-2026-01',
    estado: 'En ejecución',
    vigencia: 12,
    año: 2026,
    presupuesto_total: 50000000,
    linea_investigacion: 'Software',
    descripcion: 'Sistema integrado SENNOVA',
    objetivo_general: 'Desarrollar la plataforma central',
    owner_id: 'user-1',
    equipo: [
      { id: 'user-2', nombre: 'Investigador Principal', email: 'inv@sena.edu.co', rol: 'Investigador', horas_dedicadas: 20 }
    ],
    entregables: []
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ProyectosAPI.list.mockResolvedValue([mockProyecto]);
    UsuariosAPI.list.mockResolvedValue([mockUser]);
    RetosAPI.list.mockResolvedValue([]);
    SemillerosAPI.list.mockResolvedValue([]);
    ConvocatoriasAPI.list.mockResolvedValue([]);
    GruposAPI.list.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders project list and handles project detail opening with team tab', async () => {
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SENNOVA Core')).toBeInTheDocument();
    });

    const projectCard = screen.getByText('SENNOVA Core');
    fireEvent.click(projectCard);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const teamTabBtn = screen.getByRole('tab', { name: /Equipo/i });
    fireEvent.click(teamTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Investigador Principal')).toBeInTheDocument();
      expect(screen.getByText('1 Miembro')).toBeInTheDocument();
    });
  });

  it('handles formats tab and PDF generation', async () => {
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SENNOVA Core')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('SENNOVA Core'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const formatsTabBtn = screen.getByRole('tab', { name: /Formatos/i });
    fireEvent.click(formatsTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Formatos Oficiales SENNOVA')).toBeInTheDocument();
      expect(screen.getByText('Formato Planeación Etapa Productiva')).toBeInTheDocument();
    });

    const generateButtons = screen.getAllByRole('button', { name: /Generar/i });
    fireEvent.click(generateButtons[0]);

    expect(PDFGenerator.generateEtapaProductiva).toHaveBeenCalledWith(expect.objectContaining({ id: 'p-1' }));
  });

  it('allows adding a researcher to the project team', async () => {
    const newUser = {
      id: 'user-3',
      nombre: 'María Investigadora',
      email: 'maria@sena.edu.co',
      rol: 'investigador',
      rol_sennova: 'Investigadora'
    };

    UsuariosAPI.list.mockResolvedValue([mockUser, newUser]);
    ProyectosAPI.addEquipo.mockResolvedValue({ message: 'Miembro añadido correctamente' });
    ProyectosAPI.get.mockResolvedValue({
      ...mockProyecto,
      equipo: [
        ...mockProyecto.equipo,
        { id: 'user-3', nombre: 'María Investigadora', email: 'maria@sena.edu.co', rol_en_proyecto: 'Coinvestigador', horas_dedicadas: 20 }
      ]
    });

    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('SENNOVA Core')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('SENNOVA Core'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const teamTabBtn = screen.getByRole('tab', { name: /Equipo/i });
    fireEvent.click(teamTabBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Vincular Investigador/i })).toBeInTheDocument();
    });

    // Open Add Modal
    fireEvent.click(screen.getByRole('button', { name: /Vincular Investigador/i }));

    await waitFor(() => {
      expect(screen.getByText('María Investigadora')).toBeInTheDocument();
    });

    // Select Maria
    fireEvent.click(screen.getByText('María Investigadora'));

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Vincular al Proyecto/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(ProyectosAPI.addEquipo).toHaveBeenCalledWith('p-1', 'user-3', 'Investigador', 20);
    });
  });
});
