import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import ProjectDocumentationProgress from '../components/projects/ProjectDocumentationProgress';

afterEach(cleanup);
const summary = { porcentaje: 90, campos_completados: 12, campos_totales: 12, documentos_generados: 13, documentos_totales: 13, documentos_revisados: 0, descripcion: 'Los campos aportan el 80 %, la generación el 10 % y la revisión el 10 %.' };

it('resume el avance y las revisiones pendientes en una fila desplegable cerrada al abrir', () => {
  render(<ProjectDocumentationProgress summary={summary} disclosure />);
  const toggle = screen.getByText('90% de avance documental · 13 revisiones pendientes');
  const details = toggle.closest('details');
  expect(details).not.toHaveAttribute('open');
  expect(toggle).toBeVisible();
  expect(screen.getByRole('progressbar', { name: 'Avance documental del proyecto' })).toHaveAttribute('value', '90');
  expect(screen.getByText('Campos diligenciados: 12 de 12')).not.toBeVisible();
  fireEvent.click(toggle);
  expect(details).toHaveAttribute('open');
  expect(screen.getByText('Campos diligenciados: 12 de 12')).toBeVisible();
  expect(screen.getByText('Borradores generados: 13 de 13')).toBeVisible();
  expect(screen.getByText('Revisión registrada: 0 de 13')).toBeVisible();
  expect(screen.getByText(summary.descripcion)).toBeVisible();
});

it('conserva los conteos completos de la vista predeterminada', () => {
  render(<ProjectDocumentationProgress summary={summary} />);
  expect(screen.getByText('Avance de la documentación')).toBeVisible();
  expect(screen.getByText('Campos diligenciados: 12 de 12')).toBeVisible();
  expect(screen.getByText('Borradores generados: 13 de 13')).toBeVisible();
  expect(screen.getByText('Cómo se calcula el avance')).toBeVisible();
  expect(screen.queryByText(/90% de avance documental/)).not.toBeInTheDocument();
});

it('usa el singular y nunca presenta como pendiente una revisión ya registrada', () => {
  const view = render(<ProjectDocumentationProgress summary={{ ...summary, documentos_generados: 2, documentos_revisados: 1 }} disclosure />);
  expect(screen.getByText('90% de avance documental · 1 revisión pendiente')).toBeVisible();
  view.rerender(<ProjectDocumentationProgress summary={{ ...summary, documentos_generados: 2, documentos_revisados: 2 }} disclosure />);
  expect(screen.getByText('90% de avance documental · 0 revisiones pendientes')).toBeVisible();
  expect(screen.queryByText(/^Revisión pendiente:/)).not.toBeInTheDocument();
});

it('conserva el modo compacto fuera del espacio de edición y admite un resumen ausente', () => {
  const view = render(<ProjectDocumentationProgress summary={summary} compact />);
  expect(screen.getByText('Documentación')).toBeVisible();
  expect(screen.getByText('Campos diligenciados: 12 de 12')).toBeVisible();
  expect(screen.queryByText('Borradores generados: 13 de 13')).not.toBeInTheDocument();
  view.rerender(<ProjectDocumentationProgress />);
  expect(screen.queryByRole('region', { name: 'Avance documental' })).not.toBeInTheDocument();
});
