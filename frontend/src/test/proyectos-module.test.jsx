import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
import ProyectosModule from '../components/projects/ProyectosModule';
import { ProyectosAPI } from '../api/proyectos';
import { UsuariosAPI } from '../api/usuarios';
import { SemillerosAPI } from '../api/semilleros';
import { GruposAPI } from '../api/grupos';
import { RetosAPI } from '../api/retos';
import { ConvocatoriasAPI } from '../api/convocatorias';
import { PlantillasAPI } from '../api/plantillas';
import { DocumentosAPI } from '../api/documentos';
import { PDFGenerator } from '../utils/pdfGenerator';
import { formatBudgetCurrency } from '../components/projects/ProyectosModule';

vi.mock('../api/proyectos', () => ({
  ProyectosAPI: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    analyzeFormulation: vi.fn(),
    importFormulation: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    addEquipo: vi.fn(),
    removeEquipo: vi.fn(),
    checkLiquidacion: vi.fn(),
    getElaboracionStatus: vi.fn(),
    getExpediente: vi.fn(),
    downloadExpediente: vi.fn(),
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

vi.mock('../api/plantillas', () => ({
  PlantillasAPI: {
    generarCronograma: vi.fn(),
    getCertificadosMasivos: vi.fn(),
  }
}));

vi.mock('../api/documentos', () => ({
  DocumentosAPI: {
    getProyectoDocumentos: vi.fn(),
    download: vi.fn(),
  },
}));

vi.mock('../api/projectDocumentation', () => ({
  ProjectDocumentationAPI: {
    get: vi.fn().mockResolvedValue({
      proyecto: { id: 'p-1', nombre: 'Plataforma SENNOVA 2026' },
      revision: 1,
      comunes: { centro: 'CGAO', fecha: '', presupuesto: 0, equipo: [] },
      campos_comunes: [],
      documentos: []
    }),
    saveCommon: vi.fn(),
    saveDraft: vi.fn(),
    saveIdentification: vi.fn(),
    analyzeFormulation: vi.fn(),
    applyFormulation: vi.fn(),
    generate: vi.fn(),
    review: vi.fn(),
  }
}));

vi.mock('../utils/pdfGenerator', () => ({
  PDFGenerator: {
    generateProjectPDF: vi.fn(),
    generateActaInicio: vi.fn(),
    generateEtapaProductiva: vi.fn(),
    generateSeguimiento: vi.fn(),
    generateInformeFinal: vi.fn(),
    generateProjectCertificate: vi.fn(),
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
    ProyectosAPI.create.mockResolvedValue({ id: 'p-created' });
    ProyectosAPI.update.mockResolvedValue({});
    ProyectosAPI.delete.mockResolvedValue({});
    ProyectosAPI.get.mockResolvedValue(mockProyecto);
    ProyectosAPI.checkLiquidacion.mockResolvedValue({
      porcentaje_completitud: 60,
      can_liquidate: false,
      auto_finalizado: false,
      checklist: [{ id: 'docs', label: 'Documentos', status: true, detalles: 'Cargados' }]
    });
    ProyectosAPI.getElaboracionStatus.mockResolvedValue({
      score_total: 80,
      nivel_calidad: 'Alta',
      criterios: [{ categoria: 'Objetivos', detalle: 'Claros', puntos: 8, max: 10, status: true }],
      recomendaciones: ['Ampliar cronograma']
    });
    PlantillasAPI.generarCronograma.mockResolvedValue({});
    PlantillasAPI.getCertificadosMasivos.mockResolvedValue([]);
    DocumentosAPI.getProyectoDocumentos.mockResolvedValue([]);
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

    fireEvent.click(screen.getByRole('tab', { name: /Formatos/i }));
    expect(await screen.findByText(/Aún no hay una formulación DOCX adjunta/i)).toBeInTheDocument();
  });

  it('conserva Referencia como estado propio en columna, tarjeta, filtro y detalle', async () => {
    const reference = { ...mockProyecto, id: 'reference-1', nombre: 'Ejemplo institucional privado', nombre_corto: 'Ejemplo de referencia', estado: 'Referencia' };
    ProyectosAPI.list.mockResolvedValue([reference, { ...mockProyecto, id: 'approved-1', nombre_corto: 'Proyecto aprobado', estado: 'Aprobado' }]);
    ProyectosAPI.get.mockResolvedValue(reference);
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);
    await screen.findByText('Ejemplo de referencia');
    const referenceColumn = screen.getByLabelText('Columna Referencia');
    expect(within(referenceColumn).getByText('Ejemplo de referencia')).toBeInTheDocument();
    expect(within(referenceColumn).getByText('Referencia')).toBeInTheDocument();
    expect(within(screen.getByLabelText('Columna Aprobado')).queryByText('Ejemplo de referencia')).not.toBeInTheDocument();
    for (const state of ['Aprobado', 'En ejecución', 'Finalizado', 'Referencia']) expect(within(screen.getByLabelText('Filtrar por estado')).getByRole('option', { name: state })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'Referencia' } });
    expect(screen.getByText('Ejemplo de referencia')).toBeInTheDocument();
    expect(screen.queryByText('Proyecto aprobado')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Ejemplo de referencia'));
    const drawer = await screen.findByRole('dialog');
    expect(within(drawer).getByText('Referencia')).toBeInTheDocument();
    expect(within(drawer).queryByText('Aprobado')).not.toBeInTheDocument();
  });

  it('no consulta listados de gestión cuando el módulo se abre para un aprendiz', async () => {
    const learner = { id: 'learner-1', nombre: 'Aprendiz', rol: 'aprendiz' };
    render(<ProyectosModule currentUser={learner} onNotify={vi.fn()} />);

    await waitFor(() => expect(ProyectosAPI.list).toHaveBeenCalled());
    expect(UsuariosAPI.list).not.toHaveBeenCalled();
    expect(ConvocatoriasAPI.list).not.toHaveBeenCalled();
    expect(GruposAPI.list).not.toHaveBeenCalled();
    expect(RetosAPI.list).toHaveBeenCalled();
    expect(SemillerosAPI.list).toHaveBeenCalled();
  });

  it('prellena el formulario desde la formulación y conserva el DOCX al crear', async () => {
    const sourceFile = new File(['docx original'], 'proyecto-cap.docx');
    let finishImport;
    GruposAPI.list.mockResolvedValue([{ id: 'group-1', nombre: 'Grupo de Investigación' }]);
    SemillerosAPI.list.mockResolvedValue([{ id: 'seedbed-1', nombre: 'Semillero Prueba' }]);
    ProyectosAPI.analyzeFormulation.mockResolvedValue({
      suggested_fields: {
        nombre: 'Proyecto extraído',
        objetivo_general: 'Objetivo detectado',
        objetivos_especificos: ['Objetivo específico detectado'],
        descripcion: 'Secciones de la formulación',
      },
      referencias_detectadas: { grupo: 'GRUPO DE INVESTIGACION', semillero: 'semillero-prueba' },
      campos_no_detectados: [],
    });
    ProyectosAPI.importFormulation.mockImplementation(() => new Promise((resolve) => { finishImport = resolve; }));
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);

    await waitFor(() => expect(ProyectosAPI.list).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Proyecto/i }));
    fireEvent.change(screen.getByLabelText(/seleccionar formulación/i), { target: { files: [sourceFile] } });

    expect(await screen.findByText(/Lectura lista/i)).toBeInTheDocument();
    const projectName = screen.getByPlaceholderText('Nombre completo del proyecto...');
    expect(projectName).toHaveValue('Proyecto extraído');
    fireEvent.change(projectName, { target: { value: 'Nombre revisado' } });
    fireEvent.click(screen.getByRole('tab', { name: /Técnicos/i }));
    expect(screen.getByPlaceholderText('Formular el objetivo general del proyecto...')).toHaveValue('Objetivo detectado');
    fireEvent.click(screen.getByRole('button', { name: /Crear Proyecto/i }));

    await waitFor(() => expect(ProyectosAPI.importFormulation).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: 'Nombre revisado',
        objetivo_general: 'Objetivo detectado',
        grupo_id: 'group-1',
        semillero_id: 'seedbed-1',
      }),
      sourceFile,
    ));
    expect(screen.getByRole('button', { name: /Guardando/i })).toBeDisabled();
    expect(ProyectosAPI.create).not.toHaveBeenCalled();
    finishImport({ id: 'p-importado' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('al volver a importar conserva los campos editados y completa los que siguen vacíos', async () => {
    ProyectosAPI.analyzeFormulation
      .mockResolvedValueOnce({
        suggested_fields: {
          nombre: 'Título inicial',
          objetivo_general: 'Objetivo inicial',
        },
      })
      .mockResolvedValueOnce({
        suggested_fields: {
          nombre: 'Título de otro archivo',
          objetivo_general: 'Objetivo de otro archivo',
          descripcion: 'Descripción del segundo archivo',
        },
      });
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);
    await waitFor(() => expect(ProyectosAPI.list).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Proyecto/i }));

    const fileInput = screen.getByLabelText(/seleccionar formulación/i);
    fireEvent.change(fileInput, { target: { files: [new File(['primero'], 'primero.docx')] } });
    expect(await screen.findByText(/Lectura lista/i)).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText('Nombre completo del proyecto...');
    fireEvent.change(nameInput, { target: { value: 'Título corregido por el usuario' } });
    fireEvent.click(screen.getByRole('tab', { name: /Técnicos/i }));
    const objectiveInput = screen.getByPlaceholderText('Formular el objetivo general del proyecto...');
    fireEvent.change(objectiveInput, { target: { value: 'Objetivo revisado manualmente' } });
    fireEvent.click(screen.getByRole('tab', { name: /Básicos/i }));

    fireEvent.change(screen.getByLabelText(/seleccionar formulación/i), {
      target: { files: [new File(['segundo'], 'segundo.docx')] },
    });
    expect(await screen.findByText(/Lectura lista/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nombre completo del proyecto...'))
      .toHaveValue('Título corregido por el usuario');
    fireEvent.click(screen.getByRole('tab', { name: /Técnicos/i }));
    expect(screen.getByPlaceholderText('Formular el objetivo general del proyecto...'))
      .toHaveValue('Objetivo revisado manualmente');
    expect(screen.getByPlaceholderText(/Describe el alcance y contexto/))
      .toHaveValue('Descripción del segundo archivo');
  });

  it('abre la edición de un proyecto y permite cerrar con el botón del encabezado', async () => {
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('SENNOVA Core')).toBeInTheDocument());
    fireEvent.click(screen.getByText('SENNOVA Core'));

    const detailDialog = await screen.findByRole('dialog');
    fireEvent.click(within(detailDialog).getByRole('button', { name: /Editar Proyecto/i }));

    expect(await screen.findByRole('heading', { name: 'Editar Proyecto' })).toBeInTheDocument();
    const editDialog = screen.getAllByRole('dialog').at(-1);
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Cerrar ventana modal' }));
    await waitFor(() => expect(screen.getAllByRole('dialog')).toHaveLength(1));
    expect(screen.getByText('SENNOVA Core')).toBeInTheDocument();
  });

  it('cancela una importación y vuelve a permitir la creación manual', async () => {
    ProyectosAPI.analyzeFormulation.mockResolvedValue({ suggested_fields: { nombre: 'Proyecto importado' } });
    ProyectosAPI.create.mockResolvedValue({ id: 'p-manual' });
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);
    await waitFor(() => expect(ProyectosAPI.list).toHaveBeenCalled());

    fireEvent.click(screen.getByRole('button', { name: /Nuevo Proyecto/i }));
    fireEvent.change(screen.getByLabelText(/seleccionar formulación/i), {
      target: { files: [new File(['docx'], 'formulacion.docx')] },
    });
    expect(await screen.findByText(/Lectura lista/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Nuevo Proyecto/i }));
    fireEvent.change(screen.getByPlaceholderText('Nombre completo del proyecto...'), {
      target: { value: 'Proyecto manual' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Crear Proyecto/i }));

    await waitFor(() => expect(ProyectosAPI.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Proyecto manual' })));
    expect(ProyectosAPI.importFormulation).not.toHaveBeenCalled();
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
      expect(screen.getByText('Reportes de gestión del proyecto')).toBeInTheDocument();
      expect(screen.getByText('Acta de inicio y socialización I+D+i')).toBeInTheDocument();
      expect(screen.getByText('Ficha técnica de formulación I+D+i')).toBeInTheDocument();
      expect(screen.getByText('Reporte de seguimiento técnico y financiero')).toBeInTheDocument();
      expect(screen.getByText('Informe final de resultados de investigación')).toBeInTheDocument();
      expect(screen.getByText(/no reemplazan los formatos institucionales vigentes/i)).toBeInTheDocument();
    });

    const generateButtons = screen.getAllByRole('button', { name: /Generar/i });
    // Botón 1 corresponde al Acta de inicio y socialización I+D+i
    fireEvent.click(generateButtons[1]);

    expect(PDFGenerator.generateActaInicio).toHaveBeenCalledWith(expect.objectContaining({ id: 'p-1' }));
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

  it('creates a project through every form section and calculates the budget total', async () => {
    const onNotify = vi.fn();
    GruposAPI.list.mockResolvedValue([{ id: 'g-1', nombre: 'Grupo CGAO' }]);
    SemillerosAPI.list.mockResolvedValue([{ id: 's-1', nombre: 'AgroTech', sigla: 'AT' }]);
    RetosAPI.list.mockResolvedValue([{ id: 'r-1', titulo: 'Reto de riego', estado: 'abierto' }]);
    ConvocatoriasAPI.list.mockResolvedValue([{ id: 'c-1', nombre: 'SENNOVA', año: 2026, numero_oe: 'OE-1' }]);
    render(<ProyectosModule currentUser={mockUser} onNotify={onNotify} />);
    await waitFor(() => expect(ProyectosAPI.list).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Proyecto/i }));

    fireEvent.change(screen.getByPlaceholderText('Nombre completo del proyecto...'), { target: { value: 'Proyecto de riego' } });
    fireEvent.change(screen.getByLabelText('Nombre Corto / Acrónimo'), { target: { value: 'Riego IA' } });
    fireEvent.change(screen.getByLabelText('Código SGPS'), { target: { value: 'SGPS-42' } });
    fireEvent.change(screen.getByLabelText('Grupo de Investigación'), { target: { value: 'g-1' } });
    fireEvent.change(screen.getByLabelText('Semillero de Investigación Vinculado'), { target: { value: 's-1' } });
    fireEvent.change(screen.getByLabelText('Convocatoria SENNOVA'), { target: { value: 'c-1' } });
    fireEvent.click(screen.getByLabelText(/Continúa el siguiente año/));

    fireEvent.click(screen.getByRole('tab', { name: /Técnicos/i }));
    fireEvent.change(screen.getByLabelText('Reto de Origen (Opcional)'), { target: { value: 'r-1' } });
    fireEvent.change(screen.getByLabelText('Línea Programática'), { target: { value: '65' } });
    fireEvent.change(screen.getByLabelText('Línea de Investigación'), { target: { value: 'Agroindustria' } });
    fireEvent.change(screen.getByLabelText('Red de Conocimiento'), { target: { value: 'Agro' } });
    fireEvent.change(screen.getByLabelText('Objetivo General'), { target: { value: 'Optimizar el riego' } });
    fireEvent.change(screen.getByPlaceholderText(/Diseñar la arquitectura/), { target: { value: 'Diseñar sensores\nEvaluar resultados' } });
    fireEvent.change(screen.getByLabelText('Resumen Ejecutivo / Descripción'), { target: { value: 'Proyecto aplicado' } });

    fireEvent.click(screen.getByRole('tab', { name: /Finanzas/i }));
    const budgetInputs = screen.getAllByRole('spinbutton');
    ['100', '200', '300', '400', '500'].forEach((value, index) => {
      fireEvent.change(budgetInputs[index], { target: { value } });
    });
    expect(screen.getByText('$1.500')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Crear Proyecto/i }));

    await waitFor(() => expect(ProyectosAPI.create).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Proyecto de riego', nombre_corto: 'Riego IA', codigo_sgps: 'SGPS-42',
      grupo_id: 'g-1', semillero_id: 's-1', convocatoria_id: 'c-1', reto_origen_id: 'r-1',
      linea_programatica: '65', linea_investigacion: 'Agroindustria', red_conocimiento: 'Agro',
      objetivo_general: 'Optimizar el riego', objetivos_especificos: ['Diseñar sensores', 'Evaluar resultados'],
      descripcion: 'Proyecto aplicado', presupuesto_total: 1500, continua_siguiente_año: true
    })));
    expect(onNotify).toHaveBeenCalledWith('Proyecto creado con éxito.', 'success');
  });

  it('shows the project timeline, exports documents, generates formats and opens administrative checks', async () => {
    const onNotify = vi.fn();
    const project = {
      ...mockProyecto,
      presupuesto_detallado: { items: [
        { categoria: 'Talento Humano', valor: 100 }, { categoria: 'Materiales', valor: 200 },
        { categoria: 'Viáticos', valor: 300 }, { categoria: 'Servicios', valor: 400 }, { categoria: 'Equipos', valor: 500 }
      ] },
      entregables: [
        { id: 'e-1', nombre: 'Acta inicial', estado: 'aprobado', fecha_limite: '2026-01-01' },
        { id: 'e-2', nombre: 'Prototipo', estado: 'en_revision' }
      ]
    };
    ProyectosAPI.list.mockResolvedValue([project]);
    PlantillasAPI.generarCronograma.mockResolvedValue({});
    render(<ProyectosModule currentUser={mockUser} onNotify={onNotify} />);
    await waitFor(() => expect(screen.getByText('SENNOVA Core')).toBeInTheDocument());
    fireEvent.click(screen.getByText('SENNOVA Core'));

    const detail = await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('tab', { name: /Línea de Tiempo/i }));
    expect(screen.getByText('Acta inicial')).toBeInTheDocument();
    expect(screen.getByText('Prototipo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: /Resumen/i }));
    fireEvent.click(screen.getByText('Generar Cronograma'));
    await waitFor(() => expect(PlantillasAPI.generarCronograma).toHaveBeenCalledWith(project.id));
    fireEvent.click(screen.getByText('Ficha Técnica PDF'));
    await waitFor(() => expect(PDFGenerator.generateProjectPDF).toHaveBeenCalledWith(project, project.equipo));
    fireEvent.click(screen.getByText('Certificados del Equipo'));
    await waitFor(() => expect(PlantillasAPI.getCertificadosMasivos).toHaveBeenCalledWith(project.id));
    expect(onNotify).toHaveBeenCalledWith('No hay integrantes para certificar', 'warning');
    PlantillasAPI.getCertificadosMasivos.mockResolvedValueOnce([{ nombre: 'Jorge' }, { nombre: 'María' }]);
    fireEvent.click(screen.getByText('Certificados del Equipo'));
    await waitFor(() => expect(PDFGenerator.generateProjectCertificate).toHaveBeenCalledTimes(2));
    expect(onNotify).toHaveBeenCalledWith('Certificados generados exitosamente', 'success');

    fireEvent.click(screen.getByRole('tab', { name: /Formatos/i }));
    const formatButtons = screen.getAllByRole('button', { name: 'Generar' });
    fireEvent.click(formatButtons[1]);
    fireEvent.click(formatButtons[2]);
    fireEvent.click(formatButtons[3]);
    await waitFor(() => expect(PDFGenerator.generateActaInicio).toHaveBeenCalledWith(project));
    expect(PDFGenerator.generateSeguimiento).toHaveBeenCalledWith(project);
    expect(PDFGenerator.generateInformeFinal).toHaveBeenCalledWith(project);
    expect(screen.queryByText('Bitácora consolidada')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Requisitos Liquidación/i }));
    expect(await screen.findByText('Progreso de Requisitos Institucionales')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Requisitos Institucionales SENNOVA' })).getByText('Cerrar'));
    fireEvent.click(screen.getByRole('button', { name: /Diagnóstico Elaboración/i }));
    expect(await screen.findByText('Ampliar cronograma')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Diagnóstico de Elaboración SENNOVA' })).getByText('Cerrar Diagnóstico'));
    fireEvent.click(within(detail).getByText('Cerrar'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('abre el expediente documental del proyecto desde su pestaña', async () => {
    ProyectosAPI.getExpediente.mockResolvedValue({ proyecto_id: 'p-1', completo: false, porcentaje_completitud: 0, pendientes: ['Adjunte el acta de inicio.'], etapas: [] });
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);
    fireEvent.click(await screen.findByText('SENNOVA Core'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Expediente' }));
    expect(await screen.findByText('Adjunte el acta de inicio.')).toBeInTheDocument();
    expect(ProyectosAPI.getExpediente).toHaveBeenCalledWith('p-1');
  });

  it('refresca los datos confirmados sin cerrar el detalle ni su pestaña', async () => {
    ProyectosAPI.getExpediente.mockResolvedValue({ proyecto_id: 'p-1', completo: false, porcentaje_completitud: 0, pendientes: [], etapas: [] });
    const view = render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} refreshVersion={0} />);
    fireEvent.click(await screen.findByText('SENNOVA Core'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Expediente' }));
    await screen.findByRole('button', { name: 'Descargar expediente parcial (ZIP)' });
    ProyectosAPI.list.mockResolvedValue([{ ...mockProyecto, nombre: 'Proyecto actualizado' }]);
    view.rerender(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} refreshVersion={1} />);
    await waitFor(() => expect(ProyectosAPI.list).toHaveBeenCalledTimes(2));
    expect(screen.getByRole('dialog')).toHaveTextContent('Proyecto actualizado');
    expect(screen.getByRole('tab', { name: 'Expediente' })).toHaveAttribute('aria-selected', 'true');
  });

  it('formats currency values for chart labels', () => {
    expect(formatBudgetCurrency(1250000)).toBe('$1.250.000');
    expect(formatBudgetCurrency(0)).toBe('$0');
  });

  it('filters projects, links challenge drops and moves cards between workflow states', async () => {
    const project = { ...mockProyecto, año: 2026, estado: 'Aprobado', owner_id: mockUser.id };
    ProyectosAPI.list.mockResolvedValue([project]);
    RetosAPI.list.mockResolvedValue([
      { id: 'reto-1', titulo: 'Reto de riego', estado: 'abierto' },
      { id: 'reto-2', titulo: 'Reto cerrado', estado: 'resuelto' }
    ]);
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('SENNOVA Core')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Pool de Retos/i }));
    expect(screen.getByText('Reto de riego')).toBeInTheDocument();
    expect(screen.queryByText('Reto cerrado')).not.toBeInTheDocument();

    const dragTransfer = () => {
      const values = {};
      return {
        types: [], dropEffect: '', effectAllowed: '',
        setData(type, value) { values[type] = value; if (!this.types.includes(type)) this.types.push(type); },
        getData(type) { return values[type] || ''; }
      };
    };
    const retoTransfer = dragTransfer();
    fireEvent.dragStart(screen.getByText('Reto de riego').closest('[draggable="true"]'), { dataTransfer: retoTransfer });
    const card = screen.getByText('SENNOVA Core').closest('[tabindex="0"]');
    fireEvent.dragOver(card, { dataTransfer: retoTransfer });
    expect(screen.getByText('Soltar para vincular Reto')).toBeInTheDocument();
    fireEvent.dragLeave(card.parentElement);
    fireEvent.drop(card, { dataTransfer: retoTransfer });
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p-1', expect.objectContaining({ reto_origen_id: 'reto-1' })));

    const projectTransfer = dragTransfer();
    fireEvent.dragStart(card, { dataTransfer: projectTransfer });
    expect(projectTransfer.getData('projectId')).toBe('p-1');
    fireEvent.dragEnd(card, { dataTransfer: projectTransfer });
    fireEvent.drop(screen.getByLabelText('Columna En ejecución'), { dataTransfer: projectTransfer });
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p-1', { estado: 'En ejecución' }));

    const finalTransfer = dragTransfer();
    fireEvent.dragStart(screen.getByText('SENNOVA Core').closest('[tabindex="0"]'), { dataTransfer: finalTransfer });
    fireEvent.drop(screen.getByLabelText('Columna Finalizado'), { dataTransfer: finalTransfer });
    await waitFor(() => expect(ProyectosAPI.checkLiquidacion).toHaveBeenCalledWith('p-1'));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Requisitos Institucionales SENNOVA' })).getByLabelText('Cerrar ventana modal'));

    fireEvent.change(screen.getByLabelText('Buscar proyectos'), { target: { value: 'no existe' } });
    expect(screen.queryByText('SENNOVA Core')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar proyectos'), { target: { value: 'SENNOVA Core' } });
    fireEvent.change(screen.getByLabelText('Filtrar por estado'), { target: { value: 'En ejecución' } });
    fireEvent.click(screen.getByRole('tab', { name: /Todos/i }));
    fireEvent.click(screen.getByLabelText('Vista lista'));
    expect(screen.getByRole('row', { name: /SENNOVA Core/ })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Vista tablero'));
    expect(screen.getByLabelText('Columna En ejecución')).toBeInTheDocument();
  });

  it('supports project details, owner actions and list menus including delete confirmation', async () => {
    const onNotify = vi.fn();
    ProyectosAPI.list.mockResolvedValue([{ ...mockProyecto, owner_id: mockUser.id }]);
    SemillerosAPI.list.mockResolvedValue([{ id: 'sem-1', nombre: 'AgroTech', sigla: 'AT' }]);
    render(<ProyectosModule currentUser={mockUser} onNotify={onNotify} />);
    await waitFor(() => expect(screen.getByText('SENNOVA Core')).toBeInTheDocument());

    const projectCard = screen.getByText('SENNOVA Core').closest('[tabindex="0"]');
    fireEvent.keyDown(projectCard, { key: 'Enter' });
    const detail = await screen.findByRole('dialog');
    fireEvent.click(within(detail).getByLabelText('Cerrar panel'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Vista lista'));
    const projectRow = screen.getByRole('row', { name: /SENNOVA Core/ });
    fireEvent.click(within(projectRow).getByRole('button'));
    fireEvent.click(screen.getByText('Mover a Semillero'));
    expect(await screen.findByText('Mover Proyecto a Semillero')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Semillero de Destino'), { target: { value: 'sem-1' } });
    fireEvent.click(screen.getByText('Confirmar Traslado'));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p-1', { semillero_id: 'sem-1' }));
    await waitFor(() => expect(screen.queryByText('Mover Proyecto a Semillero')).not.toBeInTheDocument());

    fireEvent.click(within(projectRow).getByRole('button'));
    fireEvent.click(screen.getByText('Editar Proyecto'));
    const editDialog = await screen.findByRole('dialog', { name: 'Editar Proyecto' });
    fireEvent.change(within(editDialog).getByLabelText(/Nombre del Proyecto/), { target: { value: 'Proyecto actualizado' } });
    fireEvent.click(within(editDialog).getByText('Guardar Cambios'));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p-1', expect.objectContaining({ nombre: 'Proyecto actualizado' })));

    fireEvent.click(within(projectRow).getByRole('button'));
    fireEvent.click(screen.getByText('Eliminar Proyecto'));
    expect(screen.getByText('¿Eliminar Proyecto?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Proyecto', exact: true }));
    await waitFor(() => expect(ProyectosAPI.delete).toHaveBeenCalledWith('p-1'));
    expect(onNotify).toHaveBeenCalledWith('Proyecto eliminado correctamente', 'success');
  });

  it('handles initial project actions, finalization and removal from the team', async () => {
    const onActionHandled = vi.fn();
    const learner = { ...mockUser, rol: 'aprendiz' };
    const project = { ...mockProyecto, owner_id: mockUser.id };
    ProyectosAPI.checkLiquidacion.mockResolvedValueOnce({
      porcentaje_completitud: 100,
      can_liquidate: true,
      auto_finalizado: true,
      checklist: [{ id: 'docs', label: 'Documentos', status: true }]
    });
    render(<ProyectosModule currentUser={mockUser} initialAction={{ form: 'view', data: { id: project.id } }} onActionHandled={onActionHandled} onNotify={vi.fn()} />);
    await screen.findByRole('dialog');
    expect(onActionHandled).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /Requisitos Liquidación/i }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finalizar Proyecto' }));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith(project.id, { estado: 'Finalizado' }));

    cleanup();
    ProyectosAPI.list.mockResolvedValue([project]);
    ProyectosAPI.get.mockResolvedValue(project);
    render(<ProyectosModule currentUser={mockUser} initialAction={{ form: 'view', data: { id: 'p-from-api' } }} onActionHandled={onActionHandled} onNotify={vi.fn()} />);
    await waitFor(() => expect(ProyectosAPI.get).toHaveBeenCalledWith('p-from-api'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());

    cleanup();
    ProyectosAPI.get.mockRejectedValueOnce(new Error('no encontrado'));
    render(<ProyectosModule currentUser={mockUser} initialAction={{ form: 'view', data: { id: 'p-missing' } }} onActionHandled={onActionHandled} onNotify={vi.fn()} />);
    await waitFor(() => expect(ProyectosAPI.get).toHaveBeenCalledWith('p-missing'));

    cleanup();
    render(<ProyectosModule currentUser={mockUser} initialAction={{ form: 'create', data: { nombre: 'Proyecto inicial' } }} onActionHandled={onActionHandled} onNotify={vi.fn()} />);
    expect(await screen.findByPlaceholderText('Nombre completo del proyecto...')).toHaveValue('Proyecto inicial');
    expect(onActionHandled).toHaveBeenCalled();

    cleanup();
    ProyectosAPI.list.mockResolvedValue([project]);
    ProyectosAPI.get.mockResolvedValue({ ...project, equipo: [] });
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('SENNOVA Core')).toBeInTheDocument());
    fireEvent.click(screen.getByText('SENNOVA Core'));
    fireEvent.click(screen.getByRole('tab', { name: /Equipo/i }));
    fireEvent.click(screen.getByLabelText('Desvincular a Investigador Principal'));
    fireEvent.click(screen.getByRole('alertdialog').querySelector('button:last-child'));
    await waitFor(() => expect(ProyectosAPI.removeEquipo).toHaveBeenCalledWith('p-1', 'user-2'));
  });

  it('runs every owner action from the project card menu and closes overlays from outside', async () => {
    ProyectosAPI.list.mockResolvedValue([{ ...mockProyecto, owner_id: mockUser.id }]);
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('SENNOVA Core')).toBeInTheDocument());

    const menuButton = screen.getByLabelText('Opciones del proyecto');
    fireEvent.click(menuButton);
    fireEvent.click(screen.getByText('Diagnóstico Elaboración'));
    const diagnostic = await screen.findByRole('dialog', { name: 'Diagnóstico de Elaboración SENNOVA' });
    fireEvent.click(within(diagnostic).getByLabelText('Cerrar ventana modal'));

    fireEvent.click(screen.getByLabelText('Opciones del proyecto'));
    fireEvent.click(screen.getByText('Requisitos Liquidación'));
    const liquidation = await screen.findByRole('dialog', { name: 'Requisitos Institucionales SENNOVA' });
    fireEvent.click(within(liquidation).getByLabelText('Cerrar ventana modal'));

    fireEvent.click(screen.getByLabelText('Opciones del proyecto'));
    fireEvent.click(screen.getByText('Mover a Semillero'));
    fireEvent.click(await screen.findByText('Cancelar'));

    fireEvent.click(screen.getByLabelText('Opciones del proyecto'));
    fireEvent.click(screen.getByText('Editar Proyecto'));
    expect(await screen.findByRole('dialog', { name: 'Editar Proyecto' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancelar'));

    fireEvent.click(screen.getByLabelText('Opciones del proyecto'));
    fireEvent.click(screen.getByText('Eliminar Proyecto'));
    const confirm = await screen.findByRole('dialog', { name: '¿Eliminar Proyecto?' });
    fireEvent.click(within(confirm).getByText('Cancelar'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '¿Eliminar Proyecto?' })).not.toBeInTheDocument());

    fireEvent.click(screen.getByLabelText('Opciones del proyecto'));
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByText('Acciones del Proyecto')).not.toBeInTheDocument());
  });

  it('opens details from the list and applies a semillero move to the selected project', async () => {
    const project = { ...mockProyecto, owner_id: mockUser.id };
    ProyectosAPI.list.mockResolvedValue([project]);
    ProyectosAPI.update.mockResolvedValue({ ...project, semillero_id: 'sem-1', semillero_nombre: 'AgroTech' });
    SemillerosAPI.list.mockResolvedValue([{ id: 'sem-1', nombre: 'AgroTech' }]);
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('SENNOVA Core')).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText('Vista lista'));
    fireEvent.click(screen.getByRole('row', { name: /SENNOVA Core/ }));

    const detail = await screen.findByRole('dialog', { name: 'Plataforma SENNOVA 2026' });
    fireEvent.click(within(detail).getByText('Cambiar / Mover Semillero'));
    fireEvent.change(screen.getByLabelText('Semillero de Destino'), { target: { value: 'sem-1' } });
    fireEvent.click(screen.getByText('Confirmar Traslado'));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p-1', { semillero_id: 'sem-1' }));
    await waitFor(() => expect(screen.queryByText('Mover Proyecto a Semillero')).not.toBeInTheDocument());
    expect(screen.getByText('AgroTech')).toBeInTheDocument();

    fireEvent.click(within(detail).getByLabelText('Cerrar panel'));
    fireEvent.click(screen.getByRole('row', { name: /SENNOVA Core/ }).querySelector('button'));
    fireEvent.click(screen.getByText('Liquidación Técnica SENNOVA'));
    const liquidation = await screen.findByRole('dialog', { name: 'Requisitos Institucionales SENNOVA' });
    fireEvent.click(within(liquidation).getByLabelText('Cerrar ventana modal'));
  });

  it('opens liquidation requirements when saving a project reports a closure prerequisite', async () => {
    ProyectosAPI.list.mockResolvedValue([{ ...mockProyecto, owner_id: mockUser.id }]);
    ProyectosAPI.update.mockRejectedValueOnce(new Error('Debe completar el cierre técnico antes de finalizar el proyecto'));
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('SENNOVA Core')).toBeInTheDocument());
    fireEvent.click(screen.getByText('SENNOVA Core'));
    fireEvent.click(await screen.findByRole('button', { name: /Editar Proyecto/i }));
    const editDialog = await screen.findByRole('dialog', { name: 'Editar Proyecto' });
    fireEvent.click(within(editDialog).getByText('Guardar Cambios'));
    const liquidation = await screen.findByRole('dialog', { name: 'Requisitos Institucionales SENNOVA' });
    expect(ProyectosAPI.checkLiquidacion).toHaveBeenCalledWith('p-1');
    fireEvent.click(within(liquidation).getByLabelText('Cerrar ventana modal'));
  });

  it('permite abrir y explorar la pestaña de Metodología Guiada con descargas directas', async () => {
    ProyectosAPI.list.mockResolvedValue([mockProyecto]);
    render(<ProyectosModule currentUser={mockUser} onNotify={vi.fn()} />);
    await waitFor(() => expect(screen.getByText('SENNOVA Core')).toBeInTheDocument());
    fireEvent.click(screen.getByText('SENNOVA Core'));

    const detail = await screen.findByRole('dialog');
    const guiaTab = within(detail).getByRole('tab', { name: /Metodología Guiada/i });
    expect(guiaTab).toBeInTheDocument();
    fireEvent.click(guiaTab);

    expect(await within(detail).findByText('Guía Metodológica para la Construcción del Proyecto')).toBeInTheDocument();
    expect(within(detail).getByText(/Estructure paso a paso su propuesta de investigación aplicada/i)).toBeInTheDocument();

    const pdfFichaBtn = within(detail).getByRole('button', { name: /Ficha Técnica \(PDF\)/i });
    fireEvent.click(pdfFichaBtn);
    expect(PDFGenerator.generateProjectPDF).toHaveBeenCalledWith(expect.objectContaining({ id: 'p-1' }), expect.any(Array));

    const pdfActaBtn = within(detail).getByRole('button', { name: /Acta de Inicio \(PDF\)/i });
    fireEvent.click(pdfActaBtn);
    expect(PDFGenerator.generateActaInicio).toHaveBeenCalledWith(expect.objectContaining({ id: 'p-1' }));
  });
});
