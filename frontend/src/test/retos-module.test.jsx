import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RetosModule from '../components/ideas/RetosModule';

vi.mock('../api/retos', () => ({ RetosAPI: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() } }));
vi.mock('../api/semilleros', () => ({ SemillerosAPI: { list: vi.fn() } }));
import { RetosAPI } from '../api/retos';
import { SemillerosAPI } from '../api/semilleros';

const retos = [
  { id: 'r1', titulo: 'Aprovechar residuos de café', descripcion: 'Diseñar un proceso de transformación.', sector_productivo: 'Agroindustria', empresa_solicitante: 'Café Vélez', contacto_email: 'contacto@cafe.example', estado: 'abierto', prioridad: 'alta', created_at: '2026-09-01' },
  { id: 'r2', titulo: 'Monitoreo de riego inteligente', descripcion: 'Instalar sensores de humedad.', sector_productivo: 'Tecnología', estado: 'asignado', prioridad: 'media', semillero_asignado_id: 's1', created_at: '2026-08-15' },
];
const semilleros = [{ id: 's1', nombre: 'AgroTech' }];

describe('banco de retos de innovación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'print').mockImplementation(() => {});
    RetosAPI.list.mockResolvedValue(retos);
    RetosAPI.get.mockResolvedValue(null);
    RetosAPI.create.mockResolvedValue({ id: 'r3' });
    RetosAPI.update.mockResolvedValue({});
    RetosAPI.delete.mockResolvedValue({});
    SemillerosAPI.list.mockResolvedValue(semilleros);
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('filtra por texto, sector y estado y muestra una ficha de reto según el rol', async () => {
    const onNotify = vi.fn();
    const onModuleAction = vi.fn();
    render(<RetosModule currentUser={{ id: 'i1', rol: 'investigador' }} onNotify={onNotify} onModuleAction={onModuleAction} />);
    expect(await screen.findByText('Aprovechar residuos de café')).toBeVisible();
    expect(screen.getByText('Monitoreo de riego inteligente')).toBeVisible();

    fireEvent.change(screen.getByPlaceholderText(/Buscar por título/), { target: { value: 'café' } });
    expect(screen.getByText('Aprovechar residuos de café')).toBeVisible();
    expect(screen.queryByText('Monitoreo de riego inteligente')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por título/), { target: { value: '' } });
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Tecnología' } });
    expect(screen.getByText('Monitoreo de riego inteligente')).toBeVisible();
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'asignado' } });

    fireEvent.click(screen.getByText('Monitoreo de riego inteligente'));
    expect(screen.getByRole('dialog', { name: 'Monitoreo de riego inteligente' })).toBeVisible();
    expect(screen.getAllByText('AgroTech').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Formular Proyecto de Solución' }));
    expect(onNotify).toHaveBeenCalledWith(expect.stringContaining('formulación de proyecto'), 'info');
    expect(onModuleAction).toHaveBeenCalledWith(expect.objectContaining({ module: 'proyectos', form: 'create' }));
  });

  it('publica un reto, edita su estado y elimina el registro', async () => {
    const onNotify = vi.fn();
    render(<RetosModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByText('Aprovechar residuos de café');
    fireEvent.click(screen.getAllByRole('button', { name: 'Publicar Reto' }).at(-1));
    fireEvent.change(screen.getByPlaceholderText(/Análisis de eficiencia energética/), { target: { value: 'Optimizar secado de cacao' } });
    fireEvent.change(screen.getByPlaceholderText(/Detalla el problema/), { target: { value: 'Reducir consumo energético.' } });
    fireEvent.change(screen.getByLabelText('Sector Productivo'), { target: { value: 'Otro' } });
    fireEvent.change(screen.getByLabelText('Prioridad de Atención'), { target: { value: 'baja' } });
    fireEvent.change(screen.getByPlaceholderText('Nombre de la empresa o grupo'), { target: { value: 'Cacao Santander' } });
    fireEvent.change(screen.getByPlaceholderText('ejemplo@empresa.com'), { target: { value: 'cacao@empresa.example' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Publicar Reto' }).at(-1));
    await waitFor(() => expect(RetosAPI.create).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Optimizar secado de cacao', sector_productivo: 'Otro', prioridad: 'baja' })));
    expect(onNotify).toHaveBeenCalledWith('Reto publicado exitosamente', 'success');

    fireEvent.click(screen.getByText('Aprovechar residuos de café'));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Reto' }));
    fireEvent.change(screen.getByLabelText('Estado de Gestión'), { target: { value: 'en_estudio' } });
    fireEvent.change(screen.getByLabelText('Semillero Asignado'), { target: { value: 's1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Reto' }));
    await waitFor(() => expect(RetosAPI.update).toHaveBeenCalledWith('r1', expect.objectContaining({ estado: 'en_estudio', semillero_asignado_id: 's1' })));
    expect(onNotify).toHaveBeenCalledWith('Reto actualizado correctamente', 'success');

    fireEvent.click(screen.getByText('Monitoreo de riego inteligente'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar Reto' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar Reto' }).at(-1));
    await waitFor(() => expect(RetosAPI.delete).toHaveBeenCalledWith('r2'));
  });

  it('asigna un reto al semillero arrastrado y conserva las acciones formativas para aprendices', async () => {
    const onModuleAction = vi.fn();
    const onActionHandled = vi.fn();
    const { rerender } = render(<RetosModule currentUser={{ id: 'learner', rol: 'aprendiz' }} onNotify={vi.fn()} onModuleAction={onModuleAction} />);
    await screen.findByText('Aprovechar residuos de café');
    const retoCard = screen.getByText('Aprovechar residuos de café').closest('[class*="cursor-pointer"]');
    const transfer = { getData: vi.fn(() => 's1') };
    fireEvent.dragOver(retoCard, { dataTransfer: transfer });
    fireEvent.drop(retoCard, { dataTransfer: transfer });
    await waitFor(() => expect(RetosAPI.update).toHaveBeenCalledWith('r1', expect.objectContaining({ semillero_asignado_id: 's1' })));

    fireEvent.click(screen.getByText('Aprovechar residuos de café'));
    expect(screen.getByText(/Habla con tu instructor o tutor/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Explorar Semilleros Disponibles' }));
    expect(onModuleAction).toHaveBeenCalledWith({ module: 'semilleros' });
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    expect(window.print).toHaveBeenCalled();
    rerender(<RetosModule currentUser={{ id: 'learner', rol: 'aprendiz' }} onNotify={vi.fn()} onModuleAction={onModuleAction} initialAction={{ form: 'create' }} onActionHandled={onActionHandled} />);
    expect(screen.getByRole('dialog', { name: 'Publicar Nuevo Reto' })).toBeVisible();
    await waitFor(() => expect(onActionHandled).toHaveBeenCalledTimes(1));
  });

  it('abre el reto indicado por una acción inicial cuando ya está en la lista', async () => {
    const onActionHandled = vi.fn();
    render(
      <RetosModule
        currentUser={{ id: 'admin', rol: 'admin' }}
        initialAction={{ form: 'view', data: { id: 'r2' } }}
        onActionHandled={onActionHandled}
        onNotify={vi.fn()}
      />,
    );

    expect(await screen.findByRole('dialog', { name: 'Monitoreo de riego inteligente' })).toBeVisible();
    await waitFor(() => expect(onActionHandled).toHaveBeenCalled());
    expect(RetosAPI.get).toHaveBeenCalledWith('r2');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    expect(screen.queryByRole('dialog', { name: 'Monitoreo de riego inteligente' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Monitoreo de riego inteligente'));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Monitoreo de riego inteligente' })).not.toBeInTheDocument();
  });

  it('consulta un reto fuera de la lista y tolera errores de esa consulta', async () => {
    const fetched = { ...retos[0], id: 'r-external', titulo: 'Reto consultado por identificador' };
    RetosAPI.list.mockResolvedValue([]);
    RetosAPI.get.mockResolvedValue(fetched);
    const onActionHandled = vi.fn();
    const { rerender } = render(
      <RetosModule
        currentUser={{ id: 'investigator', rol: 'investigador' }}
        initialAction={{ form: 'view', initialData: { id: 'r-external' } }}
        onActionHandled={onActionHandled}
        onNotify={vi.fn()}
      />,
    );

    expect(await screen.findByRole('dialog', { name: 'Reto consultado por identificador' })).toBeVisible();
    await waitFor(() => expect(onActionHandled).toHaveBeenCalled());
    expect(RetosAPI.get).toHaveBeenCalledWith('r-external');
  });

  it('tolera un error al consultar un reto fuera de la lista', async () => {
    RetosAPI.list.mockResolvedValue([]);
    RetosAPI.get.mockRejectedValue(new Error('No existe'));
    render(
      <RetosModule
        currentUser={{ id: 'investigator', rol: 'investigador' }}
        initialAction={{ form: 'view', data: { id: 'r-missing' } }}
        onActionHandled={vi.fn()}
        onNotify={vi.fn()}
      />,
    );

    await waitFor(() => expect(RetosAPI.get).toHaveBeenCalledWith('r-missing'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('avisa cuando fallan las cargas de retos y semilleros', async () => {
    const onNotify = vi.fn();
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    RetosAPI.list.mockRejectedValue(new Error('Error de red'));
    SemillerosAPI.list.mockRejectedValue(new Error('Error de red'));

    render(<RetosModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);

    expect(await screen.findByText('No encontramos lo que buscas')).toBeVisible();
    expect(onNotify).toHaveBeenCalledWith('Error cargando el banco de retos', 'error');
    expect(logError).toHaveBeenCalledWith('Error loading semilleros', expect.any(Error));
  });

  it('limpia los filtros activos y permite cancelar la publicación', async () => {
    render(<RetosModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={vi.fn()} />);
    await screen.findByText('Aprovechar residuos de café');

    fireEvent.change(screen.getByPlaceholderText(/Buscar por título/), { target: { value: 'inexistente' } });
    expect(screen.getByText('No encontramos lo que buscas')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar Filtros' }));
    expect(screen.getByText('Aprovechar residuos de café')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Publicar Reto' }));
    const modal = screen.getByRole('dialog', { name: 'Publicar Nuevo Reto' });
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ventana modal' }));
    expect(modal).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Publicar Reto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Publicar Nuevo Reto' })).not.toBeInTheDocument();
  });

  it('mantiene el formulario abierto y muestra el error si falla la publicación', async () => {
    const onNotify = vi.fn();
    RetosAPI.create.mockRejectedValue(new Error('Validación del servidor'));
    render(<RetosModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByText('Aprovechar residuos de café');

    fireEvent.click(screen.getByRole('button', { name: 'Publicar Reto' }));
    fireEvent.change(screen.getByPlaceholderText(/Análisis de eficiencia energética/), { target: { value: 'Reto nuevo' } });
    fireEvent.change(screen.getByPlaceholderText(/Detalla el problema/), { target: { value: 'Descripción del reto' } });
    fireEvent.click(screen.getAllByRole('button', { name: 'Publicar Reto' }).at(-1));

    expect(await screen.findByRole('dialog', { name: 'Publicar Nuevo Reto' })).toBeVisible();
    expect(onNotify).toHaveBeenCalledWith('Validación del servidor', 'error');
  });

  it('maneja el arrastre sin semillero y el error al asignarlo o eliminar un reto', async () => {
    const onNotify = vi.fn();
    RetosAPI.update.mockRejectedValue(new Error('No autorizado'));
    RetosAPI.delete.mockRejectedValue(new Error('No autorizado'));
    render(<RetosModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByText('Aprovechar residuos de café');

    const retoCard = screen.getByText('Aprovechar residuos de café').closest('[class*="cursor-pointer"]');
    const emptyTransfer = { getData: vi.fn(() => '') };
    fireEvent.dragOver(retoCard, { dataTransfer: emptyTransfer });
    fireEvent.dragLeave(retoCard);
    fireEvent.drop(retoCard, { dataTransfer: emptyTransfer });
    expect(RetosAPI.update).not.toHaveBeenCalled();

    const semilleroItem = screen.getAllByText('AgroTech')[0].closest('[draggable="true"]');
    const transfer = { setData: vi.fn(), getData: vi.fn(() => 's1') };
    fireEvent.dragStart(semilleroItem, { dataTransfer: transfer });
    expect(transfer.setData).toHaveBeenCalledWith('semilleroId', 's1');
    fireEvent.drop(retoCard, { dataTransfer: transfer });
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al asignar semillero', 'error'));

    fireEvent.click(screen.getByText('Aprovechar residuos de café'));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Reto' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar Reto' }).at(-1));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al eliminar el reto: No autorizado', 'error'));
    expect(RetosAPI.delete).toHaveBeenCalledWith('r1');
    const confirmation = screen.getByRole('dialog', { name: '¿Eliminar Reto del Banco?' });
    fireEvent.click(confirmation.querySelector('[aria-label="Cerrar ventana modal"]'));
    expect(screen.queryByRole('dialog', { name: '¿Eliminar Reto del Banco?' })).not.toBeInTheDocument();
  });
});
