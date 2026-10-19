import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ProjectFileImport from '../components/projects/ProjectFileImport';
import ProjectFileImportReview from '../components/projects/ProjectFileImportReview';
import ProjectDeliverableCard from '../components/projects/ProjectDeliverableCard';
import ProjectEvidenceFile from '../components/projects/ProjectEvidenceFile';
import ProjectEvidenceStage from '../components/projects/ProjectEvidenceStage';
import { formatFileSize, getDeliverableCategory } from '../components/projects/projectFileImportData';
import { UnsavedChangesProvider, useUnsavedChangesGuard } from '../context/UnsavedChangesContext';
import { ProjectFileImportAPI } from '../api/projectFileImport';
import { ProyectosAPI } from '../api/proyectos';
import { DocumentosAPI } from '../api/documentos';

vi.mock('../api/projectFileImport', () => ({
  ProjectFileImportAPI: { analyze: vi.fn(), save: vi.fn() },
}));

vi.mock('../api/proyectos', () => ({
  ProyectosAPI: { getExpediente: vi.fn(), downloadExpediente: vi.fn() },
}));

vi.mock('../api/documentos', () => ({
  DocumentosAPI: { upload: vi.fn(), download: vi.fn() },
}));

const mockFiles = () => [
  {
    ruta: '4InformesBimensuales/informe1.pdf',
    nombre_archivo: 'informe1.pdf',
    tamano: 1024 * 500, // 500 KB
    sha256: 'hash-pdf-1',
    tipo: 'informe_bimensual',
    periodo_bimestre: 1,
    texto_extraido: 'Texto del informe bimensual.',
    advertencias: ['Verifique las firmas.'],
    propuesta: { comunes: { responsable: 'Investigador Principal' } },
  },
  {
    ruta: '3Productos/software.xlsx',
    nombre_archivo: 'software.xlsx',
    tamano: 1024 * 1024 * 2.5, // 2.5 MB
    sha256: 'hash-xlsx-2',
    tipo: 'producto_resultado',
    periodo_bimestre: null,
    texto_extraido: 'Métricas de desarrollo.',
    advertencias: [],
    propuesta: { proyecto: { lineas_investigacion: 'Biotecnología' } },
  },
  {
    ruta: '6EvidenciasFotograficas/taller.jpg',
    nombre_archivo: 'taller.jpg',
    tamano: 800, // 800 B
    sha256: 'hash-jpg-3',
    tipo: 'evidencia_fotografica',
    periodo_bimestre: null,
    texto_extraido: '',
    advertencias: [],
    propuesta: {},
  },
];

const mockAnalysisResult = () => ({
  proyecto_id: 'proj-100',
  carpetas: ['4InformesBimensuales', '3Productos', '6EvidenciasFotograficas'],
  carpetas_faltantes: ['5ActaCierre'],
  archivos: mockFiles(),
});

function LeaveTrigger({ onTrigger }) {
  const guard = useUnsavedChangesGuard();
  return (
    <button
      type="button"
      onClick={() => guard.requestLeave(() => onTrigger?.())}
    >
      Intentar salir
    </button>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  ProjectFileImportAPI.analyze.mockResolvedValue(mockAnalysisResult());
  ProjectFileImportAPI.save.mockResolvedValue({
    archivos_importados: 3,
    archivos_omitidos: 0,
    campos_registrados: 5,
    advertencias: [],
  });
  ProyectosAPI.getExpediente.mockResolvedValue({
    proyecto_id: 'proj-100',
    nombre: 'Proyecto Agroecológico',
    codigo_sgps: 'SGPS-88',
    completo: false,
    porcentaje_completitud: 35,
    pendientes: ['Subir acta de cierre.'],
    etapas: [
      {
        id: 'informes',
        carpeta: '4InformesBimensuales',
        titulo: 'Informes bimensuales',
        tipo_documento: 'informe_bimensual',
        guia: 'Suba los reportes bimestrales.',
        completo: false,
        informes_esperados: 6,
        bimestres_pendientes: [1, 2],
        documentos: [],
      },
    ],
  });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Ergonomía, salvaguardas y accesibilidad del expediente documental (M3)', () => {
  describe('Utilidades formatFileSize y getDeliverableCategory', () => {
    it('formatea tamaños de archivos en B, KB y MB con localización es-CO', () => {
      expect(formatFileSize(null)).toBe('0 B');
      expect(formatFileSize(-10)).toBe('0 B');
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(512)).toBe('512 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 5.5)).toContain('5,5 MB');
    });

    it('clasifica los tipos de entregables con etiquetas y variantes semánticas institucionales', () => {
      const formal = getDeliverableCategory('acta_inicio');
      expect(formal.label).toBe('Gestión formal');
      expect(formal.variant).toBe('primary');
      expect(String(formal)).toBe('Gestión formal');

      const informe = getDeliverableCategory('informe_bimensual');
      expect(informe.label).toBe('Informe de avance');
      expect(informe.variant).toBe('sena');

      const producto = getDeliverableCategory('producto_resultado');
      expect(producto.label).toBe('Producto o resultado');
      expect(producto.variant).toBe('purple');

      const foto = getDeliverableCategory('evidencia_fotografica');
      expect(foto.label).toBe('Evidencia de campo');
      expect(foto.variant).toBe('info');

      const defaultCat = getDeliverableCategory('tipo_desconocido');
      expect(defaultCat.label).toBe('Documento de apoyo');
      expect(defaultCat.variant).toBe('default');
    });
  });

  describe('ProjectDeliverableCard', () => {
    it('renderiza metadatos, icono por extensión, badge semántico y valida input de bimestre', () => {
      const onSelect = vi.fn();
      const onPeriod = vi.fn();
      const file = mockFiles()[0];

      render(
        <ProjectDeliverableCard
          file={file}
          selected={{ [file.ruta]: true }}
          onSelect={onSelect}
          periods={{ [file.ruta]: 2 }}
          onPeriod={onPeriod}
          maxPeriods={6}
          busy={false}
        />
      );

      expect(screen.getByText('informe1.pdf')).toBeInTheDocument();
      expect(screen.getByText(file.ruta)).toBeInTheDocument();
      expect(screen.getByText(/Informe bimensual · 500 KB/)).toBeInTheDocument();
      expect(screen.getByText('Informe de avance')).toBeInTheDocument();
      expect(screen.getByText('Verifique las firmas.')).toBeInTheDocument();

      const periodInput = screen.getByLabelText('Bimestre de informe1.pdf');
      expect(periodInput).toHaveValue(2);
      expect(periodInput).toHaveAttribute('min', '1');
      expect(periodInput).toHaveAttribute('max', '6');

      fireEvent.change(periodInput, { target: { value: '3' } });
      expect(onPeriod).toHaveBeenCalledWith(file.ruta, '3');

      const checkbox = screen.getByLabelText('Incluir informe1.pdf');
      expect(checkbox).toBeChecked();
      fireEvent.click(checkbox);
      expect(onSelect).toHaveBeenCalledWith(file.ruta, false);
    });

    it('permite desplegar el panel de texto extraído y valores propuestos', () => {
      const file = mockFiles()[0];
      render(
        <ProjectDeliverableCard
          file={file}
          selected={{ [file.ruta]: true }}
          periods={{}}
          busy={false}
        />
      );

      const summary = screen.getByText('Ver texto y datos propuestos');
      expect(summary).toBeInTheDocument();
      expect(screen.getByText('Texto del informe bimensual.')).toBeInTheDocument();
      expect(screen.getByText('Investigador Principal')).toBeInTheDocument();
    });

    it('asigna iconos correctos para video, audio, json, zip y archivos genéricos', () => {
      const onToggleSelect = vi.fn();
      const onBimesterChange = vi.fn();

      const extensions = ['video.mp4', 'grabacion.mp3', 'datos.json', 'paquete.zip', 'registro.xyz'];
      extensions.forEach((name, idx) => {
        const file = {
          ruta: `archivos/${name}`,
          nombre_archivo: name,
          tamano: 1024,
          tipo: 'documento_apoyo',
          propuesta: {},
        };
        const { unmount } = render(
          <ProjectDeliverableCard
            file={file}
            isSelected={idx % 2 === 0}
            onToggleSelect={onToggleSelect}
            onBimesterChange={onBimesterChange}
            busy={false}
          />
        );
        expect(screen.getByText(name)).toBeInTheDocument();
        const checkbox = screen.getByLabelText(`Incluir ${name}`);
        fireEvent.click(checkbox);
        unmount();
      });

      expect(onToggleSelect).toHaveBeenCalled();
    });
  });

  describe('ProjectFileImportReview: Barra de KPIs y acciones masivas', () => {
    it('calcula y muestra KPIs acumulados de archivos seleccionados y peso en es-CO', () => {
      const result = mockAnalysisResult();
      const selected = {
        [result.archivos[0].ruta]: true,
        [result.archivos[1].ruta]: true,
        [result.archivos[2].ruta]: false,
      };

      render(
        <ProjectFileImportReview
          result={result}
          selected={selected}
          onSelect={vi.fn()}
          periods={{}}
          onPeriod={vi.fn()}
          importData={true}
          onImportData={vi.fn()}
          busy={false}
        />
      );

      // 2 de 3 archivos seleccionados (500 KB + 2.5 MB = 3 MB)
      expect(screen.getByText(/2 de 3 archivos seleccionados/)).toBeInTheDocument();
      expect(screen.getByText(/3 MB/)).toBeInTheDocument();
    });

    it('permite seleccionar y deseleccionar todos los archivos con botones masivos', () => {
      const result = mockAnalysisResult();
      const onSelectAll = vi.fn();
      const onSelect = vi.fn();

      render(
        <ProjectFileImportReview
          result={result}
          selected={{ [result.archivos[0].ruta]: true }}
          onSelect={onSelect}
          periods={{}}
          onPeriod={vi.fn()}
          importData={true}
          onImportData={vi.fn()}
          busy={false}
          onSelectAll={onSelectAll}
        />
      );

      const deselectAllBtn = screen.getByRole('button', { name: 'Deseleccionar todos' });
      fireEvent.click(deselectAllBtn);
      expect(onSelectAll).toHaveBeenCalledWith(false);

      const selectAllBtn = screen.getByRole('button', { name: 'Seleccionar todos' });
      fireEvent.click(selectAllBtn);
      expect(onSelectAll).toHaveBeenCalledWith(true);
    });

    it('soporta deselección masiva fallback iterando sobre onSelect cuando no hay onSelectAll', () => {
      const result = mockAnalysisResult();
      const onSelect = vi.fn();

      render(
        <ProjectFileImportReview
          result={result}
          selected={{
            [result.archivos[0].ruta]: true,
            [result.archivos[1].ruta]: true,
            [result.archivos[2].ruta]: true,
          }}
          onSelect={onSelect}
          periods={{}}
          onPeriod={vi.fn()}
          importData={true}
          onImportData={vi.fn()}
          busy={false}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Deseleccionar todos' }));
      expect(onSelect).toHaveBeenCalledTimes(3);
    });
  });

  describe('ProjectFileImport: Salvaguarda preventivas, ConfirmDialog y guardado isDirty', () => {
    it('muestra ConfirmDialog preventivo al pulsar "Limpiar selección" y respeta cancelar o confirmar', async () => {
      render(
        <ProjectFileImport
          projectId="proj-100"
          projectName="Proyecto Agroecológico"
          confirmClear={true}
        />
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      const testFile = new File(['contenido de prueba'], 'documento.pdf', { type: 'application/pdf' });
      fireEvent.change(input, { target: { files: [testFile] } });

      expect(screen.getByText(/Selección actual: documento.pdf/)).toBeInTheDocument();

      const clearBtn = screen.getByRole('button', { name: 'Limpiar selección' });
      fireEvent.click(clearBtn);

      // Debe abrir ConfirmDialog y no descartar aún
      expect(screen.getByText('¿Descartar archivos seleccionados?')).toBeInTheDocument();
      expect(screen.getByText(/Se descartará la selección actual y los resultados de análisis no guardados/)).toBeInTheDocument();
      expect(screen.getByText(/Selección actual: documento.pdf/)).toBeInTheDocument();

      // Cancelar diálogo
      const cancelBtn = screen.getByRole('button', { name: 'Continuar con la importación' });
      fireEvent.click(cancelBtn);
      expect(screen.queryByText('¿Descartar archivos seleccionados?')).not.toBeInTheDocument();
      expect(screen.getByText(/Selección actual: documento.pdf/)).toBeInTheDocument();

      // Abrir de nuevo y confirmar descarte
      fireEvent.click(clearBtn);
      const confirmBtn = screen.getByRole('button', { name: 'Descartar selección' });
      fireEvent.click(confirmBtn);

      expect(screen.queryByText('¿Descartar archivos seleccionados?')).not.toBeInTheDocument();
      expect(screen.queryByText(/Selección actual: documento.pdf/)).not.toBeInTheDocument();
    });

    it('registra la sesión sucia isDirty en UnsavedChangesContext y advierte antes de abandonar la vista', async () => {
      const onLeave = vi.fn();
      render(
        <UnsavedChangesProvider>
          <LeaveTrigger onTrigger={onLeave} />
          <ProjectFileImport
            projectId="proj-100"
            projectName="Proyecto Agroecológico"
          />
        </UnsavedChangesProvider>
      );

      // Sin archivos cargados: salir inmediatamente
      fireEvent.click(screen.getByRole('button', { name: 'Intentar salir' }));
      expect(onLeave).toHaveBeenCalledTimes(1);

      // Cargar archivo: estado isDirty activo
      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['x'], 'avance.pdf')] } });

      // Intentar salir: debe bloquearse y mostrar modal de cambios pendientes
      fireEvent.click(screen.getByRole('button', { name: 'Intentar salir' }));
      expect(screen.getByText('Cambios pendientes por guardar')).toBeInTheDocument();
      expect(onLeave).toHaveBeenCalledTimes(1);

      // Descartar y salir desde el modal del guard
      fireEvent.click(screen.getByRole('button', { name: 'Descartar y salir' }));
      expect(onLeave).toHaveBeenCalledTimes(2);
      expect(screen.queryByText(/Selección actual: avance.pdf/)).not.toBeInTheDocument();
    });

    it('permite guardar y salir desde el modal de UnsavedChangesContext con save() registrado', async () => {
      const onLeave = vi.fn();
      render(
        <UnsavedChangesProvider>
          <LeaveTrigger onTrigger={onLeave} />
          <ProjectFileImport
            projectId="proj-100"
            projectName="Proyecto Agroecológico"
          />
        </UnsavedChangesProvider>
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['zip'], 'paquete.zip')] } });

      fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' }));
      await screen.findByRole('heading', { name: 'Revisar archivos antes de guardar' });

      // Con análisis completado y archivos seleccionados, intentar salir
      fireEvent.click(screen.getByRole('button', { name: 'Intentar salir' }));
      expect(screen.getByText('Cambios pendientes por guardar')).toBeInTheDocument();

      // Pulsar "Guardar y salir"
      fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
      await waitFor(() => expect(ProjectFileImportAPI.save).toHaveBeenCalled());
      await waitFor(() => expect(onLeave).toHaveBeenCalled());
    });

    it('ProjectFileImport actualiza selecciones masivas con selectAll desde la barra de revisión', async () => {
      render(
        <ProjectFileImport
          projectId="proj-100"
          projectName="Proyecto Agroecológico"
        />
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['zip'], 'paquete.zip')] } });

      fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' }));
      await screen.findByRole('heading', { name: 'Revisar archivos antes de guardar' });

      // Deseleccionar todos
      const deselectBtn = screen.getByRole('button', { name: 'Deseleccionar todos' });
      fireEvent.click(deselectBtn);

      const saveBtn = screen.getByRole('button', { name: 'Guardar archivos en este proyecto' });
      expect(saveBtn).toBeDisabled();

      // Seleccionar todos
      const selectBtn = screen.getByRole('button', { name: 'Seleccionar todos' });
      fireEvent.click(selectBtn);
      expect(saveBtn).toBeEnabled();
    });

    it('muestra estados de carga con aria-busy y Loader2 en botones durante análisis', async () => {
      let resolveAnalyze;
      ProjectFileImportAPI.analyze.mockImplementationOnce(() => new Promise(resolve => {
        resolveAnalyze = resolve;
      }));

      render(
        <ProjectFileImport
          projectId="proj-100"
          projectName="Proyecto Agroecológico"
        />
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['zip'], 'paquete.zip')] } });

      const analyzeBtn = screen.getByRole('button', { name: 'Analizar archivos' });
      fireEvent.click(analyzeBtn);

      // Debe estar deshabilitado con aria-busy="true"
      expect(analyzeBtn).toBeDisabled();
      expect(analyzeBtn).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByText('Analizando archivos…')).toBeInTheDocument();

      // Completar análisis
      resolveAnalyze(mockAnalysisResult());
      await screen.findByRole('heading', { name: 'Revisar archivos antes de guardar' });
      expect(analyzeBtn).not.toHaveAttribute('aria-busy');
    });

    it('despliega ErrorBanner accesible ante fallo de análisis y permite reintentar', async () => {
      ProjectFileImportAPI.analyze.mockRejectedValueOnce(new Error('Fallo de red en el servidor'));

      render(
        <ProjectFileImport
          projectId="proj-100"
          projectName="Proyecto Agroecológico"
        />
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['zip'], 'paquete.zip')] } });

      fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Fallo de red en el servidor');
      expect(screen.getByText('Error en la importación de archivos')).toBeInTheDocument();

      // Reintentar con éxito
      const retryBtn = screen.getByRole('button', { name: 'Reintentar análisis' });
      fireEvent.click(retryBtn);

      await screen.findByRole('heading', { name: 'Revisar archivos antes de guardar' });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('ProjectEvidenceFile y ProjectEvidenceStage', () => {
    it('muestra ErrorBanner ante fallo de consulta de expediente y permite reintentar con botón', async () => {
      ProyectosAPI.getExpediente.mockRejectedValueOnce(new Error('No se pudo establecer conexión'));

      render(
        <ProjectEvidenceFile
          projectId="proj-100"
          currentUser={{ rol: 'investigador' }}
          showConstructor={false}
        />
      );

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('No se pudo establecer conexión');
      expect(screen.getByText('No fue posible consultar el expediente')).toBeInTheDocument();

      const retryBtn = screen.getByRole('button', { name: 'Reintentar consulta' });
      fireEvent.click(retryBtn);

      await screen.findByText(/Expediente en construcción/);
      expect(screen.queryByText('No se pudo establecer conexión')).not.toBeInTheDocument();
    });

    it('integra Button con estado loading durante la descarga del expediente', async () => {
      let resolveDownload;
      ProyectosAPI.downloadExpediente.mockImplementationOnce(() => new Promise(resolve => {
        resolveDownload = resolve;
      }));

      render(
        <ProjectEvidenceFile
          projectId="proj-100"
          currentUser={{ rol: 'investigador' }}
          showConstructor={false}
        />
      );

      const downloadBtn = await screen.findByRole('button', { name: /Descargar expediente parcial/i });
      fireEvent.click(downloadBtn);

      expect(downloadBtn).toBeDisabled();
      expect(downloadBtn).toHaveAttribute('aria-busy', 'true');

      resolveDownload(new Blob(['zip data']));
      await waitFor(() => expect(downloadBtn).not.toHaveAttribute('aria-busy'));
    });

    it('ProjectEvidenceStage presenta Button con prop loading al adjuntar un documento', async () => {
      const onUpload = vi.fn().mockImplementation(() => new Promise(() => {})); // no resuelve inmediatamente

      const stage = {
        id: 'informes',
        carpeta: '4InformesBimensuales',
        titulo: 'Informes bimensuales',
        tipo_documento: 'informe_bimensual',
        guia: 'Adjunte aquí el informe.',
        completo: false,
        documentos: [],
      };

      const { rerender } = render(
        <ProjectEvidenceStage
          stage={stage}
          canUpload={true}
          busy={false}
          onUpload={onUpload}
          onDownload={vi.fn()}
        />
      );

      const submitBtn = screen.getByRole('button', { name: 'Adjuntar documento' });
      expect(submitBtn).toBeEnabled();

      rerender(
        <ProjectEvidenceStage
          stage={stage}
          canUpload={true}
          busy={true}
          onUpload={onUpload}
          onDownload={vi.fn()}
        />
      );

      const busyBtn = screen.getByRole('button', { name: 'Procesando…' });
      expect(busyBtn).toBeDisabled();
      expect(busyBtn).toHaveAttribute('aria-busy', 'true');
    });
  });
});
