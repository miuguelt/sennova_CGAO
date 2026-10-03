import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectDocumentationEditor from '../components/projects/ProjectDocumentationEditor';
import { ProjectDocumentationAPI } from '../api/projectDocumentation';
import { DocumentosAPI } from '../api/documentos';
import { emitDataRefresh } from '../utils/dataRefresh';
vi.mock('../api/projectDocumentation', () => ({ ProjectDocumentationAPI: {
  get: vi.fn(),
  saveCommon: vi.fn(),
  saveDraft: vi.fn(),
  saveIdentification: vi.fn(),
  analyzeFormulation: vi.fn(),
  applyFormulation: vi.fn(),
  generate: vi.fn(),
  review: vi.fn(),
} }));

vi.mock('../api/documentos', () => ({ DocumentosAPI: { download: vi.fn() } }));
const fixture = () => ({ proyecto: { id: 'p-1', nombre: 'Proyecto agrícola' }, revision: 1, comunes: { centro: 'CGAO', fecha: '', presupuesto: 0, equipo: [] }, campos_comunes: [
  { key: 'centro', label: 'Centro de formación', type: 'text', required: true, help: 'Escriba el nombre oficial del centro.' },
  { key: 'fecha', label: 'Fecha de inicio', type: 'date', help: 'Use la fecha aprobada.' },
  { key: 'presupuesto', label: 'Presupuesto', type: 'number', min: 0, step: 1, help: 'Indique el valor aprobado en pesos.' },
  { key: 'equipo', label: 'Equipo', type: 'rows', help: 'Incluya integrantes y responsabilidades reales.', columns: [{ key: 'nombre', label: 'Nombre', type: 'text', required: true, help: 'Nombre completo del integrante.' }, { key: 'horas', label: 'Horas', type: 'number' }] },
], documentos: [{ clave: 'informe:1', titulo: 'Informe bimensual 1', tipo: 'informe_bimensual', carpeta: '4InformesBimensuales', formato: 'docx', periodo_bimestre: 1, producto_id: null, revision: 2, datos: { avance: '' }, campos: [{ key: 'avance', label: 'Avance y resultados', type: 'textarea', required: true, help: 'Relacione actividades, resultados y evidencias verificables.' }], faltantes: [{ campo: 'avance', mensaje: 'Describa los resultados del bimestre.' }], generable: false, historial: [] }] });
let data;
beforeEach(() => {
  vi.clearAllMocks(); data = fixture();
  ProjectDocumentationAPI.get.mockImplementation(async () => structuredClone(data));
  ProjectDocumentationAPI.saveCommon.mockImplementation(async (_id, revision, datos) => { data.revision = revision + 1; data.comunes = datos; return { revision: data.revision, datos }; });
  ProjectDocumentationAPI.saveDraft.mockImplementation(async (_id, _key, revision, datos) => { Object.assign(data.documentos[0], { revision: revision + 1, datos, faltantes: [], generable: true }); return { revision: revision + 1, datos }; });
  ProjectDocumentationAPI.generate.mockResolvedValue({ documento_id: 'doc-1', version: 1, nombre_archivo: 'informe.docx' });
  ProjectDocumentationAPI.review.mockResolvedValue({ estado: 'revisado' });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:documento');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const mount = (props = {}) => render(<ProjectDocumentationEditor projectId="p-1" currentUser={{ rol: 'investigador' }} {...props} />);
async function open(expandDocument = true, expandCommon = true) {
  fireEvent.click(screen.getByRole('button', { name: 'Construir documentación' }));
  const common = await screen.findByRole('region', { name: 'Datos comunes' });
  if (expandCommon) fireEvent.click(within(common).getByText('Datos comunes'));
  if (expandDocument) fireEvent.click(screen.getByText('Informe bimensual 1'));
  return common;
}

describe('Construcción guiada de documentación', () => {
  it('mantiene los formularios de documentos cerrados y resume sus pendientes para elegir qué completar', async () => {
    mount(); await open(false);
    const document = screen.getByRole('region', { name: 'Informe bimensual 1' });
    expect(document.querySelector('details')).not.toHaveAttribute('open');
    expect(within(document).getByText('Describa los resultados del bimestre.')).not.toBeVisible();
    expect(within(document).getByText('1 campo pendiente')).toBeVisible();
    expect(within(document).getByText('4InformesBimensuales · DOCX · Bimestre 1')).toBeVisible();
    expect(within(document).getByLabelText('Avance y resultados *')).not.toBeVisible();
    fireEvent.click(within(document).getByText('Informe bimensual 1'));
    expect(within(document).getByLabelText('Avance y resultados *')).toBeVisible();
    expect(within(document).getByText('Relacione actividades, resultados y evidencias verificables.')).toBeVisible();
    expect(within(document).getByText('Describa los resultados del bimestre.')).toBeVisible();
  });

  it('permite elegir documentos sin atravesar 22 filas comunes ni 70 pendientes repetidos', async () => {
    data.comunes.equipo = Array.from({ length: 22 }, (_, index) => ({ nombre: `Integrante ${index + 1}`, horas: 1 }));
    data.documentos[0].faltantes = Array.from({ length: 70 }, (_, index) => ({ campo: `campo_${index}`, mensaje: `Complete el dato de referencia ${index + 1}.` }));
    data.documentos[0].historial = [{ documento_id: 'doc-1', version: 1, nombre_archivo: 'informe.docx', estado: 'revisado', vigente: true, disponible: true }];
    for (const title of ['Formulación', 'Acta de inicio', 'Acta de cierre']) data.documentos.push({ ...data.documentos[0], clave: title, titulo: title, historial: [] });
    data.advertencias = ['Concilie la duración registrada en la fuente.'];
    mount(); const common = await open(false, false);
    expect(common.querySelector('details')).not.toHaveAttribute('open');
    expect(within(common).getByText('22 filas registradas')).toBeVisible();
    expect(within(common).getByLabelText('Nombre · Equipo fila 22 *')).not.toBeVisible();
    expect(screen.getByText('Concilie la duración registrada en la fuente.')).toBeVisible();
    for (const title of ['Informe bimensual 1', 'Formulación', 'Acta de inicio', 'Acta de cierre']) {
      const card = screen.getByRole('region', { name: title });
      expect(card.firstElementChild).toHaveTextContent(title);
      expect(within(card).getByText('70 campos pendientes')).toBeVisible();
      expect(within(card).getByText('Complete el dato de referencia 1.')).not.toBeVisible();
      expect(within(card).getByText('Complete el dato de referencia 70.')).not.toBeVisible();
    }
    expect(screen.getByRole('button', { name: 'Descargar versión 1 de Informe bimensual 1' })).toBeVisible();
    const card = screen.getByRole('region', { name: 'Informe bimensual 1' });
    fireEvent.click(within(card).getByText('Informe bimensual 1'));
    const pending = within(card).getByRole('list');
    expect(within(pending).getAllByRole('listitem')).toHaveLength(70);
    data.documentos[0].faltantes.forEach(item => expect(within(pending).getByText(item.mensaje)).toBeVisible());
    fireEvent.click(within(common).getByText('Datos comunes'));
    expect(within(common).getByLabelText('Nombre · Equipo fila 22 *')).toBeVisible();
  });
  it('carga el editor bajo demanda y presenta las ayudas, carpetas y faltantes', async () => {
    mount();
    expect(ProjectDocumentationAPI.get).not.toHaveBeenCalled();
    const common = await open();
    expect(within(common).getByLabelText('Centro de formación *')).toHaveValue('CGAO');
    expect(screen.getByText('Escriba el nombre oficial del centro.')).toBeInTheDocument();
    expect(screen.getByText('Describa los resultados del bimestre.')).toBeInTheDocument();
    expect(screen.getByText('4InformesBimensuales · DOCX · Bimestre 1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generar Informe bimensual 1' })).toBeDisabled();
  });

  it('muestra los objetivos, la vigencia y el presupuesto autoritativos sin duplicar su edición', async () => {
    data.proyecto = { id: 'p-1', nombre: 'Proyecto agrícola', codigo_sgps: 'SGPS-123', objetivo_general: 'Evaluar una solución agrícola.', objetivos_especificos: ['Validar el prototipo.'], vigencia: 12, presupuesto_total: 2500000 };
    mount(); await open();
    expect(screen.getByText('Evaluar una solución agrícola.')).toBeInTheDocument();
    expect(screen.getByText('Validar el prototipo.')).toBeInTheDocument();
    expect(screen.getByText('12 meses')).toBeInTheDocument();
    expect(screen.getByText(/2\.500\.000/)).toBeInTheDocument();
    expect(screen.getByText(/SGPS SGPS-123/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Objetivo general')).not.toBeInTheDocument();
  });

  it('usa selectores del catálogo y bloquea generación al editar datos comunes', async () => {
    data.documentos[0].generable = true; data.documentos[0].faltantes = [];
    data.documentos[0].campos.push({ key: 'tipo_cierre', label: 'Tipo de cierre', type: 'select', options: [{ value: 'parcial', label: 'Parcial' }, { value: 'final', label: 'Final' }], help: 'Seleccione el alcance real del cierre.' });
    mount(); const common = await open();
    expect(screen.getByRole('button', { name: 'Generar Informe bimensual 1' })).toBeEnabled();
    fireEvent.change(screen.getByLabelText('Tipo de cierre'), { target: { value: 'final' } });
    fireEvent.change(within(common).getByLabelText('Presupuesto'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Generar Informe bimensual 1' })).toBeDisabled();
    expect(screen.getByLabelText('Presupuesto')).toHaveValue(null);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Informe bimensual 1' }));
    await waitFor(() => expect(ProjectDocumentationAPI.saveDraft).toHaveBeenCalledWith('p-1', 'informe:1', 2, { avance: '', tipo_cierre: 'final' }));
  });

  it('edita datos comunes, fechas, números y filas sin inventar integrantes', async () => {
    mount(); const common = await open();
    fireEvent.change(within(common).getByLabelText('Centro de formación *'), { target: { value: 'CGAO - Subsede Vélez' } });
    fireEvent.change(within(common).getByLabelText('Fecha de inicio'), { target: { value: '2026-10-01' } });
    fireEvent.change(within(common).getByLabelText('Presupuesto'), { target: { value: '1000' } });
    fireEvent.click(within(common).getByRole('button', { name: 'Agregar fila en Equipo' }));
    fireEvent.change(within(common).getByLabelText('Nombre · Equipo fila 1 *'), { target: { value: 'Investigador real' } });
    fireEvent.change(within(common).getByLabelText('Horas · Equipo fila 1'), { target: { value: '20' } });
    fireEvent.click(within(common).getByRole('button', { name: 'Agregar fila en Equipo' }));
    fireEvent.click(within(common).getByRole('button', { name: 'Eliminar fila 2 de Equipo' }));
    fireEvent.click(within(common).getByRole('button', { name: 'Guardar datos comunes' }));
    await waitFor(() => expect(ProjectDocumentationAPI.saveCommon).toHaveBeenCalledWith('p-1', 1, { centro: 'CGAO - Subsede Vélez', fecha: '2026-10-01', presupuesto: 1000, equipo: [{ nombre: 'Investigador real', horas: 20 }] }));
    expect(await screen.findByRole('status')).toHaveTextContent('Datos comunes guardados');
  });

  it('guarda el borrador antes de generar y transmite ambas revisiones', async () => {
    mount(); await open();
    const document = screen.getByRole('region', { name: 'Informe bimensual 1' });
    fireEvent.change(within(document).getByLabelText('Avance y resultados *'), { target: { value: 'Se evaluó el prototipo con resultados documentados.' } });
    expect(within(document).getByRole('button', { name: 'Generar Informe bimensual 1' })).toBeDisabled();
    fireEvent.click(within(document).getByRole('button', { name: 'Guardar Informe bimensual 1' }));
    await waitFor(() => expect(ProjectDocumentationAPI.saveDraft).toHaveBeenCalledWith('p-1', 'informe:1', 2, { avance: 'Se evaluó el prototipo con resultados documentados.' }));
    const generate = await screen.findByRole('button', { name: 'Generar Informe bimensual 1' });
    await waitFor(() => expect(generate).toBeEnabled());
    fireEvent.click(generate);
    await waitFor(() => expect(ProjectDocumentationAPI.generate).toHaveBeenCalledWith('p-1', 'informe:1', 3, 1));
    expect(await screen.findByRole('status')).toHaveTextContent('Versión 1 generada');
  });

  it('conserva los cambios locales al recargar después de un conflicto 409', async () => {
    ProjectDocumentationAPI.saveCommon.mockRejectedValue(Object.assign(new Error('Otra persona guardó una versión más reciente.'), { status: 409 }));
    mount(); const common = await open();
    fireEvent.change(within(common).getByLabelText('Centro de formación *'), { target: { value: 'Cambios que debo conservar' } });
    fireEvent.click(within(common).getByRole('button', { name: 'Guardar datos comunes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Otra persona guardó');
    data.revision = 4; data.comunes.centro = 'Versión de otro investigador';
    fireEvent.click(screen.getByRole('button', { name: 'Recargar y conservar mis cambios' }));
    await waitFor(() => expect(ProjectDocumentationAPI.get).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Centro de formación *')).toHaveValue('Cambios que debo conservar');
    expect(screen.getByRole('button', { name: 'Guardar datos comunes' })).toBeEnabled();
  });

  it('descarga cada versión y registra la revisión sin certificar las firmas', async () => {
    data.documentos[0].historial = [{ documento_id: 'doc-1', version: 1, nombre_archivo: 'informe-v1.docx', estado: 'borrador', vigente: true }];
    DocumentosAPI.download.mockResolvedValue({ data_base64: btoa('contenido'), nombre_archivo: 'informe-v1.docx' });
    mount(); await open();
    fireEvent.click(screen.getByRole('button', { name: 'Descargar versión 1 de Informe bimensual 1' }));
    await waitFor(() => expect(DocumentosAPI.download).toHaveBeenCalledWith('doc-1'));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByLabelText('Observación de revisión de versión 1'), { target: { value: 'Se contrastaron cifras y evidencias.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Marcar revisada la versión 1 de Informe bimensual 1' }));
    await waitFor(() => expect(ProjectDocumentationAPI.review).toHaveBeenCalledWith('p-1', 'doc-1', 'Se contrastaron cifras y evidencias.'));
    expect(screen.getByText('Revise contenido y gestione firmas antes de radicar.')).toBeInTheDocument();
  });

  it('permite consultar y descargar al aprendiz, con campos de solo lectura', async () => {
    mount({ currentUser: { rol: 'aprendiz' } }); await open();
    expect(screen.getByLabelText('Centro de formación *')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Guardar datos comunes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Generar Informe bimensual 1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Agregar fila en Equipo' })).not.toBeInTheDocument();
  });

  it('muestra versiones anteriores y revisadas, y descarga archivos con su tipo original', async () => {
    data.documentos[0].historial = [{ documento_id: 'doc-1', version: 1, nombre_archivo: 'informe-v1.docx', estado: 'revisado', vigente: false }];
    DocumentosAPI.download.mockResolvedValue({ data_base64: btoa('contenido'), nombre_archivo: 'informe-v1.docx', content_type: 'application/msword' });
    mount({ currentUser: { rol: 'aprendiz' } }); await open();
    expect(screen.getByText('Revisada · Versión anterior')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Marcar revisada/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Descargar versión 1 de Informe bimensual 1' }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
    expect(URL.createObjectURL.mock.calls[0][0].type).toBe('application/msword');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:documento');
  });

  it('muestra inconsistencias del servidor y protege versiones cuyo archivo ya no está disponible', async () => {
    data.advertencias = ['El desglose del presupuesto no coincide con el presupuesto total del proyecto.'];
    data.documentos[0].historial = [{ documento_id: null, version: 1, nombre_archivo: 'informe-v1.docx', estado: 'borrador', vigente: false, disponible: false, observacion_revision: 'Pendiente aclarar fechas.' }];
    mount(); await open();
    expect(screen.getByText('El desglose del presupuesto no coincide con el presupuesto total del proyecto.')).toBeInTheDocument();
    expect(screen.getByText('Pendiente aclarar fechas.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar versión 1 de Informe bimensual 1' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Marcar revisada la versión 1 de Informe bimensual 1' })).toBeDisabled();
    expect(screen.getByText('Archivo no disponible. Genere una nueva versión.')).toBeInTheDocument();
  });

  it('permite generar borradores con advertencias y exige conciliarlas antes de registrar la revisión', async () => {
    data.advertencias = ['Concilie las fechas de los documentos de referencia.'];
    data.documentos[0].faltantes = []; data.documentos[0].generable = true;
    data.documentos[0].historial = [{ documento_id: 'doc-1', version: 1, nombre_archivo: 'informe.docx', estado: 'borrador', vigente: true, disponible: true }];
    mount(); await open();
    expect(screen.getByRole('button', { name: 'Generar Informe bimensual 1' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Marcar revisada la versión 1 de Informe bimensual 1' })).toBeDisabled();
  });

  it('presenta errores de generación, revisión y archivos sin datos sin anunciar éxito', async () => {
    const notify = vi.fn();
    data.documentos[0].generable = true; data.documentos[0].faltantes = [];
    data.documentos[0].historial = [{ documento_id: 'doc-1', version: 1, nombre_archivo: 'informe.docx', estado: 'borrador', vigente: true }];
    ProjectDocumentationAPI.generate.mockRejectedValue(new Error('Falta información obligatoria.'));
    ProjectDocumentationAPI.review.mockRejectedValue(Object.assign(new Error('Acceso denegado.'), { status: 403 }));
    DocumentosAPI.download.mockResolvedValue({});
    mount({ onNotify: notify }); await open();
    fireEvent.click(screen.getByRole('button', { name: 'Generar Informe bimensual 1' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Falta información obligatoria.');
    fireEvent.click(screen.getByRole('button', { name: 'Marcar revisada la versión 1 de Informe bimensual 1' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Acceso denegado.'));
    expect(ProjectDocumentationAPI.review).toHaveBeenCalledWith('p-1', 'doc-1', '');
    fireEvent.click(screen.getByRole('button', { name: 'Descargar versión 1 de Informe bimensual 1' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('La versión no contiene un archivo descargable.'));
    expect(notify).not.toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });

  it('muestra carga, error con reintento y catálogo vacío', async () => {
    ProjectDocumentationAPI.get.mockRejectedValueOnce(new Error('Consulta no disponible.'));
    mount(); fireEvent.click(screen.getByRole('button', { name: 'Construir documentación' }));
    expect(screen.getByRole('status')).toHaveTextContent('Consultando documentación');
    expect(await screen.findByRole('alert')).toHaveTextContent('Consulta no disponible.');
    data.documentos = [];
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar documentación' }));
    expect(await screen.findByText('Aún no hay documentos configurados para este proyecto.')).toBeInTheDocument();
  });

  it('refresca mutaciones relacionadas y conserva datos comunes sin guardar', async () => {
    mount(); const common = await open();
    fireEvent.change(within(common).getByLabelText('Centro de formación *'), { target: { value: 'Edición pendiente' } });
    act(() => emitDataRefresh({ endpoint: '/proyectos/p-1/documentacion/comunes', method: 'PUT' }));
    await waitFor(() => expect(ProjectDocumentationAPI.get).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Centro de formación *')).toHaveValue('Edición pendiente');
    act(() => emitDataRefresh({ endpoint: '/usuarios/u-1', method: 'PUT' }));
    expect(ProjectDocumentationAPI.get).toHaveBeenCalledTimes(2);
  });

  it('conserva borradores sucios al refrescar y permite ocultar y volver a abrir el constructor', async () => {
    mount(); await open();
    fireEvent.change(screen.getByLabelText('Avance y resultados *'), { target: { value: 'Mi borrador pendiente' } });
    act(() => emitDataRefresh({ endpoint: '/documentos/upload', method: 'POST' }));
    await waitFor(() => expect(ProjectDocumentationAPI.get).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Avance y resultados *')).toHaveValue('Mi borrador pendiente');
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar constructor' }));
    expect(screen.queryByRole('region', { name: 'Datos comunes' })).not.toBeInTheDocument();
    await open();
    expect(screen.getByLabelText('Avance y resultados *')).toHaveValue('Mi borrador pendiente');
  });

  it('ignora consultas tardías y no reutiliza un borrador de otro proyecto', async () => {
    let resolveFirst;
    ProjectDocumentationAPI.get.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
    const view = mount();
    fireEvent.click(screen.getByRole('button', { name: 'Construir documentación' }));
    view.rerender(<ProjectDocumentationEditor projectId="p-2" currentUser={{ rol: 'admin' }} />);
    await screen.findByRole('region', { name: 'Datos comunes' });
    fireEvent.change(screen.getByLabelText('Centro de formación *'), { target: { value: 'Borrador de proyecto 2' } });
    await act(async () => resolveFirst({ ...fixture(), comunes: { centro: 'Respuesta tardía' } }));
    expect(screen.getByLabelText('Centro de formación *')).toHaveValue('Borrador de proyecto 2');
    data.comunes.centro = 'Proyecto 3 vigente';
    view.rerender(<ProjectDocumentationEditor projectId="p-3" currentUser={{ rol: 'admin' }} />);
    await waitFor(() => expect(screen.getByLabelText('Centro de formación *')).toHaveValue('Proyecto 3 vigente'));
    view.unmount();
    act(() => emitDataRefresh({ endpoint: '/proyectos/p-3', method: 'PUT' }));
    expect(ProjectDocumentationAPI.get).toHaveBeenCalledTimes(3);
  });

  it('no aplica la respuesta de un guardado tardío a otro proyecto', async () => {
    let finishSave;
    ProjectDocumentationAPI.saveCommon.mockImplementationOnce(() => new Promise(resolve => { finishSave = resolve; }));
    const view = mount(); await open();
    fireEvent.change(screen.getByLabelText('Centro de formación *'), { target: { value: 'Proyecto 1 editado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar datos comunes' }));
    data.comunes.centro = 'Proyecto 2 vigente';
    view.rerender(<ProjectDocumentationEditor projectId="p-2" currentUser={{ rol: 'admin' }} />);
    await waitFor(() => expect(screen.getByLabelText('Centro de formación *')).toHaveValue('Proyecto 2 vigente'));
    await act(async () => finishSave({ revision: 20, datos: { centro: 'Proyecto 1 editado' } }));
    expect(screen.queryByText('Datos comunes guardados.')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Centro de formación *')).toHaveValue('Proyecto 2 vigente');
    fireEvent.change(screen.getByLabelText('Centro de formación *'), { target: { value: 'Proyecto 2 modificado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar datos comunes' }));
    await waitFor(() => expect(ProjectDocumentationAPI.saveCommon).toHaveBeenLastCalledWith('p-2', 1, expect.objectContaining({ centro: 'Proyecto 2 modificado' })));
  });
});
