import React, { createRef } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ProjectFormulationWizard from '../components/projects/ProjectFormulationWizard';
import ProjectFormulationGuide from '../components/projects/ProjectFormulationGuide';
import ProjectDocumentationProgress from '../components/projects/ProjectDocumentationProgress';
import { ProjectDocumentationAPI } from '../api/projectDocumentation';
import { checklistStorageKey, checklistFingerprint, readPersonalChecklist, writePersonalChecklist } from '../components/projects/projectFormulationChecklist';

vi.mock('../api/projectDocumentation', () => ({ ProjectDocumentationAPI: { saveIdentification: vi.fn() } }));
const fields = [{ key: 'nombre', label: 'Título', type: 'text' }, { key: 'vigencia', label: 'Duración', type: 'number', min: 1 }];
const record = {
  documentos: [{ clave: 'formulacion_proyecto', tipo: 'formulacion_proyecto', campos: [{ key: 'introduccion', label: 'Introducción', type: 'textarea' }] }],
  campos_comunes: [{ key: 'centro', label: 'Centro', type: 'text' }],
  ruta_formulacion: { total: 3, completados: 1, porcentaje: 33, siguiente_paso: 'identificacion', campos_proyecto: fields,
    valores_proyecto: { nombre: 'Proyecto', vigencia: 6 }, pasos: [
      { id: 'identificacion', titulo: 'Identificación', fuente: 'proyecto', campos: ['nombre', 'vigencia'], completo: true },
      { id: 'institucional', titulo: 'Institución', fuente: 'comunes', campos: ['centro'] },
      { id: 'problema', titulo: 'Diagnóstico', fuente: 'formulacion', campos: ['introduccion'] },
    ] },
};
const wizardProps = { projectId: 'p-1', currentUserId: 'u-1', record, drafts: { comunes: { centro: 'CGAO' }, formulacion_proyecto: { introduccion: 'Texto' } }, dirty: {}, canEdit: true };
const guide = { checklist: ['Revisé las fuentes', 'Revisé el alcance'], ejemploModelo: { titulo: 'Ejemplo', texto: 'Modelo de apoyo' } };
const guideProps = { projectId: 'p-1', currentUserId: 'u-1', step: { id: 'problema', campos: ['introduccion'] }, currentValues: { introduccion: 'Contenido' }, guide };

beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('guarda solo la identificación editada antes de avanzar y conserva la etapa si falla', async () => {
  ProjectDocumentationAPI.saveIdentification.mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce({});
  const ref = createRef();
  render(<ProjectFormulationWizard {...wizardProps} ref={ref} />);
  expect(ref.current.hasUnsavedChanges()).toBe(false);
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Nuevo título' } });
  expect(ref.current.hasUnsavedChanges()).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
  await waitFor(() => expect(ProjectDocumentationAPI.saveIdentification).toHaveBeenCalledWith('p-1', { nombre: 'Nuevo título' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Guardar y continuar' })).toBeEnabled());
  expect(screen.getByLabelText('Título')).toHaveValue('Nuevo título');
  expect(ref.current.hasUnsavedChanges()).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
  await screen.findByLabelText('Centro');
  expect(ref.current.hasUnsavedChanges()).toBe(false);
});

it('guarda todas las fuentes pendientes mediante su contrato booleano', async () => {
  const ref = createRef();
  const onSaveCommon = vi.fn().mockResolvedValue(true);
  const onSaveDraft = vi.fn().mockResolvedValue(true);
  ProjectDocumentationAPI.saveIdentification.mockResolvedValue({});
  render(<ProjectFormulationWizard {...wizardProps} ref={ref} dirty={{ comunes: true, formulacion_proyecto: true }} onSaveCommon={onSaveCommon} onSaveDraft={onSaveDraft} />);
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Cambio' } });
  let saved;
  await act(async () => { saved = await ref.current.savePending(); });
  expect(saved).toBe(true);
  expect(onSaveCommon).toHaveBeenCalledWith('comunes');
  expect(onSaveDraft).toHaveBeenCalledWith('formulacion_proyecto', record.documentos[0]);
  expect(ProjectDocumentationAPI.saveIdentification).toHaveBeenCalledWith('p-1', { nombre: 'Cambio' });
});

it.each([false, undefined])('mantiene los pendientes cuando un callback no confirma el guardado: %s', async result => {
  const ref = createRef();
  const onSaveDraft = vi.fn();
  render(<ProjectFormulationWizard {...wizardProps} ref={ref} dirty={{ comunes: true, formulacion_proyecto: true }} onSaveCommon={vi.fn().mockResolvedValue(result)} onSaveDraft={onSaveDraft} />);
  let saved;
  await act(async () => { saved = await ref.current.savePending(); });
  expect(saved).toBe(false);
  expect(onSaveDraft).not.toHaveBeenCalled();
  expect(ref.current.hasUnsavedChanges()).toBe(true);
});

it('avanza sin imponer campos pendientes cuando no hay cambios y guarda solo la fuente activa', async () => {
  const onSaveCommon = vi.fn().mockResolvedValue(false);
  const onSaveDraft = vi.fn();
  render(<ProjectFormulationWizard {...wizardProps} dirty={{ comunes: true, formulacion_proyecto: true }} onSaveCommon={onSaveCommon} onSaveDraft={onSaveDraft} />);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
  await screen.findByLabelText('Centro');
  expect(ProjectDocumentationAPI.saveIdentification).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
  await waitFor(() => expect(onSaveCommon).toHaveBeenCalledOnce());
  expect(screen.getByLabelText('Centro')).toHaveValue('CGAO');
  expect(onSaveDraft).not.toHaveBeenCalled();
});

it('abre el bloque y enfoca el campo solicitado desde una alerta', async () => {
  const focusedRecord = structuredClone(record);
  focusedRecord.ruta_formulacion.pasos[0].bloques = [
    { id: 'titulo', titulo: 'Nombre', campos: ['nombre'] }, { id: 'tiempo', titulo: 'Tiempo', campos: ['vigencia'] },
  ];
  render(<ProjectFormulationWizard {...wizardProps} record={focusedRecord} focusStepId="identificacion" focusFieldKey="vigencia" focusRequest={1} />);
  await waitFor(() => expect(screen.getByLabelText('Duración')).toHaveFocus());
  expect(screen.queryByLabelText('Título')).not.toBeInTheDocument();
});

it('conserva la revisión personal al reabrir y la invalida después de editar', () => {
  const first = render(<ProjectFormulationGuide {...guideProps} />);
  fireEvent.click(screen.getByRole('button', { name: /Revisión personal/ }));
  fireEvent.click(screen.getByLabelText('Revisé las fuentes'));
  expect(screen.getByRole('button', { name: 'Revisión personal (1/2)' })).toBeVisible();
  const stored = localStorage.getItem(localStorage.key(0));
  expect(stored).not.toContain('Contenido');
  first.unmount();
  const reopened = render(<ProjectFormulationGuide {...guideProps} />);
  fireEvent.click(screen.getByRole('button', { name: /Revisión personal/ }));
  expect(screen.getByLabelText('Revisé las fuentes')).toBeChecked();
  expect(screen.getByText(/revisión personal de este navegador/i)).toBeVisible();
  reopened.rerender(<ProjectFormulationGuide {...guideProps} currentValues={{ introduccion: 'Contenido actualizado' }} />);
  expect(screen.getByLabelText('Revisé las fuentes')).not.toBeChecked();
  expect(screen.getByText(/cambió el contenido/i)).toBeVisible();
});

it('separa las marcas de cada usuario, proyecto y etapa', () => {
  const view = render(<ProjectFormulationGuide {...guideProps} />);
  fireEvent.click(screen.getByRole('button', { name: /Revisión personal/ }));
  fireEvent.click(screen.getByLabelText('Revisé las fuentes'));
  for (const changed of [{ currentUserId: 'u-2' }, { projectId: 'p-2' }, { step: { id: 'marco', campos: ['introduccion'] } }]) {
    view.rerender(<ProjectFormulationGuide {...guideProps} {...changed} />);
    expect(screen.getByLabelText('Revisé las fuentes')).not.toBeChecked();
  }
  view.rerender(<ProjectFormulationGuide {...guideProps} />);
  expect(screen.getByLabelText('Revisé las fuentes')).toBeChecked();
});

it('permite revisar e informa si el navegador impide conservar las marcas', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Bloqueado'); });
  render(<ProjectFormulationGuide {...guideProps} />);
  fireEvent.click(screen.getByRole('button', { name: /Revisión personal/ }));
  fireEvent.click(screen.getByLabelText('Revisé las fuentes'));
  expect(screen.getByLabelText('Revisé las fuentes')).toBeChecked();
  expect(screen.getByRole('alert')).toHaveTextContent(/no pudo guardar/i);
});

it('confirma la copia solo después de que el portapapeles la acepta e informa rechazos', async () => {
  let finishCopy;
  const copy = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finishCopy = resolve; })).mockRejectedValueOnce(new Error('Rechazado'));
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: copy } });
  const onNotify = vi.fn();
  render(<ProjectFormulationGuide {...guideProps} onNotify={onNotify} />);
  fireEvent.click(screen.getByRole('button', { name: /^Ejemplo$/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
  expect(screen.queryByText('¡Copiado!')).not.toBeInTheDocument();
  expect(onNotify).not.toHaveBeenCalled();
  await act(async () => finishCopy());
  expect(screen.getByText('¡Copiado!')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: '¡Copiado!' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no fue posible copiar/i));
  expect(screen.queryByText('¡Copiado!')).not.toBeInTheDocument();
});

it('diferencia diligenciamiento, generación y revisión en el avance documental', () => {
  render(<ProjectDocumentationProgress summary={{ porcentaje: 90, campos_completados: 5, campos_totales: 5, documentos_generados: 2, documentos_totales: 2, documentos_revisados: 0 }} />);
  expect(screen.getByText('Campos diligenciados: 5 de 5')).toBeVisible();
  expect(screen.getByText('Borradores generados: 2 de 2')).toBeVisible();
  expect(screen.getByText('Revisión pendiente: 2 documentos')).toBeVisible();
});

it('descarta explícitamente la identificación local y vuelve al valor guardado', () => {
  const ref = createRef();
  render(<ProjectFormulationWizard {...wizardProps} ref={ref} />);
  fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Edición descartada' } });
  act(() => ref.current.discardPending());
  expect(screen.getByLabelText('Título')).toHaveValue('Proyecto');
  expect(ref.current.hasUnsavedChanges()).toBe(false);
  expect(ProjectDocumentationAPI.saveIdentification).not.toHaveBeenCalled();
});

it('responde sin escribir si no hay pendientes y bloquea guardados durante una operación', async () => {
  const ref = createRef();
  const view = render(<ProjectFormulationWizard {...wizardProps} ref={ref} />);
  let result;
  await act(async () => { result = await ref.current.savePending(); });
  expect(result).toBe(true);
  view.rerender(<ProjectFormulationWizard {...wizardProps} ref={ref} busy dirty={{ comunes: true }} />);
  await act(async () => { result = await ref.current.savePending(); });
  expect(result).toBe(false);
  expect(ProjectDocumentationAPI.saveIdentification).not.toHaveBeenCalled();
});

it('rechaza valores inválidos de identificación y conserva su texto', async () => {
  const ref = createRef();
  render(<ProjectFormulationWizard {...wizardProps} ref={ref} />);
  fireEvent.change(screen.getByLabelText('Duración'), { target: { value: '-2' } });
  let result;
  await act(async () => { result = await ref.current.savePending(); });
  expect(result).toBe(false);
  expect(screen.getByLabelText('Duración')).toHaveValue(-2);
  expect(ProjectDocumentationAPI.saveIdentification).not.toHaveBeenCalled();
});

it('informa un callback rechazado, mantiene la etapa y permite volver a intentar', async () => {
  const onSaveCommon = vi.fn().mockRejectedValueOnce(new Error('Conflicto de revisión')).mockResolvedValueOnce(true);
  const onNotify = vi.fn();
  render(<ProjectFormulationWizard {...wizardProps} dirty={{ comunes: true }} onSaveCommon={onSaveCommon} onNotify={onNotify} />);
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente paso' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
  await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Conflicto de revisión', 'error'));
  expect(screen.getByLabelText('Centro')).toHaveValue('CGAO');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
  await screen.findByLabelText('Introducción');
});

it('guarda el borrador pendiente mediante el cierre y conserva false del callback', async () => {
  const ref = createRef();
  const onSaveDraft = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  render(<ProjectFormulationWizard {...wizardProps} ref={ref} dirty={{ formulacion_proyecto: true }} onSaveDraft={onSaveDraft} />);
  let saved;
  await act(async () => { saved = await ref.current.savePending(); });
  expect(saved).toBe(false);
  await act(async () => { saved = await ref.current.savePending(); });
  expect(saved).toBe(true);
  expect(onSaveDraft).toHaveBeenCalledWith('formulacion_proyecto', record.documentos[0]);
});

it('enfoca un campo sin bloques y acepta solicitudes nuevas del mismo campo', async () => {
  const view = render(<ProjectFormulationWizard {...wizardProps} focusStepId="problema" focusFieldKey="introduccion" focusRequest={1} />);
  await waitFor(() => expect(screen.getByLabelText('Introducción')).toHaveFocus());
  fireEvent.click(screen.getByRole('button', { name: 'Paso anterior' }));
  expect(screen.getByLabelText('Centro')).toBeVisible();
  view.rerender(<ProjectFormulationWizard {...wizardProps} focusStepId="problema" focusFieldKey="introduccion" focusRequest={2} />);
  await waitFor(() => expect(screen.getByLabelText('Introducción')).toHaveFocus());
});

it('maneja un portapapeles no disponible sin confirmar una copia', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
  render(<ProjectFormulationGuide {...guideProps} />);
  fireEvent.click(screen.getByRole('button', { name: /^Ejemplo$/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Copiar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(/cópialo manualmente/i);
  expect(screen.queryByText('¡Copiado!')).not.toBeInTheDocument();
});

it('mantiene metadatos válidos y responde a fallos de lectura y ausencia de identidad', () => {
  expect(checklistStorageKey('p-1', '', 'problema')).toBe('');
  expect(readPersonalChecklist('', 'hash')).toEqual({ checked: {}, failed: false, stale: false });
  expect(writePersonalChecklist('', 'hash', { 0: true })).toBe(false);
  const key = checklistStorageKey('p-1', 'u-1', 'problema');
  const hash = checklistFingerprint(['introduccion'], guideProps.currentValues, guide.checklist);
  expect(checklistFingerprint(['introduccion'], { introduccion: 'Editado' }, guide.checklist)).not.toBe(hash);
  localStorage.setItem(key, JSON.stringify({ fingerprint: hash, checked: { 0: true, 1: false, contenido: 'Texto', 2: 'true' } }));
  expect(readPersonalChecklist(key, hash)).toEqual({ checked: { 0: true, 1: false }, failed: false, stale: false });
  localStorage.setItem(key, '{');
  expect(readPersonalChecklist(key, hash)).toEqual({ checked: {}, failed: true, stale: false });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Bloqueado'); });
  expect(readPersonalChecklist(key, hash).failed).toBe(true);
});

it('presenta la revisión pendiente y la siguiente acción aun con todos los campos diligenciados', () => {
  const completed = structuredClone(record);
  completed.ruta_formulacion.resumen = { campos_diligenciados: true, borrador_generado: true, revision_registrada: false, revision_pendiente: true };
  completed.ruta_formulacion.siguiente_accion = 'Aclara los datos con sus fuentes antes de revisar.';
  render(<ProjectFormulationWizard {...wizardProps} record={completed} />);
  expect(screen.getByText('Borrador generado')).toBeVisible();
  expect(screen.getByText('Revisión pendiente')).toBeVisible();
  expect(screen.getByText('Aclara los datos con sus fuentes antes de revisar.')).toBeVisible();
});

it('indica valores inválidos en una fuente antes de invocar su guardado', async () => {
  const invalidRecord = structuredClone(record);
  invalidRecord.campos_comunes = [{ key: 'centro', label: 'Centro', type: 'number', min: 1 }];
  const onNotify = vi.fn(), onSaveCommon = vi.fn(), ref = createRef();
  render(<ProjectFormulationWizard {...wizardProps} ref={ref} record={invalidRecord} dirty={{ comunes: true }} onNotify={onNotify} onSaveCommon={onSaveCommon} />);
  let saved;
  await act(async () => { saved = await ref.current.savePending(); });
  expect(saved).toBe(false);
  expect(onSaveCommon).not.toHaveBeenCalled();
  expect(onNotify).toHaveBeenCalledWith(expect.stringContaining('valores inválidos'), 'error');
});

it('espera a que termine la carga para enfocar el campo, sin quitar el foco después de guardar', async () => {
  const view = render(<ProjectFormulationWizard {...wizardProps} busy focusStepId="identificacion" focusFieldKey="vigencia" focusRequest={1} />);
  expect(screen.getByLabelText('Duración')).not.toHaveFocus();
  view.rerender(<ProjectFormulationWizard {...wizardProps} focusStepId="identificacion" focusFieldKey="vigencia" focusRequest={1} />);
  expect(screen.getByLabelText('Duración')).toHaveFocus();
  screen.getByLabelText('Título').focus();
  view.rerender(<ProjectFormulationWizard {...wizardProps} busy focusStepId="identificacion" focusFieldKey="vigencia" focusRequest={1} />);
  view.rerender(<ProjectFormulationWizard {...wizardProps} focusStepId="identificacion" focusFieldKey="vigencia" focusRequest={1} />);
  expect(screen.getByLabelText('Título')).toHaveFocus();
});

it('también invalida la revisión personal de generación cuando cambia una fuente del proyecto', () => {
  const generationProps = { ...guideProps, step: { id: 'generar', campos: [] }, currentValues: { proyecto: { nombre: 'Proyecto' }, comunes: { centro: 'CGAO' }, formulacion: { introduccion: 'Texto' } } };
  const view = render(<ProjectFormulationGuide {...generationProps} />);
  fireEvent.click(screen.getByRole('button', { name: /Revisión personal/ }));
  fireEvent.click(screen.getByLabelText('Revisé las fuentes'));
  view.rerender(<ProjectFormulationGuide {...generationProps} currentValues={{ ...generationProps.currentValues, proyecto: { nombre: 'Proyecto actualizado' } }} />);
  expect(screen.getByLabelText('Revisé las fuentes')).not.toBeChecked();
});

it('conserva la huella al recargar registros con las mismas propiedades en otro orden', () => {
  expect(checklistFingerprint(['cronograma'], { cronograma: [{ actividad: 'Diseñar', responsable: 'Equipo' }] }))
    .toBe(checklistFingerprint(['cronograma'], { cronograma: [{ responsable: 'Equipo', actividad: 'Diseñar' }] }));
});
