import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ProjectEvidenceFile from '../components/projects/ProjectEvidenceFile';
import { ProyectosAPI } from '../api/proyectos';
import { DocumentosAPI } from '../api/documentos';
import { emitDataRefresh } from '../utils/dataRefresh';

vi.mock('../api/proyectos', () => ({ ProyectosAPI: { getExpediente: vi.fn(), downloadExpediente: vi.fn() } }));
vi.mock('../api/documentos', () => ({ DocumentosAPI: { upload: vi.fn(), download: vi.fn() } }));

const folders = ['1ProyectoFomulado', '2ActadeInicio', '3Productos', '4InformesBimensuales', '5ActaCierre', '6EvidenciasFotograficas'];
const ids = ['formulacion', 'inicio', 'productos', 'informes', 'cierre', 'evidencias'];
const types = ['formulacion_proyecto', 'acta_inicio', 'producto_resultado', 'informe_bimensual', 'acta_cierre', 'evidencia_fotografica'];
const result = () => ({ proyecto_id: 'p-1', nombre: 'Proyecto agroindustrial', codigo_sgps: '123', completo: false, porcentaje_completitud: 0, pendientes: ['Registre el objetivo general.'], etapas: folders.map((carpeta, index) => ({ id: ids[index], carpeta, titulo: `Etapa ${index + 1}`, tipo_documento: types[index], guia: `Guía institucional ${index + 1}`, completo: false, documentos: [], faltantes: [`Adjunte la evidencia ${index + 1}.`], ...(index === 3 ? { informes_esperados: 6, bimestres_pendientes: [1, 2, 3, 4, 5, 6] } : {}) })) });
const mount = (props = {}) => render(<ProjectEvidenceFile projectId="p-1" currentUser={{ rol: 'investigador' }} {...props} />);

beforeEach(() => {
  vi.clearAllMocks();
  ProyectosAPI.getExpediente.mockResolvedValue(result());
  DocumentosAPI.upload.mockResolvedValue({ id: 'new' });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:expediente');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('Expediente de evidencias del proyecto', () => {
  it('presenta las seis carpetas exactas, la guía y los pendientes del servidor', async () => {
    mount();
    expect(screen.getByRole('status')).toHaveTextContent('Consultando expediente');
    for (const folder of folders) expect(await screen.findByText(folder)).toBeInTheDocument();
    expect(screen.getByText('Guía institucional 4')).toBeInTheDocument();
    expect(screen.getByText('Registre el objetivo general.')).toBeInTheDocument();
    expect(screen.getByText('Adjunte la evidencia 5.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByRole('button', { name: 'Descargar expediente parcial (ZIP)' })).toBeEnabled();
  });

  it('explica el alcance documental y conserva visibles los archivos adicionales', async () => {
    const data = result();
    data.alcance = 'Las firmas requieren revisión del responsable.';
    data.documentos_sin_clasificar = [{ id: 'extra-1', nombre_archivo: 'anexo-institucional.pdf' }];
    ProyectosAPI.getExpediente.mockResolvedValue(data);
    mount();
    expect(await screen.findByText('Las firmas requieren revisión del responsable.')).toBeInTheDocument();
    expect(screen.getByText('anexo-institucional.pdf')).toBeInTheDocument();
    expect(screen.getByText(/Se conservan en el ZIP y requieren clasificación/)).toBeInTheDocument();
  });

  it('carga archivos en su etapa con descripción y refresca el diagnóstico confirmado', async () => {
    const notify = vi.fn();
    mount({ onNotify: notify });
    const card = await screen.findByRole('region', { name: 'Etapa 4' });
    const file = new File(['informe'], 'enero-febrero.pdf', { type: 'application/pdf' });
    fireEvent.change(within(card).getByLabelText('Archivo de Etapa 4'), { target: { files: [file] } });
    fireEvent.change(within(card).getByLabelText('Descripción de Etapa 4'), { target: { value: 'Enero y febrero de 2026' } });
    fireEvent.change(within(card).getByLabelText('Número de bimestre'), { target: { value: '1' } });
    fireEvent.click(within(card).getByRole('button', { name: 'Adjuntar documento' }));
    await waitFor(() => expect(DocumentosAPI.upload).toHaveBeenCalledOnce());
    const payload = DocumentosAPI.upload.mock.calls[0][0];
    expect(payload.get('file')).toBe(file);
    expect(payload.get('entidad_tipo')).toBe('proyecto');
    expect(payload.get('entidad_id')).toBe('p-1');
    expect(payload.get('tipo')).toBe('informe_bimensual');
    expect(payload.get('descripcion')).toBe('Enero y febrero de 2026');
    expect(payload.get('periodo_bimestre')).toBe('1');
    await waitFor(() => expect(ProyectosAPI.getExpediente).toHaveBeenCalledTimes(2));
    expect(notify).toHaveBeenCalledWith('Documento adjuntado al expediente.', 'success');
    expect(screen.getByRole('status')).toHaveTextContent('Documento adjuntado');
  });

  it('rechaza archivos de formato no admitido y mayores a 10 MB antes de subirlos', async () => {
    mount();
    const card = await screen.findByRole('region', { name: 'Etapa 1' });
    const input = within(card).getByLabelText('Archivo de Etapa 1');
    fireEvent.change(input, { target: { files: [new File(['x'], 'archivo.exe')] } });
    fireEvent.click(within(card).getByRole('button', { name: 'Adjuntar documento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Seleccione un archivo PDF');
    const large = new File(['x'], 'grande.pdf');
    Object.defineProperty(large, 'size', { value: 10 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [large] } });
    fireEvent.click(within(card).getByRole('button', { name: 'Adjuntar documento' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('10 MB');
    expect(DocumentosAPI.upload).not.toHaveBeenCalled();
  });

  it('valida cada bimestre y acepta un archivo de exactamente 10 MB', async () => {
    mount();
    const card = await screen.findByRole('region', { name: 'Etapa 4' });
    const file = new File(['informe'], 'informe.PDF');
    Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 });
    const form = within(card).getByLabelText('Archivo de Etapa 4').closest('form');
    fireEvent.submit(form);
    expect(await screen.findByRole('alert')).toHaveTextContent('Seleccione un archivo');
    fireEvent.change(within(card).getByLabelText('Archivo de Etapa 4'), { target: { files: [file] } });
    for (const period of ['', '0', '1.5', '7']) {
      fireEvent.change(within(card).getByLabelText('Número de bimestre'), { target: { value: period } });
      fireEvent.submit(form);
      expect(await screen.findByRole('alert')).toHaveTextContent('número de bimestre válido');
    }
    expect(DocumentosAPI.upload).not.toHaveBeenCalled();
    fireEvent.change(within(card).getByLabelText('Número de bimestre'), { target: { value: '6' } });
    fireEvent.submit(form);
    await waitFor(() => expect(DocumentosAPI.upload).toHaveBeenCalledOnce());
    expect(DocumentosAPI.upload.mock.calls[0][0].get('periodo_bimestre')).toBe('6');
  });

  it('permite adjuntar el informe final además del acta de cierre', async () => {
    mount();
    const card = await screen.findByRole('region', { name: 'Etapa 5' });
    fireEvent.change(within(card).getByLabelText('Documento de cierre'), { target: { value: 'informe_final' } });
    fireEvent.change(within(card).getByLabelText('Archivo de Etapa 5'), { target: { files: [new File(['informe'], 'informe-final.pdf')] } });
    fireEvent.click(within(card).getByRole('button', { name: 'Adjuntar documento' }));
    await waitFor(() => expect(DocumentosAPI.upload).toHaveBeenCalledOnce());
    expect(DocumentosAPI.upload.mock.calls[0][0].get('tipo')).toBe('informe_final');
  });

  it('adjunta un soporte al producto seleccionado para que la verificación lo encuentre', async () => {
    const data = result();
    data.etapas[2].productos = [{ id: 'producto-1', nombre: 'Prototipo agroindustrial', soporte_disponible: false }];
    ProyectosAPI.getExpediente.mockResolvedValue(data);
    mount();
    const card = await screen.findByRole('region', { name: 'Etapa 3' });
    fireEvent.change(within(card).getByLabelText('Destino del soporte'), { target: { value: 'producto-1' } });
    fireEvent.change(within(card).getByLabelText('Archivo de Etapa 3'), { target: { files: [new File(['soporte'], 'prototipo.pdf')] } });
    fireEvent.click(within(card).getByRole('button', { name: 'Adjuntar documento' }));
    await waitFor(() => expect(DocumentosAPI.upload).toHaveBeenCalledOnce());
    const payload = DocumentosAPI.upload.mock.calls[0][0];
    expect(payload.get('tipo')).toBe('soporte_minciencias');
    expect(payload.get('entidad_tipo')).toBe('producto');
    expect(payload.get('entidad_id')).toBe('producto-1');
    expect(within(card).getByText(/Registre y verifique los productos/)).toBeInTheDocument();
  });

  it('permite reintentar una consulta fallida y protege los permisos del aprendiz', async () => {
    ProyectosAPI.getExpediente.mockRejectedValueOnce(new Error('Servicio no disponible.'));
    mount({ currentUser: { rol: 'aprendiz' } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Servicio no disponible.');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar consulta' }));
    expect(await screen.findByText(folders[0])).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adjuntar documento' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Archivo de Etapa 1')).not.toBeInTheDocument();
  });

  it('descarga el ZIP parcial con su nombre y muestra el resultado', async () => {
    ProyectosAPI.downloadExpediente.mockResolvedValue(new Blob(['zip']));
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Descargar expediente parcial (ZIP)' }));
    await waitFor(() => expect(ProyectosAPI.downloadExpediente).toHaveBeenCalledWith('p-1'));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Descarga del expediente parcial iniciada');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:expediente');
  });

  it('distingue documentos disponibles de archivos faltantes y descarga el adjunto original', async () => {
    const data = result();
    data.completo = true;
    data.porcentaje_completitud = 100;
    data.etapas[0].completo = true;
    data.etapas[0].documentos = [{ id: 'doc-1', nombre_archivo: 'original.docx', disponible: true, descripcion: 'Versión firmada' }, { id: 'doc-2', nombre_archivo: 'perdido.pdf', disponible: false }];
    data.etapas[3].documentos = [{ id: 'informe-1', nombre_archivo: 'informe.pdf', disponible: true, periodo_bimestre: 1 }];
    ProyectosAPI.getExpediente.mockResolvedValue(data);
    DocumentosAPI.download.mockResolvedValue({ nombre_archivo: 'original.docx', data_base64: btoa('contenido'), content_type: 'application/octet-stream' });
    mount();
    expect(await screen.findByRole('button', { name: 'Descargar expediente (ZIP)' })).toBeInTheDocument();
    expect(screen.getByText('Versión firmada')).toBeInTheDocument();
    expect(screen.getByText('Bimestre 1')).toBeInTheDocument();
    expect(screen.getByText('Archivo no disponible. Adjunte una copia.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar perdido.pdf' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Descargar original.docx' }));
    await waitFor(() => expect(DocumentosAPI.download).toHaveBeenCalledWith('doc-1'));
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
  });

  it('informa errores de descarga y de carga sin confirmar un éxito', async () => {
    const notify = vi.fn();
    ProyectosAPI.downloadExpediente.mockRejectedValue(new Error('ZIP no disponible.'));
    DocumentosAPI.upload.mockRejectedValue(new Error('No tiene permiso para adjuntar.'));
    mount({ onNotify: notify });
    fireEvent.click(await screen.findByRole('button', { name: 'Descargar expediente parcial (ZIP)' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('ZIP no disponible.');
    const card = screen.getByRole('region', { name: 'Etapa 2' });
    fireEvent.change(within(card).getByLabelText('Archivo de Etapa 2'), { target: { files: [new File(['acta'], 'acta.pdf')] } });
    fireEvent.click(within(card).getByRole('button', { name: 'Adjuntar documento' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('No tiene permiso para adjuntar.'));
    expect(notify).not.toHaveBeenCalledWith(expect.any(String), 'success');
  });

  it('revalida ante mutaciones de recursos relacionados y elimina la suscripción al salir', async () => {
    const view = mount();
    await screen.findByText(folders[0]);
    emitDataRefresh({ endpoint: '/documentos/upload', method: 'POST' });
    await waitFor(() => expect(ProyectosAPI.getExpediente).toHaveBeenCalledTimes(2));
    emitDataRefresh({ endpoint: '/usuarios/u-1', method: 'PUT' });
    expect(ProyectosAPI.getExpediente).toHaveBeenCalledTimes(2);
    view.unmount();
    emitDataRefresh({ endpoint: '/proyectos/p-1', method: 'PUT' });
    expect(ProyectosAPI.getExpediente).toHaveBeenCalledTimes(2);
  });

  it('ignora las consultas tardías de otro proyecto y de componentes desmontados', async () => {
    let resolveFirst;
    ProyectosAPI.getExpediente.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; }));
    const view = mount();
    const data = result();
    data.pendientes = ['Pendiente del proyecto vigente.'];
    ProyectosAPI.getExpediente.mockResolvedValue(data);
    view.rerender(<ProjectEvidenceFile projectId="p-2" currentUser={{ rol: 'admin' }} />);
    expect(await screen.findByText('Pendiente del proyecto vigente.')).toBeInTheDocument();
    await act(async () => { resolveFirst(result()); });
    expect(screen.queryByText('Registre el objetivo general.')).not.toBeInTheDocument();
    expect(screen.getByText('Pendiente del proyecto vigente.')).toBeInTheDocument();
    view.unmount();
  });

  it('muestra un error si el adjunto carece de datos descargables', async () => {
    const data = result();
    data.etapas[0].documentos = [{ id: 'doc-1', nombre_archivo: 'original.docx', disponible: true }];
    ProyectosAPI.getExpediente.mockResolvedValue(data);
    DocumentosAPI.download.mockResolvedValue({});
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Descargar original.docx' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El documento no contiene datos descargables.');
    expect(HTMLAnchorElement.prototype.click).not.toHaveBeenCalled();
  });
});
