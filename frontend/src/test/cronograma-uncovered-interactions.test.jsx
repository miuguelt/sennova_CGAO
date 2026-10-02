import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CronogramaModule from '../components/deliverables/CronogramaModule';
import { EntregablesAPI } from '../api/entregables';
import { ProyectosAPI } from '../api/proyectos';

vi.mock('../api/entregables', () => ({
  EntregablesAPI: {
    listarMisEntregables: vi.fn(), create: vi.fn(), update: vi.fn(),
    cambiarEstado: vi.fn(), generarDesdePlantilla: vi.fn(),
  },
}));
vi.mock('../api/proyectos', () => ({ ProyectosAPI: { list: vi.fn() } }));
vi.mock('../components/ui/Modal', () => ({
  default: ({ isOpen, title, children, footer, onClose }) => isOpen ? (
    <section role="dialog" aria-label={title}>
      <h2>{title}</h2>{children}{footer}
      <button onClick={onClose}>Cerrar modal</button>
    </section>
  ) : null,
}));
vi.mock('../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, title, confirmText, onConfirm, onClose }) => isOpen ? (
    <section role="alertdialog" aria-label={title}>
      <button onClick={onClose}>Cancelar confirmación</button>
      <button onClick={onConfirm}>{confirmText}</button>
    </section>
  ) : null,
}));

const projectList = [
  { id: 'p-1', nombre: 'Proyecto Uno' },
  { id: 'p-2', nombre: 'Proyecto Dos' },
];

describe('CronogramaModule, cierres y fechas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    EntregablesAPI.listarMisEntregables.mockResolvedValue([]);
    EntregablesAPI.create.mockResolvedValue({ id: 'e-new' });
    EntregablesAPI.update.mockResolvedValue({});
    EntregablesAPI.cambiarEstado.mockResolvedValue({});
    EntregablesAPI.generarDesdePlantilla.mockResolvedValue({});
    ProyectosAPI.list.mockResolvedValue(projectList);
  });
  afterEach(cleanup);

  it('aplica un proyecto recibido como acción inicial y confirma que lo gestionó', async () => {
    const onActionHandled = vi.fn();
    render(
      <CronogramaModule
        currentUser={{ id: 'admin', rol: 'admin' }}
        initialAction={{ data: { id: 'p-2' } }}
        onActionHandled={onActionHandled}
      />,
    );

    expect(await screen.findByRole('heading', { name: 'Sin entregables programados' })).toBeInTheDocument();
    await waitFor(() => expect(onActionHandled).toHaveBeenCalled());
    expect(screen.getAllByRole('combobox')[0]).toHaveValue('p-2');
  });

  it('cierra el formulario y guarda la fecha límite del entregable', async () => {
    const onNotify = vi.fn();
    render(<CronogramaModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Sin entregables programados' });

    fireEvent.click(screen.getByRole('button', { name: 'Programar Entregable' }));
    const form = screen.getByRole('dialog', { name: 'Nueva Tarea / Entregable' });
    fireEvent.click(within(form).getByRole('button', { name: 'Cerrar modal' }));
    expect(screen.queryByRole('dialog', { name: 'Nueva Tarea / Entregable' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Programar Entregable' }));
    fireEvent.change(screen.getByLabelText(/Título de la Tarea/), { target: { value: 'Informe técnico' } });
    fireEvent.change(screen.getByLabelText(/Proyecto Vinculado/), { target: { value: 'p-1' } });
    fireEvent.change(screen.getByLabelText('Fecha Límite'), { target: { value: '2026-10-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agendar Entregable' }));

    await waitFor(() => expect(EntregablesAPI.create).toHaveBeenCalledWith(expect.objectContaining({
      titulo: 'Informe técnico', proyecto_id: 'p-1', fecha_entrega: '2026-10-15', responsable_id: null,
    })));
    expect(onNotify).toHaveBeenCalledWith('Nuevo entregable programado', 'success');
  });

  it('permite cancelar la generación automática sin llamar a la API', async () => {
    render(<CronogramaModule currentUser={{ id: 'admin', rol: 'admin' }} />);
    await screen.findByRole('heading', { name: 'Sin entregables programados' });
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'p-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Auto-Generar Hitos' }));
    const confirmation = screen.getByRole('alertdialog', { name: '¿Generar cronograma automático?' });
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancelar confirmación' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(EntregablesAPI.generarDesdePlantilla).not.toHaveBeenCalled();
  });
});
