import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConvocatoriasModule from '../components/calls/ConvocatoriasModule';

vi.mock('../api/convocatorias', () => ({
  ConvocatoriasAPI: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));
vi.mock('../api/proyectos', () => ({ ProyectosAPI: { list: vi.fn(), update: vi.fn() } }));
import { ConvocatoriasAPI } from '../api/convocatorias';
import { ProyectosAPI } from '../api/proyectos';

const convocatorias = [
  { id: 'c1', nombre: 'Convocatoria Abierta', año: 2026, numero_oe: 'OE-26-01', estado: 'abierta', fecha_inicio: '2026-01-01', fecha_cierre: '2026-12-31', descripcion: 'Apoyo a investigación aplicada', fuente: 'SENNOVA', enlace_externo: 'https://sena.edu.co/convocatoria' },
  { id: 'c2', nombre: 'Convocatoria Cerrada', año: 2025, estado: 'cerrada', fecha_cierre: '', fuente: 'Otra' },
];
const proyectos = [
  { id: 'p1', nombre: 'Proyecto Vinculado', codigo_sgps: 'SGPS-01', owner_id: 'staff-1', convocatoria_id: 'c1', presupuesto_total: 1250000, linea_investigacion: 'Producción Agrícola Sostenible', responsable_nombre: 'Ana Investigadora' },
  { id: 'p2', nombre: 'Proyecto Disponible', codigo_sgps: 'SGPS-02', owner_id: 'staff-1', convocatoria_id: null, presupuesto_total: 500000 },
];
const admin = { id: 'admin-1', nombre: 'Administración', rol: 'admin' };

describe('gestión de convocatorias y postulaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('open', vi.fn());
    ConvocatoriasAPI.list.mockResolvedValue(convocatorias);
    ConvocatoriasAPI.get.mockResolvedValue(convocatorias[0]);
    ConvocatoriasAPI.create.mockResolvedValue({ id: 'c3' });
    ConvocatoriasAPI.update.mockResolvedValue({});
    ConvocatoriasAPI.delete.mockResolvedValue({});
    ProyectosAPI.list.mockResolvedValue(proyectos);
    ProyectosAPI.update.mockResolvedValue({});
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('filtra, muestra detalles, navega a un proyecto y postula proyectos disponibles', async () => {
    const onNavigate = vi.fn();
    render(<ConvocatoriasModule currentUser={admin} onNavigate={onNavigate} />);
    expect(await screen.findByRole('heading', { name: 'Convocatorias I+D+i SENNOVA' })).toBeVisible();
    expect(screen.getByText('Convocatoria Abierta')).toBeVisible();
    expect(screen.getByText('Convocatoria Cerrada')).toBeVisible();

    fireEvent.change(screen.getByPlaceholderText(/Buscar convocatoria/), { target: { value: 'OE-26' } });
    expect(screen.getByText('Convocatoria Abierta')).toBeVisible();
    expect(screen.queryByText('Convocatoria Cerrada')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar Filtros' }));
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'abierta' } });
    expect(screen.getByText('Convocatoria Abierta')).toBeVisible();
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'Producción Agrícola Sostenible' } });

    fireEvent.click(screen.getAllByRole('button', { name: /Proyectos Postulados/ })[0]);
    expect(screen.queryByText('Proyecto Vinculado')).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /Proyectos Postulados/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Ver Proyecto' }));
    expect(onNavigate).toHaveBeenCalledWith('proyectos', { proyectoId: 'p1' });

    fireEvent.click(screen.getByRole('button', { name: 'Detalles' }));
    expect(screen.getByRole('dialog', { name: 'Convocatoria Abierta' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Ver Términos de Referencia Oficiales' }));
    expect(window.open).toHaveBeenCalledWith('https://sena.edu.co/convocatoria', '_blank');
    fireEvent.click(screen.getByRole('button', { name: 'Postular Proyecto' }));
    fireEvent.change(screen.getAllByRole('combobox').at(-1), { target: { value: 'p2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Postulación' }));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p2', { convocatoria_id: 'c1' }));
  }, 15000);

  it('crea y edita convocatorias y valida fechas y enlaces', async () => {
    const onNotify = vi.fn();
    render(<ConvocatoriasModule currentUser={admin} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Convocatorias I+D+i SENNOVA' });
    fireEvent.click(screen.getByRole('button', { name: 'Nueva Convocatoria' }));
    fireEvent.change(screen.getByPlaceholderText('Ej: Convocatoria Nacional de Proyectos I+D+i 2026'), { target: { value: 'Convocatoria Nueva' } });
    fireEvent.change(screen.getByLabelText('Fecha Inicio'), { target: { value: '2026-10-10' } });
    fireEvent.change(screen.getByLabelText('Fecha Cierre'), { target: { value: '2026-09-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Convocatoria' }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('La fecha de cierre no puede ser anterior a la de inicio', 'error'));
    fireEvent.change(screen.getByLabelText('Fecha Cierre'), { target: { value: '2026-11-10' } });
    fireEvent.change(screen.getByPlaceholderText('https://sena.edu.co/convocatoria...'), { target: { value: 'sin-url' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Convocatoria' }));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('El enlace externo no es una URL válida', 'error'));
    fireEvent.change(screen.getByPlaceholderText('https://sena.edu.co/convocatoria...'), { target: { value: 'https://sena.edu.co/nueva' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Convocatoria' }));
    await waitFor(() => expect(ConvocatoriasAPI.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Convocatoria Nueva' })));
    expect(onNotify).toHaveBeenCalledWith('Convocatoria creada exitosamente', 'success');

    fireEvent.click(screen.getAllByTitle('Editar Convocatoria')[0]);
    fireEvent.change(screen.getByPlaceholderText('Ej: Convocatoria Nacional de Proyectos I+D+i 2026'), { target: { value: 'Convocatoria Actualizada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(ConvocatoriasAPI.update).toHaveBeenCalledWith('c1', expect.objectContaining({ nombre: 'Convocatoria Actualizada' })));
  });

  it('vincula y desvincula proyectos mediante botones y arrastre, y confirma eliminaciones', async () => {
    const onNotify = vi.fn();
    const { container } = render(<ConvocatoriasModule currentUser={admin} onNotify={onNotify} />);
    await screen.findByText('Convocatoria Abierta');
    fireEvent.click(screen.getByTitle('Desvincular de esta convocatoria'));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p1', { convocatoria_id: null }));

    const card = screen.getByText('Convocatoria Abierta').closest('[class*="cursor-pointer"]');
    const transfer = { types: ['proyectoId'], setData: vi.fn(), getData: vi.fn((key) => key === 'proyectoId' ? 'p2' : '') };
    fireEvent.dragOver(card, { dataTransfer: transfer });
    expect(card).toHaveTextContent('Vincular Proyecto a OE-26-01');
    fireEvent.drop(card, { dataTransfer: transfer });
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p2', { convocatoria_id: 'c1' }));

    const pool = container.querySelector('[class*="group/pool"]');
    const unlinkTransfer = { types: ['proyectoId'], getData: vi.fn(() => 'p1') };
    fireEvent.dragOver(pool, { dataTransfer: unlinkTransfer });
    fireEvent.drop(pool, { dataTransfer: unlinkTransfer });
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenLastCalledWith('p1', { convocatoria_id: null }));

    fireEvent.click(screen.getAllByTitle('Eliminar Convocatoria')[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar Convocatoria' }).at(-1));
    await waitFor(() => expect(ConvocatoriasAPI.delete).toHaveBeenCalledWith('c1'));
    expect(onNotify).toHaveBeenCalledWith('Convocatoria eliminada correctamente', 'success');
  });
});
