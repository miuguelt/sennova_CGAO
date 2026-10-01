import React from 'react';
import { act, render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserInsightPanel from '../components/users/UserInsightPanel';
import { DashboardAPI as StatsAPI } from '../api/dashboard';
import { DocumentosAPI } from '../api/documentos';
import { NotificacionesAPI } from '../api/notificaciones';
import { UsuariosAPI } from '../api/usuarios';
import { MensajesAPI } from '../api/mensajes';
import { ProyectosAPI } from '../api/proyectos';
import { SemillerosAPI } from '../api/semilleros';
import { ProductosAPI } from '../api/productos';
import { ReportesAPI } from '../api/reportes';

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

vi.mock('../api/mensajes', () => ({ MensajesAPI: { enviar: vi.fn() } }));
vi.mock('../api/proyectos', () => ({ ProyectosAPI: {
  list: vi.fn(), get: vi.fn(), update: vi.fn(), addEquipo: vi.fn(), removeEquipo: vi.fn()
} }));
vi.mock('../api/semilleros', () => ({ SemillerosAPI: {
  list: vi.fn(), update: vi.fn(), addAprendiz: vi.fn(), addInvestigador: vi.fn(), removeInvestigador: vi.fn()
} }));
vi.mock('../api/productos', () => ({ ProductosAPI: { update: vi.fn(), delete: vi.fn() } }));
vi.mock('../api/reportes', () => ({ ReportesAPI: { descargarCertificadoInvestigador: vi.fn() } }));

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
    DocumentosAPI.upload.mockResolvedValue({ id: 'doc-new' });
    DocumentosAPI.getViewUrl.mockReturnValue('/documentos/doc-1');
    UsuariosAPI.update.mockResolvedValue({});
    UsuariosAPI.resetPassword.mockResolvedValue({});
    MensajesAPI.enviar.mockResolvedValue({});
    NotificacionesAPI.enviarMensaje.mockResolvedValue({});
    ProyectosAPI.list.mockResolvedValue([]);
    ProyectosAPI.update.mockResolvedValue({});
    ProyectosAPI.addEquipo.mockResolvedValue({});
    ProyectosAPI.removeEquipo.mockResolvedValue({});
    SemillerosAPI.list.mockResolvedValue([]);
    SemillerosAPI.update.mockResolvedValue({});
    SemillerosAPI.addAprendiz.mockResolvedValue({});
    SemillerosAPI.addInvestigador.mockResolvedValue({});
    SemillerosAPI.removeInvestigador.mockResolvedValue({});
    ProductosAPI.update.mockResolvedValue({});
    ProductosAPI.delete.mockResolvedValue({});
    ReportesAPI.descargarCertificadoInvestigador.mockResolvedValue({});
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

    expect(await screen.findByText('Ficha Técnica Institucional')).toBeInTheDocument();

    expect(screen.getByText('Centro Agroempresarial del Oriente')).toBeInTheDocument();
    expect(screen.getByText('Investigador Principal')).toBeInTheDocument();
  });

  it('edits profile details, saves CVLaC, uploads identity support and generates the certificate', async () => {
    const onNotify = vi.fn();
    const user = { ...mockUser };
    DocumentosAPI.list.mockResolvedValue([{ id: 'doc-1', tipo: 'soporte_identidad', nombre_archivo: 'cedula.pdf' }]);
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const { container } = render(<UserInsightPanel user={user} isOpen onClose={vi.fn()} onNotify={onNotify} />);

    await screen.findByText('Ficha Técnica Institucional');
    fireEvent.click(screen.getByTitle('Editar información del usuario'));
    fireEvent.change(screen.getByLabelText('Nombre Completo'), { target: { value: 'Jorge Castro actualizado' } });
    fireEvent.change(screen.getByLabelText('Sede'), { target: { value: 'Medellín' } });
    fireEvent.change(screen.getByLabelText('Regional'), { target: { value: 'Antioquia' } });
    fireEvent.change(screen.getByLabelText('Rol SENNOVA'), { target: { value: 'Líder' } });
    fireEvent.change(screen.getByLabelText('Nivel Académico'), { target: { value: 'Doctorado' } });
    fireEvent.change(screen.getByLabelText('Número de Ficha'), { target: { value: '1234567' } });
    fireEvent.change(screen.getByLabelText('Programa de Formación'), { target: { value: 'Agroindustria' } });
    fireEvent.change(screen.getByLabelText('URL CVLaC'), { target: { value: 'https://cvlac.example/perfil' } });
    fireEvent.click(screen.getByText('Guardar Cambios'));
    expect(UsuariosAPI.update).toHaveBeenCalledWith(user.id, expect.objectContaining({ nombre: 'Jorge Castro actualizado', ficha: '1234567' }));
    expect(await screen.findByText(/Jorge Castro actualizado/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[1]);
    fireEvent.change(screen.getByLabelText('URL CVLaC'), { target: { value: 'https://cvlac.example/actualizado' } });
    fireEvent.click(screen.getByText('Guardar Enlace'));
    expect(UsuariosAPI.update).toHaveBeenCalledWith(user.id, { cv_lac_url: 'https://cvlac.example/actualizado' });
    await waitFor(() => expect(screen.queryByText('Enlace Perfil CVLaC')).not.toBeInTheDocument());

    fireEvent.click(screen.getByText('Ver PDF'));
    expect(open).toHaveBeenCalledWith('/documentos/doc-1', '_blank');
    fireEvent.click(screen.getByText('Actualizar'));
    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [new File(['id'], 'cedula.pdf', { type: 'application/pdf' })] } });
    expect(DocumentosAPI.upload).toHaveBeenCalledWith(expect.any(FormData));

    fireEvent.click(screen.getByText('Abrir CVLaC'));
    fireEvent.click(screen.getByText('Imprimir'));
    expect(open).toHaveBeenCalledWith('https://cvlac.example/actualizado', '_blank');
    expect(print).toHaveBeenCalled();
    fireEvent.click(screen.getByText('Certificado'));
    await waitFor(() => expect(ReportesAPI.descargarCertificadoInvestigador).toHaveBeenCalledWith(user.id));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Certificado generado correctamente', 'success'));

    fireEvent.click(screen.getByText('Editar Datos'));
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue('Jorge Castro actualizado');
    fireEvent.click(screen.getByText('Cancelar'));
  });

  it('sends a message, uses the notification fallback, and opens mailto', async () => {
    const onNotify = vi.fn();
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<UserInsightPanel user={mockUser} isOpen onClose={vi.fn()} onNotify={onNotify} />);
    fireEvent.click(screen.getByTitle('Enviar Mensaje o Notificación directa'));

    fireEvent.click(screen.getByText('Enviar Notificación'));
    expect(onNotify).toHaveBeenCalledWith('Por favor ingresa el asunto del mensaje', 'warning');
    fireEvent.click(screen.getByText('📝 Actualizar CVLaC'));
    fireEvent.click(screen.getByText('Urgente'));
    fireEvent.click(screen.getByText('Enviar Notificación'));
    await waitFor(() => expect(screen.queryByText('Enviar Mensaje / Notificación')).not.toBeInTheDocument());
    expect(MensajesAPI.enviar).toHaveBeenCalledWith(expect.objectContaining({ destinatario_id: mockUser.id }));

    MensajesAPI.enviar.mockRejectedValueOnce(new Error('chat no disponible'));
    fireEvent.click(screen.getByTitle('Enviar Mensaje o Notificación directa'));
    fireEvent.click(screen.getByText('📊 Avance de Proyecto'));
    fireEvent.click(screen.getByText('Abrir en Correo (mailto)'));
    expect(open).toHaveBeenCalledWith(expect.stringContaining('mailto:j.castro@sena.edu.co'), '_blank');
    fireEvent.click(screen.getByText('Enviar Notificación'));
    await waitFor(() => expect(NotificacionesAPI.enviarMensaje).toHaveBeenCalledWith(expect.objectContaining({ user_id: mockUser.id, prioridad: 'normal' })));
  });

  it('links and edits projects, products and seedbeds from the profile', async () => {
    const stats = {
      ...mockStats,
      proyectos_lista: [{ id: 'p-linked', nombre: 'Proyecto vigente', presupuesto: 1000, ejecutado: 500, objetivo: 'Objetivo', estado: 'Activo', equipo: 2, progreso: 50, rol: 'Investigador' }],
      productos_lista: [{ id: 'prod-1', nombre: 'Artículo', tipo: 'Artículo', descripcion: 'Descripción', autores: 'Jorge', estado_registro: 'Verificado' }],
      semilleros_lista: [{ id: 'sem-linked', nombre: 'Semillero vigente', estudiantes: 3, sede: 'Rionegro', lineas: ['Agro'] }]
    };
    StatsAPI.getUserImpact.mockResolvedValue(stats);
    ProyectosAPI.list.mockResolvedValue([{ id: 'p-linked', nombre: 'Proyecto vigente' }, { id: 'p-new', nombre: 'Proyecto por vincular' }]);
    SemillerosAPI.list.mockResolvedValue([{ id: 'sem-linked', nombre: 'Semillero vigente' }, { id: 'sem-new', nombre: 'Semillero por vincular' }]);
    render(<UserInsightPanel user={mockUser} isOpen onClose={vi.fn()} onNotify={vi.fn()} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Proyectos' }));
    fireEvent.click(await screen.findByText('Proyecto vigente'));
    let nestedDialog = screen.getByRole('dialog', { name: 'Proyecto vigente' });
    fireEvent.click(within(nestedDialog).getByText('Editar'));
    fireEvent.click(within(nestedDialog).getByLabelText('Cerrar ventana modal'));
    expect(screen.getByRole('dialog', { name: 'Editar proyecto' })).toBeInTheDocument();
    fireEvent.click(within(nestedDialog).getByText('Cancelar'));
    fireEvent.click(within(nestedDialog).getByText('Editar'));
    const budgetInputs = within(nestedDialog).getAllByRole('spinbutton');
    fireEvent.change(budgetInputs[0], { target: { value: '1800' } });
    fireEvent.change(budgetInputs[1], { target: { value: '700' } });
    fireEvent.change(within(nestedDialog).getAllByRole('textbox')[0], { target: { value: 'Nuevo objetivo' } });
    fireEvent.click(within(nestedDialog).getByText('Guardar Cambios'));
    expect(ProyectosAPI.update).toHaveBeenCalledWith('p-linked', expect.objectContaining({ objetivo_general: 'Nuevo objetivo' }));
    await within(nestedDialog).findByText('Desvincular');
    fireEvent.click(within(nestedDialog).getByText('Cerrar'));

    fireEvent.click(screen.getByTitle('Producción'));
    fireEvent.click(await screen.findByText('Artículo'));
    nestedDialog = screen.getByRole('dialog', { name: 'Artículo' });
    fireEvent.click(within(nestedDialog).getByText('Editar'));
    fireEvent.change(within(nestedDialog).getAllByRole('textbox')[0], { target: { value: 'Descripción actualizada' } });
    fireEvent.change(within(nestedDialog).getAllByRole('textbox')[1], { target: { value: 'Libro' } });
    fireEvent.change(within(nestedDialog).getAllByRole('textbox')[2], { target: { value: 'Jorge y Ana' } });
    fireEvent.click(within(nestedDialog).getByText('Guardar Cambios'));
    await waitFor(() => expect(ProductosAPI.update).toHaveBeenCalledWith('prod-1', expect.objectContaining({ tipo: 'Libro', nombre: 'Artículo', descripcion: 'Descripción actualizada' })));
    await within(nestedDialog).findByText('Desvincular');
    fireEvent.click(within(nestedDialog).getByText('Desvincular'));
    fireEvent.click(within(nestedDialog).getByText('¿Confirmar?'));
    await waitFor(() => expect(ProductosAPI.delete).toHaveBeenCalledWith('prod-1'));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Artículo' })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    fireEvent.click(await screen.findByText('Semillero vigente'));
    nestedDialog = screen.getByRole('dialog', { name: 'Semillero vigente' });
    fireEvent.click(within(nestedDialog).getByText('Editar'));
    fireEvent.change(within(nestedDialog).getByRole('spinbutton'), { target: { value: '8' } });
    fireEvent.change(within(nestedDialog).getByRole('textbox'), { target: { value: 'Medellín' } });
    fireEvent.click(within(nestedDialog).getByText('Guardar Cambios'));
    expect(SemillerosAPI.update).toHaveBeenCalledWith('sem-linked', expect.objectContaining({ sede: 'Medellín' }));
    await within(nestedDialog).findByText('Desvincular');
    fireEvent.click(within(nestedDialog).getByText('Cerrar'));

    fireEvent.click(screen.getByText('Vincular Semillero'));
    fireEvent.click(await screen.findByText('Semillero por vincular'));
    expect(SemillerosAPI.addInvestigador).toHaveBeenCalledWith('sem-new', expect.objectContaining({ user_id: mockUser.id }));
    await waitFor(() => expect(screen.queryByText('Semillero por vincular')).not.toBeInTheDocument());

    fireEvent.click(screen.getByTitle('Proyectos'));
    fireEvent.click(screen.getByText('Vincular Proyecto'));
    fireEvent.click(await screen.findByText('Proyecto por vincular'));
    expect(ProyectosAPI.addEquipo).toHaveBeenCalledWith('p-new', mockUser.id, 'Investigador', 20);
    await waitFor(() => expect(screen.queryByText('Proyecto por vincular')).not.toBeInTheDocument());

    fireEvent.click(screen.getByText('Vincular Proyecto'));
    fireEvent.click(await screen.findByLabelText('Cerrar ventana modal'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByText('Vincular Proyecto'));
    fireEvent.click(await screen.findByText('Cerrar'));
  });

  it('covers failed loads, failed saves, unlink confirmation, reset and email copy', async () => {
    const onNotify = vi.fn();
    const user = { ...mockUser };
    StatsAPI.getUserImpact.mockRejectedValueOnce(new Error('impacto')).mockResolvedValue(mockStats);
    DocumentosAPI.list.mockRejectedValueOnce(new Error('documentos'));
    UsuariosAPI.update.mockRejectedValueOnce(new Error('perfil')).mockResolvedValue({});
    const clipboard = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: clipboard } });
    render(<UserInsightPanel user={user} isOpen onClose={vi.fn()} onNotify={onNotify} />);
    await screen.findByTitle('Cambiar o Resetear Contraseña');
    vi.useFakeTimers();
    fireEvent.click(screen.getByTitle('Haz clic para copiar correo'));
    expect(clipboard).toHaveBeenCalledWith(user.email);
    act(() => vi.runAllTimers());
    vi.useRealTimers();
    fireEvent.click(screen.getByTitle('Editar información del usuario'));
    await screen.findByLabelText('Nombre Completo');
    fireEvent.click(screen.getByText('Guardar Cambios'));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al actualizar: perfil', 'error'));
    expect(onNotify).toHaveBeenCalledWith('Error al actualizar: perfil', 'error');

    fireEvent.click(screen.getByTitle('Cambiar o Resetear Contraseña'));
    fireEvent.click(screen.getByText('Generar Clave Segura'));
    fireEvent.click(screen.getByText('Confirmar Cambio'));
    await waitFor(() => expect(screen.queryByText('Cambiar Contraseña de Acceso')).not.toBeInTheDocument());
    expect(UsuariosAPI.resetPassword).toHaveBeenCalledWith(user.id, expect.stringMatching(/^Sennova\./));
  });

  it('allows uploading identity support when the user has no document yet', async () => {
    const { container } = render(<UserInsightPanel user={mockUser} isOpen onClose={vi.fn()} onNotify={vi.fn()} />);
    await screen.findByText('Ficha Técnica Institucional');
    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    fireEvent.click(screen.getByText('Subir Soporte (PDF)'));
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [new File(['id'], 'cedula.pdf', { type: 'application/pdf' })] }
    });
    await waitFor(() => expect(DocumentosAPI.upload).toHaveBeenCalledWith(expect.any(FormData)));
  });

  it('covers auxiliary dialog input, cancel, close and confirmation actions', async () => {
    render(<UserInsightPanel user={mockUser} isOpen onClose={vi.fn()} onNotify={vi.fn()} />);
    await screen.findByText('Ficha Técnica Institucional');

    fireEvent.click(screen.getByText('Modificar'));
    expect(screen.getByLabelText('Nombre Completo')).toHaveValue(mockUser.nombre);
    fireEvent.click(screen.getByText('Cancelar'));

    fireEvent.click(screen.getByTitle('Cambiar o Resetear Contraseña'));
    fireEvent.change(screen.getByPlaceholderText('Mínimo 6 caracteres'), { target: { value: 'clave123' } });
    fireEvent.change(screen.getByPlaceholderText('Repite la nueva contraseña'), { target: { value: 'clave124' } });
    fireEvent.click(screen.getByTitle('Mostrar'));
    expect(screen.getByPlaceholderText('Mínimo 6 caracteres')).toHaveAttribute('type', 'text');
    expect(screen.getByText('Confirmar Cambio')).toBeDisabled();
    fireEvent.click(screen.getByText('Cancelar'));

    fireEvent.click(screen.getByTitle('Cambiar o Resetear Contraseña'));
    fireEvent.click(screen.getByLabelText('Cerrar ventana modal'));

    fireEvent.click(screen.getByTitle('Enviar Mensaje o Notificación directa'));
    fireEvent.change(screen.getByPlaceholderText('Ej: Recordatorio de cargue de evidencias...'), { target: { value: 'Asunto manual' } });
    fireEvent.change(screen.getByPlaceholderText('Escribe el mensaje o instrucciones para este usuario...'), { target: { value: 'Mensaje manual' } });
    fireEvent.click(screen.getByText('Cancelar'));

    fireEvent.click(screen.getByTitle('Enviar Mensaje o Notificación directa'));
    fireEvent.click(screen.getByLabelText('Cerrar ventana modal'));

    fireEvent.click(screen.getByRole('tab', { name: 'Documentos' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[1]);
    fireEvent.change(screen.getByLabelText('URL CVLaC'), { target: { value: 'https://cvlac.example/pendiente' } });
    fireEvent.click(screen.getByText('Cancelar'));
    fireEvent.click(screen.getAllByRole('button', { name: 'Editar' })[1]);
    fireEvent.click(screen.getByLabelText('Cerrar ventana modal'));
  });
});
