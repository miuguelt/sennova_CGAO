import React, { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { UnsavedChangesProvider, useUnsavedChangesGuard } from '../context/UnsavedChangesContext';

afterEach(cleanup);

function Sessions({ sessions, leave, secondLeave }) {
  const guard = useUnsavedChangesGuard();
  useEffect(() => {
    const unregister = sessions.map((session, index) => guard.registerSession(`sesion-${index}`, session));
    return () => unregister.forEach(remove => remove());
  }, [guard, sessions]);
  return <>
    <p>Trabajo conservado en el formulario</p>
    <button onClick={() => guard.requestLeave(leave)}>Solicitar salida</button>
    <button onClick={() => guard.requestLeave(secondLeave)}>Solicitar otra salida</button>
  </>;
}

it('guarda todas las sesiones pendientes en orden y omite las limpias', async () => {
  const order = [], leave = vi.fn();
  const clean = vi.fn();
  const first = vi.fn(async () => { order.push('primera'); return true; });
  const second = vi.fn(async () => { order.push('segunda'); return true; });
  render(<UnsavedChangesProvider><Sessions sessions={[{ dirty: true, save: first }, { dirty: false, save: clean }, { dirty: true, save: second }]} leave={leave} /></UnsavedChangesProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar salida' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  await waitFor(() => expect(leave).toHaveBeenCalledOnce());
  expect(order).toEqual(['primera', 'segunda']);
  expect(clean).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('no continúa a otra fuente ni sale cuando una sesión no confirma su guardado', async () => {
  const leave = vi.fn(), later = vi.fn();
  render(<UnsavedChangesProvider><Sessions sessions={[{ dirty: true, save: vi.fn().mockResolvedValue(undefined) }, { dirty: true, save: later }]} leave={leave} /></UnsavedChangesProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar salida' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron guardar todos los cambios');
  expect(later).not.toHaveBeenCalled();
  expect(leave).not.toHaveBeenCalled();
  expect(screen.getByText('Trabajo conservado en el formulario')).toBeInTheDocument();
});

it.each([{}, null, undefined])('informa excepciones sin mensaje y permite seguir editando: %s', async failure => {
  const leave = vi.fn();
  render(<UnsavedChangesProvider><Sessions sessions={[{ dirty: true, save: vi.fn().mockRejectedValue(failure) }]} leave={leave} /></UnsavedChangesProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar salida' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('revisa la conexión');
  fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(leave).not.toHaveBeenCalled();
});

it('descarta solo las sesiones pendientes y admite sesiones sin descarte propio', () => {
  const leave = vi.fn(), discard = vi.fn(), cleanDiscard = vi.fn();
  render(<UnsavedChangesProvider><Sessions sessions={[{ dirty: true, discard }, { dirty: true }, { dirty: false, discard: cleanDiscard }]} leave={leave} /></UnsavedChangesProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar salida' }));
  fireEvent.click(screen.getByRole('button', { name: 'Descartar y salir' }));
  expect(discard).toHaveBeenCalledOnce();
  expect(cleanDiscard).not.toHaveBeenCalled();
  expect(leave).toHaveBeenCalledOnce();
});

it('cerrar la confirmación con Escape o fondo vuelve a editar sin guardar ni descartar', () => {
  const leave = vi.fn(), save = vi.fn(), discard = vi.fn();
  render(<UnsavedChangesProvider><Sessions sessions={[{ dirty: true, save, discard }]} leave={leave} /></UnsavedChangesProvider>);
  for (const method of ['escape', 'fondo']) {
    fireEvent.click(screen.getByRole('button', { name: 'Solicitar salida' }));
    if (method === 'escape') fireEvent.keyDown(document, { key: 'Escape' });
    else fireEvent.click(screen.getByRole('dialog').querySelector('[aria-hidden="true"]'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Trabajo conservado en el formulario')).toBeInTheDocument();
  }
  expect(leave).not.toHaveBeenCalled();
  expect(save).not.toHaveBeenCalled();
  expect(discard).not.toHaveBeenCalled();
});

it('mantiene la salida original cuando llega otra solicitud durante el guardado', async () => {
  let finish;
  const leave = vi.fn(), secondLeave = vi.fn();
  const save = vi.fn(() => new Promise(resolve => { finish = resolve; }));
  render(<UnsavedChangesProvider><Sessions sessions={[{ dirty: true, save }]} leave={leave} secondLeave={secondLeave} /></UnsavedChangesProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar salida' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  fireEvent.click(screen.getByRole('button', { name: 'Solicitar otra salida' }));
  fireEvent.click(screen.getByRole('dialog').querySelector('[aria-hidden="true"]'));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await act(async () => finish(true));
  expect(leave).toHaveBeenCalledOnce();
  expect(secondLeave).not.toHaveBeenCalled();
  expect(save).toHaveBeenCalledOnce();
});
