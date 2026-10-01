import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ConvocatoriasModule from '../components/calls/ConvocatoriasModule';

vi.mock('../api/convocatorias', () => ({
  ConvocatoriasAPI: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock('../api/proyectos', () => ({ ProyectosAPI: { list: vi.fn(), update: vi.fn() } }));
vi.mock('../components/ui/Drawer', () => ({
  default: ({ isOpen, onClose, title, headerActions, footer, children }) => isOpen ? (
    <section role="dialog" aria-label={title}>
      <button type="button" onClick={onClose}>Cerrar panel</button>
      {headerActions}
      {children}
      {footer}
    </section>
  ) : null,
}));
vi.mock('../components/ui/Modal', () => ({
  default: ({ isOpen, onClose, title, footer, children }) => isOpen ? (
    <section role="dialog" aria-label={title}>
      <button type="button" onClick={onClose}>Cerrar modal</button>
      {children}
      {footer}
    </section>
  ) : null,
}));
vi.mock('../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, onClose, onConfirm, title, confirmText }) => isOpen ? (
    <section role="alertdialog" aria-label={title}>
      <button type="button" onClick={onClose}>Cancelar diálogo</button>
      <button type="button" onClick={onConfirm}>{confirmText}</button>
    </section>
  ) : null,
}));

import { ConvocatoriasAPI } from '../api/convocatorias';
import { ProyectosAPI } from '../api/proyectos';

const calls = [
  { id: 'c1', nombre: 'Convocatoria Abierta', año: 2026, numero_oe: 'OE-26-01', estado: 'abierta', fecha_inicio: '2026-01-01', fecha_cierre: '2026-12-31', descripcion: 'Apoyo a investigación aplicada', fuente: 'SENNOVA' },
  { id: 'c2', nombre: 'Convocatoria Cerrada', año: 2025, estado: 'cerrada', fecha_cierre: '', fuente: 'Otra' },
];
const projects = [
  { id: 'p1', nombre: 'Proyecto Vinculado', codigo_sgps: 'SGPS-01', owner_id: 'u1', convocatoria_id: 'c1', presupuesto_total: 1250000, linea_investigacion: 'Producción Agrícola Sostenible', responsable_nombre: 'Ana Investigadora' },
  { id: 'p2', nombre: 'Proyecto Disponible', codigo_sgps: 'SGPS-02', owner_id: 'u1', convocatoria_id: null, presupuesto_total: 500000 },
];
const admin = { id: 'admin-1', rol: 'admin' };

const renderModule = (props = {}) => render(
  <ConvocatoriasModule currentUser={admin} {...props} />,
);

describe('comportamientos pendientes de ConvocatoriasModule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ConvocatoriasAPI.list.mockResolvedValue(calls);
    ConvocatoriasAPI.get.mockResolvedValue(calls[0]);
    ConvocatoriasAPI.create.mockResolvedValue({ id: 'c3' });
    ConvocatoriasAPI.update.mockResolvedValue({});
    ConvocatoriasAPI.delete.mockResolvedValue({});
    ProyectosAPI.list.mockResolvedValue(projects);
    ProyectosAPI.update.mockResolvedValue({});
  });
  afterEach(cleanup);

  it('limpia los filtros cuando no hay resultados y alterna la zona de proyectos', async () => {
    const { container } = renderModule();
    await screen.findByText('Convocatoria Abierta');

    fireEvent.change(screen.getByPlaceholderText(/Buscar convocatoria/), { target: { value: 'no-existe' } });
    expect(screen.getByRole('heading', { name: 'No se encontraron convocatorias' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(await screen.findByText('Convocatoria Abierta')).toBeVisible();

    const poolButton = screen.getByRole('button', { name: /Pool Proyectos/ });
    expect(container.querySelector('[class*="group/pool"]')).toBeInTheDocument();
    fireEvent.click(poolButton);
    expect(container.querySelector('[class*="group/pool"]')).not.toBeInTheDocument();
    fireEvent.click(poolButton);
    expect(container.querySelector('[class*="group/pool"]')).toBeInTheDocument();

    const transfer = { types: ['proyectoId'], setData: vi.fn(), effectAllowed: '' };
    fireEvent.dragStart(screen.getByText('Proyecto Disponible').closest('[draggable="true"]'), { dataTransfer: transfer });
    expect(transfer.setData).toHaveBeenNthCalledWith(1, 'proyectoId', 'p2');
    expect(transfer.setData).toHaveBeenNthCalledWith(2, 'sourceConvocatoriaId', '');
    expect(transfer.effectAllowed).toBe('copy');

    const pool = container.querySelector('[class*="group/pool"]');
    fireEvent.dragOver(pool, { dataTransfer: { types: ['proyectoId'] } });
    expect(screen.getByText('Soltar aquí para Desvincular de la Convocatoria')).toBeVisible();
    fireEvent.dragLeave(pool);
    expect(screen.queryByText('Soltar aquí para Desvincular de la Convocatoria')).not.toBeInTheDocument();
  });

  it('cubre el arrastre desde una tarjeta, salida del destino y postulación directa desde la tarjeta', async () => {
    const { container } = renderModule();
    await screen.findByText('Proyecto Vinculado');
    const card = screen.getByText('Convocatoria Abierta').closest('[class*="cursor-pointer"]');
    const transfer = { types: ['proyectoId'], setData: vi.fn(), getData: vi.fn(() => ''), effectAllowed: '' };

    fireEvent.dragStart(screen.getByText('Proyecto Vinculado').closest('[draggable="true"]'), { dataTransfer: transfer });
    expect(transfer.setData).toHaveBeenNthCalledWith(1, 'proyectoId', 'p1');
    expect(transfer.setData).toHaveBeenNthCalledWith(2, 'sourceConvocatoriaId', 'c1');
    expect(transfer.effectAllowed).toBe('move');
    fireEvent.dragOver(card, { dataTransfer: transfer });
    expect(card).toHaveTextContent('Vincular Proyecto a OE-26-01');
    fireEvent.dragLeave(card);
    expect(card).not.toHaveTextContent('Vincular Proyecto a OE-26-01');

    fireEvent.click(screen.getByTitle('Postular un proyecto a esta convocatoria'));
    expect(screen.getByRole('dialog', { name: 'Postular Proyecto' })).toBeVisible();
    fireEvent.change(screen.getByRole('dialog', { name: 'Postular Proyecto' }).querySelector('select'), { target: { value: 'p2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Postular Proyecto' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Postular un proyecto a esta convocatoria'));
    fireEvent.click(withDialogButton('Postular Proyecto', 'Cerrar modal'));
    expect(screen.queryByRole('dialog', { name: 'Postular Proyecto' })).not.toBeInTheDocument();
    expect(container.querySelector('[class*="group/pool"]')).toBeInTheDocument();
  });

  it('abre una vista inicial encontrada en memoria o consultada y maneja el cierre del detalle', async () => {
    const onActionHandled = vi.fn();
    const { rerender } = renderModule({ onActionHandled });
    await screen.findByText('Convocatoria Abierta');
    rerender(<ConvocatoriasModule currentUser={admin} onActionHandled={onActionHandled} initialAction={{ form: 'view', data: { id: 'c1' } }} />);
    expect(await screen.findByRole('dialog', { name: 'Convocatoria Abierta' })).toBeVisible();
    expect(onActionHandled).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    expect(screen.queryByRole('dialog', { name: 'Convocatoria Abierta' })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Detalles' })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Convocatoria Abierta' })).not.toBeInTheDocument();
    cleanup();

    const handledRemote = vi.fn();
    renderModule({ initialAction: { form: 'view', initialData: { id: 'remote-9' } }, onActionHandled: handledRemote });
    expect(await screen.findByRole('dialog', { name: 'Convocatoria Abierta' })).toBeVisible();
    expect(ConvocatoriasAPI.get).toHaveBeenCalledWith('remote-9');
    expect(handledRemote).toHaveBeenCalled();
    cleanup();

    const handledMissing = vi.fn();
    ConvocatoriasAPI.get.mockRejectedValue(new Error('No existe'));
    renderModule({ initialAction: { form: 'view', data: { id: 'missing' } }, onActionHandled: handledMissing });
    await screen.findByText('Convocatoria Abierta');
    await waitFor(() => expect(ConvocatoriasAPI.get).toHaveBeenCalledWith('missing'));
    expect(handledMissing).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Convocatoria Abierta' })).not.toBeInTheDocument();
  });

  it('abre el formulario desde la acción inicial, guarda los campos editados y cierra por ambos controles', async () => {
    const onActionHandled = vi.fn();
    renderModule({ initialAction: { form: 'create' }, onActionHandled });
    expect(await screen.findByRole('dialog', { name: 'Nueva Convocatoria' })).toBeVisible();
    expect(onActionHandled).toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Descripción y Alcance'), { target: { value: 'Investigación de semillas nativas' } });
    fireEvent.change(screen.getByLabelText('Fuente / Entidad'), { target: { value: 'Minciencias' } });
    fireEvent.change(screen.getByLabelText('Año'), { target: { value: '2027' } });
    fireEvent.change(screen.getByLabelText('Número OE (Opcional)'), { target: { value: 'OE-27-04' } });
    fireEvent.change(screen.getByLabelText('Estado Actual'), { target: { value: 'en_evaluacion' } });
    fireEvent.change(screen.getByPlaceholderText('Ej: Convocatoria Nacional de Proyectos I+D+i 2026'), { target: { value: 'Semillas para el futuro' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Convocatoria' }));
    await waitFor(() => expect(ConvocatoriasAPI.create).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Semillas para el futuro',
      descripcion: 'Investigación de semillas nativas',
      fuente: 'Minciencias',
      año: '2027',
      numero_oe: 'OE-27-04',
      estado: 'en_evaluacion',
    })));
    expect(screen.queryByRole('dialog', { name: 'Nueva Convocatoria' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Nueva Convocatoria' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Nueva Convocatoria' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Nueva Convocatoria' }));
    fireEvent.click(withDialogButton('Nueva Convocatoria', 'Cerrar modal'));
    expect(screen.queryByRole('dialog', { name: 'Nueva Convocatoria' })).not.toBeInTheDocument();
  });

  it('permite editar, desvincular y navegar desde el detalle y cancelar la eliminación', async () => {
    const onNavigate = vi.fn();
    renderModule({ onNavigate });
    await screen.findByText('Convocatoria Abierta');
    fireEvent.click(screen.getAllByRole('button', { name: 'Detalles' })[0]);
    expect(await screen.findByRole('dialog', { name: 'Convocatoria Abierta' })).toBeVisible();

    fireEvent.click(within(screen.getByRole('dialog', { name: 'Convocatoria Abierta' })).getByRole('button', { name: 'Ver Proyecto' }));
    expect(onNavigate).toHaveBeenCalledWith('proyectos', { proyectoId: 'p1' });
    expect(screen.queryByRole('dialog', { name: 'Convocatoria Abierta' })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Detalles' })[0]);
    fireEvent.click(screen.getByTitle('Editar convocatoria'));
    expect(screen.getByRole('dialog', { name: 'Actualizar Convocatoria' })).toBeVisible();
    expect(screen.getByPlaceholderText('Ej: Convocatoria Nacional de Proyectos I+D+i 2026')).toHaveValue('Convocatoria Abierta');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    fireEvent.click(screen.getAllByRole('button', { name: 'Detalles' })[0]);
    fireEvent.click(screen.getByTitle('Desvincular proyecto de esta convocatoria'));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p1', { convocatoria_id: null }));
    fireEvent.click(screen.getByTitle('Eliminar convocatoria'));
    expect(screen.getByRole('alertdialog', { name: '¿Eliminar Convocatoria?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar diálogo' }));
    expect(screen.queryByRole('alertdialog', { name: '¿Eliminar Convocatoria?' })).not.toBeInTheDocument();
  });
});

function withDialogButton(dialogName, buttonName) {
  return screen.getByRole('dialog', { name: dialogName }).querySelector(`button[aria-label="${buttonName}"]`) ??
    Array.from(screen.getByRole('dialog', { name: dialogName }).querySelectorAll('button')).find(button => button.textContent === buttonName);
}
