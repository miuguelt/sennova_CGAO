import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockFetchAPI = vi.fn();
vi.mock('../api/config', () => ({
  fetchAPI: mockFetchAPI,
  setAuthToken: vi.fn(),
  getHeaders: vi.fn(() => ({ 'Content-Type': 'application/json' })),
  API_URL: '/api',
}));

async function getFreshImport(modulePath) {
  return await import(modulePath);
}

describe('API Modules', () => {
  beforeEach(() => {
    mockFetchAPI.mockReset();
  });

  describe('AprendicesAPI', () => {
    it('list calls fetchAPI with correct endpoint', async () => {
      const { AprendicesAPI } = await getFreshImport('../api/aprendices');
      mockFetchAPI.mockResolvedValue([]);
      await AprendicesAPI.list({ semillero_id: '123' });
      expect(mockFetchAPI).toHaveBeenCalledWith('/aprendices?semillero_id=123');
    });

    it('get calls fetchAPI with id', async () => {
      const { AprendicesAPI } = await getFreshImport('../api/aprendices');
      mockFetchAPI.mockResolvedValue({});
      await AprendicesAPI.get('abc-123');
      expect(mockFetchAPI).toHaveBeenCalledWith('/aprendices/abc-123');
    });

    it('update calls fetchAPI with PUT', async () => {
      const { AprendicesAPI } = await getFreshImport('../api/aprendices');
      mockFetchAPI.mockResolvedValue({});
      await AprendicesAPI.update('abc', { nombre: 'Test' });
      expect(mockFetchAPI).toHaveBeenCalledWith('/aprendices/abc', expect.objectContaining({ method: 'PUT' }));
    });

    it('delete calls fetchAPI with DELETE', async () => {
      const { AprendicesAPI } = await getFreshImport('../api/aprendices');
      mockFetchAPI.mockResolvedValue({});
      await AprendicesAPI.delete('abc');
      expect(mockFetchAPI).toHaveBeenCalledWith('/aprendices/abc', expect.objectContaining({ method: 'DELETE' }));
    });
  });

  describe('AuditAPI', () => {
    it('getLogs calls fetchAPI', async () => {
      const { AuditAPI } = await getFreshImport('../api/audit');
      mockFetchAPI.mockResolvedValue([]);
      await AuditAPI.getLogs({ limit: 10 });
      expect(mockFetchAPI).toHaveBeenCalledWith('/audit/logs?limit=10');
    });

    it('getActividades calls fetchAPI', async () => {
      const { AuditAPI } = await getFreshImport('../api/audit');
      mockFetchAPI.mockResolvedValue([]);
      await AuditAPI.getActividades({});
      expect(mockFetchAPI).toHaveBeenCalledWith('/audit/actividades?');
    });

    it('getStats calls fetchAPI', async () => {
      const { AuditAPI } = await getFreshImport('../api/audit');
      mockFetchAPI.mockResolvedValue({});
      await AuditAPI.getStats();
      expect(mockFetchAPI).toHaveBeenCalledWith('/audit/stats');
    });
  });

  describe('ConvocatoriasAPI', () => {
    it('list calls fetchAPI', async () => {
      const { ConvocatoriasAPI } = await getFreshImport('../api/convocatorias');
      mockFetchAPI.mockResolvedValue([]);
      await ConvocatoriasAPI.list({ estado: 'activa' });
      expect(mockFetchAPI).toHaveBeenCalledWith('/convocatorias?estado=activa');
    });

    it('create calls fetchAPI with POST', async () => {
      const { ConvocatoriasAPI } = await getFreshImport('../api/convocatorias');
      mockFetchAPI.mockResolvedValue({});
      await ConvocatoriasAPI.create({ titulo: 'Conv 2025' });
      expect(mockFetchAPI).toHaveBeenCalledWith('/convocatorias', expect.objectContaining({ method: 'POST' }));
    });

    it('activas calls correct endpoint', async () => {
      const { ConvocatoriasAPI } = await getFreshImport('../api/convocatorias');
      mockFetchAPI.mockResolvedValue([]);
      await ConvocatoriasAPI.activas();
      expect(mockFetchAPI).toHaveBeenCalledWith('/convocatorias/activas/now');
    });

    it('stats calls correct endpoint', async () => {
      const { ConvocatoriasAPI } = await getFreshImport('../api/convocatorias');
      mockFetchAPI.mockResolvedValue({});
      await ConvocatoriasAPI.stats();
      expect(mockFetchAPI).toHaveBeenCalledWith('/convocatorias/stats/resumen');
    });
  });

  describe('GruposAPI', () => {
    it('list calls fetchAPI', async () => {
      const { GruposAPI } = await getFreshImport('../api/grupos');
      mockFetchAPI.mockResolvedValue([]);
      await GruposAPI.list();
      expect(mockFetchAPI).toHaveBeenCalledWith('/grupos?');
    });

    it('getMembers fetches grupo then returns integrantes', async () => {
      const { GruposAPI } = await getFreshImport('../api/grupos');
      mockFetchAPI.mockResolvedValue({ integrantes: [{ id: '1', nombre: 'Test' }] });
      const members = await GruposAPI.getMembers('g-1');
      expect(members).toEqual([{ id: '1', nombre: 'Test' }]);
    });
  });

  describe('ProyectosAPI', () => {
    it('list calls fetchAPI', async () => {
      const { ProyectosAPI } = await getFreshImport('../api/proyectos');
      mockFetchAPI.mockResolvedValue([]);
      await ProyectosAPI.list({ estado: 'En ejecución' });
      expect(mockFetchAPI).toHaveBeenCalled();
      expect(mockFetchAPI.mock.calls[0][0]).toContain('/proyectos?estado=');
    });

    it('create calls fetchAPI with POST', async () => {
      const { ProyectosAPI } = await getFreshImport('../api/proyectos');
      mockFetchAPI.mockResolvedValue({});
      await ProyectosAPI.create({ nombre: 'Proyecto Test' });
      expect(mockFetchAPI).toHaveBeenCalledWith('/proyectos', expect.objectContaining({ method: 'POST' }));
    });

    it('addEquipo calls correct endpoint', async () => {
      const { ProyectosAPI } = await getFreshImport('../api/proyectos');
      mockFetchAPI.mockResolvedValue({});
      await ProyectosAPI.addEquipo('p-1', 'u-1', 'Investigador', 40);
      expect(mockFetchAPI).toHaveBeenCalledWith('/proyectos/p-1/equipo', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ user_id: 'u-1', rol_en_proyecto: 'Investigador', horas_dedicadas: 40 }),
      }));
    });

    it('checkLiquidacion calls correct endpoint', async () => {
      const { ProyectosAPI } = await getFreshImport('../api/proyectos');
      mockFetchAPI.mockResolvedValue({});
      await ProyectosAPI.checkLiquidacion('p-1');
      expect(mockFetchAPI).toHaveBeenCalledWith('/proyectos/p-1/liquidar/check');
    });
  });

  describe('ProductosAPI', () => {
    it('list calls fetchAPI', async () => {
      const { ProductosAPI } = await getFreshImport('../api/productos');
      mockFetchAPI.mockResolvedValue([]);
      await ProductosAPI.list();
      expect(mockFetchAPI).toHaveBeenCalledWith('/productos?');
    });

    it('verificar calls POST with verificar state', async () => {
      const { ProductosAPI } = await getFreshImport('../api/productos');
      mockFetchAPI.mockResolvedValue({});
      await ProductosAPI.verificar('prod-1', true);
      expect(mockFetchAPI).toHaveBeenCalledWith('/productos/prod-1/verificar', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ is_verificado: true }),
      }));
    });

    it('misProductos calls correct endpoint', async () => {
      const { ProductosAPI } = await getFreshImport('../api/productos');
      mockFetchAPI.mockResolvedValue([]);
      await ProductosAPI.misProductos();
      expect(mockFetchAPI).toHaveBeenCalledWith('/productos/mis-productos/list');
    });
  });

  describe('UsuariosAPI', () => {
    it('list calls fetchAPI', async () => {
      const { UsuariosAPI } = await getFreshImport('../api/usuarios');
      mockFetchAPI.mockResolvedValue([]);
      await UsuariosAPI.list();
      expect(mockFetchAPI).toHaveBeenCalledWith('/usuarios?');
    });

    it('toggleActive calls POST', async () => {
      const { UsuariosAPI } = await getFreshImport('../api/usuarios');
      mockFetchAPI.mockResolvedValue({});
      await UsuariosAPI.toggleActive('u-1');
      expect(mockFetchAPI).toHaveBeenCalledWith('/usuarios/u-1/toggle-active', expect.objectContaining({ method: 'POST' }));
    });

    it('resetPassword calls POST with new_password', async () => {
      const { UsuariosAPI } = await getFreshImport('../api/usuarios');
      mockFetchAPI.mockResolvedValue({});
      await UsuariosAPI.resetPassword('u-1', 'newpass123');
      expect(mockFetchAPI).toHaveBeenCalledWith(
        '/usuarios/u-1/reset-password?new_password=newpass123',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('GruposAPI', () => {
    it('cubre consulta, CRUD, equipo, indicadores y archivo operativo', async () => {
      const { GruposAPI } = await getFreshImport('../api/grupos');
      mockFetchAPI.mockResolvedValue([]);

      await GruposAPI.list({ clasificacion: 'A' });
      await GruposAPI.getAll();
      await GruposAPI.get('g-1');
      await GruposAPI.create({ nombre: 'GIDTA' });
      await GruposAPI.update('g-1', { nombre: 'GIDTA actualizado' });
      await GruposAPI.delete('g-1');
      await GruposAPI.getMembers('g-1');
      mockFetchAPI.mockResolvedValueOnce({ integrantes: [{ id: 'u-1' }] });
      expect(await GruposAPI.getMembers('g-1')).toEqual([{ id: 'u-1' }]);
      await GruposAPI.addMember('g-1', { user_id: 'u-1', rol: 'Líder' });
      await GruposAPI.removeMember('g-1', 'u-1');
      await GruposAPI.getStats('g-1');
      await GruposAPI.getProyectos('g-1');
      await GruposAPI.uploadPlanOperativo('g-1', new File(['plan'], 'plan.pdf'));

      expect(mockFetchAPI).toHaveBeenCalledWith('/grupos?clasificacion=A');
      expect(mockFetchAPI).toHaveBeenCalledWith('/grupos', expect.objectContaining({ method: 'POST' }));
      expect(mockFetchAPI).toHaveBeenCalledWith('/grupos/g-1/integrantes/u-1', { method: 'DELETE' });
      expect(mockFetchAPI).toHaveBeenLastCalledWith('/grupos/g-1/plan-operativo', expect.objectContaining({ method: 'POST', body: expect.any(FormData) }));
      expect(GruposAPI.downloadPlanOperativoUrl('g-1')).toBe('/api/grupos/g-1/plan-operativo');
      expect(GruposAPI.getConsolidadoReporteUrl('csv')).toBe('/api/reportes/grupos-consolidado?formato=csv');
      expect(mockFetchAPI).toHaveBeenCalledTimes(13);
    });
  });

  describe('SemillerosAPI', () => {
    it('list calls fetchAPI', async () => {
      const { SemillerosAPI } = await getFreshImport('../api/semilleros');
      mockFetchAPI.mockResolvedValue([]);
      await SemillerosAPI.list();
      expect(mockFetchAPI).toHaveBeenCalledWith('/semilleros?');
    });

    it('listAprendices calls correct endpoint', async () => {
      const { SemillerosAPI } = await getFreshImport('../api/semilleros');
      mockFetchAPI.mockResolvedValue([]);
      await SemillerosAPI.listAprendices('sem-1');
      expect(mockFetchAPI).toHaveBeenCalledWith('/semilleros/sem-1/aprendices');
    });

    it('cubre administración de semilleros, aprendices e investigadores', async () => {
      const { SemillerosAPI } = await getFreshImport('../api/semilleros');
      mockFetchAPI.mockResolvedValue({ ok: true });

      await SemillerosAPI.list({ estado: 'activo' });
      await SemillerosAPI.get('sem-1');
      await SemillerosAPI.create({ nombre: 'AgroTech' });
      await SemillerosAPI.update('sem-1', { nombre: 'AgroTech actualizado' });
      await SemillerosAPI.delete('sem-1');
      await SemillerosAPI.addAprendiz('sem-1', { user_id: 'apr-1' });
      await SemillerosAPI.addAprendizFull('sem-1', { nombre: 'Aprendiz Uno' });
      await SemillerosAPI.createAprendizFull('sem-1', { nombre: 'Aprendiz Dos' });
      await SemillerosAPI.updateAprendiz('sem-1', 'apr-1', { ficha: '123' });
      await SemillerosAPI.deleteAprendiz('sem-1', 'apr-1');
      await SemillerosAPI.addInvestigador('sem-1', { user_id: 'inv-1' });
      await SemillerosAPI.removeInvestigador('sem-1', 'inv-1');
      await SemillerosAPI.getStats('sem-1');

      expect(mockFetchAPI).toHaveBeenCalledWith('/semilleros?estado=activo');
      expect(mockFetchAPI).toHaveBeenCalledWith('/semilleros/sem-1/aprendices/full', expect.objectContaining({ method: 'POST' }));
      expect(mockFetchAPI).toHaveBeenCalledWith('/semilleros/sem-1/investigadores/inv-1', { method: 'DELETE' });
      expect(mockFetchAPI).toHaveBeenCalledWith('/stats/semillero/sem-1/impact');
      expect(mockFetchAPI).toHaveBeenCalledTimes(13);
    });
  });

  describe('NotificacionesAPI', () => {
    it('listar calls fetchAPI', async () => {
      const { NotificacionesAPI } = await getFreshImport('../api/notificaciones');
      mockFetchAPI.mockResolvedValue([]);
      await NotificacionesAPI.listar(true, 10);
      expect(mockFetchAPI).toHaveBeenCalledWith('/notificaciones/?solo_no_leidas=true&limite=10');
    });

    it('marcarTodasLeidas calls correct endpoint', async () => {
      const { NotificacionesAPI } = await getFreshImport('../api/notificaciones');
      mockFetchAPI.mockResolvedValue({});
      await NotificacionesAPI.marcarTodasLeidas();
      expect(mockFetchAPI).toHaveBeenCalledWith('/notificaciones/marcar-todas-leidas', expect.objectContaining({ method: 'POST' }));
    });

    it('cubre consultas, acciones administrativas y alias de notificaciones', async () => {
      const { NotificacionesAPI } = await getFreshImport('../api/notificaciones');
      mockFetchAPI.mockResolvedValue({ ok: true });

      await NotificacionesAPI.obtener('n-1');
      await NotificacionesAPI.marcarLeida('n-1', false);
      await NotificacionesAPI.limpiarLeidas(45);
      await NotificacionesAPI.alertarCVLACDesactualizados();
      await NotificacionesAPI.getCVLACPendientes();
      await NotificacionesAPI.enviarMensaje({ user_id: 'u-1', mensaje: 'Hola' });
      await NotificacionesAPI.crearSistema('u-1', 'Aviso', 'Mensaje', 'alta', 'proyecto', 'p-1');
      await NotificacionesAPI.crearSistema('u-2', 'Aviso', 'General');
      await NotificacionesAPI.list(false, 7);
      await NotificacionesAPI.get('n-2');
      await NotificacionesAPI.delete('n-2');
      await NotificacionesAPI.markAsRead('n-2', false);
      await NotificacionesAPI.markAllAsRead();
      await NotificacionesAPI.cleanRead(60);
      await NotificacionesAPI.sendMessage({ user_id: 'u-2', mensaje: 'Seguimiento' });

      expect(mockFetchAPI).toHaveBeenCalledWith('/notificaciones/n-1/marcar-leida', expect.objectContaining({ body: JSON.stringify({ leida: false }) }));
      expect(mockFetchAPI).toHaveBeenCalledWith(expect.stringContaining('entidad_tipo=proyecto&entidad_id=p-1'), expect.objectContaining({ method: 'POST' }));
      expect(mockFetchAPI).toHaveBeenCalledWith('/notificaciones/limpiar-leidas?dias_retencion=60', expect.objectContaining({ method: 'POST' }));
      expect(mockFetchAPI).toHaveBeenCalledTimes(15);
    });
  });

  describe('EntregablesAPI', () => {
    it('listarPorProyecto calls correct endpoint', async () => {
      const { EntregablesAPI } = await getFreshImport('../api/entregables');
      mockFetchAPI.mockResolvedValue([]);
      await EntregablesAPI.listarPorProyecto('proj-1');
      expect(mockFetchAPI).toHaveBeenCalledWith('/entregables/proyecto/proj-1');
    });

    it('cambiarEstado calls POST', async () => {
      const { EntregablesAPI } = await getFreshImport('../api/entregables');
      mockFetchAPI.mockResolvedValue({});
      await EntregablesAPI.cambiarEstado('e-1', 'Completado', 'Todo listo');
      expect(mockFetchAPI).toHaveBeenCalledWith(
        expect.stringContaining('/entregables/e-1/cambiar-estado'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('DocumentosAPI', () => {
    it('list calls fetchAPI', async () => {
      const { DocumentosAPI } = await getFreshImport('../api/documentos');
      mockFetchAPI.mockResolvedValue([]);
      await DocumentosAPI.list({ tipo: 'pdf' });
      expect(mockFetchAPI).toHaveBeenCalledWith('/documentos?tipo=pdf');
    });

    it('getProyectoDocumentos calls correct endpoint', async () => {
      const { DocumentosAPI } = await getFreshImport('../api/documentos');
      mockFetchAPI.mockResolvedValue([]);
      await DocumentosAPI.getProyectoDocumentos('proj-1');
      expect(mockFetchAPI).toHaveBeenCalledWith('/documentos/proyecto/proj-1/list');
    });
  });

  describe('CVLACAPI', () => {
    it('validarURL calls fetchAPI', async () => {
      const { CVLACAPI } = await getFreshImport('../api/cvlac');
      mockFetchAPI.mockResolvedValue({ valido: true });
      await CVLACAPI.validarURL('https://example.com/cvlac');
      expect(mockFetchAPI).toHaveBeenCalledWith('/cvlac/validar-url?url=https%3A%2F%2Fexample.com%2Fcvlac');
    });

    it('usuariosSinCVLAC calls correct endpoint', async () => {
      const { CVLACAPI } = await getFreshImport('../api/cvlac');
      mockFetchAPI.mockResolvedValue([]);
      await CVLACAPI.usuariosSinCVLAC();
      expect(mockFetchAPI).toHaveBeenCalledWith('/cvlac/usuarios/sin-cvlac');
    });
  });

  describe('DashboardAPI', () => {
    it('getStats calls correct endpoint', async () => {
      const { DashboardAPI } = await getFreshImport('../api/dashboard');
      mockFetchAPI.mockResolvedValue({});
      await DashboardAPI.getStats();
      expect(mockFetchAPI).toHaveBeenCalledWith('/stats/dashboard');
    });

    it('globalSearch calls with query param', async () => {
      const { DashboardAPI } = await getFreshImport('../api/dashboard');
      mockFetchAPI.mockResolvedValue([]);
      await DashboardAPI.globalSearch('test query');
      expect(mockFetchAPI).toHaveBeenCalledWith('/stats/search/global?q=test%20query');
    });
  });

  describe('StatsAPI', () => {
    it('getDashboard calls correct endpoint', async () => {
      const { StatsAPI } = await getFreshImport('../api/stats');
      mockFetchAPI.mockResolvedValue({});
      await StatsAPI.getDashboard();
      expect(mockFetchAPI).toHaveBeenCalledWith('/stats/dashboard');
    });

    it('globalSearch calls with query', async () => {
      const { StatsAPI } = await getFreshImport('../api/stats');
      mockFetchAPI.mockResolvedValue([]);
      await StatsAPI.globalSearch('search term');
      expect(mockFetchAPI).toHaveBeenCalled();
      expect(mockFetchAPI.mock.calls[0][0]).toContain('/stats/search/global?q=');
    });
  });

  describe('PlantillasAPI', () => {
    it('generarCronograma calls correct endpoint', async () => {
      const { PlantillasAPI } = await getFreshImport('../api/plantillas');
      mockFetchAPI.mockResolvedValue({});
      await PlantillasAPI.generarCronograma('proj-1');
      expect(mockFetchAPI).toHaveBeenCalledWith('/plantillas/proyectos/proj-1/cronograma-sennova', expect.objectContaining({ method: 'POST' }));
    });

    it('getReporteMensual calls correct endpoint', async () => {
      const { PlantillasAPI } = await getFreshImport('../api/plantillas');
      mockFetchAPI.mockResolvedValue({});
      await PlantillasAPI.getReporteMensual('user-1');
      expect(mockFetchAPI).toHaveBeenCalledWith('/plantillas/usuarios/user-1/reporte-mensual');
    });
  });

  describe('SystemAPI', () => {
    it('getHealth calls correct endpoint', async () => {
      const { SystemAPI } = await getFreshImport('../api/system');
      mockFetchAPI.mockResolvedValue({ status: 'ok' });
      await SystemAPI.getHealth();
      expect(mockFetchAPI).toHaveBeenCalledWith('/health');
    });

    it('getBackup calls correct endpoint', async () => {
      const { SystemAPI } = await getFreshImport('../api/system');
      mockFetchAPI.mockResolvedValue({});
      await SystemAPI.getBackup();
      expect(mockFetchAPI).toHaveBeenCalledWith('/maintenance/backup');
    });

    it('clearCache calls POST', async () => {
      const { SystemAPI } = await getFreshImport('../api/system');
      mockFetchAPI.mockResolvedValue({});
      await SystemAPI.clearCache();
      expect(mockFetchAPI).toHaveBeenCalledWith('/maintenance/clear-cache', expect.objectContaining({ method: 'POST' }));
    });
  });

  describe('ReportesAPI', () => {
    it('getEstadisticasResumen calls correct endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ total: 10 }),
      });
      const { ReportesAPI } = await getFreshImport('../api/reportes');
      const result = await ReportesAPI.getEstadisticasResumen();
      expect(result).toEqual({ total: 10 });
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('RetosAPI', () => {
    it('list calls fetchAPI', async () => {
      const { RetosAPI } = await getFreshImport('../api/retos');
      mockFetchAPI.mockResolvedValue([]);
      await RetosAPI.list();
      expect(mockFetchAPI).toHaveBeenCalledWith('/retos');
    });

    it('create calls PATCH', async () => {
      const { RetosAPI } = await getFreshImport('../api/retos');
      mockFetchAPI.mockResolvedValue({});
      await RetosAPI.create({ titulo: 'Nuevo reto' });
      expect(mockFetchAPI).toHaveBeenCalledWith('/retos', expect.objectContaining({ method: 'POST' }));
    });

    it('update calls fetchAPI with PATCH', async () => {
      const { RetosAPI } = await getFreshImport('../api/retos');
      mockFetchAPI.mockResolvedValue({});
      await RetosAPI.update('r-1', { estado: 'completado' });
      expect(mockFetchAPI).toHaveBeenCalledWith('/retos/r-1', expect.objectContaining({ method: 'PATCH' }));
    });
  });
});
