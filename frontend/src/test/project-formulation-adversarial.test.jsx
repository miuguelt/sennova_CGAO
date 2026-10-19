import React, { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectFormulationWizard from '../components/projects/ProjectFormulationWizard';
import ProjectFormulationStepper from '../components/projects/ProjectFormulationStepper';
import ProjectFormulationStep from '../components/projects/ProjectFormulationStep';
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
  campos_comunes: [{ key: 'centro', label: 'Centro de formación', type: 'text', tipo: 'texto', help: 'Centro SENA' }],
  documentos: [
    {
      clave: 'formulacion_proyecto',
      tipo: 'formulacion_proyecto',
      titulo: 'Formulación del proyecto',
      generable: true,
      campos: [
        { key: 'introduccion', label: 'Introducción', type: 'textarea', tipo: 'texto_largo', help: 'Contexto e introducción' },
        { key: 'contexto', label: 'Contexto', type: 'textarea', tipo: 'texto_largo', help: 'Contexto regional' },
        { key: 'planteamiento_problema', label: 'Planteamiento del problema', type: 'textarea', tipo: 'texto_largo', help: 'Descripción de la problemática' },
        { key: 'justificacion', label: 'Justificación', type: 'textarea', tipo: 'texto_largo', help: 'Justificación del proyecto' },
      ],
      historial: [{ documento_id: 'doc-v1', version: 1, nombre_archivo: 'formulacion_v1.docx', estado: 'borrador', vigente: true, disponible: true }],
    },
    { clave: 'presentacion_proyecto', tipo: 'presentacion_proyecto', titulo: 'Presentación del proyecto', generable: true, campos: [], historial: [] },
  ],
  ruta_formulacion: {
    pasos: [
      { id: 'identificacion', numero: 1, titulo: 'Identificación del proyecto', fuente: 'proyecto', campos: ['nombre', 'vigencia', 'presupuesto_total'], proposito: 'Registre los datos de referencia.', completo: false, faltantes: ['Complete el título.'], advertencias: ['Alerta sobre fechas'] },
      { id: 'institucional', numero: 2, titulo: 'Datos institucionales y equipo', fuente: 'comunes', campos: ['centro', 'equipo'], proposito: 'Ubique la institución.', completo: true, faltantes: [], advertencias: [], bloques: [{ id: 'institucion', titulo: 'Centro y periodo', descripcion: 'Datos del proyecto.', campos: ['centro'] }, { id: 'equipo', titulo: 'Personas y responsabilidades', descripcion: 'Equipo del proyecto.', campos: ['equipo'] }] },
      { id: 'problema', numero: 3, titulo: 'Introducción, problema y justificación', fuente: 'formulacion', campos: ['introduccion', 'contexto', 'planteamiento_problema', 'justificacion'], proposito: 'Describa la necesidad.', completo: false, faltantes: [], advertencias: [], bloques: [{ id: 'contexto', titulo: 'Introducción y contexto', descripcion: 'Ubique la necesidad.', campos: ['introduccion', 'contexto'] }, { id: 'necesidad', titulo: 'Problema y justificación', descripcion: 'Delimite el problema.', campos: ['planteamiento_problema', 'justificacion'] }] },
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
      { key: 'nombre', label: 'Título del proyecto', type: 'text', tipo: 'texto', help: 'Nombre oficial' },
      { key: 'objetivo_general', label: 'Objetivo general', type: 'textarea', tipo: 'texto_largo', help: 'Objetivo del proyecto' },
      { key: 'objetivos_especificos', label: 'Objetivos específicos', type: 'textarea', tipo: 'texto_largo', help: 'Resultados parciales' },
      { key: 'vigencia', label: 'Duración en meses', type: 'number', tipo: 'number', min: 1, max: 60, help: 'Duración confirmada' },
      { key: 'presupuesto_total', label: 'Presupuesto total', type: 'number', tipo: 'number', min: 0, help: 'Valor confirmado' },
    ],
    valores_proyecto: { nombre: 'Cultivo de algas', objetivo_general: '', vigencia: 12, presupuesto_total: 50000000 },
    documento_clave: 'formulacion_proyecto',
  },
};

describe('Verificación adversarial y de estrés: Formulación de Proyectos CGAO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Suite 1: Estrés y alternancia rápida en ProjectFormulationStepper', () => {
    it('maneja clics sucesivos rápidos entre múltiples etapas sin desincronizar el paso activo ni duplicar aria-current', () => {
      render(
        <ProjectFormulationWizard
          projectId="p-1"
          record={mockRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={false}
        />
      );

      const stepsSequence = [
        { label: /4.*objetivos/i, expectedText: 'Objetivos del proyecto' },
        { label: /2.*institucional/i, expectedText: 'Datos institucionales y equipo' },
        { label: /7.*resultados/i, expectedText: 'Resultados e impactos esperados' },
        { label: /10.*revisar/i, expectedText: 'Revisar y generar documentos' },
        { label: /3.*problema/i, expectedText: 'Introducción, problema y justificación' },
        { label: /1.*identificación/i, expectedText: 'Identificación del proyecto' },
      ];

      for (const target of stepsSequence) {
        const btn = screen.getByRole('button', { name: target.label });
        fireEvent.click(btn);
        expect(btn).toHaveAttribute('aria-current', 'step');
        expect(screen.getByText(target.expectedText)).toBeInTheDocument();
      }

      // Verificar que solo un botón en todo el Stepper tiene aria-current="step"
      const currentSteps = screen.getAllByRole('button').filter(b => b.getAttribute('aria-current') === 'step');
      expect(currentSteps).toHaveLength(1);
      expect(currentSteps[0]).toHaveAttribute('aria-label', expect.stringMatching(/1.*identificación/i));
    });

    it('cierra diálogos y modales abiertos al cambiar de etapa a través del Stepper', () => {
      render(
        <ProjectFormulationWizard
          projectId="p-1"
          record={mockRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={false}
        />
      );

      // Abrir modal de carga de Word
      fireEvent.click(screen.getByRole('button', { name: /Cargar formato/i }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Cargar formato Word')).toBeInTheDocument();

      // Saltar a la etapa 6 (Metodología) en el Stepper
      const step6Btn = screen.getByRole('button', { name: /6.*metodología/i });
      fireEvent.click(step6Btn);

      // El diálogo modal debe haberse cerrado automáticamente
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.getByText('Metodología')).toBeInTheDocument();
      expect(step6Btn).toHaveAttribute('aria-current', 'step');
    });

    it('resiste casos borde: colecciones vacías, pasos sin número y callbacks no definidos en Stepper aislado', () => {
      const { rerender, container } = render(<ProjectFormulationStepper steps={[]} activeStepId="identificacion" />);
      expect(container.firstChild).toBeNull();

      rerender(<ProjectFormulationStepper steps={null} activeStepId="identificacion" />);
      expect(container.firstChild).toBeNull();

      // Pasos sin 'numero' explícito y sin 'onSelectStep' callback
      const customSteps = [
        { id: 'paso_personalizado_a', titulo: 'Etapa Custom A' },
        { id: 'paso_personalizado_b', titulo: 'Etapa Custom B', completo: true },
      ];
      rerender(<ProjectFormulationStepper steps={customSteps} activeStepId="paso_personalizado_a" />);

      const nav = screen.getByRole('navigation', { name: 'Etapas de formulación' });
      expect(nav).toBeInTheDocument();

      const btnA = screen.getByRole('button', { name: /Paso 1: Etapa Custom A/i });
      const btnB = screen.getByRole('button', { name: /Paso 2: Etapa Custom B/i });

      expect(btnA).toHaveAttribute('aria-current', 'step');
      expect(btnB).not.toHaveAttribute('aria-current');

      // Clic sin onSelectStep no debe lanzar error
      expect(() => fireEvent.click(btnB)).not.toThrow();
    });
  });

  describe('Suite 2: Preservación de estado sucio (projectDirty) y saltos no destructivos', () => {
    it('mantiene las modificaciones sin guardar y el badge de advertencia tras alternar entre múltiples etapas', () => {
      const dirtyCallback = vi.fn();
      render(
        <ProjectFormulationWizard
          projectId="p-1"
          record={mockRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={false}
          onIdentificationDirtyChange={dirtyCallback}
        />
      );

      // Modificar el campo en la etapa 1
      const inputTitulo = screen.getByLabelText(/Título del proyecto/i);
      fireEvent.change(inputTitulo, { target: { value: 'Biotecnología Agropecuaria CGAO' } });

      expect(dirtyCallback).toHaveBeenCalledWith(true);
      expect(document.querySelector('.formulation-save-badge')).toHaveTextContent('Cambios pendientes por guardar');

      // Saltar a etapa 4 (Objetivos) y luego a etapa 8 (Recursos)
      fireEvent.click(screen.getByRole('button', { name: /4.*objetivos/i }));
      expect(screen.getByText('Objetivos del proyecto')).toBeInTheDocument();
      expect(document.querySelector('.formulation-save-badge')).toHaveTextContent('Cambios pendientes por guardar');

      fireEvent.click(screen.getByRole('button', { name: /8.*presupuesto/i }));
      expect(screen.getByText('Presupuesto y cronograma')).toBeInTheDocument();
      expect(document.querySelector('.formulation-save-badge')).toHaveTextContent('Cambios pendientes por guardar');

      // Regresar a etapa 1 (Identificación)
      fireEvent.click(screen.getByRole('button', { name: /1.*identificación/i }));
      expect(screen.getByLabelText(/Título del proyecto/i)).toHaveValue('Biotecnología Agropecuaria CGAO');
      expect(document.querySelector('.formulation-save-badge')).toHaveTextContent('Cambios pendientes por guardar');
    });

    it('protege los cambios locales sucios contra sobrescrituras remotas de valores_proyecto', () => {
      const { rerender } = render(
        <ProjectFormulationWizard
          projectId="p-1"
          record={mockRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={false}
        />
      );

      // Usuario escribe localmente
      fireEvent.change(screen.getByLabelText(/Título del proyecto/i), { target: { value: 'Edición local crítica' } });

      // Simular actualización del registro desde el servidor (prop update)
      const updatedRecord = structuredClone(mockRecord);
      updatedRecord.ruta_formulacion.valores_proyecto = { nombre: 'Nombre nuevo del servidor que NO debe pisar' };

      rerender(
        <ProjectFormulationWizard
          projectId="p-1"
          record={updatedRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={false}
        />
      );

      // La edición local debe permanecer intacta gracias a projectDirtyRef
      expect(screen.getByLabelText(/Título del proyecto/i)).toHaveValue('Edición local crítica');
      expect(document.querySelector('.formulation-save-badge')).toHaveTextContent('Cambios pendientes por guardar');
    });

    it('el ref imperativo permite consultar hasUnsavedChanges y ejecutar discardPending restaurando la pureza', async () => {
      const wizardRef = createRef();
      const dirtyCallback = vi.fn();
      render(
        <ProjectFormulationWizard
          ref={wizardRef}
          projectId="p-1"
          record={mockRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={false}
          onIdentificationDirtyChange={dirtyCallback}
        />
      );

      expect(wizardRef.current.hasUnsavedChanges()).toBe(false);

      // Provocar cambio sucio
      fireEvent.change(screen.getByLabelText(/Título del proyecto/i), { target: { value: 'Texto transitorio' } });
      expect(wizardRef.current.hasUnsavedChanges()).toBe(true);
      expect(document.querySelector('.formulation-save-badge')).toHaveTextContent('Cambios pendientes por guardar');

      // Descartar cambios mediante ref
      await act(async () => {
        wizardRef.current.discardPending();
      });

      await waitFor(() => {
        expect(wizardRef.current.hasUnsavedChanges()).toBe(false);
      });
      expect(screen.getByLabelText(/Título del proyecto/i)).toHaveValue('Cultivo de algas');
      expect(document.querySelector('.formulation-save-badge')).toHaveTextContent('Borrador guardado');
    });
  });

  describe('Suite 3: Valores numéricos extremos, presupuestos límite y vigencias', () => {
    it('alerta preventivamente ante presupuesto cero ($0 COP) y lo formatea correctamente', () => {
      render(
        <ProjectFormulationWizard
          projectId="p-1"
          record={mockRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={false}
        />
      );

      fireEvent.change(screen.getByLabelText(/Presupuesto total/i), { target: { value: '0' } });

      expect(
        screen.getByText(/Orientación SENNOVA: Registra el presupuesto estimado del proyecto en pesos colombianos \(COP\)/i)
      ).toBeInTheDocument();

      // Debe formatear moneda es-CO sin arrojar error
      expect(screen.getByText(/\$\s*0/)).toBeInTheDocument();
    });

    it('alerta preventivamente ante presupuesto negativo (-$50.000.000 COP)', () => {
      render(
        <ProjectFormulationWizard
          projectId="p-1"
          record={mockRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={false}
        />
      );

      fireEvent.change(screen.getByLabelText(/Presupuesto total/i), { target: { value: '-50000000' } });

      expect(
        screen.getByText(/Orientación SENNOVA: Registra el presupuesto estimado del proyecto en pesos colombianos \(COP\)/i)
      ).toBeInTheDocument();

      expect(screen.getByText(/-.*50\.000\.000/)).toBeInTheDocument();
    });

    it('maneja presupuestos astronómicos ($999.999.999.999 COP) sin NaN ni excepciones de renderizado', () => {
      render(
        <ProjectFormulationWizard
          projectId="p-1"
          record={mockRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={false}
        />
      );

      fireEvent.change(screen.getByLabelText(/Presupuesto total/i), { target: { value: '999999999999' } });

      // No debe emitir advertencia de presupuesto <= 0
      expect(
        screen.queryByText(/Orientación SENNOVA: Registra el presupuesto estimado del proyecto en pesos colombianos/i)
      ).not.toBeInTheDocument();

      // Debe formatear el valor astronómico
      expect(screen.getByText(/999\.999\.999\.999/)).toBeInTheDocument();
    });

    it('evalúa con precisión los umbrales de vigencia (12 meses vs >12 meses vs <=0)', () => {
      render(
        <ProjectFormulationWizard
          projectId="p-1"
          record={mockRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={false}
        />
      );

      const inputVigencia = screen.getByLabelText(/Duración en meses/i);

      // Vigencia exacta de 12 meses: no debe alertar sobrepasar anualidad
      fireEvent.change(inputVigencia, { target: { value: '12' } });
      expect(screen.queryByText(/Las convocatorias SENNOVA CGAO suelen contemplar vigencias de hasta 12 meses/i)).not.toBeInTheDocument();

      // Vigencia de 13 meses: debe disparar alerta preventiva
      fireEvent.change(inputVigencia, { target: { value: '13' } });
      expect(screen.getByText(/Las convocatorias SENNOVA CGAO suelen contemplar vigencias de hasta 12 meses/i)).toBeInTheDocument();

      // Vigencia de 36 meses: debe mantener la alerta preventiva
      fireEvent.change(inputVigencia, { target: { value: '36' } });
      expect(screen.getByText(/Las convocatorias SENNOVA CGAO suelen contemplar vigencias de hasta 12 meses/i)).toBeInTheDocument();
    });

    it('evalúa la longitud del planteamiento del problema en la etapa 3 (vacío vs breve <50 vs robusto >=50)', () => {
      const record = structuredClone(mockRecord);
      record.ruta_formulacion.siguiente_paso = 'problema';

      const { rerender } = render(
        <ProjectFormulationWizard
          projectId="p-1"
          record={record}
          drafts={{ comunes: {}, formulacion_proyecto: { planteamiento_problema: '' } }}
          dirty={{}}
          canEdit={true}
          busy={false}
        />
      );

      // Vacío: no hay consejo de brevedad
      expect(screen.queryByText(/Consejo pedagógico: Describe con suficiente detalle la necesidad/i)).not.toBeInTheDocument();

      // Breve (< 50 caracteres): emite consejo pedagógico
      rerender(
        <ProjectFormulationWizard
          projectId="p-1"
          record={record}
          drafts={{ comunes: {}, formulacion_proyecto: { planteamiento_problema: 'Baja productividad en lácteos' } }}
          dirty={{}}
          canEdit={true}
          busy={false}
        />
      );
      expect(screen.getByText(/Consejo pedagógico: Describe con suficiente detalle la necesidad o brecha productiva/i)).toBeInTheDocument();

      // Suficiente (>= 50 caracteres): el consejo de brevedad desaparece
      rerender(
        <ProjectFormulationWizard
          projectId="p-1"
          record={record}
          drafts={{
            comunes: {},
            formulacion_proyecto: {
              planteamiento_problema: 'Se evidencia una baja tecnificación y trazabilidad en los procesos de transformación láctea del municipio de Vélez.',
            },
          }}
          dirty={{}}
          canEdit={true}
          busy={false}
        />
      );
      expect(screen.queryByText(/Consejo pedagógico: Describe con suficiente detalle la necesidad o brecha productiva/i)).not.toBeInTheDocument();
    });
  });

  describe('Suite 4: Concurrencia de guardado, gestión de fallos y badges de estado', () => {
    it('protege contra doble invocación de saveIdentification ante clics rápidos repetidos', async () => {
      let resolvePromise;
      ProjectDocumentationAPI.saveIdentification.mockImplementation(
        () => new Promise(resolve => { resolvePromise = resolve; })
      );

      render(
        <ProjectFormulationWizard
          projectId="p-1"
          record={mockRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={false}
        />
      );

      // Modificar campo para habilitar guardado
      fireEvent.change(screen.getByLabelText(/Título del proyecto/i), { target: { value: 'Nuevo título concurrente' } });
      const saveBtn = screen.getByRole('button', { name: /Guardar identificación/i });

      // Clic rápido 1
      fireEvent.click(saveBtn);
      // Clic rápido 2 mientras está guardando
      fireEvent.click(saveBtn);

      expect(ProjectDocumentationAPI.saveIdentification).toHaveBeenCalledTimes(1);

      // Resolver la promesa de guardado
      await act(async () => {
        resolvePromise({ ok: true });
      });
    });

    it('maneja fallos de red en saveIdentification preservando los datos del usuario y el badge de cambios pendientes', async () => {
      ProjectDocumentationAPI.saveIdentification.mockRejectedValueOnce(new Error('Fallo de conexión HTTP 500'));
      const notifyMock = vi.fn();

      render(
        <ProjectFormulationWizard
          projectId="p-1"
          record={mockRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={false}
          onNotify={notifyMock}
        />
      );

      fireEvent.change(screen.getByLabelText(/Título del proyecto/i), { target: { value: 'Datos valiosos sin perder' } });
      fireEvent.click(screen.getByRole('button', { name: /Guardar identificación/i }));

      await waitFor(() => {
        expect(notifyMock).toHaveBeenCalledWith('Fallo de conexión HTTP 500', 'error');
      });

      // El campo y el badge deben conservar los cambios para reintento
      expect(screen.getByLabelText(/Título del proyecto/i)).toHaveValue('Datos valiosos sin perder');
      expect(document.querySelector('.formulation-save-badge')).toHaveTextContent('Cambios pendientes por guardar');
    });

    it('deshabilita la acción Guardar y continuar y muestra estado "Guardando borrador..." cuando busy o saving es true', () => {
      render(
        <ProjectFormulationWizard
          projectId="p-1"
          record={mockRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={true}
        />
      );

      expect(screen.getByText(/Guardando borrador\.\.\./i)).toBeInTheDocument();

      const btnGuardarContinuar = screen.getByRole('button', { name: /Guardar y continuar/i });
      expect(btnGuardarContinuar).toBeDisabled();
    });

    it('el ref imperativo savePending() ejecuta la secuencia completa y devuelve el resultado booleano correspondiente', async () => {
      ProjectDocumentationAPI.saveIdentification.mockResolvedValueOnce({ ok: true });
      const reloadMock = vi.fn();
      const notifyMock = vi.fn();
      const wizardRef = createRef();

      render(
        <ProjectFormulationWizard
          ref={wizardRef}
          projectId="p-1"
          record={mockRecord}
          drafts={{ comunes: {}, formulacion_proyecto: {} }}
          dirty={{}}
          canEdit={true}
          busy={false}
          onReload={reloadMock}
          onNotify={notifyMock}
        />
      );

      // Sin cambios pendientes debe retornar true inmediatamente sin invocar la API
      const resultNoDirty = await wizardRef.current.savePending();
      expect(resultNoDirty).toBe(true);
      expect(ProjectDocumentationAPI.saveIdentification).not.toHaveBeenCalled();

      // Provocar cambio sucio
      fireEvent.change(screen.getByLabelText(/Título del proyecto/i), { target: { value: 'Título validado vía Ref' } });
      expect(wizardRef.current.hasUnsavedChanges()).toBe(true);

      // Invocar savePending()
      let resultDirty;
      await act(async () => {
        resultDirty = await wizardRef.current.savePending();
      });
      expect(resultDirty).toBe(true);
      expect(ProjectDocumentationAPI.saveIdentification).toHaveBeenCalledWith('p-1', {
        nombre: 'Título validado vía Ref',
      });
      expect(notifyMock).toHaveBeenCalledWith(expect.stringContaining('guardados con éxito'), 'success');
      expect(reloadMock).toHaveBeenCalled();
      expect(wizardRef.current.hasUnsavedChanges()).toBe(false);
    });
  });
});
