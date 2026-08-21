import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import ScrollableTabs from '../components/ui/ScrollableTabs';
import { Info, BarChart3, Users, GraduationCap, Target, FileText } from 'lucide-react';

describe('ScrollableTabs', () => {
  const sampleTabs = [
    { id: 'info', label: 'Información', icon: Info },
    { id: 'stats', label: 'Impacto', icon: BarChart3 },
    { id: 'investigadores', label: 'Investigadores', icon: Users, count: 3 },
    { id: 'aprendices', label: 'Aprendices', icon: GraduationCap, count: 5 },
    { id: 'proyectos', label: 'Proyectos', icon: Target, count: 2 },
    { id: 'formatos', label: 'Formatos', icon: FileText }
  ];

  it('renders all tab options correctly with labels and counts', () => {
    render(
      <ScrollableTabs
        tabs={sampleTabs}
        activeTab="info"
        onTabChange={() => {}}
      />
    );

    expect(screen.getByText('Información')).toBeInTheDocument();
    expect(screen.getByText('Impacto')).toBeInTheDocument();
    expect(screen.getByText('Investigadores')).toBeInTheDocument();
    expect(screen.getByText('Aprendices')).toBeInTheDocument();
    expect(screen.getByText('Proyectos')).toBeInTheDocument();
    expect(screen.getByText('Formatos')).toBeInTheDocument();

    // Check count badges
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('calls onTabChange when a tab is clicked', () => {
    const handleTabChange = vi.fn();
    render(
      <ScrollableTabs
        tabs={sampleTabs}
        activeTab="info"
        onTabChange={handleTabChange}
      />
    );

    fireEvent.click(screen.getByText('Proyectos'));
    expect(handleTabChange).toHaveBeenCalledWith('proyectos');

    fireEvent.click(screen.getByText('Formatos'));
    expect(handleTabChange).toHaveBeenCalledWith('formatos');
  });

  it('marks active tab with aria-selected="true"', () => {
    render(
      <ScrollableTabs
        tabs={sampleTabs}
        activeTab="aprendices"
        onTabChange={() => {}}
      />
    );

    const activeBtn = screen.getByRole('tab', { name: /Aprendices/i });
    expect(activeBtn).toHaveAttribute('aria-selected', 'true');

    const inactiveBtn = screen.getByRole('tab', { name: /Información/i });
    expect(inactiveBtn).toHaveAttribute('aria-selected', 'false');
  });

  it('renders null when tabs array is empty', () => {
    const { container } = render(
      <ScrollableTabs
        tabs={[]}
        activeTab="none"
        onTabChange={() => {}}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
