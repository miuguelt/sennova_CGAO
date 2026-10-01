import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PresupuestoModule from '../components/projects/PresupuestoModule';
import { ProyectosAPI } from '../api/proyectos';

vi.mock('../api/proyectos', () => ({
  ProyectosAPI: {
    list: vi.fn(),
    get: vi.fn(),
    generarPresupuesto: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, onConfirm, onClose, title, description, confirmText }) => (
    isOpen ? (
      <div role="dialog" aria-label={title}>
        <p>{description}</p>
        <button onClick={onClose}>Cancelar confirmación</button>
        <button onClick={onConfirm}>{confirmText}</button>
      </div>
    ) : null
  ),
}));

const project = { id: 'proyecto-1', nombre: 'Proyecto de investigación' };

const loadBudget = (items = [], initialAction, onNotify) => {
  ProyectosAPI.list.mockResolvedValue([project]);
  ProyectosAPI.get.mockResolvedValue({
    ...project,
    presupuesto_detallado: { items },
  });
  return render(
    <PresupuestoModule
      currentUser={{ id: 'admin-1', rol: 'admin' }}
      initialAction={initialAction}
      onNotify={onNotify}
    />,
  );
};

describe('PresupuestoModule, comportamiento de rubros', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('selecciona el proyecto solicitado y presenta totales incluso para una categoría desconocida', async () => {
    const onNotify = vi.fn();
    ProyectosAPI.list.mockResolvedValue([
      { id: 'proyecto-1', nombre: 'Proyecto de investigación' },
      { id: 'proyecto-2', nombre: 'Segundo proyecto' },
    ]);
    ProyectosAPI.get.mockResolvedValue({
      ...project,
      presupuesto_detallado: {
        items: [
          { categoria: 'Materiales', item: 'Reactivos', descripcion: 'Insumos del laboratorio', valor: 12500 },
          { categoria: 'Categoría heredada', item: 'Otro concepto', valor: 500 },
        ],
      },
    });

    render(
      <PresupuestoModule
        currentUser={{ id: 'admin-1', rol: 'admin' }}
        initialAction={{ data: { proyectoId: 'proyecto-2' } }}
        onNotify={onNotify}
      />,
    );

    expect(await screen.findByText('Reactivos')).toBeInTheDocument();
    await waitFor(() => expect(ProyectosAPI.get).toHaveBeenCalledWith('proyecto-2'));
    expect(screen.getByText('Insumos del laboratorio')).toBeInTheDocument();
    expect(screen.getByText('Categoría heredada')).toBeInTheDocument();
    expect(screen.getByText(/13\.000/)).toBeInTheDocument();
    expect(onNotify).not.toHaveBeenCalled();
  });

  it('valida y guarda un rubro nuevo con el total calculado en pesos', async () => {
    const onNotify = vi.fn();
    loadBudget([], { data: { proyectoId: 'proyecto-1' } }, onNotify);
    await waitFor(() => expect(ProyectosAPI.get).toHaveBeenCalledWith('proyecto-1'));

    fireEvent.click(screen.getByRole('button', { name: /Agregar Rubro/i }));
    const save = screen.getByRole('button', { name: /Agregar al Presupuesto/i });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Nombre del Rubro \/ Ítem/), { target: { value: 'Reactivos' } });
    fireEvent.change(screen.getByLabelText(/Valor Estimado \(COP\)/), { target: { value: '25000' } });
    fireEvent.change(screen.getByLabelText('Categoría de Gasto'), { target: { value: 'Materiales' } });
    fireEvent.change(screen.getByLabelText('Justificación Técnica'), { target: { value: 'Prueba de laboratorio' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);

    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('proyecto-1', {
      presupuesto_detallado: {
        items: [{ categoria: 'Materiales', item: 'Reactivos', valor: 25000, descripcion: 'Prueba de laboratorio' }],
        total_estimado: 25000,
      },
      presupuesto_total: 25000,
    }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Presupuesto sincronizado correctamente', 'success'));
  });

  it('edita un rubro y pide confirmación antes de eliminarlo', async () => {
    const onNotify = vi.fn();
    const original = { categoria: 'Equipos', item: 'Computador', valor: 2000000, descripcion: 'Equipo inicial' };
    const updated = { categoria: 'Equipos', item: 'Computador portátil', valor: 1800000, descripcion: 'Equipo actualizado' };
    ProyectosAPI.list.mockResolvedValue([project]);
    ProyectosAPI.get
      .mockResolvedValueOnce({ ...project, presupuesto_detallado: { items: [original] } })
      .mockResolvedValueOnce({ ...project, presupuesto_detallado: { items: [updated] } })
      .mockResolvedValueOnce({ ...project, presupuesto_detallado: { items: [] } });
    ProyectosAPI.update.mockResolvedValue({});

    render(<PresupuestoModule currentUser={{ id: 'admin-1', rol: 'admin' }} onNotify={onNotify} />);
    expect(await screen.findByText('Computador')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar rubro Computador' }));
    expect(screen.getByRole('heading', { name: 'Editar Rubro' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Nombre del Rubro \/ Ítem/), { target: { value: updated.item } });
    fireEvent.change(screen.getByLabelText(/Valor Estimado \(COP\)/), { target: { value: String(updated.valor) } });
    fireEvent.change(screen.getByLabelText('Justificación Técnica'), { target: { value: updated.descripcion } });
    fireEvent.click(screen.getByRole('button', { name: /Actualizar Rubro/i }));

    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenNthCalledWith(1, 'proyecto-1', {
      presupuesto_detallado: { items: [updated], total_estimado: updated.valor },
      presupuesto_total: updated.valor,
    }));
    expect(await screen.findByText('Computador portátil')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar rubro Computador portátil' }));
    const confirmation = screen.getByRole('dialog', { name: '¿Eliminar Rubro?' });
    expect(confirmation).toHaveTextContent(/no se puede deshacer/i);
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Eliminar Rubro' }));

    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenNthCalledWith(2, 'proyecto-1', {
      presupuesto_detallado: { items: [], total_estimado: 0 },
      presupuesto_total: 0,
    }));
    expect(onNotify).toHaveBeenCalledWith('Presupuesto sincronizado correctamente', 'success');
  });

  it('cambia de proyecto, permite cerrar el formulario y cancelar una eliminación', async () => {
    ProyectosAPI.list.mockResolvedValue([
      project,
      { id: 'proyecto-2', nombre: 'Segundo proyecto' },
    ]);
    ProyectosAPI.get.mockResolvedValue({
      ...project,
      presupuesto_detallado: {
        items: [{ categoria: 'Materiales', item: 'Tubos', valor: 800, descripcion: 'Muestra' }],
      },
    });
    render(<PresupuestoModule currentUser={{ id: 'admin-1', rol: 'admin' }} />);
    expect(await screen.findByText('Tubos')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'proyecto-2' } });
    await waitFor(() => expect(ProyectosAPI.get).toHaveBeenCalledWith('proyecto-2'));

    fireEvent.click(screen.getByRole('button', { name: /Agregar Rubro/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ventana modal' }));
    expect(screen.queryByRole('heading', { name: 'Nuevo Rubro' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Agregar Rubro/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: 'Nuevo Rubro' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar rubro Tubos' }));
    const confirmation = screen.getByRole('dialog', { name: '¿Eliminar Rubro?' });
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancelar confirmación' }));
    expect(screen.queryByRole('dialog', { name: '¿Eliminar Rubro?' })).not.toBeInTheDocument();
    expect(screen.getByText('Tubos')).toBeInTheDocument();
    expect(ProyectosAPI.update).not.toHaveBeenCalled();
  });

  it('informa fallas al cargar, generar y guardar y permite cerrar una confirmación', async () => {
    const onNotify = vi.fn();
    ProyectosAPI.list.mockRejectedValueOnce(new Error('sin conexión'));
    const first = render(<PresupuestoModule currentUser={{ id: 'admin-1' }} onNotify={onNotify} />);
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al cargar proyectos', 'error'));
    first.unmount();

    ProyectosAPI.list.mockResolvedValue([project]);
    ProyectosAPI.get.mockRejectedValueOnce(new Error('falló el detalle'));
    render(<PresupuestoModule currentUser={{ id: 'admin-1' }} onNotify={onNotify} />);
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al cargar detalle del presupuesto', 'error'));
    fireEvent.click(screen.getAllByRole('button', { name: /Cargar rubros de referencia/i })[0]);
    const templateDialog = screen.getByRole('dialog', { name: '¿Cargar rubros de referencia?' });
    fireEvent.click(within(templateDialog).getByRole('button', { name: 'Cancelar confirmación' }));
    expect(screen.queryByRole('dialog', { name: '¿Cargar rubros de referencia?' })).not.toBeInTheDocument();

    // La vista vacía también permite reabrir el diálogo y el error conserva su causa.
    fireEvent.click(screen.getAllByRole('button', { name: /Cargar rubros de referencia/i })[0]);
    ProyectosAPI.generarPresupuesto.mockRejectedValueOnce(new Error('permiso denegado'));
    fireEvent.click(within(screen.getByRole('dialog', { name: '¿Cargar rubros de referencia?' })).getByRole('button', { name: 'Cargar rubros' }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al generar plantilla: permiso denegado', 'error'));
  });

  it('notifica cuando falla el guardado y el detalle se mantiene visible', async () => {
    const onNotify = vi.fn();
    loadBudget([], undefined, onNotify);
    ProyectosAPI.update.mockRejectedValueOnce(new Error('falló el guardado'));
    await waitFor(() => expect(ProyectosAPI.get).toHaveBeenCalledWith('proyecto-1'));
    fireEvent.click(screen.getByRole('button', { name: /Agregar Rubro/i }));
    fireEvent.change(screen.getByLabelText(/Nombre del Rubro \/ Ítem/), { target: { value: 'Reactivos' } });
    fireEvent.change(screen.getByLabelText(/Valor Estimado \(COP\)/), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: /Agregar al Presupuesto/i }));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalled());
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al guardar presupuesto', 'error'));
  });
});
