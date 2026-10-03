import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ProjectFormulationStep from '../components/projects/ProjectFormulationStep';
import { PDFGenerator } from '../utils/pdfGenerator';

vi.mock('../utils/pdfGenerator', () => ({
  PDFGenerator: {
    generateProjectPDF: vi.fn(),
    generateActaInicio: vi.fn(),
    generateSeguimiento: vi.fn(),
    generateInformeFinal: vi.fn(),
  },
}));

describe('ProjectFormulationStep', () => {
  const mockFields = [
    {
      key: 'objetivo_general',
      label: 'Objetivo General',
      type: 'textarea',
      required: true,
      placeholder: 'Defina el objetivo general...',
      help: 'Debe iniciar con verbo en infinitivo.',
    },
    {
      key: 'justificacion',
      label: 'Justificación',
      type: 'textarea',
      placeholder: 'Describa la justificación...',
    },
  ];

  const mockStep = {
    id: 'identificacion',
    titulo: 'Identificación y Objetivos',
    descripcion: 'Paso 1: Defina los datos de partida del proyecto',
    fuente: 'formulacion',
    campos: ['objetivo_general', 'justificacion'],
  };

  const mockDraftValues = {
    objetivo_general: 'Diseñar un sistema de monitoreo para cultivos de mora',
    justificacion: 'Permite optimizar el uso de agua en la región de Vélez',
  };

  const defaultProps = {
    projectId: 'p-1',
    step: mockStep,
    projectValues: { nombre: 'Proyecto de Prueba' },
    commonValues: {},
    draftValues: mockDraftValues,
    projectFields: [],
    commonFields: [],
    formulationFields: mockFields,
    documents: [{ tipo: 'formulacion_proyecto', id: 'doc-1' }],
    canEdit: true,
    busy: false,
    dirty: {},
    onProjectChange: vi.fn(),
    onCommonChange: vi.fn(),
    onDraftChange: vi.fn(),
    onSaveProject: vi.fn(),
    onSaveCommon: vi.fn(),
    onSaveDraft: vi.fn(),
    onGenerate: vi.fn(),
    onDownload: vi.fn(),
    onNotify: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza la interfaz de dos columnas con los campos de formulación y el Tutor Metodológico', () => {
    render(<ProjectFormulationStep {...defaultProps} />);

    // Columna de formulario
    expect(screen.getByLabelText(/Objetivo General/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Justificación/i)).toBeInTheDocument();

    // Columna del tutor metodológico
    expect(screen.getByText('Tutor Metodológico')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /¿Qué agregar\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Checklist/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Ejemplo/i })).toBeInTheDocument();
  });

  it('permite alternar entre las pestañas del tutor metodológico', () => {
    render(<ProjectFormulationStep {...defaultProps} />);

    // Pestaña inicial: orientación
    expect(screen.getByText(/Consulte a continuación qué información debe ingresar/i)).toBeInTheDocument();

    // Cambiar a Checklist
    fireEvent.click(screen.getByRole('button', { name: /Checklist/i }));
    expect(screen.getByText(/Criterios de calidad validados/i)).toBeInTheDocument();

    // Cambiar a Ejemplo
    fireEvent.click(screen.getByRole('button', { name: /Ejemplo/i }));
    expect(screen.getByRole('button', { name: /Copiar/i })).toBeInTheDocument();
  });

  it('permite marcar y desmarcar criterios en la checklist interactiva actualizando el progreso', () => {
    render(<ProjectFormulationStep {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Checklist/i }));

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    // Marcar primer ítem
    expect(checkboxes[0].checked).toBe(false);
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0].checked).toBe(true);

    // Verificar porcentaje del 25% y texto del tab
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Checklist \(1\/4\)/i })).toBeInTheDocument();

    // Desmarcar ítem
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0].checked).toBe(false);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('permite copiar el texto de ejemplo modelo al portapapeles', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ProjectFormulationStep {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Ejemplo/i }));
    const copyButton = screen.getByRole('button', { name: /Copiar/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalled();
      expect(defaultProps.onNotify).toHaveBeenCalledWith(
        'Estructura modelo copiada al portapapeles',
        'success'
      );
    });
  });

  it('muestra alerta didáctica cuando el objetivo general no inicia con verbo en infinitivo', () => {
    render(
      <ProjectFormulationStep
        {...defaultProps}
        draftValues={{
          ...mockDraftValues,
          objetivo_general: 'El proyecto pretende desarrollar una solución',
        }}
      />
    );

    expect(
      screen.getByText(/Sugerencia de formulación: El objetivo general debe iniciar con un verbo de acción en infinitivo/i)
    ).toBeInTheDocument();
  });

  it('permite descargar documentos en construcción directamente desde el paso', async () => {
    render(<ProjectFormulationStep {...defaultProps} />);

    // Debe mostrar la sección de documentos en construcción
    expect(screen.getByText('Documentos en Construcción')).toBeInTheDocument();

    const downloadButtons = screen.getAllByRole('button', { name: /Descargar PDF/i });
    expect(downloadButtons.length).toBeGreaterThan(0);

    // Clic en el primer botón (Ficha Técnica)
    fireEvent.click(downloadButtons[0]);

    await waitFor(() => {
      expect(PDFGenerator.generateProjectPDF).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'p-1' }),
        expect.any(Array)
      );
      expect(defaultProps.onNotify).toHaveBeenCalledWith(
        'Ficha técnica de investigación generada exitosamente',
        'success'
      );
    });
  });

  it('invoca el callback correspondiente cuando el usuario edita un campo', () => {
    render(<ProjectFormulationStep {...defaultProps} />);

    const textarea = screen.getByLabelText(/Objetivo General/i);
    fireEvent.change(textarea, { target: { value: 'Optimizar la producción panelera' } });

    expect(defaultProps.onDraftChange).toHaveBeenCalledWith(
      'objetivo_general',
      'Optimizar la producción panelera'
    );
  });
});
