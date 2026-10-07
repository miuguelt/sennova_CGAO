import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ProjectDocumentationFields from '../components/projects/ProjectDocumentationFields';
import { FormulationRelationsProvider } from '../components/projects/FormulationRelationsContext';
afterEach(cleanup);
const field = { key: 'objetivo_especifico', label: 'Objetivo relacionado', type: 'text', relation: 'objetivos' };
it('sugiere objetivos guardados y permite registrar una relación nueva sin sustituir el texto', () => {
  const change = vi.fn();
  render(<FormulationRelationsProvider options={{ objetivos: ['Caracterizar el proceso', 'Validar el prototipo'] }}>
    <ProjectDocumentationFields fields={[field]} values={{ objetivo_especifico: 'Objetivo anterior' }} onChange={change} />
  </FormulationRelationsProvider>);
  const input = screen.getByLabelText('Objetivo relacionado');
  expect(input).toHaveValue('Objetivo anterior');
  const options = document.getElementById(input.getAttribute('list'));
  expect(within(options).getAllByRole('option', { hidden: true })).toHaveLength(2);
  expect(options).toHaveTextContent('Validar el prototipo');
  fireEvent.change(input, { target: { value: 'Objetivo aún por guardar' } });
  expect(change).toHaveBeenCalledWith('objetivo_especifico', 'Objetivo aún por guardar');
});
it('ofrece integrantes dentro del editor de fila y respeta consulta sin permiso de edición', () => {
  render(<FormulationRelationsProvider options={{ integrantes: ['Investigadora asignada'] }}><ProjectDocumentationFields compact disabled
    fields={[{ key: 'cronograma', label: 'Cronograma', type: 'rows', columns: [{ key: 'actividad', label: 'Actividad', type: 'text' }, { key: 'encargado', label: 'Responsable', type: 'text', relation: 'integrantes' }] }]}
    values={{ cronograma: [{ actividad: 'Validar prototipo', encargado: 'Investigadora asignada' }] }} onChange={vi.fn()} />
  </FormulationRelationsProvider>);
  fireEvent.click(screen.getByRole('button', { name: /Consultar registro/ }));
  const input = screen.getByLabelText(/Responsable/);
  expect(input).toBeDisabled();
  expect(document.getElementById(input.getAttribute('list'))).toHaveTextContent('Investigadora asignada');
});
it('funciona sin opciones ni proveedor y no inventa relaciones para campos libres', () => {
  const view = render(<ProjectDocumentationFields fields={[field]} onChange={vi.fn()} />);
  expect(screen.getByLabelText('Objetivo relacionado')).not.toHaveAttribute('list');
  view.rerender(<FormulationRelationsProvider><ProjectDocumentationFields fields={[{ ...field, relation: undefined }]} onChange={vi.fn()} /></FormulationRelationsProvider>);
  expect(screen.getByLabelText('Objetivo relacionado')).not.toHaveAttribute('list');
});
