import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProjectGeneralData from '../components/projects/ProjectGeneralData';
import ProjectFormulationStep from '../components/projects/ProjectFormulationStep';

const defaults = { centro: 'CGAO - Subsede Vélez', regional: 'Santander', ciudad: 'Vélez', responsable: 'Investigadora asignada' };

describe('Datos generales del proyecto', () => {
  it('integra la precarga en la etapa institucional y conserva el guardado habitual', () => {
    const onChange = vi.fn();
    const onSave = vi.fn();
    render(<ProjectFormulationStep projectId="p1" step={{ id: 'institucional', fuente: 'comunes', titulo: 'Datos institucionales y equipo', campos: Object.keys(defaults) }}
      commonFields={Object.keys(defaults).map(key => ({ key, label: key, type: 'text' }))} commonValues={{ centro: 'Centro confirmado' }}
      generalData={defaults} canEdit dirty onCommonChange={onChange} onSaveCommon={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: 'Completar campos vacíos' }));
    expect(onChange.mock.calls).toEqual([['regional', 'Santander'], ['ciudad', 'Vélez'], ['responsable', 'Investigadora asignada']]);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar datos institucionales' }));
    expect(onSave).toHaveBeenCalledOnce();
  });
  it('completa únicamente los campos vacíos y comunica que falta guardar', () => {
    const onChange = vi.fn();
    function Form() {
      const [values, setValues] = useState({ centro: 'Centro confirmado', ciudad: '   ', responsable: 'Responsable confirmado', codigo_cap: 'CAP-14', fecha_inicio: '2026-05-29' });
      return <ProjectGeneralData defaults={defaults} values={values} canEdit onChange={(field, value) => {
        onChange(field, value);
        setValues(previous => ({ ...previous, [field]: value }));
      }} />;
    }
    render(<Form />);
    expect(screen.getByText(/Los nuevos proyectos incluyen/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Completar campos vacíos' }));
    expect(onChange.mock.calls).toEqual([['regional', 'Santander'], ['ciudad', 'Vélez']]);
    expect(screen.getByRole('status')).toHaveTextContent(/2 campos completados.*Guarda los datos institucionales/i);
    expect(screen.getByRole('button', { name: 'Completar campos vacíos' })).toBeDisabled();
    expect(screen.getByText('Centro confirmado')).toBeInTheDocument();
    expect(screen.getByText('Responsable confirmado')).toBeInTheDocument();
  });

  it('muestra los datos en consulta sin permitir modificaciones', () => {
    render(<ProjectGeneralData defaults={defaults} values={{}} canEdit={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Vélez')).toBeInTheDocument();
    expect(screen.getByText(/Revisa las fechas y el código CAP/i)).toBeInTheDocument();
  });

  it('desactiva la acción durante una operación y cuando ya están completos', () => {
    const { rerender } = render(<ProjectGeneralData defaults={defaults} values={{}} canEdit busy />);
    expect(screen.getByRole('button')).toBeDisabled();
    rerender(<ProjectGeneralData defaults={defaults} values={defaults} canEdit />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('omite el panel si no hay datos iniciales y descarta campos ajenos al contrato', () => {
    const { rerender, container } = render(<ProjectGeneralData canEdit />);
    expect(container).toBeEmptyDOMElement();
    const onChange = vi.fn();
    rerender(<ProjectGeneralData defaults={{ regional: 'Santander', ciudad: '', fecha_inicio: '2026-01-01', responsable: null }} values={{}} canEdit onChange={onChange} />);
    expect(screen.queryByText('2026-01-01')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledExactlyOnceWith('regional', 'Santander');
    expect(screen.getByRole('status')).toHaveTextContent('1 campo completado.');
  });
});
