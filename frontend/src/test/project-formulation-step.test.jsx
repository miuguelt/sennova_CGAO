import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ProjectFormulationStep from '../components/projects/ProjectFormulationStep';

describe('ProjectFormulationStep', () => {
  const mockFields = [
    {
      key: 'objetivo_general',
      label: 'Objetivo General',
      type: 'textarea',
      required: true,
      placeholder: 'Defina el objetivo general...',
      help: 'Describe el resultado principal que busca el proyecto.',
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
    vi.useRealTimers();
  });

  it('prioriza la escritura y permite consultar la ayuda sin perder lo escrito', () => {
    render(<ProjectFormulationStep {...defaultProps} />);
    const field = screen.getByLabelText(/Objetivo General/i);
    expect(field).toHaveAttribute('rows', '8');
    expect(screen.queryByText('Orientación para la formulación')).not.toBeInTheDocument();
    const help = screen.getByRole('button', { name: /Mostrar guía y ejemplos/i });
    expect(help).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(help);
    expect(screen.getByText('Orientación para la formulación')).toBeVisible();
    expect(field).toHaveValue(mockDraftValues.objetivo_general);
    fireEvent.click(screen.getByRole('button', { name: 'Volver al formulario' }));
    expect(screen.queryByText('Orientación para la formulación')).not.toBeInTheDocument();
    expect(field).toHaveValue(mockDraftValues.objetivo_general);
  });

  it('presenta la orientación metodológica en una ventana junto al formulario conservado', () => {
    render(<ProjectFormulationStep {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Mostrar guía y ejemplos/i }));

    // Columna de formulario
    expect(screen.getByLabelText(/Objetivo General/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /Justificación/i })).toBeInTheDocument();

    // Columna de orientación
    expect(screen.getByText('Orientación para la formulación')).toBeInTheDocument();
    expect(screen.getByText(/Esta orientación local no define requisitos institucionales/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /¿Qué agregar\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revisión personal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Ejemplo$/i })).toBeInTheDocument();
  });

  it('presenta los campos en bloques que explican qué se construye en cada parte', () => {
    const step = {
      ...mockStep,
      bloques: [
        { id: 'contexto', titulo: 'Introducción y contexto', descripcion: 'Ubica la necesidad y el lugar donde ocurre.', campos: ['objetivo_general'] },
        { id: 'necesidad', titulo: 'Problema y justificación', descripcion: 'Delimita qué situación se atenderá.', campos: ['justificacion'] },
      ],
    };

    render(<ProjectFormulationStep {...defaultProps} step={step} />);

    expect(screen.getByRole('heading', { name: 'Introducción y contexto' })).toBeInTheDocument();
    expect(screen.getByText('Ubica la necesidad y el lugar donde ocurre.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Objetivo General/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /^Justificación$/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '2. Problema y justificación' }));
    expect(screen.getByRole('heading', { name: 'Problema y justificación' })).toBeInTheDocument();
    expect(screen.getByText('Delimita qué situación se atenderá.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^Justificación$/i })).toBeInTheDocument();
  });

  it('organiza los datos de formación y convocatoria como información opcional', () => {
    const trainingFields = [
      ['nivel_formacion', 'Nivel de formación', 'text'],
      ['programa_formacion', 'Programa de formación', 'text'],
      ['competencia', 'Competencia', 'textarea'],
      ['resultados_aprendizaje', 'Resultados de aprendizaje', 'textarea'],
      ['fase_proyecto_formativo', 'Fase del proyecto formativo', 'text'],
      ['categoria_proyecto', 'Categoría del proyecto', 'text'],
      ['area_investigacion', 'Área de investigación', 'text'],
    ].map(([key, label, type]) => ({ key, label, type, required: false, help: 'Completa este dato solo cuando aplique.' }));
    const step = {
      ...mockStep,
      id: 'institucional',
      fuente: 'comunes',
      campos: trainingFields.map(field => field.key),
      bloques: [{
        id: 'formacion-convocatoria',
        titulo: 'Datos de formación y convocatoria (cuando apliquen)',
        descripcion: 'Completa estos datos si el proyecto o la convocatoria los solicita.',
        campos: trainingFields.map(field => field.key),
      }],
    };

    render(<ProjectFormulationStep {...defaultProps} step={step} commonFields={trainingFields} commonValues={{}} />);

    expect(screen.getByRole('heading', { name: 'Datos de formación y convocatoria (cuando apliquen)' })).toBeInTheDocument();
    trainingFields.forEach(field => {
      const input = screen.getByLabelText(field.label);
      expect(input).toBeInTheDocument();
      expect(input).not.toBeRequired();
    });
    expect(screen.getByText('Completa estos datos si el proyecto o la convocatoria los solicita.')).toBeInTheDocument();
  });

  it('mantiene accesibles los campos nuevos de una etapa aunque aún no estén agrupados', () => {
    const step = { ...mockStep, bloques: [{ id: 'general', titulo: 'Propósito', campos: ['objetivo_general'] }] };
    render(<ProjectFormulationStep {...defaultProps} step={step} />);
    fireEvent.click(screen.getByRole('button', { name: '2. Otros datos de esta etapa' }));
    expect(screen.getByLabelText('Justificación')).toHaveValue(mockDraftValues.justificacion);
    fireEvent.change(screen.getByLabelText('Justificación'), { target: { value: 'Justificación completa' } });
    expect(defaultProps.onDraftChange).toHaveBeenCalledWith('justificacion', 'Justificación completa');
  });

  it('mantiene los datos personales de autoría opcionales y cerrados por defecto', () => {
    const teamField = {
      key: 'equipo',
      label: 'Personal vinculado',
      type: 'rows',
      required: false,
      help: 'Relaciona integrantes y responsabilidades.',
      details_label: 'Datos de autoría y contacto (si el formato los solicita)',
      details_help: 'Usa esta sección solo si el formato exige esos datos y tienes autorización.',
      columns: [
        { key: 'nombre', label: 'Nombre', type: 'text', required: true, help: 'Nombre del integrante.' },
        { key: 'rol', label: 'Rol', type: 'text', required: true, help: 'Rol acordado.' },
        { key: 'identificacion', label: 'Documento de identidad', type: 'text', required: false, optional_detail: true, help: 'Solo si el formato vigente lo pide y hay autorización.' },
        { key: 'correo_contacto', label: 'Correo de contacto', type: 'text', required: false, optional_detail: true, help: 'Solo si el formato vigente lo pide y hay autorización.' },
        { key: 'telefono_contacto', label: 'Teléfono de contacto', type: 'text', required: false, optional_detail: true, help: 'Solo si el formato vigente lo pide y hay autorización.' },
      ],
    };
    const step = {
      ...mockStep,
      id: 'institucional',
      fuente: 'comunes',
      campos: ['equipo'],
      bloques: [{ id: 'equipo', titulo: 'Personas y responsabilidades', descripcion: 'Registra roles y actividades.', campos: ['equipo'] }],
    };

    render(<ProjectFormulationStep {...defaultProps} step={step} commonFields={[teamField]} commonValues={{ equipo: [{}] }} />);

    fireEvent.click(screen.getByRole('button', { name: 'Editar registro 1 de Personal vinculado' }));
    const details = screen.getByText('Datos de autoría y contacto (si el formato los solicita)').closest('details');
    expect(details).not.toHaveAttribute('open');
    expect(screen.getByLabelText(/Documento de identidad/i)).not.toBeVisible();
    fireEvent.click(screen.getByText('Datos de autoría y contacto (si el formato los solicita)'));
    expect(screen.getByLabelText(/Documento de identidad/i)).toBeInTheDocument();
    expect(screen.getByText('Usa esta sección solo si el formato exige esos datos y tienes autorización.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Documento de identidad/i)).not.toBeRequired();
    expect(screen.getByLabelText(/Correo de contacto/i)).not.toBeRequired();
    expect(screen.getByLabelText(/Teléfono de contacto/i)).not.toBeRequired();
    fireEvent.change(screen.getByLabelText(/Documento de identidad/i), { target: { value: 'ID-DE-PRUEBA' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar al formulario' }));
    expect(defaultProps.onCommonChange).toHaveBeenCalledWith('equipo', [{ identificacion: 'ID-DE-PRUEBA' }]);
  });

  it('muestra la sección del ejemplo CAP-14 que orienta el paso y aclara su alcance', () => {
    render(<ProjectFormulationStep {...defaultProps} step={{ ...mockStep, id: 'problema' }} />);
    fireEvent.click(screen.getByRole('button', { name: /Mostrar guía y ejemplos/i }));

    expect(screen.getByText(/Correspondencia con el proyecto de ejemplo CAP-14/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Introducción, 3\. Planteamiento del problema, 4\. Justificación/i)).toBeInTheDocument();
    expect(screen.getByText(/sirve como referencia de organización y no reemplaza el formato vigente/i)).toBeInTheDocument();
  });

  it('permite alternar entre las pestañas del tutor metodológico', () => {
    render(<ProjectFormulationStep {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Mostrar guía y ejemplos/i }));

    // Pestaña inicial: orientación
    expect(screen.getByText(/Consulta qué información puedes desarrollar/i)).toBeInTheDocument();

    // Cambiar a Revisión personal
    fireEvent.click(screen.getByRole('button', { name: /Revisión personal/i }));
    expect(screen.getByText(/Aspectos que has revisado/i)).toBeInTheDocument();

    // Cambiar a Ejemplo
    fireEvent.click(screen.getByRole('button', { name: /^Ejemplo$/i }));
    expect(screen.getByRole('button', { name: /Copiar/i })).toBeInTheDocument();

    // Volver a orientación
    fireEvent.click(screen.getByRole('button', { name: /¿Qué agregar\?/i }));
    expect(screen.getByText(/Consulta qué información puedes desarrollar en cada campo/i)).toBeInTheDocument();
  });

  it('permite marcar y desmarcar criterios en la checklist interactiva actualizando el progreso', () => {
    render(<ProjectFormulationStep {...defaultProps} step={{ ...mockStep, id: 'problema' }} />);
    fireEvent.click(screen.getByRole('button', { name: /Mostrar guía y ejemplos/i }));

    fireEvent.click(screen.getByRole('button', { name: /Revisión personal/i }));

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);

    // Marcar primer ítem
    expect(checkboxes[0].checked).toBe(false);
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0].checked).toBe(true);

    // Verificar porcentaje del 33% y texto del tab
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Revisión personal \(1\/3\)/i })).toBeInTheDocument();

    // Desmarcar ítem
    fireEvent.click(checkboxes[0]);
    expect(checkboxes[0].checked).toBe(false);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('copia el ejemplo, informa el resultado y restablece el botón después de dos segundos', async () => {
    vi.useFakeTimers();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<ProjectFormulationStep {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Mostrar guía y ejemplos/i }));

    fireEvent.click(screen.getByRole('button', { name: /^Ejemplo$/i }));
    const copyButton = screen.getByRole('button', { name: /Copiar/i });
    await act(async () => fireEvent.click(copyButton));

    expect(writeTextMock).toHaveBeenCalledWith(expect.any(String));
    expect(defaultProps.onNotify).toHaveBeenCalledWith('Estructura modelo copiada al portapapeles', 'success');
    expect(screen.getByRole('button', { name: /¡Copiado!/i })).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: /Copiar/i })).toBeInTheDocument();
  });

  it('muestra alerta didáctica cuando el objetivo general no inicia con verbo en infinitivo', () => {
    render(
      <ProjectFormulationStep
        {...defaultProps}
        step={{ ...mockStep, id: 'objetivos' }}
        draftValues={{
          ...mockDraftValues,
          objetivo_general: 'El proyecto pretende desarrollar una solución',
        }}
      />
    );

    expect(
      screen.getByText(/Sugerencia de redacción: Considera expresar el objetivo con un verbo de acción y un resultado verificable/i)
    ).toBeInTheDocument();
  });

  it('acepta tres objetivos específicos y evalúa cada línea para mostrar la orientación correcta', () => {
    render(
      <ProjectFormulationStep
        {...defaultProps}
        step={{ ...mockStep, id: 'objetivos' }}
        draftValues={{
          ...mockDraftValues,
          objetivos_especificos: 'Identificar las necesidades del proceso\nDiseñar una solución tecnológica\nValidar la solución con los usuarios'
        }}
      />
    );

    expect(screen.queryByText(/ajusta su número al alcance del proyecto/i)).not.toBeInTheDocument();
  });

  it('orienta sobre la secuencia de objetivos sin imponer una cantidad fija', () => {
    render(
      <ProjectFormulationStep
        {...defaultProps}
        step={{ ...mockStep, id: 'objetivos' }}
        draftValues={{ ...mockDraftValues, objetivos_especificos: 'Identificar las necesidades del proceso' }}
      />
    );

    expect(screen.getByText(/Confirma que los objetivos específicos cubran los resultados parciales necesarios/i)).toBeInTheDocument();
    expect(screen.queryByText(/al menos 3|exactamente 3/i)).not.toBeInTheDocument();
  });

  it('dirige a la generación de borradores y no ofrece descargas rápidas con datos predeterminados', () => {
    render(<ProjectFormulationStep {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /Mostrar guía y ejemplos/i }));

    expect(screen.getByText(/Genera los borradores desde la sección de revisión/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Descargar PDF/i })).not.toBeInTheDocument();
    expect(screen.queryByText('SGPS-CGAO')).not.toBeInTheDocument();
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
