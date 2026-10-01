import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import GruposModule from '../components/groups/GruposModule';

vi.mock('../api/grupos', () => ({ GruposAPI: {
  list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), getMembers: vi.fn(), addMember: vi.fn(), removeMember: vi.fn(), getStats: vi.fn(),
} }));
vi.mock('../api/usuarios', () => ({ UsuariosAPI: { list: vi.fn() } }));
vi.mock('../api/semilleros', () => ({ SemillerosAPI: { list: vi.fn() } }));
vi.mock('../components/ui/Modal', () => ({
  default: ({ isOpen, title, subtitle, children, footer, onClose }) => isOpen ? (
    <section role="dialog" aria-label={title}><h2>{title}</h2><p>{subtitle}</p>{children}{footer}<button onClick={onClose}>Cerrar modal</button></section>
  ) : null,
}));
vi.mock('../components/ui/Drawer', () => ({
  default: ({ isOpen, title, tabs = [], onTabChange, headerActions, children, footer }) => isOpen ? (
    <aside role="dialog" aria-label={title}><h2>{title}</h2>{headerActions}<nav>{tabs.map(tab => <button key={tab.id} onClick={() => onTabChange(tab.id)}>{tab.label}</button>)}</nav>{children}{footer}</aside>
  ) : null,
}));
vi.mock('../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, title, description, confirmText, onConfirm, onClose }) => isOpen ? (
    <section role="alertdialog" aria-label={title}><p>{description}</p><button onClick={onClose}>Cancelar confirmación</button><button onClick={onConfirm}>{confirmText}</button></section>
  ) : null,
}));

import { GruposAPI } from '../api/grupos';
import { UsuariosAPI } from '../api/usuarios';
import { SemillerosAPI } from '../api/semilleros';

const groups = [
  { id: 'g-1', nombre: 'GIDTA', nombre_completo: 'Grupo de Innovación y Desarrollo Tecnológico Agropecuario', codigo_gruplac: 'COL000123', clasificacion: 'A', gruplac_url: 'https://gruplac.example/gidta', lineas_investigacion: ['Agroindustria', 'Inteligencia Artificial'], total_investigadores: 2 },
  { id: 'g-2', nombre: 'GIA', nombre_completo: 'Grupo de Innovación Agropecuaria', codigo_gruplac: 'COL000456', clasificacion: 'B', lineas_investigacion: '', total_investigadores: 0 },
];
const members = [
  { id: 'inv-1', nombre: 'Lina Investigadora', email: 'lina@sena.edu.co', rol_en_grupo: 'Líder' },
  { id: 'apr-1', nombre: 'Ana Aprendiz', email: 'ana@soy.sena.edu.co', rol_en_grupo: 'Aprendiz' },
];
const talents = [
  { id: 'inv-1', nombre: 'Lina Investigadora', email: 'lina@sena.edu.co', rol: 'investigador' },
  { id: 'apr-1', nombre: 'Ana Aprendiz', email: 'ana@soy.sena.edu.co', rol: 'aprendiz', ficha: '123' },
  { id: 'apr-2', nombre: 'Luis Aprendiz', email: 'luis@soy.sena.edu.co', rol: 'aprendiz', ficha: '456' },
];

function configureApi() {
  GruposAPI.list.mockResolvedValue(groups);
  GruposAPI.create.mockResolvedValue({ id: 'g-3' });
  GruposAPI.update.mockResolvedValue({});
  GruposAPI.delete.mockResolvedValue({});
  GruposAPI.getMembers.mockResolvedValue(members);
  GruposAPI.addMember.mockResolvedValue({});
  GruposAPI.removeMember.mockResolvedValue({});
  GruposAPI.getStats.mockResolvedValue({ produccion: [{ name: 'Artículos', value: 3 }, { name: 'Libros', value: 0 }] });
  UsuariosAPI.list.mockResolvedValue(talents);
  SemillerosAPI.list.mockResolvedValue([{ id: 's-1', nombre: 'Semillero AgroTech', codigo: 'AGRO', grupo_id: 'g-1', total_aprendices: 4, estado: 'activo' }]);
}

describe('gestión de grupos de investigación', () => {
  beforeEach(() => { vi.clearAllMocks(); configureApi(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('crea un grupo con los tres pasos de identidad, clasificación y conocimiento', async () => {
    const onNotify = vi.fn();
    render(<GruposModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    expect(await screen.findByRole('heading', { name: 'Grupos de Investigación' })).toBeVisible();
    expect(screen.getByText('Categoría Máxima')).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por sigla/), { target: { value: 'COL000456' } });
    expect(screen.getByRole('heading', { name: 'GIA' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'GIDTA' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por sigla/), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Grupo' }));
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Sigla o Nombre Corto/), { target: { value: 'GIDTA-N' } });
    fireEvent.change(screen.getByLabelText(/Nombre Completo Institucional/), { target: { value: 'Grupo de Innovación Nuevo' } });
    fireEvent.change(screen.getByLabelText('Código GrupLAC'), { target: { value: 'COL000789' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.change(screen.getByLabelText('Clasificación Minciencias'), { target: { value: 'A1' } });
    fireEvent.change(screen.getByLabelText('URL Perfil GrupLAC'), { target: { value: 'https://gruplac.example/nuevo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.change(screen.getByLabelText('Líneas de Investigación'), { target: { value: 'Agroindustria, Robótica' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Grupo' }));
    await waitFor(() => expect(GruposAPI.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'GIDTA-N', nombre_completo: 'Grupo de Innovación Nuevo', codigo_gruplac: 'COL000789', clasificacion: 'A1', is_publico: false })));
    expect(onNotify).toHaveBeenCalledWith('Grupo institucional registrado exitosamente', 'success');
  });

  it('edita y elimina grupos desde el menú administrativo', async () => {
    const onNotify = vi.fn();
    render(<GruposModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'GIDTA' });
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del grupo GIDTA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Datos' }));
    fireEvent.change(screen.getByLabelText(/Sigla o Nombre Corto/), { target: { value: 'GIDTA Actualizado' } });
    fireEvent.change(screen.getByLabelText(/Nombre Completo Institucional/), { target: { value: 'Grupo Actualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Información' }));
    await waitFor(() => expect(GruposAPI.update).toHaveBeenCalledWith('g-1', expect.objectContaining({ nombre: 'GIDTA Actualizado' })));
    expect(onNotify).toHaveBeenCalledWith('Grupo institucional actualizado', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del grupo GIDTA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Grupo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, Eliminar Grupo' }));
    await waitFor(() => expect(GruposAPI.delete).toHaveBeenCalledWith('g-1'));
    expect(onNotify).toHaveBeenCalledWith('Grupo institucional eliminado', 'success');
  });

  it('abre el expediente, consulta impacto, equipo y semilleros relacionados', async () => {
    render(<GruposModule currentUser={{ id: 'admin', rol: 'admin' }} />);
    await screen.findByRole('heading', { name: 'GIDTA' });
    fireEvent.click(screen.getByRole('heading', { name: 'GIDTA' }));
    expect(await screen.findByRole('dialog', { name: 'GIDTA' })).toBeVisible();
    expect(screen.getByText('Agroindustria')).toBeVisible();
    const print = vi.fn();
    window.print = print;
    fireEvent.click(screen.getByTitle('Imprimir Expediente'));
    expect(print).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Estadísticas e Impacto' }));
    expect(await screen.findByText('Distribución de Producción')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Equipo' }));
    expect(await screen.findByText('Lina Investigadora')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Semilleros' }));
    expect(await screen.findByText('Semillero AgroTech')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar Expediente' }));
    expect(screen.queryByRole('dialog', { name: 'GIDTA' })).not.toBeInTheDocument();
  });

  it('vincula y desvincula talento con rol, y administra el pool de aprendices', async () => {
    const onNotify = vi.fn();
    render(<GruposModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'GIDTA' });
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del grupo GIDTA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gestionar Equipo' }));
    expect(await screen.findByRole('dialog', { name: 'Equipo de Investigación' })).toBeVisible();
    expect(await screen.findByText('Directorio de Integrantes (2)')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Talent Pool' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aprendices' }));
    fireEvent.click(screen.getByText('Luis Aprendiz'));
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'Aprendiz' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }));
    await waitFor(() => expect(GruposAPI.addMember).toHaveBeenCalledWith('g-1', { user_id: 'apr-2', rol: 'Aprendiz' }));
    expect(onNotify).toHaveBeenCalledWith('Integrante vinculado correctamente', 'success');

    fireEvent.click(screen.getAllByTitle('Desvincular')[0]);
    fireEvent.click(within(screen.getByRole('alertdialog', { name: '¿Desvincular Integrante?' })).getByRole('button', { name: 'Desvincular' }));
    await waitFor(() => expect(GruposAPI.removeMember).toHaveBeenCalledWith('g-1', 'inv-1'));
    expect(onNotify).toHaveBeenCalledWith('Integrante desvinculado correctamente', 'success');
  });

  it('deja que otros roles consulten grupos y mantiene las acciones reservadas al admin', async () => {
    render(<GruposModule currentUser={{ id: 'investigador', rol: 'investigador' }} />);
    expect(await screen.findByRole('heading', { name: 'GIDTA' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Nuevo Grupo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Más opciones del grupo GIDTA' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('heading', { name: 'GIDTA' }));
    expect(await screen.findByRole('dialog', { name: 'GIDTA' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Estadísticas e Impacto' })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Actualizar Datos' })).not.toBeInTheDocument();
  });
});
