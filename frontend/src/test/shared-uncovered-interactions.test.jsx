import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import FileUpload from '../components/common/FileUpload';
import QuickActionHub from '../components/common/QuickActionHub';
import DevLoginPanel from '../components/auth/DevLoginPanel';
import ScrollableTabs from '../components/ui/ScrollableTabs';
import StatisticsModule from '../components/dashboard/StatisticsModule';
import { AttachmentTray } from '../components/messages/AttachmentTray';
import MessageComposer from '../components/messages/MessageComposer';
import { DashboardAPI } from '../api/dashboard';
import { ProyectosAPI } from '../api/proyectos';

vi.mock('../hooks/useModalStack', () => ({
  useModalStack: () => ({ zIndex: 1000, isTop: true }),
}));

vi.mock('../api/dashboard', () => ({
  DashboardAPI: { getStats: vi.fn() },
}));

vi.mock('../api/proyectos', () => ({
  ProyectosAPI: { list: vi.fn() },
}));

vi.mock('recharts', async () => {
  const ReactModule = await import('react');
  const passthrough = ({ children }) => <div>{children}</div>;
  const Tooltip = ({ formatter }) => {
    const [formatted, setFormatted] = ReactModule.useState('');
    return formatter ? (
      <div>
        <button type="button" onClick={() => setFormatted(formatter(1200))}>Aplicar formato del gráfico</button>
        {formatted && <output>{formatted}</output>}
      </div>
    ) : null;
  };
  return {
    BarChart: passthrough,
    Bar: passthrough,
    XAxis: passthrough,
    YAxis: passthrough,
    CartesianGrid: passthrough,
    Tooltip,
    ResponsiveContainer: passthrough,
    Cell: passthrough,
    PieChart: passthrough,
    Pie: passthrough,
    AreaChart: passthrough,
    Area: passthrough,
    LineChart: passthrough,
    Line: passthrough,
    Legend: passthrough,
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('interacciones de componentes compartidos', () => {
  it('abre el selector de archivos al hacer clic en la zona de carga', () => {
    const { container } = render(<FileUpload onUpload={vi.fn()} label="Adjuntar soporte" />);
    const input = container.querySelector('input[type="file"]');
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: /Adjuntar soporte — haz clic/i }));

    expect(click).toHaveBeenCalledOnce();
  });

  it('ejecuta la acción rápida elegida y cierra con el botón o el atajo Ctrl+J', () => {
    const onAction = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <QuickActionHub isOpen currentUser={{ rol: 'admin' }} onAction={onAction} onClose={onClose} />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Crear Convocatoria/i }));
    expect(onAction).toHaveBeenCalledWith({
      id: 'new-call',
      label: 'Crear Convocatoria',
      module: 'convocatorias',
      form: 'create',
    });
    expect(onClose).toHaveBeenCalledOnce();

    rerender(<QuickActionHub isOpen currentUser={{ rol: 'admin' }} onAction={onAction} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'j', ctrlKey: true });
    expect(onClose).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel' }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('envía las credenciales del perfil de desarrollo que se selecciona', () => {
    const onSelect = vi.fn();
    render(<DevLoginPanel onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: /Dra\. Marta Rodríguez/i }));

    expect(onSelect).toHaveBeenCalledWith('m.rodriguez@sena.edu.co', '123456');
  });

  it('actualiza la navegación al cambiar de pestaña y desplaza el contenido desbordado', () => {
    const observers = [];
    class ResizeObserverFake {
      constructor(callback) {
        this.callback = callback;
        observers.push(this);
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverFake);
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(() => {});
    const scrollBy = vi.fn();
    const onTabChange = vi.fn();

    render(
      <ScrollableTabs
        tabs={[{ id: 'one', label: 'Uno' }, { id: 'two', label: 'Dos', count: 2 }]}
        activeTab="one"
        onTabChange={onTabChange}
      />,
    );
    const tablist = screen.getByRole('tablist');
    Object.defineProperties(tablist, {
      scrollWidth: { configurable: true, value: 600 },
      clientWidth: { configurable: true, value: 120 },
      scrollLeft: { configurable: true, writable: true, value: 25 },
      scrollBy: { configurable: true, value: scrollBy },
    });
    fireEvent.scroll(tablist);

    expect(screen.getByRole('button', { name: 'Desplazar pestañas hacia la izquierda' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Desplazar pestañas hacia la derecha' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Desplazar pestañas hacia la izquierda' }));
    expect(scrollBy).toHaveBeenCalledWith({ left: -180, behavior: 'smooth' });
    fireEvent.click(screen.getByRole('button', { name: 'Desplazar pestañas hacia la derecha' }));
    expect(scrollBy).toHaveBeenCalledWith({ left: 180, behavior: 'smooth' });

    fireEvent.wheel(tablist, { deltaY: 20, deltaX: 0 });
    expect(scrollBy).toHaveBeenCalledWith({ left: 24, behavior: 'auto' });
    fireEvent.wheel(tablist, { deltaY: 0, deltaX: 20 });
    expect(scrollBy).toHaveBeenCalledTimes(3);
    window.dispatchEvent(new Event('resize'));
    observers[0].callback();
    expect(observers[0].observe).toHaveBeenCalled();
    expect(onTabChange).not.toHaveBeenCalled();
  });

  it('retira adjuntos desconocidos con el control asociado y activa sugerencias de mensaje', () => {
    const onQuitar = vi.fn();
    render(<AttachmentTray adjuntos={[
      { id: 'a1', categoria: 'tipo nuevo', nombre_archivo: 'respaldo.bin' },
    ]} onQuitar={onQuitar} />);
    fireEvent.click(screen.getByTitle('Quitar respaldo.bin'));
    expect(onQuitar).toHaveBeenCalledWith({
      id: 'a1', categoria: 'tipo nuevo', nombre_archivo: 'respaldo.bin',
    });

    const onSugerencia = vi.fn();
    const onEnviar = vi.fn((event) => event.preventDefault());
    const inputRef = React.createRef();
    const adjuntos = {
      ids: [],
      adjuntos: [{ id: 'a2', categoria: 'documento', nombre_archivo: 'acta.pdf' }],
      quitar: onQuitar,
      inputRef,
      agregarArchivos: vi.fn(),
      subiendo: false,
    };
    const { container } = render(
      <MessageComposer
        destinatarioNombre="Laura"
        texto=""
        onTextoChange={vi.fn()}
        onSugerencia={onSugerencia}
        onKeyDown={vi.fn()}
        onEnviar={onEnviar}
        textareaRef={{ current: null }}
        adjuntos={adjuntos}
        enviando={false}
      />,
    );
    const inputClick = vi.spyOn(container.querySelector('input[type="file"]'), 'click').mockImplementation(() => {});

    fireEvent.click(screen.getByRole('button', { name: '¡Hola! ¿Cómo estás?' }));
    expect(onSugerencia).toHaveBeenCalledWith('¡Hola! ¿Cómo estás?');
    expect(screen.getByPlaceholderText(/Escribe un mensaje para Laura/)).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Adjuntar imagen, video, audio o documento'));
    expect(inputClick).toHaveBeenCalledOnce();
    fireEvent.submit(container.querySelector('form'));
    expect(onEnviar).toHaveBeenCalledOnce();
  });

  it('formatea el valor de inversión con separadores locales en la gráfica', async () => {
    DashboardAPI.getStats.mockResolvedValue({ total_proyectos: 2, productos: 3, investigadores: 4 });
    ProyectosAPI.list.mockResolvedValue([
      { id: 'p1', nombre: 'Proyecto con inversión', estado: 'Aprobado', tipologia: 'I+D', presupuesto_total: 1250000 },
    ]);
    render(<StatisticsModule onNotify={vi.fn()} />);

    expect(await screen.findByText('Proyecto con inversión')).toBeInTheDocument();
    const formatterControls = screen.getAllByRole('button', { name: 'Aplicar formato del gráfico' });
    fireEvent.click(formatterControls[formatterControls.length - 1]);

    expect(screen.getAllByText('$1.200')).toHaveLength(1);
  });
});
