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
vi.mock('../components/projects/MoverProyectoSemilleroModal', () => ({ default: () => null }));
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
    fireEvent.click(within(removeAprendiz).getByRole('button', { name: 'Desvincular' }));
    await waitFor(() => expect(SemillerosAPI.deleteAprendiz).toHaveBeenCalledWith('s-1', aprendiz.id));
    expect(notify).toHaveBeenCalledWith('Aprendiz desvinculado del semillero', 'success');

    fireEvent.click(within(getDrawer()).getByRole('tab', { name: 'Proyectos Asociados' }));
    const projectSelector = within(getDrawer()).getByRole('combobox');
    fireEvent.change(projectSelector, { target: { value: projectWithoutSemillero.id } });
    fireEvent.click(within(getDrawer()).getByRole('button', { name: 'Vincular' }));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith(projectWithoutSemillero.id, { semillero_id: semillero.id }));
    expect(notify).toHaveBeenCalledWith('Proyecto vinculado al semillero con éxito', 'success');

    fireEvent.click(within(getDrawer()).getByRole('tab', { name: 'Tutores' }));
    expect(within(getDrawer()).getByText('Tutor Principal de Semillero')).toBeVisible();
    fireEvent.click(within(getDrawer()).getByRole('button', { name: 'Editar' }));
    fireEvent.change(screen.getByLabelText(/Nombre del Semillero/i), { target: { value: 'Semillero Agro actualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Semillero' }));
    await waitFor(() => expect(SemillerosAPI.update).toHaveBeenCalledWith('s-1', expect.objectContaining({ nombre: 'Semillero Agro actualizado' })));
    expect(notify).toHaveBeenCalledWith('Semillero actualizado exitosamente', 'success');

    fireEvent.click(within(getDrawer()).getByRole('button', { name: 'Eliminar Semillero' }));
    const deleteDialog = screen.getByRole('dialog', { name: '¿Eliminar Semillero de Investigación?' });
    fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Eliminar Semillero' }));
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
    fireEvent.change(screen.getByLabelText(/Nombre Completo/i), { target: { value: 'Marta Líder Actualizada' } });
    fireEvent.change(screen.getByLabelText(/Rol SENNOVA/i), { target: { value: 'Coordinadora de Investigación' } });
    fireEvent.change(screen.getByLabelText(/Horas Asignadas Semanales/i), { target: { value: '24' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(UsuariosAPI.update).toHaveBeenCalledWith('u-owner', expect.objectContaining({
      nombre: 'Marta Líder Actualizada', rol_sennova: 'Coordinadora de Investigación', horas_asignadas: 24,
    })));
    expect(notify).toHaveBeenCalledWith('Datos del investigador actualizados correctamente', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Investigador' }));
    fireEvent.change(await screen.findByLabelText(/Nombre Completo/i), { target: { value: 'Nuevo Investigador' } });
    fireEvent.change(screen.getByLabelText(/Correo Electrónico/i), { target: { value: 'nuevo@sena.edu.co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(UsuariosAPI.create).toHaveBeenCalledWith(expect.objectContaining({
      nombre: 'Nuevo Investigador', email: 'nuevo@sena.edu.co', rol: 'investigador',
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

    fireEvent.click(within(getCatalog()).getByTitle('Eliminar producto'));
    const deleteProduct = screen.getByRole('dialog', { name: '¿Eliminar Producto I+D?' });
    fireEvent.click(within(deleteProduct).getByRole('button', { name: 'Eliminar Producto' }));
    await waitFor(() => expect(ProductosAPI.delete).toHaveBeenCalledWith('prod-1'));
    expect(notify).toHaveBeenCalledWith('Producto eliminado correctamente', 'success');

    fireEvent.click(within(getCatalog()).getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByTitle('Abrir directorio de aprendices'));
    const learners = await screen.findByRole('dialog', { name: 'Directorio de Aprendices Semilleristas' });
    fireEvent.change(within(learners).getByPlaceholderText(/Buscar aprendiz por nombre/i), { target: { value: 'Ana' } });
    expect(within(learners).getByText('Ana Aprendiz')).toBeVisible();
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
});
