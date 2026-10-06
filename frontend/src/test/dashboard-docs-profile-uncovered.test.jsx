import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DashboardModule from '../components/dashboard/DashboardModule';
import DocumentCenterModule from '../components/admin/DocumentCenterModule';
import PerfilModule from '../components/profile/PerfilModule';
import AuditoriaModule from '../components/admin/AuditoriaModule';
import { DashboardAPI } from '../api/dashboard';
import { AuditAPI } from '../api/audit';
import { DocumentosAPI } from '../api/documentos';
import { ProyectosAPI } from '../api/proyectos';
import { AuthAPI } from '../api/auth';
import { CVLACAPI } from '../api/cvlac';

vi.mock('../api/dashboard', () => ({
  DashboardAPI: {
    getStats: vi.fn(),
    getAnalyticsEvolucion: vi.fn(),
    getUserImpact: vi.fn(),
  },
}));
vi.mock('../api/audit', () => ({
  AuditAPI: {
    getLogs: vi.fn(),
    getActividades: vi.fn(),
    getStats: vi.fn(),
    exportLogsUrl: vi.fn(),
    cleanup: vi.fn(),
  },
}));
vi.mock('../api/documentos', () => ({
  DocumentosAPI: {
    list: vi.fn(),
    upload: vi.fn(),
    download: vi.fn(),
    getViewUrl: vi.fn(),
    delete: vi.fn(),
  },
}));
vi.mock('../api/proyectos', () => ({
  ProyectosAPI: {
    list: vi.fn(),
    get: vi.fn(),
    getInvestigadores: vi.fn(),
  },
}));
vi.mock('../api/auth', () => ({
  AuthAPI: { getMe: vi.fn(), changePassword: vi.fn() },
}));
vi.mock('../api/cvlac', () => ({
  CVLACAPI: {
    estadoUsuario: vi.fn(),
    validarURL: vi.fn(),
    importar: vi.fn(),
    subirPDF: vi.fn(),
  },
}));
vi.mock('../components/users/UserInsightPanel', () => ({
  default: ({ user, isOpen, onClose }) => isOpen ? (
    <section aria-label="Impacto detallado">
      <p>{user?.nombre} — análisis de impacto</p>
      <button onClick={onClose}>Cerrar análisis</button>
    </section>
  ) : null,
}));

const dashboardStats = {
  proyectos: { total: 4, activos: 3, trend: '+2' },
  productos: { total: 7, verificados: 5, trend: '+1' },
  aprendices: { total: 6, activos: 5 },
  investigadores: 3,
  tareas_criticas: {
    vencidas: [{ id: 'late-1', titulo: 'Entregar informe', proyecto: 'Proyecto ADSO', fecha: '2026-09-10T12:00:00Z' }],
    proximas: [{ id: 'soon-1', titulo: 'Revisar prototipo', proyecto: 'Proyecto CGAO', fecha: '2026-10-10T12:00:00Z' }],
  },
  historial_reciente: [{ id: 'event-1', usuario: 'Miguel', descripcion: 'Actualizó el proyecto', fecha: '2026-09-20T12:00:00Z' }],
};

const seedDocumentApis = ({ documents = [], projects = [] } = {}) => {
  DocumentosAPI.list.mockResolvedValue(documents);
  ProyectosAPI.list.mockResolvedValue(projects);
  DocumentosAPI.getViewUrl.mockImplementation((id) => `/documentos/${id}/ver`);
};

describe('DashboardModule: acciones y paneles por rol', () => {
  beforeEach(() => {
    DashboardAPI.getStats.mockResolvedValue(dashboardStats);
    DashboardAPI.getAnalyticsEvolucion.mockResolvedValue([{ mes_nombre: 'Sep', proyectos_nuevos: 2, productos_nuevos: 3 }]);
    DashboardAPI.getUserImpact.mockResolvedValue({
      proyectos_count: 2, productos_count: 6, semilleros_count: 1, aprendices_count: 4, cumplimiento: 82,
    });
    vi.spyOn(window, 'print').mockImplementation(() => {});
  });

  it('ejecuta accesos institucionales, tareas y búsqueda del administrador', async () => {
    const onModuleAction = vi.fn();
    const onOpenSearch = vi.fn();
    const onNewProject = vi.fn();
    render(<DashboardModule currentUser={{ id: 'admin-1', nombre: 'Administradora', rol: 'admin' }} onModuleAction={onModuleAction} onOpenSearch={onOpenSearch} onNewProject={onNewProject} />);

    expect(await screen.findByText('Entregar informe')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Buscar/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Reportes CGAO' }));
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Proyecto/i }));
    fireEvent.click(screen.getByText('Proyectos Totales Centro'));
    fireEvent.click(screen.getByText('Productos Minciencias'));
    fireEvent.click(screen.getByText('Investigadores'));
    fireEvent.click(screen.getByText('Aprendices en Semilleros'));
    fireEvent.click(screen.getByText('Entregar informe'));
    fireEvent.click(screen.getByText('Revisar prototipo').closest('.cursor-pointer'));
    fireEvent.click(screen.getByRole('button', { name: /Control y Monitoreo CvLAC/i }));
    fireEvent.click(screen.getByRole('button', { name: /Registro de Auditoría en Vivo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Consolidado SIGP/i }));
    fireEvent.click(screen.getByRole('button', { name: /Configuración del Sistema/i }));

    expect(onOpenSearch).toHaveBeenCalledOnce();
    expect(onNewProject).toHaveBeenCalledOnce();
    expect(onModuleAction.mock.calls.map(([action]) => action.module)).toEqual([
      'reportes', 'proyectos', 'productos', 'investigadores', 'aprendices', 'cronograma', 'cronograma', 'cvlac-admin', 'auditoria', 'reportes', 'configuracion',
    ]);
    expect(screen.getByText('Miguel')).toBeInTheDocument();
  });

  it('muestra el portafolio del investigador, genera el reporte y abre/cierra el análisis de impacto', async () => {
    const onModuleAction = vi.fn();
    const onNotify = vi.fn();
    const onOpenSearch = vi.fn();
    const onNewProject = vi.fn();
    render(<DashboardModule currentUser={{ id: 'staff-1', nombre: 'Ana Investigadora', rol: 'investigador' }} onModuleAction={onModuleAction} onNotify={onNotify} onOpenSearch={onOpenSearch} onNewProject={onNewProject} />);

    expect(await screen.findByText('Optimizar Cumplimiento')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Búsqueda/ }));
    fireEvent.click(screen.getByRole('button', { name: /Reporte GTH-F-074/i }));
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Proyecto/i }));
    fireEvent.click(screen.getByText('Entregar informe'));
    fireEvent.click(screen.getByText('Mis Proyectos I+D+i').closest('[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Mis Productos Minciencias').closest('[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Avance documental').closest('[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Aprendices Tutelados').closest('[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Impacto 360').closest('[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByRole('button', { name: 'Ver Mis Proyectos' }));

    expect(window.print).toHaveBeenCalledOnce();
    expect(onNotify).toHaveBeenCalledWith('Generando reporte institucional del mes...', 'info');
    expect(onOpenSearch).toHaveBeenCalledOnce();
    expect(onNewProject).toHaveBeenCalledOnce();
    expect(onModuleAction.mock.calls.map(([action]) => action.module)).toEqual(['cronograma', 'proyectos', 'productos', 'proyectos', 'aprendices', 'proyectos']);
    expect(await screen.findByText('Ana Investigadora — análisis de impacto')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar análisis' }));
    await waitFor(() => expect(screen.queryByText('Ana Investigadora — análisis de impacto')).not.toBeInTheDocument());
  });

  it('ejecuta accesos de proyectos, cronograma, retos y repositorio para el aprendiz', async () => {
    const onModuleAction = vi.fn();
    render(<DashboardModule currentUser={{ id: 'learner-1', nombre: 'Aprendiz', rol: 'aprendiz' }} onModuleAction={onModuleAction} />);
    await waitFor(() => expect(document.body.textContent).toContain('Hola, Aprendiz'));
    fireEvent.click(screen.getByRole('button', { name: 'Ver mis proyectos' }));
    fireEvent.click(screen.getByRole('button', { name: /Mis Tareas y Entregables/i }));
    fireEvent.click(screen.getByRole('button', { name: /Explorar Retos CGAO/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver Cronograma' }));
    fireEvent.click(screen.getByText('Semillero Vinculado').closest('[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Proyectos Asignados').closest('[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByText('Avance documental').closest('[class*="cursor-pointer"]'));
    fireEvent.click(screen.getByRole('button', { name: /Ver Perfil Completo/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Explorar Banco de Retos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver proyectos' }));
    expect(screen.queryByText(/Formatos de etapa productiva/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Documentos del centro').closest('button'));
    expect(onModuleAction.mock.calls.map(([action]) => action.module)).toEqual([
      'proyectos', 'cronograma', 'retos', 'cronograma', 'semilleros', 'proyectos', 'proyectos', 'perfil', 'retos', 'proyectos', 'repositorio',
    ]);
    expect(DashboardAPI.getAnalyticsEvolucion).not.toHaveBeenCalled();
  });

  it('conserva el panel de investigación cuando fallan las consultas de datos', async () => {
    DashboardAPI.getStats.mockRejectedValue(new Error('estadísticas no disponibles'));
    DashboardAPI.getAnalyticsEvolucion.mockRejectedValue(new Error('analítica no disponible'));
    DashboardAPI.getUserImpact.mockRejectedValue(new Error('impacto no disponible'));
    render(<DashboardModule currentUser={{ id: 'staff-error', nombre: 'Investigador', rol: 'investigador' }} />);
    await waitFor(() => expect(document.body.textContent).toContain('Hola, Investigador'));
    await waitFor(() => expect(DashboardAPI.getUserImpact).toHaveBeenCalledWith('staff-error'));
    expect(screen.getByText('Impacto 360')).toBeInTheDocument();
    expect(screen.queryByText(/no disponibles/)).not.toBeInTheDocument();
  });

});

describe('DocumentCenterModule: filtros, descargas y carga de evidencias', () => {
  beforeEach(() => {
    seedDocumentApis({
      projects: [{ id: 'project-1', codigo_sgps: 'SGPS-26', nombre: 'Proyecto de investigación', equipo: ['Equipo base'] }],
    });
    vi.spyOn(window, 'open').mockImplementation(() => {});
  });

  it('filtra evidencias, consulta normatividad y no muestra modelos internos', async () => {
    seedDocumentApis({
      documents: [
        { id: 'doc-1', nombre_archivo: 'acta-inicio.pdf', descripcion: 'Acta de proyecto', tipo: 'acta', entidad_tipo: 'proyecto', entidad_id: 'project-1', owner_id: 'admin-1', content_type: 'application/pdf', created_at: '2026-09-01T12:00:00Z' },
        { id: 'doc-2', nombre_archivo: 'informe.xlsx', descripcion: 'Balance financiero', tipo: 'informe', entidad_tipo: 'general', owner_id: 'other', content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', created_at: '2026-09-02T12:00:00Z' },
        { id: 'doc-3', nombre_archivo: 'foto.png', tipo: 'evidencia', entidad_tipo: 'general', owner_id: 'other', content_type: 'image/png', created_at: '2026-09-03T12:00:00Z' },
        { id: 'doc-4', nombre_archivo: 'nota.txt', tipo: 'evidencia', entidad_tipo: 'general', owner_id: 'other', content_type: 'text/plain', created_at: '2026-09-04T12:00:00Z' },
      ],
      projects: [{ id: 'project-1', codigo_sgps: 'SGPS-26', nombre: 'Proyecto de investigación' }],
    });
    render(<DocumentCenterModule currentUser={{ id: 'admin-1', rol: 'admin' }} />);

    expect(await screen.findByRole('button', { name: /Bóveda de Evidencias CGAO/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Modelos de referencia/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/etapa productiva|bitácora/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Guías & Normatividad Minciencias/i }));
    expect(screen.getByText('Criterios de Homologación y Tipologías Minciencias')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Bóveda de Evidencias CGAO/i }));
    expect(screen.getByText('acta-inicio.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Informes' }));
    expect(screen.getByText('informe.xlsx')).toBeInTheDocument();
    expect(screen.queryByText('acta-inicio.pdf')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Todos' }));
    fireEvent.change(screen.getByPlaceholderText('Buscar archivo...'), { target: { value: 'acta' } });
    expect(screen.getByText('acta-inicio.pdf')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Buscar archivo...'), { target: { value: 'sin resultados' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cargar Nueva Evidencia' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText('Buscar archivo...'), { target: { value: '' } });
    fireEvent.change(screen.getByDisplayValue('Todos los proyectos (1)'), { target: { value: 'project-1' } });
    expect(screen.getByText('acta-inicio.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Vista en tarjetas'));
    fireEvent.click(screen.getByTitle('Previsualizar / Detalles'));
    expect(await screen.findByText('Formato MIME')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar ventana modal' }));
    fireEvent.click(screen.getByTitle('Vista en tabla'));
    expect(screen.getByRole('table')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Ver Detalles'));
    expect(await screen.findByText('Formato MIME')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir en Nueva Pestaña' }));
    expect(window.open).toHaveBeenCalledWith('/documentos/doc-1/ver', '_blank');
    fireEvent.click(screen.getByRole('button', { name: 'Descargar Archivo' }));
    expect(DocumentosAPI.download).toHaveBeenCalledWith('doc-1');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar ventana modal' }));
    fireEvent.click(screen.getByTitle('Descargar'));
    await waitFor(() => expect(DocumentosAPI.download).toHaveBeenCalledWith('doc-1'));
    fireEvent.click(screen.getByTitle('Eliminar'));
  });

  it('valida la carga, almacena evidencia general y usa las rutas de descarga y eliminación', async () => {
    const onNotify = vi.fn();
    seedDocumentApis({
      documents: [{ id: 'download-1', nombre_archivo: 'descarga.pdf', tipo: 'evidencia', entidad_tipo: 'general', owner_id: 'admin-1', content_type: 'application/pdf', created_at: '2026-09-01T12:00:00Z' }],
      projects: [{ id: 'project-1', codigo_sgps: 'SGPS-26', nombre: 'Proyecto de investigación' }],
    });
    DocumentosAPI.upload.mockResolvedValue({});
    DocumentosAPI.download.mockResolvedValue({});
    DocumentosAPI.delete.mockResolvedValue({});
    const createObjectURL = vi.fn().mockReturnValue('blob:documento');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    render(<DocumentCenterModule currentUser={{ id: 'admin-1', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('button', { name: /Bóveda de Evidencias CGAO/i });

    fireEvent.click(screen.getByRole('button', { name: /Subir Evidencia/i }));
    const uploadDialog = screen.getByRole('dialog');
    fireEvent.submit(uploadDialog.querySelector('form'));
    expect(onNotify).toHaveBeenCalledWith('Seleccione un archivo para cargar', 'warning');
    fireEvent.click(within(uploadDialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Subir Evidencia/i }));
    const reopenedUploadDialog = screen.getByRole('dialog');
    fireEvent.change(reopenedUploadDialog.querySelector('#vault-file-input'), { target: { files: [new File(['pdf'], 'soporte.pdf', { type: 'application/pdf' })] } });
    const uploadSelects = reopenedUploadDialog.querySelectorAll('select');
    fireEvent.change(uploadSelects[0], { target: { value: 'informe' } });
    fireEvent.change(uploadSelects[1], { target: { value: 'general' } });
    fireEvent.change(reopenedUploadDialog.querySelector('textarea'), { target: { value: '  Informe del centro  ' } });
    fireEvent.click(within(reopenedUploadDialog).getByRole('button', { name: /Almacenar en Bóveda/i }));
    await waitFor(() => expect(DocumentosAPI.upload).toHaveBeenCalledOnce());
    const uploadPayload = DocumentosAPI.upload.mock.calls[0][0];
    expect(uploadPayload.get('entidad_tipo')).toBe('general');
    expect(uploadPayload.get('entidad_id')).toBe('admin-1');
    expect(uploadPayload.get('tipo')).toBe('informe');
    expect(uploadPayload.get('descripcion')).toBe('Informe del centro');
    expect(await screen.findByRole('button', { name: /Bóveda de Evidencias CGAO/ })).toBeInTheDocument();
    expect(onNotify).toHaveBeenCalledWith('Documento almacenado correctamente en el repositorio CGAO', 'success');

    fireEvent.click(screen.getByRole('button', { name: /Subir Evidencia/i }));
    const projectUploadDialog = screen.getByRole('dialog');
    fireEvent.change(projectUploadDialog.querySelector('#vault-file-input'), { target: { files: [new File(['acta'], 'acta.pdf', { type: 'application/pdf' })] } });
    const projectUploadSelects = projectUploadDialog.querySelectorAll('select');
    fireEvent.change(projectUploadSelects[1], { target: { value: 'proyecto' } });
    const currentProjectUploadDialog = screen.getByRole('dialog');
    const projectSelect = currentProjectUploadDialog.querySelectorAll('select')[2];
    fireEvent.change(projectSelect, { target: { value: 'project-1' } });
    expect(projectSelect).toHaveValue('project-1');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Almacenar en Bóveda/i }));
    await waitFor(() => expect(DocumentosAPI.upload).toHaveBeenCalledTimes(2));
    expect(DocumentosAPI.upload.mock.calls[1][0].get('entidad_tipo')).toBe('proyecto');
    expect(DocumentosAPI.upload.mock.calls[1][0].get('entidad_id')).toBe('project-1');

    DocumentosAPI.download.mockResolvedValue({ data_base64: btoa('PDF'), content_type: 'application/pdf' });
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await screen.findByText('descarga.pdf');
    fireEvent.click(screen.getByTitle('Descargar'));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalledOnce());
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:documento');
    expect(onNotify).toHaveBeenCalledWith('Archivo descargado con éxito', 'success');
    fireEvent.click(screen.getByTitle('Eliminar de la bóveda'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(DocumentosAPI.delete).toHaveBeenCalledWith('download-1'));
    expect(onNotify).toHaveBeenCalledWith('Documento eliminado de la bóveda', 'success');
  });

  it('muestra fallos de carga y deriva errores de descarga y generación al usuario', async () => {
    const onNotify = vi.fn();
    DocumentosAPI.list.mockRejectedValue(new Error('sin conexión'));
    ProyectosAPI.list.mockRejectedValue(new Error('sin conexión'));
    render(<DocumentCenterModule currentUser={{ id: 'admin-1', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('button', { name: /Bóveda de Evidencias CGAO/i });

    cleanup();
    seedDocumentApis({
      documents: [{ id: 'doc-err', nombre_archivo: 'error.pdf', tipo: 'evidencia', entidad_tipo: 'general', owner_id: 'admin-1', created_at: '2026-09-01T12:00:00Z' }],
      projects: [{ id: 'project-1', nombre: 'Proyecto CGAO' }],
    });
    DocumentosAPI.download.mockRejectedValue(new Error('falló la descarga'));
    DocumentosAPI.delete.mockRejectedValue(new Error('sin autorización'));
    render(<DocumentCenterModule currentUser={{ id: 'admin-1', rol: 'admin' }} onNotify={onNotify} />);
    fireEvent.click(await screen.findByRole('button', { name: /Bóveda de Evidencias CGAO/ }));
    await screen.findByText('error.pdf');
    fireEvent.click(screen.getByTitle('Descargar'));
    await waitFor(() => expect(window.open).toHaveBeenCalledWith('/documentos/doc-err/ver', '_blank'));
    fireEvent.click(screen.getByTitle('Eliminar de la bóveda'));
    const deleteDialog = screen.getByRole('dialog');
    fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Eliminar' }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al eliminar documento: sin autorización', 'error'));
    fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Cancelar' }));

  });
});

describe('PerfilModule: edición, CVLAC y seguridad de cuenta', () => {
  const currentUser = {
    id: 'staff-1', nombre: 'Miguel Pérez', email: 'miguel@example.test', rol: 'investigador',
    rol_sennova: 'Investigador Principal', nivel_academico: 'Maestría', telefono: '3000000000', extension: '123',
    sede: 'Vélez', regional: 'Santander', horas_mensuales: 80, meses_vinculacion: 12,
    cv_lac_url: 'https://scienti.minciencias.gov.co/cvlac/visualizador/test', estado_cv_lac: 'Actualizado',
    lineas_investigacion: ['Agroindustria', 'Software'],
  };

  beforeEach(() => {
    AuthAPI.getMe.mockResolvedValue(currentUser);
    CVLACAPI.estadoUsuario.mockResolvedValue({ tiene_pdf: true, documento_id: 'cv-1', nombre: 'Miguel', ultima_actualizacion: '2026-09-01T12:00:00Z' });
    CVLACAPI.validarURL.mockResolvedValue({ es_valida: true });
    CVLACAPI.importar.mockResolvedValue({ importados: 3 });
  });

  it('guarda datos y líneas de investigación, valida y sincroniza CvLAC', async () => {
    const onUpdateUser = vi.fn(async payload => ({ ...currentUser, ...payload }));
    const onNotify = vi.fn();
    render(<PerfilModule currentUser={currentUser} onUpdateUser={onUpdateUser} onNotify={onNotify} />);
    expect(await screen.findByText('CVLAC_Miguel.pdf')).toBeInTheDocument();
    expect(await screen.findByLabelText('URL válida')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Editar Perfil/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('button', { name: /Editar Perfil/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Editar Perfil/i }));
    fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Miguel Pérez Rueda' } });
    fireEvent.change(screen.getByLabelText('Rol SENNOVA'), { target: { value: 'Líder de Semillero' } });
    fireEvent.change(screen.getByLabelText('Teléfono'), { target: { value: '3109876543' } });
    fireEvent.change(screen.getByLabelText('Extensión'), { target: { value: '456' } });
    fireEvent.change(screen.getByLabelText('Horas mensuales'), { target: { value: '96' } });
    fireEvent.change(screen.getByLabelText('Meses de vinculación'), { target: { value: '18' } });
    fireEvent.change(screen.getByLabelText('Nivel académico'), { target: { value: 'Doctorado' } });
    fireEvent.change(screen.getByLabelText('URL CVLAC'), { target: { value: 'https://scienti.minciencias.gov.co/cvlac/visualizador/actualizado' } });
    const profileSelects = document.querySelectorAll('select');
    fireEvent.change(profileSelects[2], { target: { value: 'Desactualizado' } });
    expect(screen.getByLabelText('Teléfono')).toHaveValue('3109876543');
    expect(screen.getByLabelText('Extensión')).toHaveValue('456');
    fireEvent.change(screen.getByPlaceholderText(/Nueva línea/i), { target: { value: 'Agrotecnología' } });
    fireEvent.keyDown(screen.getByPlaceholderText(/Nueva línea/i), { key: 'Enter', code: 'Enter' });
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar línea "Software"' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));

    await waitFor(() => expect(onUpdateUser).toHaveBeenCalledOnce());
    expect(onUpdateUser).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Miguel Pérez Rueda', rol_sennova: 'Líder de Semillero', nivel_academico: 'Doctorado',
      horas_mensuales: 96, meses_vinculacion: 18,
      cv_lac_url: 'https://scienti.minciencias.gov.co/cvlac/visualizador/actualizado', estado_cv_lac: 'Desactualizado',
      lineas_investigacion: ['Agroindustria', 'Agrotecnología'],
    }));
    expect(onNotify).toHaveBeenCalledWith('Perfil actualizado correctamente', 'success');
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Miguel Pérez Rueda');

    fireEvent.click(screen.getByRole('button', { name: 'Sincronizar' }));
    await waitFor(() => expect(CVLACAPI.importar).toHaveBeenCalledWith('https://scienti.minciencias.gov.co/cvlac/visualizador/actualizado'));
    expect(onNotify).toHaveBeenCalledWith('¡Éxito! Se importaron 3 productos desde tu CVLaC.', 'success');
  });

  it('rechaza contraseñas inválidas, carga solo PDF de hasta 10 MB y permite eliminar el CV', async () => {
    const onNotify = vi.fn();
    CVLACAPI.estadoUsuario.mockResolvedValueOnce({ tiene_pdf: false }).mockResolvedValue({ tiene_pdf: true, documento_id: 'cv-1', nombre: 'Miguel', ultima_actualizacion: '2026-09-01T12:00:00Z' });
    AuthAPI.changePassword.mockResolvedValue({});
    DocumentosAPI.delete.mockResolvedValue({});
    CVLACAPI.subirPDF.mockResolvedValue({});
    render(<PerfilModule currentUser={currentUser} onNotify={onNotify} />);
    expect(await screen.findByText('No hay CVLAC subido')).toBeInTheDocument();

    const passwordInputs = document.querySelectorAll('form input[type="password"]');
    fireEvent.change(passwordInputs[0], { target: { value: 'anterior' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'nueva123' } });
    fireEvent.change(passwordInputs[2], { target: { value: 'distinta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Contraseña' }));
    expect(await screen.findByText('Las contraseñas nuevas no coinciden')).toBeInTheDocument();
    fireEvent.change(passwordInputs[1], { target: { value: '123' } });
    fireEvent.change(passwordInputs[2], { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Contraseña' }));
    expect(await screen.findByText('La nueva contraseña debe tener al menos 6 caracteres')).toBeInTheDocument();
    fireEvent.change(passwordInputs[1], { target: { value: 'nueva123' } });
    fireEvent.change(passwordInputs[2], { target: { value: 'nueva123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Contraseña' }));
    await waitFor(() => expect(AuthAPI.changePassword).toHaveBeenCalledWith('anterior', 'nueva123'));
    expect(onNotify).toHaveBeenCalledWith('Contraseña actualizada correctamente', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Editar Perfil' }));
    const fileInput = document.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'grande.pdf', { type: 'application/pdf' })] } });
    expect(onNotify).toHaveBeenCalledWith('El archivo no puede superar 10 MB', 'error');
    fireEvent.change(fileInput, { target: { files: [new File(['imagen'], 'imagen.png', { type: 'image/png' })] } });
    expect(onNotify).toHaveBeenCalledWith('Solo se permiten archivos PDF', 'error');
    const pdf = new File(['%PDF-1.7'], 'curriculum.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [pdf] } });
    await waitFor(() => expect(CVLACAPI.subirPDF).toHaveBeenCalledWith(pdf, 'staff-1'));
    expect(onNotify).toHaveBeenCalledWith('CVLAC subido correctamente', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar CVLAC' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar CVLAC' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar CVLAC' }));
    await waitFor(() => expect(DocumentosAPI.delete).toHaveBeenCalledWith('cv-1'));
    expect(onNotify).toHaveBeenCalledWith('CVLAC eliminado', 'success');
    expect(screen.getByText('No hay CVLAC subido')).toBeInTheDocument();
  });

  it('actualiza los campos formativos propios del perfil de aprendiz', async () => {
    const apprentice = {
      id: 'learner-1', nombre: 'Lina Gómez', email: 'lina@example.test', rol: 'aprendiz',
      documento: '100200300', celular: '3001112233', ficha: '2876543', programa_formacion: 'ADSO',
    };
    AuthAPI.getMe.mockResolvedValue(apprentice);
    CVLACAPI.estadoUsuario.mockResolvedValue({ tiene_pdf: false });
    render(<PerfilModule currentUser={apprentice} />);
    await screen.findByText('No hay CVLAC subido');

    fireEvent.click(screen.getByRole('button', { name: 'Editar Perfil' }));
    fireEvent.change(screen.getByLabelText('Número de Documento'), { target: { value: '100200301' } });
    fireEvent.change(screen.getByLabelText('Número de Celular'), { target: { value: '3112223344' } });
    fireEvent.change(screen.getByLabelText('Ficha de Caracterización'), { target: { value: '2876544' } });
    fireEvent.change(screen.getByLabelText('Programa de Formación'), { target: { value: 'Análisis y Desarrollo de Software' } });
    expect(screen.getByLabelText('Número de Documento')).toHaveValue('100200301');
    expect(screen.getByLabelText('Número de Celular')).toHaveValue('3112223344');
    expect(screen.getByLabelText('Ficha de Caracterización')).toHaveValue('2876544');
    expect(screen.getByLabelText('Programa de Formación')).toHaveValue('Análisis y Desarrollo de Software');
  });

  it('retira el mensaje de una operación cuando vence su tiempo de visualización', async () => {
    render(<PerfilModule currentUser={currentUser} />);
    await screen.findByText('CVLAC_Miguel.pdf');
    await screen.findByLabelText('URL válida');
    vi.useFakeTimers();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sincronizar' }));
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Se importaron 3 productos');
    act(() => vi.advanceTimersByTime(4000));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('expone fallos del guardado, validación e importación del CvLAC y cambio de clave', async () => {
    const onNotify = vi.fn();
    const onUpdateUser = vi.fn().mockRejectedValue(new Error('servicio no disponible'));
    CVLACAPI.validarURL.mockRejectedValue(new Error('falló validación'));
    CVLACAPI.importar.mockRejectedValue(new Error('falló importación'));
    AuthAPI.changePassword.mockRejectedValue(new Error('clave anterior incorrecta'));
    render(<PerfilModule currentUser={currentUser} onUpdateUser={onUpdateUser} onNotify={onNotify} />);
    expect(await screen.findByText('CVLAC_Miguel.pdf')).toBeInTheDocument();
    expect(await screen.findByLabelText('URL inválida')).toBeInTheDocument();
    expect(screen.getByText(/URL inválida\. Formato esperado/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sincronizar' }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al sincronizar: falló importación', 'error'));

    fireEvent.click(screen.getByRole('button', { name: 'Editar Perfil' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al guardar: servicio no disponible', 'error'));
    const passwordInputs = document.querySelectorAll('form input[type="password"]');
    fireEvent.change(passwordInputs[0], { target: { value: 'incorrecta' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'nueva123' } });
    fireEvent.change(passwordInputs[2], { target: { value: 'nueva123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Contraseña' }));
    expect(await screen.findByText('clave anterior incorrecta')).toBeInTheDocument();
  });
});

describe('AuditoriaModule: consulta, filtros, exportación y depuración', () => {
  beforeEach(() => {
    AuditAPI.getActividades.mockResolvedValue([{ id: 'activity-1', user_nombre: 'Ana', tipo_accion: 'CREAR', descripcion: 'Creó proyecto CGAO', ip_address: '127.0.0.1', created_at: '2026-09-20T12:00:00Z' }]);
    AuditAPI.getLogs.mockResolvedValue([{ id: 'log-1', user_nombre: 'Luis', method: 'PATCH', endpoint: '/proyectos/1', status_code: 404, created_at: '2026-09-21T12:00:00Z' }]);
    AuditAPI.getStats.mockResolvedValue({ total_logs: 12, total_actividades: 8, tasa_error: 3.25, actividades_resumen: { crear_proyecto: 4 } });
    AuditAPI.exportLogsUrl.mockImplementation(kind => `/exportar?tipo=${kind}`);
    vi.spyOn(window, 'open').mockImplementation(() => {});
  });

  it('busca, cambia entre actividades y logs, exporta, actualiza y depura los registros', async () => {
    const onNotify = vi.fn();
    AuditAPI.cleanup.mockResolvedValue({ deleted_logs: 2, deleted_activities: 3 });
    render(<AuditoriaModule onNotify={onNotify} />);
    expect((await screen.findAllByText('Creó proyecto CGAO')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /^Actividades$/i }));
    fireEvent.change(screen.getByPlaceholderText('Búsqueda rápida...'), { target: { value: 'ana' } });
    expect(screen.getAllByText('Creó proyecto CGAO').length).toBeGreaterThan(0);
    expect(screen.queryByText('Sin registros')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Búsqueda rápida...'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Logs Técnicos/i }));
    expect((await screen.findAllByText('/proyectos/1')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('404').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByPlaceholderText('Búsqueda rápida...'), { target: { value: 'ausente' } });
    expect(screen.queryAllByText('/proyectos/1')).toHaveLength(0);
    fireEvent.change(screen.getByPlaceholderText('Búsqueda rápida...'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Exportar Logs/i }));
    expect(AuditAPI.exportLogsUrl).toHaveBeenCalledWith('logs');
    expect(window.open).toHaveBeenCalledWith('/exportar?tipo=logs', '_blank');
    expect(onNotify).toHaveBeenCalledWith('Exportación iniciada', 'success');
    fireEvent.click(screen.getByRole('button', { name: 'Refrescar' }));
    await waitFor(() => expect(AuditAPI.getLogs).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Depurar/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: /Depurar/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, Depurar' }));
    await waitFor(() => expect(AuditAPI.cleanup).toHaveBeenCalledWith(30));
    expect(onNotify).toHaveBeenCalledWith('Limpieza exitosa. Se eliminaron 2 logs y 3 actividades antiguas.', 'success');
  });

  it('anexa lotes y comunica errores de consulta y limpieza', async () => {
    const onNotify = vi.fn();
    AuditAPI.getActividades.mockResolvedValue(Array.from({ length: 50 }, (_, index) => ({
      id: `activity-${index}`, user_nombre: `Aprendiz ${index}`, tipo_accion: 'ACTUALIZAR', descripcion: `Actividad ${index}`,
    })));
    AuditAPI.getStats.mockResolvedValue({ total_logs: 0, total_actividades: 50, tasa_error: 7.25 });
    const { rerender } = render(<AuditoriaModule onNotify={onNotify} />);
    expect((await screen.findAllByText(/Actividad 0$/)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Cargar más registros' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más registros' }));
    await waitFor(() => expect(AuditAPI.getActividades).toHaveBeenLastCalledWith({ limit: 50, skip: 50 }));
    expect((await screen.findAllByText(/Actividad 49$/)).length).toBeGreaterThan(0);

    AuditAPI.cleanup.mockRejectedValue(new Error('falló limpieza'));
    fireEvent.click(screen.getByRole('button', { name: /Depurar/i }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí, Depurar' }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al depurar logs antiguos', 'error'));

    AuditAPI.getLogs.mockRejectedValue(new Error('sin acceso'));
    fireEvent.click(screen.getByRole('button', { name: /Logs Técnicos/i }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al cargar datos de auditoría', 'error'));
    rerender(<AuditoriaModule onNotify={onNotify} />);
    expect(screen.getByText('Centro de Control y Auditoría')).toBeInTheDocument();
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
