import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ProjectTimeline, { formatProjectTimelineDate } from '../components/projects/ProjectTimeline';
import { formsForPhase, getActivityDateRange } from '../components/projects/projectTimelineData';

afterEach(cleanup);

describe('Línea de tiempo del proyecto', () => {
  it('lee rangos calendario escritos o estructurados y rechaza fechas imposibles o invertidas', () => {
    expect(getActivityDateRange({ fecha_inicio: '2026-05-29', fecha_fin: '2026-06-28' })).toEqual({ start: '2026-05-29', end: '2026-06-28' });
    expect(getActivityDateRange({ fecha_textual: '29/05/2026 a 28/06/2026' })).toEqual({ start: '2026-05-29', end: '2026-06-28' });
    expect(getActivityDateRange({ fecha_textual: 'Fecha única: 2026-06-28' })).toEqual({ start: '2026-06-28', end: '2026-06-28' });
    expect(getActivityDateRange({ fecha_inicio: '2026-02-30', fecha_fin: '2026-03-01' })).toBeNull();
    expect(getActivityDateRange({ fecha_textual: '28/06/2026 a 29/05/2026' })).toBeNull();
    expect(getActivityDateRange({ fecha_textual: 'Mes 1 a Mes 2' })).toBeNull();
  });

  it('relaciona los formularios disponibles con la etapa documental correspondiente', () => {
    const forms = [
      { clave: 'formulacion_proyecto', tipo: 'formulacion_proyecto' },
      { clave: 'presentacion_proyecto', tipo: 'presentacion_proyecto' },
      { clave: 'acta_inicio', tipo: 'acta_inicio' },
      { clave: 'informe_bimensual__b1', tipo: 'informe_bimensual', periodo_bimestre: 1 },
      { clave: 'informe_bimensual__b3', tipo: 'informe_bimensual', periodo_bimestre: 3 },
      { clave: 'producto_resultado', tipo: 'producto_resultado' },
      { clave: 'poster_producto', tipo: 'poster_producto' },
      { clave: 'registro_evidencias', tipo: 'registro_evidencias' },
      { clave: 'informe_final', tipo: 'informe_final' },
      { clave: 'acta_cierre', tipo: 'acta_cierre' },
      { clave: 'otro', tipo: 'formato_sin_clasificar' },
    ];
    expect(formsForPhase(forms, 'Fase I').map(form => form.clave)).toEqual(['formulacion_proyecto', 'presentacion_proyecto', 'acta_inicio']);
    expect(formsForPhase(forms, 'Fase II').map(form => form.clave)).toEqual(['informe_bimensual__b1']);
    expect(formsForPhase(forms, 'Fase III').map(form => form.clave)).toEqual(['informe_bimensual__b3', 'producto_resultado', 'poster_producto', 'registro_evidencias']);
    expect(formsForPhase(forms, 'Fase Final').map(form => form.clave)).toEqual(['informe_final', 'acta_cierre']);
    expect(formsForPhase(forms, 'Desconocida')).toEqual([]);
  });

  it('ubica entregables por su fase registrada y utiliza títulos y fechas del servicio', () => {
    render(<ProjectTimeline entregables={[
      { id: 'final', fase: 'Final', titulo: 'Informe final', fecha_entrega: '2026-12-15', estado: 'pendiente', responsable_nombre: 'Equipo del proyecto' },
      { id: 'diagnostico', fase: 'Fase I', titulo: 'Diagnóstico de necesidades', fecha_entrega: '2026-02-20', estado: 'aprobado' },
      { id: 'diseno', fase: 'Fase II', titulo: 'Diseño de solución', fecha_entrega: '2026-04-20', estado: 'en_revision' },
      { id: 'pruebas', fase: 'Fase III', titulo: 'Pruebas de validación', estado: 'borrador' },
    ]} />);
    const initial = screen.getByRole('region', { name: 'Fase I' });
    const final = screen.getByRole('region', { name: 'Fase Final' });
    expect(within(initial).getByText('Diagnóstico de necesidades')).toBeVisible();
    expect(within(initial).queryByText('Informe final')).not.toBeInTheDocument();
    expect(within(final).getByText('Informe final')).toBeVisible();
    expect(within(final).getByText('15/12/2026')).toBeVisible();
    expect(within(final).getByText('Equipo del proyecto')).toBeVisible();
    expect(within(initial).getByText('Aprobado')).toBeVisible();
    expect(screen.getByText('En revisión')).toBeVisible();
    expect(screen.getByText('borrador')).toBeVisible();
  });

  it('conserva fases sin clasificar sin repartir entregables arbitrariamente', () => {
    render(<ProjectTimeline entregables={[
      { id: 'custom', fase: 'Transferencia', titulo: 'Taller de transferencia' },
      { id: 'legacy', nombre: 'Entregable anterior', fecha_limite: '2026-05-11' },
      { id: 'final', fase: 'Fase Final', titulo: 'Acta de cierre' },
    ]} />);
    const pending = screen.getByRole('region', { name: 'Sin fase asignada' });
    expect(within(pending).getByText('Taller de transferencia')).toBeVisible();
    expect(within(pending).getByText('Fase registrada: Transferencia')).toBeVisible();
    expect(within(pending).getByText('Entregable anterior')).toBeVisible();
    expect(within(pending).getByText('11/05/2026')).toBeVisible();
    expect(within(screen.getByRole('region', { name: 'Fase Final' })).getByText('Acta de cierre')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Fase I' })).toHaveTextContent('Aún no hay entregables registrados para esta fase.');
  });

  it('muestra las actividades planeadas y permite abrir sus formularios sin afirmar su ejecución', () => {
    const edit = vi.fn();
    render(<ProjectTimeline cronograma={[{ actividad: 'Validar el prototipo', encargado: 'Equipo técnico', fecha_textual: 'Meses 4 a 5', resultado: 'Informe de validación previsto' }]} onEditPlanning={edit} />);
    const planning = screen.getByRole('region', { name: 'Cronograma de la documentación' });
    expect(within(planning).getByText('Validar el prototipo')).toBeVisible();
    expect(within(planning).getByText('Meses 4 a 5')).toBeVisible();
    expect(within(planning).getByText('Equipo técnico')).toBeVisible();
    expect(within(planning).getByText('Informe de validación previsto')).toBeVisible();
    expect(within(planning).getByText(/actividades planeadas/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Completar fase, fechas y lugar en Documentación' }));
    expect(edit).toHaveBeenCalledOnce();
  });

  it('explica cómo completar un cronograma vacío y conserva valores pendientes', () => {
    const { rerender } = render(<ProjectTimeline />);
    expect(screen.getByText(/Completa las actividades, responsables, períodos y resultados/)).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<ProjectTimeline cronograma={[{}]} entregables={[{ id: 'p', fase: 'Fase I' }]} />);
    expect(screen.getByText('Actividad 1')).toBeVisible();
    expect(screen.getByText('Entregable por nombrar')).toBeVisible();
    expect(screen.getByText('Período por completar')).toBeVisible();
    expect(screen.getByText('Responsable por asignar')).toBeVisible();
    expect(screen.getByText('Resultado por completar')).toBeVisible();
    expect(screen.getByText('Sin fecha registrada')).toBeVisible();
  });

  it('presenta las fechas calendario sin desplazarlas por el huso horario', () => {
    expect(formatProjectTimelineDate('2026-02-01')).toBe('1/02/2026');
    expect(formatProjectTimelineDate('2026-03-20T00:00:00Z')).toBe('20/03/2026');
    expect(formatProjectTimelineDate('dato inválido')).toBe('Fecha por revisar');
    expect(formatProjectTimelineDate('2026-02-30')).toBe('Fecha por revisar');
    expect(formatProjectTimelineDate()).toBe('Sin fecha registrada');
  });

  it('ubica actividades en el Gantt por fase, fecha, hora y lugar, y abre el formulario del período', () => {
    const openForm = vi.fn();
    render(<ProjectTimeline today={new Date(2026, 9, 3, 9, 30)} onOpenForm={openForm}
      cronograma={[{
        actividad: 'Validar el prototipo', fase: 'Fase II', encargado: 'Equipo técnico',
        fecha_inicio: '2026-10-01', fecha_fin: '2026-10-05', hora_inicio: '09:00', hora_fin: '10:30',
        lugar: 'CGAO, Subsede Vélez', resultado: 'Acta de validación',
      }]}
      formularios={[
        { clave: 'informe_bimensual__b1', tipo: 'informe_bimensual', periodo_bimestre: 1, titulo: 'Informe bimestral · Bimestre 1' },
        { clave: 'informe_bimensual__b2', tipo: 'informe_bimensual', periodo_bimestre: 2, titulo: 'Informe bimestral · Bimestre 2' },
        { clave: 'acta_cierre', tipo: 'acta_cierre', titulo: 'Acta de cierre del proyecto' },
      ]} />);

    const chart = screen.getByRole('region', { name: 'Diagrama de Gantt del proyecto' });
    expect(chart).toHaveTextContent('Validar el prototipo');
    expect(chart).toHaveTextContent('1/10/2026');
    expect(chart).toHaveTextContent('5/10/2026');
    expect(chart).toHaveTextContent('09:00 a 10:30');
    expect(chart).toHaveTextContent('CGAO, Subsede Vélez');
    expect(screen.getByText('Fase prevista ahora: Fase II')).toBeVisible();

    const phaseTwo = screen.getByRole('region', { name: 'Fase II' });
    expect(within(chart).getByRole('article', { name: /Validar el prototipo, Fase II/ })).toBeVisible();
    fireEvent.click(within(phaseTwo).getByRole('button', { name: 'Abrir formulario: Informe bimestral · Bimestre 1' }));
    expect(openForm).toHaveBeenCalledWith('informe_bimensual__b1');

    const phaseThree = screen.getByRole('region', { name: 'Fase III' });
    expect(within(phaseThree).getByRole('button', { name: 'Abrir formulario: Informe bimestral · Bimestre 2' })).toBeVisible();
    const final = screen.getByRole('region', { name: 'Fase Final' });
    expect(within(final).getByRole('button', { name: 'Abrir formulario: Acta de cierre del proyecto' })).toBeVisible();
  });

  it('no determina una fase actual con actividades sin fechas calendario completas', () => {
    const openPlanning = vi.fn();
    render(<ProjectTimeline today={new Date(2026, 9, 3)} onEditPlanning={openPlanning} cronograma={[{
      actividad: 'Revisar fuentes', fase: 'Fase I', fecha_textual: 'Mes 1 a Mes 2', lugar: 'Biblioteca del CGAO',
    }]} />);
    expect(screen.getByText(/No se puede determinar la fase prevista ahora/)).toBeVisible();
    expect(screen.getByText('Completa las fechas de inicio y fin en Datos compartidos para ubicar las actividades en el diagrama.')).toBeVisible();
    expect(screen.getByText('Biblioteca del CGAO')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Completar fechas, fase y lugar' }));
    expect(openPlanning).toHaveBeenCalledOnce();
  });

  it('actualiza la fase prevista mientras la línea de tiempo permanece abierta', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 3, 8, 59));
    const view = render(<ProjectTimeline cronograma={[{
      actividad: 'Realizar la prueba', fase: 'Fase II', fecha_inicio: '2026-10-03', fecha_fin: '2026-10-03',
      hora_inicio: '09:00', hora_fin: '10:00', lugar: 'CGAO',
    }]} />);
    try {
      expect(screen.getByText('No hay una actividad programada ahora.')).toBeVisible();
      act(() => vi.advanceTimersByTime(60_000));
      expect(screen.getByText('Fase prevista ahora: Fase II')).toBeVisible();
      expect(screen.getByText('Lugar previsto ahora: CGAO')).toBeVisible();
    } finally {
      view.unmount();
      vi.useRealTimers();
    }
  });
});
