import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProjectFileImport from '../components/projects/ProjectFileImport';
import ProjectEvidenceFile from '../components/projects/ProjectEvidenceFile';
import { ProjectFileImportAPI } from '../api/projectFileImport';
import { ProyectosAPI } from '../api/proyectos';

vi.mock('../api/projectFileImport', () => ({ ProjectFileImportAPI: { analyze: vi.fn(), save: vi.fn() } }));
vi.mock('../api/proyectos', () => ({ ProyectosAPI: { getExpediente: vi.fn() } }));

const analyzed = () => ({ proyecto_id: 'p-1', carpetas: ['4InformesBimensuales'], carpetas_faltantes: ['5ActaCierre'], archivos: [
  { ruta: '4InformesBimensuales/avance.docx', nombre_archivo: 'avance.docx', tamano: 2000, sha256: 'example-informe', tipo: 'informe_bimensual', periodo_bimestre: null, texto_extraido: 'Se instaló el prototipo.', advertencias: ['Revise el bimestre antes de guardar.'], propuesta: { comunes: { responsable: 'Equipo investigador' }, borrador: { actividades: [{ descripcion: 'Instalar prototipo', cumplido: true }], observaciones: null }, proyecto: { objetivo_general: 'Mejorar el proceso' } } },
  { ruta: 'anexos/foto.png', nombre_archivo: 'foto.png', tamano: 500, sha256: 'example-foto', tipo: 'evidencia_fotografica', periodo_bimestre: null, texto_extraido: '', advertencias: [], propuesta: {} },
] });
const file = (name = 'proyecto.zip', size) => { const value = new File(['contenido'], name); if (size) Object.defineProperty(value, 'size', { value: size }); return value; };
const choose = (files = [file()]) => fireEvent.change(screen.getByLabelText('ZIP o archivos individuales'), { target: { files } });
const analyze = async () => { fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' })); await screen.findByRole('heading', { name: 'Revisar archivos antes de guardar' }); };
const mount = (props = {}) => render(<ProjectFileImport projectId="p-1" projectName="Proyecto agroindustrial" maxPeriods={6} {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  ProjectFileImportAPI.analyze.mockResolvedValue(analyzed());
  ProjectFileImportAPI.save.mockResolvedValue({ archivos_importados: 1, archivos_omitidos: 1, campos_registrados: 2, advertencias: ['El archivo repetido ya estaba registrado.'] });
  ProyectosAPI.getExpediente.mockResolvedValue({ proyecto_id: 'p-1', nombre: 'Proyecto agroindustrial', completo: false, porcentaje_completitud: 0, etapas: [] });
});
afterEach(cleanup);

describe('Importación revisada de archivos del proyecto', () => {
  it('presenta el proyecto, los límites y no guarda durante el análisis', async () => {
    mount();
    expect(screen.getByText(/Proyecto agroindustrial/)).toBeInTheDocument();
    expect(screen.getByText(/50 MB/)).toHaveTextContent('200 MB');
    expect(screen.getByRole('button', { name: 'Analizar archivos' })).toBeDisabled();
    choose();
    await analyze();
    expect(ProjectFileImportAPI.analyze).toHaveBeenCalledWith('p-1', expect.objectContaining({ files: [expect.objectContaining({ name: 'proyecto.zip' })] }));
    expect(ProjectFileImportAPI.save).not.toHaveBeenCalled();
    expect(screen.getByText('4InformesBimensuales/avance.docx')).toBeInTheDocument();
    expect(screen.getByText('5ActaCierre')).toBeInTheDocument();
    expect(screen.getByText('Se instaló el prototipo.')).toBeInTheDocument();
    expect(screen.getByText('Mejorar el proceso')).toBeInTheDocument();
    expect(screen.getByText(/Descripción: Instalar prototipo/)).toHaveTextContent('Cumplido: Sí');
    expect(screen.getByText('Revise el bimestre antes de guardar.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Completar los campos vacíos/)).toBeChecked();
    expect(screen.getByText(/sin reemplazar los valores guardados/)).toBeInTheDocument();
  });

  it('valida el bimestre, excluye archivos y guarda solo la selección confirmada', async () => {
    const onImported = vi.fn(); const onNotify = vi.fn();
    mount({ onImported, onNotify }); choose(); await analyze();
    const save = screen.getByRole('button', { name: 'Guardar archivos en este proyecto' });
    fireEvent.click(save);
    expect(await screen.findByRole('alert')).toHaveTextContent('bimestre');
    for (const period of ['0', '1.5', '7']) {
      fireEvent.change(screen.getByLabelText('Bimestre de avance.docx'), { target: { value: period } });
      fireEvent.click(save);
      expect(screen.getByRole('alert')).toHaveTextContent('bimestre');
    }
    expect(ProjectFileImportAPI.save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Bimestre de avance.docx'), { target: { value: '2' } });
    fireEvent.click(screen.getByLabelText('Incluir foto.png'));
    fireEvent.click(screen.getByLabelText(/Completar los campos vacíos/));
    fireEvent.click(save);
    await waitFor(() => expect(onImported).toHaveBeenCalledOnce());
    expect(ProjectFileImportAPI.save).toHaveBeenCalledWith('p-1', expect.objectContaining({ files: [expect.objectContaining({ name: 'proyecto.zip' })] }), [{ ruta: '4InformesBimensuales/avance.docx', sha256: 'example-informe', periodo_bimestre: 2, importar_datos: false }]);
    expect(screen.getByRole('status')).toHaveTextContent('Archivos guardados: 1');
    expect(screen.getByRole('status')).toHaveTextContent('Campos registrados: 2');
    expect(screen.getByText('El archivo repetido ya estaba registrado.')).toBeInTheDocument();
    expect(onNotify).toHaveBeenCalledWith(expect.stringContaining('Archivos guardados: 1'), 'success');
    expect(screen.queryByRole('heading', { name: 'Revisar archivos antes de guardar' })).not.toBeInTheDocument();
  });

  it('clasifica archivos independientes y cancela una revisión si cambia la selección', async () => {
    mount(); choose([file('acta.docx')]);
    fireEvent.change(screen.getByLabelText('Carpeta de destino'), { target: { value: '2ActadeInicio' } });
    fireEvent.change(screen.getByLabelText('Tipo de documento'), { target: { value: 'acta_inicio' } });
    await analyze();
    expect(ProjectFileImportAPI.analyze).toHaveBeenCalledWith('p-1', expect.objectContaining({ carpeta: '2ActadeInicio', tipo: 'acta_inicio' }));
    fireEvent.change(screen.getByLabelText('Tipo de documento'), { target: { value: 'documento_apoyo' } });
    expect(screen.queryByRole('heading', { name: 'Revisar archivos antes de guardar' })).not.toBeInTheDocument();
    await analyze();
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar selección' }));
    expect(screen.getByRole('button', { name: 'Analizar archivos' })).toBeDisabled();
    expect(screen.queryByText('Se instaló el prototipo.')).not.toBeInTheDocument();
  });

  it('permite clasificar borradores y elegir las subcarpetas de productos', async () => {
    mount(); choose([file('notas.md')]);
    expect(screen.getByRole('option', { name: '7Borradoresyvarios' })).toBeInTheDocument();
    for (const folder of ['3Productos/1InformeFinal', '3Productos/2PosteryEventos', '3Productos/3.InnovacionGestionEmpresarial']) expect(screen.getByRole('option', { name: folder })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Carpeta de destino'), { target: { value: '7Borradoresyvarios' } });
    fireEvent.change(screen.getByLabelText('Tipo de documento'), { target: { value: 'nota_trabajo' } });
    await analyze();
    expect(ProjectFileImportAPI.analyze).toHaveBeenCalledWith('p-1', expect.objectContaining({ carpeta: '7Borradoresyvarios', tipo: 'nota_trabajo' }));
  });

  it('admite los formatos de oficina, imágenes, audio y video permitidos por el servidor', async () => {
    const extensions = ['pdf', 'docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif', 'wav', 'ogg', 'oga', 'm4a', 'mp3', 'mp4', 'mov', 'webm', 'mkv', 'avi', 'txt', 'csv', 'md', 'json'];
    const files = extensions.map(extension => file(`soporte.${extension}`));
    mount(); choose(files); await analyze();
    expect(ProjectFileImportAPI.analyze).toHaveBeenCalledWith('p-1', expect.objectContaining({ files }));
    for (const extension of extensions) expect(screen.getByLabelText('ZIP o archivos individuales').accept.split(',')).toContain(`.${extension}`);
  });

  it.each([
    [[file('a.zip'), file('b.pdf')], 'ZIP'],
    [[file('a.zip'), file('b.zip')], 'ZIP'],
    [[file('grande.zip', 50 * 1024 * 1024 + 1)], '50 MB'],
    [[file('grande.pdf', 10 * 1024 * 1024 + 1)], '10 MB'],
    [[file('ejecutable.exe')], 'formato'],
    [Array.from({ length: 501 }, (_, index) => file(`${index}.pdf`)), '500'],
    [Array.from({ length: 21 }, (_, index) => file(`${index}.pdf`, 10 * 1024 * 1024)), '200 MB'],
  ])('rechaza cargas no admitidas antes de contactar al servidor (%#)', async (files, message) => {
    mount(); choose(files);
    fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(ProjectFileImportAPI.analyze).not.toHaveBeenCalled();
  });

  it('conserva archivos para reintentar errores de análisis y de guardado', async () => {
    ProjectFileImportAPI.analyze.mockRejectedValueOnce(new Error('Servicio de lectura no disponible.'));
    mount(); choose(); fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio de lectura no disponible.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar análisis' }));
    await screen.findByRole('heading', { name: 'Revisar archivos antes de guardar' });
    fireEvent.click(screen.getByLabelText('Incluir avance.docx'));
    ProjectFileImportAPI.save.mockRejectedValueOnce(new Error('El archivo cambió. Analice de nuevo.'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar archivos en este proyecto' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El archivo cambió. Analice de nuevo.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar guardado' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Archivos guardados: 1'));
    expect(ProjectFileImportAPI.save).toHaveBeenLastCalledWith('p-1', expect.any(Object), [{ ruta: 'anexos/foto.png', sha256: 'example-foto', periodo_bimestre: null, importar_datos: true }]);
  });

  it('muestra progreso accesible y descarta respuestas del proyecto anterior', async () => {
    let resolve; ProjectFileImportAPI.analyze.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const view = render(<ProjectEvidenceFile projectId="p-1" currentUser={{ rol: 'investigador' }} showConstructor={false} />);
    await screen.findByText(/Proyecto agroindustrial/);
    choose(); fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' }));
    expect(screen.getByText('Analizando archivos…')).toBeInTheDocument();
    expect(screen.getByLabelText('ZIP o archivos individuales')).toBeDisabled();
    view.rerender(<ProjectEvidenceFile projectId="p-2" currentUser={{ rol: 'investigador' }} showConstructor={false} />);
    await act(async () => { resolve(analyzed()); });
    expect(screen.queryByText('Se instaló el prototipo.')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Analizar archivos' })).toBeDisabled();
  });

  it.each(['admin', 'investigador', 'aprendiz', 'instructor'])('respeta el acceso del rol %s', async rol => {
    render(<ProjectEvidenceFile projectId="p-1" currentUser={{ rol }} showConstructor={false} />);
    await screen.findByRole('button', { name: 'Descargar expediente parcial (ZIP)' });
    expect(Boolean(screen.queryByRole('region', { name: 'Importar archivos al proyecto' }))).toBe(['admin', 'investigador'].includes(rol));
  });

  it('permite retirar todos los archivos y no confirma una importación vacía', async () => {
    mount(); choose(); await analyze();
    fireEvent.click(screen.getByLabelText('Incluir avance.docx')); fireEvent.click(screen.getByLabelText('Incluir foto.png'));
    expect(screen.getByRole('button', { name: 'Guardar archivos en este proyecto' })).toBeDisabled();
    expect(ProjectFileImportAPI.save).not.toHaveBeenCalled();
  });

  it('refresca el expediente después de guardar sin desmontar una revisión durante el análisis', async () => {
    render(<ProjectEvidenceFile projectId="p-1" currentUser={{ rol: 'admin' }} showConstructor={false} />);
    await screen.findByText(/Proyecto agroindustrial/);
    choose([file('proyecto.zip', 50 * 1024 * 1024)]); await analyze();
    expect(ProyectosAPI.getExpediente).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByLabelText('Incluir avance.docx'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar archivos en este proyecto' }));
    await waitFor(() => expect(ProyectosAPI.getExpediente).toHaveBeenCalledTimes(2));
    expect(await screen.findByText(/Archivos guardados: 1/)).toBeInTheDocument();
  });

  it('rechaza una respuesta de otro proyecto y permite reanalizar sin perder los archivos', async () => {
    ProjectFileImportAPI.analyze.mockResolvedValueOnce({ ...analyzed(), proyecto_id: 'otro-proyecto' });
    mount(); choose(); fireEvent.click(screen.getByRole('button', { name: 'Analizar archivos' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La respuesta no corresponde al proyecto actual');
    expect(screen.queryByRole('heading', { name: 'Revisar archivos antes de guardar' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar análisis' }));
    await screen.findByRole('heading', { name: 'Revisar archivos antes de guardar' });
  });

  it('ignora confirmaciones tardías de guardado después de salir del proyecto', async () => {
    let resolve; const onImported = vi.fn(); const onNotify = vi.fn();
    const view = mount({ onImported, onNotify }); choose(); await analyze();
    fireEvent.click(screen.getByLabelText('Incluir avance.docx'));
    ProjectFileImportAPI.save.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar archivos en este proyecto' }));
    expect(screen.getByRole('status')).toHaveTextContent('Guardando archivos');
    expect(screen.getByRole('button', { name: 'Guardar archivos en este proyecto' })).toBeDisabled();
    view.unmount();
    await act(async () => { resolve({ archivos_importados: 1, archivos_omitidos: 0, campos_registrados: 0 }); });
    expect(onImported).not.toHaveBeenCalled(); expect(onNotify).not.toHaveBeenCalled();
  });
});
