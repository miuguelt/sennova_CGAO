import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const semilleros = [
  { id: 's-1', nombre: 'Semillero AgroTech', sigla: 'AGRO', linea_investigacion: 'Agroindustria', lider_nombre: 'Lina Ríos' },
  { id: 's-2', nombre: 'Semillero Ciencia Abierta', sigla: 'CIENCIA', linea_investigacion: 'Datos abiertos', lider_nombre: 'Luis Pérez' },
];

const users = [
  { id: 'u-1', nombre: 'Ana Aprendiz', email: 'ana@soy.sena.edu.co', rol: 'aprendiz', rol_sennova: 'Aprendiz Investigador', ficha: '1001', documento: '123', programa_formacion: 'ADSO', celular: '300 123 4567', sede: 'Vélez', is_active: true },
  { id: 'u-2', nombre: 'Luis Aprendiz', email: 'luis@soy.sena.edu.co', rol: 'aprendiz', rol_sennova: 'Aprendiz Innovador', ficha: '2002', documento: '456', programa_formacion: 'Agroindustria', is_active: false },
];

function setSuccessfulApiResponses() {
  UsuariosAPI.list.mockResolvedValue(users);
  UsuariosAPI.create.mockResolvedValue({ id: 'u-new' });
  UsuariosAPI.update.mockResolvedValue({});
  UsuariosAPI.delete.mockResolvedValue({});
  UsuariosAPI.toggleActive.mockResolvedValue({});
  SemillerosAPI.list.mockResolvedValue(semilleros);
  SemillerosAPI.addAprendiz.mockResolvedValue({ id: 'link-new' });
  AprendicesAPI.list.mockResolvedValue([{ user_id: 'u-1', semillero_id: 's-1', estado: 'Activo' }]);
}

async function renderLoadedModule(onNotify = vi.fn()) {
  const result = render(<AprendicesModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
  await screen.findByRole('heading', { name: 'Ana Aprendiz' });
  return { ...result, onNotify };
}

function cardFor(name) {
  return screen.getByRole('heading', { name }).closest('.group');
}

describe('comportamientos pendientes del módulo de aprendices', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSuccessfulApiResponses();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('abre perfiles desde la tarjeta, evita burbujeo del teléfono y cierra el menú al hacer clic afuera', async () => {
    await renderLoadedModule();
    const anaCard = cardFor('Ana Aprendiz');

    fireEvent.click(anaCard);
    expect(screen.getByRole('dialog', { name: 'Perfil de Ana Aprendiz' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar perfil' }));

    const whatsapp = screen.getByRole('link', { name: '300 123 4567' });
    expect(whatsapp).toHaveAttribute('href', 'https://wa.me/573001234567');
    fireEvent.click(whatsapp);
    expect(screen.queryByRole('dialog', { name: 'Perfil de Ana Aprendiz' })).not.toBeInTheDocument();

    fireEvent.click(within(anaCard).getByRole('button', { name: 'Ver perfil' }));
    expect(screen.getByRole('dialog', { name: 'Perfil de Ana Aprendiz' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar perfil' }));

    fireEvent.click(within(anaCard).getByTitle('Opciones de aprendiz'));
    expect(within(anaCard).getByText('Editar Ficha y Datos')).toBeVisible();
    fireEvent.mouseDown(document.body);
    expect(within(anaCard).queryByText('Editar Ficha y Datos')).not.toBeInTheDocument();
  });

  it('vincula desde ambos estados de la tarjeta y admite arrastrar un semillero', async () => {
    const { onNotify } = await renderLoadedModule();
    const anaCard = cardFor('Ana Aprendiz');
    const luisCard = cardFor('Luis Aprendiz');

    fireEvent.click(within(anaCard).getByRole('button', { name: 'Cambiar' }));
    expect(screen.getByRole('dialog', { name: 'Vincular Aprendiz a Semillero' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Vincular Aprendiz a Semillero' })).not.toBeInTheDocument();

    fireEvent.click(within(anaCard).getByTitle('Opciones de aprendiz'));
    fireEvent.click(within(anaCard).getByText('Editar Ficha y Datos'));
    const editForm = screen.getByRole('dialog', { name: 'Actualizar Ficha de Aprendiz' });
    expect(within(editForm).getByPlaceholderText('Ej: Juan David Pérez')).toHaveValue('Ana Aprendiz');
    fireEvent.click(within(editForm).getByRole('button', { name: 'Cancelar' }));

    fireEvent.click(within(anaCard).getByTitle('Opciones de aprendiz'));
    fireEvent.click(within(anaCard).getByText('Cambiar Semillero'));
    const linkedQuickLink = screen.getByRole('dialog', { name: 'Vincular Aprendiz a Semillero' });
    fireEvent.click(within(linkedQuickLink).getByRole('button', { name: 'Cerrar ventana modal' }));
    expect(screen.queryByRole('dialog', { name: 'Vincular Aprendiz a Semillero' })).not.toBeInTheDocument();

    fireEvent.click(within(luisCard).getByRole('button', { name: '+ Vincular' }));
    const quickLink = screen.getByRole('dialog', { name: 'Vincular Aprendiz a Semillero' });
    fireEvent.click(within(quickLink).getByText('Semillero Ciencia Abierta'));
    fireEvent.change(within(quickLink).getByLabelText('Estado de Vinculación'), { target: { value: 'En Formación' } });
    fireEvent.click(within(quickLink).getByRole('button', { name: 'Confirmar Vinculación' }));
    await waitFor(() => expect(SemillerosAPI.addAprendiz).toHaveBeenCalledWith('s-2', expect.objectContaining({
      user_id: 'u-2', estado: 'En Formación', fecha_ingreso: expect.any(String),
    })));
    expect(onNotify).toHaveBeenCalledWith('Aprendiz vinculado exitosamente al semillero', 'success');
    expect(screen.queryByRole('dialog', { name: 'Vincular Aprendiz a Semillero' })).not.toBeInTheDocument();

    const preventDefault = vi.fn();
    fireEvent.dragOver(luisCard, { preventDefault, dataTransfer: { types: ['semilleroid'] } });
    expect(within(luisCard).getByText('Asignar Semillero')).toBeVisible();
    fireEvent.dragLeave(luisCard);
    expect(within(luisCard).queryByText('Asignar Semillero')).not.toBeInTheDocument();

    fireEvent.dragOver(luisCard, { dataTransfer: { types: ['text/plain'] } });
    expect(within(luisCard).queryByText('Asignar Semillero')).not.toBeInTheDocument();
    fireEvent.drop(luisCard, { dataTransfer: { getData: vi.fn((key) => key === 'semilleroid' ? 's-1' : '') } });
    await waitFor(() => expect(SemillerosAPI.addAprendiz).toHaveBeenCalledWith('s-1', expect.objectContaining({ user_id: 'u-2' })));
    expect(onNotify).toHaveBeenCalledWith('Aprendiz vinculado exitosamente al semillero', 'success');
  });

  it('filtra desde el catálogo y la barra, limpia la búsqueda y restablece el estado', async () => {
    const { container } = await renderLoadedModule();

    const catalogSemillero = screen.getByText('Semillero Ciencia Abierta').closest('[draggable="true"]');
    const setData = vi.fn();
    fireEvent.dragStart(catalogSemillero, { dataTransfer: { setData, effectAllowed: 'none' } });
    expect(setData).toHaveBeenNthCalledWith(1, 'semilleroId', 's-2');
    expect(setData).toHaveBeenNthCalledWith(2, 'semilleroid', 's-2');
    expect(catalogSemillero).toHaveAttribute('draggable', 'true');

    fireEvent.click(catalogSemillero);
    expect(screen.queryByRole('heading', { name: 'Ana Aprendiz' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mostrar Todos' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar Todos' }));
    expect(screen.getByRole('heading', { name: 'Ana Aprendiz' })).toBeVisible();

    const semilleroFilter = screen.getByRole('button', { name: /AGRO/ });
    fireEvent.click(semilleroFilter);
    expect(screen.getByRole('heading', { name: 'Ana Aprendiz' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Luis Aprendiz' })).not.toBeInTheDocument();
    fireEvent.click(semilleroFilter);
    expect(screen.getByRole('heading', { name: 'Luis Aprendiz' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Inactivos' }));
    expect(screen.getByRole('heading', { name: 'Luis Aprendiz' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Todos', exact: true }));
    expect(screen.getByRole('heading', { name: 'Ana Aprendiz' })).toBeVisible();

    const search = screen.getByPlaceholderText('Buscar por nombre, documento, ficha o programa de formación...');
    fireEvent.change(search, { target: { value: 'sin resultado' } });
    expect(screen.getByText('No se encontraron aprendices semilleristas')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer Filtros' }));
    fireEvent.change(search, { target: { value: 'Ana' } });
    expect(screen.getByRole('heading', { name: 'Ana Aprendiz' })).toBeVisible();
    const clearSearch = container.querySelector('button.absolute.right-3');
    expect(clearSearch).not.toBeNull();
    fireEvent.click(clearSearch);
    expect(search).toHaveValue('');
    expect(screen.getByRole('heading', { name: 'Luis Aprendiz' })).toBeVisible();
  });

  it('actualiza los campos del formulario y permite cancelar, cerrar y descartar confirmaciones', async () => {
    await renderLoadedModule();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Aprendiz' }));

    let form = screen.getByRole('dialog', { name: 'Alta de Nuevo Aprendiz Semillerista' });
    fireEvent.change(within(form).getByPlaceholderText('Seleccione o escriba el programa de formación'), { target: { value: 'Desarrollo Rural' } });
    fireEvent.change(within(form).getByPlaceholderText('C.C. / T.I. 1098...'), { target: { value: '1098765432' } });
    fireEvent.change(within(form).getByPlaceholderText('310 123 4567'), { target: { value: '300 555 0101' } });
    fireEvent.change(within(form).getByLabelText('Rol en SENNOVA'), { target: { value: 'Aprendiz Innovador' } });
    fireEvent.change(within(form).getByLabelText('Sede / Centro'), { target: { value: 'Barbosa' } });
    fireEvent.change(within(form).getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: 'clave-temporal' } });
    expect(within(form).getByPlaceholderText('Seleccione o escriba el programa de formación')).toHaveValue('Desarrollo Rural');
    expect(within(form).getByPlaceholderText('C.C. / T.I. 1098...')).toHaveValue('1098765432');
    expect(within(form).getByPlaceholderText('310 123 4567')).toHaveValue('300 555 0101');
    expect(within(form).getByLabelText('Rol en SENNOVA')).toHaveValue('Aprendiz Innovador');
    expect(within(form).getByLabelText('Sede / Centro')).toHaveValue('Barbosa');
    expect(within(form).getByPlaceholderText('Mínimo 6 caracteres')).toHaveValue('clave-temporal');
    fireEvent.click(within(form).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Alta de Nuevo Aprendiz Semillerista' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Registrar Aprendiz' }));
    form = screen.getByRole('dialog', { name: 'Alta de Nuevo Aprendiz Semillerista' });
    fireEvent.click(within(form).getByRole('button', { name: 'Cerrar ventana modal' }));
    expect(screen.queryByRole('dialog', { name: 'Alta de Nuevo Aprendiz Semillerista' })).not.toBeInTheDocument();

    fireEvent.click(within(cardFor('Ana Aprendiz')).getByTitle('Opciones de aprendiz'));
    fireEvent.click(screen.getByText('Eliminar Aprendiz'));
    const deleteDialog = screen.getByRole('dialog', { name: '¿Eliminar Aprendiz Semillerista?' });
    fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: '¿Eliminar Aprendiz Semillerista?' })).not.toBeInTheDocument();
    expect(UsuariosAPI.delete).not.toHaveBeenCalled();

    fireEvent.click(within(cardFor('Ana Aprendiz')).getByTitle('Opciones de aprendiz'));
    fireEvent.click(screen.getByText('Desactivar Aprendiz'));
    const toggleDialog = screen.getByRole('dialog', { name: '¿Desactivar Aprendiz?' });
    fireEvent.click(within(toggleDialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: '¿Desactivar Aprendiz?' })).not.toBeInTheDocument();
    expect(UsuariosAPI.toggleActive).not.toHaveBeenCalled();

    fireEvent.click(within(cardFor('Ana Aprendiz')).getByTitle('Opciones de aprendiz'));
    fireEvent.click(screen.getByText('Desactivar Aprendiz'));
    const confirmToggleDialog = screen.getByRole('dialog', { name: '¿Desactivar Aprendiz?' });
    fireEvent.click(within(confirmToggleDialog).getByRole('button', { name: 'Desactivar' }));
    await waitFor(() => expect(UsuariosAPI.toggleActive).toHaveBeenCalledWith('u-1'));
  });
});
