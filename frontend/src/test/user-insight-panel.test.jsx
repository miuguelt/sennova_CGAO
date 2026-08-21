import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserInsightPanel from '../components/users/UserInsightPanel';
import { DashboardAPI as StatsAPI } from '../api/dashboard';
import { DocumentosAPI } from '../api/documentos';
import { NotificacionesAPI } from '../api/notificaciones';
import { UsuariosAPI } from '../api/usuarios';

// Mock APIs
vi.mock('../api/dashboard', () => ({
  DashboardAPI: {
    getUserImpact: vi.fn()
  }
}));

vi.mock('../api/documentos', () => ({
  DocumentosAPI: {
    list: vi.fn(),
    upload: vi.fn(),
    getViewUrl: vi.fn()
  }
}));

vi.mock('../api/notificaciones', () => ({
  NotificacionesAPI: {
    enviarMensaje: vi.fn(),
    crearSistema: vi.fn()
  }
}));

vi.mock('../api/usuarios', () => ({
  UsuariosAPI: {
    update: vi.fn(),
    resetPassword: vi.fn()
  }
}));

const mockUser = {
  id: 'usr-123',
  nombre: 'Ing. Jorge Castro',
  email: 'j.castro@sena.edu.co',
  rol: 'investigador',
  is_active: true,
  sede: 'Centro Agroempresarial del Oriente',
  regional: 'Santander',
  rol_sennova: 'Investigador Principal',
  nivel_academico: 'Maestría',
  cv_lac_url: 'https://scienti.minciencias.gov.co/cvlac/123'
};

const mockStats = {
  resumen_perfil: 'Investigador SENNOVA adscrito al Santander. Participa en 1 semillero(s) y 2 proyecto(s) de I+D+i.',
  proyectos_count: 2,
  productos_count: 1,
  semilleros_count: 1,
  cumplimiento: 85,
  presupuesto_total: 45000000,
  presupuesto_ejecutado: 38000000,
  porcentaje_ejecucion: 84,
  distribucion_perfil: [
    { name: 'Proyectos', value: 2 },
    { name: 'Productos', value: 1 },
    { name: 'Semilleros', value: 1 }
  ],
  proyectos_lista: [],
  productos_lista: [],
  semilleros_lista: []
};

describe('UserInsightPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    StatsAPI.getUserImpact.mockResolvedValue(mockStats);
    DocumentosAPI.list.mockResolvedValue([]);
  });

  it('renders user details and clear header action buttons', async () => {
    render(
      <UserInsightPanel
        user={mockUser}
        isOpen={true}
        onClose={vi.fn()}
        onNotify={vi.fn()}
      />
    );

    // Check user info rendered
    expect(screen.getByText('Ing. Jorge Castro')).toBeInTheDocument();
    expect(screen.getByText('j.castro@sena.edu.co')).toBeInTheDocument();
    expect(screen.getByText('Verificado')).toBeInTheDocument();

    // Check action buttons in header exist and are visible
    expect(screen.getByTitle('Enviar Mensaje o Notificación directa')).toBeInTheDocument();
    expect(screen.getByTitle('Cambiar o Resetear Contraseña')).toBeInTheDocument();
    expect(screen.getByTitle('Editar información del usuario')).toBeInTheDocument();
  });

  it('opens SendMessageModal with templates when clicking message button', async () => {
    render(
      <UserInsightPanel
        user={mockUser}
        isOpen={true}
        onClose={vi.fn()}
        onNotify={vi.fn()}
      />
    );

    const messageBtn = screen.getByTitle('Enviar Mensaje o Notificación directa');
    fireEvent.click(messageBtn);

    // Modal title should appear
    expect(screen.getByText('Enviar Mensaje / Notificación')).toBeInTheDocument();
    expect(screen.getByText('📝 Actualizar CVLaC')).toBeInTheDocument();
    expect(screen.getByText('📊 Avance de Proyecto')).toBeInTheDocument();

    // Clicking a template populates the form
    fireEvent.click(screen.getByText('📝 Actualizar CVLaC'));
    expect(screen.getByDisplayValue(/Recordatorio: Actualización de CVLaC/i)).toBeInTheDocument();
  });

  it('opens ResetModal with secure generator when clicking password change button', async () => {
    render(
      <UserInsightPanel
        user={mockUser}
        isOpen={true}
        onClose={vi.fn()}
        onNotify={vi.fn()}
      />
    );

    const keyBtn = screen.getByTitle('Cambiar o Resetear Contraseña');
    fireEvent.click(keyBtn);

    // Password reset modal title
    expect(screen.getByText('Cambiar Contraseña de Acceso')).toBeInTheDocument();
    expect(screen.getByText('Generar Clave Segura')).toBeInTheDocument();

    // Click generate key
    fireEvent.click(screen.getByText('Generar Clave Segura'));
    expect(screen.getByText('Mínimo 6 caracteres')).toBeInTheDocument();
  });

  it('displays institutional data sheet in overview tab', async () => {
    render(
      <UserInsightPanel
        user={mockUser}
        isOpen={true}
        onClose={vi.fn()}
        onNotify={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Ficha Técnica y Datos Institucionales')).toBeInTheDocument();
    });

    expect(screen.getByText('Centro Agroempresarial del Oriente')).toBeInTheDocument();
    expect(screen.getByText('Investigador Principal')).toBeInTheDocument();
  });
});
