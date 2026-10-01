import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AuditoriaModule from '../components/admin/AuditoriaModule';
import CVLACAdminModule from '../components/admin/CVLACAdminModule';
import StatisticsModule from '../components/dashboard/StatisticsModule';
import ReportesModule from '../components/reports/ReportesModule';
import { formatCurrency } from '../components/reports/ReportesModule';
import ConfiguracionModule from '../components/settings/ConfiguracionModule';

vi.mock('../api/audit', () => ({
  AuditAPI: {
    getActividades: vi.fn(), getLogs: vi.fn(), getStats: vi.fn(),
    exportLogsUrl: vi.fn(), cleanup: vi.fn(),
  },
}));
vi.mock('../api/cvlac', () => ({
  CVLACAPI: { resumenSistema: vi.fn() },
}));
vi.mock('../api/usuarios', () => ({
  UsuariosAPI: { list: vi.fn(), update: vi.fn() },
}));
vi.mock('../api/notificaciones', () => ({
  NotificacionesAPI: { alertarCVLACDesactualizados: vi.fn() },
}));
vi.mock('../api/dashboard', () => ({
  DashboardAPI: { getStats: vi.fn(), getAnalyticsEvolucion: vi.fn() },
}));
vi.mock('../api/proyectos', () => ({
  ProyectosAPI: { list: vi.fn() },
}));
vi.mock('../api/reportes', () => ({
  ReportesAPI: {
    getEstadisticasResumen: vi.fn(),
    descargarConsolidadoProyectos: vi.fn(), descargarConsolidadoGrupos: vi.fn(),
    descargarConsolidadoProductos: vi.fn(), descargarConsolidadoSemilleros: vi.fn(),
    descargarConsolidadoTalento: vi.fn(),
  },
}));
vi.mock('../api/auth', () => ({
  AuthAPI: { updateMe: vi.fn(), logout: vi.fn(), changePassword: vi.fn() },
}));
vi.mock('../api/system', () => ({
  SystemAPI: { getHealth: vi.fn(), getBackup: vi.fn(), clearCache: vi.fn() },
}));

import { AuditAPI } from '../api/audit';
import { CVLACAPI } from '../api/cvlac';
import { UsuariosAPI } from '../api/usuarios';
import { NotificacionesAPI } from '../api/notificaciones';
import { DashboardAPI } from '../api/dashboard';
import { ProyectosAPI } from '../api/proyectos';
import { ReportesAPI } from '../api/reportes';
import { AuthAPI } from '../api/auth';
import { SystemAPI } from '../api/system';

const projects = [
  { id: 'p1', nombre: 'Proyecto agrícola', estado: 'Aprobado', tipologia: 'I+D', presupuesto_total: 2500000 },
  { id: 'p2', nombre: 'Proyecto de riego', estado: 'En ejecución', tipologia: 'Innovación', presupuesto_total: 500000 },
];

beforeEach(() => {
  vi.clearAllMocks();
  AuditAPI.getActividades.mockResolvedValue([
    { id: 'a1', user_nombre: 'Ana López', tipo_accion: 'ACTUALIZAR', descripcion: 'Actualizó un proyecto', created_at: '2026-09-01T12:30:00Z' },
  ]);
  AuditAPI.getLogs.mockResolvedValue([
    { id: 'l1', user_nombre: 'Carlos Ruiz', method: 'POST', endpoint: '/api/proyectos', status_code: 201, created_at: '2026-09-02T13:30:00Z' },
    { id: 'l2', user_nombre: 'Elena Díaz', method: 'UNKNOWN', endpoint: '/api/health', status_code: 503 },
  ]);
  AuditAPI.getStats.mockResolvedValue({ total_logs: 3, total_actividades: 4, tasa_error: 2.3 });
  AuditAPI.exportLogsUrl.mockReturnValue('/audit/export');
  AuditAPI.cleanup.mockResolvedValue({ deleted_logs: 2, deleted_activities: 1 });
  UsuariosAPI.list.mockResolvedValue([
    { id: 'u1', nombre: 'Laura Investigadora', email: 'laura@sena.edu.co', rol: 'investigador', estado_cv_lac: 'Sin CVLAC' },
    { id: 'u2', nombre: 'Pedro Investigador', email: 'pedro@sena.edu.co', rol: 'investigador', estado_cv_lac: 'Desactualizado' },
    { id: 'u3', nombre: 'Aprendiz excluido', email: 'aprendiz@sena.edu.co', rol: 'aprendiz', estado_cv_lac: 'Sin CVLAC' },
  ]);
  CVLACAPI.resumenSistema.mockResolvedValue({ porcentaje_actualizados: 50 });
  UsuariosAPI.update.mockResolvedValue({ ok: true });
  NotificacionesAPI.alertarCVLACDesactualizados.mockResolvedValue({ message: 'Alertas enviadas', total_notificados: 2 });
  DashboardAPI.getStats.mockResolvedValue({ total_proyectos: 2, productos: 3, investigadores: 4 });
  DashboardAPI.getAnalyticsEvolucion.mockResolvedValue({ meses: [], series: [] });
  ProyectosAPI.list.mockResolvedValue(projects);
  ReportesAPI.getEstadisticasResumen.mockResolvedValue({
    proyectos: { trend: 5, presupuesto_trend: 3 },
    totales: { productos: 3, investigadores: 4 },
  });
  for (const fn of [
    ReportesAPI.descargarConsolidadoProyectos,
    ReportesAPI.descargarConsolidadoGrupos,
    ReportesAPI.descargarConsolidadoProductos,
    ReportesAPI.descargarConsolidadoSemilleros,
    ReportesAPI.descargarConsolidadoTalento,
  ]) fn.mockResolvedValue({ filename: 'reporte.xlsx' });
  AuthAPI.updateMe.mockResolvedValue({ nombre: 'Laura Actualizada' });
  AuthAPI.logout.mockResolvedValue({});
  SystemAPI.getHealth.mockResolvedValue({ status: 'healthy' });
  SystemAPI.getBackup.mockResolvedValue({});
  SystemAPI.clearCache.mockResolvedValue({});
  vi.stubGlobal('open', vi.fn());
  vi.spyOn(window, 'print').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('administración CVLAC y auditoría', () => {
  it('filtra aprendices, busca investigadores y envía alertas pendientes', async () => {
    const onNotify = vi.fn();
    render(<CVLACAdminModule currentUser={{ id: 'admin-1', rol: 'admin' }} onNotify={onNotify} />);

    expect(await screen.findByRole('heading', { name: 'Panel de Administración CVLAC' })).toBeVisible();
    expect(screen.getByText('Laura Investigadora')).toBeVisible();
    expect(screen.getByText('Pedro Investigador')).toBeVisible();
    expect(screen.queryByText('Aprendiz excluido')).not.toBeInTheDocument();
    expect(screen.getAllByText('Sin CVLAC').length).toBeGreaterThan(1);

    fireEvent.change(screen.getByPlaceholderText('Nombre o email...'), { target: { value: 'Laura' } });
    expect(screen.getByText('Laura Investigadora')).toBeVisible();
    expect(screen.queryByText('Pedro Investigador')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Nombre o email...'), { target: { value: '' } });
    fireEvent.change(document.querySelector('#cvlac-filter'), { target: { value: 'desactualizado' } });
    expect(screen.getAllByText('Pedro Investigador').length).toBeGreaterThan(0);
    expect(screen.queryByText('Laura Investigadora')).not.toBeInTheDocument();
    fireEvent.change(document.querySelector('#cvlac-filter'), { target: { value: 'todos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Editar estado CVLAC de Laura Investigadora' }));
    expect(screen.getByRole('heading', { name: 'Actualizar Estado CVLAC' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ventana modal' }));
    expect(screen.queryByRole('heading', { name: 'Actualizar Estado CVLAC' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar estado CVLAC de Laura Investigadora' }));
    fireEvent.change(screen.getAllByLabelText('Estado CVLAC').at(-1), { target: { value: 'Actualizado' } });
    fireEvent.change(screen.getByLabelText('URL CVLAC'), { target: { value: 'https://scienti.example/laura' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(UsuariosAPI.update).toHaveBeenCalledWith('u1', {
      estado_cv_lac: 'Actualizado',
      cv_lac_url: 'https://scienti.example/laura',
    }));
    expect(onNotify).toHaveBeenCalledWith('Estado CVLAC actualizado', 'success');

    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Alertas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Notificaciones' }));
    await waitFor(() => expect(NotificacionesAPI.alertarCVLACDesactualizados).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Alertas enviadas')).toBeVisible();
    expect(screen.getByText('Total notificados: 2')).toBeVisible();
    const clearAlertTimer = timeoutSpy.mock.calls.find(([, delay]) => delay === 5000)?.[0];
    expect(clearAlertTimer).toBeTypeOf('function');
    act(() => clearAlertTimer());
    expect(screen.queryByText('Alertas enviadas')).not.toBeInTheDocument();
  });

  it('informa el fallo al enviar alertas de CVLAC', async () => {
    const onNotify = vi.fn();
    NotificacionesAPI.alertarCVLACDesactualizados.mockRejectedValueOnce(new Error('servicio de alertas fuera de línea'));
    render(<CVLACAdminModule currentUser={{ id: 'admin-1', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Panel de Administración CVLAC' });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Alertas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar Notificaciones' }));

    await waitFor(() => expect(onNotify).toHaveBeenCalledWith(
      'Error enviando alertas: servicio de alertas fuera de línea',
      'error',
    ));
  });

  it('permite cancelar la edición CVLAC y el envío de alertas', async () => {
    render(<CVLACAdminModule currentUser={{ id: 'admin-1', rol: 'admin' }} onNotify={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Panel de Administración CVLAC' });
    fireEvent.click(screen.getByRole('button', { name: 'Editar estado CVLAC de Laura Investigadora' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: 'Actualizar Estado CVLAC' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Enviar Alertas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: '¿Enviar Alertas de CVLAC?' })).not.toBeInTheDocument();
  });

  it('carga actividades y logs, filtra la tabla, exporta y depura registros', async () => {
    const onNotify = vi.fn();
    render(<AuditoriaModule onNotify={onNotify} />);

    expect(await screen.findByRole('heading', { name: 'Centro de Control y Auditoría' })).toBeVisible();
    expect(screen.getAllByText('Ana López').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Actualizó un proyecto').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Logs Técnicos/i }));
    expect((await screen.findAllByText('/api/proyectos')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('POST').length).toBeGreaterThan(0);
    expect(screen.getAllByText('201').length).toBeGreaterThan(0);
    expect(screen.getAllByText('503').length).toBeGreaterThan(0);

    fireEvent.change(screen.getByPlaceholderText('Búsqueda rápida...'), { target: { value: 'Elena' } });
    expect(screen.getAllByText('Elena Díaz').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('/api/proyectos')).toHaveLength(0);
    fireEvent.click(screen.getByRole('button', { name: /Exportar Logs/i }));
    expect(AuditAPI.exportLogsUrl).toHaveBeenCalledWith('logs');
    expect(open).toHaveBeenCalledWith('/audit/export', '_blank');

    fireEvent.click(screen.getByRole('button', { name: /Depurar/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, Depurar' }));
    await waitFor(() => expect(AuditAPI.cleanup).toHaveBeenCalledWith(30));
    expect(onNotify).toHaveBeenCalledWith('Limpieza exitosa. Se eliminaron 2 logs y 1 actividades antiguas.', 'success');
  });

  it('carga páginas adicionales en actividades y logs y permite cancelar la depuración', async () => {
    const activities = Array.from({ length: 50 }, (_, index) => ({
      id: `a-${index}`, user_nombre: `Usuario ${index}`, tipo_accion: 'CREAR',
      descripcion: `Actividad ${index}`, created_at: '2026-09-01T12:30:00Z',
    }));
    const logs = Array.from({ length: 50 }, (_, index) => ({
      id: `l-${index}`, user_nombre: `Técnico ${index}`, method: 'PATCH',
      endpoint: `/api/recurso/${index}`, status_code: 204,
    }));
    AuditAPI.getActividades.mockResolvedValueOnce(activities).mockResolvedValueOnce(
      activities.map((activity) => ({ ...activity, id: `a-next-${activity.id}` })),
    );
    AuditAPI.getLogs.mockResolvedValueOnce(logs).mockResolvedValueOnce(
      logs.map((log) => ({ ...log, id: `l-next-${log.id}` })),
    );
    AuditAPI.getStats.mockResolvedValue({
      total_logs: 100,
      total_actividades: 50,
      tasa_error: 0,
      actividades_resumen: { ACTUALIZAR_ESTADO: 7, CREAR: 43 },
    });
    render(<AuditoriaModule onNotify={vi.fn()} />);

    expect(await screen.findByText('ACTUALIZAR ESTADO')).toBeVisible();
    expect(screen.getByText('7')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más registros' }));
    await waitFor(() => expect(AuditAPI.getActividades).toHaveBeenLastCalledWith({ limit: 50, skip: 50 }));

    fireEvent.click(screen.getByRole('button', { name: /Logs Técnicos/i }));
    expect(await screen.findAllByText('/api/recurso/0')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Cargar más registros' }));
    await waitFor(() => expect(AuditAPI.getLogs).toHaveBeenLastCalledWith({ limit: 50, skip: 50 }));

    fireEvent.click(screen.getByRole('button', { name: /Depurar/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(AuditAPI.cleanup).not.toHaveBeenCalled();
  });
});

describe('analítica institucional y reportes', () => {
  it('filtra proyectos por periodo, recarga datos e imprime el consolidado', async () => {
    const { container } = render(<StatisticsModule onNotify={vi.fn()} />);
    expect(await screen.findByRole('heading', { name: 'Analítica SENNOVA' })).toBeVisible();
    expect(screen.getByText('Estado de la Cartera')).toBeVisible();
    expect(screen.getByText('Proyectos Totales')).toBeVisible();
    fireEvent.change(container.querySelector('select'), { target: { value: '3M' } });
    expect(container.querySelector('select')).toHaveValue('3M');
    fireEvent.click(screen.getByRole('button', { name: /Generar Reporte PDF/i }));
    expect(window.print).toHaveBeenCalledTimes(1);
    fireEvent.click(container.querySelectorAll('button')[0]);
    await waitFor(() => expect(DashboardAPI.getStats).toHaveBeenCalledTimes(2));
  });

  it('firma el informe y genera cada consolidado desde el catálogo', async () => {
    const onNotify = vi.fn();
    render(<ReportesModule currentUser={{ id: 'investigator-123', rol: 'investigador' }} onNotify={onNotify} />);
    expect(await screen.findByRole('heading', { name: 'Centro de Reportes & Analítica' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /Firmar/i }));
    expect(onNotify).toHaveBeenCalledWith(expect.stringMatching(/SENN-INVESTIG/), 'success');
    fireEvent.click(screen.getByRole('button', { name: /Consolidados/i }));

    const generateButtons = screen.getAllByRole('button', { name: /GENERAR/i });
    expect(generateButtons).toHaveLength(5);
    for (const button of generateButtons) {
      await act(async () => {
        fireEvent.click(button);
        await Promise.resolve();
      });
    }
    await waitFor(() => expect(ReportesAPI.descargarConsolidadoProyectos).toHaveBeenCalled());
    expect(ReportesAPI.descargarConsolidadoGrupos).toHaveBeenCalled();
    expect(ReportesAPI.descargarConsolidadoProductos).toHaveBeenCalled();
    expect(ReportesAPI.descargarConsolidadoSemilleros).toHaveBeenCalled();
    expect(ReportesAPI.descargarConsolidadoTalento).toHaveBeenCalled();
    expect(onNotify).toHaveBeenCalledWith(expect.stringMatching(/reporte "reporte.xlsx"/), 'success');
  });

  it('imprime, cambia entre vistas y aplica el formato CSV a los consolidados', async () => {
    const onNotify = vi.fn();
    render(<ReportesModule currentUser={{ id: 'user-1', rol: 'investigador' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Centro de Reportes & Analítica' });
    fireEvent.click(screen.getByTitle('Imprimir Reporte'));
    expect(window.print).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: /Consolidados/i }));
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'csv' } });
    fireEvent.click(screen.getAllByRole('button', { name: /GENERAR/i })[0]);
    await waitFor(() => expect(ReportesAPI.descargarConsolidadoProyectos).toHaveBeenCalledWith(
      new Date().getFullYear(), 'csv',
    ));
    fireEvent.click(screen.getByRole('button', { name: /Analítica/i }));
    expect(screen.getByText('Estado de la Cartera')).toBeVisible();
  });

  it('formatea valores monetarios con separadores colombianos', () => {
    expect(formatCurrency(1250000)).toBe('$1.250.000');
  });
});

describe('configuración según el rol', () => {
  it('permite actualizar perfil a todos los roles y muestra infraestructura solo a administración', async () => {
    const onNotify = vi.fn();
    const onUpdateUser = vi.fn();
    const learner = { id: 'learner-1', nombre: 'Laura Aprendiz', email: 'laura@sena.edu.co', rol: 'aprendiz', ficha: '3141592' };
    const { container, rerender } = render(<ConfiguracionModule currentUser={learner} onNotify={onNotify} onUpdateUser={onUpdateUser} />);
    expect(screen.getByRole('heading', { name: 'Control de Sistema' })).toBeVisible();
    expect(screen.getByDisplayValue('3141592')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Infraestructura' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Laura Aprendiz'), { target: { value: 'Laura Actualizada' } });
    const profileInputs = container.querySelectorAll('input');
    fireEvent.change(profileInputs[1], { target: { value: '12345678' } });
    fireEvent.change(profileInputs[2], { target: { value: '3001234567' } });
    fireEvent.change(profileInputs[3], { target: { value: '1234567' } });
    fireEvent.change(profileInputs[4], { target: { value: 'Análisis de Software' } });
    fireEvent.change(profileInputs[5], { target: { value: 'https://scienti.example/laura' } });
    fireEvent.change(container.querySelector('select'), { target: { value: 'Tecnólogo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Perfil' }));
    await waitFor(() => expect(AuthAPI.updateMe).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Laura Actualizada',
      nivel_academico: 'Tecnólogo',
      documento: '12345678',
      celular: '3001234567',
      ficha: '1234567',
      programa_formacion: 'Análisis de Software',
      cv_lac_url: 'https://scienti.example/laura',
    })));
    expect(onUpdateUser).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Notificaciones' }));
    const preferences = container.querySelectorAll('input[type="checkbox"]');
    expect(preferences).toHaveLength(4);
    for (const preference of preferences) fireEvent.click(preference);
    expect([...preferences].every((preference) => preference.checked === false)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /Cerrar Sesión/i }));
    expect(AuthAPI.logout).toHaveBeenCalledTimes(1);

    rerender(<ConfiguracionModule currentUser={{ id: 'admin-1', nombre: 'Admin', email: 'admin@sena.edu.co', rol: 'admin' }} onNotify={onNotify} />);
    fireEvent.click(screen.getByRole('button', { name: 'Infraestructura' }));
    expect(await screen.findByText('Herramientas de Recuperación')).toBeVisible();
    fireEvent.click(screen.getByText('Exportar Dump SQL'));
    await waitFor(() => expect(SystemAPI.getBackup).toHaveBeenCalled());
    fireEvent.click(screen.getByText('Limpiar Caché RAG'));
    await waitFor(() => expect(SystemAPI.clearCache).toHaveBeenCalled());
  });

  it('permite cambiar contraseña y solicitar baja desde las opciones de seguridad', async () => {
    AuthAPI.changePassword.mockResolvedValue({ ok: true });
    const onNotify = vi.fn();
    render(<ConfiguracionModule currentUser={{ id: 'staff-1', nombre: 'Instructora', rol: 'investigador' }} onNotify={onNotify} />);
    fireEvent.click(screen.getByRole('button', { name: 'Seguridad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar Contraseña' }));
    expect(screen.getAllByText('Cambiar Contraseña').length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseñas' }));
    const passwordFields = screen.getAllByLabelText(/contraseña/i).filter((field) => field.tagName === 'INPUT');
    expect(passwordFields.map((field) => field.labels?.[0]?.textContent)).toEqual([
      expect.stringContaining('Contraseña actual'),
      expect.stringContaining('Nueva contraseña'),
      expect.stringContaining('Confirmar nueva contraseña'),
    ]);
    expect(passwordFields.every((field) => field.type === 'text')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseñas' }));
    expect(passwordFields.every((field) => field.type === 'password')).toBe(true);
    fireEvent.change(passwordFields[0], { target: { value: 'anterior123' } });
    fireEvent.change(passwordFields[1], { target: { value: 'NuevaClave123!' } });
    fireEvent.change(passwordFields[2], { target: { value: 'NuevaClave123!' } });
    fireEvent.click(screen.getByRole('button', { name: /Actualizar Contraseña/i }));
    await waitFor(() => expect(AuthAPI.changePassword).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar Baja' }));
    expect(onNotify).toHaveBeenCalledWith(expect.stringMatching(/contacta al administrador/), 'info');
  });

  it('valida la contraseña antes de llamar al servicio y muestra fallos del servidor', async () => {
    AuthAPI.changePassword.mockRejectedValue(new Error('El servicio rechazó el cambio'));
    render(<ConfiguracionModule currentUser={{ id: 'staff-2', nombre: 'Instructor', rol: 'investigador' }} onNotify={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Seguridad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar Contraseña' }));
    const passwordFields = screen.getAllByLabelText(/contraseña/i).filter((field) => field.tagName === 'INPUT');
    const submit = screen.getByRole('button', { name: 'Actualizar Contraseña' });

    fireEvent.click(submit);
    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa tu contraseña actual');
    fireEvent.change(passwordFields[0], { target: { value: 'actual123' } });
    fireEvent.change(passwordFields[1], { target: { value: 'corta' } });
    fireEvent.change(passwordFields[2], { target: { value: 'corta' } });
    fireEvent.click(submit);
    expect(screen.getByRole('alert')).toHaveTextContent('La nueva contraseña debe tener al menos 6 caracteres');
    fireEvent.change(passwordFields[1], { target: { value: 'nueva123' } });
    fireEvent.change(passwordFields[2], { target: { value: 'otra1234' } });
    fireEvent.click(submit);
    expect(screen.getByRole('alert')).toHaveTextContent('La confirmación no coincide con la nueva contraseña');
    fireEvent.change(passwordFields[2], { target: { value: 'nueva123' } });
    fireEvent.click(submit);

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('El servicio rechazó el cambio'));
    expect(AuthAPI.changePassword).toHaveBeenCalledWith('actual123', 'nueva123');
  });
});
