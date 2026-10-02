import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFetchAPI } = vi.hoisted(() => ({ mockFetchAPI: vi.fn() }));
vi.mock('../api/config', () => ({
  API_URL: '/api',
  fetchAPI: mockFetchAPI,
}));

import { NotificacionesAPI } from '../api/notificaciones';
import { EntregablesAPI } from '../api/entregables';
import { GruposAPI } from '../api/grupos';
import { SemillerosAPI } from '../api/semilleros';
import { ReportesAPI } from '../api/reportes';
import { StatsAPI } from '../api/stats';
import { ProyectosAPI } from '../api/proyectos';
import { DashboardAPI } from '../api/dashboard';
import { ProductosAPI } from '../api/productos';
import { RetosAPI } from '../api/retos';
import { UsuariosAPI } from '../api/usuarios';
import { ConvocatoriasAPI } from '../api/convocatorias';
import { DocumentosAPI } from '../api/documentos';
import { CVLACAPI, CvlacAPI } from '../api/cvlac';
import { PlantillasAPI } from '../api/plantillas';
import { AprendicesAPI } from '../api/aprendices';
import { SystemAPI } from '../api/system';

const responseValue = { resultado: 'recibido' };

async function expectRequest(client, method, args, endpoint, options) {
  mockFetchAPI.mockResolvedValueOnce(responseValue);
  await expect(client[method](...args)).resolves.toBe(responseValue);
  const expectedCall = options === undefined ? [endpoint] : [endpoint, options];
  expect(mockFetchAPI).toHaveBeenLastCalledWith(...expectedCall);
}

function json(method, body) {
  return { method, body: JSON.stringify(body) };
}

function multipart(method, body) {
  return { method, body };
}

function downloadResponse({ ok = true, disposition = 'attachment; filename="evidencia.csv"' } = {}) {
  return {
    ok,
    headers: { get: vi.fn(() => disposition) },
    blob: vi.fn(async () => new Blob(['reporte'])),
    json: vi.fn(async () => ({ total: 8 })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mockFetchAPI.mockResolvedValue(responseValue);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(downloadResponse()));
  Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:reporte') });
  Object.defineProperty(window.URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe('contratos de clientes API sin cobertura', () => {
  it('cubre filtros, mutaciones y alias de notificaciones', async () => {
    await expectRequest(NotificacionesAPI, 'listar', [true, 12, 4], '/notificaciones/?solo_no_leidas=true&limite=12&skip=4');
    await expectRequest(NotificacionesAPI, 'listar', ['no_leidas', 8], '/notificaciones/?solo_no_leidas=true&limite=8');
    await expectRequest(NotificacionesAPI, 'listar', ['leidas'], '/notificaciones/?leida=true&limite=50');
    await expectRequest(NotificacionesAPI, 'listar', [{ leida: true }, 3], '/notificaciones/?leida=true&limite=3');
    await expectRequest(NotificacionesAPI, 'listar', [{ solo_no_leidas: true, leida: false }, 5], '/notificaciones/?solo_no_leidas=true&leida=false&limite=5');
    await expectRequest(NotificacionesAPI, 'listar', [{ otro: true }], '/notificaciones/?limite=50');
    await expectRequest(NotificacionesAPI, 'getStats', [], '/notificaciones/stats');
    await expectRequest(NotificacionesAPI, 'obtener', ['n-1'], '/notificaciones/n-1');
    await expectRequest(NotificacionesAPI, 'marcarLeida', ['n-1', false], '/notificaciones/n-1/marcar-leida', json('PUT', { leida: false }));
    await expectRequest(NotificacionesAPI, 'marcarTodasLeidas', [], '/notificaciones/marcar-todas-leidas', { method: 'POST' });
    await expectRequest(NotificacionesAPI, 'eliminar', ['n-1'], '/notificaciones/n-1', { method: 'DELETE' });
    await expectRequest(NotificacionesAPI, 'checkPendientes', [], '/notificaciones/check/pendientes');
    await expectRequest(NotificacionesAPI, 'limpiarLeidas', [14], '/notificaciones/limpiar-leidas?dias_retencion=14', { method: 'POST' });
    await expectRequest(NotificacionesAPI, 'alertarCVLACDesactualizados', [], '/notificaciones/cvlac/alertar-desactualizados', { method: 'POST' });
    await expectRequest(NotificacionesAPI, 'getCVLACPendientes', [], '/notificaciones/cvlac/pendientes');
    await expectRequest(NotificacionesAPI, 'enviarMensaje', [{ user_id: 'u-1', mensaje: 'Hola' }], '/notificaciones/enviar-mensaje', json('POST', { user_id: 'u-1', mensaje: 'Hola' }));
    await expectRequest(NotificacionesAPI, 'crearSistema', ['u-1', 'Alerta', 'Texto', 'alta', 'proyecto', 'p-2'], '/notificaciones/crear-sistema?user_id=u-1&titulo=Alerta&mensaje=Texto&prioridad=alta&entidad_tipo=proyecto&entidad_id=p-2', { method: 'POST' });
    await expectRequest(NotificacionesAPI, 'crearSistema', ['u-1', 'Alerta', 'Texto'], '/notificaciones/crear-sistema?user_id=u-1&titulo=Alerta&mensaje=Texto&prioridad=normal', { method: 'POST' });
    await expectRequest(NotificacionesAPI, 'list', [true, 6], '/notificaciones/?solo_no_leidas=true&limite=6');
    await expectRequest(NotificacionesAPI, 'get', ['n-2'], '/notificaciones/n-2');
    await expectRequest(NotificacionesAPI, 'delete', ['n-2'], '/notificaciones/n-2', { method: 'DELETE' });
    await expectRequest(NotificacionesAPI, 'markAsRead', ['n-2', false], '/notificaciones/n-2/marcar-leida', json('PUT', { leida: false }));
    await expectRequest(NotificacionesAPI, 'markAllAsRead', [], '/notificaciones/marcar-todas-leidas', { method: 'POST' });
    await expectRequest(NotificacionesAPI, 'cleanRead', [60], '/notificaciones/limpiar-leidas?dias_retencion=60', { method: 'POST' });
    await expectRequest(NotificacionesAPI, 'sendMessage', [{ user_id: 'u-2' }], '/notificaciones/enviar-mensaje', json('POST', { user_id: 'u-2' }));
  });

  it('cubre consultas, estados y alias de entregables', async () => {
    await expectRequest(EntregablesAPI, 'listarPorProyecto', ['p-1'], '/entregables/proyecto/p-1');
    await expectRequest(EntregablesAPI, 'listarMisEntregables', [true], '/entregables/mis-entregables?pendientes_only=true');
    await expectRequest(EntregablesAPI, 'listarMisEntregables', [], '/entregables/mis-entregables?');
    await expectRequest(EntregablesAPI, 'obtener', ['e-1'], '/entregables/e-1');
    await expectRequest(EntregablesAPI, 'crear', [{ nombre: 'Informe' }], '/entregables', json('POST', { nombre: 'Informe' }));
    await expectRequest(EntregablesAPI, 'crear', [{ nombre: 'Informe', responsable_id: '', producto_id: '' }], '/entregables', json('POST', { nombre: 'Informe', responsable_id: null, producto_id: null }));
    await expectRequest(EntregablesAPI, 'actualizar', ['e-1', { nombre: 'Final' }], '/entregables/e-1', json('PUT', { nombre: 'Final' }));
    await expectRequest(EntregablesAPI, 'actualizar', ['e-1', { nombre: 'Final', responsable_id: '', producto_id: '' }], '/entregables/e-1', json('PUT', { nombre: 'Final', responsable_id: null, producto_id: null }));
    await expectRequest(EntregablesAPI, 'eliminar', ['e-1'], '/entregables/e-1', { method: 'DELETE' });
    await expectRequest(EntregablesAPI, 'cambiarEstado', ['e-1', 'Completado', 'Listo'], '/entregables/e-1/cambiar-estado?nuevo_estado=Completado&observaciones=Listo', { method: 'POST' });
    await expectRequest(EntregablesAPI, 'cambiarEstado', ['e-2', 'Pendiente'], '/entregables/e-2/cambiar-estado?nuevo_estado=Pendiente', { method: 'POST' });
    await expectRequest(EntregablesAPI, 'alertasProximos', [7], '/entregables/alertas/proximos?dias=7');
    await expectRequest(EntregablesAPI, 'generarDesdePlantilla', ['p-1'], '/entregables/proyecto/p-1/generate-template', { method: 'POST' });
    await expectRequest(EntregablesAPI, 'list', ['p-1'], '/entregables/proyecto/p-1');
    await expectRequest(EntregablesAPI, 'get', ['e-2'], '/entregables/e-2');
    await expectRequest(EntregablesAPI, 'create', [{ nombre: 'Tarea' }], '/entregables', json('POST', { nombre: 'Tarea' }));
    await expectRequest(EntregablesAPI, 'update', ['e-2', { estado: 'En curso' }], '/entregables/e-2', json('PUT', { estado: 'En curso' }));
    await expectRequest(EntregablesAPI, 'delete', ['e-2'], '/entregables/e-2', { method: 'DELETE' });
    await expectRequest(EntregablesAPI, 'changeStatus', ['e-2', 'Aprobado', 'Revisado'], '/entregables/e-2/cambiar-estado?nuevo_estado=Aprobado&observaciones=Revisado', { method: 'POST' });
  });

  it('cubre lecturas, normalización de integrantes, escritura y URL de grupos', async () => {
    await expectRequest(GruposAPI, 'list', [{ clasificacion: 'A' }], '/grupos?clasificacion=A');
    await expectRequest(GruposAPI, 'getAll', [], '/grupos');
    await expectRequest(GruposAPI, 'getAll', [{ activo: true }], '/grupos?activo=true');
    await expectRequest(GruposAPI, 'get', ['g-1'], '/grupos/g-1');
    await expectRequest(GruposAPI, 'create', [{ nombre: 'GIDTA' }], '/grupos', json('POST', { nombre: 'GIDTA' }));
    await expectRequest(GruposAPI, 'update', ['g-1', { nombre: 'GIDTA 2' }], '/grupos/g-1', json('PUT', { nombre: 'GIDTA 2' }));
    await expectRequest(GruposAPI, 'delete', ['g-1'], '/grupos/g-1', { method: 'DELETE' });
    mockFetchAPI.mockResolvedValueOnce([{ id: 'u-1' }]);
    await expect(GruposAPI.getMembers('g-1')).resolves.toEqual([{ id: 'u-1' }]);
    expect(mockFetchAPI).toHaveBeenLastCalledWith('/grupos/g-1/integrantes');
    mockFetchAPI.mockResolvedValueOnce({ integrantes: [{ id: 'u-2' }] });
    await expect(GruposAPI.getMembers('g-2')).resolves.toEqual([{ id: 'u-2' }]);
    mockFetchAPI.mockResolvedValueOnce({});
    await expect(GruposAPI.getMembers('g-3')).resolves.toEqual([]);
    await expectRequest(GruposAPI, 'addMember', ['g-1', { user_id: 'u-1', rol: 'Líder' }], '/grupos/g-1/integrantes', json('POST', { user_id: 'u-1', rol: 'Líder' }));
    await expectRequest(GruposAPI, 'removeMember', ['g-1', 'u-1'], '/grupos/g-1/integrantes/u-1', { method: 'DELETE' });
    await expectRequest(GruposAPI, 'getStats', ['g-1'], '/grupos/g-1/stats');
    await expectRequest(GruposAPI, 'getProyectos', ['g-1'], '/grupos/g-1/proyectos');
    const file = new File(['plan'], 'plan.pdf', { type: 'application/pdf' });
    mockFetchAPI.mockResolvedValueOnce(responseValue);
    await expect(GruposAPI.uploadPlanOperativo('g-1', file)).resolves.toBe(responseValue);
    const [uploadUrl, uploadOptions] = mockFetchAPI.mock.calls.at(-1);
    expect(uploadUrl).toBe('/grupos/g-1/plan-operativo');
    expect(uploadOptions.method).toBe('POST');
    expect(uploadOptions.body).toBeInstanceOf(FormData);
    expect(uploadOptions.body.get('file')).toBe(file);
    expect(GruposAPI.downloadPlanOperativoUrl('g-1')).toBe('/api/grupos/g-1/plan-operativo');
    expect(GruposAPI.getConsolidadoReporteUrl('csv')).toBe('/api/reportes/grupos-consolidado?formato=csv');
    expect(GruposAPI.getConsolidadoReporteUrl()).toBe('/api/reportes/grupos-consolidado?formato=excel');
  });

  it('cubre gestión de semilleros, aprendices e investigadores', async () => {
    await expectRequest(SemillerosAPI, 'list', [{ estado: 'activo' }], '/semilleros?estado=activo');
    await expectRequest(SemillerosAPI, 'list', [], '/semilleros?');
    await expectRequest(SemillerosAPI, 'get', ['s-1'], '/semilleros/s-1');
    await expectRequest(SemillerosAPI, 'create', [{ nombre: 'AgroTech' }], '/semilleros', json('POST', { nombre: 'AgroTech' }));
    await expectRequest(SemillerosAPI, 'update', ['s-1', { nombre: 'AgroTech 2' }], '/semilleros/s-1', json('PUT', { nombre: 'AgroTech 2' }));
    await expectRequest(SemillerosAPI, 'delete', ['s-1'], '/semilleros/s-1', { method: 'DELETE' });
    await expectRequest(SemillerosAPI, 'listAprendices', ['s-1'], '/semilleros/s-1/aprendices');
    await expectRequest(SemillerosAPI, 'addAprendiz', ['s-1', { user_id: 'a-1' }], '/semilleros/s-1/aprendices', json('POST', { user_id: 'a-1' }));
    await expectRequest(SemillerosAPI, 'addAprendizFull', ['s-1', { nombre: 'Ana' }], '/semilleros/s-1/aprendices/full', json('POST', { nombre: 'Ana' }));
    await expectRequest(SemillerosAPI, 'createAprendizFull', ['s-1', { nombre: 'Luis' }], '/semilleros/s-1/aprendices/full', json('POST', { nombre: 'Luis' }));
    await expectRequest(SemillerosAPI, 'updateAprendiz', ['s-1', 'a-1', { ficha: '123' }], '/semilleros/s-1/aprendices/a-1', json('PUT', { ficha: '123' }));
    await expectRequest(SemillerosAPI, 'deleteAprendiz', ['s-1', 'a-1'], '/semilleros/s-1/aprendices/a-1', { method: 'DELETE' });
    await expectRequest(SemillerosAPI, 'addInvestigador', ['s-1', { user_id: 'i-1' }], '/semilleros/s-1/investigadores', json('POST', { user_id: 'i-1' }));
    await expectRequest(SemillerosAPI, 'removeInvestigador', ['s-1', 'i-1'], '/semilleros/s-1/investigadores/i-1', { method: 'DELETE' });
    await expectRequest(SemillerosAPI, 'getStats', ['s-1'], '/stats/semillero/s-1/impact');
  });

  it('cubre estadísticas y alias del servicio de estadísticas', async () => {
    const calls = [
      ['getDashboard', [], '/stats/dashboard'], ['dashboard', [], '/stats/dashboard'],
      ['getAdmin', [], '/stats/admin'], ['admin', [], '/stats/admin'],
      ['getAnalyticsEvolucion', [6], '/stats/analytics/evolucion?meses=6'],
      ['analyticsEvolucion', [], '/stats/analytics/evolucion?meses=12'],
      ['getUserImpact', ['u-1'], '/stats/user/u-1/impact'], ['userImpact', ['u-2'], '/stats/user/u-2/impact'],
      ['globalSearch', ['riego inteligente'], '/stats/search/global?q=riego inteligente'],
      ['getSemilleroImpact', ['s-1'], '/stats/semillero/s-1/impact'], ['semilleroImpact', ['s-2'], '/stats/semillero/s-2/impact'],
      ['getAuditLogs', [{ skip: 4, action: 'login' }], '/stats/audit/logs?skip=4&action=login'],
      ['getAuditLogs', [], '/stats/audit/logs?'], ['getAuditSummary', [], '/stats/audit/summary'],
    ];
    for (const [method, args, endpoint] of calls) await expectRequest(StatsAPI, method, args, endpoint);
  });

  it('cubre operaciones, equipo y formularios multipart de proyectos', async () => {
    await expectRequest(ProyectosAPI, 'list', [{ estado: 'En ejecución' }], '/proyectos?estado=En+ejecuci%C3%B3n');
    await expectRequest(ProyectosAPI, 'get', ['p-1'], '/proyectos/p-1');
    await expectRequest(ProyectosAPI, 'create', [{ nombre: 'Riego' }], '/proyectos', json('POST', { nombre: 'Riego' }));
    const file = new File(['doc'], 'formulacion.docx');
    mockFetchAPI.mockResolvedValueOnce(responseValue);
    await expect(ProyectosAPI.analyzeFormulation(file)).resolves.toBe(responseValue);
    let [url, options] = mockFetchAPI.mock.calls.at(-1);
    expect(url).toBe('/proyectos/analizar-formulacion');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get('file')).toBe(file);
    const payload = { nombre: 'Riego inteligente' };
    mockFetchAPI.mockResolvedValueOnce(responseValue);
    await expect(ProyectosAPI.importFormulation(payload, file)).resolves.toBe(responseValue);
    [url, options] = mockFetchAPI.mock.calls.at(-1);
    expect(url).toBe('/proyectos/importar-formulacion');
    expect(options.method).toBe('POST');
    expect(options.body.get('proyecto')).toBe(JSON.stringify(payload));
    expect(options.body.get('file')).toBe(file);
    await expectRequest(ProyectosAPI, 'update', ['p-1', { estado: 'Activo' }], '/proyectos/p-1', json('PUT', { estado: 'Activo' }));
    await expectRequest(ProyectosAPI, 'delete', ['p-1'], '/proyectos/p-1', { method: 'DELETE' });
    await expectRequest(ProyectosAPI, 'addEquipo', ['p-1', 'u-1', 'Investigador', 40], '/proyectos/p-1/equipo', json('POST', { user_id: 'u-1', rol_en_proyecto: 'Investigador', horas_dedicadas: 40 }));
    await expectRequest(ProyectosAPI, 'asignarEquipo', ['p-1', 'u-2'], '/proyectos/p-1/equipo', json('POST', { user_id: 'u-2' }));
    await expectRequest(ProyectosAPI, 'asignarEquipo', ['p-1', { user_id: 'u-3', rol: 'Apoyo' }], '/proyectos/p-1/equipo', json('POST', { user_id: 'u-3', rol: 'Apoyo' }));
    await expectRequest(ProyectosAPI, 'removeEquipo', ['p-1', 'u-1'], '/proyectos/p-1/equipo/u-1', { method: 'DELETE' });
    await expectRequest(ProyectosAPI, 'checkLiquidacion', ['p-1'], '/proyectos/p-1/liquidar/check');
    await expectRequest(ProyectosAPI, 'getElaboracionStatus', ['p-1'], '/proyectos/p-1/elaboracion-status');
    await expectRequest(ProyectosAPI, 'generarPresupuesto', ['p-1'], '/proyectos/p-1/generate-budget-template', { method: 'POST' });
  });

  it('cubre datos y alias del dashboard', async () => {
    const calls = [
      ['getStats', [], '/stats/dashboard'], ['getAdminStats', [], '/stats/admin'],
      ['getAnalyticsEvolucion', [3], '/stats/analytics/evolucion?meses=3'],
      ['getUserImpact', ['u-1'], '/stats/user/u-1/impact'], ['stats', [], '/stats/dashboard'],
      ['adminStats', [], '/stats/admin'], ['analyticsEvolucion', [], '/stats/analytics/evolucion?meses=12'],
      ['globalSearch', ['a+b & c'], '/stats/search/global?q=a%2Bb%20%26%20c'],
      ['getAuditLogs', [2, 10, 'POST'], '/stats/audit/logs?skip=2&limit=10&method=POST'],
      ['getAuditLogs', [], '/stats/audit/logs?skip=0&limit=100'], ['getAuditSummary', [], '/stats/audit/summary'],
    ];
    for (const [method, args, endpoint] of calls) await expectRequest(DashboardAPI, method, args, endpoint);
  });

  it('cubre CRUD, verificación e importación de productos', async () => {
    await expectRequest(ProductosAPI, 'list', [{ categoria: 'A' }], '/productos?categoria=A');
    await expectRequest(ProductosAPI, 'get', ['pr-1'], '/productos/pr-1');
    await expectRequest(ProductosAPI, 'create', [{ nombre: 'Artículo' }], '/productos', json('POST', { nombre: 'Artículo' }));
    await expectRequest(ProductosAPI, 'update', ['pr-1', { nombre: 'Artículo nuevo' }], '/productos/pr-1', json('PUT', { nombre: 'Artículo nuevo' }));
    await expectRequest(ProductosAPI, 'delete', ['pr-1'], '/productos/pr-1', { method: 'DELETE' });
    await expectRequest(ProductosAPI, 'verificar', ['pr-1', true], '/productos/pr-1/verificar', json('POST', { is_verificado: true }));
    await expectRequest(ProductosAPI, 'stats', [], '/productos/stats/resumen');
    await expectRequest(ProductosAPI, 'misProductos', [], '/productos/mis-productos/list');
    await expectRequest(ProductosAPI, 'importCVLaC', ['https://cvlac.test/a?b=1&c=2'], '/cvlac/import?url=https%3A%2F%2Fcvlac.test%2Fa%3Fb%3D1%26c%3D2', { method: 'POST' });
    await expectRequest(ProductosAPI, 'generarDesdePlantilla', ['p-1'], '/productos/proyecto/p-1/generate-template', { method: 'POST' });
  });

  it('cubre verbos y alias en la API de retos', async () => {
    const calls = [
      ['list', [], '/retos'], ['listar', [], '/retos'], ['get', ['r-1'], '/retos/r-1'], ['obtener', ['r-2'], '/retos/r-2'],
      ['create', [{ titulo: 'Reto' }], '/retos', json('POST', { titulo: 'Reto' })], ['crear', [{ titulo: 'Otro' }], '/retos', json('POST', { titulo: 'Otro' })],
      ['update', ['r-1', { estado: 'cerrado' }], '/retos/r-1', json('PATCH', { estado: 'cerrado' })], ['actualizar', ['r-2', { estado: 'abierto' }], '/retos/r-2', json('PATCH', { estado: 'abierto' })],
      ['delete', ['r-1'], '/retos/r-1', { method: 'DELETE' }], ['eliminar', ['r-2'], '/retos/r-2', { method: 'DELETE' }],
    ];
    for (const [method, args, endpoint, options] of calls) await expectRequest(RetosAPI, method, args, endpoint, options);
  });

  it('cubre administración, estadísticas e historial de usuarios', async () => {
    await expectRequest(UsuariosAPI, 'list', [{ rol: 'investigador' }], '/usuarios?rol=investigador');
    await expectRequest(UsuariosAPI, 'get', ['u-1'], '/usuarios/u-1');
    await expectRequest(UsuariosAPI, 'create', [{ email: 'a@sena.edu.co' }], '/usuarios', json('POST', { email: 'a@sena.edu.co' }));
    await expectRequest(UsuariosAPI, 'update', ['u-1', { activo: false }], '/usuarios/u-1', json('PUT', { activo: false }));
    await expectRequest(UsuariosAPI, 'delete', ['u-1'], '/usuarios/u-1', { method: 'DELETE' });
    await expectRequest(UsuariosAPI, 'resetPassword', ['u-1', 'clave nueva&'], '/usuarios/u-1/reset-password?new_password=clave%20nueva%26', { method: 'POST' });
    await expectRequest(UsuariosAPI, 'toggleActive', ['u-1'], '/usuarios/u-1/toggle-active', { method: 'POST' });
    await expectRequest(UsuariosAPI, 'getStats', [], '/usuarios/stats/resumen');
    await expectRequest(UsuariosAPI, 'getActividad', ['u-1'], '/usuarios/u-1/actividad');
    await expectRequest(UsuariosAPI, 'getHistorial', ['u-1'], '/usuarios/u-1/historial');
  });

  it('cubre CRUD, listados activos y estadísticas de convocatorias', async () => {
    await expectRequest(ConvocatoriasAPI, 'list', [{ estado: 'activa' }], '/convocatorias?estado=activa');
    await expectRequest(ConvocatoriasAPI, 'get', ['c-1'], '/convocatorias/c-1');
    await expectRequest(ConvocatoriasAPI, 'create', [{ titulo: 'SENNOVA' }], '/convocatorias', json('POST', { titulo: 'SENNOVA' }));
    await expectRequest(ConvocatoriasAPI, 'update', ['c-1', { titulo: 'SENNOVA 2' }], '/convocatorias/c-1', json('PUT', { titulo: 'SENNOVA 2' }));
    await expectRequest(ConvocatoriasAPI, 'delete', ['c-1'], '/convocatorias/c-1', { method: 'DELETE' });
    await expectRequest(ConvocatoriasAPI, 'activas', [], '/convocatorias/activas/now');
    await expectRequest(ConvocatoriasAPI, 'getActivas', [], '/convocatorias/activas/now');
    await expectRequest(ConvocatoriasAPI, 'stats', [], '/convocatorias/stats/resumen');
    await expectRequest(ConvocatoriasAPI, 'getStats', [], '/convocatorias/stats/resumen');
  });

  it('cubre carga, descarga y URLs de documentos', async () => {
    await expectRequest(DocumentosAPI, 'list', [{ tipo: 'pdf' }], '/documentos?tipo=pdf');
    await expectRequest(DocumentosAPI, 'get', ['d-1'], '/documentos/d-1');
    const form = new FormData();
    form.append('archivo', new File(['pdf'], 'acta.pdf'));
    await expectRequest(DocumentosAPI, 'upload', [form], '/documentos/upload', multipart('POST', form));
    await expectRequest(DocumentosAPI, 'download', ['d-1'], '/documentos/d-1/download');
    await expectRequest(DocumentosAPI, 'delete', ['d-1'], '/documentos/d-1', { method: 'DELETE' });
    await expectRequest(DocumentosAPI, 'getUserCVLac', [], '/documentos/user/cvlac');
    await expectRequest(DocumentosAPI, 'getProyectoDocumentos', ['p-1'], '/documentos/proyecto/p-1/list');
    expect(DocumentosAPI.getViewUrl('d-1')).toBe('/api/documentos/d-1/view');
    expect(DocumentosAPI.getDownloadUrl('d-1')).toBe('/api/documentos/d-1/download');
  });

  it('cubre validación, carga e importación CVLAC y el alias de módulo', async () => {
    await expectRequest(CVLACAPI, 'validarURL', ['https://cvlac.test/perfil?a=1&b=2'], '/cvlac/validar-url?url=https%3A%2F%2Fcvlac.test%2Fperfil%3Fa%3D1%26b%3D2');
    await expectRequest(CVLACAPI, 'validarUrl', ['https://cvlac.test/otro'], '/cvlac/validar-url?url=https%3A%2F%2Fcvlac.test%2Fotro');
    const file = new File(['pdf'], 'cv.pdf', { type: 'application/pdf' });
    mockFetchAPI.mockResolvedValueOnce(responseValue);
    await expect(CVLACAPI.subirPDF(file, 'u-1')).resolves.toBe(responseValue);
    let [url, options] = mockFetchAPI.mock.calls.at(-1);
    expect(url).toBe('/cvlac/subir-pdf');
    expect(options.method).toBe('POST');
    expect(options.body.get('file')).toBe(file);
    expect(options.body.get('user_id')).toBe('u-1');
    mockFetchAPI.mockResolvedValueOnce(responseValue);
    await expect(CVLACAPI.subirPDF(file)).resolves.toBe(responseValue);
    options = mockFetchAPI.mock.calls.at(-1)[1];
    expect(options.body.has('user_id')).toBe(false);
    await expectRequest(CVLACAPI, 'estadoUsuario', ['u-1'], '/cvlac/usuarios/u-1/estado');
    await expectRequest(CVLACAPI, 'usuariosSinCVLAC', [], '/cvlac/usuarios/sin-cvlac');
    await expectRequest(CVLACAPI, 'importarProductos', ['u-1', [{ nombre: 'Artículo' }]], '/cvlac/importar-productos?user_id=u-1', json('POST', { productos: [{ nombre: 'Artículo' }] }));
    await expectRequest(CVLACAPI, 'importarProductos', ['u-2', { productos: [{ nombre: 'Libro' }], fuente: 'perfil' }], '/cvlac/importar-productos?user_id=u-2', json('POST', { productos: [{ nombre: 'Libro' }], fuente: 'perfil' }));
    await expectRequest(CVLACAPI, 'resumenSistema', [], '/cvlac/resumen-sistema');
    expect(CvlacAPI).toBe(CVLACAPI);
  });

  it('cubre generación de plantillas y reportes', async () => {
    await expectRequest(PlantillasAPI, 'generarCronograma', ['p-1'], '/plantillas/proyectos/p-1/cronograma-sennova', { method: 'POST' });
    await expectRequest(PlantillasAPI, 'getDatosCertificado', ['s-1', 'a-1'], '/plantillas/semilleros/s-1/certificado-aprendiz/a-1');
    await expectRequest(PlantillasAPI, 'getReporteMensual', ['u-1'], '/plantillas/usuarios/u-1/reporte-mensual');
    await expectRequest(PlantillasAPI, 'getReportePresupuesto', ['p-1'], '/plantillas/proyectos/p-1/presupuesto-detalle');
    await expectRequest(PlantillasAPI, 'getCertificadosMasivos', ['p-1'], '/plantillas/proyectos/p-1/certificados-masivos');
  });

  it('cubre el servicio global de aprendices', async () => {
    await expectRequest(AprendicesAPI, 'list', [{ semillero_id: 's-1', ficha: '123' }], '/aprendices?semillero_id=s-1&ficha=123');
    await expectRequest(AprendicesAPI, 'list', [], '/aprendices?');
    await expectRequest(AprendicesAPI, 'get', ['a-1'], '/aprendices/a-1');
    await expectRequest(AprendicesAPI, 'update', ['a-1', { activo: false }], '/aprendices/a-1', json('PUT', { activo: false }));
    await expectRequest(AprendicesAPI, 'delete', ['a-1'], '/aprendices/a-1', { method: 'DELETE' });
  });

  it('cubre mantenimiento, salud y errores propagados por el transporte', async () => {
    await expectRequest(SystemAPI, 'getBackup', [], '/maintenance/backup');
    await expectRequest(SystemAPI, 'clearCache', [], '/maintenance/clear-cache', { method: 'POST' });
    await expectRequest(SystemAPI, 'getHealth', [], '/health');
    mockFetchAPI.mockRejectedValueOnce(new Error('backend no disponible'));
    await expect(UsuariosAPI.get('u-1')).rejects.toThrow('backend no disponible');
    mockFetchAPI.mockRejectedValueOnce(new Error('reporte denegado'));
    await expect(PlantillasAPI.getReporteMensual('u-1')).rejects.toThrow('reporte denegado');
  });
});

describe('API de reportes y descargas', () => {
  it('cubre consultas de consolidados y estadísticas directas o de respaldo', async () => {
    await expectRequest(ReportesAPI, 'consolidadoProyectos', [{ año: 2026 }], '/reportes/proyectos-consolidado?a%C3%B1o=2026');
    await expectRequest(ReportesAPI, 'consolidadoGrupos', [{ activo: true }], '/reportes/grupos-consolidado?activo=true');
    await expectRequest(ReportesAPI, 'consolidadoProductos', [{ verificado: true }], '/reportes/productos-consolidado?verificado=true');
    await expectRequest(ReportesAPI, 'consolidadoSemilleros', [{ sede: 'Bogotá' }], '/reportes/semilleros-consolidado?sede=Bogot%C3%A1');
    mockFetchAPI.mockResolvedValueOnce({ total: 4 });
    await expect(ReportesAPI.getEstadisticasResumen()).resolves.toEqual({ total: 4 });
    expect(fetch).not.toHaveBeenCalled();
    mockFetchAPI.mockResolvedValueOnce(undefined);
    fetch.mockResolvedValueOnce(downloadResponse({ disposition: null }));
    await expect(ReportesAPI.getEstadisticasResumen()).resolves.toEqual({ total: 8 });
    expect(fetch).toHaveBeenLastCalledWith('/api/reportes/estadisticas-resumen', { headers: {} });
  });

  it('descarga los cinco consolidados, el certificado y propaga errores HTTP', async () => {
    localStorage.setItem('token', 'token-reportes');
    const downloads = [
      [() => ReportesAPI.descargarConsolidadoProyectos(2026, 'csv'), '/api/reportes/proyectos-consolidado?a%C3%B1o=2026&formato=csv', 'consolidado_proyectos.csv', null],
      [() => ReportesAPI.descargarConsolidadoGrupos('csv'), '/api/reportes/grupos-consolidado?formato=csv', 'grupos-final.csv', 'attachment; filename="grupos-final.csv"'],
      [() => ReportesAPI.descargarConsolidadoProductos(2026, true, 'csv'), '/api/reportes/productos-consolidado?a%C3%B1o=2026&verificados_only=true&formato=csv', 'evidencia.csv', 'attachment; filename="evidencia.csv"'],
      [() => ReportesAPI.descargarConsolidadoSemilleros('csv'), '/api/reportes/semilleros-consolidado?formato=csv', 'evidencia.csv', 'attachment; filename="evidencia.csv"'],
      [() => ReportesAPI.descargarConsolidadoTalento('csv'), '/api/reportes/talento-consolidado?formato=csv', 'consolidado_talento_sennova.csv', 'attachment; filename="evidencia.csv"'],
      [() => ReportesAPI.descargarCertificadoInvestigador('u-3'), '/api/reportes/investigador/u-3/certificado', 'certificado_investigacion_u-3.pdf', 'attachment; filename="evidencia.csv"'],
    ];
    for (const [download, url, filename, disposition] of downloads) {
      fetch.mockResolvedValueOnce(downloadResponse({ disposition }));
      await expect(download()).resolves.toEqual({ success: true, filename });
      expect(fetch).toHaveBeenLastCalledWith(url, { headers: { Authorization: 'Bearer token-reportes' } });
    }
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(downloads.length);
    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(downloads.length);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledTimes(downloads.length);
    expect(document.querySelectorAll('a')).toHaveLength(0);

    for (const [download, error] of [
      [() => ReportesAPI.descargarConsolidadoProyectos(), 'Error generando reporte de proyectos'],
      [() => ReportesAPI.descargarConsolidadoGrupos(), 'Error generando reporte de grupos'],
      [() => ReportesAPI.descargarConsolidadoProductos(), 'Error generando reporte de productos'],
      [() => ReportesAPI.descargarConsolidadoSemilleros(), 'Error generando reporte de semilleros'],
      [() => ReportesAPI.descargarConsolidadoTalento(), 'Error generando reporte de talento'],
      [() => ReportesAPI.descargarCertificadoInvestigador('u-4'), 'Error generando certificado'],
    ]) {
      fetch.mockResolvedValueOnce(downloadResponse({ ok: false }));
      await expect(download()).rejects.toThrow(error);
    }
    mockFetchAPI.mockRejectedValueOnce(new Error('servicio sin respuesta'));
    fetch.mockResolvedValueOnce({ ok: false });
    await expect(ReportesAPI.getEstadisticasResumen()).rejects.toThrow('Error obteniendo estadísticas');
  });
});

describe('transporte real de configuración de API', () => {
  it('cubre encabezados, normalización de rutas y resultados y errores HTTP', async () => {
    vi.doUnmock('../api/config');
    vi.resetModules();
    const { API_URL, fetchAPI, getHeaders, setAuthToken } = await import('../api/config');
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const okResponse = (body = { dato: true }) => ({
      status: 200,
      statusText: 'OK',
      ok: true,
      json: vi.fn().mockResolvedValue(body),
    });

    setAuthToken('token-pruebas');
    expect(getHeaders()).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer token-pruebas',
    });
    fetch.mockResolvedValueOnce(okResponse());
    await expect(fetchAPI('/productos')).resolves.toEqual({ dato: true });
    expect(fetch).toHaveBeenLastCalledWith(`${API_URL}/productos`, expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer token-pruebas' }),
    }));

    fetch.mockResolvedValueOnce(okResponse());
    await fetchAPI('/api/usuarios');
    const prefixedApiUrl = /^https?:\/\//i.test(API_URL)
      ? `${API_URL.replace(/\/+$/, '')}/api/usuarios`
      : `${window.location.origin}/api/usuarios`;
    expect(fetch).toHaveBeenLastCalledWith(prefixedApiUrl, expect.any(Object));
    fetch.mockResolvedValueOnce(okResponse());
    await fetchAPI('https://servicio.example/recurso');
    expect(fetch).toHaveBeenLastCalledWith('https://servicio.example/recurso', expect.any(Object));

    const form = new FormData();
    form.append('archivo', new Blob(['contenido']), 'prueba.txt');
    fetch.mockResolvedValueOnce(okResponse());
    await fetchAPI('/documentos', { method: 'POST', body: form });
    expect(fetch.mock.calls.at(-1)[1].headers).not.toHaveProperty('Content-Type');

    fetch.mockResolvedValueOnce({ status: 204, statusText: 'No Content', ok: true });
    await expect(fetchAPI('/productos/p-1', { method: 'DELETE' })).resolves.toBeNull();

    fetch.mockResolvedValueOnce({ status: 403, ok: false, json: vi.fn().mockResolvedValue({ detail: 'Sin permiso' }) });
    await expect(fetchAPI('/privado')).rejects.toThrow('Sin permiso');
    fetch.mockResolvedValueOnce({ status: 403, ok: false, json: vi.fn().mockRejectedValue(new Error('json inválido')) });
    await expect(fetchAPI('/privado-malformado')).rejects.toThrow('Forbidden');
    fetch.mockResolvedValueOnce({ status: 403, ok: false, json: vi.fn().mockResolvedValue({ detail: 'Not authenticated' }) });
    await expect(fetchAPI('/privado-sin-token')).rejects.toThrow('Not authenticated');
    fetch.mockResolvedValueOnce({
      status: 422,
      statusText: 'Unprocessable Entity',
      ok: false,
      json: vi.fn().mockResolvedValue({ detail: [{ msg: 'Falta el nombre' }, { message: 'El código no sirve' }] }),
    });
    await expect(fetchAPI('/validar')).rejects.toThrow('Falta el nombre. El código no sirve');
    fetch.mockResolvedValueOnce({ status: 400, ok: false, json: vi.fn().mockResolvedValue({ message: 'Entrada inválida' }) });
    await expect(fetchAPI('/entrada')).rejects.toThrow('Entrada inválida');
    fetch.mockResolvedValueOnce({ status: 500, ok: false, json: vi.fn().mockResolvedValue({}) });
    await expect(fetchAPI('/servidor')).rejects.toThrow('Error en la petición');
    fetch.mockResolvedValueOnce({
      status: 500,
      statusText: 'Error',
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('json inválido')),
    });
    await expect(fetchAPI('/servidor-malformado')).rejects.toThrow('Error 500: Error');

    fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(fetchAPI('/sin-red')).rejects.toThrow('No se puede conectar al servidor');
    setAuthToken(null);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(consoleError).toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalled();
  });
});
