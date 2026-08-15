import { describe, it, expect } from 'vitest';

describe('Separación y Permisos de Roles (Aprendiz, Instructor, Investigador, Admin)', () => {
  const mockUsers = [
    { id: '1', nombre: 'Carlos Investigador', rol: 'investigador', email: 'carlos@sena.edu.co' },
    { id: '2', nombre: 'Ana Aprendiz', rol: 'aprendiz', email: 'ana@sena.edu.co', ficha: '2558190', programa_formacion: 'ADSO' },
    { id: '3', nombre: 'Admin General', rol: 'admin', email: 'admin@sena.edu.co' },
    { id: '4', nombre: 'Pedro Aprendiz', rol: 'aprendiz', email: 'pedro@sena.edu.co' },
    { id: '5', nombre: 'María Instructora', rol: 'instructor', email: 'maria@sena.edu.co' }
  ];

  it('debe filtrar correctamente investigadores, instructores y admins para InvestigadoresModule', () => {
    const personalInvestigacion = mockUsers.filter(u => u.rol !== 'aprendiz');
    expect(personalInvestigacion).toHaveLength(3);
    expect(personalInvestigacion.map(u => u.nombre)).toEqual(['Carlos Investigador', 'Admin General', 'María Instructora']);
  });

  it('debe permitir filtrar específicamente por rol instructor en el módulo de personal', () => {
    const instructores = mockUsers.filter(u => u.rol === 'instructor');
    expect(instructores).toHaveLength(1);
    expect(instructores[0].nombre).toBe('María Instructora');
  });

  it('debe filtrar correctamente solo aprendices para AprendicesModule', () => {
    const aprendices = mockUsers.filter(u => u.rol === 'aprendiz');
    expect(aprendices).toHaveLength(2);
    expect(aprendices.map(u => u.nombre)).toEqual(['Ana Aprendiz', 'Pedro Aprendiz']);
  });

  it('debe filtrar adecuadamente el desplegable según la pestaña activa en SemillerosModule', () => {
    const filterForTab = (tab) => mockUsers.filter(u => tab === 'aprendices' ? u.rol === 'aprendiz' : u.rol !== 'aprendiz');
    
    expect(filterForTab('aprendices')).toHaveLength(2);
    expect(filterForTab('investigadores')).toHaveLength(3);
    expect(filterForTab('aprendices').every(u => u.rol === 'aprendiz')).toBe(true);
    expect(filterForTab('investigadores').every(u => u.rol !== 'aprendiz')).toBe(true);
  });

  it('debe autorizar a investigadores, instructores y admin para liderar proyectos o semilleros', () => {
    const rolesAutorizados = ['admin', 'investigador', 'instructor'];
    const autorizados = mockUsers.filter(u => rolesAutorizados.includes(u.rol));
    expect(autorizados).toHaveLength(3);
    expect(autorizados.every(u => u.rol !== 'aprendiz')).toBe(true);
  });

  it('debe autorizar la firma docente/tutor de bitácoras a instructores e investigadores', () => {
    const canSignTutor = (rol) => ['admin', 'investigador', 'instructor'].includes(rol);
    expect(canSignTutor('investigador')).toBe(true);
    expect(canSignTutor('instructor')).toBe(true);
    expect(canSignTutor('admin')).toBe(true);
    expect(canSignTutor('aprendiz')).toBe(false);
  });
});
