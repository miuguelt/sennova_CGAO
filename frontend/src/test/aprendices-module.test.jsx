import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import AprendicesModule from '../components/users/AprendicesModule';

vi.mock('../api/usuarios', () => ({
  UsuariosAPI: {
    list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), toggleActive: vi.fn(),
  },
}));
vi.mock('../api/semilleros', () => ({ SemillerosAPI: { list: vi.fn(), addAprendiz: vi.fn() } }));
vi.mock('../api/aprendices', () => ({ AprendicesAPI: { list: vi.fn() } }));
vi.mock('../components/users/UserInsightPanel', () => ({
  default: ({ user, isOpen, onClose }) => isOpen && user ? (
    <aside role="dialog" aria-label={`Perfil de ${user.nombre}`}>
      <span>{user.email}</span><button onClick={onClose}>Cerrar perfil</button>
    </aside>
  ) : null,
}));

import { UsuariosAPI } from '../api/usuarios';
import { SemillerosAPI } from '../api/semilleros';
import { AprendicesAPI } from '../api/aprendices';

const semilleros = [{ id: 's1', nombre: 'Semillero AgroTech', sigla: 'AGRO', linea_investigacion: 'Agroindustria', lider_nombre: 'Lina Ríos' }];
const users = [
  { id: 'u1', nombre: 'Ana Aprendiz', email: 'ana@soy.sena.edu.co', rol: 'aprendiz', rol_sennova: 'Aprendiz Investigador', ficha: '1001', documento: '123', programa_formacion: 'ADSO', is_active: true },
  { id: 'u2', nombre: 'Luis Aprendiz', email: 'luis@soy.sena.edu.co', rol: 'aprendiz', rol_sennova: 'Aprendiz Innovador', ficha: '2002', programa_formacion: 'Agroindustria', is_active: false },
  { id: 'u3', nombre: 'Aprendiz alterno', email: 'otro@soy.sena.edu.co', rol: 'investigador', rol_sennova: 'Aprendiz de Apoyo Técnico', programa_formacion: 'ADSO', is_active: true },
  { id: 'u4', nombre: 'Persona excluida', email: 'p@sena.edu.co', rol: 'investigador' },
];

const cargarDatos = () => {
  UsuariosAPI.list.mockResolvedValue(users);
  SemillerosAPI.list.mockResolvedValue(semilleros);
  AprendicesAPI.list.mockResolvedValue([{ user_id: 'u1', semillero_id: 's1', estado: 'Activo' }]);
  SemillerosAPI.addAprendiz.mockResolvedValue({ id: 'link-1' });
  UsuariosAPI.create.mockResolvedValue({ id: 'u-new' });
  UsuariosAPI.update.mockResolvedValue({});
  UsuariosAPI.delete.mockResolvedValue({});
  UsuariosAPI.toggleActive.mockResolvedValue({});
};

describe('gestión formativa de aprendices', () => {
  beforeEach(() => { vi.clearAllMocks(); cargarDatos(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); delete URL.createObjectURL; });

  it('filtra por búsqueda, semillero, programa y estado, y oculta el catálogo', async () => {
    const { container } = render(<AprendicesModule currentUser={{ id: 'admin', rol: 'admin' }} />);
    expect(await screen.findByText('Ana Aprendiz')).toBeVisible();
    expect(screen.getByText('Luis Aprendiz')).toBeVisible();
    expect(screen.queryByText('Persona excluida')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sin Semillero/ }));
    expect(screen.queryByText('Ana Aprendiz')).not.toBeInTheDocument();
    expect(screen.getByText('Luis Aprendiz')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Todos (3)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Activos' }));
    expect(screen.getByText('Ana Aprendiz')).toBeVisible();
    expect(screen.queryByText('Luis Aprendiz')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Inactivos' }));
    expect(screen.getByText('Luis Aprendiz')).toBeVisible();

    fireEvent.change(container.querySelector('select'), { target: { value: 'Agroindustria' } });
    expect(screen.getByText('Luis Aprendiz')).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre/), { target: { value: 'sin coincidencia' } });
    expect(screen.getByText('No se encontraron aprendices semilleristas')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer Filtros' }));
    expect(screen.getByText('Ana Aprendiz')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar Semilleros' }));
    expect(screen.queryByText('Semilleros de Investigación del Centro CGAO')).not.toBeInTheDocument();
  });

  it('edita, vincula, activa y elimina aprendices desde sus tarjetas', async () => {
    const onNotify = vi.fn();
    render(<AprendicesModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByText('Ana Aprendiz');

    fireEvent.click(screen.getAllByTitle('Opciones de aprendiz')[0]);
    fireEvent.click(screen.getByText('Editar Ficha y Datos'));
    fireEvent.change(screen.getByPlaceholderText('Ej: Juan David Pérez'), { target: { value: 'Ana Editada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(UsuariosAPI.update).toHaveBeenCalledWith('u1', expect.objectContaining({ nombre: 'Ana Editada' })));
    expect(onNotify).toHaveBeenCalledWith('Ficha de aprendiz actualizada exitosamente', 'success');

    fireEvent.click(screen.getAllByTitle('Opciones de aprendiz')[1]);
    fireEvent.click(screen.getByText('Vincular a Semillero'));
    fireEvent.change(screen.getByLabelText('Estado de Vinculación'), { target: { value: 'En Formación' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Vinculación' }));
    await waitFor(() => expect(SemillerosAPI.addAprendiz).toHaveBeenCalledWith('s1', expect.objectContaining({ user_id: 'u2', estado: 'En Formación' })));

    fireEvent.click(screen.getAllByTitle('Opciones de aprendiz')[1]);
    fireEvent.click(screen.getByText('Activar Aprendiz'));
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }));
    await waitFor(() => expect(UsuariosAPI.toggleActive).toHaveBeenCalledWith('u2'));

    fireEvent.click(screen.getAllByTitle('Opciones de aprendiz')[0]);
    fireEvent.click(screen.getByText('Eliminar Aprendiz'));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Aprendiz' }));
    await waitFor(() => expect(UsuariosAPI.delete).toHaveBeenCalledWith('u1'));
  });

  it('valida y registra un aprendiz con semillero, exporta el listado y abre su perfil', async () => {
    const onNotify = vi.fn();
    const clickLink = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const objectUrl = vi.fn().mockReturnValue('blob:aprendices');
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: objectUrl });
    render(<AprendicesModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByText('Ana Aprendiz');

    fireEvent.click(screen.getByRole('button', { name: 'Registrar Aprendiz' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Registrar Aprendiz' }).at(-1));
    expect(onNotify).toHaveBeenCalledWith('Nombre y correo institucional son obligatorios', 'error');
    fireEvent.change(screen.getByPlaceholderText('Ej: Juan David Pérez'), { target: { value: 'Sara Nueva' } });
    fireEvent.change(screen.getByPlaceholderText('usuario@soy.sena.edu.co'), { target: { value: 'sara@soy.sena.edu.co' } });
    fireEvent.change(screen.getByPlaceholderText('2560892'), { target: { value: '3003003' } });
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects.at(-1), { target: { value: 's1' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Registrar Aprendiz' }).at(-1));
    await waitFor(() => expect(UsuariosAPI.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Sara Nueva', email: 'sara@soy.sena.edu.co' })));
    await waitFor(() => expect(SemillerosAPI.addAprendiz).toHaveBeenCalledWith('s1', expect.objectContaining({ user_id: 'u-new' })));

    fireEvent.click(screen.getByTitle('Exportar listado a Excel/CSV'));
    expect(objectUrl).toHaveBeenCalled();
    expect(clickLink).toHaveBeenCalled();
    expect(onNotify).toHaveBeenCalledWith('Listado exportado exitosamente', 'success');

    fireEvent.click(screen.getAllByRole('button', { name: 'Ver perfil' })[0]);
    expect(screen.getByRole('dialog', { name: 'Perfil de Ana Aprendiz' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar perfil' }));
    expect(screen.queryByRole('dialog', { name: 'Perfil de Ana Aprendiz' })).not.toBeInTheDocument();
    delete URL.createObjectURL;
  });
});
