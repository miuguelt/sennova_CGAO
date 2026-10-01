import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import GrupoModule from '../components/groups/GrupoModule';
import GruposModule from '../components/groups/GruposModule';

vi.mock('recharts', () => {
  const Box = ({ children }) => <div>{children}</div>;
  return { BarChart: Box, Bar: Box, XAxis: () => null, YAxis: () => null, CartesianGrid: () => null,
    Tooltip: () => null, ResponsiveContainer: Box, Cell: () => null, PieChart: Box, Pie: Box };
});
vi.mock('../api/grupos', () => ({ GruposAPI: {
  list: vi.fn(), getStats: vi.fn(), getProyectos: vi.fn(), update: vi.fn(), uploadPlanOperativo: vi.fn(),
  getConsolidadoReporteUrl: vi.fn(() => '/reportes/grupos.xlsx'), downloadPlanOperativoUrl: vi.fn(() => '/plan.pdf'),
  create: vi.fn(), delete: vi.fn(), getMembers: vi.fn(), addMember: vi.fn(), removeMember: vi.fn(),
} }));
vi.mock('../api/semilleros', () => ({ SemillerosAPI: {
  list: vi.fn(), listAprendices: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), addAprendiz: vi.fn(), deleteAprendiz: vi.fn(),
} }));
vi.mock('../api/usuarios', () => ({ UsuariosAPI: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn() } }));
vi.mock('../api/proyectos', () => ({ ProyectosAPI: { list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), addEquipo: vi.fn(), removeEquipo: vi.fn() } }));
vi.mock('../api/productos', () => ({ ProductosAPI: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() } }));
vi.mock('../api/aprendices', () => ({ AprendicesAPI: { list: vi.fn() } }));
vi.mock('../api/plantillas', () => ({ PlantillasAPI: { getReportePresupuesto: vi.fn(), getDatosCertificado: vi.fn() } }));
vi.mock('../api/reportes', () => ({ ReportesAPI: { descargarConsolidadoGrupos: vi.fn() } }));
vi.mock('../utils/pdfGenerator', () => ({ PDFGenerator: {
  generateEtapaProductiva: vi.fn(), generateSeguimiento: vi.fn(), generateInformeFinal: vi.fn(),
  generateBudgetReport: vi.fn(), generateProjectPDF: vi.fn(), generateCertificate: vi.fn(),
} }));
vi.mock('../components/projects/MoverProyectoSemilleroModal', () => ({ default: ({ isOpen, onClose, onSuccess, proyecto }) => (
  isOpen ? (
    <div role="dialog" aria-label="Mover Proyecto a Semillero">
      <p>{proyecto?.nombre}</p>
      <button onClick={onClose}>Cancelar movimiento</button>
      <button onClick={() => {
        onSuccess({ id: proyecto?.id, semillero_id: 's-2', semillero_nombre: 'Semillero de destino' });
        onClose();
      }}>Confirmar Traslado</button>
    </div>
  ) : null
)}));
vi.mock('../components/users/UserInsightPanel', () => ({ default: ({ user, isOpen, onClose }) => (
  user && isOpen ? <section role="dialog" aria-label="Resumen 360"><h2>Resumen 360</h2><p>{user.nombre}</p><p>{user.email}</p><button onClick={onClose}>Cerrar resumen</button></section> : null
) }));

import { GruposAPI } from '../api/grupos';
import { SemillerosAPI } from '../api/semilleros';
import { UsuariosAPI } from '../api/usuarios';
import { ProyectosAPI } from '../api/proyectos';
import { ProductosAPI } from '../api/productos';
import { AprendicesAPI } from '../api/aprendices';
import { PlantillasAPI } from '../api/plantillas';
import { ReportesAPI } from '../api/reportes';
import { PDFGenerator } from '../utils/pdfGenerator';

const grupo = {
  id: 'g-1', owner_id: 'u-owner', nombre: 'GIDTA', nombre_completo: 'Grupo de Innovación del CGAO',
  codigo_gruplac: 'COL000123', clasificacion: 'A', director_nombre: 'Marta Líder', director_email: 'marta@sena.edu.co',
  lineas_investigacion: ['Agroindustria', 'Desarrollo de Software'],
};
const semillero = {
  id: 's-1', owner_id: 'u-owner', nombre: 'Semillero Agro', sigla: 'SA', codigo: 'SA-01',
  linea_investigacion: 'Agroindustria', estado: 'activo', lider_nombre: 'Marta Líder', total_aprendices: 1,
};
const proyecto = {
  id: 'p-1', owner_id: 'u-owner', nombre: 'Proyecto de Pectina', nombre_corto: 'Pectina', codigo_sgps: 'SGPS-01',
  estado: 'En ejecución', presupuesto_total: 1200000, avance_porcentaje: 70, linea_investigacion: 'Agroindustria',
  semillero_id: 's-1', semillero_nombre: 'Semillero Agro', equipo: [{ id: 'u-owner', nombre: 'Marta Líder', rol_en_proyecto: 'Líder', horas_dedicadas: 20 }],
};
const aprendiz = { id: 'a-1', user_id: 'a-1', nombre: 'Ana Aprendiz', documento: '1001', ficha: 'ADSO-01', programa: 'ADSO', semillero_id: 's-1', estado: 'activo' };

function configureApis() {
  GruposAPI.list.mockResolvedValue([grupo]);
  GruposAPI.getStats.mockResolvedValue({ total_productos: 1, total_proyectos: 1, total_aprendices: 1, avance_promedio: 70, presupuesto_total: 1200000, presupuesto_ejecutado: 400000, produccion: [{ name: 'Artículos', value: 1 }] });
  GruposAPI.getProyectos.mockResolvedValue([proyecto]);
  GruposAPI.update.mockResolvedValue({});
  GruposAPI.uploadPlanOperativo.mockResolvedValue({ ok: true });
  GruposAPI.getMembers.mockResolvedValue([{ id: 'u-owner', nombre: 'Marta Líder', email: 'marta@sena.edu.co', rol_en_grupo: 'Líder' }]);
  GruposAPI.create.mockResolvedValue({ id: 'g-2' });
  GruposAPI.delete.mockResolvedValue({});
  GruposAPI.addMember.mockResolvedValue({});
  GruposAPI.removeMember.mockResolvedValue({});
  SemillerosAPI.list.mockResolvedValue([semillero]);
  SemillerosAPI.listAprendices.mockResolvedValue([aprendiz]);
  SemillerosAPI.create.mockResolvedValue({ id: 's-2' });
  SemillerosAPI.update.mockResolvedValue({});
  SemillerosAPI.delete.mockResolvedValue({});
  SemillerosAPI.addAprendiz.mockResolvedValue({});
  SemillerosAPI.deleteAprendiz.mockResolvedValue({});
  UsuariosAPI.list.mockResolvedValue([
    { id: 'u-owner', nombre: 'Marta Líder', email: 'marta@sena.edu.co', rol: 'investigador', rol_sennova: 'Investigador Principal' },
    { id: 'u-admin', nombre: 'Admin CGAO', email: 'admin@sena.edu.co', rol: 'admin' },
    { id: 'a-1', nombre: 'Ana Aprendiz', email: 'ana@soy.sena.edu.co', rol: 'aprendiz', ficha: 'ADSO-01' },
  ]);
  UsuariosAPI.get.mockResolvedValue({ id: 'a-1', nombre: 'Ana Aprendiz', email: 'ana@soy.sena.edu.co' });
  UsuariosAPI.create.mockResolvedValue({ id: 'u-new' });
  UsuariosAPI.update.mockResolvedValue({});
  ProyectosAPI.list.mockResolvedValue([proyecto]);
  ProyectosAPI.get.mockResolvedValue(proyecto);
  ProyectosAPI.create.mockResolvedValue({ id: 'p-2' });
  ProyectosAPI.update.mockResolvedValue({});
  ProyectosAPI.delete.mockResolvedValue({});
  ProyectosAPI.addEquipo.mockResolvedValue({});
  ProyectosAPI.removeEquipo.mockResolvedValue({});
  ProductosAPI.list.mockResolvedValue([{ id: 'prod-1', titulo: 'Artículo Agro', tipologia: 'Artículo Científico', autores: 'Ana' }]);
  ProductosAPI.create.mockResolvedValue({ id: 'prod-2' });
  ProductosAPI.update.mockResolvedValue({});
  ProductosAPI.delete.mockResolvedValue({});
  AprendicesAPI.list.mockResolvedValue([aprendiz]);
  PlantillasAPI.getReportePresupuesto.mockResolvedValue({ proyecto, rubros: [] });
  PlantillasAPI.getDatosCertificado.mockResolvedValue({});
}

const admin = { id: 'u-admin', rol: 'admin', nombre: 'Admin CGAO' };

describe('comportamientos pendientes de los módulos de grupos', () => {
  beforeEach(() => { vi.clearAllMocks(); configureApis(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('aplica la acción inicial de abrir una pestaña y carga el directorio filtrado', async () => {
    const handled = vi.fn();
    render(<GrupoModule currentUser={admin} initialAction={{ form: 'view', data: { tab: 'semilleros' } }} onActionHandled={handled} />);
    expect(await screen.findByText('Semilleros de Investigación Adscritos')).toBeVisible();
    expect(handled).toHaveBeenCalledOnce();

    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre, sigla o tutor/i), { target: { value: 'Marta' } });
    expect(screen.getByText('Semillero Agro')).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre, sigla o tutor/i), { target: { value: 'sin coincidencias' } });
    expect(screen.getByText('0 de 1 semilleros')).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre, sigla o tutor/i), { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'Desarrollo de Software' } });
    expect(screen.getByText('0 de 1 semilleros')).toBeVisible();
  });

  it('usa datos alternos del aprendiz cuando falla su consulta de perfil desde el semillero', async () => {
    const personaSinUsuario = { ...aprendiz, id: 'a-externo', user_id: 'a-externo', nombre: 'Aprendiz sin cuenta' };
    SemillerosAPI.listAprendices.mockResolvedValue([personaSinUsuario]);
    AprendicesAPI.list.mockResolvedValue([]);
    UsuariosAPI.get.mockRejectedValue(new Error('Perfil no disponible'));
    render(<GrupoModule currentUser={admin} onNotify={vi.fn()} />);
    await screen.findByText('GIDTA');
    fireEvent.click(document.getElementById('tab-semilleros'));
    fireEvent.click(screen.getByText('Semillero Agro'));
    fireEvent.click(await screen.findByRole('tab', { name: /Aprendices Vinculados/i }));
    fireEvent.click((await screen.findAllByText('Aprendiz sin cuenta'))[0].closest('.cursor-pointer'));
    const insight = await screen.findByRole('dialog', { name: 'Resumen 360' });
    expect(insight).toBeVisible();
    expect(within(insight).getByText('Aprendiz sin cuenta')).toBeVisible();
    expect(within(insight).getByText('aprendiz.sin.cuenta@soy.sena.edu.co')).toBeVisible();
  });

  it('permite vincular al primer aprendiz cuando el semillero está vacío', async () => {
    SemillerosAPI.listAprendices.mockResolvedValue([]);
    render(<GrupoModule currentUser={admin} onNotify={vi.fn()} />);
    await screen.findByText('GIDTA');
    fireEvent.click(document.getElementById('tab-semilleros'));
    fireEvent.click(screen.getByText('Semillero Agro').closest('.cursor-pointer'));
    const drawer = await screen.findByRole('dialog', { name: 'Semillero Agro' });
    fireEvent.click(within(drawer).getByRole('tab', { name: /Aprendices Vinculados/i }));
    expect(within(drawer).getByText('Sin aprendices vinculados a este semillero actualmente.')).toBeVisible();
    fireEvent.click(within(drawer).getByRole('button', { name: '+ Vincular Primer Aprendiz' }));
    const linkDialog = await screen.findByRole('dialog', { name: 'Vincular Aprendiz al Semillero' });
    fireEvent.click(within(linkDialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Vincular Aprendiz al Semillero' })).not.toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: '+ Vincular Primer Aprendiz' }));
    const reopenedLinkDialog = await screen.findByRole('dialog', { name: 'Vincular Aprendiz al Semillero' });
    fireEvent.click(within(reopenedLinkDialog).getByRole('button', { name: 'Cerrar ventana modal' }));
    expect(screen.queryByRole('dialog', { name: 'Vincular Aprendiz al Semillero' })).not.toBeInTheDocument();
    fireEvent.click(within(drawer).getByRole('button', { name: 'Cerrar panel' }));
  });

  it('gestiona el equipo del proyecto y genera su ficha técnica desde el drawer', async () => {
    const notify = vi.fn();
    render(<GrupoModule currentUser={admin} onNotify={notify} />);
    await screen.findByText('GIDTA');
    fireEvent.click(document.getElementById('tab-proyectos'));
    fireEvent.click((await screen.findByText('Pectina')).closest('.cursor-pointer'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Equipo' }));
    expect(await screen.findByText('Investigadores Vinculados')).toBeVisible();
    expect(screen.getByText('Marta Líder')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Vincular Investigador' }));
    const addDialog = await screen.findByRole('dialog', { name: 'Vincular Investigador' });
    fireEvent.click(within(addDialog).getByRole('button', { name: /Admin CGAO/ }));
    fireEvent.change(within(addDialog).getByRole('combobox'), { target: { value: 'Investigador Principal' } });
    fireEvent.change(within(addDialog).getByRole('spinbutton'), { target: { value: '32' } });
    fireEvent.click(within(addDialog).getByRole('button', { name: 'Vincular al Proyecto' }));
    await waitFor(() => expect(ProyectosAPI.addEquipo).toHaveBeenCalledWith('p-1', 'u-admin', 'Investigador Principal', 32));
    expect(ProyectosAPI.get).toHaveBeenCalledWith('p-1');
    expect(notify).toHaveBeenCalledWith('Investigador vinculado al proyecto', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Desvincular a Marta Líder' }));
    const removeDialog = screen.getByRole('alertdialog', { name: '¿Desvincular Investigador?' });
    fireEvent.click(within(removeDialog).getByRole('button', { name: 'Desvincular' }));
    await waitFor(() => expect(ProyectosAPI.removeEquipo).toHaveBeenCalledWith('p-1', 'u-owner'));
    expect(notify).toHaveBeenCalledWith('Investigador desvinculado del proyecto', 'success');

    fireEvent.click(screen.getByRole('tab', { name: 'Línea de Tiempo' }));
    expect(screen.getByText('Fase I (Planeación)')).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Resumen & Presupuesto' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ficha Técnica PDF' }));
    expect(PDFGenerator.generateProjectPDF).toHaveBeenCalledWith(proyecto, proyecto.equipo);
  });

  it('consulta y administra aprendices, proyectos, tutores y datos del semillero', async () => {
    const notify = vi.fn();
    const projectWithoutSemillero = { ...proyecto, id: 'p-unlinked', nombre: 'Proyecto para vincular', nombre_corto: 'Sin semillero', semillero_id: null, semillero_nombre: null };
    GruposAPI.getProyectos.mockResolvedValue([proyecto, projectWithoutSemillero]);
    render(<GrupoModule currentUser={admin} onNotify={notify} />);
    await screen.findByText('GIDTA');
    fireEvent.click(document.getElementById('tab-semilleros'));
    fireEvent.click(screen.getByText('Semillero Agro').closest('.cursor-pointer'));
    await screen.findByRole('dialog', { name: 'Semillero Agro' });
    const getDrawer = () => screen.getByRole('dialog', { name: /Semillero Agro/ });

    fireEvent.click(within(getDrawer()).getByRole('tab', { name: /Aprendices Vinculados/ }));
    expect(await within(getDrawer()).findByText('Ana Aprendiz')).toBeVisible();
    fireEvent.click(within(getDrawer()).getByText('Ana Aprendiz'));
    const insight = await screen.findByRole('dialog', { name: 'Resumen 360' });
    expect(within(insight).getByText('ana@soy.sena.edu.co')).toBeVisible();
    fireEvent.click(within(insight).getByRole('button', { name: 'Cerrar resumen' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Resumen 360' })).not.toBeInTheDocument());

    fireEvent.click(within(getDrawer()).getByRole('button', { name: 'Vincular Aprendiz' }));
    fireEvent.change(screen.getByLabelText(/Seleccione un Aprendiz del Centro/), { target: { value: aprendiz.id } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Vinculación' }));
    await waitFor(() => expect(SemillerosAPI.addAprendiz).toHaveBeenCalledWith('s-1', expect.objectContaining({ aprendiz_id: aprendiz.id, estado: 'activo' })));
    expect(notify).toHaveBeenCalledWith('Aprendiz vinculado exitosamente al semillero', 'success');

    fireEvent.click(within(getDrawer()).getByTitle('Desvincular del semillero'));
    const removeAprendiz = await screen.findByRole('dialog', { name: '¿Desvincular Aprendiz del Semillero?' });
    fireEvent.click(within(removeAprendiz).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: '¿Desvincular Aprendiz del Semillero?' })).not.toBeInTheDocument();
    fireEvent.click(within(getDrawer()).getByTitle('Desvincular del semillero'));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '¿Desvincular Aprendiz del Semillero?' })).getByRole('button', { name: 'Desvincular' }));
    await waitFor(() => expect(SemillerosAPI.deleteAprendiz).toHaveBeenCalledWith('s-1', aprendiz.id));
    expect(notify).toHaveBeenCalledWith('Aprendiz desvinculado del semillero', 'success');

    fireEvent.click(within(getDrawer()).getByRole('tab', { name: 'Proyectos Asociados' }));
    const projectSelector = within(getDrawer()).getByRole('combobox');
    fireEvent.change(projectSelector, { target: { value: projectWithoutSemillero.id } });
    fireEvent.click(within(getDrawer()).getByRole('button', { name: 'Vincular' }));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith(projectWithoutSemillero.id, { semillero_id: semillero.id }));
    expect(notify).toHaveBeenCalledWith('Proyecto vinculado al semillero con éxito', 'success');
    fireEvent.click(within(getDrawer()).getByText('Pectina'));
    const linkedProjectDrawer = await screen.findByRole('dialog', { name: /Pectina/ });
    fireEvent.click(within(linkedProjectDrawer).getByRole('button', { name: 'Cerrar panel' }));
    fireEvent.click(screen.getByText('Semillero Agro').closest('.cursor-pointer'));
    await screen.findByRole('dialog', { name: 'Semillero Agro' });
    fireEvent.click(within(getDrawer()).getByRole('tab', { name: 'Proyectos Asociados' }));
    const projectRow = within(getDrawer()).getByText('Pectina').closest('.group');
    fireEvent.click(projectRow.querySelector('svg.lucide-chevron-right'));
    expect(await screen.findByRole('dialog', { name: /Pectina/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    fireEvent.click(screen.getByText('Semillero Agro').closest('.cursor-pointer'));
    await screen.findByRole('dialog', { name: 'Semillero Agro' });

    fireEvent.click(within(getDrawer()).getByRole('tab', { name: 'Tutores' }));
    expect(within(getDrawer()).getByText('Tutor Principal de Semillero')).toBeVisible();
    fireEvent.click(within(getDrawer()).getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText(/Nombre del Semillero/i), { target: { value: 'Semillero Agro actualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Semillero' }));
    await waitFor(() => expect(SemillerosAPI.update).toHaveBeenCalledWith('s-1', expect.objectContaining({ nombre: 'Semillero Agro actualizado' })));
    expect(notify).toHaveBeenCalledWith('Semillero actualizado exitosamente', 'success');

    fireEvent.click(within(getDrawer()).getByRole('button', { name: 'Eliminar Semillero' }));
    const deleteDialog = screen.getByRole('dialog', { name: '¿Eliminar Semillero de Investigación?' });
    fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(within(getDrawer()).getByRole('button', { name: 'Eliminar Semillero' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '¿Eliminar Semillero de Investigación?' })).getByRole('button', { name: 'Eliminar Semillero' }));
    await waitFor(() => expect(SemillerosAPI.delete).toHaveBeenCalledWith('s-1'));
    expect(notify).toHaveBeenCalledWith('Semillero eliminado correctamente', 'success');
  });

  it('edita el perfil CvLAC y registra un investigador desde el módulo GrupLAC', async () => {
    const notify = vi.fn();
    render(<GrupoModule currentUser={admin} onNotify={notify} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Control GrupLAC / CvLAC' }));
    await screen.findByText('marta@sena.edu.co');

    fireEvent.click(screen.getByText(/marta@sena\.edu\.co.*•/));
    expect(await screen.findByRole('dialog', { name: 'Marta Líder' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Editar Datos CvLAC' }));
    fireEvent.change(screen.getByLabelText(/Nombre Completo/i), { target: { value: 'Cambio sin guardar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(UsuariosAPI.update).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Marta Líder' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Editar Datos CvLAC' }));
    fireEvent.change(screen.getByLabelText(/Nombre Completo/i), { target: { value: 'Marta Líder Actualizada' } });
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: 'marta.actualizada@sena.edu.co' } });
    fireEvent.change(screen.getByLabelText(/Rol SENNOVA/i), { target: { value: 'Coordinadora de Investigación' } });
    fireEvent.change(screen.getByLabelText(/Horas Asignadas Semanales/i), { target: { value: '24' } });
    fireEvent.change(screen.getByLabelText(/URL CvLAC Scienti Minciencias/i), { target: { value: 'https://scienti.example/marta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(UsuariosAPI.update).toHaveBeenCalledWith('u-owner', expect.objectContaining({
      nombre: 'Marta Líder Actualizada', email: 'marta.actualizada@sena.edu.co',
      rol_sennova: 'Coordinadora de Investigación', horas_asignadas: 24, cv_lac_url: 'https://scienti.example/marta',
    })));
    expect(notify).toHaveBeenCalledWith('Datos del investigador actualizados correctamente', 'success');

    const updatedResearcherDialog = screen.getByRole('dialog', { name: 'Marta Líder Actualizada' });
    fireEvent.click(within(updatedResearcherDialog).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Marta Líder Actualizada' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/marta@sena\.edu\.co.*•/));
    const reopenedResearcherDialog = await screen.findByRole('dialog', { name: 'Marta Líder' });
    fireEvent.click(within(reopenedResearcherDialog).getByRole('button', { name: 'Cerrar ventana modal' }));
    expect(screen.queryByRole('dialog', { name: 'Marta Líder' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Investigador' }));
    const registrationDialog = await screen.findByRole('dialog', { name: 'Registrar Nuevo Investigador' });
    fireEvent.click(within(registrationDialog).getByRole('button', { name: 'Cerrar ventana modal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Investigador' }));
    fireEvent.change(await screen.findByLabelText(/Nombre Completo/i), { target: { value: 'Nuevo Investigador' } });
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: 'nuevo@sena.edu.co' } });
    fireEvent.change(screen.getByLabelText(/Rol SENNOVA/i), { target: { value: 'Investigador Asociado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(UsuariosAPI.create).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Nuevo Investigador', email: 'nuevo@sena.edu.co', rol: 'investigador', rol_sennova: 'Investigador Asociado',
    })));
    expect(notify).toHaveBeenCalledWith('Investigador registrado exitosamente en el sistema', 'success');
  });

  it('busca, edita y elimina un producto, y genera el certificado desde el directorio de aprendices', async () => {
    const notify = vi.fn();
    render(<GrupoModule currentUser={admin} onNotify={notify} />);
    await screen.findByText('GIDTA');

    fireEvent.click(screen.getByTitle('Abrir catálogo de productos'));
    await screen.findByRole('dialog', { name: /Catálogo de Productos/ });
    const getCatalog = () => screen.getByRole('dialog', { name: /Catálogo de Productos/ });
    fireEvent.change(within(getCatalog()).getByPlaceholderText(/Buscar producto por título/i), { target: { value: 'Artículo Agro' } });
    expect(within(getCatalog()).getByText('Artículo Agro')).toBeVisible();
    fireEvent.click(within(getCatalog()).getByTitle('Editar producto'));
    fireEvent.change(screen.getByLabelText(/Título del Producto/i), { target: { value: 'Artículo Agro actualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Producto' }));
    await waitFor(() => expect(ProductosAPI.update).toHaveBeenCalledWith('prod-1', expect.objectContaining({ titulo: 'Artículo Agro actualizado' })));
    expect(notify).toHaveBeenCalledWith('Producto de investigación actualizado', 'success');

    fireEvent.click(within(getCatalog()).getByRole('button', { name: /Registrar Nuevo Producto/ }));
    const cancelProductDialog = await screen.findByRole('dialog', { name: 'Registrar Producto de Investigación' });
    fireEvent.click(within(cancelProductDialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Registrar Producto de Investigación' })).not.toBeInTheDocument();

    fireEvent.click(within(getCatalog()).getByTitle('Eliminar producto'));
    const deleteProduct = screen.getByRole('dialog', { name: '¿Eliminar Producto I+D?' });
    fireEvent.click(within(deleteProduct).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: '¿Eliminar Producto I+D?' })).not.toBeInTheDocument();
    expect(ProductosAPI.delete).not.toHaveBeenCalled();
    fireEvent.click(within(getCatalog()).getByTitle('Eliminar producto'));
    const reopenedDeleteProduct = await screen.findByRole('dialog', { name: '¿Eliminar Producto I+D?' });
    fireEvent.click(within(reopenedDeleteProduct).getByRole('button', { name: 'Eliminar Producto' }));
    await waitFor(() => expect(ProductosAPI.delete).toHaveBeenCalledWith('prod-1'));
    expect(notify).toHaveBeenCalledWith('Producto eliminado correctamente', 'success');

    fireEvent.click(within(getCatalog()).getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByTitle('Abrir directorio de aprendices'));
    const learners = await screen.findByRole('dialog', { name: 'Directorio de Aprendices Semilleristas' });
    fireEvent.change(within(learners).getByPlaceholderText(/Buscar aprendiz por nombre/i), { target: { value: 'Ana' } });
    expect(within(learners).getByText('Ana Aprendiz')).toBeVisible();
    fireEvent.click(within(learners).getByText('Ana Aprendiz'));
    const learnerInsight = await screen.findByRole('dialog', { name: 'Resumen 360' });
    expect(within(learnerInsight).getByText('ana@soy.sena.edu.co')).toBeVisible();
    fireEvent.click(within(learnerInsight).getByRole('button', { name: 'Cerrar resumen' }));
    PlantillasAPI.getDatosCertificado.mockRejectedValueOnce(new Error('plantilla no disponible'));
    fireEvent.click(within(learners).getByRole('button', { name: 'Certificado PDF' }));
    await waitFor(() => expect(PDFGenerator.generateCertificate).toHaveBeenCalledWith(expect.objectContaining({
      datos_aprendiz: expect.objectContaining({ nombre: 'Ana Aprendiz', ficha: 'ADSO-01' }),
      datos_semillero: expect.objectContaining({ nombre: 'Semillero Agro' }),
    })));
    expect(notify).toHaveBeenCalledWith('Certificado generado exitosamente', 'success');
  });

  it('presenta estados vacíos para el aprendiz y conserva sus acciones de navegación', async () => {
    const onNavigate = vi.fn();
    SemillerosAPI.list.mockResolvedValue([]);
    ProyectosAPI.list.mockResolvedValue([]);
    render(<GrupoModule currentUser={{ id: 'a-1', rol: 'aprendiz' }} onNavigate={onNavigate} />);
    expect(await screen.findByRole('heading', { name: 'Mi espacio de aprendizaje' })).toBeVisible();
    expect(screen.getByText(/Aún no tienes un semillero vinculado/)).toBeVisible();
    expect(screen.getByText(/No tienes proyectos formativos vinculados/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Ver mis semilleros' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver mis proyectos' }));
    expect(onNavigate).toHaveBeenNthCalledWith(1, 'semilleros');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'mis-proyectos');
    expect(GruposAPI.list).not.toHaveBeenCalled();
  });

  it('usa los datos del proyecto como respaldo si no se puede cargar el proyecto completo para un formato', async () => {
    ProyectosAPI.get.mockRejectedValue(new Error('Proyecto no disponible'));
    render(<GrupoModule currentUser={admin} onNotify={vi.fn()} />);
    await screen.findByText('GIDTA');
    fireEvent.click(document.getElementById('tab-proyectos'));
    fireEvent.click(screen.getByText('Pectina').closest('.cursor-pointer'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Formatos' }));
    for (const download of screen.getAllByRole('button', { name: 'Descargar' })) fireEvent.click(download);
    await waitFor(() => expect(PDFGenerator.generateEtapaProductiva).toHaveBeenCalledWith(proyecto));
    expect(PDFGenerator.generateSeguimiento).toHaveBeenCalledWith(proyecto);
    expect(PDFGenerator.generateInformeFinal).toHaveBeenCalledWith(proyecto);
  });

  it('informa los errores al guardar proyectos, semilleros, productos e investigadores', async () => {
    const notify = vi.fn();
    render(<GrupoModule currentUser={admin} onNotify={notify} />);
    await screen.findByText('GIDTA');

    UsuariosAPI.create.mockRejectedValueOnce(new Error('investigador rechazado'));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Investigador' }));
    fireEvent.change(await screen.findByLabelText(/Nombre Completo/), { target: { value: 'Investigador Fallido' } });
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: 'fallido@sena.edu.co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Error al registrar investigador: investigador rechazado', 'error'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    ProyectosAPI.create.mockRejectedValueOnce(new Error('proyecto rechazado'));
    fireEvent.click(document.getElementById('tab-proyectos'));
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Proyecto/i }));
    fireEvent.change(await screen.findByLabelText(/Nombre Completo del Proyecto/i), { target: { value: 'Proyecto fallido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Proyecto' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Error al guardar proyecto: proyecto rechazado', 'error'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    SemillerosAPI.create.mockRejectedValueOnce(new Error('semillero rechazado'));
    fireEvent.click(document.getElementById('tab-semilleros'));
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Semillero/i }));
    fireEvent.change(await screen.findByLabelText(/Nombre del Semillero/i), { target: { value: 'Semillero fallido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Semillero' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Error al guardar semillero: semillero rechazado', 'error'));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    ProductosAPI.create.mockRejectedValueOnce(new Error('producto rechazado'));
    fireEvent.click(screen.getByTitle('Abrir catálogo de productos'));
    fireEvent.click(screen.getByRole('button', { name: /Registrar Nuevo Producto/i }));
    fireEvent.change(await screen.findByLabelText(/Título del Producto/i), { target: { value: 'Producto fallido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Producto' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Error al guardar producto: producto rechazado', 'error'));
  });

  it('maneja errores de carga, formularios y vinculación desde la administración de grupos', async () => {
    const notify = vi.fn();
    GruposAPI.list.mockRejectedValueOnce(new Error('grupos no disponibles'));
    render(<GruposModule currentUser={admin} onNotify={notify} />);
    expect(await screen.findByRole('heading', { name: 'Grupos de Investigación' })).toBeVisible();
    expect(await screen.findByText('No se encontraron grupos de investigación.')).toBeVisible();
    expect(notify).toHaveBeenCalledWith('Error al cargar datos: grupos no disponibles', 'error');

    GruposAPI.list.mockResolvedValue([grupo]);
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Grupo' }));
    fireEvent.change(screen.getByLabelText(/Sigla o Nombre Corto/i), { target: { value: 'GIDTA-N' } });
    fireEvent.change(screen.getByLabelText(/Nombre Completo Institucional/i), { target: { value: 'Grupo nuevo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    GruposAPI.create.mockRejectedValueOnce(new Error('grupo rechazado'));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Grupo' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Error al guardar grupo: grupo rechazado', 'error'));
  });

  it('conserva el grupo si falla la carga de integrantes y permite arrastrar un investigador al equipo', async () => {
    const notify = vi.fn();
    GruposAPI.getMembers.mockRejectedValueOnce(new Error('equipo no disponible'));
    render(<GruposModule currentUser={admin} onNotify={notify} />);
    await screen.findByRole('heading', { name: 'GIDTA' });
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del grupo GIDTA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gestionar Equipo' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Error al cargar integrantes: equipo no disponible', 'error'));
    fireEvent.click(screen.getByRole('button', { name: 'Abrir Talent Pool' }));
    const investigator = screen.getByText('Admin CGAO');
    const dataTransfer = { setData: vi.fn(), getData: vi.fn(() => 'u-admin') };
    fireEvent.dragStart(investigator.closest('[draggable="true"]'), { dataTransfer });
    expect(dataTransfer.setData).toHaveBeenCalledWith('userId', 'u-admin');
    const dropArea = screen.getByText('Vincular Integrante').parentElement.parentElement.parentElement;
    fireEvent.dragOver(dropArea, { dataTransfer });
    GruposAPI.addMember.mockRejectedValueOnce(new Error('vinculación rechazada'));
    fireEvent.drop(dropArea, { dataTransfer });
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Error al vincular talento: vinculación rechazada', 'error'));
    expect(GruposAPI.addMember).toHaveBeenCalledWith('g-1', { user_id: 'u-admin', rol: 'Investigador' });
  });

  it('vincula talento desde el selector del directorio y confirma su desvinculación aunque falle la API', async () => {
    const notify = vi.fn();
    render(<GruposModule currentUser={admin} onNotify={notify} />);
    await screen.findByRole('heading', { name: 'GIDTA' });
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del grupo GIDTA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gestionar Equipo' }));
    await screen.findByRole('dialog', { name: 'Equipo de Investigación' });

    const talentSelector = screen.getAllByRole('combobox').at(-1);
    fireEvent.change(talentSelector, { target: { value: 'a-1' } });
    expect(screen.getByRole('heading', { name: 'Vincular a Ana Aprendiz' })).toBeVisible();
    expect(screen.getAllByRole('combobox').map(select => select.value)).toContain('Aprendiz');
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }));
    await waitFor(() => expect(GruposAPI.addMember).toHaveBeenCalledWith('g-1', { user_id: 'a-1', rol: 'Aprendiz' }));
    expect(notify).toHaveBeenCalledWith('Integrante vinculado correctamente', 'success');

    GruposAPI.removeMember.mockRejectedValueOnce(new Error('integrante en uso'));
    fireEvent.click(screen.getAllByTitle('Desvincular')[0]);
    const confirm = screen.getByRole('dialog', { name: '¿Desvincular Integrante?' });
    fireEvent.click(within(confirm).getByRole('button', { name: 'Desvincular' }));
    await waitFor(() => expect(GruposAPI.removeMember).toHaveBeenCalledWith('g-1', 'u-owner'));
    expect(notify).toHaveBeenCalledWith('Error al desvincular: integrante en uso', 'error');
    expect(screen.queryByRole('dialog', { name: '¿Desvincular Integrante?' })).not.toBeInTheDocument();
  });

  it('actualiza el rol visible al editar un grupo y muestra errores al eliminarlo', async () => {
    const notify = vi.fn();
    render(<GruposModule currentUser={admin} onNotify={notify} />);
    await screen.findByRole('heading', { name: 'GIDTA' });
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del grupo GIDTA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Datos' }));
    fireEvent.change(screen.getByLabelText(/Sigla o Nombre Corto/i), { target: { value: 'GIDTA modificado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByLabelText(/Sigla o Nombre Corto/i)).toHaveValue('GIDTA modificado');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del grupo GIDTA' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Grupo' }));
    GruposAPI.delete.mockRejectedValueOnce(new Error('grupo en uso'));
    fireEvent.click(within(screen.getByRole('dialog', { name: '¿Eliminar Grupo de Investigación?' })).getByRole('button', { name: 'Sí, Eliminar Grupo' }));
    await waitFor(() => expect(notify).toHaveBeenCalledWith('Error al eliminar grupo: grupo en uso', 'error'));
  });

  it('consulta el expediente del grupo por sus pestañas y actualiza sus datos desde el encabezado', async () => {
    const notify = vi.fn();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    SemillerosAPI.list.mockResolvedValue([{ ...semillero, grupo_id: grupo.id }]);
    render(<GruposModule currentUser={admin} onNotify={notify} />);
    await screen.findByRole('heading', { name: 'GIDTA' });

    fireEvent.click(screen.getByText('GIDTA').closest('.cursor-pointer'));
    expect(await screen.findByRole('tab', { name: 'Información' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Agroindustria')).toBeVisible();
    fireEvent.click(screen.getByTitle('Imprimir Expediente'));
    expect(print).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('tab', { name: 'Estadísticas e Impacto' }));
    expect(await screen.findByText('Distribución de Producción')).toBeVisible();
    fireEvent.click(screen.getAllByRole('tab')[2]);
    expect(screen.getByText(/Marta Líder/)).toBeVisible();
    fireEvent.click(screen.getAllByRole('tab')[3]);
    expect(screen.getByText('Semillero Agro')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Datos' }));
    fireEvent.change(await screen.findByLabelText(/Sigla o Nombre Corto/i), { target: { value: 'GIDTA actualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.change(screen.getByLabelText(/Líneas de Investigación/i), { target: { value: 'Agroindustria, Automatización' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Información' }));

    await waitFor(() => expect(GruposAPI.update).toHaveBeenCalledWith(grupo.id, expect.objectContaining({ nombre: 'GIDTA actualizado' })));
    expect(notify).toHaveBeenCalledWith('Grupo institucional actualizado', 'success');
  });

  it('crea, edita y elimina proyectos desde el listado y su expediente', async () => {
    const notify = vi.fn();
    render(<GrupoModule currentUser={admin} onNotify={notify} />);
    await screen.findByText('GIDTA');
    fireEvent.click(document.getElementById('tab-proyectos'));

    fireEvent.change(screen.getByPlaceholderText(/Buscar proyectos por nombre/i), { target: { value: 'sin resultados' } });
    expect(screen.getByText('No se encontraron proyectos vinculados')).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText(/Buscar proyectos por nombre/i), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Proyecto' }));
    const createDialog = await screen.findByRole('dialog', { name: 'Nuevo Proyecto de Investigación' });
    fireEvent.change(within(createDialog).getByLabelText(/Nombre Completo del Proyecto/), { target: { value: 'Proyecto de agricultura de precisión' } });
    fireEvent.change(within(createDialog).getByLabelText('Nombre Corto / Sigla'), { target: { value: 'AgroPrecisión' } });
    fireEvent.change(within(createDialog).getByLabelText('Código SGPS'), { target: { value: 'SGPS-2026-09' } });
    fireEvent.change(within(createDialog).getByLabelText('Estado'), { target: { value: 'En ejecución' } });
    fireEvent.change(within(createDialog).getByLabelText('Tipología'), { target: { value: 'Investigación' } });
    fireEvent.change(within(createDialog).getByLabelText('Presupuesto Total (COP)'), { target: { value: '2500000' } });
    fireEvent.change(within(createDialog).getByLabelText('Línea de Investigación'), { target: { value: 'Desarrollo de Software' } });
    fireEvent.change(within(createDialog).getByLabelText('Semillero Asociado'), { target: { value: 's-1' } });
    fireEvent.change(within(createDialog).getByLabelText('Objetivo General'), { target: { value: 'Optimizar la producción' } });
    fireEvent.change(within(createDialog).getByLabelText('Descripción / Resumen Ejecutivo'), { target: { value: 'Proyecto de prueba de campo' } });
    fireEvent.click(within(createDialog).getByRole('button', { name: 'Crear Proyecto' }));
    await waitFor(() => expect(ProyectosAPI.create).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Proyecto de agricultura de precisión', nombre_corto: 'AgroPrecisión', codigo_sgps: 'SGPS-2026-09',
      estado: 'En ejecución', tipologia: 'Investigación', presupuesto_total: 2500000, vigencia: 12,
      linea_investigacion: 'Desarrollo de Software', semillero_id: 's-1', grupo_id: 'g-1',
      objetivo_general: 'Optimizar la producción', descripcion: 'Proyecto de prueba de campo',
    })));
    expect(notify).toHaveBeenCalledWith('Proyecto creado y vinculado al grupo exitosamente', 'success');

    fireEvent.click(screen.getByText('Pectina').closest('.cursor-pointer'));
    const projectDrawer = await screen.findByRole('dialog', { name: /Pectina/ });
    fireEvent.click(within(projectDrawer).getByRole('button', { name: 'Editar' }));
    const editDialog = await screen.findByRole('dialog', { name: 'Editar Proyecto de Investigación' });
    fireEvent.change(within(editDialog).getByLabelText('Presupuesto Total (COP)'), { target: { value: '1800000' } });
    fireEvent.change(within(editDialog).getByLabelText('Objetivo General'), { target: { value: 'Aumentar el rendimiento de pectina' } });
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Actualizar Proyecto' }));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p-1', expect.objectContaining({
      presupuesto_total: 1800000, objetivo_general: 'Aumentar el rendimiento de pectina', grupo_id: 'g-1',
    })));
    expect(notify).toHaveBeenCalledWith('Proyecto actualizado exitosamente', 'success');

    const refreshedDrawer = await screen.findByRole('dialog', { name: /Pectina/ });
    fireEvent.click(within(refreshedDrawer).getByRole('button', { name: 'Eliminar Proyecto' }));
    const deleteDialog = await screen.findByRole('dialog', { name: '¿Eliminar Proyecto de Investigación?' });
    fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: '¿Eliminar Proyecto de Investigación?' })).not.toBeInTheDocument();

    fireEvent.click(within(refreshedDrawer).getByRole('button', { name: 'Cerrar panel' }));
    expect(screen.queryByRole('dialog', { name: /Pectina/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Pectina').closest('.cursor-pointer'));
    const reopenedDrawer = await screen.findByRole('dialog', { name: /Pectina/ });
    fireEvent.click(within(reopenedDrawer).getByRole('button', { name: 'Eliminar Proyecto' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '¿Eliminar Proyecto de Investigación?' })).getByRole('button', { name: 'Eliminar Proyecto' }));
    await waitFor(() => expect(ProyectosAPI.delete).toHaveBeenCalledWith('p-1'));
    expect(notify).toHaveBeenCalledWith('Proyecto eliminado correctamente', 'success');
    expect(screen.queryByRole('dialog', { name: /Pectina/ })).not.toBeInTheDocument();
  });

  it('registra un semillero y un producto con los datos diligenciados en sus formularios', async () => {
    const notify = vi.fn();
    render(<GrupoModule currentUser={admin} onNotify={notify} />);
    await screen.findByText('GIDTA');

    fireEvent.click(document.getElementById('tab-semilleros'));
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Semillero' }));
    const semilleroDialog = await screen.findByRole('dialog', { name: 'Nuevo Semillero de Investigación' });
    fireEvent.change(within(semilleroDialog).getByLabelText(/Nombre del Semillero/), { target: { value: 'Robótica Rural' } });
    fireEvent.change(within(semilleroDialog).getByLabelText('Sigla o Acrónimo'), { target: { value: 'ROR' } });
    fireEvent.change(within(semilleroDialog).getByLabelText('Código Interno'), { target: { value: 'ROR-2026' } });
    fireEvent.change(within(semilleroDialog).getByLabelText('Línea de Investigación'), { target: { value: 'Desarrollo de Software' } });
    fireEvent.change(within(semilleroDialog).getByLabelText('Líder / Tutor'), { target: { value: 'Marta Líder' } });
    fireEvent.change(within(semilleroDialog).getByLabelText('Horas Formativas Semanales'), { target: { value: '18' } });
    fireEvent.change(within(semilleroDialog).getByLabelText('Estado'), { target: { value: 'inactivo' } });
    fireEvent.change(within(semilleroDialog).getByLabelText('Descripción del Semillero'), { target: { value: 'Prototipos para el sector rural' } });
    fireEvent.click(within(semilleroDialog).getByRole('button', { name: 'Crear Semillero' }));
    await waitFor(() => expect(SemillerosAPI.create).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Robótica Rural', sigla: 'ROR', codigo: 'ROR-2026', linea_investigacion: 'Desarrollo de Software',
      lider_nombre: 'Marta Líder', lider: 'Marta Líder', horas_dedicadas: 18, estado: 'inactivo',
      descripcion: 'Prototipos para el sector rural', grupo_id: 'g-1',
    })));
    expect(notify).toHaveBeenCalledWith('Semillero creado exitosamente en el grupo', 'success');

    fireEvent.click(screen.getByTitle('Abrir catálogo de productos'));
    const catalog = await screen.findByRole('dialog', { name: /Catálogo de Productos/ });
    fireEvent.click(within(catalog).getByRole('button', { name: /Registrar Nuevo Producto/ }));
    const productDialog = await screen.findByRole('dialog', { name: 'Registrar Producto de Investigación' });
    fireEvent.change(within(productDialog).getByLabelText(/Título del Producto/), { target: { value: 'Sensor de humedad abierto' } });
    fireEvent.change(within(productDialog).getByLabelText('Tipología'), { target: { value: 'Software / Aplicativo' } });
    fireEvent.change(within(productDialog).getByLabelText('Categoría Minciencias'), { target: { value: 'B' } });
    fireEvent.change(within(productDialog).getByLabelText('Proyecto Asociado'), { target: { value: 'p-1' } });
    fireEvent.change(within(productDialog).getByLabelText('Año de Publicación'), { target: { value: '2024' } });
    fireEvent.change(within(productDialog).getByLabelText('Autores (separados por coma)'), { target: { value: 'Marta Líder, Ana Aprendiz' } });
    fireEvent.change(within(productDialog).getByLabelText('URL de Soporte / DOI / Repositorio'), { target: { value: 'https://example.org/sensor' } });
    fireEvent.click(within(productDialog).getByRole('button', { name: 'Registrar Producto' }));
    await waitFor(() => expect(ProductosAPI.create).toHaveBeenCalledWith(expect.objectContaining({
      titulo: 'Sensor de humedad abierto', tipologia: 'Software / Aplicativo', categoria_minciencias: 'B',
      proyecto_id: 'p-1', año: 2024, autores: 'Marta Líder, Ana Aprendiz', url_soporte: 'https://example.org/sensor',
    })));
    expect(notify).toHaveBeenCalledWith('Producto I+D registrado exitosamente', 'success');
  });

  it('administra las líneas de investigación y navega a sus semilleros y proyectos', async () => {
    const notify = vi.fn();
    let storedGroup = { ...grupo };
    GruposAPI.list.mockImplementation(async () => [storedGroup]);
    GruposAPI.update.mockImplementation(async (_id, payload) => { storedGroup = { ...payload }; });
    render(<GrupoModule currentUser={admin} onNotify={notify} initialAction={{ form: 'view', data: { tab: 'lineas' } }} />);
    await screen.findByRole('heading', { name: 'Líneas de Investigación del Grupo CGAO' });

    fireEvent.click(screen.getByRole('button', { name: 'Nueva Línea' }));
    const addDialog = await screen.findByRole('dialog', { name: 'Nueva Línea de Investigación' });
    fireEvent.change(within(addDialog).getByLabelText(/Nombre de la Línea de Investigación/), { target: { value: 'Biotecnología' } });
    fireEvent.click(within(addDialog).getByRole('button', { name: 'Agregar Línea' }));
    await waitFor(() => expect(GruposAPI.update).toHaveBeenCalledWith('g-1', expect.objectContaining({
      lineas_investigacion: ['Agroindustria', 'Desarrollo de Software', 'Biotecnología'],
    })));
    expect(notify).toHaveBeenCalledWith('Línea de investigación agregada exitosamente', 'success');

    fireEvent.click(screen.getByText('Agroindustria').closest('.cursor-pointer'));
    const detail = await screen.findByRole('dialog', { name: 'Agroindustria' });
    expect(within(detail).getByText('Semillero Agro')).toBeVisible();
    expect(within(detail).getByText('Pectina')).toBeVisible();
    fireEvent.click(within(detail).getByRole('button', { name: 'Cerrar ventana modal' }));
    fireEvent.click(screen.getByText('Agroindustria').closest('.cursor-pointer'));
    const detailForSemillero = await screen.findByRole('dialog', { name: 'Agroindustria' });
    fireEvent.click(within(detailForSemillero).getByText('Semillero Agro'));
    expect(await screen.findByRole('dialog', { name: 'Semillero Agro' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));

    fireEvent.click(screen.getByText('Agroindustria').closest('.cursor-pointer'));
    const detailAgain = await screen.findByRole('dialog', { name: 'Agroindustria' });
    fireEvent.click(within(detailAgain).getByText('Pectina'));
    expect(await screen.findByRole('dialog', { name: /Pectina/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));

    fireEvent.click(screen.getByText('Agroindustria').closest('.cursor-pointer'));
    const lineDetail = await screen.findByRole('dialog', { name: 'Agroindustria' });
    fireEvent.click(within(lineDetail).getByRole('button', { name: 'Renombrar' }));
    const cancelEditDialog = await screen.findByRole('dialog', { name: 'Renombrar Línea de Investigación' });
    fireEvent.click(within(cancelEditDialog).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(within(lineDetail).getByRole('button', { name: 'Renombrar' }));
    const closeEditDialog = await screen.findByRole('dialog', { name: 'Renombrar Línea de Investigación' });
    fireEvent.click(within(closeEditDialog).getByRole('button', { name: 'Cerrar ventana modal' }));
    fireEvent.click(within(lineDetail).getByRole('button', { name: 'Renombrar' }));
    const editDialog = await screen.findByRole('dialog', { name: 'Renombrar Línea de Investigación' });
    fireEvent.change(within(editDialog).getByLabelText(/Nuevo Nombre de la Línea/), { target: { value: 'Agroindustria Sostenible' } });
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(storedGroup.lineas_investigacion).toContain('Agroindustria Sostenible'));
    expect(notify).toHaveBeenCalledWith('Línea de investigación actualizada', 'success');

    fireEvent.click(within(screen.getByRole('dialog', { name: 'Agroindustria Sostenible' })).getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByText('Agroindustria Sostenible').closest('.cursor-pointer'));
    const renamedDetail = await screen.findByRole('dialog', { name: 'Agroindustria Sostenible' });
    fireEvent.click(within(renamedDetail).getByRole('button', { name: 'Eliminar' }));
    const deleteDialog = await screen.findByRole('dialog', { name: '¿Eliminar Línea de Investigación?' });
    fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(within(renamedDetail).getByRole('button', { name: 'Eliminar' }));
    fireEvent.click(within(await screen.findByRole('dialog', { name: '¿Eliminar Línea de Investigación?' })).getByRole('button', { name: 'Eliminar Línea' }));
    await waitFor(() => expect(storedGroup.lineas_investigacion).not.toContain('Agroindustria Sostenible'));
    expect(notify).toHaveBeenCalledWith('Línea de investigación eliminada', 'success');
  });

  it('sube un plan operativo y genera los formatos de referencia del grupo', async () => {
    const notify = vi.fn();
    const onNavigate = vi.fn();
    const file = new File(['plan anual'], 'plan-2026.pdf', { type: 'application/pdf' });
    render(<GrupoModule currentUser={admin} onNotify={notify} onNavigate={onNavigate} initialAction={{ form: 'view', data: { tab: 'plan' } }} />);
    expect(await screen.findByRole('heading', { name: 'Plan Operativo & Documentación SENNOVA' })).toBeVisible();
    const uploadInput = screen.getByText('Subir Plan Operativo').closest('label').querySelector('input[type="file"]');
    fireEvent.change(uploadInput, { target: { files: [file] } });
    await waitFor(() => expect(GruposAPI.uploadPlanOperativo).toHaveBeenCalledWith('g-1', file));
    expect(notify).toHaveBeenCalledWith('Plan operativo subido exitosamente', 'success');

    for (const button of screen.getAllByRole('button', { name: 'Generar PDF' })) fireEvent.click(button);
    await waitFor(() => {
      expect(PDFGenerator.generateEtapaProductiva).toHaveBeenCalledWith(proyecto);
      expect(PDFGenerator.generateSeguimiento).toHaveBeenCalledWith(proyecto);
      expect(PDFGenerator.generateInformeFinal).toHaveBeenCalledWith(proyecto);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Ir al Repositorio Documental Completo' }));
    expect(onNavigate).toHaveBeenCalledWith('repositorio');
  });

  it('calcula rubros presupuestales desde los conceptos y muestra hitos con entregables', async () => {
    const projectWithBudgetAndMilestones = {
      ...proyecto,
      presupuesto_detallado: { items: [
        { categoria: 'Talento humano investigador', valor: '300000' },
        { categoria: 'Materiales e insumos', valor: 150000 },
        { categoria: 'Viajes y transporte', valor: 50000 },
        { categoria: 'Servicios de software', valor: 25000 },
        { categoria: 'Equipos de laboratorio', valor: 75000 },
      ] },
      entregables: [
        { id: 'e-1', nombre: 'Protocolo de campo', estado: 'aprobado', fecha_limite: '2026-01-15' },
        { id: 'e-2', nombre: 'Informe de avance', estado: 'en_revision' },
      ],
    };
    GruposAPI.getProyectos.mockResolvedValue([projectWithBudgetAndMilestones]);
    GruposAPI.getStats.mockResolvedValue({ avance_promedio: 70, presupuesto_total: 0, presupuesto_ejecutado: 0, total_productos: 1 });
    ProyectosAPI.list.mockResolvedValue([projectWithBudgetAndMilestones]);
    ProyectosAPI.get.mockResolvedValue(projectWithBudgetAndMilestones);
    render(<GrupoModule currentUser={admin} onNotify={vi.fn()} />);
    await screen.findByText('GIDTA');
    fireEvent.click(document.getElementById('tab-proyectos'));
    expect(screen.getAllByText('$1.200.000')).not.toHaveLength(0);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'finalizado' } });
    expect(screen.getByText('No se encontraron proyectos vinculados')).toBeVisible();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en ejecución' } });
    fireEvent.click(screen.getByText('Pectina').closest('.cursor-pointer'));
    const drawer = await screen.findByRole('dialog', { name: /Pectina/ });
    expect(within(drawer).getByText('$300.000 (25.0%)')).toBeVisible();
    expect(within(drawer).getByText('$150.000 (12.5%)')).toBeVisible();
    fireEvent.click(within(drawer).getByRole('tab', { name: 'Línea de Tiempo' }));
    expect(within(drawer).getByText('Protocolo de campo')).toBeVisible();
    expect(within(drawer).getByText('Informe de avance')).toBeVisible();
    fireEvent.click(within(drawer).getByRole('tab', { name: 'Resumen & Presupuesto' }));
    fireEvent.click(within(drawer).getByRole('button', { name: /Cambiar \/ Mover Semillero/i }));
    const moveDialog = await screen.findByRole('dialog', { name: 'Mover Proyecto a Semillero' });
    expect(within(moveDialog).getByText('Proyecto de Pectina')).toBeVisible();
    const projectQueriesBeforeMove = GruposAPI.getProyectos.mock.calls.length;
    fireEvent.click(within(moveDialog).getByRole('button', { name: 'Confirmar Traslado' }));
    await waitFor(() => expect(GruposAPI.getProyectos.mock.calls.length).toBeGreaterThan(projectQueriesBeforeMove));
    expect(await screen.findByText('Semillero de destino')).toBeVisible();
    fireEvent.click(within(screen.getByRole('dialog', { name: /Pectina/ })).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: /Pectina/ })).not.toBeInTheDocument();
  });

  it('ejecuta las acciones del encabezado, exporta el consolidado y guarda la ficha institucional', async () => {
    const notify = vi.fn();
    const onNavigate = vi.fn();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<GrupoModule currentUser={admin} onNotify={notify} onNavigate={onNavigate} />);
    await screen.findByText('GIDTA');

    fireEvent.click(screen.getByRole('button', { name: 'Dashboard General' }));
    expect(onNavigate).toHaveBeenCalledWith('dashboard');
    fireEvent.click(screen.getByTitle('Imprimir Ficha Resumen'));
    expect(print).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByTitle('Descargar consolidado Excel del grupo'));
    await waitFor(() => expect(ReportesAPI.descargarConsolidadoGrupos).toHaveBeenCalledWith('excel'));
    expect(notify).toHaveBeenCalledWith('Consolidado Excel de grupos generado exitosamente', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Editar Perfil' }));
    const closeDialog = await screen.findByRole('dialog', { name: 'Editar Perfil Institucional del Grupo' });
    fireEvent.click(within(closeDialog).getByRole('button', { name: 'Cerrar ventana modal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Perfil' }));
    const cancelDialog = await screen.findByRole('dialog', { name: 'Editar Perfil Institucional del Grupo' });
    fireEvent.click(within(cancelDialog).getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Perfil' }));
    const editDialog = await screen.findByRole('dialog', { name: 'Editar Perfil Institucional del Grupo' });
    fireEvent.change(within(editDialog).getByLabelText(/Sigla o Nombre Corto/), { target: { value: 'GIDTA Renovado' } });
    fireEvent.change(within(editDialog).getByLabelText(/Código GrupLAC/), { target: { value: 'COL009999' } });
    fireEvent.change(within(editDialog).getByLabelText(/Nombre Institucional Completo/), { target: { value: 'Grupo Renovado CGAO' } });
    fireEvent.change(within(editDialog).getByLabelText(/Director\(a\) del Grupo/), { target: { value: 'Nueva Directora' } });
    fireEvent.change(within(editDialog).getByLabelText(/Email Institucional Director/), { target: { value: 'directora@sena.edu.co' } });
    fireEvent.change(within(editDialog).getByLabelText(/Clasificación Minciencias/), { target: { value: 'A1' } });
    fireEvent.change(within(editDialog).getByLabelText(/Convocatoria Minciencias/), { target: { value: 'Convocatoria 2026' } });
    fireEvent.change(within(editDialog).getByLabelText(/URL GrupLAC/), { target: { value: 'https://gruplac.example/renovado' } });
    fireEvent.change(within(editDialog).getByLabelText(/Líneas de Investigación/), { target: { value: 'Agroindustria, Robótica' } });
    fireEvent.change(within(editDialog).getByLabelText(/Descripción del Grupo/), { target: { value: 'Descripción institucional actualizada' } });
    fireEvent.change(within(editDialog).getByLabelText(/Misión Institucional/), { target: { value: 'Investigar para el territorio' } });
    fireEvent.change(within(editDialog).getByLabelText(/Visión Institucional/), { target: { value: 'Ser referentes regionales' } });
    fireEvent.click(within(editDialog).getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(GruposAPI.update).toHaveBeenCalledWith('g-1', expect.objectContaining({
      nombre: 'GIDTA Renovado', codigo_gruplac: 'COL009999', nombre_completo: 'Grupo Renovado CGAO',
      director_nombre: 'Nueva Directora', director_email: 'directora@sena.edu.co', clasificacion: 'A1',
      convocatoria_activa: 'Convocatoria 2026', gruplac_url: 'https://gruplac.example/renovado',
      lineas_investigacion: ['Agroindustria', 'Robótica'], descripcion_grupo: 'Descripción institucional actualizada',
      mision: 'Investigar para el territorio', vision: 'Ser referentes regionales',
    })));
    expect(notify).toHaveBeenCalledWith('Información del grupo actualizada correctamente', 'success');
  });

  it('permite navegar con las tarjetas KPI del encabezado y del tablero estadístico', async () => {
    const onNavigate = vi.fn();
    render(<GrupoModule currentUser={admin} onNotify={vi.fn()} onNavigate={onNavigate} />);
    await screen.findByText('GIDTA');

    fireEvent.click(screen.getByTitle('Ver semilleros'));
    expect(screen.getByRole('heading', { name: 'Semilleros de Investigación Adscritos' })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Estadísticas e Indicadores' }));

    fireEvent.click(screen.getByTitle('Abrir directorio de aprendices'));
    const apprenticeDirectory = await screen.findByRole('dialog', { name: 'Directorio de Aprendices Semilleristas' });
    fireEvent.change(within(apprenticeDirectory).getByRole('combobox'), { target: { value: 's-1' } });
    expect(within(apprenticeDirectory).getByText('Ana Aprendiz')).toBeVisible();
    fireEvent.click(within(apprenticeDirectory).getByRole('button', { name: 'Cerrar ventana modal' }));

    fireEvent.click(screen.getByTitle('Ver investigadores CvLAC'));
    expect(screen.getByRole('tab', { name: 'Control GrupLAC / CvLAC' })).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(screen.getByRole('tab', { name: 'Estadísticas e Indicadores' }));
    fireEvent.click(screen.getByTitle('Abrir catálogo de productos'));
    const productCatalog = await screen.findByRole('dialog', { name: /Catálogo de Productos/ });
    fireEvent.click(within(productCatalog).getByRole('button', { name: 'Cerrar ventana modal' }));

    fireEvent.click(screen.getByTitle('Ver proyectos y avance'));
    expect(screen.getByRole('heading', { name: /Proyectos de Investigación & Avance Institucional/ })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Estadísticas e Indicadores' }));
    fireEvent.click(screen.getByTitle('Ver líneas temáticas'));
    expect(screen.getByRole('heading', { name: 'Líneas de Investigación del Grupo CGAO' })).toBeVisible();

    fireEvent.click(screen.getByRole('tab', { name: 'Estadísticas e Indicadores' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ir al Dashboard Operativo' }));
    expect(onNavigate).toHaveBeenCalledWith('dashboard');
  });

  it('permite acceder al catálogo, proyectos, aprendices y semilleros desde las tarjetas estadísticas', async () => {
    render(<GrupoModule currentUser={admin} onNotify={vi.fn()} />);
    await screen.findByText('GIDTA');
    fireEvent.click(screen.getByRole('tab', { name: 'Estadísticas e Indicadores' }));

    fireEvent.click(screen.getByText('Producción Minciencias').closest('.cursor-pointer'));
    const catalog = await screen.findByRole('dialog', { name: /Catálogo de Productos/ });
    fireEvent.click(within(catalog).getByRole('button', { name: 'Cerrar ventana modal' }));

    fireEvent.click(screen.getByText('Proyectos I+D+i').closest('.cursor-pointer'));
    expect(screen.getByRole('heading', { name: /Proyectos de Investigación & Avance Institucional/ })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Estadísticas e Indicadores' }));

    fireEvent.click(screen.getByText('Aprendices Semilleristas').closest('.cursor-pointer'));
    const learners = await screen.findByRole('dialog', { name: 'Directorio de Aprendices Semilleristas' });
    expect(within(learners).getByText('Ana Aprendiz')).toBeVisible();
    fireEvent.click(within(learners).getByRole('button', { name: 'Cerrar ventana modal' }));

    fireEvent.click(screen.getByText('Dedicación Formativa').closest('.cursor-pointer'));
    expect(screen.getByRole('heading', { name: 'Semilleros de Investigación Adscritos' })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Estadísticas e Indicadores' }));

    fireEvent.click(screen.getByRole('button', { name: 'Gestionar Productos' }));
    const managedCatalog = await screen.findByRole('dialog', { name: /Catálogo de Productos/ });
    fireEvent.click(within(managedCatalog).getByRole('button', { name: 'Cerrar ventana modal' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver Proyectos' }));
    expect(screen.getByRole('heading', { name: /Proyectos de Investigación & Avance Institucional/ })).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Estadísticas e Indicadores' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver Directorio Completo CvLAC' }));
    expect(screen.getByRole('tab', { name: 'Control GrupLAC / CvLAC' })).toHaveAttribute('aria-selected', 'true');
  });

  it('tolera fallos de consultas auxiliares y crea registros desde los estados vacíos', async () => {
    const notify = vi.fn();
    GruposAPI.list.mockResolvedValue([{ ...grupo, lineas_investigacion: ' , , ' }]);
    SemillerosAPI.list.mockRejectedValue(new Error('semilleros fuera de línea'));
    UsuariosAPI.list.mockRejectedValue(new Error('usuarios fuera de línea'));
    ProductosAPI.list.mockRejectedValue(new Error('productos fuera de línea'));
    AprendicesAPI.list.mockRejectedValue(new Error('aprendices fuera de línea'));
    GruposAPI.getStats.mockRejectedValue(new Error('estadísticas fuera de línea'));
    GruposAPI.getProyectos.mockRejectedValue(new Error('proyectos fuera de línea'));
    render(<GrupoModule currentUser={admin} onNotify={notify} initialAction={{ form: 'view', data: { tab: 'lineas' } }} />);
    expect(await screen.findByRole('heading', { name: 'Líneas de Investigación del Grupo CGAO' })).toBeVisible();
    expect(screen.getByText('Sin líneas de investigación configuradas')).toBeVisible();
    expect(notify).not.toHaveBeenCalledWith(expect.stringContaining('fuera de línea'), 'error');

    fireEvent.click(screen.getByRole('button', { name: '+ Configurar Primera Línea' }));
    const addLineaDialog = await screen.findByRole('dialog', { name: 'Nueva Línea de Investigación' });
    fireEvent.click(within(addLineaDialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Nueva Línea de Investigación' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ Configurar Primera Línea' }));
    const addLineaDialogAgain = await screen.findByRole('dialog', { name: 'Nueva Línea de Investigación' });
    fireEvent.click(within(addLineaDialogAgain).getByRole('button', { name: 'Cerrar ventana modal' }));
    expect(screen.queryByRole('dialog', { name: 'Nueva Línea de Investigación' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ Configurar Primera Línea' }));
    const addFirstLinea = await screen.findByRole('dialog', { name: 'Nueva Línea de Investigación' });
    fireEvent.change(within(addFirstLinea).getByLabelText(/Nombre de la Línea de Investigación/), { target: { value: 'Agroindustria' } });
    fireEvent.click(within(addFirstLinea).getByRole('button', { name: 'Agregar Línea' }));
    await waitFor(() => expect(GruposAPI.update).toHaveBeenCalledWith('g-1', expect.objectContaining({ lineas_investigacion: ['Agroindustria'] })));
    expect(notify).toHaveBeenCalledWith('Línea de investigación agregada exitosamente', 'success');

    fireEvent.click(screen.getByRole('tab', { name: 'Estadísticas e Indicadores' }));
    expect(screen.getByText('Sin productos registrados todavía')).toBeVisible();
    expect(screen.getByText('Sin proyectos registrados')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '+ Registrar Primer Producto' }));
    const productForm = await screen.findByRole('dialog', { name: 'Registrar Producto de Investigación' });
    fireEvent.click(within(productForm).getByRole('button', { name: 'Cerrar ventana modal' }));
    expect(screen.queryByRole('dialog', { name: 'Registrar Producto de Investigación' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '+ Crear Primer Proyecto' }));
    const projectForm = await screen.findByRole('dialog', { name: 'Nuevo Proyecto de Investigación' });
    fireEvent.click(within(projectForm).getByRole('button', { name: 'Cerrar ventana modal' }));
    expect(screen.queryByRole('dialog', { name: 'Nuevo Proyecto de Investigación' })).not.toBeInTheDocument();

    fireEvent.click(document.getElementById('tab-semilleros'));
    fireEvent.change(screen.getByPlaceholderText(/Buscar por nombre, sigla o tutor/i), { target: { value: 'sin registros' } });
    expect(screen.getByText('No se encontraron semilleros')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Nuevo Semillero' }));
    const semilleroForm = await screen.findByRole('dialog', { name: 'Nuevo Semillero de Investigación' });
    fireEvent.click(within(semilleroForm).getByRole('button', { name: 'Cerrar ventana modal' }));
    expect(screen.queryByRole('dialog', { name: 'Nuevo Semillero de Investigación' })).not.toBeInTheDocument();
  });

  it('mantiene el módulo utilizable cuando no se puede consultar el grupo institucional', async () => {
    GruposAPI.list.mockRejectedValueOnce(new Error('grupo temporalmente no disponible'));
    render(<GrupoModule currentUser={admin} onNotify={vi.fn()} />);
    expect(await screen.findByText('En Proceso de Medición')).toBeVisible();
    expect(screen.getByText(/Código Minciencias:/).parentElement).toHaveTextContent('COL000000');
    expect(GruposAPI.list).toHaveBeenCalledOnce();
  });
});
