import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LoginScreen from '../components/auth/LoginScreen';

describe('registro público por rol', () => {
  it('registra aprendices y no permite escoger un rol de personal', async () => {
    const user = userEvent.setup();
    const onRegister = vi.fn().mockResolvedValue({ success: true });
    render(<LoginScreen onLogin={vi.fn()} onRegister={onRegister} />);

    await user.click(screen.getByRole('tab', { name: 'Registro' }));
    expect(screen.queryByLabelText('Tipo de Usuario')).not.toBeInTheDocument();
    expect(screen.getByText(/El registro público crea cuentas de aprendiz/i)).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Tu nombre completo'), 'Ana Aprendiz');
    await user.type(screen.getByPlaceholderText('nombre@sena.edu.co'), 'ana@sena.edu.co');
    await user.type(screen.getByPlaceholderText('••••••••'), 'clave123');
    await user.click(screen.getByRole('button', { name: 'Unirse Ahora' }));

    await waitFor(() => expect(onRegister).toHaveBeenCalledWith({
      email: 'ana@sena.edu.co',
      password: 'clave123',
      nombre: 'Ana Aprendiz',
      rol: 'aprendiz',
    }));
  });
});
