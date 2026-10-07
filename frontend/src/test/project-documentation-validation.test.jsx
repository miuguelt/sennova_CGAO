import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { getDocumentationErrors } from '../components/projects/projectDocumentationValidation';
import ProjectDocumentationFields from '../components/projects/ProjectDocumentationFields';
import ProjectDocumentationCard from '../components/projects/ProjectDocumentationCard';
import ProjectFormulationStep from '../components/projects/ProjectFormulationStep';

afterEach(cleanup);
const budgetField = { key: 'valor_planeado', label: 'Valor planeado', type: 'number', required: true };

describe('Validaciones de los formularios documentales', () => {
  it('admite borradores incompletos y cero, y rechaza montos negativos, no numéricos o fuera del rango', () => {
    expect(getDocumentationErrors([budgetField], {})).toEqual({});
    expect(getDocumentationErrors([budgetField], { valor_planeado: '' })).toEqual({});
    expect(getDocumentationErrors([budgetField], { valor_planeado: null })).toEqual({});
    expect(getDocumentationErrors([budgetField], { valor_planeado: 0 })).toEqual({});
    expect(getDocumentationErrors([budgetField], { valor_planeado: '1250.50' })).toEqual({});
    expect(getDocumentationErrors([budgetField], { valor_planeado: -1 }).valor_planeado).toMatch(/igual o mayor que 0/);
    expect(getDocumentationErrors([budgetField], { valor_planeado: 'abc' }).valor_planeado).toMatch(/número válido/);
    expect(getDocumentationErrors([budgetField], { valor_planeado: Infinity }).valor_planeado).toMatch(/número válido/);
    expect(getDocumentationErrors([budgetField], { valor_planeado: true }).valor_planeado).toMatch(/número válido/);
    expect(getDocumentationErrors([{ ...budgetField, min: 1, max: 9 }], { valor_planeado: 10 }).valor_planeado).toMatch(/igual o menor que 9/);
    expect(getDocumentationErrors([{ ...budgetField, min: 1 }], { valor_planeado: 0 }).valor_planeado).toMatch(/igual o mayor que 1/);
  });

  it('valida fechas calendario, períodos coherentes, opciones disponibles y longitud de texto', () => {
    const fields = [
      { key: 'fecha_inicio', label: 'Inicio', type: 'date' }, { key: 'fecha_fin', label: 'Fin', type: 'date' },
      { key: 'periodo_desde', label: 'Desde', type: 'date' }, { key: 'periodo_hasta', label: 'Hasta', type: 'date' },
      { key: 'clasificacion', label: 'Clasificación', type: 'select', options: [{ value: 'publica', label: 'Pública' }] },
      { key: 'observacion', label: 'Observación', type: 'textarea' }, { key: 'titulo', label: 'Título', type: 'text' },
    ];
    expect(getDocumentationErrors(fields, { fecha_inicio: '2026-01-01', fecha_fin: '2026-12-31', clasificacion: 'publica', observacion: 'Texto válido' })).toEqual({});
    expect(getDocumentationErrors(fields, { fecha_inicio: '2026-02-30' }).fecha_inicio).toMatch(/fecha válida/);
    expect(getDocumentationErrors(fields, { fecha_inicio: 'fecha inválida' }).fecha_inicio).toMatch(/fecha válida/);
    expect(getDocumentationErrors(fields, { fecha_inicio: '2026-12-31', fecha_fin: '2026-01-01' }).fecha_fin).toMatch(/posterior a la inicial/);
    expect(getDocumentationErrors(fields, { periodo_desde: '2026-06-30', periodo_hasta: '2026-05-01' }).periodo_hasta).toMatch(/posterior a la inicial/);
    expect(getDocumentationErrors(fields, { clasificacion: 'inexistente' }).clasificacion).toMatch(/opciones disponibles/);
    expect(getDocumentationErrors(fields, { titulo: 'x'.repeat(2001) }).titulo).toMatch(/2000 caracteres/);
    expect(getDocumentationErrors(fields, { observacion: 'x'.repeat(20001) }).observacion).toMatch(/20000 caracteres/);
  });

  it('valida el formato y el orden de las horas dentro de las actividades del cronograma', () => {
    const schedule = { key: 'cronograma', label: 'Cronograma', type: 'rows', columns: [
      { key: 'hora_inicio', label: 'Hora de inicio', type: 'time' },
      { key: 'hora_fin', label: 'Hora de finalización', type: 'time' },
    ] };
    expect(getDocumentationErrors([schedule], { cronograma: [{ hora_inicio: '09:00', hora_fin: '10:00' }, { hora_inicio: '', hora_fin: '' }] })).toEqual({});
    const invalidFormat = getDocumentationErrors([schedule], { cronograma: [{ hora_inicio: '9:00', hora_fin: '10:00' }] });
    expect(invalidFormat.cronograma).toMatch(/fila 1.*formato HH:MM/i);
    const reversedHours = getDocumentationErrors([schedule], { cronograma: [{ hora_inicio: '11:00', hora_fin: '10:00' }] });
    expect(reversedHours.cronograma).toMatch(/fila 1.*hora final.*posterior/i);
  });

  it('impide aplicar una actividad con un horario invertido', () => {
    const schedule = { key: 'cronograma', label: 'Cronograma', type: 'rows', columns: [
      { key: 'actividad', label: 'Actividad', type: 'text' },
      { key: 'hora_inicio', label: 'Hora planeada de inicio', type: 'time' },
      { key: 'hora_fin', label: 'Hora planeada de finalización', type: 'time' },
    ] };
    render(<ProjectDocumentationFields fields={[schedule]} values={{ cronograma: [{ actividad: 'Validar el prototipo', hora_inicio: '11:00', hora_fin: '10:00' }] }} compact onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Editar registro 1 de Cronograma' }));
    expect(screen.getByLabelText('Hora planeada de inicio')).toHaveAttribute('type', 'time');
    expect(screen.getByRole('button', { name: 'Aplicar al formulario' })).toBeDisabled();
    expect(screen.getAllByRole('alert').some(alert => /fila 1.*hora final.*posterior/i.test(alert.textContent))).toBe(true);
  });

  it('revisa los valores dentro de filas y conserva la ubicación del error', () => {
    const rows = { key: 'presupuesto', label: 'Presupuesto', type: 'rows', columns: [budgetField] };
    expect(getDocumentationErrors([rows], { presupuesto: [] })).toEqual({});
    expect(getDocumentationErrors([rows], { presupuesto: [{ valor_planeado: 0 }, { valor_planeado: -1 }] }).presupuesto).toMatch(/fila 2/i);
    expect(getDocumentationErrors([rows], { presupuesto: 'incorrecto' }).presupuesto).toMatch(/hasta 80 registros/);
    expect(getDocumentationErrors([rows], { presupuesto: Array.from({ length: 81 }, () => ({})) }).presupuesto).toMatch(/hasta 80 registros/);
    expect(getDocumentationErrors([rows], { presupuesto: [null] }).presupuesto).toMatch(/fila 1/i);
    expect(getDocumentationErrors()).toEqual({});
  });

  it('señala el campo inválido de forma accesible y permite corregirlo', () => {
    const change = vi.fn();
    const { rerender } = render(<ProjectDocumentationFields fields={[budgetField]} values={{ valor_planeado: -500 }} onChange={change} />);
    const input = screen.getByLabelText('Valor planeado *');
    expect(input).toHaveAttribute('min', '0');
    expect(input).toHaveAttribute('step', 'any');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription(/igual o mayor que 0/);
    fireEvent.change(input, { target: { value: '500' } });
    expect(change).toHaveBeenCalledWith('valor_planeado', 500);
    rerender(<ProjectDocumentationFields fields={[budgetField]} values={{ valor_planeado: 500 }} onChange={change} />);
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('impide aplicar registros con valores inválidos y deja guardar registros parciales', () => {
    const rows = { key: 'presupuesto', label: 'Presupuesto', type: 'rows', columns: [budgetField] };
    render(<ProjectDocumentationFields fields={[rows]} values={{ presupuesto: [{ valor_planeado: -1 }] }} compact onChange={vi.fn()} />);
    expect(screen.queryByText('Campos completos')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar registro 1 de Presupuesto' }));
    expect(screen.getByRole('button', { name: 'Aplicar al formulario' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Valor planeado *'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Aplicar al formulario' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Valor planeado *'), { target: { value: '0' } });
    expect(screen.getByRole('button', { name: 'Aplicar al formulario' })).toBeEnabled();
  });

  it('bloquea el guardado de documentos y etapas con valores inválidos', () => {
    const entry = { titulo: 'Informe', campos: [budgetField], faltantes: [], historial: [], formato: 'docx', carpeta: 'Informes' };
    render(<ProjectDocumentationCard entry={entry} values={{ valor_planeado: -1 }} dirty canEdit />);
    fireEvent.click(screen.getByText('Informe'));
    expect(screen.getByRole('button', { name: 'Guardar Informe' })).toBeDisabled();
    cleanup();
    render(<ProjectFormulationStep step={{ id: 'recursos', titulo: 'Recursos', fuente: 'comunes', campos: ['valor_planeado'] }} commonFields={[budgetField]} commonValues={{ valor_planeado: -1 }} canEdit dirty />);
    expect(screen.getByRole('button', { name: 'Guardar datos institucionales' })).toBeDisabled();
  });
});
