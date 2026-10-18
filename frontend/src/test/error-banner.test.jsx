import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBanner from '../components/ui/ErrorBanner';

describe('ErrorBanner — Componente de Error Accesible (Contrato C1)', () => {
  it('renderiza con mensaje y título por defecto en variante danger', () => {
    render(<ErrorBanner message="Fallo de conexión con la base de datos" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(screen.getByText('No fue posible cargar la información')).toBeInTheDocument();
    expect(screen.getByText('Fallo de conexión con la base de datos')).toBeInTheDocument();
    expect(alert.className).toContain('bg-rose-50');
    expect(alert.className).toContain('border-rose-200');
  });

  it('renderiza título personalizado y variante warning con aria-live polite', () => {
    render(
      <ErrorBanner
        title="Advertencia de sincronización"
        message="Algunos registros podrían estar desactualizados."
        variant="warning"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Advertencia de sincronización')).toBeInTheDocument();
    expect(screen.getByText('Algunos registros podrían estar desactualizados.')).toBeInTheDocument();
    expect(alert.className).toContain('bg-amber-50');
    expect(alert.className).toContain('border-amber-200');
  });

  it('usa fallback a danger ante variante desconocida', () => {
    render(
      <ErrorBanner
        message="Error con variante desconocida"
        variant="invalid_variant"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(alert.className).toContain('bg-rose-50');
  });

  it('no muestra el botón de reintento cuando onRetry no se suministra', () => {
    render(<ErrorBanner message="Error sin reintento posible" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renderiza botón de reintento y ejecuta el callback onRetry al hacer clic', () => {
    const handleRetry = vi.fn();
    render(
      <ErrorBanner
        title="Error al cargar proyectos"
        message="Tiempo de espera agotado"
        onRetry={handleRetry}
        retryText="Volver a intentar"
      />
    );

    const retryButton = screen.getByRole('button', { name: /Volver a intentar/i });
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toHaveAttribute('aria-label', 'Volver a intentar: Error al cargar proyectos');

    fireEvent.click(retryButton);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('combina clases CSS personalizadas vía prop className', () => {
    render(
      <ErrorBanner
        message="Error de prueba con clases"
        className="my-custom-margin shadow-lg"
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('my-custom-margin');
    expect(alert.className).toContain('shadow-lg');
  });

  it('maneja de forma segura invocaciones cuando onRetry no es función', () => {
    render(
      <ErrorBanner
        message="Error con onRetry inválido"
        onRetry="no-es-una-funcion"
      />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
