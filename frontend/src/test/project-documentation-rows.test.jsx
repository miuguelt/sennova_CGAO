import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ProjectDocumentationFields from '../components/projects/ProjectDocumentationFields';

const team = {
  key: 'equipo', label: 'Personal vinculado', type: 'rows', help: 'Relaciona integrantes y responsabilidades.',
  details_label: 'Datos de autoría y contacto (si el formato los solicita)',
  details_help: 'Completa estos datos solo cuando el formato los exige y tienes autorización.',
  columns: [
    { key: 'nombre', label: 'Nombre', required: true },
    { key: 'rol', label: 'Rol', type: 'select', required: true, options: [{ value: 'investigador', label: 'Investigador' }] },
    { key: 'responsabilidades', label: 'Responsabilidades', type: 'textarea', required: true, help: 'Describe las tareas acordadas.' },
    { key: 'correo_contacto', label: 'Correo de contacto', optional_detail: true },
  ],
};
const budget = { key: 'presupuesto', label: 'Presupuesto', type: 'rows', required: true,
  columns: [{ key: 'rubro', label: 'Rubro', required: true }, { key: 'valor_planeado', label: 'Valor planeado', type: 'number', required: true }] };

function RowsHarness({ field = team, initial = [], disabled = false, onChange = vi.fn() }) {
  const [rows, setRows] = useState(initial);
  return <ProjectDocumentationFields fields={[field]} values={{ [field.key]: rows }} compact disabled={disabled}
    onChange={(key, next) => { setRows(next); onChange(key, next); }} />;
}
const add = () => fireEvent.click(screen.getByRole('button', { name: 'Agregar registro en Personal vinculado' }));
const edit = (index = 1) => fireEvent.click(screen.getByRole('button', { name: `Editar registro ${index} de Personal vinculado` }));
const apply = () => fireEvent.click(screen.getByRole('button', { name: 'Aplicar al formulario' }));

afterEach(cleanup);

describe('Registros de documentación en ventanas', () => {
  it('mantiene el formulario despejado y abrir o cancelar no agrega una fila vacía', () => {
    const changed = vi.fn();
    render(<RowsHarness onChange={changed} />);
    expect(screen.getByText('Aún no has agregado registros.')).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    add();
    expect(screen.getByRole('dialog', { name: 'Agregar registro' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(changed).not.toHaveBeenCalled();
  });

  it('permite avanzar con un registro parcial y señala los datos que aún faltan', () => {
    const changed = vi.fn();
    render(<RowsHarness onChange={changed} />);
    add();
    fireEvent.change(screen.getByLabelText(/^Nombre \*/), { target: { value: 'Integrante de prueba' } });
    apply();
    expect(changed).toHaveBeenCalledWith('equipo', [{ nombre: 'Integrante de prueba' }]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Integrante de prueba' })).toBeVisible();
    expect(screen.getByText('2 campos por completar')).toBeVisible();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    edit();
    expect(screen.getByLabelText(/^Nombre \*/)).toHaveValue('Integrante de prueba');
  });

  it('edita un registro sin alterar los otros ni perder datos adicionales', () => {
    const changed = vi.fn();
    const initial = [{ nombre: 'Equipo A', rol: 'investigador', responsabilidades: 'Diseñar el instrumento.', correo_contacto: 'contacto@example.com', dato_preservado: 'conservar' }, { nombre: 'Equipo B' }];
    render(<RowsHarness initial={initial} onChange={changed} />);
    expect(screen.getByText('Investigador')).toBeVisible();
    expect(screen.queryByText('contacto@example.com')).not.toBeInTheDocument();
    expect(screen.getByText('Campos completos')).toBeVisible();
    edit();
    fireEvent.change(screen.getByLabelText(/^Nombre \*/), { target: { value: 'Equipo actualizado' } });
    expect(screen.getByRole('heading', { name: 'Equipo A' })).toBeInTheDocument();
    apply();
    expect(changed).toHaveBeenCalledWith('equipo', [{ ...initial[0], nombre: 'Equipo actualizado' }, initial[1]]);
    expect(screen.getByRole('heading', { name: 'Equipo actualizado' })).toBeVisible();
  });

  it('mantiene el contacto opcional y protege la edición frente a un cierre accidental', () => {
    const changed = vi.fn();
    render(<RowsHarness initial={[{}]} onChange={changed} />);
    edit();
    const disclosure = screen.getByText(team.details_label).closest('details');
    expect(disclosure).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText(team.details_label));
    expect(screen.getByLabelText(/^Correo de contacto$/)).not.toBeRequired();
    fireEvent.change(screen.getByLabelText(/^Correo de contacto$/), { target: { value: 'contacto@example.com' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Descartar cambios del registro' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
    expect(screen.getByLabelText(/^Correo de contacto$/)).toHaveValue('contacto@example.com');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Descartar cambios del registro' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(changed).not.toHaveBeenCalled();
    edit();
    fireEvent.click(screen.getByText(team.details_label));
    expect(screen.getByLabelText(/^Correo de contacto$/)).toHaveValue('');
  });

  it('permite consultar los registros con los permisos de solo lectura', () => {
    const changed = vi.fn();
    render(<RowsHarness disabled initial={[{ nombre: 'Equipo de consulta' }]} onChange={changed} />);
    expect(screen.queryByRole('button', { name: /Agregar registro/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Eliminar registro/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar registro 1 de Personal vinculado' }));
    expect(screen.getByRole('dialog', { name: 'Consultar registro 1' })).toBeVisible();
    expect(screen.getByLabelText(/^Nombre \*/)).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Aplicar al formulario' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Volver al formulario' }));
    expect(changed).not.toHaveBeenCalled();
  });

  it('confirma la eliminación y mantiene intactos los demás registros', () => {
    const changed = vi.fn();
    render(<RowsHarness initial={[{ nombre: 'Equipo A' }, { nombre: 'Equipo B' }]} onChange={changed} />);
    const remove = screen.getByRole('button', { name: 'Eliminar registro 1 de Personal vinculado' });
    fireEvent.click(remove);
    expect(screen.getByRole('dialog', { name: 'Eliminar registro' })).toHaveTextContent('Equipo A');
    fireEvent.click(screen.getByRole('button', { name: 'Conservar registro' }));
    expect(changed).not.toHaveBeenCalled();
    fireEvent.click(remove);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(changed).not.toHaveBeenCalled();
    fireEvent.click(remove);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Eliminar registro' }));
    expect(changed).toHaveBeenCalledWith('equipo', [{ nombre: 'Equipo B' }]);
    expect(screen.queryByRole('heading', { name: 'Equipo A' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Agregar registro en Personal vinculado' })).toHaveFocus();
  });

  it('considera cero un valor diligenciado y presenta el presupuesto en pesos', () => {
    const changed = vi.fn();
    render(<RowsHarness field={budget} initial={[{ rubro: 'Recursos existentes', valor_planeado: 0 }]} onChange={changed} />);
    expect(screen.getByText('Campos completos')).toBeVisible();
    expect(screen.getByText(/\$\s*0/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Editar registro 1 de Presupuesto' }));
    fireEvent.change(screen.getByLabelText(/^Valor planeado \*/), { target: { value: '2500000' } });
    apply();
    expect(changed).toHaveBeenCalledWith('presupuesto', [{ rubro: 'Recursos existentes', valor_planeado: 2500000 }]);
    expect(screen.getByText(/\$\s*2\.500\.000/)).toBeVisible();
  });

  it('aplica un registro completo creado con ayuda y escritura ampliada', () => {
    const changed = vi.fn();
    render(<RowsHarness onChange={changed} />);
    add();
    fireEvent.change(screen.getByLabelText(/^Nombre \*/), { target: { value: 'Equipo técnico' } });
    fireEvent.change(screen.getByLabelText(/^Rol \*/), { target: { value: 'investigador' } });
    fireEvent.click(screen.getByRole('button', { name: /Ayuda para Responsabilidades/ }));
    expect(screen.getByRole('dialog', { name: 'Cómo completar este campo' })).toHaveTextContent('Describe las tareas acordadas.');
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /Ampliar escritura de Responsabilidades/ }));
    expect(screen.getByRole('dialog', { name: 'Escritura ampliada' })).toHaveTextContent('Aplica el registro al formulario y luego guarda la etapa.');
    fireEvent.change(within(screen.getByRole('dialog', { name: 'Escritura ampliada' })).getByRole('textbox'), { target: { value: 'Preparar y validar el instrumento.' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByLabelText(/^Responsabilidades \*/)).toHaveValue('Preparar y validar el instrumento.');
    expect(changed).not.toHaveBeenCalled();
    apply();
    expect(changed).toHaveBeenCalledWith('equipo', [{ nombre: 'Equipo técnico', rol: 'investigador', responsabilidades: 'Preparar y validar el instrumento.' }]);
    expect(screen.getByText('Campos completos')).toBeVisible();
  });

  it('conserva la edición directa de datos adicionales fuera del recorrido de formulación', () => {
    const changed = vi.fn();
    render(<ProjectDocumentationFields fields={[team]} values={{ equipo: [{ nombre: 'Equipo A' }, { nombre: 'Equipo B' }] }} onChange={changed} />);
    fireEvent.click(screen.getAllByText(team.details_label)[0]);
    fireEvent.change(screen.getByLabelText('Correo de contacto · Personal vinculado fila 1'), { target: { value: 'contacto@example.com' } });
    expect(changed).toHaveBeenCalledWith('equipo', [{ nombre: 'Equipo A', correo_contacto: 'contacto@example.com' }, { nombre: 'Equipo B' }]);
    expect(screen.getByLabelText('Nombre · Personal vinculado fila 2 *')).toHaveValue('Equipo B');
  });
});

