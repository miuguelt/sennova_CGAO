import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ProyectoEquipoTab from '../components/projects/ProyectoEquipoTab';

const project = { id: 'project-1', nombre: 'Proyecto de prueba' };

describe('ProyectoEquipoTab, cierres y cancelaciones', () => {
  it('permite abrir y cerrar la vinculación desde el estado vacío', () => {
    render(
      <ProyectoEquipoTab
        proyecto={project}
        teamMembers={[]}
        usuarios={[
          { id: 'u-1', nombre: 'Ana Pérez', email: 'ana@sena.edu.co' },
          { id: 'u-2', nombre: 'Bruno Díaz', email: 'bruno@sena.edu.co' },
        ]}
        currentUser={{ id: 'admin-1', rol: 'admin' }}
        isOwnerOrAdmin
        onAddMember={vi.fn()}
        onRemoveMember={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Vincular Primer Investigador/i }));
    expect(screen.getByRole('dialog')).toHaveTextContent('2 disponibles');
    const search = screen.getByPlaceholderText('Buscar por nombre, correo o rol...');
    fireEvent.change(search, { target: { value: 'Ana' } });
    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.queryByText('Bruno Díaz')).not.toBeInTheDocument();
    fireEvent.click(search.parentElement.querySelector('button'));
    expect(search).toHaveValue('');
    expect(screen.getByText('Bruno Díaz')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar ventana' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('cancela la desvinculación y conserva el integrante', () => {
    const onRemoveMember = vi.fn();
    const member = {
      id: 'u-1', nombre: 'Ana Pérez', email: 'ana@sena.edu.co',
      rol_en_proyecto: 'Investigadora Principal', horas_dedicadas: 20,
    };
    render(
      <ProyectoEquipoTab
        proyecto={project}
        teamMembers={[member]}
        usuarios={[member]}
        currentUser={{ id: 'admin-1', rol: 'admin' }}
        isOwnerOrAdmin
        onAddMember={vi.fn()}
        onRemoveMember={onRemoveMember}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Desvincular a Ana Pérez' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByText('Ana Pérez')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(onRemoveMember).not.toHaveBeenCalled();
  });
});
