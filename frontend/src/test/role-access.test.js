import { describe, expect, it } from 'vitest';
import {
  canAccessModule,
  canStartModuleAction,
  canUseQuickAction,
  filterMenuGroups,
  getVisibleSemilleroMembers,
  getHomeModule,
  resolveAccessibleModule,
} from '../lib/roleAccess';

describe('Matriz de acceso por rol', () => {
  it('limita al aprendiz a su formación, actividad y comunicación', () => {
    const learnerModules = [
      'dashboard', 'perfil', 'proyectos', 'mis-proyectos',
      'cronograma', 'retos', 'semilleros', 'repositorio', 'mensajes',
      'notificaciones', 'grupos',
    ];

    learnerModules.forEach((module) => expect(canAccessModule('aprendiz', module)).toBe(true));
    ['productos', 'convocatorias', 'investigadores', 'aprendices',
      'reportes', 'documentos', 'auditoria', 'configuracion', 'cvlac-admin']
      .forEach((module) => expect(canAccessModule('aprendiz', module)).toBe(false));
    expect(getHomeModule('aprendiz')).toBe('grupos');
    expect(resolveAccessibleModule('aprendiz', 'auditoria')).toBe('grupos');
    expect(resolveAccessibleModule('aprendiz', 'bitacora')).toBe('grupos');
    ['admin', 'investigador', 'instructor', 'aprendiz'].forEach((role) => {
      expect(canAccessModule(role, 'bitacora')).toBe(false);
    });
  });

  it('mantiene acceso amplio para los roles institucionales y reserva gobierno del sistema al admin', () => {
    ['investigador'].forEach((role) => {
      expect(canAccessModule(role, 'proyectos')).toBe(true);
      expect(canAccessModule(role, 'investigadores')).toBe(true);
      expect(canAccessModule(role, 'reportes')).toBe(true);
      expect(canAccessModule(role, 'bitacora')).toBe(false);
      expect(canAccessModule(role, 'auditoria')).toBe(false);
      expect(canAccessModule(role, 'configuracion')).toBe(false);
      expect(getHomeModule(role)).toBe('grupos');
    });

    expect(canAccessModule('admin', 'auditoria')).toBe(true);
    expect(canAccessModule('admin', 'cvlac_admin')).toBe(true);
    expect(getHomeModule('admin')).toBe('grupos');
    expect(getHomeModule('instructor')).toBe('grupos');
    expect(canAccessModule('instructor', 'grupos')).toBe(true);
    expect(canAccessModule('desconocido', 'proyectos')).toBe(false);
    expect(canAccessModule('instructor', 'proyectos')).toBe(false);
    expect(getHomeModule('desconocido')).toBe('dashboard');
  });

  it('filtra menús y acciones rápidas según el rol', () => {
    const groups = [
      { label: 'Formación', items: [{ id: 'semilleros' }, { id: 'bitacora' }] },
      { label: 'Gestión', items: [{ id: 'usuarios' }, { id: 'reportes' }] },
    ];
    expect(filterMenuGroups('aprendiz', groups)).toEqual([
      { label: 'Formación', items: [{ id: 'semilleros' }] },
    ]);
    expect(canUseQuickAction('aprendiz', 'new-log')).toBe(false);
    expect(canUseQuickAction('aprendiz', 'my-projects')).toBe(true);
    expect(canUseQuickAction('investigador', 'my-projects')).toBe(false);
    expect(canUseQuickAction('admin', 'new-log')).toBe(false);
    expect(canUseQuickAction('aprendiz', 'new-project')).toBe(false);
    expect(canStartModuleAction('aprendiz', 'bitacora', 'create')).toBe(false);
    expect(canStartModuleAction('aprendiz', 'proyectos', 'create')).toBe(false);
    expect(canStartModuleAction('aprendiz', 'proyectos', 'view')).toBe(true);
    expect(canUseQuickAction('instructor', 'new-user')).toBe(false);
  });

  it('restringe la lista de integrantes del aprendiz y conserva la vista completa del personal', () => {
    const apprentices = [
      { id: 'membership-1', user_id: 'learner-1' },
      { id: 'learner-2' },
    ];
    const investigators = [{ id: 'investigator-1', email: 'instructor@sena.edu.co' }];

    expect(getVisibleSemilleroMembers('aprendiz', 'learner-1', apprentices, investigators)).toEqual({
      apprentices: [apprentices[0]],
      investigators: [],
    });
    expect(getVisibleSemilleroMembers('investigador', 'investigator-1', apprentices, investigators)).toEqual({
      apprentices,
      investigators,
    });
    expect(getVisibleSemilleroMembers('instructor', 'old-instructor-1', apprentices, investigators)).toEqual({
      apprentices: [],
      investigators: [],
    });
    expect(getVisibleSemilleroMembers('aprendiz', undefined, apprentices, investigators)).toEqual({
      apprentices: [],
      investigators: [],
    });
    expect(getVisibleSemilleroMembers('desconocido', 'user-1', apprentices, investigators)).toEqual({
      apprentices: [],
      investigators: [],
    });
  });
});
