import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import FileUpload from '../components/common/FileUpload';
import GlobalSearch from '../components/common/GlobalSearch';
import InfraHealthCard from '../components/admin/InfraHealthCard';
import SystemStatusCards from '../components/settings/SystemStatusCards';

vi.mock('../api/dashboard', () => ({
  DashboardAPI: { globalSearch: vi.fn() },
}));
vi.mock('../api/system', () => ({
  SystemAPI: {
    getHealth: vi.fn(),
    getBackup: vi.fn(),
    clearCache: vi.fn(),
  },
}));

import { DashboardAPI } from '../api/dashboard';
import { SystemAPI } from '../api/system';

describe('carga de archivos', () => {
  afterEach(cleanup);

  it('carga, muestra y permite quitar una vista previa del archivo', async () => {
    const onUpload = vi.fn();
    const { container } = render(<FileUpload onUpload={onUpload} label="Adjuntar soporte" />);
    const file = new File(['soporte institucional'], 'soporte.pdf', { type: 'application/pdf' });

    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });

    await screen.findByText('soporte.pdf');
    expect(onUpload).toHaveBeenCalledWith(expect.objectContaining({
      name: 'soporte.pdf',
      type: 'application/pdf',
      size: file.size,
      data: expect.stringContaining('data:application/pdf;base64,'),
    }));

    fireEvent.click(screen.getByRole('button', { name: 'Quitar archivo' }));
    expect(screen.queryByText('soporte.pdf')).not.toBeInTheDocument();
  });

  it('rechaza archivos grandes y acepta arrastrar archivos permitidos', async () => {
    const onUpload = vi.fn();
    const onNotify = vi.fn();
    const { container } = render(<FileUpload onUpload={onUpload} onNotify={onNotify} maxSize={1} />);
    const largeFile = new File([new Uint8Array(1024 * 1024 + 1)], 'grande.pdf', { type: 'application/pdf' });
    const zone = screen.getByRole('button', { name: /Subir archivo — haz clic/i });

    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [largeFile] } });
    expect(onNotify).toHaveBeenCalledWith('Archivo demasiado grande. Máximo 1 MB', 'error');
    expect(onUpload).not.toHaveBeenCalled();

    fireEvent.dragOver(zone);
    expect(zone).toHaveClass('border-emerald-400');
    fireEvent.dragLeave(zone);
    expect(zone).not.toHaveClass('border-emerald-400');

    const file = new File(['acta'], 'acta.pdf', { type: 'application/pdf' });
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    await screen.findByText('acta.pdf');
    expect(onUpload).toHaveBeenCalledWith(expect.objectContaining({ name: 'acta.pdf' }));
  });

  it('abre el selector desde el teclado y tolera eventos sin archivo', () => {
    const { container } = render(<FileUpload onUpload={vi.fn()} />);
    const input = container.querySelector('input[type="file"]');
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    const zone = screen.getByRole('button', { name: /Subir archivo — haz clic/i });

    fireEvent.keyDown(zone, { key: 'Enter' });
    fireEvent.keyDown(zone, { key: ' ' });
    fireEvent.keyDown(zone, { key: 'Escape' });
    fireEvent.change(input, { target: { files: [] } });

    expect(click).toHaveBeenCalledTimes(2);
  });
});

describe('búsqueda global', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('busca después de la pausa, navega con teclado y abre el resultado elegido', async () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    DashboardAPI.globalSearch.mockResolvedValue({
      results: [
        { id: 'p1', type: 'proyecto', title: 'Proyecto de riego', subtitle: 'Semillero de agua' },
        { id: 'i1', type: 'persona', title: 'Investigadora sin icono', subtitle: 'CGAO' },
      ],
    });
    render(<GlobalSearch isOpen onClose={onClose} onNavigate={onNavigate} />);
    const input = screen.getByRole('combobox');

    fireEvent.change(input, { target: { value: 'riego' } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    const firstResult = screen.getByRole('option', { name: /Proyecto de riego/ });
    expect(DashboardAPI.globalSearch).toHaveBeenCalledWith('riego');
    expect(screen.getByText('2 resultados')).toBeVisible();

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: /Investigadora sin icono/ })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(window, { key: 'ArrowUp' });
    expect(firstResult).toHaveAttribute('aria-selected', 'true');
    fireEvent.click(firstResult);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }));
  });

  it('muestra instrucciones, limpia la búsqueda y permite reintentar ante error', async () => {
    const onClose = vi.fn();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    DashboardAPI.globalSearch.mockRejectedValueOnce(new Error('servidor fuera de línea'));
    DashboardAPI.globalSearch.mockResolvedValueOnce({ results: [] });
    render(<GlobalSearch isOpen onClose={onClose} />);
    const input = screen.getByRole('combobox');

    expect(screen.getByText(/Escribe al menos 2 caracteres/)).toBeVisible();
    fireEvent.change(input, { target: { value: 'xy' } });
    await act(async () => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.getByText('No se pudo completar la búsqueda')).toBeVisible();
    expect(screen.getByText('No se pudo conectar con el servidor de búsqueda.')).toBeVisible();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(DashboardAPI.globalSearch).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Sin resultados para "xy"')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar búsqueda' }));
    expect(input).toHaveValue('');
    fireEvent.click(screen.getByRole('dialog', { name: 'Búsqueda global' }).firstChild);
    expect(onClose).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
  });
});

describe('estado de infraestructura', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('presenta los indicadores disponibles y los que aún no llegan', () => {
    const { rerender } = render(<InfraHealthCard stats={{ db_latency_ms: 18, system_status: 'operativo', disk_usage_pct: 62 }} />);

    expect(screen.getByText('18 ms')).toBeVisible();
    expect(screen.getByText('operativo')).toBeVisible();
    expect(screen.getByText('62%')).toBeVisible();
    expect(screen.getByText('Sistemas reportan estado nominal.')).toBeVisible();

    rerender(<InfraHealthCard />);
    expect(screen.getAllByText('N/A')).toHaveLength(2);
    expect(screen.getByText('N/D')).toBeVisible();
  });

  it('informa éxito y error al generar respaldos y depurar caché', async () => {
    const onNotify = vi.fn();
    SystemAPI.getHealth.mockResolvedValue({ status: 'healthy' });
    SystemAPI.getBackup.mockResolvedValueOnce({ url: '/descargas/respaldo.sql' }).mockResolvedValueOnce({});
    SystemAPI.clearCache.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error('fallo interno'));
    render(<SystemStatusCards onNotify={onNotify} />);

    await screen.findByText('ONLINE');
    fireEvent.click(screen.getByText('Exportar Dump SQL'));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Backup iniciado en servidor: /descargas/respaldo.sql', 'success'));
    fireEvent.click(screen.getByText('Exportar Dump SQL'));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Copia de seguridad generada localmente', 'success'));
    fireEvent.click(screen.getByText('Limpiar Caché RAG'));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Caché del sistema depurada correctamente', 'success'));
    fireEvent.click(screen.getByText('Limpiar Caché RAG'));
    await waitFor(() => expect(onNotify).toHaveBeenCalledWith('Error al limpiar caché', 'error'));
  });

  it('muestra estado no disponible y comunica los errores de respaldo', async () => {
    const onNotify = vi.fn();
    SystemAPI.getHealth.mockRejectedValue(new Error('sin conexión'));
    SystemAPI.getBackup.mockRejectedValue(new Error('sin espacio'));
    render(<SystemStatusCards onNotify={onNotify} />);

    await waitFor(() => expect(screen.getByText('NO DISPONIBLE')).toBeVisible());
    await act(async () => {
      fireEvent.click(screen.getByText('Exportar Dump SQL'));
      await Promise.resolve();
    });
    expect(onNotify).toHaveBeenCalledWith('Error al generar backup: sin espacio', 'error');
  });
});
