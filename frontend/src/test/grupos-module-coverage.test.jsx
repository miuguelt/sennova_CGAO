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
  default: ({ isOpen, title, tabs = [], onTabChange, onClose, headerActions, children, footer }) => isOpen ? (
    <aside role="dialog" aria-label={title}><h2>{title}</h2>{headerActions}<button onClick={onClose} aria-label="Cerrar desde Drawer">Cerrar</button><nav>{tabs.map(tab => <button key={tab.id} onClick={() => onTabChange(tab.id)}>{tab.label}</button>)}</nav>{children}{footer}</aside>
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
  { id: 'g-1', nombre: 'GIDTA', nombre_completo: 'Grupo de Innovación y Desarrollo Tecnológico Agropecuario', codigo_gruplac: 'COL000123', clasificacion: 'A', gruplac_url: 'https://gruplac.example/gidta', lineas_investigacion: ['Agroindustria', 'Inteligencia Artificial'], is_publico: true, total_investigadores: 2 },
  { id: 'g-2', nombre: 'GIA', nombre_completo: 'Grupo de Innovación Agropecuaria', codigo_gruplac: 'COL000456', clasificacion: 'B', lineas_investigacion: '', total_investigadores: 0 },
];
const members = [
  { id: 'inv-1', nombre: 'Lina Investigadora', email: 'lina@sena.edu.co', rol_en_grupo: 'Líder' },
];
const talents = [
  { id: 'inv-1', nombre: 'Lina Investigadora', email: 'lina@sena.edu.co', rol: 'investigador' },
  { id: 'inv-2', nombre: 'Carlos Investigador', email: 'carlos@sena.edu.co', rol: 'investigador' },
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

  it('muestra la estructura institucional sin ofrecer crear grupos adicionales', async () => {
    render(<GruposModule currentUser={{ id: 'admin', rol: 'admin' }} />);
    expect(await screen.findByRole('heading', { name: 'Grupo de Investigación' })).toBeVisible();
    expect(screen.getByText('Categoría Máxima')).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por sigla/), { target: { value: 'COL000456' } });
    expect(screen.getByRole('heading', { name: 'GIA' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'GIDTA' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por sigla/), { target: { value: '' } });
    expect(screen.queryByRole('button', { name: 'Nuevo Grupo' })).not.toBeInTheDocument();
    expect(GruposAPI.create).not.toHaveBeenCalled();
  });

  it('permite editar el grupo institucional, con nombre fijo y sin opción para eliminarlo', async () => {
    const onNotify = vi.fn();
    render(<GruposModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'GIDTA' });
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del grupo GIDTA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Datos' }));
    expect(screen.getByLabelText(/Nombre del grupo institucional/)).toHaveValue('Investigadores CGAO');
    expect(screen.getByLabelText(/Nombre del grupo institucional/)).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Nombre Completo Institucional/), { target: { value: 'Grupo Actualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    const publicProfile = screen.getByRole('checkbox');
    expect(publicProfile).toBeChecked();
    fireEvent.click(publicProfile);
    expect(publicProfile).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Información' }));
    await waitFor(() => expect(GruposAPI.update).toHaveBeenCalledWith('g-1', expect.objectContaining({ nombre: 'Investigadores CGAO', is_publico: false })));
    expect(onNotify).toHaveBeenCalledWith('Grupo institucional actualizado', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del grupo GIDTA' }));
    expect(screen.queryByRole('button', { name: 'Eliminar Grupo' })).not.toBeInTheDocument();
    expect(GruposAPI.delete).not.toHaveBeenCalled();
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

  it('vincula solo investigadores al grupo institucional y los desvincula con confirmación', async () => {
    const onNotify = vi.fn();
    render(<GruposModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'GIDTA' });
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del grupo GIDTA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gestionar Equipo' }));
    expect(await screen.findByRole('dialog', { name: 'Equipo de Investigación' })).toBeVisible();
    expect(await screen.findByText('Directorio de Integrantes (1)')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Talent Pool' }));
    expect(screen.getByText('Carlos Investigador')).toBeVisible();
    expect(screen.queryByText('Luis Aprendiz')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Carlos Investigador'));
    const roleSelect = screen.getByRole('option', { name: 'Investigador Principal' }).parentElement;
    expect(roleSelect).toHaveValue('Investigador');
    expect(within(roleSelect).queryByRole('option', { name: /Aprendiz/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }));
    await waitFor(() => expect(GruposAPI.addMember).toHaveBeenCalledWith('g-1', { user_id: 'inv-2', rol: 'Investigador' }));
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

  it('mantiene abierto el formulario de edición desde el expediente, permite volver de paso y lo cierra al guardar', async () => {
    const onNotify = vi.fn();
    render(<GruposModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'GIDTA' });
    fireEvent.click(screen.getByRole('heading', { name: 'GIDTA' }));
    await screen.findByRole('dialog', { name: 'GIDTA' });

    fireEvent.click(screen.getByTitle('Editar Grupo'));
    expect(screen.getByRole('dialog', { name: 'Actualizar Grupo' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByText(/Paso 2 de 3/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByText(/Paso 1 de 3/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Información' }));

    await waitFor(() => expect(GruposAPI.update).toHaveBeenCalledWith('g-1', expect.objectContaining({ nombre: 'Investigadores CGAO' })));
    expect(onNotify).toHaveBeenCalledWith('Grupo institucional actualizado', 'success');
    expect(screen.getByRole('dialog', { name: 'GIDTA' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Datos' }));
    expect(screen.getByRole('dialog', { name: 'Actualizar Grupo' })).toBeVisible();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Actualizar Grupo' })).getByRole('button', { name: 'Cerrar modal' }));
    expect(screen.queryByRole('dialog', { name: 'Actualizar Grupo' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar desde Drawer' }));
    expect(screen.queryByRole('dialog', { name: 'GIDTA' })).not.toBeInTheDocument();
  });

  it('maneja respuestas fallidas de catálogos y muestra estados vacíos en expediente y equipo', async () => {
    const onNotify = vi.fn();
    SemillerosAPI.list.mockRejectedValueOnce(new Error('fallo al cargar semilleros'));
    render(<GruposModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    expect(await screen.findByRole('heading', { name: 'GIDTA' })).toBeVisible();
    expect(screen.getByText('Semilleros Adscritos').parentElement).toHaveTextContent('0');

    GruposAPI.getMembers.mockRejectedValueOnce(new Error('fallo de integrantes'));
    SemillerosAPI.list.mockRejectedValueOnce(new Error('fallo de semilleros del expediente'));
    GruposAPI.getStats.mockRejectedValueOnce(new Error('fallo de estadísticas'));
    fireEvent.click(screen.getByRole('heading', { name: 'GIDTA' }));
    await screen.findByRole('dialog', { name: 'GIDTA' });
    fireEvent.click(screen.getByRole('button', { name: 'Estadísticas e Impacto' }));
    expect(await screen.findByText('Sin productos Minciencias registrados para este grupo')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Equipo' }));
    expect(await screen.findByText('Sin miembros asignados a este grupo')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Semilleros' }));
    expect(await screen.findByText('Sin semilleros vinculados a este grupo')).toBeVisible();

    GruposAPI.getMembers.mockRejectedValueOnce(new Error('fallo al abrir gestión'));
    fireEvent.click(screen.getByRole('button', { name: 'Equipo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gestionar' }));
    expect(await screen.findByRole('dialog', { name: 'Equipo de Investigación' })).toBeVisible();
    expect(onNotify).toHaveBeenCalledWith('Error al cargar integrantes: fallo al abrir gestión', 'error');
    expect(await screen.findByText('Sin investigadores vinculados')).toBeVisible();
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Equipo de Investigación' })).getByRole('button', { name: 'Cerrar modal' }));
    expect(screen.queryByRole('dialog', { name: 'Equipo de Investigación' })).not.toBeInTheDocument();
  });

  it('permite soltar talento del pool y refleja las acciones de pestañas y resaltado del área', async () => {
    const onNotify = vi.fn();
    GruposAPI.getMembers.mockResolvedValue([]);
    render(<GruposModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'GIDTA' });
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del grupo GIDTA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gestionar Equipo' }));
    const management = await screen.findByRole('dialog', { name: 'Equipo de Investigación' });
    const dropArea = screen.getByText('Vincular Integrante').parentElement.parentElement.parentElement;

    fireEvent.dragOver(dropArea);
    expect(dropArea).toHaveClass('border-emerald-500');
    fireEvent.dragLeave(dropArea);
    expect(dropArea).toHaveClass('border-slate-100');

    fireEvent.click(screen.getByRole('button', { name: 'Abrir Talent Pool' }));
    expect(screen.getByText('Carlos Investigador')).toBeVisible();
    expect(screen.queryByText('Luis Aprendiz')).not.toBeInTheDocument();
    const data = new Map();
    const dataTransfer = {
      setData: vi.fn((key, value) => data.set(key, value)),
      getData: vi.fn(key => data.get(key) || ''),
    };
    fireEvent.dragStart(screen.getByText('Carlos Investigador'), { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('userId', 'inv-2');
    fireEvent.dragOver(dropArea);
    fireEvent.drop(dropArea, { dataTransfer });

    await waitFor(() => expect(GruposAPI.addMember).toHaveBeenCalledWith('g-1', { user_id: 'inv-2', rol: 'Investigador' }));
    expect(onNotify).toHaveBeenCalledWith('Talento vinculado al grupo exitosamente', 'success');
    expect(dataTransfer.getData).toHaveBeenCalledWith('userId');

    GruposAPI.addMember.mockRejectedValueOnce(new Error('falló el vínculo por arrastre'));
    fireEvent.dragStart(screen.getByText('Carlos Investigador'), { dataTransfer });
    fireEvent.dragOver(dropArea);
    fireEvent.drop(dropArea, { dataTransfer });
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al vincular talento: falló el vínculo por arrastre', 'error'));

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar Directorio' }));
    expect(screen.queryByText('Talento Disponible')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Talent Pool' }));
    const closePoolButton = screen.getByText('Talento Disponible').parentElement.parentElement.querySelector('button');
    fireEvent.click(closePoolButton);
    expect(screen.queryByText('Talento Disponible')).not.toBeInTheDocument();
    fireEvent.click(within(management).getByRole('button', { name: 'Cerrar Gestión' }));
    expect(screen.queryByRole('dialog', { name: 'Equipo de Investigación' })).not.toBeInTheDocument();
  });

  it('oculta el borrado del grupo y conserva la confirmación para desvincular investigadores', async () => {
    render(<GruposModule currentUser={{ id: 'admin', rol: 'admin' }} />);
    await screen.findByRole('heading', { name: 'GIDTA' });
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del grupo GIDTA' }));
    expect(screen.queryByRole('button', { name: 'Eliminar Grupo' })).not.toBeInTheDocument();
    expect(GruposAPI.delete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Gestionar Equipo' }));
    await screen.findByRole('dialog', { name: 'Equipo de Investigación' });
    fireEvent.click(screen.getAllByTitle('Desvincular')[0]);
    fireEvent.click(within(screen.getByRole('alertdialog', { name: '¿Desvincular Integrante?' })).getByRole('button', { name: 'Cancelar confirmación' }));
    expect(screen.queryByRole('alertdialog', { name: '¿Desvincular Integrante?' })).not.toBeInTheDocument();
    expect(GruposAPI.removeMember).not.toHaveBeenCalled();
  });

  it('impide que el enlace externo abra el expediente y permite cancelar el vínculo desde el directorio', async () => {
    const onNotify = vi.fn();
    render(<GruposModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'GIDTA' });
    fireEvent.click(screen.getByTitle('Minciencias Scienti'));
    expect(screen.queryByRole('dialog', { name: 'GIDTA' })).not.toBeInTheDocument();

    GruposAPI.getMembers.mockResolvedValueOnce([]);
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del grupo GIDTA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gestionar Equipo' }));
    await screen.findByRole('dialog', { name: 'Equipo de Investigación' });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Talent Pool' }));
    fireEvent.click(screen.getByText('Lina Investigadora'));
    const roleSelect = screen.getByRole('option', { name: 'Investigador Principal' }).parentElement;
    expect(roleSelect).not.toHaveValue('Aprendiz');
    fireEvent.change(roleSelect, { target: { value: 'Asesor' } });
    expect(roleSelect).toHaveValue('Asesor');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('Vincular a Lina Investigadora')).not.toBeInTheDocument();
    expect(GruposAPI.addMember).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar Directorio' }));
    expect(screen.queryByRole('option', { name: /Luis Aprendiz/ })).not.toBeInTheDocument();
    expect(GruposAPI.addMember).not.toHaveBeenCalledWith('g-1', { user_id: 'apr-2', rol: 'Aprendiz' });
  });
});
