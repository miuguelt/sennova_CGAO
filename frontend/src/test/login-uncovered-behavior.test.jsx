import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import LoginScreen from '../components/auth/LoginScreen';

describe('LoginScreen, accesos rápidos', () => {
  it('carga las credenciales de desarrollo y alterna la visibilidad de la contraseña', () => {
    render(<LoginScreen onLogin={vi.fn()} onRegister={vi.fn()} apiError="Error de autenticación" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Error de autenticación');
    expect(screen.getByText(/datos preparados para aprender/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Admin Sistema/i }));
    expect(screen.getByPlaceholderText('nombre@sena.edu.co')).toHaveValue('admin@sena.edu.co');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    const password = screen.getByPlaceholderText('••••••••');
    expect(password).toHaveValue('123456');
    expect(password).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(screen.getByPlaceholderText('••••••••')).toHaveAttribute('type', 'password');
  });

  it('muestra el error de autenticación recibido desde el servidor', () => {
    render(
      <LoginScreen
        onLogin={vi.fn()}
        onRegister={vi.fn()}
        apiError="Servicio de autenticación no disponible"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Servicio de autenticación no disponible');
  });
});
