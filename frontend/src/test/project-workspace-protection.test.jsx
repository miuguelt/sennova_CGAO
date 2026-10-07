import React, { useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { UnsavedChangesProvider, useUnsavedChangesGuard } from '../context/UnsavedChangesContext';
import ProjectDocumentationEditor from '../components/projects/ProjectDocumentationEditor';
import Drawer from '../components/ui/Drawer';
import { ProjectDocumentationAPI } from '../api/projectDocumentation';
import { emitDataRefresh } from '../utils/dataRefresh';

vi.mock('../api/projectDocumentation', () => ({ ProjectDocumentationAPI: { get: vi.fn(), saveCommon: vi.fn(), saveDraft: vi.fn(), saveIdentification: vi.fn() } }));
let data;
const titleField = { key: 'nombre', label: 'Título del proyecto', type: 'text' };
function Content() {
  const guard = useUnsavedChangesGuard();
  const [open, setOpen] = useState(true);
  return <><button onClick={() => guard.requestLeave(() => setOpen(false))}>Salir del proyecto</button>
    <Drawer isOpen={open} protectUnsavedChanges onClose={() => setOpen(false)} title="Proyecto" bodyClassName="project-workspace-body">
      <ProjectDocumentationEditor projectId="p1" currentUser={{ id: 'u1', rol: 'investigador' }} initialOpened workspace />
    </Drawer></>;
}
const mount = () => render(<UnsavedChangesProvider><Content /></UnsavedChangesProvider>);
beforeEach(() => {
  vi.clearAllMocks();
  data = { proyecto: { nombre: 'Proyecto inicial' }, revision: 1, comunes: { centro: 'Centro inicial', inconsistencias_fuente: 'Confirmar duración con el acta.' },
    campos_comunes: [{ key: 'centro', label: 'Centro', type: 'text' }, { key: 'inconsistencias_fuente', label: 'Datos de la fuente pendientes de aclaración', type: 'textarea' }],
    documentos: [{ clave: 'formulacion_proyecto', tipo: 'formulacion_proyecto', titulo: 'Formulación', formato: 'docx', carpeta: '1Formulacion', revision: 1, datos: { introduccion: 'Idea inicial' }, campos: [{ key: 'introduccion', label: 'Introducción', type: 'textarea' }], faltantes: [], historial: [] }],
    ruta_formulacion: { pasos: [{ id: 'identificacion', titulo: 'Identificación', fuente: 'proyecto', campos: ['nombre'] }, { id: 'institucional', titulo: 'Datos institucionales', fuente: 'comunes', campos: ['centro'] }, { id: 'problema', titulo: 'Problema', fuente: 'formulacion', campos: ['introduccion'] }], total: 3, completados: 0, porcentaje: 0, siguiente_paso: 'identificacion', campos_proyecto: [titleField], valores_proyecto: { nombre: 'Proyecto inicial' } },
    opciones_relaciones: { objetivos: [], integrantes: [], actividades: [] }, revision_coherencia: [{ campo: 'comunes.inconsistencias_fuente', paso: 'institucional', mensaje: 'Confirmar duración con el acta.', nivel: 'advertencia' }], advertencias: ['Hay una duración por confirmar.'] };
  ProjectDocumentationAPI.get.mockImplementation(async () => structuredClone(data));
  ProjectDocumentationAPI.saveIdentification.mockImplementation(async (_id, changes) => { Object.assign(data.ruta_formulacion.valores_proyecto, changes); return {}; });
  ProjectDocumentationAPI.saveCommon.mockImplementation(async (_id, revision, values) => { data.comunes = values; data.revision = revision + 1; return { revision: data.revision, datos: values }; });
  ProjectDocumentationAPI.saveDraft.mockImplementation(async (_id, _key, revision, values) => { data.documentos[0].datos = values; data.documentos[0].revision = revision + 1; return { revision: revision + 1, datos: values }; });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('protege el título real del asistente al cerrar y al salir del proyecto', async () => {
  mount();
  fireEvent.change(await screen.findByLabelText('Título del proyecto'), { target: { value: 'Idea pendiente' } });
  expect(screen.getByLabelText('Título del proyecto')).toHaveValue('Idea pendiente');
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  expect(screen.getByRole('dialog', { name: 'Cambios pendientes por guardar' })).toBeVisible();
  expect(screen.getByLabelText('Título del proyecto')).toHaveValue('Idea pendiente');
  fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
  expect(screen.getByLabelText('Título del proyecto')).toHaveValue('Idea pendiente');
  fireEvent.click(screen.getByRole('button', { name: 'Salir del proyecto' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(ProjectDocumentationAPI.saveIdentification).toHaveBeenCalledWith('p1', { nombre: 'Idea pendiente' });
});

it('desplaza solo el cuerpo hasta la etapa y una actualización conserva la posición de trabajo', async () => {
  const scroll = vi.spyOn(HTMLElement.prototype, 'scrollIntoView');
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return { top: this.classList.contains('formulation-step') ? 600 : 200 };
  });
  mount(); await screen.findByLabelText('Título del proyecto');
  const body = screen.getByLabelText('Título del proyecto').closest('.project-workspace-body');
  expect(body.scrollTop).toBe(400);
  expect(screen.getByRole('dialog').scrollTop).toBe(0);
  expect(scroll).not.toHaveBeenCalled();
  body.scrollTop = 480;
  await act(async () => emitDataRefresh({ endpoint: '/proyectos/p1', method: 'PUT' }));
  await waitFor(() => expect(ProjectDocumentationAPI.get).toHaveBeenCalledTimes(2));
  expect(body.scrollTop).toBe(480);
});

it('no sale cuando el guardado del título falla y conserva lo escrito', async () => {
  ProjectDocumentationAPI.saveIdentification.mockRejectedValueOnce(new Error('Servidor sin conexión'));
  mount();
  fireEvent.change(await screen.findByLabelText('Título del proyecto'), { target: { value: 'Título protegido' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salir del proyecto' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('seguir editando');
  fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
  expect(screen.getByLabelText('Título del proyecto')).toHaveValue('Título protegido');
});

it('guarda datos comunes y borrador con sus revisiones antes de salir', async () => {
  mount(); await screen.findByLabelText('Título del proyecto');
  fireEvent.click(screen.getByRole('button', { name: 'Datos compartidos' }));
  const common = screen.getByRole('region', { name: 'Datos comunes' });
  fireEvent.click(within(common).getByText('Datos comunes'));
  fireEvent.change(within(common).getByLabelText('Centro'), { target: { value: 'Centro confirmado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Documentos y versiones' }));
  fireEvent.click(screen.getByText('Formulación'));
  fireEvent.change(screen.getByLabelText('Introducción'), { target: { value: 'Borrador desarrollado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salir del proyecto' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(ProjectDocumentationAPI.saveCommon).toHaveBeenCalledWith('p1', 1, expect.objectContaining({ centro: 'Centro confirmado' }));
  expect(ProjectDocumentationAPI.saveDraft).toHaveBeenCalledWith('p1', 'formulacion_proyecto', 1, { introduccion: 'Borrador desarrollado' });
});

it('guarda todas las fuentes y evita recargas intermedias mientras recibe eventos de escritura', async () => {
  ProjectDocumentationAPI.saveIdentification.mockImplementation(async (_id, values) => {
    Object.assign(data.ruta_formulacion.valores_proyecto, values);
    emitDataRefresh({ endpoint: '/proyectos/p1/documentacion/identificacion', method: 'PUT' });
    return {};
  });
  ProjectDocumentationAPI.saveCommon.mockImplementation(async (_id, revision, values) => {
    data.comunes = values; data.revision = revision + 1;
    emitDataRefresh({ endpoint: '/proyectos/p1/documentacion/comunes', method: 'PUT' });
    return { revision: data.revision, datos: values };
  });
  mount();
  fireEvent.change(await screen.findByLabelText('Título del proyecto'), { target: { value: 'Título confirmado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Datos compartidos' }));
  const common = screen.getByRole('region', { name: 'Datos comunes' });
  fireEvent.click(within(common).getByText('Datos comunes'));
  fireEvent.change(within(common).getByLabelText('Centro'), { target: { value: 'Centro confirmado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Documentos y versiones' }));
  fireEvent.click(screen.getByText('Formulación'));
  fireEvent.change(screen.getByLabelText('Introducción'), { target: { value: 'Texto confirmado' } });
  const readsBeforeSave = ProjectDocumentationAPI.get.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Salir del proyecto' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(ProjectDocumentationAPI.saveIdentification).toHaveBeenCalledOnce();
  expect(ProjectDocumentationAPI.saveCommon).toHaveBeenCalledOnce();
  expect(ProjectDocumentationAPI.saveDraft).toHaveBeenCalledOnce();
  expect(ProjectDocumentationAPI.get.mock.calls.length - readsBeforeSave).toBeLessThanOrEqual(1);
  expect(data.documentos[0].datos).toEqual({ introduccion: 'Texto confirmado' });
});

it('descartar limpia el borrador antes de otra acción sin escribir en el servidor', async () => {
  mount();
  fireEvent.change(await screen.findByLabelText('Título del proyecto'), { target: { value: 'Texto descartado' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salir del proyecto' }));
  fireEvent.click(screen.getByRole('button', { name: 'Descartar y salir' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(ProjectDocumentationAPI.saveIdentification).not.toHaveBeenCalled();
});

it('el pendiente abre el campo de la fuente y conserva su evidencia', async () => {
  mount(); await screen.findByLabelText('Título del proyecto');
  fireEvent.click(screen.getByRole('button', { name: 'Aclarar datos de la fuente' }));
  const field = screen.getByLabelText('Datos de la fuente pendientes de aclaración');
  expect(field).toBeVisible();
  expect(field).toHaveFocus();
  expect(field).toHaveValue('Confirmar duración con el acta.');
  expect(ProjectDocumentationAPI.saveCommon).not.toHaveBeenCalled();
});

it('permite registrar el soporte y mantiene el detalle extenso fuera del área inicial de escritura', async () => {
  data.campos_comunes.push({ key: 'aclaraciones_fuente', label: 'Registro de aclaraciones con soporte', type: 'rows', columns: [{ key: 'soporte', label: 'Soporte', type: 'text' }] });
  mount(); await screen.findByLabelText('Título del proyecto');
  const warnings = screen.getByRole('region', { name: 'Datos por aclarar' });
  expect(within(warnings).getByText('Confirmar duración con el acta.')).not.toBeVisible();
  fireEvent.click(within(warnings).getByText('Ver el pendiente y cómo aclararlo'));
  expect(within(warnings).getByText('Confirmar duración con el acta.')).toBeVisible();
  fireEvent.click(within(warnings).getByRole('button', { name: 'Registrar aclaración con soporte' }));
  const common = screen.getByRole('region', { name: 'Datos comunes' });
  expect(within(common).getByRole('group', { name: 'Registro de aclaraciones con soporte' })).toBeVisible();
  expect(within(common).getByRole('button', { name: 'Agregar fila en Registro de aclaraciones con soporte' })).toHaveFocus();
});

it('la revisión de coherencia conduce a la etapa relacionada sin validar la calidad científica', async () => {
  data.revision_coherencia = [{ campo: 'formulacion_proyecto.introduccion', paso: 'problema', mensaje: 'Relaciona el diagnóstico con evidencia.', nivel: 'orientacion' }];
  mount(); await screen.findByLabelText('Título del proyecto');
  fireEvent.click(screen.getByRole('button', { name: /Revisar coherencia/ }));
  const review = screen.getByRole('dialog', { name: 'Coherencia del proyecto' });
  expect(review).toHaveTextContent('Relaciona el diagnóstico con evidencia.');
  expect(review).toHaveTextContent('calidad científica');
  fireEvent.click(within(review).getByRole('button', { name: 'Ir al dato' }));
  expect(screen.queryByRole('dialog', { name: 'Coherencia del proyecto' })).not.toBeInTheDocument();
  const wizard = screen.getByRole('region', { name: 'Asistente de formulación de proyectos' });
  expect(within(wizard).getByLabelText('Introducción')).toBeVisible();
  expect(within(wizard).getByLabelText('Introducción')).toHaveFocus();
});

it('guarda un documento independiente del asistente antes de cerrar el panel', async () => {
  delete data.ruta_formulacion;
  data.documentos[0].clave = 'informe:1';
  data.documentos[0].tipo = 'informe_bimensual';
  mount();
  fireEvent.click(await screen.findByText('Formulación'));
  fireEvent.change(screen.getByLabelText('Introducción'), { target: { value: 'Informe con evidencia' } });
  fireEvent.click(screen.getByRole('button', { name: 'Salir del proyecto' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(ProjectDocumentationAPI.saveDraft).toHaveBeenCalledWith('p1', 'informe:1', 1, { introduccion: 'Informe con evidencia' });
});

it('cerrar la revisión por su botón o su pie conserva la etapa y el contenido', async () => {
  data.revision_coherencia = [];
  mount(); await screen.findByLabelText('Título del proyecto');
  fireEvent.click(screen.getByRole('button', { name: /Revisar coherencia/ }));
  let dialog = screen.getByRole('dialog', { name: 'Coherencia del proyecto' });
  expect(dialog).toHaveTextContent('No se detectaron relaciones pendientes');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Volver al formulario' }));
  expect(screen.queryByRole('dialog', { name: 'Coherencia del proyecto' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Revisar coherencia/ }));
  dialog = screen.getByRole('dialog', { name: 'Coherencia del proyecto' });
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cerrar ventana modal' }));
  expect(screen.queryByRole('dialog', { name: 'Coherencia del proyecto' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Título del proyecto')).toHaveValue('Proyecto inicial');
});
