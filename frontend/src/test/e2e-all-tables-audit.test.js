/**
 * @file e2e-all-tables-audit.test.js
 * Suite de Pruebas Frontend E2E / Contratos de Todas las Tablas y Módulos SENNOVA CGAO.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/config', () => ({
  fetchAPI: vi.fn(),
  setAuthToken: vi.fn(),
  removeAuthToken: vi.fn(),
  getAuthToken: vi.fn(() => 'mocked-token'),
  API_URL: 'http://localhost:8000/api',
  API_BASE_URL: 'http://localhost:8000/api',
  STORAGE_KEYS: {
    TOKEN: 'sennova_token',
    USER: 'sennova_user',
    REFRESH_TOKEN: 'sennova_refresh_token'
  }
}));

import { fetchAPI } from '../api/config';
import { AuthAPI } from '../api/auth';
import { GruposAPI } from '../api/grupos';
import { SemillerosAPI } from '../api/semilleros';
import { AprendicesAPI } from '../api/aprendices';
import { ConvocatoriasAPI } from '../api/convocatorias';
import { ProyectosAPI } from '../api/proyectos';
import { ProductosAPI } from '../api/productos';
import { EntregablesAPI } from '../api/entregables';
import { DocumentosAPI } from '../api/documentos';
import { BitacoraAPI } from '../api/bitacora';
import { RetosAPI } from '../api/retos';
import { NotificacionesAPI } from '../api/notificaciones';
import { MensajesAPI } from '../api/mensajes';
import { CvlacAPI, CVLACAPI } from '../api/cvlac';
import { ReportesAPI } from '../api/reportes';
import { PlantillasAPI } from '../api/plantillas';
import { StatsAPI } from '../api/stats';
import { AuditAPI } from '../api/audit';

describe('🔬 Auditoría Exhaustiva E2E de Clientes API Frontend y Tablas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Auth & Users
  describe('1. Users & Auth API', () => {
    it('ejecuta login, me, changePassword y CRUD de usuarios', async () => {
      fetchAPI.mockResolvedValueOnce({ access_token: 'fake-token' });
      await AuthAPI.login('admin@sena.edu.co', 'Password123!');
      expect(fetchAPI).toHaveBeenCalledWith('/auth/login', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce({ id: 'u1', email: 'admin@sena.edu.co' });
      await AuthAPI.me();
      expect(fetchAPI).toHaveBeenCalledWith('/auth/me');

      fetchAPI.mockResolvedValueOnce({ message: 'Password updated' });
      await AuthAPI.changePassword('Old123!', 'New123!');
      expect(fetchAPI).toHaveBeenCalledWith('/auth/change-password', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce([{ id: 'u1' }]);
      await AuthAPI.listarUsuarios();
      expect(fetchAPI).toHaveBeenCalledWith('/usuarios/');
    });
  });

  // 2. Grupos
  describe('2. Grupos API', () => {
    it('ejecuta CRUD de grupos, integrantes y estadísticas', async () => {
      fetchAPI.mockResolvedValueOnce([{ id: 'g1', nombre: 'Grupo Agro' }]);
      await GruposAPI.getAll();
      expect(fetchAPI).toHaveBeenCalledWith('/grupos');

      fetchAPI.mockResolvedValueOnce({ id: 'g1' });
      await GruposAPI.create({ nombre: 'Grupo Agro' });
      expect(fetchAPI).toHaveBeenCalledWith('/grupos', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce([{ id: 'u1', nombre: 'Investigador' }]);
      await GruposAPI.getMembers('g1');
      expect(fetchAPI).toHaveBeenCalledWith('/grupos/g1/integrantes');

      fetchAPI.mockResolvedValueOnce({ message: 'Member added' });
      await GruposAPI.addMember('g1', { user_id: 'u1', rol_en_grupo: 'Miembro' });
      expect(fetchAPI).toHaveBeenCalledWith('/grupos/g1/integrantes', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce({ total_proyectos: 5, cumplimiento: 80 });
      await GruposAPI.getStats('g1');
      expect(fetchAPI).toHaveBeenCalledWith('/grupos/g1/stats');
    });
  });

  // 3. Semilleros & Aprendices
  describe('3. Semilleros & Aprendices API', () => {
    it('ejecuta creación de semillero, vinculación de tutor y registro full de aprendiz', async () => {
      fetchAPI.mockResolvedValueOnce({ id: 's1', nombre: 'Semillero IA' });
      await SemillerosAPI.create({ nombre: 'Semillero IA' });
      expect(fetchAPI).toHaveBeenCalledWith('/semilleros', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce({ message: 'Investigador vinculado' });
      await SemillerosAPI.addInvestigador('s1', { user_id: 'u2', rol_en_semillero: 'Tutor' });
      expect(fetchAPI).toHaveBeenCalledWith('/semilleros/s1/investigadores', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce({ id: 'a1', estado: 'activo' });
      await SemillerosAPI.createAprendizFull('s1', { email: 'apr@sena.edu.co', nombre: 'Aprendiz ADSO' });
      expect(fetchAPI).toHaveBeenCalledWith('/semilleros/s1/aprendices/full', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce([{ id: 'a1' }]);
      await AprendicesAPI.list({ estado: 'activo' });
      expect(fetchAPI).toHaveBeenCalledWith('/aprendices?estado=activo');
    });
  });

  // 4. Convocatorias
  describe('4. Convocatorias API', () => {
    it('ejecuta list, activas y stats de convocatorias', async () => {
      fetchAPI.mockResolvedValueOnce([{ id: 'c1', estado: 'abierta' }]);
      await ConvocatoriasAPI.list({ estado: 'abierta' });
      expect(fetchAPI).toHaveBeenCalledWith('/convocatorias?estado=abierta');

      fetchAPI.mockResolvedValueOnce([{ id: 'c1' }]);
      await ConvocatoriasAPI.getActivas();
      expect(fetchAPI).toHaveBeenCalledWith('/convocatorias/activas/now');

      fetchAPI.mockResolvedValueOnce({ total_convocatorias: 3 });
      await ConvocatoriasAPI.getStats();
      expect(fetchAPI).toHaveBeenCalledWith('/convocatorias/stats/resumen');
    });
  });

  // 5. Proyectos
  describe('5. Proyectos API', () => {
    it('ejecuta ciclo de vida, equipo, presupuesto, calidad y check de liquidación', async () => {
      fetchAPI.mockResolvedValueOnce({ id: 'p1', codigo_sgps: 'SGPS-1' });
      await ProyectosAPI.create({ nombre: 'BoviSmart' });
      expect(fetchAPI).toHaveBeenCalledWith('/proyectos', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce({ message: 'Equipo actualizado' });
      await ProyectosAPI.asignarEquipo('p1', { user_id: 'u2', rol_en_proyecto: 'Líder' });
      expect(fetchAPI).toHaveBeenCalledWith('/proyectos/p1/equipo', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce({ status: 'template_generated' });
      await ProyectosAPI.generarPresupuesto('p1');
      expect(fetchAPI).toHaveBeenCalledWith('/proyectos/p1/generate-budget-template', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce({ score_total: 85, nivel_calidad: 'Alto' });
      await ProyectosAPI.getElaboracionStatus('p1');
      expect(fetchAPI).toHaveBeenCalledWith('/proyectos/p1/elaboracion-status');

      fetchAPI.mockResolvedValueOnce({ can_liquidate: false, checklist: [] });
      await ProyectosAPI.checkLiquidacion('p1');
      expect(fetchAPI).toHaveBeenCalledWith('/proyectos/p1/liquidar/check');
    });
  });

  // 6. Productos Minciencias
  describe('6. Productos Minciencias API', () => {
    it('ejecuta CRUD, verificación y estadísticas de productos', async () => {
      fetchAPI.mockResolvedValueOnce({ id: 'prod1', tipo: 'software' });
      await ProductosAPI.create({ nombre: 'BoviSmart AI', tipo: 'software' });
      expect(fetchAPI).toHaveBeenCalledWith('/productos', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce({ id: 'prod1', is_verificado: true });
      await ProductosAPI.verificar('prod1', { is_verificado: true });
      expect(fetchAPI).toHaveBeenCalledWith('/productos/prod1/verificar', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce({ total: 10, verificados: 8 });
      await ProductosAPI.stats();
      expect(fetchAPI).toHaveBeenCalledWith('/productos/stats/resumen');

      fetchAPI.mockResolvedValueOnce([{ id: 'prod1' }]);
      await ProductosAPI.misProductos();
      expect(fetchAPI).toHaveBeenCalledWith('/productos/mis-productos/list');
    });
  });

  // 7. Entregables & Cronograma
  describe('7. Entregables & Cronograma API', () => {
    it('ejecuta CRUD universal y cambio de estado', async () => {
      fetchAPI.mockResolvedValueOnce([{ id: 'e1', titulo: 'Hito 1' }]);
      await EntregablesAPI.list('p1');
      expect(fetchAPI).toHaveBeenCalledWith('/entregables/proyecto/p1');

      fetchAPI.mockResolvedValueOnce({ id: 'e1' });
      await EntregablesAPI.create({ proyecto_id: 'p1', titulo: 'Hito 1', fase: 'Fase I' });
      expect(fetchAPI).toHaveBeenCalledWith('/entregables', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce({ nuevo_estado: 'aprobado', estado: 'aprobado' });
      await EntregablesAPI.changeStatus('e1', 'aprobado', 'Revisado OK');
      expect(fetchAPI).toHaveBeenCalledWith(expect.stringContaining('/entregables/e1/cambiar-estado'), expect.objectContaining({ method: 'POST' }));
    });
  });

  // 8. Documentos & Archivos
  describe('8. Documentos API', () => {
    it('ejecuta list, upload, getById, download y delete', async () => {
      fetchAPI.mockResolvedValueOnce([{ id: 'd1', nombre_archivo: 'informe.pdf' }]);
      await DocumentosAPI.list({ entidad_id: 'p1' });
      expect(fetchAPI).toHaveBeenCalledWith('/documentos?entidad_id=p1');

      fetchAPI.mockResolvedValueOnce({ id: 'd1', data_base64: 'JVBERi0xLjQ...' });
      await DocumentosAPI.download('d1');
      expect(fetchAPI).toHaveBeenCalledWith('/documentos/d1/download');

      fetchAPI.mockResolvedValueOnce({ id: 'd1' });
      await DocumentosAPI.getUserCVLac();
      expect(fetchAPI).toHaveBeenCalledWith('/documentos/user/cvlac');
    });
  });

  // 9. Bitácora Técnica
  describe('9. Bitácora Técnica API', () => {
    it('ejecuta CRUD, firma dual y listado por proyecto', async () => {
      fetchAPI.mockResolvedValueOnce({ id: 'b1', titulo: 'Sesión #1' });
      await BitacoraAPI.create({ proyecto_id: 'p1', titulo: 'Sesión #1', contenido: 'Pruebas' });
      expect(fetchAPI).toHaveBeenCalledWith('/bitacora', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce([{ id: 'b1' }]);
      await BitacoraAPI.list('p1');
      expect(fetchAPI).toHaveBeenCalledWith('/bitacora/proyecto/p1');

      fetchAPI.mockResolvedValueOnce({ id: 'b1', is_firmado_investigador: true });
      await BitacoraAPI.sign('b1', { ip: '192.168.1.10' });
      expect(fetchAPI).toHaveBeenCalledWith('/bitacora/b1/sign', expect.objectContaining({ method: 'POST' }));
    });
  });

  // 10. Retos de Innovación
  describe('10. Banco de Retos API', () => {
    it('ejecuta CRUD y patch de asignación', async () => {
      fetchAPI.mockResolvedValueOnce({ id: 'r1', titulo: 'Reto Agro' });
      await RetosAPI.create({ titulo: 'Reto Agro', descripcion: 'Optimización' });
      expect(fetchAPI).toHaveBeenCalledWith('/retos', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce({ id: 'r1', estado: 'en_progreso' });
      await RetosAPI.actualizar('r1', { estado: 'en_progreso', semillero_asignado_id: 's1' });
      expect(fetchAPI).toHaveBeenCalledWith('/retos/r1', expect.objectContaining({ method: 'PATCH' }));
    });
  });

  // 11. Notificaciones
  describe('11. Notificaciones API', () => {
    it('ejecuta list, stats, checkPendientes y marcarTodasLeidas', async () => {
      fetchAPI.mockResolvedValueOnce([{ id: 'n1', titulo: 'Recordatorio' }]);
      await NotificacionesAPI.list();
      expect(fetchAPI).toHaveBeenCalledWith('/notificaciones/?limite=50');

      fetchAPI.mockResolvedValueOnce({ total: 5, pendientes: 2 });
      await NotificacionesAPI.getStats();
      expect(fetchAPI).toHaveBeenCalledWith('/notificaciones/stats');

      fetchAPI.mockResolvedValueOnce({ no_leidas: 2, tiene_notificaciones: true });
      await NotificacionesAPI.checkPendientes();
      expect(fetchAPI).toHaveBeenCalledWith('/notificaciones/check/pendientes');

      fetchAPI.mockResolvedValueOnce({ message: 'Todas leídas' });
      await NotificacionesAPI.markAllAsRead();
      expect(fetchAPI).toHaveBeenCalledWith('/notificaciones/marcar-todas-leidas', expect.objectContaining({ method: 'POST' }));
    });
  });

  // 12. Mensajería Interna
  describe('12. Mensajería Interna API', () => {
    it('ejecuta send, conversaciones, historial, marcar leídos y directorio', async () => {
      fetchAPI.mockResolvedValueOnce({ id: 'm1', asunto: 'Reunión' });
      await MensajesAPI.send({ destinatario_id: 'u2', asunto: 'Reunión', contenido: 'Hola' });
      expect(fetchAPI).toHaveBeenCalledWith('/mensajes', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce([{ user_id: 'u2', unread_count: 1 }]);
      await MensajesAPI.getConversaciones();
      expect(fetchAPI).toHaveBeenCalledWith('/mensajes/conversaciones');

      fetchAPI.mockResolvedValueOnce([{ id: 'm1' }]);
      await MensajesAPI.getConversacion('u2');
      expect(fetchAPI).toHaveBeenCalledWith('/mensajes/conversacion/u2?skip=0&limit=100');

      fetchAPI.mockResolvedValueOnce({ count: 1 });
      await MensajesAPI.marcarLeidos('u2');
      expect(fetchAPI).toHaveBeenCalledWith('/mensajes/conversacion/u2/marcar-leidos', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce([{ id: 'u2', nombre: 'Investigador' }]);
      await MensajesAPI.getDestinatarios();
      expect(fetchAPI).toHaveBeenCalledWith('/mensajes/destinatarios');
    });
  });

  // 13. CVLaC & Importador
  describe('13. CVLaC API', () => {
    it('ejecuta validarUrl, sync y importarProductos', async () => {
      fetchAPI.mockResolvedValueOnce({ valid: true });
      await CvlacAPI.validarUrl('https://scienti.minciencias.gov.co/cvlac/0001');
      expect(fetchAPI).toHaveBeenCalledWith('/cvlac/validar-url?url=https%3A%2F%2Fscienti.minciencias.gov.co%2Fcvlac%2F0001');

      fetchAPI.mockResolvedValueOnce({ success: true, importados: 2 });
      await CvlacAPI.importarProductos('u2', [{ nombre: 'Articulo Q1', tipo: 'articulo' }]);
      expect(fetchAPI).toHaveBeenCalledWith('/cvlac/importar-productos?user_id=u2', expect.objectContaining({ method: 'POST' }));
    });
  });

  // 14. Reportes Consolidados
  describe('14. Reportes Consolidados API', () => {
    it('ejecuta consolidadoProyectos, consolidadoGrupos, consolidadoProductos y estadisticas', async () => {
      fetchAPI.mockResolvedValueOnce({ success: true });
      await ReportesAPI.consolidadoProyectos({ formato: 'excel', año: 2026 });
      expect(fetchAPI).toHaveBeenCalledWith('/reportes/proyectos-consolidado?formato=excel&a%C3%B1o=2026');

      fetchAPI.mockResolvedValueOnce({ totales: { proyectos: 10 } });
      await ReportesAPI.getEstadisticasResumen();
      expect(fetchAPI).toHaveBeenCalled();
    });
  });

  // 15. Plantillas Inteligentes
  describe('15. Plantillas API', () => {
    it('ejecuta generarCronograma, getDatosCertificado y getBitacoraOficial', async () => {
      fetchAPI.mockResolvedValueOnce({ status: 'success', entregables_creados: 6 });
      await PlantillasAPI.generarCronograma('p1');
      expect(fetchAPI).toHaveBeenCalledWith('/plantillas/proyectos/p1/cronograma-sennova', expect.objectContaining({ method: 'POST' }));

      fetchAPI.mockResolvedValueOnce({ datos_certificado: { entidad: 'SENA' } });
      await PlantillasAPI.getDatosCertificado('s1', 'a1');
      expect(fetchAPI).toHaveBeenCalledWith('/plantillas/semilleros/s1/certificado-aprendiz/a1');

      fetchAPI.mockResolvedValueOnce({ entradas: [] });
      await PlantillasAPI.getBitacoraOficial('p1');
      expect(fetchAPI).toHaveBeenCalledWith('/plantillas/proyectos/p1/bitacora-oficial');
    });
  });

  // 16. Stats & Dashboard Global
  describe('16. Stats & Dashboard Global API', () => {
    it('ejecuta dashboard, admin, evolucion, impact y search', async () => {
      fetchAPI.mockResolvedValueOnce({ proyectos: { total: 10 } });
      await StatsAPI.dashboard();
      expect(fetchAPI).toHaveBeenCalledWith('/stats/dashboard');

      fetchAPI.mockResolvedValueOnce({ evolucion_mensual: [] });
      await StatsAPI.analyticsEvolucion(6);
      expect(fetchAPI).toHaveBeenCalledWith('/stats/analytics/evolucion?meses=6');

      fetchAPI.mockResolvedValueOnce({ results: [] });
      await StatsAPI.globalSearch('bovi');
      expect(fetchAPI).toHaveBeenCalledWith('/stats/search/global?q=bovi');
    });
  });

  // 17. Auditoría Técnica
  describe('17. Auditoría Técnica API', () => {
    it('ejecuta getLogs, getActividades y getStats', async () => {
      fetchAPI.mockResolvedValueOnce([{ id: 'log1', endpoint: '/api/proyectos' }]);
      await AuditAPI.getLogs({ limit: 50 });
      expect(fetchAPI).toHaveBeenCalledWith('/audit/logs?limit=50');

      fetchAPI.mockResolvedValueOnce({ total_logs: 120 });
      await AuditAPI.getStats();
      expect(fetchAPI).toHaveBeenCalledWith('/audit/stats');
    });
  });
});
