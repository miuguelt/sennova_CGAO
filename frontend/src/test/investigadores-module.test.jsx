import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InvestigadoresModule from '../components/users/InvestigadoresModule';

vi.mock('../api/usuarios', () => ({
  UsuariosAPI: { list: vi.fn(), getStats: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), toggleActive: vi.fn() },
}));
vi.mock('../components/users/UserInsightPanel', () => ({
  default: ({ user, isOpen, onClose }) => isOpen && user ? (
    <aside role="dialog" aria-label={`Actividad de ${user.nombre}`}><span>{user.email}</span><button onClick={onClose}>Cerrar actividad</button></aside>
  ) : null,
}));
vi.mock('../components/ui/Modal', () => ({
  default: ({ isOpen, title, children, footer, onClose }) => isOpen ? (
    <section role="dialog" aria-label={title}><h2>{title}</h2>{children}{footer}<button onClick={onClose}>Cerrar modal</button></section>
  ) : null,
}));
vi.mock('../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, title, description, confirmText, onConfirm, onClose }) => isOpen ? (
    <section role="alertdialog" aria-label={title}><p>{description}</p><button onClick={onClose}>Cancelar confirmación</button><button onClick={onConfirm}>{confirmText}</button></section>
  ) : null,
}));

import { UsuariosAPI } from '../api/usuarios';

const users = [
  { id: 'i-1', nombre: 'Lina Investigadora', email: 'lina@sena.edu.co', rol: 'investigador', is_active: true, sede: 'Vélez', regional: 'Santander', nivel_academico: 'Doctorado', cv_lac_url: 'https://cvlac.example/lina', impacto: 86 },
  { id: 'i-2', nombre: 'Carlos Instructor', email: 'carlos@sena.edu.co', rol: 'instructor', is_active: false, sede: '', regional: '', nivel_academico: '', impacto: 0 },
  { id: 'i-3', nombre: 'Sara Administradora', email: 'sara@sena.edu.co', rol: 'admin', is_active: true, sede: 'CGAO', regional: 'Santander', nivel_academico: 'Maestría' },
  { id: 'a-1', nombre: 'Aprendiz Excluido', email: 'aprendiz@soy.sena.edu.co', rol: 'aprendiz', is_active: true },
];

function configureApi() {
  UsuariosAPI.list.mockResolvedValue(users);
  UsuariosAPI.getStats.mockResolvedValue({ total: 4, por_nivel: { Doctorado: 2 } });
  UsuariosAPI.create.mockResolvedValue({ id: 'i-new' });
  UsuariosAPI.update.mockResolvedValue({});
  UsuariosAPI.delete.mockResolvedValue({});
  UsuariosAPI.toggleActive.mockResolvedValue({});
}

describe('gestión del talento investigador', () => {
  beforeEach(() => { vi.clearAllMocks(); configureApi(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('filtra los perfiles, excluye aprendices y permite consultar la actividad', async () => {
    const onNotify = vi.fn();
    const { container } = render(<InvestigadoresModule onNotify={onNotify} />);
    expect(await screen.findByRole('heading', { name: 'Talento SENNOVA' })).toBeVisible();
    expect(screen.getByText('Lina Investigadora')).toBeVisible();
    expect(screen.getByText('Carlos Instructor')).toBeVisible();
    expect(screen.getByText('Sara Administradora')).toBeVisible();
    expect(screen.queryByText('Aprendiz Excluido')).not.toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Filtrar por nombre/), { target: { value: 'carlos' } });
    expect(screen.getByText('Carlos Instructor')).toBeVisible();
    expect(screen.queryByText('Lina Investigadora')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Filtrar por nombre/), { target: { value: '' } });
    fireEvent.change(container.querySelectorAll('select')[0], { target: { value: 'investigador' } });
    expect(screen.getByText('Lina Investigadora')).toBeVisible();
    expect(screen.queryByText('Carlos Instructor')).not.toBeInTheDocument();
    fireEvent.change(container.querySelectorAll('select')[0], { target: { value: '' } });
    fireEvent.change(container.querySelectorAll('select')[1], { target: { value: 'false' } });
    expect(screen.getByText('Carlos Instructor')).toBeVisible();
    expect(screen.queryByText('Lina Investigadora')).not.toBeInTheDocument();
    fireEvent.change(container.querySelectorAll('select')[1], { target: { value: '' } });

    fireEvent.click(screen.getByText('Lina Investigadora'));
    expect(screen.getByRole('dialog', { name: 'Actividad de Lina Investigadora' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar actividad' }));
    expect(screen.queryByRole('dialog', { name: 'Actividad de Lina Investigadora' })).not.toBeInTheDocument();
    expect(onNotify).not.toHaveBeenCalled();
  });

  it('crea un perfil y consulta la auditoría de roles', async () => {
    render(<InvestigadoresModule />);
    await screen.findByRole('heading', { name: 'Talento SENNOVA' });
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Investigador/ }));
    expect(await screen.findByRole('dialog', { name: 'Nuevo Registro de Investigador' })).toBeVisible();
    const platformRole = screen.getByLabelText('Rol en Plataforma');
    expect(Array.from(platformRole.options, option => option.value)).toEqual(['investigador', 'admin']);
    fireEvent.change(platformRole, { target: { value: 'admin' } });
    expect(platformRole).toHaveValue('admin');
    fireEvent.change(screen.getByLabelText(/Nombre Completo/), { target: { value: 'Miguel Investigador' } });
    fireEvent.change(screen.getByLabelText(/Correo Institucional/), { target: { value: 'miguel@sena.edu.co' } });
    fireEvent.change(screen.getByLabelText(/Contraseña Temporal/), { target: { value: 'Temporal-123' } });
    fireEvent.change(screen.getByLabelText('Sede / Centro'), { target: { value: 'Barbosa' } });
    fireEvent.change(screen.getByLabelText('Nivel Académico'), { target: { value: 'Maestría' } });
    fireEvent.change(screen.getByLabelText('URL Perfil CVLAC'), { target: { value: 'https://cvlac.example/miguel' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Investigador' }));
    await waitFor(() => expect(UsuariosAPI.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Miguel Investigador', rol: 'admin', sede: 'Barbosa', nivel_academico: 'Maestría' })));

    fireEvent.click(screen.getByRole('button', { name: 'Auditoría de Roles' }));
    expect(screen.getByRole('dialog', { name: 'Auditoría de Control y Roles' })).toBeVisible();
    expect(screen.getByText('Privilegios y Seguridad')).toBeVisible();
    expect(screen.getAllByText('Lina Investigadora')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar Supervisión' }));
    expect(screen.queryByRole('dialog', { name: 'Auditoría de Control y Roles' })).not.toBeInTheDocument();
  });

  it('edita perfiles y confirma la activación y eliminación permanente', async () => {
    const onNotify = vi.fn();
    render(<InvestigadoresModule onNotify={onNotify} />);
    await screen.findByText('Lina Investigadora');

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones de Lina Investigadora' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Perfil' }));
    fireEvent.change(screen.getByLabelText(/Nombre Completo/), { target: { value: 'Lina Ríos' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(UsuariosAPI.update).toHaveBeenCalledWith('i-1', expect.objectContaining({ nombre: 'Lina Ríos' })));
    expect(onNotify).toHaveBeenCalledWith('Perfil actualizado correctamente', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones de Carlos Instructor' }));
    fireEvent.click(screen.getByRole('button', { name: 'Activar Cuenta' }));
    expect(screen.getByRole('alertdialog', { name: '¿Activar Cuenta?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }));
    await waitFor(() => expect(UsuariosAPI.toggleActive).toHaveBeenCalledWith('i-2'));
    expect(onNotify).toHaveBeenCalledWith('Cuenta activada', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones de Sara Administradora' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Permanente' }));
    expect(screen.getByRole('alertdialog', { name: '¿Eliminar Usuario?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Usuario' }));
    await waitFor(() => expect(UsuariosAPI.delete).toHaveBeenCalledWith('i-3'));
    expect(onNotify).toHaveBeenCalledWith('Usuario eliminado', 'success');
  });

  it('muestra errores al cargar y guardar perfiles', async () => {
    const onNotify = vi.fn();
    UsuariosAPI.list.mockRejectedValueOnce(new Error('fallo de carga'));
    UsuariosAPI.getStats.mockResolvedValueOnce({});
    const { unmount } = render(<InvestigadoresModule onNotify={onNotify} />);
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al cargar datos de investigadores', 'error'));
    unmount();

    UsuariosAPI.list.mockResolvedValue(users);
    UsuariosAPI.getStats.mockResolvedValue({});
    UsuariosAPI.create.mockRejectedValueOnce(new Error('correo duplicado'));
    render(<InvestigadoresModule onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Talento SENNOVA' });
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Investigador/ }));
    fireEvent.change(screen.getByLabelText(/Nombre Completo/), { target: { value: 'Prueba' } });
    fireEvent.change(screen.getByLabelText(/Correo Institucional/), { target: { value: 'prueba@sena.edu.co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Investigador' }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error en la operación: correo duplicado', 'error'));
  });
});
