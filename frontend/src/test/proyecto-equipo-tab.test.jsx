import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import ProyectoEquipoTab from '../components/projects/ProyectoEquipoTab';

describe('ProyectoEquipoTab', () => {
  const mockProyecto = {
    id: 'proj-123',
    nombre: 'Proyecto de Innovación Tecnológica 2026',
    owner_id: 'user-admin',
    equipo: []
  };

  const mockUsers = [
    {
      id: 'u-1',
      nombre: 'Carlos Rodríguez',
      email: 'carlos@sena.edu.co',
      rol: 'investigador',
      rol_sennova: 'Investigador Principal',
      sede: 'Centro Tecnológico'
    },
    {
      id: 'u-2',
      nombre: 'Diana Morales',
      email: 'diana@sena.edu.co',
      rol: 'investigador',
      rol_sennova: 'Coinvestigadora',
      sede: 'Complejo Central'
    },
    {
      id: 'u-3',
      nombre: 'Andrés Gómez',
      email: 'andres@sena.edu.co',
      rol: 'aprendiz',
      rol_sennova: 'Aprendiz SENNOVA',
      sede: 'Centro Tecnológico'
    }
  ];

  const mockCurrentUser = {
    id: 'user-admin',
    nombre: 'Admin Principal',
    rol: 'admin'
  };

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders empty state when there are no team members', () => {
    render(
      <ProyectoEquipoTab
        proyecto={mockProyecto}
        teamMembers={[]}
        usuarios={mockUsers}
        currentUser={mockCurrentUser}
        isOwnerOrAdmin={true}
        onAddMember={vi.fn()}
        onRemoveMember={vi.fn()}
        onNotify={vi.fn()}
      />
    );

    expect(screen.getByText('Investigadores Vinculados')).toBeInTheDocument();
    expect(screen.getByText('0 Miembros')).toBeInTheDocument();
    expect(screen.getByText('No hay investigadores asignados')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Vincular Primer Investigador/i })).toBeInTheDocument();
  });

  it('renders linked team members with their details, roles and hours', () => {
    const team = [
      {
        id: 'u-1',
        nombre: 'Carlos Rodríguez',
        email: 'carlos@sena.edu.co',
        rol_en_proyecto: 'Investigador Principal',
        horas_dedicadas: 30,
        rol_sennova: 'Investigador Senior',
        sede: 'Sede Central'
      }
    ];

    render(
      <ProyectoEquipoTab
        proyecto={mockProyecto}
        teamMembers={team}
        usuarios={mockUsers}
        currentUser={mockCurrentUser}
        isOwnerOrAdmin={true}
        onAddMember={vi.fn()}
        onRemoveMember={vi.fn()}
        onNotify={vi.fn()}
      />
    );

    expect(screen.getByText('1 Miembro')).toBeInTheDocument();
    expect(screen.getByText('Carlos Rodríguez')).toBeInTheDocument();
    expect(screen.getByText('carlos@sena.edu.co')).toBeInTheDocument();
    expect(screen.getByText('Investigador Principal')).toBeInTheDocument();
    expect(screen.getByText('30h / sem')).toBeInTheDocument();
    expect(screen.getByLabelText(/Desvincular a Carlos Rodríguez/i)).toBeInTheDocument();
  });

  it('opens add researcher modal, filters users and calls onAddMember', async () => {
    const handleAddMember = vi.fn().mockResolvedValue(undefined);
    const handleNotify = vi.fn();

    render(
      <ProyectoEquipoTab
        proyecto={mockProyecto}
        teamMembers={[]}
        usuarios={mockUsers}
        currentUser={mockCurrentUser}
        isOwnerOrAdmin={true}
        onAddMember={handleAddMember}
        onRemoveMember={vi.fn()}
        onNotify={handleNotify}
      />
    );

    // Click on Vincular Investigador button
    const openAddBtn = screen.getByRole('button', { name: /Vincular Investigador/i });
    fireEvent.click(openAddBtn);

    // Modal should be open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('3 disponibles')).toBeInTheDocument();

    // Select Diana Morales
    const dianaOption = screen.getByText('Diana Morales');
    fireEvent.click(dianaOption);

    // Change role and hours
    const selectRole = screen.getByRole('combobox');
    fireEvent.change(selectRole, { target: { value: 'Coinvestigador' } });

    const hoursInput = screen.getByPlaceholderText('20');
    fireEvent.change(hoursInput, { target: { value: '25' } });

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /Vincular al Proyecto/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleAddMember).toHaveBeenCalledWith('u-2', 'Coinvestigador', 25);
    });
  });

  it('handles search filtering in the add researcher modal', () => {
    render(
      <ProyectoEquipoTab
        proyecto={mockProyecto}
        teamMembers={[]}
        usuarios={mockUsers}
        currentUser={mockCurrentUser}
        isOwnerOrAdmin={true}
        onAddMember={vi.fn()}
        onRemoveMember={vi.fn()}
        onNotify={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Vincular Investigador/i }));

    const searchInput = screen.getByPlaceholderText(/Buscar por nombre/i);
    fireEvent.change(searchInput, { target: { value: 'Andrés' } });

    expect(screen.getByText('Andrés Gómez')).toBeInTheDocument();
    expect(screen.queryByText('Diana Morales')).not.toBeInTheDocument();
  });

  it('handles remove researcher confirmation flow', async () => {
    const handleRemoveMember = vi.fn().mockResolvedValue(undefined);
    const team = [
      {
        id: 'u-1',
        nombre: 'Carlos Rodríguez',
        email: 'carlos@sena.edu.co',
        rol_en_proyecto: 'Investigador Principal',
        horas_dedicadas: 20
      }
    ];

    render(
      <ProyectoEquipoTab
        proyecto={mockProyecto}
        teamMembers={team}
        usuarios={mockUsers}
        currentUser={mockCurrentUser}
        isOwnerOrAdmin={true}
        onAddMember={vi.fn()}
        onRemoveMember={handleRemoveMember}
        onNotify={vi.fn()}
      />
    );

    const removeBtn = screen.getByLabelText(/Desvincular a Carlos Rodríguez/i);
    fireEvent.click(removeBtn);

    // Confirmation dialog appears
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText('¿Desvincular Investigador?')).toBeInTheDocument();

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: 'Desvincular' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(handleRemoveMember).toHaveBeenCalledWith('u-1');
    });
  });
});
