import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import QuickActionHub from '../components/common/QuickActionHub';

vi.mock('../hooks/useModalStack', () => ({
  useModalStack: () => ({ zIndex: 1000, isTop: true }),
}));

describe('Acciones rápidas según el rol', () => {
  it('permite al aprendiz consultar sus proyectos sin ofrecer acciones de bitácora ni creación', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    render(
      <QuickActionHub
        isOpen
        currentUser={{ rol: 'aprendiz' }}
        onClose={onClose}
        onAction={onAction}
      />
    );

    expect(screen.getByText('Ver mis proyectos')).toBeInTheDocument();
    expect(screen.queryByText(/bitácora/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Nuevo Proyecto')).not.toBeInTheDocument();
    expect(screen.queryByText('Invitar Investigador')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Ver mis proyectos'));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({
      id: 'my-projects',
      module: 'proyectos',
      form: undefined,
    }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('mantiene las opciones completas para investigadores', () => {
    render(
      <QuickActionHub
        isOpen
        currentUser={{ rol: 'investigador' }}
        onClose={vi.fn()}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText('Nuevo Proyecto')).toBeInTheDocument();
    expect(screen.getByText('Reportar Producto')).toBeInTheDocument();
    expect(screen.getByText('Invitar Investigador')).toBeInTheDocument();
    expect(screen.queryByText('Ver mis proyectos')).not.toBeInTheDocument();
  });
});
