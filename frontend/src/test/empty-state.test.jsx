import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FolderOpen, Filter } from 'lucide-react';
import EmptyStateDefault, { EmptyState } from '../components/ui/EmptyState';

describe('EmptyState — Componente de Estado Vacío Accesible (Requisito R3)', () => {
  it('renderiza el título y la descripción con semántica accesible y contraste', () => {
    render(
      <EmptyState
        title="No se encontraron proyectos"
        description="Prueba ajustando los filtros de búsqueda para ver más resultados."
      />
    );

    const region = screen.getByRole('region', { name: 'No se encontraron proyectos' });
    expect(region).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 3, name: 'No se encontraron proyectos' });
    expect(heading).toBeInTheDocument();
    expect(heading.className).toContain('text-slate-800');

    const desc = screen.getByText('Prueba ajustando los filtros de búsqueda para ver más resultados.');
    expect(desc).toBeInTheDocument();
    expect(desc.className).toContain('text-slate-600');
  });

  it('renderiza el icono SVG accesible con aria-hidden="true"', () => {
    const { container } = render(
      <EmptyState
        icon={FolderOpen}
        title="Bandeja vacía"
      />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg?.getAttribute('class')).toContain('text-slate-400');
  });

  it('renderiza condicionalmente el elemento de acción y responde a eventos de clic', () => {
    const handleActionClick = vi.fn();
    render(
      <EmptyState
        icon={Filter}
        title="Sin coincidencias"
        description="No hay convocatorias con esos filtros."
        action={
          <button type="button" onClick={handleActionClick}>
            Restablecer filtros
          </button>
        }
      />
    );

    const actionButton = screen.getByRole('button', { name: 'Restablecer filtros' });
    expect(actionButton).toBeInTheDocument();

    fireEvent.click(actionButton);
    expect(handleActionClick).toHaveBeenCalledTimes(1);
  });

  it('se renderiza de forma segura sin acción ni descripción opcional', () => {
    render(<EmptyState title="Solo título" />);

    const region = screen.getByRole('region', { name: 'Solo título' });
    expect(region).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Solo título' })).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(region.querySelectorAll('p')).toHaveLength(0);
  });

  it('combina clases CSS personalizadas mediante la prop className', () => {
    render(
      <EmptyState
        title="Diseño personalizado"
        className="my-custom-margin bg-transparent border-none py-8"
      />
    );

    const region = screen.getByRole('region', { name: 'Diseño personalizado' });
    expect(region.className).toContain('my-custom-margin');
    expect(region.className).toContain('bg-transparent');
    expect(region.className).toContain('border-none');
    expect(region.className).toContain('py-8');
  });

  it('se renderiza sin icono cuando la prop icon no es suministrada', () => {
    const { container } = render(<EmptyState title="Sin elemento visual" />);

    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByRole('region', { name: 'Sin elemento visual' })).toBeInTheDocument();
  });

  it('admite importación por defecto e importación nombrada', () => {
    expect(EmptyStateDefault).toBeDefined();
    expect(EmptyState).toBeDefined();
    expect(EmptyStateDefault).toBe(EmptyState);
  });
});
