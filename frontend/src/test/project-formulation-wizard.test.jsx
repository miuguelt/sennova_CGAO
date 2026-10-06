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
  proyecto: { id: 'p-1', nombre: 'Cultivo de algas', grupo: 'Investigadores CGAO', semillero: 'SIADM' },
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
      { id: 'identificacion', numero: 1, titulo: 'Identificación del proyecto', fuente: 'proyecto', campos: ['nombre', 'vigencia', 'presupuesto_total'], proposito: 'Registre los datos de referencia.', completo: false, faltantes: ['Complete el título.'], advertencias: ['Alerta sobre fechas'] },
      { id: 'institucional', numero: 2, titulo: 'Datos institucionales y equipo', fuente: 'comunes', campos: ['centro', 'equipo'], proposito: 'Ubique la institución y las personas vinculadas.', completo: true, faltantes: [], advertencias: [], bloques: [{ id: 'institucion', titulo: 'Centro y periodo', descripcion: 'Datos del proyecto.', campos: ['centro'] }, { id: 'equipo', titulo: 'Personas y responsabilidades', descripcion: 'Equipo del proyecto.', campos: ['equipo'] }] },
      { id: 'problema', numero: 3, titulo: 'Introducción, problema y justificación', fuente: 'formulacion', campos: ['introduccion', 'contexto', 'planteamiento_problema', 'justificacion'], proposito: 'Describa la necesidad del proyecto.', completo: false, faltantes: [], advertencias: [], bloques: [{ id: 'contexto', titulo: 'Introducción y contexto', descripcion: 'Ubique la necesidad.', campos: ['introduccion', 'contexto'] }, { id: 'necesidad', titulo: 'Problema y justificación', descripcion: 'Delimite el problema.', campos: ['planteamiento_problema', 'justificacion'] }] },
      { id: 'objetivos', numero: 4, titulo: 'Objetivos del proyecto', fuente: 'proyecto', campos: ['objetivo_general', 'objetivos_especificos'], proposito: 'Convierta la necesidad en resultados.', completo: false, faltantes: [], advertencias: [] },
      { id: 'marco', numero: 5, titulo: 'Referentes teóricos y normativos', fuente: 'formulacion', campos: ['referente_teorico', 'marco_normativo'], proposito: 'Sustente el proyecto.', completo: false, faltantes: [], advertencias: [] },
      { id: 'metodologia', numero: 6, titulo: 'Metodología', fuente: 'formulacion', campos: ['metodologia', 'poblacion_muestra', 'tecnicas_recoleccion', 'fases'], proposito: 'Describa el método.', completo: false, faltantes: [], advertencias: [] },
      { id: 'resultados', numero: 7, titulo: 'Resultados e impactos esperados', fuente: 'formulacion', campos: ['resultados_esperados', 'impactos', 'conclusiones'], proposito: 'Defina los resultados previstos.', completo: false, faltantes: [], advertencias: [] },
      { id: 'recursos', numero: 8, titulo: 'Presupuesto y cronograma', fuente: 'comunes', campos: ['presupuesto', 'cronograma'], proposito: 'Organice recursos y tiempos.', completo: false, faltantes: [], advertencias: [] },
      { id: 'referencias', numero: 9, titulo: 'Referencias', fuente: 'formulacion', campos: ['referencias'], proposito: 'Registre las fuentes citadas.', completo: false, faltantes: [], advertencias: [] },
      { id: 'generar', numero: 10, titulo: 'Revisar y generar documentos', fuente: 'generacion', campos: [], proposito: 'Genere los documentos para su revisión.', completo: false, faltantes: [], advertencias: [] },
    ],
    completados: 1,
    total: 10,
    porcentaje: 10,
    siguiente_paso: 'identificacion',
    campos_proyecto: [
      { key: 'nombre', label: 'Título del proyecto', tipo: 'texto', help: 'Nombre oficial' },
      { key: 'objetivo_general', label: 'Objetivo general', tipo: 'texto_largo', help: 'Objetivo del proyecto' },
      { key: 'objetivos_especificos', label: 'Objetivos específicos', tipo: 'texto_largo', help: 'Resultados parciales' },
      { key: 'vigencia', label: 'Duración en meses', tipo: 'number', help: 'Duración confirmada' },
      { key: 'presupuesto_total', label: 'Presupuesto total', tipo: 'number', help: 'Valor confirmado' },
    ],
    valores_proyecto: { nombre: 'Cultivo de algas', objetivo_general: '' },

    documento_clave: 'formulacion_proyecto',
  },
};

describe('Asistente de formulación (ProjectFormulationWizard)', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(() => { cleanup(); });

  function chooseStep(name) {
    fireEvent.click(screen.getByRole('button', { name: 'Ver etapas' }));
    fireEvent.click(screen.getByRole('button', { name }));
  }

  it('permite elegir cualquier sección pendiente y conserva la identificación al regresar', () => {
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit busy={false} />);
    fireEvent.change(screen.getByLabelText(/Título del proyecto/i), { target: { value: 'Título en construcción' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ver etapas' }));
    const target = screen.getByRole('button', { name: /3\. Introducción, problema y justificación/i });
    fireEvent.click(target);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Introducción$/i)).toBeVisible();
    chooseStep(/1\. Identificación del proyecto/i);
    expect(screen.getByLabelText(/Título del proyecto/i)).toHaveValue('Título en construcción');
    expect(screen.getByRole('button', { name: /Guardar identificación/i })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Ver etapas' }));
    expect(screen.getByText(/Sigue este orden sugerido o vuelve a una etapa/i)).toBeVisible();
  });

  it('muestra la barra de avance y los pasos de la formulación guiada', () => {
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit={true} busy={false} />);
    fireEvent.click(screen.getByText('Cómo usar el proyecto de ejemplo CAP-14'));
    expect(screen.getByRole('note')).toHaveTextContent(/CAP-14 orienta el orden de las secciones/i);
    expect(screen.getByRole('note')).toHaveTextContent(/verifica la autorización y vigencia antes de incluir nombres, identificaciones o contactos/i);
    fireEvent.click(screen.getByRole('button', { name: /Mostrar guía y ejemplos/i }));
    expect(screen.getByText(/Esta orientación local no define requisitos institucionales ni aporta datos para el proyecto/i)).toBeInTheDocument();
    expect(screen.getByText('1 de 10 pasos completados')).toBeInTheDocument();
    expect(screen.getByText('10% de avance en formulación')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al formulario' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver etapas' }));
    expect(screen.getByText('1. Identificación del proyecto')).toBeInTheDocument();
    expect(screen.getByText('Alerta sobre fechas')).toBeInTheDocument();
  });

  it('muestra el grupo y el semillero registrados junto a los datos institucionales', () => {
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit busy={false} />);
    chooseStep(/2\. Datos institucionales y equipo/i);

    fireEvent.click(screen.getByText('Consultar grupo y semillero'));
    expect(screen.getByRole('region', { name: 'Vinculación del proyecto' })).toBeInTheDocument();
    expect(screen.getByText('Investigadores CGAO')).toBeInTheDocument();
    expect(screen.getByText('SIADM')).toBeInTheDocument();
    expect(screen.getByText(/se consultan de la ficha del proyecto y no se duplican/i)).toBeInTheDocument();
  });

  it('orienta cuando el proyecto de referencia aún no tiene grupo ni semillero vinculados', () => {
    const recordWithoutAffiliation = {
      ...mockRecord,
      proyecto: { ...mockRecord.proyecto, grupo: null, semillero: null },
    };
    render(<ProjectFormulationWizard projectId="p-1" record={recordWithoutAffiliation} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit busy={false} />);
    chooseStep(/2\. Datos institucionales y equipo/i);

    fireEvent.click(screen.getByText('Consultar grupo y semillero'));
    expect(screen.getByRole('region', { name: 'Vinculación del proyecto' })).toBeInTheDocument();
    expect(screen.getByText('Sin grupo vinculado')).toBeInTheDocument();
    expect(screen.getByText('Sin semillero vinculado')).toBeInTheDocument();
    expect(screen.getByText(/si aplica, completa esa vinculación en la ficha antes de generar documentos/i)).toBeInTheDocument();
  });

  it('no crea descargas rápidas con un código, presupuesto o vigencia inventados', () => {
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit={true} busy={false} />);

    expect(screen.queryByText(/Descargas rápidas de avance/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ficha Técnica \(PDF\)/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Acta de Inicio \(PDF\)/i })).not.toBeInTheDocument();
  });

  it('permite cambiar entre formulario guiado y carga de formato DOCX', () => {
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit={true} busy={false} />);
    fireEvent.click(screen.getByRole('button', { name: /cargar formato/i }));
    expect(screen.getByText(/Opción 1: Importar documento fuente de formulación/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al formulario' }));
    expect(screen.getAllByText('Paso 1 de 10')).toHaveLength(2);
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

  it('conserva el título recién guardado y exige guardar antes de generar documentos', async () => {
    ProjectDocumentationAPI.saveIdentification.mockResolvedValueOnce({});
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit busy={false} />);
    fireEvent.change(screen.getByLabelText(/Título del proyecto/i), { target: { value: 'Título vigente' } });
    chooseStep(/10\. Revisar y generar documentos/i);
    expect(screen.getByRole('button', { name: /Generar Word/i })).toBeDisabled();
    chooseStep(/1\. Identificación del proyecto/i);
    fireEvent.click(screen.getByRole('button', { name: /Guardar identificación/i }));
    await waitFor(() => expect(ProjectDocumentationAPI.saveIdentification).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole('button', { name: /Guardar identificación/i })).toBeDisabled());
    expect(screen.getByLabelText(/Título del proyecto/i)).toHaveValue('Título vigente');
    chooseStep(/10\. Revisar y generar documentos/i);
    expect(screen.getByRole('button', { name: /Generar Word/i })).toBeEnabled();
  });

  it('permite navegar al paso de generación y descargar versiones', () => {
    const generateMock = vi.fn();
    const downloadMock = vi.fn();
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit={true} busy={false} onGenerate={generateMock} onDownload={downloadMock} />);
    chooseStep(/10\. Revisar y generar documentos/i);
    expect(screen.getByText('Formulación del proyecto (.docx)')).toBeInTheDocument();
    expect(screen.getByText('Presentación del proyecto (.pptx)')).toBeInTheDocument();
    expect(screen.getByText(/Borrador editable con la información del proyecto/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/formato oficial institucional|diapositivas oficiales|guía oficial|listo para radicación/i);

    fireEvent.click(screen.getByRole('button', { name: /generar word \(\.docx\)/i }));
    expect(generateMock).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /generar powerpoint \(\.pptx\)/i }));
    expect(generateMock).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole('button', { name: /^descargar$/i }));
    expect(downloadMock).toHaveBeenCalledWith('doc-v1');
  });

  it('indica el número real de pasos que presenta la ruta', () => {
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit busy={false} />);

    expect(screen.getAllByText('Paso 1 de 10')).toHaveLength(2);
  });

  it('permite avanzar, retroceder y editar campos institucionales y de formulación', () => {
    const changeMock = vi.fn();
    const saveCommonMock = vi.fn();
    const saveDraftMock = vi.fn();

    render(
      <ProjectFormulationWizard
        projectId="p-1"
        record={mockRecord}
        drafts={{ comunes: { centro: 'CGAO' }, formulacion_proyecto: { introduccion: 'Intro' } }}
        dirty={{ comunes: true, formulacion_proyecto: true }}
        canEdit={true}
        busy={false}
        onChange={changeMock}
        onSaveCommon={saveCommonMock}
        onSaveDraft={saveDraftMock}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ver etapas' }));
    // Clic en el paso sugerido
    fireEvent.click(screen.getByRole('button', { name: /ir a este paso/i }));
    expect(screen.getAllByText('Paso 1 de 10')).toHaveLength(2);

    // Siguiente paso -> Paso 2 (comunes)
    fireEvent.click(screen.getByRole('button', { name: /siguiente paso/i }));
    expect(screen.getByText('Datos institucionales y equipo')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Centro de formación/i), { target: { value: 'Centro Tecnológico' } });
    expect(changeMock).toHaveBeenCalledWith('comunes', 'centro', 'Centro Tecnológico');
    fireEvent.click(screen.getByRole('button', { name: /guardar datos institucionales/i }));
    expect(saveCommonMock).toHaveBeenCalledWith('comunes');

    // Siguiente paso -> Paso 3 (formulacion)
    fireEvent.click(screen.getByRole('button', { name: /siguiente paso/i }));
    expect(screen.getByText('Introducción, problema y justificación')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/^Introducción$/i), { target: { value: 'Nueva introducción' } });
    expect(changeMock).toHaveBeenCalledWith('formulacion_proyecto', 'introduccion', 'Nueva introducción');
    fireEvent.click(screen.getByRole('button', { name: /guardar borrador/i }));
    expect(saveDraftMock).toHaveBeenCalledWith('formulacion_proyecto', expect.anything());

    // Paso anterior -> Vuelve a Paso 2
    fireEvent.click(screen.getByRole('button', { name: /paso anterior/i }));
    expect(screen.getByText('Datos institucionales y equipo')).toBeInTheDocument();
  });

  it('permite consultar orientaciones metodológicas para campos de texto', async () => {
    ProjectDocumentationAPI.getRecommendation.mockResolvedValueOnce({
      recomendaciones: ['Tip 1', 'Tip 2'],
    });
    render(<ProjectFormulationWizard projectId="p-1" record={mockRecord} drafts={{ comunes: {}, formulacion_proyecto: {} }} dirty={{}} canEdit={true} busy={false} />);
    
    // El paso activo por defecto es identificación. Tiene 'nombre' y 'objetivo_general' que son campos de texto.
    fireEvent.click(screen.getByRole('button', { name: /consultar orientaciones metodológicas/i }));
    
    await waitFor(() => {
      expect(ProjectDocumentationAPI.getRecommendation).toHaveBeenCalled();
      expect(screen.getByText('Orientaciones metodológicas')).toBeInTheDocument();

      expect(screen.getByText('Tip 1')).toBeInTheDocument();
      expect(screen.getByText('Tip 2')).toBeInTheDocument();
    });
  });
});

