import React, { useEffect, useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UnsavedChangesProvider, useUnsavedChangesGuard } from '../context/UnsavedChangesContext';
import Drawer from '../components/ui/Drawer';

afterEach(cleanup);
function Session({ dirty = true, save, discard, children }) {
  const guard = useUnsavedChangesGuard();
  useEffect(() => guard.registerSession('example', { dirty, save, discard }), [guard, dirty, save, discard]);
  return <>{children}<button onClick={() => guard.requestLeave(() => discard?.('salida'))}>Salir del módulo</button></>;
}
function Workspace({ save, discard }) {
  const [open, setOpen] = useState(true);
  return <UnsavedChangesProvider>{open && <Session save={save} discard={discard}>
    <Drawer isOpen protectUnsavedChanges title="Proyecto en edición" onClose={() => setOpen(false)}><p>Texto por guardar</p></Drawer>
  </Session>}</UnsavedChangesProvider>;
}

it('permite salir sin cambios y mantiene la compatibilidad fuera del proveedor', () => {
  const leave = vi.fn();
  const view = render(<Session dirty={false} discard={leave} />);
  fireEvent.click(screen.getByRole('button', { name: 'Salir del módulo' }));
  expect(leave).toHaveBeenCalledWith('salida');
  view.unmount();
  render(<UnsavedChangesProvider><Session dirty={false} discard={leave} /></UnsavedChangesProvider>);
  fireEvent.click(screen.getByRole('button', { name: 'Salir del módulo' }));
  expect(leave).toHaveBeenCalledTimes(2);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('nombra las pestañas cuando la cabecera del proyecto contiene formato', () => {
  render(<Drawer isOpen onClose={vi.fn()} ariaLabel="Proyecto agrícola" title={<span>Proyecto agrícola</span>}
    tabs={[{ id: 'documentation', label: 'Documentación' }]} activeTab="documentation" onTabChange={vi.fn()} />);
  expect(screen.getByRole('tablist', { name: 'Pestañas de Proyecto agrícola' })).toBeVisible();
});

it('intercepta el cierre y seguir editando conserva el formulario y el texto', () => {
  render(<Workspace save={vi.fn()} discard={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  expect(screen.getByRole('dialog', { name: 'Cambios pendientes por guardar' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
  expect(screen.getByRole('dialog', { name: 'Proyecto en edición' })).toBeVisible();
  expect(screen.getByText('Texto por guardar')).toBeInTheDocument();
});

it('guarda antes de salir y no descarta un texto que se guardó', async () => {
  const save = vi.fn().mockResolvedValue(true), discard = vi.fn();
  render(<Workspace save={save} discard={discard} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(save).toHaveBeenCalledTimes(1);
  expect(discard).not.toHaveBeenCalled();
});

it('un fallo de guardado conserva el panel y explica cómo continuar', async () => {
  const save = vi.fn().mockResolvedValue(false);
  render(<Workspace save={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('seguir editando');
  expect(screen.getByRole('dialog', { name: 'Proyecto en edición' })).toBeInTheDocument();
});

it('una excepción no cierra el proyecto ni bloquea el reintento', async () => {
  const save = vi.fn().mockRejectedValueOnce(new Error('Conexión interrumpida')).mockResolvedValue(true);
  render(<Workspace save={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Conexión interrumpida');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
});

it('descartar requiere una decisión y ejecuta el descarte antes de cerrar', () => {
  const discard = vi.fn(), save = vi.fn();
  render(<Workspace save={save} discard={discard} />);
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByRole('dialog', { name: 'Cambios pendientes por guardar' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Descartar y salir' }));
  expect(discard).toHaveBeenCalledTimes(1);
  expect(save).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('protege la recarga solo mientras haya ediciones pendientes', () => {
  const props = { save: vi.fn(), discard: vi.fn() };
  const view = render(<UnsavedChangesProvider><Session {...props} /></UnsavedChangesProvider>);
  const pending = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(pending);
  expect(pending.defaultPrevented).toBe(true);
  view.rerender(<UnsavedChangesProvider><Session {...props} dirty={false} /></UnsavedChangesProvider>);
  const clean = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(clean);
  expect(clean.defaultPrevented).toBe(false);
  view.unmount();
  const removed = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(removed);
  expect(removed.defaultPrevented).toBe(false);
});

it('durante el guardado bloquea cerrar la confirmación y evita escrituras dobles', async () => {
  let finish;
  const save = vi.fn(() => new Promise(resolve => { finish = resolve; }));
  render(<Workspace save={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y salir' }));
  expect(screen.getByRole('button', { name: 'Seguir editando' })).toBeDisabled();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.getByRole('dialog', { name: 'Cambios pendientes por guardar' })).toBeInTheDocument();
  await act(async () => finish(true));
  expect(save).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
