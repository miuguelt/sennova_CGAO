import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import SemillerosModule from '../components/seedbeds/SemillerosModule';
import { SemillerosAPI } from '../api/semilleros';
import { GruposAPI } from '../api/grupos';
import { UsuariosAPI } from '../api/usuarios';
import { ProyectosAPI } from '../api/proyectos';

vi.mock('../api/semilleros', () => ({
  SemillerosAPI: {
    list: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(null),
    getStats: vi.fn().mockResolvedValue(null),
    listAprendices: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../api/grupos', () => ({
  GruposAPI: { list: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../api/usuarios', () => ({
  UsuariosAPI: { list: vi.fn().mockResolvedValue([]), get: vi.fn().mockResolvedValue(null) },
}));
vi.mock('../api/proyectos', () => ({
  ProyectosAPI: { list: vi.fn().mockResolvedValue([]) },
}));
vi.mock('../components/users/UserInsightPanel', () => ({
  default: ({ user, isOpen, onClose }) => isOpen ? (
    <div data-testid="ficha-integrante">
      <span>{user.nombre}</span>
      <span>{user.email}</span>
      <button onClick={onClose}>Cerrar ficha</button>
    </div>
  ) : null,
}));

describe('Carga del espacio de semillero para aprendices', () => {
  beforeEach(() => vi.clearAllMocks());

  it('carga el semillero y sus proyectos sin solicitar directorios de grupos o usuarios', async () => {
    render(
      <SemillerosModule
        currentUser={{ id: 'learner-1', rol: 'aprendiz' }}
        onNotify={vi.fn()}
      />
    );

    await waitFor(() => expect(SemillerosAPI.list).toHaveBeenCalled());
    expect(ProyectosAPI.list).toHaveBeenCalled();
    expect(GruposAPI.list).not.toHaveBeenCalled();
    expect(UsuariosAPI.list).not.toHaveBeenCalled();
  });

  it('limita al aprendiz a su propio registro dentro de un semillero', async () => {
    const semillero = { id: 'semillero-1', nombre: 'Semillero ADSO', estado: 'activo' };
    SemillerosAPI.list.mockResolvedValue([semillero]);
    SemillerosAPI.listAprendices.mockResolvedValue([
      { id: 'registro-propio', user_id: 'learner-1', nombre: 'Aprendiz propio', email: 'propio@sena.edu.co', ficha: '2678900' },
      { id: 'registro-ajeno', user_id: 'learner-2', nombre: 'Aprendiz ajeno', email: 'ajeno@sena.edu.co', ficha: '9999999' },
    ]);
    SemillerosAPI.get.mockResolvedValue({
      ...semillero,
      investigadores: [{ id: 'investigator-1', nombre: 'Investigadora ajena', email: 'investigadora@sena.edu.co' }],
    });

    render(<SemillerosModule currentUser={{ id: 'learner-1', rol: 'aprendiz' }} />);
    fireEvent.click(await screen.findByRole('button', { name: /Ver Información/i }));
    fireEvent.click(await screen.findByRole('tab', { name: /Aprendices/i }));

    expect(await screen.findByText('Aprendiz propio')).toBeInTheDocument();
    expect(screen.queryByText('Aprendiz ajeno')).not.toBeInTheDocument();
    expect(screen.queryByText('ajeno@sena.edu.co')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generar Certificado' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Investigadores/i }));
    expect(screen.queryByText('Investigadora ajena')).not.toBeInTheDocument();
    expect(screen.queryByText('investigadora@sena.edu.co')).not.toBeInTheDocument();
    expect(UsuariosAPI.list).not.toHaveBeenCalled();
  });

  it('permite al investigador consultar el detalle de aprendices e investigadores vinculados', async () => {
    const semillero = { id: 'semillero-1', nombre: 'Semillero ADSO', estado: 'activo' };
    SemillerosAPI.list.mockResolvedValue([semillero]);
    SemillerosAPI.listAprendices.mockResolvedValue([
      { id: 'registro-aprendiz', user_id: 'learner-1', nombre: 'Aprendiz vinculado', email: 'aprendiz@sena.edu.co' },
    ]);
    SemillerosAPI.get.mockResolvedValue({
      ...semillero,
      investigadores: [{ id: 'investigator-1', nombre: 'Investigadora vinculada', email: 'investigadora@sena.edu.co', rol_en_semillero: 'Tutora' }],
    });
    UsuariosAPI.get.mockImplementation(async (id) => ({ id, is_active: true }));

    render(<SemillerosModule currentUser={{ id: 'instructor-1', rol: 'investigador' }} />);
    fireEvent.click(await screen.findByText('Semillero ADSO'));
    fireEvent.click(await screen.findByRole('tab', { name: /Aprendices/i }));

    fireEvent.click(await screen.findByText('Aprendiz vinculado'));
    expect(await screen.findByTestId('ficha-integrante')).toHaveTextContent('Aprendiz vinculado');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ficha' }));

    fireEvent.click(screen.getByRole('tab', { name: /Investigadores/i }));
    fireEvent.click(await screen.findByText('Investigadora vinculada'));
    expect(await screen.findByTestId('ficha-integrante')).toHaveTextContent('Investigadora vinculada');
    expect(UsuariosAPI.get).toHaveBeenCalledWith('learner-1');
    expect(UsuariosAPI.get).toHaveBeenCalledWith('investigator-1');
  });
});
