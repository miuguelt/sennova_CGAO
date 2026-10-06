import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SemillerosModule from '../components/seedbeds/SemillerosModule';

vi.mock('../api/semilleros', () => ({
  SemillerosAPI: {
    list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), getStats: vi.fn(),
    listAprendices: vi.fn(), addAprendiz: vi.fn(), deleteAprendiz: vi.fn(), addInvestigador: vi.fn(), removeInvestigador: vi.fn(),
  },
}));
vi.mock('../api/grupos', () => ({ GruposAPI: { list: vi.fn() } }));
vi.mock('../api/usuarios', () => ({ UsuariosAPI: { list: vi.fn(), get: vi.fn() } }));
vi.mock('../api/proyectos', () => ({ ProyectosAPI: { list: vi.fn(), update: vi.fn() } }));
vi.mock('../api/plantillas', () => ({ PlantillasAPI: { getDatosCertificado: vi.fn() } }));
vi.mock('../utils/pdfGenerator', () => ({ PDFGenerator: {
  generateCertificate: vi.fn(),
} }));
vi.mock('../components/users/UserInsightPanel', () => ({
  default: ({ user, isOpen, onClose }) => isOpen && user ? (
    <aside role="dialog" aria-label={`Perfil ${user.nombre}`}><span>{user.email}</span><button onClick={onClose}>Cerrar perfil</button></aside>
  ) : null,
}));
vi.mock('../components/ui/Drawer', () => ({
  default: ({ isOpen, title, tabs = [], activeTab, onTabChange, headerActions, children, footer, onClose }) => isOpen ? (
    <aside role="dialog" aria-label={title}>
      <h2>{title}</h2>{headerActions}
      <nav>{tabs.map(tab => <button key={tab.id} onClick={() => onTabChange(tab.id)}>{tab.label}</button>)}</nav>
      <div>{children}</div>{footer}<button onClick={onClose}>Cerrar cajón</button><span data-testid="active-tab">{activeTab}</span>
    </aside>
  ) : null,
}));
vi.mock('../components/ui/Modal', () => ({
  default: ({ isOpen, title, children, footer, onClose }) => isOpen ? (
    <section role="dialog" aria-label={title}><h2>{title}</h2>{children}{footer}<button onClick={onClose}>Cerrar modal</button></section>
  ) : null,
}));
vi.mock('../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, title, description, confirmText, onConfirm, onClose }) => isOpen ? (
    <section role="alertdialog" aria-label={title}><p>{description}</p><button onClick={onClose}>Cancelar confirmación</button><button onClick={onConfirm}>{confirmText}</button></section>
  ) : null,
}));

import { SemillerosAPI } from '../api/semilleros';
import { GruposAPI } from '../api/grupos';
import { UsuariosAPI } from '../api/usuarios';
import { ProyectosAPI } from '../api/proyectos';
import { PlantillasAPI } from '../api/plantillas';
import { PDFGenerator } from '../utils/pdfGenerator';

const semilleros = [
  { id: 's-1', nombre: 'Semillero AgroTech', sigla: 'AGRO', codigo: 'AGRO', estado: 'activo', linea_investigacion: 'Agroindustria', grupo_id: 'g-1', grupo_nombre: 'Grupo CGAO', descripcion: 'Investigación aplicada al agro.', horas_dedicadas: 6, total_aprendices: 4, total_investigadores: 2 },
  { id: 's-2', nombre: 'Semillero Digital', sigla: 'DIGI', estado: 'inactivo', linea_investigacion: 'Tecnología', descripcion: '', horas_dedicadas: 3, total_aprendices: 0, total_investigadores: 0 },
];
const aprendiz = { id: 'm-1', user_id: 'u-apr-1', nombre: 'Ana Aprendiz', email: 'ana@soy.sena.edu.co', rol: 'aprendiz', estado: 'activo', programa: 'ADSO', ficha: '123' };
const investigator = { id: 'u-inv-1', nombre: 'Lina Investigadora', email: 'lina@sena.edu.co', rol_en_semillero: 'Tutora' };
const members = [aprendiz, { ...aprendiz, id: 'm-2', user_id: 'u-apr-2', nombre: 'Luis Aprendiz', email: 'luis@soy.sena.edu.co' }];
const users = [
  { id: 'u-apr-1', nombre: 'Ana Aprendiz', email: 'ana@soy.sena.edu.co', rol: 'aprendiz' },
  { id: 'u-apr-2', nombre: 'Luis Aprendiz', email: 'luis@soy.sena.edu.co', rol: 'aprendiz' },
  { id: 'u-apr-3', nombre: 'Sara Aprendiz', email: 'sara@soy.sena.edu.co', rol: 'aprendiz' },
  { id: 'u-inv-1', nombre: 'Lina Investigadora', email: 'lina@sena.edu.co', rol: 'investigador' },
  { id: 'u-inv-2', nombre: 'Marta Investigadora', email: 'marta@sena.edu.co', rol: 'investigador' },
];
const projects = [
  { id: 'p-1', nombre: 'Proyecto AgroTech', nombre_corto: 'AgroTech', codigo_sgps: 'SGPS-01', semillero_id: 's-1', estado: 'En ejecución', presupuesto_total: 120000, avance_porcentaje: 55, entregables_aprobados: 2, total_entregables: 4, avance_documental: { porcentaje: 16, campos_completados: 2, campos_totales: 10, documentos_totales: 3, documentos_generados: 0, documentos_revisados: 0 } },
  { id: 'p-2', nombre: 'Proyecto Digital', codigo_sgps: 'SGPS-02', semillero_id: null, estado: 'Aprobado', presupuesto_total: 50000, avance_porcentaje: 0 },
];

function configureApi() {
  SemillerosAPI.list.mockResolvedValue(semilleros);
  SemillerosAPI.get.mockImplementation(async id => ({ ...semilleros.find(item => item.id === id), investigadores: [investigator] }));
  SemillerosAPI.create.mockResolvedValue({ id: 's-new' });
  SemillerosAPI.update.mockResolvedValue({});
  SemillerosAPI.delete.mockResolvedValue({});
  SemillerosAPI.getStats.mockResolvedValue({ impacto: [{ name: 'Proyectos', value: 3 }], evolucion: [{ mes: 'Ene', aprendices: 4 }] });
  SemillerosAPI.listAprendices.mockResolvedValue(members);
  SemillerosAPI.addAprendiz.mockResolvedValue({});
  SemillerosAPI.deleteAprendiz.mockResolvedValue({});
  SemillerosAPI.addInvestigador.mockResolvedValue({});
  SemillerosAPI.removeInvestigador.mockResolvedValue({});
  GruposAPI.list.mockResolvedValue([{ id: 'g-1', nombre: 'Grupo CGAO' }]);
  UsuariosAPI.list.mockResolvedValue(users);
  UsuariosAPI.get.mockResolvedValue(users[0]);
  ProyectosAPI.list.mockResolvedValue(projects);
  ProyectosAPI.update.mockResolvedValue({ id: 'p-2' });
  PlantillasAPI.getDatosCertificado.mockResolvedValue({ nombre: 'Ana Aprendiz' });
}

describe('gestión de semilleros por rol', () => {
  beforeEach(() => { vi.clearAllMocks(); configureApi(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('muestra el progreso de documentación del proyecto vinculado sin usar sus entregables', async () => {
    render(<SemillerosModule currentUser={{ id: 'admin', rol: 'admin' }} />);
    await screen.findByRole('heading', { name: 'Semilleros de Investigación' });
    fireEvent.click(screen.getByText('Semillero AgroTech'));
    const drawer = await screen.findByRole('dialog', { name: 'Semillero AgroTech' });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Proyectos' }));
    expect(within(drawer).getByRole('progressbar', { name: 'Avance documental del proyecto' })).toHaveAttribute('value', '16');
    expect(within(drawer).getByText('2 de 10 requisitos completos')).toBeVisible();
    expect(within(drawer).queryByText('55%')).not.toBeInTheDocument();
    expect(within(drawer).queryByText('2/4 entregables')).not.toBeInTheDocument();
  });

  it('no sustituye un resumen documental ausente con el avance técnico', async () => {
    ProyectosAPI.list.mockResolvedValue([{ ...projects[0], avance_documental: undefined }]);
    render(<SemillerosModule currentUser={{ id: 'admin', rol: 'admin' }} />);
    await screen.findByRole('heading', { name: 'Semilleros de Investigación' });
    fireEvent.click(screen.getByText('Semillero AgroTech'));
    const drawer = await screen.findByRole('dialog', { name: 'Semillero AgroTech' });
    fireEvent.click(within(drawer).getByRole('button', { name: 'Proyectos' }));
    expect(within(drawer).queryByRole('progressbar', { name: 'Avance documental del proyecto' })).not.toBeInTheDocument();
    expect(within(drawer).queryByText('55%')).not.toBeInTheDocument();
  });

  it('busca y filtra semilleros, y muestra el pool de grupos', async () => {
    render(<SemillerosModule currentUser={{ id: 'admin', rol: 'admin' }} />);
    expect(await screen.findByRole('heading', { name: 'Semilleros de Investigación' })).toBeVisible();
    expect(screen.getByText('Semillero AgroTech')).toBeVisible();
    expect(screen.getByText('Semillero Digital')).toBeVisible();

    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar semilleros' }), { target: { value: 'tecnología' } });
    expect(screen.getByText('Semillero Digital')).toBeVisible();
    expect(screen.queryByText('Semillero AgroTech')).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar semilleros' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Filtros Avanzados/ }));
    fireEvent.change(screen.getByLabelText('Estado'), { target: { value: 'inactivo' } });
    fireEvent.change(screen.getByLabelText('Línea de Investigación'), { target: { value: 'Tecnología' } });
    expect(screen.getByText('Semillero Digital')).toBeVisible();
    expect(screen.queryByText('Semillero AgroTech')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(screen.getByText('Semillero AgroTech')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Pool Grupos' }));
    expect(screen.getByText('Grupos de Investigación Disponibles')).toBeVisible();
    expect(screen.getByText('Grupo CGAO')).toBeVisible();
  });

  it('crea, edita y elimina semilleros', async () => {
    const onNotify = vi.fn();
    render(<SemillerosModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Semilleros de Investigación' });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Semillero' }));
    fireEvent.change(screen.getByLabelText(/Nombre del Semillero/), { target: { value: 'Semillero Nuevo' } });
    fireEvent.change(screen.getByLabelText('Código / Sigla'), { target: { value: 'NUEVO' } });
    fireEvent.change(screen.getByLabelText(/Grupo de Investigación/), { target: { value: 'g-1' } });
    fireEvent.change(screen.getAllByLabelText(/Línea de Investigación/).at(-1), { target: { value: 'Robótica Agrícola' } });
    fireEvent.change(screen.getByLabelText('Descripción del Semillero'), { target: { value: 'Innovación aplicada.' } });
    fireEvent.change(screen.getByLabelText('Horas de Dedicación'), { target: { value: '8' } });
    fireEvent.change(screen.getAllByLabelText('Estado').at(-1), { target: { value: 'activo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Semillero' }));
    await waitFor(() => expect(SemillerosAPI.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Semillero Nuevo', sigla: 'NUEVO', horas_dedicadas: 8, grupo_id: 'g-1' })));
    expect(onNotify).toHaveBeenCalledWith('Semillero creado con éxito', 'success');

    fireEvent.click(screen.getAllByTitle('Editar')[0]);
    fireEvent.change(screen.getByLabelText(/Nombre del Semillero/), { target: { value: 'Semillero AgroTech Actualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(SemillerosAPI.update).toHaveBeenCalledWith('s-1', expect.objectContaining({ nombre: 'Semillero AgroTech Actualizado' })));

    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Sí, Eliminar Semillero' }));
    await waitFor(() => expect(SemillerosAPI.delete).toHaveBeenCalledWith('s-1'));
    expect(onNotify).toHaveBeenCalledWith('Semillero eliminado', 'success');
  });

  it('muestra información, estadísticas, perfiles y certificados sin formatos ajenos al semillero', async () => {
    const onNotify = vi.fn();
    render(<SemillerosModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Semilleros de Investigación' });
    fireEvent.click(screen.getByText('Semillero AgroTech'));
    expect(await screen.findByRole('dialog', { name: 'Semillero AgroTech' })).toBeVisible();
    expect(screen.getAllByText('Investigación aplicada al agro.')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Impacto' }));
    expect(await screen.findByText('Logros del Semillero')).toBeVisible();
    expect(await screen.findByText(/2 aprendices vinculados/)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Información' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver Todos' }));
    expect(await screen.findByText('Ana Aprendiz')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Impacto' }));

    fireEvent.click(screen.getByRole('button', { name: 'Investigadores' }));
    expect(await screen.findByText('Lina Investigadora')).toBeVisible();
    fireEvent.click(screen.getByText('Lina Investigadora'));
    expect(screen.getByRole('dialog', { name: 'Perfil Lina Investigadora' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar perfil' }));
    fireEvent.click(screen.getByTitle('Desvincular'));
    const removeInvestigatorDialog = screen.getByRole('alertdialog', { name: '¿Desvincular Investigador?' });
    expect(removeInvestigatorDialog).toBeVisible();
    fireEvent.click(within(removeInvestigatorDialog).getByRole('button', { name: 'Cancelar confirmación' }));
    expect(screen.queryByRole('alertdialog', { name: '¿Desvincular Investigador?' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Desvincular'));
    fireEvent.click(within(screen.getByRole('alertdialog', { name: '¿Desvincular Investigador?' })).getByRole('button', { name: 'Desvincular' }));
    await waitFor(() => expect(SemillerosAPI.removeInvestigador).toHaveBeenCalledWith('s-1', 'u-inv-1'));

    fireEvent.click(screen.getByRole('button', { name: 'Aprendices' }));
    expect(await screen.findByText('Ana Aprendiz')).toBeVisible();
    fireEvent.click(screen.getByText('Ana Aprendiz'));
    expect(screen.getByRole('dialog', { name: 'Perfil Ana Aprendiz' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar perfil' }));
    fireEvent.click(screen.getAllByTitle('Generar Certificado')[0]);
    await waitFor(() => expect(PlantillasAPI.getDatosCertificado).toHaveBeenCalledWith('s-1', 'm-1'));
    expect(PDFGenerator.generateCertificate).toHaveBeenCalledWith({ nombre: 'Ana Aprendiz' });

    fireEvent.click(screen.getAllByTitle('Desvincular')[0]);
    fireEvent.click(within(screen.getByRole('alertdialog', { name: '¿Desvincular Aprendiz?' })).getByRole('button', { name: 'Desvincular' }));
    await waitFor(() => expect(SemillerosAPI.deleteAprendiz).toHaveBeenCalledWith('s-1', 'm-1'));

    expect(screen.queryByRole('button', { name: 'Formatos' })).not.toBeInTheDocument();
    expect(screen.queryByText(/etapa productiva|bitácora/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar Panel' }));
    expect(onNotify).toHaveBeenCalledWith('Certificado generado y descargado', 'success');
  });

  it('vincula y mueve proyectos, y confirma su desvinculación', async () => {
    const onNotify = vi.fn();
    render(<SemillerosModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Semilleros de Investigación' });
    fireEvent.click(screen.getByText('Semillero AgroTech'));
    await screen.findByRole('dialog', { name: 'Semillero AgroTech' });
    fireEvent.click(screen.getByRole('button', { name: 'Proyectos' }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'p-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vincular al Semillero' }));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p-2', { semillero_id: 's-1' }));

    fireEvent.click(screen.getByTitle('Mover proyecto a otro semillero'));
    expect(screen.getByRole('dialog', { name: 'Mover Proyecto a Semillero' })).toBeVisible();
    fireEvent.change(screen.getByLabelText('Semillero de Destino'), { target: { value: 's-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Traslado' }));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenLastCalledWith('p-1', { semillero_id: 's-2' }));
    expect(onNotify).toHaveBeenCalledWith('Proyecto movido a "Semillero Digital" correctamente', 'success');

    fireEvent.click(screen.getByTitle('Desvincular del semillero'));
    expect(screen.getByRole('alertdialog', { name: '¿Desvincular Proyecto del Semillero?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar confirmación' }));
    expect(screen.queryByRole('alertdialog', { name: '¿Desvincular Proyecto del Semillero?' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Desvincular del semillero'));
    fireEvent.click(screen.getByRole('button', { name: 'Desvincular Proyecto' }));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenLastCalledWith('p-1', { semillero_id: null }));
    expect(onNotify).toHaveBeenCalledWith('Proyecto "AgroTech" desvinculado del semillero', 'success');
  });

  it('ofrece acciones separadas y vincula aprendices e investigadores desde la tarjeta', async () => {
    render(<SemillerosModule currentUser={{ id: 'admin', rol: 'admin' }} />);
    await screen.findByRole('heading', { name: 'Semilleros de Investigación' });

    fireEvent.click(screen.getByRole('button', { name: 'Vincular aprendiz a Semillero AgroTech' }));
    expect(await screen.findByRole('dialog', { name: 'Semillero AgroTech' })).toBeVisible();
    expect(screen.getByTestId('active-tab')).toHaveTextContent('aprendices');
    const apprenticeDirectory = screen.getByLabelText('Directorio de aprendices disponibles');
    expect(within(apprenticeDirectory).getByRole('option', { name: 'Sara Aprendiz' })).toBeInTheDocument();
    expect(within(apprenticeDirectory).queryByRole('option', { name: 'Marta Investigadora' })).not.toBeInTheDocument();
    fireEvent.change(apprenticeDirectory, { target: { value: 'u-apr-3' } });
    await waitFor(() => expect(SemillerosAPI.addAprendiz).toHaveBeenCalledWith('s-1', { user_id: 'u-apr-3', estado: 'activo' }));

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar Panel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vincular investigador a Semillero AgroTech' }));
    expect(await screen.findByRole('dialog', { name: 'Semillero AgroTech' })).toBeVisible();
    expect(screen.getByTestId('active-tab')).toHaveTextContent('investigadores');
    const investigatorDirectory = screen.getByLabelText('Directorio de investigadores disponibles');
    expect(within(investigatorDirectory).getByRole('option', { name: 'Marta Investigadora' })).toBeInTheDocument();
    expect(within(investigatorDirectory).queryByRole('option', { name: 'Sara Aprendiz' })).not.toBeInTheDocument();
    fireEvent.change(investigatorDirectory, { target: { value: 'u-inv-2' } });
    await waitFor(() => expect(SemillerosAPI.addInvestigador).toHaveBeenCalledWith('s-1', { user_id: 'u-inv-2', rol_en_semillero: 'Coinvestigador' }));
  });

  it('informa cuando ya no hay investigadores disponibles para vincular', async () => {
    UsuariosAPI.list.mockResolvedValue([users.find(user => user.id === 'u-inv-1')]);
    render(<SemillerosModule currentUser={{ id: 'admin', rol: 'admin' }} />);
    await screen.findByRole('heading', { name: 'Semilleros de Investigación' });
    fireEvent.click(screen.getByRole('button', { name: 'Vincular investigador a Semillero AgroTech' }));

    const investigatorDirectory = await screen.findByLabelText('Directorio de investigadores disponibles');
    expect(within(investigatorDirectory).getByRole('option', { name: 'No hay investigadores disponibles' })).toBeDisabled();
  });

  it('no permite vincular integrantes desde un semillero que pertenece a otra persona', async () => {
    render(<SemillerosModule currentUser={{ id: 'u-inv-1', rol: 'investigador' }} />);
    await screen.findByRole('heading', { name: 'Semilleros de Investigación' });
    expect(screen.queryByRole('button', { name: 'Vincular investigador a Semillero AgroTech' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Semillero AgroTech'));
    await screen.findByRole('dialog', { name: 'Semillero AgroTech' });
    fireEvent.click(screen.getByRole('button', { name: 'Investigadores' }));
    expect(await screen.findByText('Lina Investigadora')).toBeVisible();
    expect(screen.queryByLabelText('Directorio de investigadores disponibles')).not.toBeInTheDocument();
  });

  it('permite al propietario del semillero vincular investigadores', async () => {
    SemillerosAPI.list.mockResolvedValue(semilleros.map(item => (
      item.id === 's-1' ? { ...item, owner_id: 'u-inv-1' } : item
    )));
    render(<SemillerosModule currentUser={{ id: 'u-inv-1', rol: 'investigador' }} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Vincular investigador a Semillero AgroTech' }));
    const investigatorDirectory = await screen.findByLabelText('Directorio de investigadores disponibles');
    fireEvent.change(investigatorDirectory, { target: { value: 'u-inv-2' } });
    await waitFor(() => expect(SemillerosAPI.addInvestigador).toHaveBeenCalledWith('s-1', { user_id: 'u-inv-2', rol_en_semillero: 'Coinvestigador' }));
  });

  it('limita el directorio del aprendiz a su semillero y bloquea acciones administrativas', async () => {
    const handled = vi.fn();
    render(<SemillerosModule currentUser={{ id: 'u-apr-1', rol: 'aprendiz' }} initialAction={{ form: 'create' }} onActionHandled={handled} />);
    await screen.findByRole('heading', { name: 'Semilleros de Investigación' });
    expect(handled).toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Crear Semillero' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pool Grupos' })).not.toBeInTheDocument();
    expect(GruposAPI.list).not.toHaveBeenCalled();
    expect(UsuariosAPI.list).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar modal' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver Información' })[0]);
    await screen.findByRole('dialog', { name: 'Semillero AgroTech' });
    fireEvent.click(screen.getByRole('button', { name: 'Aprendices' }));
    expect(await screen.findByText('Ana Aprendiz')).toBeVisible();
    expect(screen.queryByText('Luis Aprendiz')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Desvincular')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ver Todos' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Generar Certificado'));
    await waitFor(() => expect(PlantillasAPI.getDatosCertificado).toHaveBeenCalledWith('s-1', 'm-1'));
    expect(screen.queryByRole('dialog', { name: 'Perfil Ana Aprendiz' })).not.toBeInTheDocument();
  });

  it('carga una semilla dirigida por id aunque todavía no aparezca en el catálogo', async () => {
    const onActionHandled = vi.fn();
    SemillerosAPI.list.mockResolvedValue([]);
    SemillerosAPI.get.mockResolvedValueOnce({ ...semilleros[0], investigadores: [investigator] });
    render(<SemillerosModule currentUser={{ id: 'admin', rol: 'admin' }} initialAction={{ form: 'view', data: { id: 's-1' } }} onActionHandled={onActionHandled} />);
    expect(await screen.findByRole('dialog', { name: 'Semillero AgroTech' })).toBeVisible();
    expect(SemillerosAPI.get).toHaveBeenCalledWith('s-1');
    expect(onActionHandled).toHaveBeenCalled();
  });

  it('abre un semillero ya listado por acción inicial y tolera que el detalle remoto falle', async () => {
    const onActionHandled = vi.fn();
    const { unmount } = render(
      <SemillerosModule
        currentUser={{ id: 'admin', rol: 'admin' }}
        initialAction={{ form: 'view', data: { id: 's-1' } }}
        onActionHandled={onActionHandled}
      />,
    );

    expect(await screen.findByRole('dialog', { name: 'Semillero AgroTech' })).toBeVisible();
    await waitFor(() => expect(onActionHandled).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar cajón' }));
    expect(screen.queryByRole('dialog', { name: 'Semillero AgroTech' })).not.toBeInTheDocument();
    unmount();

    SemillerosAPI.list.mockResolvedValue([]);
    SemillerosAPI.get.mockRejectedValue(new Error('No encontrado'));
    render(
      <SemillerosModule
        currentUser={{ id: 'admin', rol: 'admin' }}
        initialAction={{ form: 'view', data: { id: 's-missing' } }}
        onActionHandled={vi.fn()}
      />,
    );

    await waitFor(() => expect(SemillerosAPI.get).toHaveBeenCalledWith('s-missing'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('actualiza el semillero seleccionado desde su panel y conserva el cambio visible', async () => {
    const onNotify = vi.fn();
    let savedName = '';
    SemillerosAPI.update.mockImplementation(async (_id, payload) => { savedName = payload.nombre; });
    SemillerosAPI.list.mockImplementation(async () => semilleros.map(item => (
      item.id === 's-1' && savedName ? { ...item, nombre: savedName } : item
    )));
    render(<SemillerosModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Semilleros de Investigación' });
    fireEvent.click(screen.getByText('Semillero AgroTech'));
    await screen.findByRole('dialog', { name: 'Semillero AgroTech' });
    fireEvent.click(screen.getByTitle('Editar Semillero'));
    fireEvent.change(screen.getByLabelText(/Nombre del Semillero/), { target: { value: 'AgroTech actualizado desde detalle' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

    await waitFor(() => expect(SemillerosAPI.update).toHaveBeenCalledWith('s-1', expect.objectContaining({ nombre: 'AgroTech actualizado desde detalle' })));
    expect(await screen.findByRole('dialog', { name: 'AgroTech actualizado desde detalle' })).toBeVisible();
    expect(onNotify).toHaveBeenCalledWith('Semillero actualizado', 'success');
  });

  it('usa listas vacías cuando fallan los servicios de estadísticas y de integrantes', async () => {
    SemillerosAPI.getStats.mockRejectedValue(new Error('Sin estadísticas'));
    SemillerosAPI.listAprendices.mockRejectedValue(new Error('Sin integrantes'));
    SemillerosAPI.get.mockRejectedValue(new Error('Sin datos extendidos'));
    render(<SemillerosModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Semilleros de Investigación' });
    fireEvent.click(screen.getByText('Semillero AgroTech'));
    await screen.findByRole('dialog', { name: 'Semillero AgroTech' });

    fireEvent.click(screen.getByRole('button', { name: 'Impacto' }));
    expect(await screen.findByText('Logros del Semillero')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Aprendices' }));
    expect(await screen.findByText('Vincular aprendiz existente')).toBeVisible();
    expect(screen.queryByTitle('Desvincular')).not.toBeInTheDocument();
  });

  it('permite arrastrar grupos, proyectos e integrantes hacia sus semilleros', async () => {
    const onNotify = vi.fn();
    render(<SemillerosModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Semilleros de Investigación' });

    fireEvent.click(screen.getByRole('button', { name: 'Pool Grupos' }));
    const groupItem = screen.getByText('Grupo CGAO').closest('[draggable="true"]');
    const groupTransfer = { setData: vi.fn(), types: ['grupoId'], getData: vi.fn(type => type === 'grupoId' ? 'g-1' : '') };
    fireEvent.dragStart(groupItem, { dataTransfer: groupTransfer });
    expect(groupTransfer.setData).toHaveBeenCalledWith('grupoId', 'g-1');
    const semilleroCard = screen.getByText('Semillero AgroTech').closest('[class*="rounded-[2rem]"]');
    fireEvent.dragOver(semilleroCard, { dataTransfer: groupTransfer });
    expect(screen.getByText('Soltar para vincular al Semillero')).toBeVisible();
    fireEvent.dragLeave(semilleroCard);
    fireEvent.drop(semilleroCard, { dataTransfer: groupTransfer });
    await waitFor(() => expect(SemillerosAPI.update).toHaveBeenCalledWith('s-1', expect.objectContaining({ grupo_id: 'g-1' })));
    expect(onNotify).toHaveBeenCalledWith('Grupo vinculado al semillero', 'success');

    fireEvent.click(screen.getByText('Semillero AgroTech'));
    await screen.findByRole('dialog', { name: 'Semillero AgroTech' });
    fireEvent.click(screen.getByRole('button', { name: 'Aprendices' }));
    const memberDrop = screen.getByText('Vincular aprendiz existente').closest('div[class*="border-dashed"]');
    const memberTransfer = { types: ['userId'], getData: vi.fn(type => type === 'userId' ? 'u-apr-3' : '') };
    fireEvent.dragOver(memberDrop, { dataTransfer: memberTransfer });
    fireEvent.dragLeave(memberDrop);
    fireEvent.drop(memberDrop, { dataTransfer: memberTransfer });
    await waitFor(() => expect(SemillerosAPI.addAprendiz).toHaveBeenCalledWith('s-1', { user_id: 'u-apr-3', semillero_id: 's-1', estado: 'activo' }));

    fireEvent.click(screen.getByRole('button', { name: 'Proyectos' }));
    const projectDrop = screen.getByText(/Vincular \/ Mover Proyecto a este Semillero/).closest('div[class*="border-dashed"]');
    const projectTransfer = { types: ['projectId'], getData: vi.fn(type => type === 'projectId' ? 'p-2' : '') };
    fireEvent.dragOver(projectDrop, { dataTransfer: projectTransfer });
    fireEvent.dragLeave(projectDrop);
    fireEvent.drop(projectDrop, { dataTransfer: projectTransfer });
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p-2', { semillero_id: 's-1' }));
    expect(onNotify).toHaveBeenCalledWith('Proyecto vinculado al semillero "Semillero AgroTech" correctamente', 'success');
  });

  it('permite cerrar confirmaciones y cancelar la edición del semillero', async () => {
    render(<SemillerosModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={vi.fn()} />);
    await screen.findByRole('heading', { name: 'Semilleros de Investigación' });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Semillero' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Nuevo Semillero de Investigación' })).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    const confirmation = screen.getByRole('alertdialog', { name: '¿Eliminar Semillero?' });
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancelar confirmación' }));
    expect(screen.queryByRole('alertdialog', { name: '¿Eliminar Semillero?' })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByTitle('Eliminar')[0]);
    fireEvent.click(screen.getByRole('button', { name: 'Sí, Eliminar Semillero' }));
    await waitFor(() => expect(SemillerosAPI.delete).toHaveBeenCalledWith('s-1'));
  });
});
