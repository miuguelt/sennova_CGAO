import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import InvestigadoresModule from '../components/users/InvestigadoresModule';
import { UsuariosAPI } from '../api/usuarios';

vi.mock('../api/usuarios', () => ({
  UsuariosAPI: {
    list: vi.fn(),
    getStats: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toggleActive: vi.fn(),
  },
}));

const users = [
  { id: 'i-1', nombre: 'Lina Investigadora', email: 'lina@sena.edu.co', rol: 'investigador', is_active: true, sede: 'Vélez', regional: 'Santander', nivel_academico: 'Doctorado', cv_lac_url: 'https://cvlac.example/lina', impacto: 86 },
  { id: 'i-2', nombre: 'Carlos Instructor', email: 'carlos@sena.edu.co', rol: 'instructor', is_active: false, sede: '', regional: '', nivel_academico: '', impacto: 0 },
  { id: 'i-3', nombre: 'Sara Administradora', email: 'sara@sena.edu.co', rol: 'admin', is_active: true, sede: 'CGAO', regional: 'Santander', nivel_academico: 'Maestría' },
];

const prepareApi = () => {
  UsuariosAPI.list.mockResolvedValue(users);
  UsuariosAPI.getStats.mockResolvedValue({ total: 3, por_nivel: { Doctorado: 1 } });
  UsuariosAPI.create.mockResolvedValue({ id: 'i-new' });
  UsuariosAPI.update.mockResolvedValue({});
  UsuariosAPI.delete.mockResolvedValue({});
  UsuariosAPI.toggleActive.mockResolvedValue({});
};

const openUserMenu = (name) => {
  fireEvent.click(screen.getByRole('button', { name: `Más opciones de ${name}` }));
};

describe('InvestigadoresModule: flujos alternos de edición, filtros y confirmación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prepareApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('envía los campos editados, deja la clave en blanco y mantiene el formulario abierto si falla la actualización', async () => {
    const onNotify = vi.fn();
    UsuariosAPI.update.mockRejectedValueOnce(new Error('no fue posible guardar'));
    render(<InvestigadoresModule onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Talento SENNOVA' });

    openUserMenu('Lina Investigadora');
    fireEvent.click(screen.getByRole('button', { name: 'Editar Perfil' }));
    const dialog = screen.getByRole('dialog', { name: 'Actualizar Investigador' });
    const password = within(dialog).getByLabelText(/Contraseña \(dejar vacío para mantener\)/);
    expect(password).toHaveValue('');
    expect(password).not.toBeRequired();
    fireEvent.change(within(dialog).getByLabelText(/Nombre Completo/), { target: { value: 'Lina Ríos' } });
    fireEvent.change(within(dialog).getByLabelText(/Correo Institucional/), { target: { value: 'lina.rios@sena.edu.co' } });
    fireEvent.change(within(dialog).getByLabelText('Rol en Plataforma'), { target: { value: 'admin' } });
    fireEvent.change(within(dialog).getByLabelText('Regional'), { target: { value: 'Boyacá' } });
    fireEvent.change(within(dialog).getByLabelText('Sede / Centro'), { target: { value: 'Tunja' } });
    fireEvent.change(within(dialog).getByLabelText('Nivel Académico'), { target: { value: 'Especialización' } });
    fireEvent.change(within(dialog).getByLabelText('URL Perfil CVLAC'), { target: { value: 'https://cvlac.example/lina-rios' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Guardar Cambios' }));

    await waitFor(() => expect(UsuariosAPI.update).toHaveBeenCalledWith('i-1', expect.objectContaining({
      nombre: 'Lina Ríos', email: 'lina.rios@sena.edu.co', rol: 'admin', password: '',
      regional: 'Boyacá', sede: 'Tunja', nivel_academico: 'Especialización', cv_lac_url: 'https://cvlac.example/lina-rios',
    })));
    expect(onNotify).toHaveBeenCalledWith('Error en la operación: no fue posible guardar', 'error');
    expect(screen.getByRole('dialog', { name: 'Actualizar Investigador' })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Actualizar Investigador' })).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Actualizar Investigador' })).not.toBeInTheDocument());
  });

  it('cancela y confirma la desactivación y eliminación, y comunica fallos sin quitar perfiles', async () => {
    const onNotify = vi.fn();
    UsuariosAPI.toggleActive.mockRejectedValueOnce(new Error('servicio de estado fuera de línea'));
    UsuariosAPI.delete.mockRejectedValueOnce(new Error('servicio de eliminación fuera de línea'));
    render(<InvestigadoresModule onNotify={onNotify} />);
    await screen.findByText('Lina Investigadora');

    openUserMenu('Lina Investigadora');
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar Cuenta' }));
    let dialog = screen.getByRole('dialog', { name: '¿Desactivar Cuenta?' });
    expect(within(dialog).getByText(/No podrá iniciar sesión/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '¿Desactivar Cuenta?' })).not.toBeInTheDocument());
    expect(UsuariosAPI.toggleActive).not.toHaveBeenCalled();

    openUserMenu('Lina Investigadora');
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar Cuenta' }));
    dialog = screen.getByRole('dialog', { name: '¿Desactivar Cuenta?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(UsuariosAPI.toggleActive).toHaveBeenCalledWith('i-1'));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al cambiar estado', 'error'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '¿Desactivar Cuenta?' })).not.toBeInTheDocument());
    expect(screen.getByText('Lina Investigadora')).toBeInTheDocument();

    openUserMenu('Sara Administradora');
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Permanente' }));
    dialog = screen.getByRole('dialog', { name: '¿Eliminar Usuario?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: '¿Eliminar Usuario?' })).not.toBeInTheDocument());
    expect(UsuariosAPI.delete).not.toHaveBeenCalled();

    openUserMenu('Sara Administradora');
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Permanente' }));
    dialog = screen.getByRole('dialog', { name: '¿Eliminar Usuario?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar Usuario' }));
    await waitFor(() => expect(UsuariosAPI.delete).toHaveBeenCalledWith('i-3'));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al eliminar', 'error'));
    expect(screen.getByText('Sara Administradora')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog', { name: '¿Eliminar Usuario?' })).getByRole('button', { name: 'Cancelar' }));
  });

  it('busca por correo, muestra cero resultados y reinicia los valores al cancelar un registro', async () => {
    render(<InvestigadoresModule />);
    await screen.findByText('Lina Investigadora');
    const cvLacLink = document.querySelector('a[href="https://cvlac.example/lina"]');
    fireEvent.click(cvLacLink);
    expect(screen.queryByRole('dialog', { name: 'Actividad de Lina Investigadora' })).not.toBeInTheDocument();

    openUserMenu('Lina Investigadora');
    expect(screen.getByRole('button', { name: 'Editar Perfil' })).toBeInTheDocument();
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Editar Perfil' })).not.toBeInTheDocument());

    const search = screen.getByPlaceholderText(/Filtrar por nombre/);
    fireEvent.change(search, { target: { value: 'CARLOS@SENA.EDU.CO' } });
    expect(screen.getByText('Carlos Instructor')).toBeInTheDocument();
    expect(screen.queryByText('Lina Investigadora')).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'sin coincidencias' } });
    expect(screen.getByText('EXHIBIENDO 0 PERFILES')).toBeInTheDocument();
    fireEvent.change(search, { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /Nuevo Investigador/ }));
    let dialog = screen.getByRole('dialog', { name: 'Nuevo Registro de Investigador' });
    fireEvent.change(within(dialog).getByLabelText(/Nombre Completo/), { target: { value: 'Borrador sin guardar' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar ventana modal' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nuevo Registro de Investigador' })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Nuevo Investigador/ }));
    dialog = screen.getByRole('dialog', { name: 'Nuevo Registro de Investigador' });
    expect(within(dialog).getByLabelText(/Nombre Completo/)).toHaveValue('');
    expect(within(dialog).getByLabelText('Regional')).toHaveValue('CGAO');
    expect(within(dialog).getByLabelText('Rol en Plataforma')).toHaveValue('investigador');
    expect(UsuariosAPI.create).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Nuevo Registro de Investigador' })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Auditoría de Roles' }));
    dialog = screen.getByRole('dialog', { name: 'Auditoría de Control y Roles' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar ventana modal' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Auditoría de Control y Roles' })).not.toBeInTheDocument());
  });

  it('presenta una lista vacía cuando las API responden sin datos', async () => {
    UsuariosAPI.list.mockResolvedValueOnce(null);
    UsuariosAPI.getStats.mockResolvedValueOnce(null);
    render(<InvestigadoresModule />);

    expect(await screen.findByRole('heading', { name: 'Talento SENNOVA' })).toBeInTheDocument();
    expect(screen.getByText('EXHIBIENDO 0 PERFILES')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Más opciones de/ })).not.toBeInTheDocument();
  });
});
