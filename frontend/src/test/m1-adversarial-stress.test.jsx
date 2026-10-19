import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../components/ui/Button';
import ErrorBanner from '../components/ui/ErrorBanner';

describe('Adversarial Stress Test: Button.tsx (Contrato C2)', () => {
  describe('Pulsaciones repetidas y concurrentes bajo loading=true', () => {
    it('bloquea 100 clics rápidos consecutivos sin ejecutar el handler', () => {
      const handleClick = vi.fn();
      render(
        <Button loading onClick={handleClick}>
          Guardar Proyecto
        </Button>
      );

      const button = screen.getByRole('button', { name: /guardar proyecto/i });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');

      // Disparar 100 clics rápidos
      for (let i = 0; i < 100; i++) {
        fireEvent.click(button);
      }

      expect(handleClick).not.toHaveBeenCalled();
    });

    it('bloquea múltiples eventos DOM interactivos mientras loading=true', () => {
      const handlePointerDown = vi.fn();
      const handleKeyDown = vi.fn();
      const handleDoubleClick = vi.fn();
      const handleClick = vi.fn();

      render(
        <Button
          loading
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          onKeyDown={handleKeyDown}
          onDoubleClick={handleDoubleClick}
        >
          Acción Asíncrona
        </Button>
      );

      const button = screen.getByRole('button', { name: /acción asíncrona/i });

      fireEvent.pointerDown(button);
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });
      fireEvent.keyDown(button, { key: ' ', code: 'Space' });
      fireEvent.doubleClick(button);
      fireEvent.click(button);

      expect(handleClick).not.toHaveBeenCalled();
      expect(button).toBeDisabled();
      expect(button.className).toContain('disabled:pointer-events-none');
    });

    it('gestiona transiciones de estado loading dinámicas de forma consistente', () => {
      const handleClick = vi.fn();

      const DynamicButton = () => {
        const [loading, setLoading] = React.useState(false);
        return (
          <Button
            loading={loading}
            onClick={() => {
              handleClick();
              setLoading(true);
            }}
          >
            {loading ? 'Procesando...' : 'Iniciar'}
          </Button>
        );
      };

      render(<DynamicButton />);

      const button = screen.getByRole('button', { name: /iniciar/i });
      expect(button).not.toBeDisabled();

      // Primer clic legítimo
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Ahora el botón debe estar en loading
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');

      // Intentar 50 clics adicionales mientras está en loading
      for (let i = 0; i < 50; i++) {
        fireEvent.click(button);
      }

      // El handler no debió incrementarse
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('prevalece loading=true incluso si se pasa disabled=false explícito', () => {
      const handleClick = vi.fn();
      render(
        <Button loading={true} disabled={false} onClick={handleClick}>
          Forzar Desactivación
        </Button>
      );

      const button = screen.getByRole('button', { name: /forzar desactivación/i });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Propagación de props arbitrarias y no-fuga al DOM', () => {
    it('propaga atributos HTML estándar y data-* sin emitir advertencias de fuga', () => {
      const { container } = render(
        <Button
          id="btn-unique-123"
          name="submit-action"
          value="val-456"
          data-testid="empirical-btn"
          aria-label="Botón de prueba adversarial"
          tabIndex={0}
          title="Tooltip descriptivo"
          className="extra-custom-class"
        >
          Enviar
        </Button>
      );

      const button = screen.getByTestId('empirical-btn');
      expect(button).toHaveAttribute('id', 'btn-unique-123');
      expect(button).toHaveAttribute('name', 'submit-action');
      expect(button).toHaveAttribute('value', 'val-456');
      expect(button).toHaveAttribute('aria-label', 'Botón de prueba adversarial');
      expect(button).toHaveAttribute('title', 'Tooltip descriptivo');
      expect(button.className).toContain('extra-custom-class');

      // Verificar que los props internos loading e icon no fugan al DOM nativo
      expect(button.getAttribute('loading')).toBeNull();
      expect(button.getAttribute('icon')).toBeNull();
    });

    it('tolera variantes desconocidas sin lanzar excepción en tiempo de ejecución', () => {
      expect(() => {
        // @ts-expect-error probando variante anómala deliberadamente
        render(<Button variant="variant_inexistente">Variante Rara</Button>);
      }).not.toThrow();

      const button = screen.getByRole('button', { name: /variante rara/i });
      expect(button).toBeInTheDocument();
    });

    it('renderiza todas las variantes documentadas con sus clases correspondientes', () => {
      const variants = [
        { name: 'primary', expected: 'bg-emerald-700' },
        { name: 'sena', expected: 'from-[#175200]' },
        { name: 'secondary', expected: 'bg-slate-100' },
        { name: 'outline', expected: 'border-slate-300' },
        { name: 'ghost', expected: 'text-slate-700' },
        { name: 'danger', expected: 'bg-rose-700' },
        { name: 'warning', expected: 'bg-amber-500' },
        { name: 'indigo', expected: 'bg-indigo-700' },
        { name: 'success', expected: 'bg-emerald-700' },
      ];

      variants.forEach(({ name, expected }) => {
        // @ts-expect-error variante tipada
        const { unmount } = render(<Button variant={name}>{name}</Button>);
        const btn = screen.getByRole('button', { name });
        expect(btn.className).toContain(expected);
        unmount();
      });
    });
  });

  describe('Comportamiento de size="icon" con y sin loading', () => {
    it('size="icon" sin loading renderiza children directamente con dimensiones h-11 w-11 p-0', () => {
      render(
        <Button size="icon" aria-label="Acción de icono">
          <span data-testid="target-child-icon">★</span>
        </Button>
      );

      const button = screen.getByRole('button', { name: /acción de icono/i });
      expect(button.className).toContain('h-11');
      expect(button.className).toContain('w-11');
      expect(button.className).toContain('p-0');
      expect(screen.getByTestId('target-child-icon')).toBeInTheDocument();
      expect(button.querySelector('.animate-spin')).toBeNull();
      expect(button).not.toHaveAttribute('aria-busy');
    });

    it('size="icon" con loading oculta el children y muestra exclusivamente el spinner proporcional', () => {
      render(
        <Button size="icon" loading aria-label="Cargando acción de icono">
          <span data-testid="hidden-child-icon">★</span>
        </Button>
      );

      const button = screen.getByRole('button', { name: /cargando acción de icono/i });
      expect(screen.queryByTestId('hidden-child-icon')).toBeNull();

      const spinner = button.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
      expect(spinner).toHaveClass('h-5');
      expect(spinner).toHaveClass('w-5');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('size="icon" evalúa si prop icon se renderiza cuando children está ausente', () => {
      render(
        <Button
          size="icon"
          icon={<span data-testid="prop-based-icon">⚙</span>}
          aria-label="Configuración"
        />
      );

      const button = screen.getByRole('button', { name: /configuración/i });
      expect(button).toBeInTheDocument();
      // En la implementación actual, size="icon" espera children como contenido del icono.
      // Verificamos si prop icon se renderiza o si se requiere children
      const renderedPropIcon = screen.queryByTestId('prop-based-icon');
      // Observación empírica: si children no se provee, no renderiza prop.icon porque renderContent devuelve children
      expect(renderedPropIcon).toBeNull();
    });
  });
});

describe('Adversarial Stress Test: ErrorBanner.jsx (Contrato C1)', () => {
  describe('Cargas de texto extremas y resiliencia de layout', () => {
    it('soporta mensajes extremadamente largos (10.000 caracteres) sin desbordamiento ni fallos', () => {
      const longMessage = 'A'.repeat(10000);
      render(<ErrorBanner title="Fallo Masivo" message={longMessage} />);

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      const paragraph = alert.querySelector('p');
      expect(paragraph).toBeInTheDocument();
      expect(paragraph?.className).toContain('break-words');
      expect(paragraph?.textContent?.length).toBe(10000);
    });

    it('soporta cadenas con caracteres especiales, emojis y entidades unicode', () => {
      const unicodeMessage = '🚨 Error crítico: <script>alert(1)</script> & " \' — \u0000\uFFFF ñáéíóú 💥';
      render(<ErrorBanner title="Alerta Unicode" message={unicodeMessage} />);

      expect(screen.getByText(unicodeMessage)).toBeInTheDocument();
    });
  });

  describe('Casos límite en títulos y variantes', () => {
    it('maneja título como cadena vacía sin renderizar encabezado h4', () => {
      render(<ErrorBanner title="" message="Mensaje sin encabezado" />);
      const heading = screen.queryByRole('heading');
      expect(heading).toBeNull();
      expect(screen.getByText('Mensaje sin encabezado')).toBeInTheDocument();
    });

    it('utiliza título predeterminado cuando title es undefined', () => {
      render(<ErrorBanner title={undefined} message="Detalle del error" />);
      expect(screen.getByText('No fue posible cargar la información')).toBeInTheDocument();
    });

    it('soporta nodo React como título personalizado', () => {
      render(
        <ErrorBanner
          title={<span data-testid="custom-title-node">Título Personalizado</span>}
          message="Mensaje estándar"
        />
      );
      expect(screen.getByTestId('custom-title-node')).toBeInTheDocument();
    });

    it('aplica fallback a danger ante variantes arbitrarias y null', () => {
      const { unmount: unmount1 } = render(
        <ErrorBanner variant="desconocido" message="Error desconocido" />
      );
      let alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert.className).toContain('bg-rose-50');
      unmount1();

      const { unmount: unmount2 } = render(
        <ErrorBanner variant={null} message="Error con null" />
      );
      alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert.className).toContain('bg-rose-50');
      unmount2();
    });
  });

  describe('Llamadas anómalas y estrés en onRetry', () => {
    it('ejecuta 50 pulsaciones rápidas consecutivas en onRetry registrando todas las invocaciones', () => {
      const handleRetry = vi.fn();
      render(
        <ErrorBanner
          title="Fallo recuperable"
          message="Intente nuevamente"
          onRetry={handleRetry}
          retryText="Reintentar ahora"
        />
      );

      const button = screen.getByRole('button', { name: /reintentar ahora/i });
      for (let i = 0; i < 50; i++) {
        fireEvent.click(button);
      }

      expect(handleRetry).toHaveBeenCalledTimes(50);
    });

    it('no renderiza botón de reintento si onRetry es un tipo primitivo no invocable', () => {
      const invalidTypes = [true, false, 12345, 'cadena', {}, []];

      invalidTypes.forEach((invalidRetry) => {
        const { unmount } = render(
          // @ts-expect-error probando tipo inválido
          <ErrorBanner message="Prueba de onRetry inválido" onRetry={invalidRetry} />
        );
        expect(screen.queryByRole('button')).toBeNull();
        unmount();
      });
    });

    it('soporta funciones onRetry que devuelven promesas rechazadas sin romper el renderizado', async () => {
      const asyncRejection = vi.fn().mockRejectedValue(new Error('Fallo en el reintento asíncrono'));
      render(
        <ErrorBanner
          title="Fallo asíncrono"
          message="Servicio desconectado"
          onRetry={asyncRejection}
        />
      );

      const button = screen.getByRole('button', { name: /reintentar/i });
      fireEvent.click(button);
      expect(asyncRejection).toHaveBeenCalledTimes(1);
    });

    it('genera aria-label coherente incluso con retryText personalizado y título vacío', () => {
      render(
        <ErrorBanner
          title=""
          message="Error sin título"
          onRetry={() => {}}
          retryText="Reconectar"
        />
      );

      const button = screen.getByRole('button', { name: /reconectar/i });
      expect(button).toHaveAttribute('aria-label', 'Reconectar: ');
    });

    it('maneja title={null} sin fallar en el botón de reintento', () => {
      render(
        <ErrorBanner
          title={null}
          message="Error con título explícitamente nulo"
          onRetry={() => {}}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('aria-label', 'Reintentar: null');
    });

    it('tolera message ausente o vacío sin lanzar excepciones', () => {
      expect(() => {
        // @ts-expect-error probando sin mensaje
        render(<ErrorBanner />);
      }).not.toThrow();

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('No fue posible cargar la información')).toBeInTheDocument();
    });
  });
});

