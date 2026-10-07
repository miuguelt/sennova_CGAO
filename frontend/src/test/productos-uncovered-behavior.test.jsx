import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ProductosModule from '../components/products/ProductosModule';

vi.mock('../api/productos', () => ({ ProductosAPI: {
  list: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), verificar: vi.fn(), generarDesdePlantilla: vi.fn(), importCVLaC: vi.fn(),
} }));
vi.mock('../api/proyectos', () => ({ ProyectosAPI: { list: vi.fn() } }));
vi.mock('../api/documentos', () => ({ DocumentosAPI: { upload: vi.fn() } }));
vi.mock('../api/config', () => ({ CVLAC_URL_PLACEHOLDER: 'https://cvlac.example/perfil' }));
vi.mock('../components/ui/Modal', () => ({
  default: ({ isOpen, title, children, footer, onClose }) => isOpen ? (
    <section role="dialog" aria-label={title}>
      <h2>{title}</h2>{children}{footer}<button onClick={onClose}>Cerrar modal</button>
    </section>
  ) : null,
}));
vi.mock('../components/ui/Drawer', () => ({
  default: ({ isOpen, title, children, footer, onClose }) => isOpen ? (
    <aside role="dialog" aria-label={title}>
      <h2>{title}</h2>{children}{footer}<button onClick={onClose}>Cerrar ficha técnica</button>
    </aside>
  ) : null,
}));
vi.mock('../components/ui/ConfirmDialog', () => ({
  default: ({ isOpen, title, description, confirmText, onConfirm, onClose }) => isOpen ? (
    <section role="alertdialog" aria-label={title}>
      <p>{description}</p><button onClick={onClose}>Cancelar confirmación</button><button onClick={onConfirm}>{confirmText}</button>
    </section>
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

async function renderLoaded(props = {}) {
  const result = render(<ProductosModule currentUser={{ id: 'owner-1', rol: 'investigador' }} {...props} />);
  await screen.findByRole('heading', { name: 'Productos e Innovación' });
  await screen.findByText('Artículo sobre agricultura sostenible');
  return result;
}

function productFooter(name) {
  const heading = screen.getByRole('heading', { name });
  return heading.parentElement.parentElement.parentElement.querySelector('.border-t');
}

describe('comportamientos pendientes de productos e innovación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureApi();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('atiende acciones para abrir un producto existente, consultar uno remoto y descartar fallos remotos', async () => {
    const onActionHandled = vi.fn();
    const { rerender } = await renderLoaded({ onActionHandled });
    expect(ProductosAPI.get).not.toHaveBeenCalled();

    rerender(
      <ProductosModule
        currentUser={{ id: 'owner-1', rol: 'investigador' }}
        onActionHandled={onActionHandled}
        initialAction={{ form: 'view', data: { id: 'prod-1' } }}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Artículo sobre agricultura sostenible' })).toBeVisible();
    expect(onActionHandled).toHaveBeenCalled();
    expect(ProductosAPI.get).not.toHaveBeenCalled();

    cleanup();
    vi.clearAllMocks();
    configureApi();
    const remote = { ...products[0], id: 'remote-9', nombre: 'Producto cargado por identificador' };
    ProductosAPI.get.mockResolvedValue(remote);
    const handledRemote = vi.fn();
    render(
      <ProductosModule
        currentUser={{ id: 'owner-1', rol: 'investigador' }}
        onActionHandled={handledRemote}
        initialAction={{ form: 'view', data: { id: 9 } }}
      />,
    );
    expect(await screen.findByRole('dialog', { name: 'Producto cargado por identificador' })).toBeVisible();
    expect(ProductosAPI.get).toHaveBeenCalledWith('9');
    expect(handledRemote).toHaveBeenCalled();

    cleanup();
    vi.clearAllMocks();
    configureApi();
    ProductosAPI.get.mockRejectedValue(new Error('No encontrado'));
    const handledFailed = vi.fn();
    render(
      <ProductosModule
        currentUser={{ id: 'owner-1', rol: 'investigador' }}
        onActionHandled={handledFailed}
        initialAction={{ form: 'view', data: { id: 'missing-1' } }}
      />,
    );
    await screen.findByRole('heading', { name: 'Productos e Innovación' });
    await waitFor(() => expect(ProductosAPI.get).toHaveBeenCalledWith('missing-1'));
    expect(screen.queryByRole('dialog', { name: 'Artículo sobre agricultura sostenible' })).not.toBeInTheDocument();
    expect(handledFailed).not.toHaveBeenCalled();
  });

  it('cierra el menú al hacer clic afuera y abre la ficha desde el menú o la tarjeta', async () => {
    await renderLoaded();
    const options = screen.getByRole('button', { name: 'Más opciones del producto Artículo sobre agricultura sostenible' });
    fireEvent.click(options);
    expect(screen.getByRole('button', { name: 'Ver Ficha Técnica' })).toBeVisible();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('button', { name: 'Ver Ficha Técnica' })).not.toBeInTheDocument();

    fireEvent.click(options);
    fireEvent.click(screen.getByRole('button', { name: 'Ver Ficha Técnica' }));
    const details = screen.getByRole('dialog', { name: 'Artículo sobre agricultura sostenible' });
    expect(within(details).getByText('Resultados del estudio.')).toBeVisible();
    fireEvent.click(within(details).getByRole('button', { name: 'Cerrar ficha técnica' }));
    expect(screen.queryByRole('dialog', { name: 'Artículo sobre agricultura sostenible' })).not.toBeInTheDocument();

    fireEvent.click(productFooter('Artículo sobre agricultura sostenible'));
    expect(screen.getByRole('dialog', { name: 'Artículo sobre agricultura sostenible' })).toBeVisible();
  });

  it('inicia el arrastre desde el catálogo y limpia el resaltado si se deja de arrastrar', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Pool Proyectos' }));
    expect(screen.getByText('Proyectos Activos para Vincular')).toBeVisible();
    const projectPool = screen.getByText('Proyectos Activos para Vincular').parentElement.parentElement;
    const projectChip = within(projectPool).getByText('AgroTech').closest('[draggable="true"]');
    const setData = vi.fn();
    fireEvent.dragStart(projectChip, { dataTransfer: { setData } });
    expect(setData).toHaveBeenCalledWith('proyectoId', 'p-1');

    const content = screen.getByRole('heading', { name: 'Artículo sobre agricultura sostenible' }).closest('[class*="p-6 flex-1"]');
    const dropTarget = content.parentElement.parentElement;
    fireEvent.dragOver(dropTarget, { dataTransfer: { types: ['proyectoId'] } });
    expect(screen.getByText('Soltar para vincular Proyecto')).toBeVisible();
    fireEvent.dragLeave(dropTarget);
    expect(screen.queryByText('Soltar para vincular Proyecto')).not.toBeInTheDocument();
    expect(ProductosAPI.update).not.toHaveBeenCalled();
  });

  it('edita y verifica desde la ficha, y activa el control de adjuntar evidencia', async () => {
    const onNotify = vi.fn();
    await renderLoaded({ currentUser: { id: 'admin', rol: 'admin' }, onNotify });
    fireEvent.click(productFooter('Artículo sobre agricultura sostenible'));
    const details = screen.getByRole('dialog', { name: 'Artículo sobre agricultura sostenible' });

    const evidenceInput = details.querySelector('input[type="file"]');
    const clickInput = vi.spyOn(evidenceInput, 'click');
    fireEvent.click(within(details).getAllByTitle('Adjuntar Evidencia')[0]);
    expect(clickInput).toHaveBeenCalledOnce();

    fireEvent.click(within(details).getByRole('button', { name: 'Verificar' }));
    await waitFor(() => expect(ProductosAPI.verificar).toHaveBeenCalledWith('prod-1', true));
    expect(onNotify).toHaveBeenCalledWith('Producto verificado satisfactoriamente', 'success');

    fireEvent.click(productFooter('Artículo sobre agricultura sostenible'));
    const reopenedDetails = screen.getByRole('dialog', { name: 'Artículo sobre agricultura sostenible' });
    fireEvent.click(within(reopenedDetails).getByRole('button', { name: 'Editar Producto' }));
    expect(screen.getByRole('dialog', { name: 'Actualizar Producto' })).toBeVisible();
  });

  it('permite volver y cancelar en el formulario y restablece el modo de edición al cerrarlo', async () => {
    await renderLoaded();
    fireEvent.click(productFooter('Artículo sobre agricultura sostenible'));
    fireEvent.click(screen.getByRole('button', { name: 'Editar Producto' }));
    const editForm = screen.getByRole('dialog', { name: 'Actualizar Producto' });
    fireEvent.click(within(editForm).getByRole('button', { name: 'Cerrar modal' }));
    expect(screen.queryByRole('dialog', { name: 'Actualizar Producto' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reportar Producto' }));
    const createForm = screen.getByRole('dialog', { name: 'Reportar Innovación' });
    fireEvent.change(within(createForm).getByPlaceholderText('Ej: Prototipo de sensor IoT...'), { target: { value: 'Prototipo de sensores' } });
    fireEvent.change(within(createForm).getByLabelText(/Proyecto Vinculado/), { target: { value: 'p-1' } });
    fireEvent.click(within(createForm).getByRole('button', { name: 'Siguiente' }));
    expect(within(createForm).getByText(/Soportes de seguimiento para A1/)).toBeVisible();
    fireEvent.click(within(createForm).getByRole('button', { name: 'Anterior' }));
    expect(within(createForm).getByPlaceholderText('Ej: Prototipo de sensor IoT...')).toHaveValue('Prototipo de sensores');
    fireEvent.click(within(createForm).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog', { name: 'Reportar Innovación' })).not.toBeInTheDocument();
  });

  it('cierra la importación desde su ventana y limpia resultados, y descarta diálogos de confirmación', async () => {
    await renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Importar CVLAC' }));
    let importDialog = screen.getByRole('dialog', { name: 'Importar desde CVLaC' });
    fireEvent.change(within(importDialog).getByLabelText('URL de CVLAC'), { target: { value: 'https://cvlac.example/investigadora' } });
    fireEvent.click(within(importDialog).getByRole('button', { name: 'Iniciar Sincronización' }));
    expect(await within(importDialog).findByText('Sincronización Exitosa')).toBeVisible();
    fireEvent.click(within(importDialog).getByRole('button', { name: 'Cerrar modal' }));
    expect(screen.queryByRole('dialog', { name: 'Importar desde CVLaC' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Importar CVLAC' }));
    importDialog = screen.getByRole('dialog', { name: 'Importar desde CVLaC' });
    expect(within(importDialog).queryByText('Sincronización Exitosa')).not.toBeInTheDocument();
    expect(within(importDialog).getByLabelText('URL de CVLAC')).toHaveValue('https://cvlac.example/investigadora');
    fireEvent.click(within(importDialog).getByRole('button', { name: 'Cancelar' }));

    fireEvent.click(screen.getByRole('button', { name: 'Más opciones del producto Artículo sobre agricultura sostenible' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Producto' }));
    const deleteDialog = screen.getByRole('alertdialog', { name: '¿Eliminar Producto?' });
    fireEvent.click(within(deleteDialog).getByRole('button', { name: 'Cancelar confirmación' }));
    expect(screen.queryByRole('alertdialog', { name: '¿Eliminar Producto?' })).not.toBeInTheDocument();
    expect(ProductosAPI.delete).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Filtrar productos por proyecto'), { target: { value: 'p-3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Auto-Proyectar Resultados' }));
    const templateDialog = screen.getByRole('alertdialog', { name: '¿Generar productos proyectados?' });
    expect(within(templateDialog).getByText(/Sin productos/)).toBeVisible();
    fireEvent.click(within(templateDialog).getByRole('button', { name: 'Cancelar confirmación' }));
    expect(screen.queryByRole('alertdialog', { name: '¿Generar productos proyectados?' })).not.toBeInTheDocument();
    expect(ProductosAPI.generarDesdePlantilla).not.toHaveBeenCalled();
  });
});
