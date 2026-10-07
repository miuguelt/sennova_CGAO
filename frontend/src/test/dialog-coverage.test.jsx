import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/Dialog';

describe('componentes de diálogo accesible', () => {
  it('muestra el contenido modal, aplica clases y permite cerrarlo', () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogTrigger>Abrir detalles</DialogTrigger>
        <DialogPortal>
          <DialogOverlay className="fondo-prueba" />
          <DialogContent className="contenido-prueba">
            <DialogTitle>Detalle del proyecto</DialogTitle>
            <DialogDescription>Información de la convocatoria.</DialogDescription>
            <DialogClose>Cerrar detalle</DialogClose>
          </DialogContent>
        </DialogPortal>
      </Dialog>,
    );

    expect(screen.getByRole('dialog')).toHaveTextContent('Detalle del proyecto');
    expect(screen.getByRole('dialog')).toHaveAccessibleName('Detalle del proyecto');
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Información de la convocatoria.');
    expect(screen.getByText('Información de la convocatoria.')).toBeVisible();
    expect(document.querySelector('.fondo-prueba')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveClass('contenido-prueba');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
