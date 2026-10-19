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

  it('usa texto predeterminado "Reintentar" en el botón si retryText no se proporciona', () => {
    const handleRetry = vi.fn();
    render(
      <ErrorBanner
        message="Fallo temporal del servicio"
        onRetry={handleRetry}
      />
    );

    const button = screen.getByRole('button', { name: /Reintentar/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('aria-label', 'Reintentar: No fue posible cargar la información');
  });

  it('oculta el elemento h4 de título si title es cadena vacía', () => {
    render(<ErrorBanner title="" message="Solo mensaje informativo de error" />);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('Solo mensaje informativo de error')).toBeInTheDocument();
  });

  it('renderiza icono con atributo aria-hidden="true" en variante danger', () => {
    const { container } = render(<ErrorBanner message="Fallo crítico" variant="danger" />);
    const icon = container.querySelector('svg.text-rose-700');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('renderiza icono con atributo aria-hidden="true" en variante warning', () => {
    const { container } = render(<ErrorBanner message="Advertencia preventiva" variant="warning" />);
    const icon = container.querySelector('svg.text-amber-800');
    expect(icon).toBeInTheDocument();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('incluye clases accesibles de enfoque en el botón de reintento', () => {
    render(<ErrorBanner message="Fallo reintentable" onRetry={() => {}} />);
    const button = screen.getByRole('button', { name: /Reintentar/i });
    expect(button.className).toContain('focus-visible:outline-none');
    expect(button.className).toContain('focus-visible:ring-2');
    expect(button.className).toContain('cursor-pointer');
  });

  it('aplica las clases semánticas de color para la variante warning', () => {
    render(
      <ErrorBanner
        title="Atención requerida"
        message="Conexión lenta detectada"
        variant="warning"
      />
    );
    const alert = screen.getByRole('alert');
    expect(alert.className).toContain('bg-amber-50');
    expect(alert.className).toContain('border-amber-200');
    expect(screen.getByText('Atención requerida').className).toContain('text-amber-950');
  });

  it('no muestra el botón de reintento si onRetry es explícitamente null', () => {
    render(<ErrorBanner message="Sin acción ejecutable" onRetry={null} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
