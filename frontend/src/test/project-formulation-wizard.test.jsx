import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectFormulationWizard from '../components/projects/ProjectFormulationWizard';
import { ProjectDocumentationAPI } from '../api/projectDocumentation';

vi.mock('../api/projectDocumentation', () => ({
  ProjectDocumentationAPI: {
    saveIdentification: vi.fn(),
    analyzeFormulation: vi.fn(),
    applyFormulation: vi.fn(),
    getRecommendation: vi.fn(),
  },
}));


const mockRecord = {
  proyecto: { id: 'p-1', nombre: 'Cultivo de algas' },
  revision: 1,
  campos_comunes: [{ key: 'centro', label: 'Centro de formación', tipo: 'texto', help: 'Centro SENA' }],
  documentos: [
    {
      clave: 'formulacion_proyecto',
      tipo: 'formulacion_proyecto',
      titulo: 'Formulación del proyecto',
      generable: true,
      campos: [{ key: 'introduccion', label: 'Introducción', tipo: 'texto_largo', help: 'Contexto e introducción' }],

      historial: [{ documento_id: 'doc-v1', version: 1, nombre_archivo: 'formulacion_v1.docx', estado: 'borrador', vigente: true, disponible: true }],
    },
    { clave: 'presentacion_proyecto', tipo: 'presentacion_proyecto', titulo: 'Presentación del proyecto', generable: true, campos: [], historial: [] },
  ],
  ruta_formulacion: {
    pasos: [
      { id: 'identificacion', numero: 1, titulo: 'Identificación y objetivos', fuente: 'proyecto', campos: ['nombre', 'objetivo_general'], proposito: 'Defina qué se va a lograr y en cuánto tiempo.', completo: false, faltantes: ['Complete el objetivo general.'], advertencias: [] },
      { id: 'institucional', numero: 2, titulo: 'Datos institucionales', fuente: 'comunes', campos: ['centro'], proposito: 'Ubique el proyecto en el centro y regional.', completo: true, faltantes: [], advertencias: [] },
      { id: 'generar', numero: 9, titulo: 'Revisar y generar documentos', fuente: 'generacion', campos: [], proposito: 'Genere los documentos para su revisión.', completo: false, faltantes: [], advertencias: [] },
    ],
    completados: 1,
    total: 3,
    porcentaje: 33.3,
    siguiente_paso: 'identificacion',
    campos_proyecto: [
      { key: 'nombre', label: 'Título del proyecto', tipo: 'texto', help: 'Nombre oficial' },
      { key: 'objetivo_general', label: 'Objetivo general', tipo: 'texto_largo', help: 'Objetivo del proyecto' },
    ],
    valores_proyecto: { nombre: 'Cultivo de algas', objetivo_general: '' },

    documento_clave: 'formulacion_proyecto',
  },
};

describe('Asistente de formulación (ProjectFormulationWizard)', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  it('muestra la barra de avance y los pasos de la formulación guiada', () => {
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit={true} busy={false} />);
    expect(screen.getByText('Formular proyecto de investigación')).toBeInTheDocument();
    expect(screen.getByText('1 de 3 pasos completados')).toBeInTheDocument();
    expect(screen.getByText('33.3% de avance en formulación')).toBeInTheDocument();
    expect(screen.getByText('1. Identificación y objetivos')).toBeInTheDocument();
  });

  it('permite cambiar entre formulario guiado y carga de formato DOCX', () => {
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit={true} busy={false} />);
    fireEvent.click(screen.getByRole('button', { name: /cargar formato/i }));
    expect(screen.getByText(/Opción 1: Cargar formato oficial diligenciado/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /formulario guiado/i }));
    expect(screen.getByText('Paso 1 de 9')).toBeInTheDocument();
  });

  it('valida archivos en la carga de formato y ejecuta el análisis y aplicación', async () => {
    const notifyMock = vi.fn();
    const reloadMock = vi.fn();
    ProjectDocumentationAPI.analyzeFormulation.mockResolvedValueOnce({
      mensaje: 'Formato CAP analizado',
      campos_detectados: ['nombre', 'objetivo_general', 'introduccion'],
      campos_no_detectados: ['justificacion'],
      campos_recortados: [],
      borrador: { introduccion: 'Texto extraído' },
      proyecto: { nombre: 'Nombre extraído' },
    });
    ProjectDocumentationAPI.applyFormulation.mockResolvedValueOnce({});
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit={true} busy={false} onNotify={notifyMock} onReload={reloadMock} />);
    fireEvent.click(screen.getByRole('button', { name: /cargar formato/i }));
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();

    const badFile = new File(['dummy'], 'prueba.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [badFile] } });
    expect(screen.getByText('Seleccione un archivo de Word con extensión .docx.')).toBeInTheDocument();

    const goodFile = new File(['dummy content'], 'formato_cap.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    fireEvent.change(input, { target: { files: [goodFile] } });
    fireEvent.click(screen.getByRole('button', { name: /analizar y previsualizar formato/i }));

    await waitFor(() => {
      expect(ProjectDocumentationAPI.analyzeFormulation).toHaveBeenCalledWith('p-1', goodFile);
      expect(screen.getByText('Formato CAP analizado')).toBeInTheDocument();
      expect(screen.getByText('introduccion')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /aplicar información al proyecto y borrador/i }));
    await waitFor(() => {
      expect(ProjectDocumentationAPI.applyFormulation).toHaveBeenCalledWith('p-1', { introduccion: 'Texto extraído' }, { nombre: 'Nombre extraído' });
      expect(reloadMock).toHaveBeenCalled();
    });
  });

  it('permite editar la identificación del proyecto y guardar cambios', async () => {
    ProjectDocumentationAPI.saveIdentification.mockResolvedValueOnce({});
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit={true} busy={false} />);
    fireEvent.change(screen.getByLabelText(/Título del proyecto/i), { target: { value: 'Nuevo título modificado' } });
    fireEvent.click(screen.getByRole('button', { name: /guardar identificación/i }));
    await waitFor(() => {
      expect(ProjectDocumentationAPI.saveIdentification).toHaveBeenCalledWith('p-1', expect.objectContaining({ nombre: 'Nuevo título modificado' }));
    });
  });

  it('permite navegar al paso de generación y descargar versiones', () => {
    const generateMock = vi.fn();
    const downloadMock = vi.fn();
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit={true} busy={false} onGenerate={generateMock} onDownload={downloadMock} />);
    fireEvent.click(screen.getByRole('button', { name: /3\. Revisar y generar documentos/i }));
    expect(screen.getByText('Formulación del proyecto (.docx)')).toBeInTheDocument();
    expect(screen.getByText('Presentación del proyecto (.pptx)')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /generar word \(\.docx\)/i }));
    expect(generateMock).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /descargar/i }));
    expect(downloadMock).toHaveBeenCalledWith('doc-v1');
  });

  it('permite solicitar recomendaciones de la IA para campos de texto', async () => {
    ProjectDocumentationAPI.getRecommendation.mockResolvedValueOnce({
      recomendaciones: ['Tip 1', 'Tip 2'],
    });
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit={true} busy={false} />);
    
    // El paso activo por defecto es identificación. Tiene 'nombre' y 'objetivo_general' que son campos de texto.
    fireEvent.click(screen.getByRole('button', { name: /revisar textos con IA/i }));
    
    await waitFor(() => {
      expect(ProjectDocumentationAPI.getRecommendation).toHaveBeenCalled();
      expect(screen.getByText('Recomendaciones del Asistente IA')).toBeInTheDocument();

      expect(screen.getByText('Tip 1')).toBeInTheDocument();
      expect(screen.getByText('Tip 2')).toBeInTheDocument();
    });
  });
});

