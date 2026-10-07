import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ProjectTimelinePanel from '../components/projects/ProjectTimelinePanel';
import { ProyectosAPI } from '../api/proyectos';
import { ProjectDocumentationAPI } from '../api/projectDocumentation';
import { emitDataRefresh } from '../utils/dataRefresh';

vi.mock('../api/proyectos', () => ({ ProyectosAPI: { get: vi.fn() } }));
vi.mock('../api/projectDocumentation', () => ({ ProjectDocumentationAPI: { get: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  ProjectDocumentationAPI.get.mockResolvedValue({ documentos: [] });
});
afterEach(cleanup);

describe('Consulta autoritativa de la línea de tiempo', () => {
  it('consulta el detalle y presenta entregables y cronograma guardados', async () => {
    let resolve;
    ProyectosAPI.get.mockReturnValue(new Promise(done => { resolve = done; }));
    render(<ProjectTimelinePanel projectId="p-1" />);
    expect(screen.getByRole('status')).toHaveTextContent('Consultando cronograma');
    expect(ProyectosAPI.get).toHaveBeenCalledWith('p-1');
    await act(async () => resolve({ entregables: [{ id: 'e-1', fase: 'Fase I', titulo: 'Diagnóstico registrado' }], cronograma_documental: [{ actividad: 'Actividad prevista' }] }));
    expect(screen.getByText('Diagnóstico registrado')).toBeVisible();
    expect(screen.getByText('Actividad prevista')).toBeVisible();
  });

  it('permite reintentar fallos de consulta y recuperar un detalle sin filas', async () => {
    ProyectosAPI.get.mockRejectedValueOnce(new Error('Servicio temporalmente no disponible')).mockResolvedValue({});
    render(<ProjectTimelinePanel projectId="p-1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio temporalmente no disponible');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar cronograma' }));
    expect(await screen.findByText(/Completa las actividades, responsables, períodos y resultados/)).toBeVisible();
    expect(ProyectosAPI.get).toHaveBeenCalledTimes(2);
  });

  it('refresca tras mutaciones documentales y descarta respuestas del proyecto anterior', async () => {
    let oldResolve;
    ProyectosAPI.get.mockImplementation(id => id === 'p-1' ? new Promise(done => { oldResolve = done; }) : Promise.resolve({ entregables: [], cronograma_documental: [{ actividad: 'Nuevo proyecto' }] }));
    const { rerender } = render(<ProjectTimelinePanel projectId="p-1" />);
    rerender(<ProjectTimelinePanel projectId="p-2" />);
    expect(await screen.findByText('Nuevo proyecto')).toBeVisible();
    await act(async () => oldResolve({ entregables: [{ id: 'old', titulo: 'Respuesta anterior' }] }));
    expect(screen.queryByText('Respuesta anterior')).not.toBeInTheDocument();
    act(() => emitDataRefresh({ endpoint: '/proyectos/p-2/documentacion/comunes', method: 'PUT' }));
    await waitFor(() => expect(ProyectosAPI.get).toHaveBeenCalledTimes(3));
    act(() => emitDataRefresh({ endpoint: '/usuarios', method: 'PUT' }));
    expect(ProyectosAPI.get).toHaveBeenCalledTimes(3);
  });

  it('descarta errores tardíos y conserva un mensaje accionable cuando no hay detalle del error', async () => {
    let reject;
    ProyectosAPI.get.mockReturnValueOnce(new Promise((_resolve, fail) => { reject = fail; })).mockRejectedValueOnce({});
    const { rerender } = render(<ProjectTimelinePanel projectId="p-1" />);
    rerender(<ProjectTimelinePanel projectId="p-2" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No fue posible consultar el cronograma. Intenta de nuevo.');
    await act(async () => reject(new Error('Fallo del proyecto anterior')));
    expect(screen.queryByText('Fallo del proyecto anterior')).not.toBeInTheDocument();
  });

  it('consulta los formularios disponibles y conecta cada fase con su captura', async () => {
    const openForm = vi.fn();
    ProyectosAPI.get.mockResolvedValue({ entregables: [], cronograma_documental: [] });
    ProjectDocumentationAPI.get.mockResolvedValue({ documentos: [
      { clave: 'acta_inicio', tipo: 'acta_inicio', titulo: 'Acta de inicio del proyecto' },
    ] });
    render(<ProjectTimelinePanel projectId="p-1" onOpenForm={openForm} />);
    const phase = await screen.findByRole('region', { name: 'Fase I' });
    fireEvent.click(within(phase).getByRole('button', { name: 'Abrir formulario: Acta de inicio del proyecto' }));
    expect(ProjectDocumentationAPI.get).toHaveBeenCalledWith('p-1');
    expect(openForm).toHaveBeenCalledWith('acta_inicio');
  });
});
