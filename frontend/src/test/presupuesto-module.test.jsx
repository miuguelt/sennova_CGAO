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
  default: ({ isOpen, onConfirm, description, confirmText }) => (
    <div data-testid="confirm-dialog" data-open={String(isOpen)} role={isOpen ? 'dialog' : undefined}>
      {isOpen && <>
      <p>{description}</p>
      <button onClick={onConfirm}>{confirmText}</button>
      </>}
    </div>
  ),
}));

describe('PresupuestoModule, rubros de referencia', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('presenta los rubros GIC-F-037 como referencia pendiente de confirmar', async () => {
    ProyectosAPI.list.mockResolvedValue([{ id: 'proyecto-1', nombre: 'Proyecto de investigación' }]);
    ProyectosAPI.get.mockResolvedValue({
      id: 'proyecto-1',
      nombre: 'Proyecto de investigación',
      presupuesto_detallado: { items: [] },
    });

    render(<PresupuestoModule currentUser={{ id: 'admin-1', rol: 'admin' }} />);

    expect(await screen.findByText(/rubros observados en el ejemplar GIC-F-037/i)).toBeInTheDocument();
    await waitFor(() => expect(ProyectosAPI.get).toHaveBeenCalledWith('proyecto-1'));
    expect(await screen.findAllByRole('button', { name: /cargar rubros de referencia/i })).toHaveLength(2);
  });

  it('carga los rubros de referencia después de la confirmación', async () => {
    ProyectosAPI.list.mockResolvedValue([{ id: 'proyecto-1', nombre: 'Proyecto de investigación' }]);
    ProyectosAPI.get.mockResolvedValue({
      id: 'proyecto-1',
      nombre: 'Proyecto de investigación',
      presupuesto_detallado: { items: [] },
    });
    ProyectosAPI.generarPresupuesto.mockResolvedValue({});
    const onNotify = vi.fn();

    render(<PresupuestoModule currentUser={{ id: 'admin-1', rol: 'admin' }} onNotify={onNotify} />);
    await waitFor(() => expect(ProyectosAPI.get).toHaveBeenCalledWith('proyecto-1'));
    await waitFor(() => expect(screen.getAllByRole('button', { name: /cargar rubros de referencia/i })).toHaveLength(2));
    fireEvent.click(screen.getAllByRole('button', { name: /cargar rubros de referencia/i })[0]);
    await waitFor(() => {
      expect(screen.getAllByTestId('confirm-dialog').some((dialog) => dialog.dataset.open === 'true')).toBe(true);
    });
    const confirmation = await screen.findByRole('dialog');
    expect(confirmation).toHaveTextContent(/Esta acción reemplazará el detalle actual/i);
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cargar rubros' }));

    await waitFor(() => expect(ProyectosAPI.generarPresupuesto).toHaveBeenCalledWith('proyecto-1'));
    expect(onNotify).toHaveBeenCalledWith(
      'Rubros de referencia cargados. Revise la vigencia y los valores antes de radicar.',
      'success',
    );
  });
});
