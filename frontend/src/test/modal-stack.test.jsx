import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import modalStack from '../utils/modalStack';
import Modal from '../components/ui/Modal';
import Drawer from '../components/ui/Drawer';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { Award } from 'lucide-react';

describe('ModalStackManager (SSoT LIFO)', () => {
  beforeEach(() => {
    while (modalStack.getStack().length > 0) {
      const top = modalStack.getTop();
      if (top) modalStack.pop(top.id);
    }
    document.body.style.overflow = '';
  });

  afterEach(() => {
    cleanup();
    while (modalStack.getStack().length > 0) {
      const top = modalStack.getTop();
      if (top) modalStack.pop(top.id);
    }
    document.body.style.overflow = '';
  });

  it('starts with an empty stack and no body lock', () => {
    expect(modalStack.getStack()).toEqual([]);
    expect(modalStack.getTop()).toBeNull();
    expect(modalStack.getDepth()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('pushes modals into the stack with incrementing levels and z-indexes', () => {
    const onClose1 = vi.fn();
    const entry1 = modalStack.push({ id: 'modal-1', onClose: onClose1, type: 'modal' });

    expect(entry1.level).toBe(0);
    expect(entry1.zIndex).toBe(100);
    expect(modalStack.getDepth()).toBe(1);
    expect(modalStack.isTop('modal-1')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    const onClose2 = vi.fn();
    const entry2 = modalStack.push({ id: 'modal-2', onClose: onClose2, type: 'drawer' });

    expect(entry2.level).toBe(1);
    expect(entry2.zIndex).toBe(120);
    expect(modalStack.getDepth()).toBe(2);
    expect(modalStack.isTop('modal-2')).toBe(true);
    expect(modalStack.isTop('modal-1')).toBe(false);

    const onClose3 = vi.fn();
    const entry3 = modalStack.push({ id: 'modal-3', onClose: onClose3, type: 'confirm' });

    expect(entry3.level).toBe(2);
    expect(entry3.zIndex).toBe(140);
    expect(modalStack.getDepth()).toBe(3);
    expect(modalStack.isTop('modal-3')).toBe(true);
  });

  it('delegates ESC key event ONLY to the topmost modal (LIFO)', () => {
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();
    const onClose3 = vi.fn();

    modalStack.push({ id: 'm1', onClose: onClose1 });
    modalStack.push({ id: 'm2', onClose: onClose2 });
    modalStack.push({ id: 'm3', onClose: onClose3 });

    // Simulate ESC press
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(escEvent);

    expect(onClose3).toHaveBeenCalledTimes(1);
    expect(onClose2).not.toHaveBeenCalled();
    expect(onClose1).not.toHaveBeenCalled();
  });

  it('pops items and releases body scroll lock only when stack is empty', () => {
    modalStack.push({ id: 'm1', onClose: () => {} });
    modalStack.push({ id: 'm2', onClose: () => {} });

    expect(document.body.style.overflow).toBe('hidden');

    modalStack.pop('m2');
    expect(modalStack.getDepth()).toBe(1);
    expect(modalStack.isTop('m1')).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    modalStack.pop('m1');
    expect(modalStack.getDepth()).toBe(0);
    expect(modalStack.getTop()).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('notifies subscribers on push and pop', () => {
    const subscriber = vi.fn();
    const unsubscribe = modalStack.subscribe(subscriber);

    modalStack.push({ id: 'sub-test', onClose: () => {} });
    expect(subscriber).toHaveBeenCalled();

    modalStack.pop('sub-test');
    expect(subscriber).toHaveBeenCalledTimes(2);

    unsubscribe();
  });
});

describe('Standardized UI Components in Stack', () => {
  afterEach(() => {
    cleanup();
    while (modalStack.getStack().length > 0) {
      const top = modalStack.getTop();
      if (top) modalStack.pop(top.id);
    }
  });

  it('renders Modal when isOpen is true and registers with stack', () => {
    const handleClose = vi.fn();
    render(
      <Modal
        isOpen={true}
        onClose={handleClose}
        title="Test Modal Title"
        subtitle="Test Subtitle"
        icon={Award}
        size="md"
        variant="sena"
      >
        <p>Modal Content Inside</p>
      </Modal>
    );

    expect(screen.getByText('Test Modal Title')).toBeDefined();
    expect(screen.getByText('Test Subtitle')).toBeDefined();
    expect(screen.getByText('Modal Content Inside')).toBeDefined();
    expect(modalStack.getDepth()).toBe(1);
  });

  it('renders Drawer with header, tabs and footer', () => {
    const handleClose = vi.fn();
    const onTabChange = vi.fn();
    render(
      <Drawer
        isOpen={true}
        onClose={handleClose}
        title="Drawer Panel Title"
        variant="indigo"
        tabs={[
          { id: 'tab1', label: 'Tab Uno' },
          { id: 'tab2', label: 'Tab Dos' },
        ]}
        activeTab="tab1"
        onTabChange={onTabChange}
        footer={<button>Accion Drawer</button>}
      >
        <p>Drawer Content Body</p>
      </Drawer>
    );

    expect(screen.getByText('Drawer Panel Title')).toBeDefined();
    expect(screen.getByText('Tab Uno')).toBeDefined();
    expect(screen.getByText('Accion Drawer')).toBeDefined();
    expect(screen.getByText('Drawer Content Body')).toBeDefined();

    fireEvent.click(screen.getByText('Tab Dos'));
    expect(onTabChange).toHaveBeenCalledWith('tab2');
  });

  it('renders ConfirmDialog and triggers onConfirm on button click', async () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="¿Eliminar Registro?"
        description="Esta acción es irreversible."
        confirmText="Sí, Eliminar"
        variant="danger"
      />
    );

    expect(screen.getByText('¿Eliminar Registro?')).toBeDefined();
    expect(screen.getByText('Esta acción es irreversible.')).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getByText('Sí, Eliminar'));
    });
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders ConfirmDialog and triggers onClose on cancel click', async () => {
    const handleClose = vi.fn();
    const handleConfirm = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title="¿Eliminar Registro?"
        description="Esta acción es irreversible."
        confirmText="Sí, Eliminar"
        variant="danger"
      />
    );

    await act(async () => {
      fireEvent.click(screen.getByText('Cancelar'));
    });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('supports nesting: Modal over Drawer with auto-calculated z-index', () => {
    const onCloseDrawer = vi.fn();
    const onCloseModal = vi.fn();

    const NestedApp = () => {
      return (
        <>
          <Drawer isOpen={true} onClose={onCloseDrawer} title="Drawer Level 0">
            <p>Drawer Level 0 Body</p>
          </Drawer>
          <Modal isOpen={true} onClose={onCloseModal} title="Modal Level 1">
            <p>Modal Level 1 Body</p>
          </Modal>
        </>
      );
    };

    render(<NestedApp />);

    expect(modalStack.getDepth()).toBe(2);
    const top = modalStack.getTop();
    expect(top).toBeDefined();

    // Trigger ESC - only the top (Modal) should close
    const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(escEvent);

    expect(onCloseModal).toHaveBeenCalledTimes(1);
    expect(onCloseDrawer).not.toHaveBeenCalled();
  });
});
