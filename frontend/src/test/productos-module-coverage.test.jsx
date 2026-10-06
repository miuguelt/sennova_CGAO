import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ProductosModule from '../components/products/ProductosModule';

vi.mock('../api/productos', () => ({ ProductosAPI: {
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), verificar: vi.fn(), generarDesdePlantilla: vi.fn(), importCVLaC: vi.fn(),
} }));
vi.mock('../api/proyectos', () => ({ ProyectosAPI: { list: vi.fn() } }));
vi.mock('../api/documentos', () => ({ DocumentosAPI: { upload: vi.fn() } }));
vi.mock('../components/ui/Modal', () => ({
  default: ({ isOpen, title, children, footer, onClose }) => isOpen ? (
    <section role="dialog" aria-label={title}><h2>{title}</h2>{children}{footer}<button onClick={onClose}>Cerrar modal</button></section>
  ) : null,
}));
vi.mock('../components/ui/Drawer', () => ({
  default: ({ isOpen, title, children, footer }) => isOpen ? (
    <aside role="dialog" aria-label={title}><h2>{title}</h2>{children}{footer}</aside>
  ) : null,
}));
vi.mock('../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, title, description, confirmText, onConfirm, onClose }) => isOpen ? (
    <section role="alertdialog" aria-label={title}><p>{description}</p><button onClick={onClose}>Cancelar confirmación</button><button onClick={onConfirm}>{confirmText}</button></section>
  ) : null,
}));

import { ProductosAPI } from '../api/productos';
import { ProyectosAPI } from '../api/proyectos';
import { DocumentosAPI } from '../api/documentos';

const products = [
  { id: 'prod-1', nombre: 'Artículo sobre agricultura sostenible', tipo: 'A1', categoria: 'A', descripcion: 'Resultados del estudio.', fecha_publicacion: '2026-02-15', doi: '10.1000/agro.1', url: 'https://repo.example/agro', proyecto_id: 'p-1', proyecto_nombre: 'Proyecto AgroTech', owner_id: 'owner-1', owner_nombre: 'Ana Investigadora', is_verificado: false, requisitos_cumplidos: {} },
  { id: 'prod-2', nombre: 'Software de trazabilidad', tipo: 'B1', categoria: 'B', descripcion: 'Aplicación para el campo.', proyecto_id: 'p-2', proyecto_nombre: 'Proyecto Digital', owner_id: 'owner-2', owner_nombre: 'Luis Investigador', is_verificado: true, requisitos_cumplidos: {} },
];
const projects = [
  { id: 'p-1', nombre: 'Proyecto AgroTech', nombre_corto: 'AgroTech', codigo_sgps: 'SGPS-01' },
  { id: 'p-2', nombre: 'Proyecto Digital', nombre_corto: 'Digital', codigo_sgps: 'SGPS-02' },
  { id: 'p-3', nombre: 'Proyecto sin productos', nombre_corto: 'Sin productos', codigo_sgps: 'SGPS-03' },
];

function configureApi() {
  ProductosAPI.list.mockResolvedValue(products);
  ProductosAPI.get.mockResolvedValue(products[0]);
  ProductosAPI.create.mockResolvedValue({ id: 'prod-new' });
  ProductosAPI.update.mockImplementation(async (id, data) => ({ ...products.find(product => product.id === id), ...data }));
  ProductosAPI.delete.mockResolvedValue({});
  ProductosAPI.verificar.mockResolvedValue({});
  ProductosAPI.generarDesdePlantilla.mockResolvedValue({});
  ProductosAPI.importCVLaC.mockResolvedValue({ importados: 3, errores: 1, message: 'CVLAC sincronizado' });
  ProyectosAPI.list.mockResolvedValue(projects);
  DocumentosAPI.upload.mockResolvedValue({ id: 'doc-1' });
}

describe('catálogo de productos de investigación', () => {
  beforeEach(() => { vi.clearAllMocks(); configureApi(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  it('filtra el catálogo, muestra el pool y vincula un proyecto mediante arrastre', async () => {
    const onNotify = vi.fn();
    render(<ProductosModule currentUser={{ id: 'owner-1', rol: 'investigador' }} onNotify={onNotify} />);
    expect(await screen.findByRole('heading', { name: 'Productos e Innovación' })).toBeVisible();
    expect(screen.queryByRole('option', { name: /D2.*Etapa Productiva/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Proyectos de Etapa Productiva SENA/i)).not.toBeInTheDocument();
    expect(screen.getByText('Artículo sobre agricultura sostenible')).toBeVisible();
    expect(screen.getByText('Software de trazabilidad')).toBeVisible();

    fireEvent.change(screen.getByPlaceholderText('Buscar productos...'), { target: { value: 'software' } });
    expect(screen.getByText('Software de trazabilidad')).toBeVisible();
    expect(screen.queryByText('Artículo sobre agricultura sostenible')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Buscar productos...'), { target: { value: '' } });
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'A1' } });
    expect(screen.getByText('Artículo sobre agricultura sostenible')).toBeVisible();
    expect(screen.queryByText('Software de trazabilidad')).not.toBeInTheDocument();
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('Filtrar productos por proyecto'), { target: { value: 'p-2' } });
    expect(screen.getByText('Software de trazabilidad')).toBeVisible();
    expect(screen.queryByText('Artículo sobre agricultura sostenible')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Filtrar productos por proyecto'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: 'Pool Proyectos' }));
    expect(screen.getByText('Proyectos Activos para Vincular')).toBeVisible();
    const content = screen.getByRole('heading', { name: 'Artículo sobre agricultura sostenible' }).closest('[class*="p-6 flex-1"]');
    const dropTarget = content.parentElement.parentElement;
    const transfer = { types: ['proyectoId'], getData: vi.fn(() => 'p-3') };
    fireEvent.dragOver(dropTarget, { dataTransfer: transfer });
    expect(screen.getByText('Soltar para vincular Proyecto')).toBeVisible();
    fireEvent.drop(dropTarget, { dataTransfer: transfer });
    await waitFor(() => expect(ProductosAPI.update).toHaveBeenCalledWith('prod-1', expect.objectContaining({ proyecto_id: 'p-3' })));
    expect(onNotify).toHaveBeenCalledWith('Proyecto vinculado al producto correctamente', 'success');
  });

  it('registra un producto en dos pasos y edita los datos de la persona responsable', async () => {
    const onNotify = vi.fn();
    render(<ProductosModule currentUser={{ id: 'owner-1', rol: 'investigador' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Productos e Innovación' });
    fireEvent.click(screen.getByRole('button', { name: 'Reportar Producto' }));
    fireEvent.change(screen.getByLabelText(/Nombre del Producto/), { target: { value: 'Prototipo de riego inteligente' } });
    fireEvent.click(screen.getByRole('button', { name: /B — Desarrollo Tecnológico/ }));
    fireEvent.click(screen.getByRole('button', { name: /B1 · Software/ }));
    fireEvent.change(screen.getByLabelText(/Proyecto Vinculado/), { target: { value: 'p-1' } });
    fireEvent.change(screen.getByLabelText('Estado de Verificación'), { target: { value: 'verificado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.change(screen.getByLabelText('URL de Repositorio o Publicación'), { target: { value: 'https://repo.example/irrigacion' } });
    fireEvent.change(screen.getByLabelText('DOI / Código de Registro'), { target: { value: '10.1000/riego' } });
    fireEvent.change(screen.getByLabelText('Resumen Técnico y Resultados'), { target: { value: 'Ahorro de agua.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Producto' }));
    await waitFor(() => expect(ProductosAPI.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Prototipo de riego inteligente', categoria: 'B', tipo: 'B1', proyecto_id: 'p-1', url: 'https://repo.example/irrigacion', doi: '10.1000/riego' })));
    expect(onNotify).toHaveBeenCalledWith('Nuevo producto registrado en el ecosistema', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del producto Artículo sobre agricultura sostenible' }));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Información' }));
    fireEvent.change(screen.getByLabelText(/Nombre del Producto/), { target: { value: 'Artículo actualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(ProductosAPI.update).toHaveBeenCalledWith('prod-1', expect.objectContaining({ nombre: 'Artículo actualizado' })));
    expect(onNotify).toHaveBeenCalledWith('Producto institucional actualizado', 'success');
  });

  it('actualiza requisitos y adjunta evidencia, y rechaza archivos mayores a diez MB', async () => {
    const onNotify = vi.fn();
    const { container } = render(<ProductosModule currentUser={{ id: 'owner-1', rol: 'investigador' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Productos e Innovación' });
    fireEvent.click(screen.getByRole('heading', { name: 'Artículo sobre agricultura sostenible' }));
    expect(await screen.findByRole('dialog', { name: 'Artículo sobre agricultura sostenible' })).toBeVisible();
    expect(screen.getByText('Descripción Técnica')).toBeVisible();
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    await waitFor(() => expect(ProductosAPI.update).toHaveBeenCalledWith('prod-1', expect.objectContaining({ requisitos_cumplidos: { req_0: true } })));

    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [new File(['evidencia'], 'evidencia.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(DocumentosAPI.upload).toHaveBeenCalledWith(expect.any(FormData)));
    expect(onNotify).toHaveBeenCalledWith('Evidencia subida exitosamente', 'success');

    const oversized = new File([''], 'pesado.pdf', { type: 'application/pdf' });
    Object.defineProperty(oversized, 'size', { value: 10 * 1024 * 1024 + 1 });
    fireEvent.change(fileInput, { target: { files: [oversized] } });
    expect(onNotify).toHaveBeenCalledWith('El archivo excede los 10MB permitidos', 'error');
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog', { name: 'Artículo sobre agricultura sostenible' })).not.toBeInTheDocument();
  });

  it('permite al administrador verificar, revocar y eliminar productos', async () => {
    const onNotify = vi.fn();
    render(<ProductosModule currentUser={{ id: 'admin', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Productos e Innovación' });
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del producto Artículo sobre agricultura sostenible' }));
    fireEvent.click(screen.getByRole('button', { name: 'Verificar Producto' }));
    await waitFor(() => expect(ProductosAPI.verificar).toHaveBeenCalledWith('prod-1', true));
    expect(onNotify).toHaveBeenCalledWith('Producto verificado satisfactoriamente', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del producto Software de trazabilidad' }));
    fireEvent.click(screen.getByRole('button', { name: 'Revocar Verificación' }));
    await waitFor(() => expect(ProductosAPI.verificar).toHaveBeenCalledWith('prod-2', false));
    expect(onNotify).toHaveBeenCalledWith('Verificación revocada', 'success');

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del producto Artículo sobre agricultura sostenible' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar Producto' })[0]);
    fireEvent.click(within(screen.getByRole('alertdialog', { name: '¿Eliminar Producto?' })).getByRole('button', { name: 'Eliminar Producto' }));
    await waitFor(() => expect(ProductosAPI.delete).toHaveBeenCalledWith('prod-1'));
    expect(onNotify).toHaveBeenCalledWith('Producto eliminado del catálogo', 'success');
  });

  it('importa productos desde CVLAC y genera proyecciones para un proyecto vacío', async () => {
    const onNotify = vi.fn();
    render(<ProductosModule currentUser={{ id: 'investigator', rol: 'investigador' }} onNotify={onNotify} />);
    await screen.findByRole('heading', { name: 'Productos e Innovación' });
    fireEvent.click(screen.getByRole('button', { name: 'Importar CVLAC' }));
    fireEvent.change(screen.getByLabelText('URL de CVLAC'), { target: { value: 'https://cvlac.example/perfil' } });
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar Sincronización' }));
    await waitFor(() => expect(ProductosAPI.importCVLaC).toHaveBeenCalledWith('https://cvlac.example/perfil'));
    expect(screen.getByText('Sincronización Exitosa')).toBeVisible();
    expect(screen.getByText('3')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    fireEvent.change(screen.getByLabelText('Filtrar productos por proyecto'), { target: { value: 'p-3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Auto-Proyectar Resultados' }));
    expect(screen.getByRole('alertdialog', { name: '¿Generar productos proyectados?' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Generar' }));
    await waitFor(() => expect(ProductosAPI.generarDesdePlantilla).toHaveBeenCalledWith('p-3'));
    expect(onNotify).toHaveBeenCalledWith('Productos proyectados generados exitosamente', 'success');
  });
});
