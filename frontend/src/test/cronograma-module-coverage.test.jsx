import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import CronogramaModule from '../components/deliverables/CronogramaModule';

vi.mock('../api/entregables', () => ({ EntregablesAPI: {
  listarMisEntregables: vi.fn(), create: vi.fn(), update: vi.fn(), cambiarEstado: vi.fn(), generarDesdePlantilla: vi.fn(),
} }));
vi.mock('../api/proyectos', () => ({ ProyectosAPI: { list: vi.fn() } }));
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

import { EntregablesAPI } from '../api/entregables';
import { ProyectosAPI } from '../api/proyectos';

const projects = [
  { id: 'p-1', nombre: 'Proyecto de Agricultura Sostenible' },
  { id: 'p-2', nombre_corto: 'Proyecto de Biotecnología' },
];
const deliverables = [
  { id: 'e-1', proyecto_id: 'p-1', proyecto_nombre: 'Proyecto de Agricultura Sostenible', fase: 'Fase I', titulo: 'Diagnóstico inicial', descripcion: 'Informe de diagnóstico', estado: 'pendiente', fecha_entrega: '2026-10-10', dias_restantes: 10 },
  { id: 'e-2', proyecto_id: 'p-1', proyecto_nombre: 'Proyecto de Agricultura Sostenible', fase: 'Fase II', titulo: 'Ensayo técnico', estado: 'en_desarrollo', fecha_entrega: '2026-09-25', dias_restantes: 2 },
  { id: 'e-3', proyecto_id: 'p-2', proyecto_nombre: 'Proyecto de Biotecnología', fase: 'Fase Final', titulo: 'Informe enviado', estado: 'enviado', fecha_entrega: '2026-09-10', dias_restantes: -5 },
  { id: 'e-4', proyecto_id: 'p-2', proyecto_nombre: 'Proyecto de Biotecnología', fase: 'Fase III', titulo: 'Cierre aprobado', estado: 'aprobado', fecha_entrega: '2026-10-01', dias_restantes: null },
];

function configureApi() {
  EntregablesAPI.listarMisEntregables.mockResolvedValue(deliverables);
  EntregablesAPI.create.mockResolvedValue({ id: 'e-new' });
  EntregablesAPI.update.mockResolvedValue({});
  EntregablesAPI.cambiarEstado.mockResolvedValue({});
  EntregablesAPI.generarDesdePlantilla.mockResolvedValue({});
  ProyectosAPI.list.mockResolvedValue(projects);
}

describe('seguimiento de entregables y cronograma', () => {
  beforeEach(() => { vi.clearAllMocks(); configureApi(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('filtra por proyecto y estado, y cambia entre lista y línea de tiempo', async () => {
    render(<CronogramaModule currentUser={{ id: 'admin', rol: 'admin' }} />);
    expect(await screen.findByRole('heading', { name: 'Cronograma de Entregables' })).toBeVisible();
    expect(screen.getByText('Diagnóstico inicial')).toBeVisible();
    expect(screen.queryByText('¡VENCE HOY!')).not.toBeInTheDocument();

    const filters = screen.getAllByRole('combobox');
    fireEvent.change(filters[0], { target: { value: 'p-1' } });
    expect(screen.getByText('Diagnóstico inicial')).toBeVisible();
    expect(screen.queryByText('Informe enviado')).not.toBeInTheDocument();
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'en_desarrollo' } });
    expect(screen.getByText('Ensayo técnico')).toBeVisible();
    expect(screen.queryByText('Diagnóstico inicial')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Timeline' }));
    expect(screen.getByText('Fase II')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Lista' }));
    expect(screen.getByText('Ensayo técnico')).toBeVisible();
  });

  it('programa, actualiza y avanza entregables según su estado', async () => {
    const onNotify = vi.fn();
    render(<CronogramaModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Cronograma de Entregables' });

    fireEvent.click(screen.getByRole('button', { name: 'Programar Entregable' }));
    fireEvent.change(screen.getByLabelText(/Título de la Tarea/), { target: { value: 'Informe de resultados' } });
    fireEvent.change(screen.getByLabelText('Fase del Proyecto'), { target: { value: 'Fase III' } });
    fireEvent.change(screen.getByLabelText(/Proyecto Vinculado/), { target: { value: 'p-1' } });
    fireEvent.change(screen.getByLabelText('Instrucciones / Descripción'), { target: { value: 'Consolidar los resultados.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agendar Entregable' }));
    await waitFor(() => expect(EntregablesAPI.create).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Informe de resultados', fase: 'Fase III', proyecto_id: 'p-1', descripcion: 'Consolidar los resultados.' })));
    expect(onNotify).toHaveBeenCalledWith('Nuevo entregable programado', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Editar entregable Diagnóstico inicial' }));
    fireEvent.change(screen.getByLabelText(/Título de la Tarea/), { target: { value: 'Diagnóstico actualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(EntregablesAPI.update).toHaveBeenCalledWith('e-1', expect.objectContaining({ titulo: 'Diagnóstico actualizado' })));
    expect(onNotify).toHaveBeenCalledWith('Entregable actualizado', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar' }));
    await waitFor(() => expect(EntregablesAPI.cambiarEstado).toHaveBeenCalledWith('e-1', 'en_desarrollo'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    await waitFor(() => expect(EntregablesAPI.cambiarEstado).toHaveBeenCalledWith('e-2', 'enviado'));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    await waitFor(() => expect(EntregablesAPI.cambiarEstado).toHaveBeenCalledWith('e-3', 'aprobado'));
  });

  it('genera una plantilla al seleccionar el proyecto y presenta el resultado', async () => {
    const onNotify = vi.fn();
    EntregablesAPI.listarMisEntregables.mockResolvedValue([]);
    render(<CronogramaModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Sin entregables programados' });
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'p-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Auto-Generar Hitos' }));
    expect(screen.getByRole('alertdialog', { name: '¿Generar cronograma automático?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Generar Cronograma' }));
    await waitFor(() => expect(EntregablesAPI.generarDesdePlantilla).toHaveBeenCalledWith('p-1'));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Cronograma institucional generado exitosamente', 'success'));
  });

  it('abre una tarea mediante initialAction y maneja errores de carga y actualización', async () => {
    const onNotify = vi.fn();
    const handled = vi.fn();
    render(<CronogramaModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} initialAction={{ data: { entregable_id: 'e-1' } }} onActionHandled={handled} />);
    expect(await screen.findByRole('dialog', { name: 'Editar Entregable' })).toBeVisible();
    expect(handled).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    EntregablesAPI.listarMisEntregables.mockRejectedValueOnce(new Error('sin servicio'));
    const { unmount } = render(<CronogramaModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al cargar cronograma', 'error'));
    unmount();
  });
});
