import { describe, it, expect } from 'vitest';
import { canAccessModule, canUseQuickAction, getVisibleSemilleroMembers } from '../lib/roleAccess';

describe('Roles de investigador y docente', () => {
  it('conserva el acceso institucional del personal investigador y docente', () => {
    const users = [
      { id: '1', nombre: 'Carlos Investigador', rol: 'investigador' },
      { id: '2', nombre: 'María Instructora', rol: 'investigador' },
      { id: '3', nombre: 'Admin General', rol: 'admin' },
      { id: '4', nombre: 'Ana Aprendiz', rol: 'aprendiz' },
    ];

    expect(users.filter(user => user.rol === 'investigador').map(user => user.nombre)).toEqual([
      'Carlos Investigador',
      'María Instructora',
    ]);
    expect(canAccessModule('investigador', 'proyectos')).toBe(true);
    expect(canUseQuickAction('investigador', 'new-user')).toBe(true);
    expect(canAccessModule('instructor', 'proyectos')).toBe(false);
    expect(canUseQuickAction('instructor', 'new-user')).toBe(false);
  });

  it('conserva las funciones para aprendices y administradores', () => {
    expect(canAccessModule('aprendiz', 'grupos')).toBe(true);
    expect(canAccessModule('aprendiz', 'investigadores')).toBe(false);
    expect(canAccessModule('admin', 'configuracion')).toBe(true);
    expect(canAccessModule('investigador', 'configuracion')).toBe(false);
  });

  it('muestra a investigadores el directorio completo y limita al aprendiz a sí mismo', () => {
    const apprentices = [{ id: 'a1', user_id: 'aprendiz-1' }, { id: 'a2', user_id: 'aprendiz-2' }];
    const investigators = [{ id: 'i1' }];

    expect(getVisibleSemilleroMembers('investigador', 'i1', apprentices, investigators)).toEqual({
      apprentices,
      investigators,
    });
    expect(getVisibleSemilleroMembers('aprendiz', 'aprendiz-1', apprentices, investigators)).toEqual({
      apprentices: [apprentices[0]],
      investigators: [],
    });
  });
});
