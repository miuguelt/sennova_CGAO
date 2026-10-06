import React, { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ProjectFormulationStep from '../components/projects/ProjectFormulationStep';
import ProjectFormulationWizard from '../components/projects/ProjectFormulationWizard';
import { ProjectDocumentationAPI } from '../api/projectDocumentation';

vi.mock('../api/projectDocumentation', () => ({ ProjectDocumentationAPI: {
  getRecommendation: vi.fn(), saveIdentification: vi.fn(), analyzeFormulation: vi.fn(), applyFormulation: vi.fn(),
} }));

const fields = [
  { key: 'introduccion', label: 'Introducción', type: 'textarea', help: 'Presenta el tema y la necesidad con fuentes propias.' },
  { key: 'justificacion', label: 'Justificación', type: 'textarea', help: 'Explica la utilidad del proyecto.' },
];
const step = {
  id: 'problema', titulo: 'Introducción, problema y justificación', fuente: 'formulacion',
  proposito: 'Construye un diagnóstico sustentado antes de definir los objetivos.',
  campos: ['introduccion', 'justificacion'], completo: false, faltantes: ['Completa la justificación.'],
  bloques: [
    { id: 'contexto', titulo: 'Introducción y contexto', campos: ['introduccion'] },
    { id: 'necesidad', titulo: 'Problema y justificación', campos: ['justificacion'] },
  ],
};
const props = { projectId: 'p-1', step, projectValues: {}, commonValues: {}, draftValues: {},
  formulationFields: fields, canEdit: true, busy: false, dirty: true, onSaveDraft: vi.fn() };

function WritingHarness({ canEdit = true }) {
  const [values, setValues] = useState({ introduccion: 'Texto inicial', justificacion: '' });
  return <ProjectFormulationStep {...props} canEdit={canEdit} draftValues={values}
    onDraftChange={(key, value) => setValues(previous => ({ ...previous, [key]: value }))} />;
}

const record = {
  proyecto: {}, campos_comunes: [], documentos: [{ clave: 'formulacion_proyecto', tipo: 'formulacion_proyecto', campos: fields }],
  ruta_formulacion: {
    pasos: [{ id: 'identificacion', titulo: 'Identificación', fuente: 'proyecto', campos: ['nombre'] }, step],
    completados: 0, total: 2, porcentaje: 0, siguiente_paso: 'identificacion',
    campos_proyecto: [{ key: 'nombre', label: 'Título del proyecto', type: 'text' }], valores_proyecto: { nombre: 'Proyecto en construcción' },
  },
};
const wizardProps = { projectId: 'p-1', record, drafts: { comunes: {}, formulacion_proyecto: {} }, dirty: {}, canEdit: true, busy: false };

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

describe('Documentación con información progresiva', () => {
  it('muestra un bloque a la vez y conserva lo escrito al avanzar y regresar', () => {
    render(<WritingHarness />);
    expect(screen.queryByText(step.proposito)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Introducción')).toHaveValue('Texto inicial');
    expect(screen.queryByLabelText('Justificación')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Introducción'), { target: { value: 'Introducción elaborada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente bloque' }));
    expect(screen.getByLabelText('Justificación')).toBeVisible();
    fireEvent.change(screen.getByLabelText('Justificación'), { target: { value: 'Justificación elaborada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Bloque anterior' }));
    expect(screen.getByLabelText('Introducción')).toHaveValue('Introducción elaborada');
    fireEvent.click(screen.getByRole('button', { name: '2. Problema y justificación' }));
    expect(screen.getByLabelText('Justificación')).toHaveValue('Justificación elaborada');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));
    expect(props.onSaveDraft).toHaveBeenCalledOnce();
  });

  it('consulta la guía y los pendientes en ventanas sin desplazar el formulario', () => {
    render(<WritingHarness />);
    const guideButton = screen.getByRole('button', { name: 'Mostrar guía y ejemplos' });
    guideButton.focus();
    fireEvent.click(guideButton);
    expect(screen.getByRole('dialog', { name: 'Guía y ejemplos' })).toBeVisible();
    expect(screen.getByRole('dialog', { name: 'Guía y ejemplos' })).toHaveTextContent(step.proposito);
    const reference = screen.getByText('Consultar la relación con CAP-14').closest('details');
    expect(reference).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('Consultar la relación con CAP-14'));
    expect(screen.getByRole('region', { name: 'Relación con el proyecto de ejemplo' })).toBeVisible();
    expect(screen.getByLabelText('Introducción')).toHaveValue('Texto inicial');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(guideButton).toHaveFocus();
    fireEvent.click(screen.getByRole('button', { name: 'Ver pendientes (1)' }));
    expect(screen.getByRole('dialog', { name: 'Pendientes de esta etapa' })).toHaveTextContent('Completa la justificación.');
    fireEvent.click(screen.getByRole('button', { name: 'Volver al formulario' }));
    expect(screen.queryByText('Completa la justificación.')).not.toBeInTheDocument();
  });

  it('ofrece ayuda por campo y un espacio de escritura ampliado que conserva la edición', () => {
    render(<WritingHarness />);
    expect(screen.queryByText(fields[0].help)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Ayuda para Introducción' }));
    expect(screen.getByRole('dialog', { name: 'Cómo completar este campo' })).toHaveTextContent(fields[0].help);
    fireEvent.click(screen.getByRole('button', { name: 'Volver al formulario' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar escritura de Introducción' }));
    const dialog = screen.getByRole('dialog', { name: 'Escritura ampliada' });
    fireEvent.change(within(dialog).getByRole('textbox'), { target: { value: 'Contenido elaborado en la ventana' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Volver al formulario' }));
    expect(screen.getByLabelText('Introducción')).toHaveValue('Contenido elaborado en la ventana');
    expect(props.onSaveDraft).not.toHaveBeenCalled();
  });

  it('mantiene los permisos de consulta en la escritura ampliada', () => {
    render(<WritingHarness canEdit={false} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ampliar escritura de Introducción' }));
    expect(within(screen.getByRole('dialog')).getByRole('textbox')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar borrador' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Consultar orientaciones metodológicas' })).not.toBeInTheDocument();
  });

  it('muestra carga, error con reintento y orientaciones dentro de la ventana', async () => {
    ProjectDocumentationAPI.getRecommendation.mockRejectedValueOnce(new Error('Servicio no disponible'))
      .mockRejectedValueOnce(new Error('Servicio no disponible'));
    render(<WritingHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar orientaciones metodológicas' }));
    const dialog = screen.getByRole('dialog', { name: 'Orientaciones metodológicas' });
    expect(within(dialog).getByRole('status')).toHaveTextContent('Consultando orientaciones');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('No fue posible consultar');
    ProjectDocumentationAPI.getRecommendation.mockResolvedValue({ recomendaciones: ['Relaciona la necesidad con una fuente.'] });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Reintentar orientaciones' }));
    expect(await within(dialog).findAllByText('Relaciona la necesidad con una fuente.')).toHaveLength(2);
    expect(ProjectDocumentationAPI.getRecommendation).toHaveBeenCalledWith('p-1', 'introduccion', 'Texto inicial');
  });

  it('informa cuando la consulta termina sin recomendaciones adicionales', async () => {
    ProjectDocumentationAPI.getRecommendation.mockResolvedValue({ recomendaciones: [] });
    render(<WritingHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar orientaciones metodológicas' }));
    expect(await screen.findByText('No hay orientaciones adicionales para los textos de esta etapa.')).toBeVisible();
  });

  it('presenta las orientaciones disponibles cuando falla la consulta de otro campo', async () => {
    ProjectDocumentationAPI.getRecommendation.mockResolvedValueOnce({ recomendaciones: ['Sustenta el diagnóstico.'] })
      .mockRejectedValueOnce(new Error('No disponible'));
    render(<WritingHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar orientaciones metodológicas' }));
    expect(await screen.findByText('Sustenta el diagnóstico.')).toBeVisible();
    expect(screen.getByRole('alert')).toHaveTextContent('algunos campos');
    expect(screen.getByLabelText('Introducción')).toHaveValue('Texto inicial');
  });

  it('permite cerrar una consulta en curso y descarta su respuesta al volver a abrirla', async () => {
    let resolveRequest;
    const pending = new Promise(resolve => { resolveRequest = resolve; });
    ProjectDocumentationAPI.getRecommendation.mockReturnValue(pending);
    render(<WritingHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Consultar orientaciones metodológicas' }));
    fireEvent.click(screen.getByRole('button', { name: 'Volver al formulario' }));
    await act(async () => resolveRequest({ recomendaciones: ['Respuesta de la consulta cerrada'] }));
    ProjectDocumentationAPI.getRecommendation.mockResolvedValue({ recomendaciones: ['Orientación vigente'] });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar orientaciones metodológicas' }));
    expect(await screen.findAllByText('Orientación vigente')).toHaveLength(2);
    expect(screen.queryByText('Respuesta de la consulta cerrada')).not.toBeInTheDocument();
  });
});

describe('Navegación y carga sin saturación', () => {
  it('abre las etapas a petición, permite elegir una y conserva el título al volver', () => {
    render(<ProjectFormulationWizard {...wizardProps} />);
    expect(screen.queryByRole('navigation', { name: 'Pasos de formulación' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Título del proyecto'), { target: { value: 'Título que debe conservarse' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ver etapas' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Etapas del proyecto' })).getByRole('button', { name: '2. Introducción, problema y justificación' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Introducción')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Paso anterior' }));
    expect(screen.getByLabelText('Título del proyecto')).toHaveValue('Título que debe conservarse');
  });

  it('abre la importación en una ventana y protege los cambios pendientes', () => {
    render(<ProjectFormulationWizard {...wizardProps} />);
    fireEvent.change(screen.getByLabelText('Título del proyecto'), { target: { value: 'Edición pendiente' } });
    fireEvent.click(screen.getByRole('button', { name: /Cargar formato/i }));
    const dialog = screen.getByRole('dialog', { name: 'Cargar formato Word' });
    expect(dialog).toHaveTextContent('Guarda los cambios pendientes antes de importar un formato.');
    expect(within(dialog).getByLabelText('Seleccionar archivo Word (.docx)')).toBeDisabled();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByLabelText('Título del proyecto')).toHaveValue('Edición pendiente');
    expect(ProjectDocumentationAPI.applyFormulation).not.toHaveBeenCalled();
  });
});
