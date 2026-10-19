import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProjectFileImport from '../components/projects/ProjectFileImport';
import ProjectFileImportReview from '../components/projects/ProjectFileImportReview';
import ProjectDeliverableCard from '../components/projects/ProjectDeliverableCard';
import ProjectEvidenceFile from '../components/projects/ProjectEvidenceFile';
import ProjectEvidenceStage from '../components/projects/ProjectEvidenceStage';
import {
  formatFileSize,
  getDeliverableCategory,
  importExtensions,
  validateImportFiles,
} from '../components/projects/projectFileImportData';
import { UnsavedChangesProvider, useUnsavedChangesGuard } from '../context/UnsavedChangesContext';
import { ProjectFileImportAPI } from '../api/projectFileImport';
import { ProyectosAPI } from '../api/proyectos';
import { DocumentosAPI } from '../api/documentos';

vi.mock('../api/projectFileImport', () => ({
  ProjectFileImportAPI: {
    analyze: vi.fn(),
    save: vi.fn(),
  },
}));

vi.mock('../api/proyectos', () => ({
  ProyectosAPI: {
    getExpediente: vi.fn(),
    downloadExpediente: vi.fn(),
  },
}));

vi.mock('../api/documentos', () => ({
  DocumentosAPI: {
    upload: vi.fn(),
    download: vi.fn(),
  },
}));

function NavigationTrigger({ onLeave }) {
  const guard = useUnsavedChangesGuard();
  return (
    <button
      type="button"
      onClick={() => guard.requestLeave(() => onLeave?.())}
    >
      Navegar fuera
    </button>
  );
}

const createMockAnalysis = (projectId = 'proj-adversarial-1', count = 3) => {
  const files = [];
  for (let i = 1; i <= count; i++) {
    files.push({
      ruta: `carpeta_${i}/documento_${i}.pdf`,
      nombre_archivo: `documento_${i}.pdf`,
      tamano: 1024 * 100 * i, // 100 KB, 200 KB, ...
      sha256: `sha-mock-${i}`,
      tipo: i === 1 ? 'informe_bimensual' : 'documento_apoyo',
      periodo_bimestre: i === 1 ? 1 : null,
      texto_extraido: `Texto extraído para archivo ${i}`,
      advertencias: i === 2 ? ['Alerta de firma pendiente'] : [],
      propuesta: { comunes: { remitente: `Responsable ${i}` } },
    });
  }
  return {
    proyecto_id: projectId,
    carpetas: ['carpeta_1', 'carpeta_2'],
    carpetas_faltantes: [],
    archivos: files,
  };
};

describe('Pruebas Adversariales y de Estrés Empírico — Expediente Documental (M3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ProjectFileImportAPI.analyze.mockResolvedValue(createMockAnalysis('proj-adversarial-1', 3));
    ProjectFileImportAPI.save.mockResolvedValue({
      archivos_importados: 3,
      archivos_omitidos: 0,
      campos_registrados: 4,
      advertencias: [],
    });
    ProyectosAPI.getExpediente.mockResolvedValue({
      proyecto_id: 'proj-adversarial-1',
      nombre: 'Proyecto de Prueba Adversarial',
      codigo_sgps: 'SGPS-ADV-01',
      completo: false,
      porcentaje_completitud: 50,
      pendientes: ['Adjuntar soporte final'],
      etapas: [
        {
          id: 'informes',
          carpeta: '4InformesBimensuales',
          titulo: 'Informes bimensuales',
          tipo_documento: 'informe_bimensual',
          guia: 'Reportes de avance bimestral.',
          completo: false,
          informes_esperados: 4,
          bimestres_pendientes: [1, 2, 3, 4],
          documentos: [],
        },
      ],
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-adversarial-url');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Pruebas de Borde de Archivos (Tamaños extremos, 0B, >50MB, nombres raros)
  // =========================================================================
  describe('1. Pruebas de Borde de Archivos', () => {
    it('rechaza validación ante lista vacía de archivos', () => {
      expect(validateImportFiles([])).toBe('Seleccione un ZIP o los archivos que desea importar.');
    });

    it('gestiona correctamente archivos con tamaño 0 B sin excepción en formateo y UI', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(null)).toBe('0 B');
      expect(formatFileSize(undefined)).toBe('0 B');
      expect(formatFileSize(-100)).toBe('0 B');
      expect(formatFileSize(NaN)).toBe('0 B');

      const zeroByteFile = new File([''], 'registro_vacio.txt', { type: 'text/plain' });
      expect(zeroByteFile.size).toBe(0);

      // Pasa validación sin lanzar error de exceso de tamaño
      const validation = validateImportFiles([zeroByteFile]);
      expect(validation).toBe('');

      // Renderiza en ProjectDeliverableCard con tamaño 0 B
      render(
        <ProjectDeliverableCard
          file={{
            ruta: '7Borradoresyvarios/registro_vacio.txt',
            nombre_archivo: 'registro_vacio.txt',
            tamano: 0,
            tipo: 'documento_apoyo',
            propuesta: {},
          }}
          selected={{ '7Borradoresyvarios/registro_vacio.txt': true }}
          periods={{}}
          busy={false}
        />
      );

      expect(screen.getByText('registro_vacio.txt')).toBeInTheDocument();
      expect(screen.getByText(/0 B/)).toBeInTheDocument();
    });

    it('rechaza paquetes ZIP que superan los 50 MB estrictos', () => {
      const over50MBZip = {
        name: 'paquete_gigante.zip',
        size: 50 * 1024 * 1024 + 1, // 50 MB + 1 byte
      };
      const result = validateImportFiles([over50MBZip]);
      expect(result).toBe('El ZIP supera los 50 MB. Divida su contenido en paquetes más pequeños.');
    });

    it('rechaza archivos individuales que superan los 10 MB estrictos', () => {
      const over10MBFile = {
        name: 'video_evidencia_pesado.mp4',
        size: 10 * 1024 * 1024 + 1, // 10 MB + 1 byte
      };
      const result = validateImportFiles([over10MBFile]);
      expect(result).toBe('Un archivo supera los 10 MB. Reduzca su tamaño e intente de nuevo.');
    });

    it('rechaza selecciones acumuladas que superan el límite global de 200 MB', () => {
      // 21 archivos de 10 MB cada uno = 210 MB
      const files = Array.from({ length: 21 }, (_, i) => ({
        name: `informe_parte_${i + 1}.pdf`,
        size: 10 * 1024 * 1024,
      }));
      const result = validateImportFiles(files);
      expect(result).toBe('La selección supera los 200 MB. Divida la carga en grupos más pequeños.');
    });

    it('rechaza selecciones con más de 500 archivos', () => {
      const tooManyFiles = Array.from({ length: 501 }, (_, i) => ({
        name: `evidencia_${i + 1}.jpg`,
        size: 100,
      }));
      const result = validateImportFiles(tooManyFiles);
      expect(result).toBe('Seleccione como máximo 500 archivos por carga.');
    });

    it('rechaza selecciones con múltiples ZIPs o ZIP mezclado con archivos individuales', () => {
      const zip1 = { name: 'archivo1.zip', size: 1024 };
      const zip2 = { name: 'archivo2.zip', size: 1024 };
      expect(validateImportFiles([zip1, zip2])).toBe('Seleccione un solo ZIP, separado de los archivos individuales.');

      const doc = { name: 'acta.pdf', size: 1024 };
      expect(validateImportFiles([zip1, doc])).toBe('Seleccione un solo ZIP, separado de los archivos individuales.');
    });

    it('maneja nombres de archivo con caracteres especiales, acentos, múltiples puntos y sin extensión', () => {
      // 1. Archivo sin extensión -> formato no admitido
      const noExtFile = { name: 'archivo_sin_extension', size: 1000 };
      expect(validateImportFiles([noExtFile])).toBe('Hay un archivo con formato no admitido. Revise los formatos indicados.');

      // 2. Múltiples puntos y espacios con extensión válida -> aceptado
      const multiDotFile = {
        name: 'informe.anual.v2.3.revisado final [CGAO] (2026).pdf',
        size: 2048,
      };
      expect(validateImportFiles([multiDotFile])).toBe('');

      // 3. Mayúsculas -> normalizado y aceptado
      const upperFile = { name: 'PLAN_TRABAJO_FINAL.DOCX', size: 4096 };
      expect(validateImportFiles([upperFile])).toBe('');

      // 4. Renderizado en ProjectDeliverableCard con caracteres especiales y ruta compleja
      render(
        <ProjectDeliverableCard
          file={{
            ruta: '3Productos/1InformeFinal/../../escape/informe.anual.v2.3.revisado final [CGAO] (2026).pdf',
            nombre_archivo: 'informe.anual.v2.3.revisado final [CGAO] (2026).pdf',
            tamano: 2048,
            tipo: 'informe_final',
            propuesta: {},
          }}
          selected={{}}
          periods={{}}
          busy={false}
        />
      );

      expect(
        screen.getByText('informe.anual.v2.3.revisado final [CGAO] (2026).pdf')
      ).toBeInTheDocument();
      expect(screen.getByText('Informe de avance')).toBeInTheDocument();
    });

    it('ProjectFileImport muestra ErrorBanner ante validación fallida y no invoca la API', async () => {
      render(
        <ProjectFileImport
          projectId="proj-adversarial-1"
          projectName="Proyecto Adversarial"
        />
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      const invalidFile = new File(['binario'], 'ejecutable_peligroso.exe', { type: 'application/octet-stream' });
      fireEvent.change(input, { target: { files: [invalidFile] } });

      const analyzeBtn = screen.getByRole('button', { name: 'Analizar archivos' });
      fireEvent.click(analyzeBtn);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Hay un archivo con formato no admitido. Revise los formatos indicados.');
      expect(ProjectFileImportAPI.analyze).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. Acciones Concurrentes y Alternancia Rápida (Seleccionar/Deseleccionar todos)
  // =========================================================================
  describe('2. Acciones Concurrentes y Alternancia Rápida', () => {
    it('mantiene coherencia estricta en KPIs y estado del botón Guardar durante alternancias rápidas en ráfaga', async () => {
      render(
        <ProjectFileImport
          projectId="proj-adversarial-1"
          projectName="Proyecto Adversarial"
        />
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['zip'], 'paquete.zip')] } });

      fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' }));
      await screen.findByRole('heading', { name: 'Revisar archivos antes de guardar' });

      const selectAllBtn = screen.getByRole('button', { name: 'Seleccionar todos' });
      const deselectAllBtn = screen.getByRole('button', { name: 'Deseleccionar todos' });
      const saveBtn = screen.getByRole('button', { name: 'Guardar archivos en este proyecto' });

      // Estado inicial post-análisis: todos seleccionados (3 de 3)
      expect(screen.getByText(/3 de 3 archivos seleccionados/)).toBeInTheDocument();
      expect(selectAllBtn).toBeDisabled();
      expect(deselectAllBtn).toBeEnabled();
      expect(saveBtn).toBeEnabled();

      // Ráfaga de 6 alternancias consecutivas
      for (let cycle = 0; cycle < 3; cycle++) {
        // Deseleccionar todos
        fireEvent.click(deselectAllBtn);
        expect(screen.getByText(/0 de 3 archivos seleccionados/)).toBeInTheDocument();
        expect(screen.getByText(/0 B/)).toBeInTheDocument();
        expect(deselectAllBtn).toBeDisabled();
        expect(selectAllBtn).toBeEnabled();
        expect(saveBtn).toBeDisabled();

        // Seleccionar todos
        fireEvent.click(selectAllBtn);
        expect(screen.getByText(/3 de 3 archivos seleccionados/)).toBeInTheDocument();
        expect(selectAllBtn).toBeDisabled();
        expect(deselectAllBtn).toBeEnabled();
        expect(saveBtn).toBeEnabled();
      }
    });

    it('soporta deselección selectiva individual hasta vaciar y reactiva botones dinámicamente', async () => {
      const mockData = createMockAnalysis('proj-adversarial-1', 2);
      ProjectFileImportAPI.analyze.mockResolvedValueOnce(mockData);

      render(
        <ProjectFileImport
          projectId="proj-adversarial-1"
          projectName="Proyecto Adversarial"
        />
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['zip'], 'paquete.zip')] } });
      fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' }));
      await screen.findByRole('heading', { name: 'Revisar archivos antes de guardar' });

      const check1 = screen.getByLabelText('Incluir documento_1.pdf');
      const check2 = screen.getByLabelText('Incluir documento_2.pdf');
      const saveBtn = screen.getByRole('button', { name: 'Guardar archivos en este proyecto' });

      // Desmarcar documento 1
      fireEvent.click(check1);
      expect(screen.getByText(/1 de 2 archivos seleccionados/)).toBeInTheDocument();
      expect(saveBtn).toBeEnabled();

      // Desmarcar documento 2 -> 0 seleccionados
      fireEvent.click(check2);
      expect(screen.getByText(/0 de 2 archivos seleccionados/)).toBeInTheDocument();
      expect(saveBtn).toBeDisabled();

      // Volver a marcar documento 1
      fireEvent.click(check1);
      expect(screen.getByText(/1 de 2 archivos seleccionados/)).toBeInTheDocument();
      expect(saveBtn).toBeEnabled();
    });
  });

  // =========================================================================
  // 3. Blindaje de ConfirmDialog, Salvaguardas y Estados Sucios (isDirty)
  // =========================================================================
  describe('3. Blindaje del Diálogo ConfirmDialog y Salvaguardas isDirty', () => {
    it('no permite burlar ConfirmDialog al cancelar o cerrar con tecla o click fuera', async () => {
      render(
        <ProjectFileImport
          projectId="proj-adversarial-1"
          projectName="Proyecto Adversarial"
          confirmClear={true}
        />
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['sample'], 'evidencia.pdf')] } });

      const clearBtn = screen.getByRole('button', { name: 'Limpiar selección' });
      fireEvent.click(clearBtn);

      // ConfirmDialog abierto
      expect(screen.getByText('¿Descartar archivos seleccionados?')).toBeInTheDocument();

      // Cancelar con el botón "Continuar con la importación"
      const cancelBtn = screen.getByRole('button', { name: 'Continuar con la importación' });
      fireEvent.click(cancelBtn);

      // El diálogo se cierra, pero los archivos NO se eliminaron
      await waitFor(() => {
        expect(screen.queryByText('¿Descartar archivos seleccionados?')).not.toBeInTheDocument();
      });
      expect(screen.getByText(/Selección actual: evidencia.pdf/)).toBeInTheDocument();

      // Intentar abrir y cerrar nuevamente
      fireEvent.click(clearBtn);
      expect(screen.getByText('¿Descartar archivos seleccionados?')).toBeInTheDocument();

      // Confirmar descarte
      const confirmBtn = screen.getByRole('button', { name: 'Descartar selección' });
      fireEvent.click(confirmBtn);

      // ConfirmDialog se cierra y los archivos fueron purgados
      await waitFor(() => {
        expect(screen.queryByText('¿Descartar archivos seleccionados?')).not.toBeInTheDocument();
      });
      expect(screen.queryByText(/Selección actual: evidencia.pdf/)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Limpiar selección' })).not.toBeInTheDocument();
    });

    it('si confirmClear={false}, limpia inmediatamente sin intermediación de modal', () => {
      render(
        <ProjectFileImport
          projectId="proj-adversarial-1"
          projectName="Proyecto Adversarial"
          confirmClear={false}
        />
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['sample'], 'evidencia.pdf')] } });

      const clearBtn = screen.getByRole('button', { name: 'Limpiar selección' });
      fireEvent.click(clearBtn);

      // Directamente limpiado sin ConfirmDialog
      expect(screen.queryByText('¿Descartar archivos seleccionados?')).not.toBeInTheDocument();
      expect(screen.queryByText(/Selección actual: evidencia.pdf/)).not.toBeInTheDocument();
    });

    it('UnsavedChangesGuard previene pérdida accidental de datos durante navegación no confirmada', async () => {
      const onLeave = vi.fn();
      render(
        <UnsavedChangesProvider>
          <NavigationTrigger onLeave={onLeave} />
          <ProjectFileImport
            projectId="proj-adversarial-1"
            projectName="Proyecto Adversarial"
          />
        </UnsavedChangesProvider>
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['zip'], 'paquete.zip')] } });

      // Intentar navegar fuera
      fireEvent.click(screen.getByRole('button', { name: 'Navegar fuera' }));

      // Diálogo de guardia de cambios intercepta
      expect(screen.getByText('Cambios pendientes por guardar')).toBeInTheDocument();
      expect(onLeave).not.toHaveBeenCalled();

      // Pulsar "Seguir editando"
      fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
      expect(screen.queryByText('Cambios pendientes por guardar')).not.toBeInTheDocument();
      expect(onLeave).not.toHaveBeenCalled();
      expect(screen.getByText(/Selección actual: paquete.zip/)).toBeInTheDocument();
    });
  });

  // =========================================================================
  // 4. Verificación de Propagación de Errores y Comportamiento de ErrorBanner
  // =========================================================================
  describe('4. Propagación de Errores y Reintentos con ErrorBanner', () => {
    it('captura fallo de red en análisis, muestra ErrorBanner y permite recuperarse tras reintento', async () => {
      ProjectFileImportAPI.analyze.mockRejectedValueOnce(new Error('Fallo de conexión 504 Gateway Timeout'));

      render(
        <ProjectFileImport
          projectId="proj-adversarial-1"
          projectName="Proyecto Adversarial"
        />
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['zip'], 'paquete.zip')] } });

      fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' }));

      // ErrorBanner desplegado con el mensaje exacto
      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Fallo de conexión 504 Gateway Timeout');

      // Botón de reintento presente
      const retryBtn = screen.getByRole('button', { name: 'Reintentar análisis' });
      expect(retryBtn).toBeInTheDocument();

      // Ejecutar reintento
      fireEvent.click(retryBtn);

      // Ahora resuelve exitosamente
      await screen.findByRole('heading', { name: 'Revisar archivos antes de guardar' });
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Reintentar análisis' })).not.toBeInTheDocument();
    });

    it('detecta discrepancia en projectId devuelto por el servidor y ofrece reintentar', async () => {
      // El servidor devuelve una respuesta para otro proyecto
      ProjectFileImportAPI.analyze.mockResolvedValueOnce({
        proyecto_id: 'otro-proyecto-diferente-999',
        carpetas: [],
        carpetas_faltantes: [],
        archivos: [],
      });

      render(
        <ProjectFileImport
          projectId="proj-adversarial-1"
          projectName="Proyecto Adversarial"
        />
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['zip'], 'paquete.zip')] } });

      fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' }));

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('La respuesta no corresponde al proyecto actual. Analice los archivos de nuevo.');
      expect(screen.getByRole('button', { name: 'Reintentar análisis' })).toBeInTheDocument();
    });

    it('captura fallo de red al guardar, muestra ErrorBanner con reintento y finaliza con éxito al reintentar', async () => {
      ProjectFileImportAPI.save.mockRejectedValueOnce(new Error('Error de concurrencia al guardar entregables'));

      const onNotify = vi.fn();
      const onImported = vi.fn();

      render(
        <ProjectFileImport
          projectId="proj-adversarial-1"
          projectName="Proyecto Adversarial"
          onNotify={onNotify}
          onImported={onImported}
        />
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['zip'], 'paquete.zip')] } });

      fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' }));
      await screen.findByRole('heading', { name: 'Revisar archivos antes de guardar' });

      // Guardar -> falla
      const saveBtn = screen.getByRole('button', { name: 'Guardar archivos en este proyecto' });
      fireEvent.click(saveBtn);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Error de concurrencia al guardar entregables');

      const retryBtn = screen.getByRole('button', { name: 'Reintentar guardado' });
      expect(retryBtn).toBeInTheDocument();

      // Reintentar guardado
      fireEvent.click(retryBtn);

      // Resuelve con éxito
      await waitFor(() => {
        expect(onNotify).toHaveBeenCalledWith(
          expect.stringContaining('Archivos guardados: 3'),
          'success'
        );
      });
      expect(onImported).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('valida bimestre inválido antes de guardar y muestra ErrorBanner sin invocar la API', async () => {
      render(
        <ProjectFileImport
          projectId="proj-adversarial-1"
          projectName="Proyecto Adversarial"
          maxPeriods={4}
        />
      );

      const input = screen.getByLabelText('ZIP o archivos individuales');
      fireEvent.change(input, { target: { files: [new File(['zip'], 'paquete.zip')] } });

      fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' }));
      await screen.findByRole('heading', { name: 'Revisar archivos antes de guardar' });

      // Documento 1 es informe_bimensual; colocar bimestre fuera de rango (ej. 99)
      const periodInput = screen.getByLabelText('Bimestre de documento_1.pdf');
      fireEvent.change(periodInput, { target: { value: '99' } });

      const saveBtn = screen.getByRole('button', { name: 'Guardar archivos en este proyecto' });
      fireEvent.click(saveBtn);

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Indique un número de bimestre válido para documento_1.pdf, entre 1 y 4.');
      expect(ProjectFileImportAPI.save).not.toHaveBeenCalled();
      expect(screen.queryByRole('button', { name: 'Reintentar guardado' })).not.toBeInTheDocument();
    });

    it('ProjectEvidenceFile gestiona errores al consultar expediente y al descargar documentos', async () => {
      // 1. Error al consultar expediente
      ProyectosAPI.getExpediente.mockRejectedValueOnce(new Error('Fallo crítico de base de datos'));

      render(
        <ProjectEvidenceFile
          projectId="proj-adversarial-1"
          currentUser={{ rol: 'investigador' }}
          showConstructor={false}
        />
      );

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent('Fallo crítico de base de datos');
      expect(screen.getByText('No fue posible consultar el expediente')).toBeInTheDocument();

      const retryQueryBtn = screen.getByRole('button', { name: 'Reintentar consulta' });
      fireEvent.click(retryQueryBtn);

      await screen.findByText('Expediente del proyecto');
      expect(screen.queryByText('Fallo crítico de base de datos')).not.toBeInTheDocument();

      // 2. Error al descargar expediente
      ProyectosAPI.downloadExpediente.mockRejectedValueOnce(new Error('Error de servidor al generar ZIP'));

      const downloadBtn = screen.getByRole('button', { name: /Descargar expediente/i });
      fireEvent.click(downloadBtn);

      const downloadAlert = await screen.findByRole('alert');
      expect(downloadAlert).toHaveTextContent('Error de servidor al generar ZIP');
    });

    it('ProjectEvidenceFile rechaza adjuntos con extensiones no permitidas o tamaño mayor a 10 MB', async () => {
      render(
        <ProjectEvidenceFile
          projectId="proj-adversarial-1"
          currentUser={{ rol: 'investigador' }}
          showConstructor={false}
        />
      );

      await screen.findByText('Expediente del proyecto');

      // 1. Subir archivo con extensión no permitida (ej. .exe)
      const fileInput = screen.getByLabelText('Archivo de Informes bimensuales');
      const submitBtn = screen.getByRole('button', { name: 'Adjuntar documento' });

      const invalidDoc = new File(['binario'], 'malicioso.exe', { type: 'application/octet-stream' });
      fireEvent.change(fileInput, { target: { files: [invalidDoc] } });
      fireEvent.click(submitBtn);

      const alert1 = await screen.findByRole('alert');
      expect(alert1).toHaveTextContent('Seleccione un archivo PDF, DOCX, XLSX, PPTX, JPG, PNG o MP4.');
      expect(DocumentosAPI.upload).not.toHaveBeenCalled();

      // 2. Subir archivo con tamaño > 10 MB
      const bigDoc = {
        name: 'informe_enorme.pdf',
        size: 10 * 1024 * 1024 + 1,
      };
      fireEvent.change(fileInput, { target: { files: [bigDoc] } });
      fireEvent.click(submitBtn);

      const alert2 = await screen.findByRole('alert');
      expect(alert2).toHaveTextContent('El archivo supera los 10 MB. Reduzca su tamaño e intente de nuevo.');
      expect(DocumentosAPI.upload).not.toHaveBeenCalled();
    });
  });
});
