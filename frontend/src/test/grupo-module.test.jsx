import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import GrupoModule from '../components/groups/GrupoModule';
import { GruposAPI } from '../api/grupos';
import { SemillerosAPI } from '../api/semilleros';
import { UsuariosAPI } from '../api/usuarios';
import { ProyectosAPI } from '../api/proyectos';
import { ProductosAPI } from '../api/productos';
import { AprendicesAPI } from '../api/aprendices';
import { PlantillasAPI } from '../api/plantillas';
import { ReportesAPI } from '../api/reportes';
import { PDFGenerator } from '../utils/pdfGenerator';

vi.mock('recharts', () => {
  const Wrapper = ({ children }) => <div>{children}</div>;
  const Tooltip = ({ formatter }) => {
    formatter?.(1);
    return null;
  };
  return {
    BarChart: Wrapper,
    Bar: Wrapper,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip,
    ResponsiveContainer: Wrapper,
    Cell: () => null,
    PieChart: Wrapper,
    Pie: Wrapper,
  };
});

vi.mock('../api/grupos', () => ({
  GruposAPI: {
    list: vi.fn(),
    getStats: vi.fn(),
    getProyectos: vi.fn(),
    update: vi.fn(),
    uploadPlanOperativo: vi.fn(),
    getConsolidadoReporteUrl: vi.fn(() => '/mock-report-url'),
    downloadPlanOperativoUrl: vi.fn(() => '/mock-plan-url'),
  }
}));

vi.mock('../api/semilleros', () => ({
  SemillerosAPI: {
    list: vi.fn(),
    listAprendices: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addAprendiz: vi.fn(),
    deleteAprendiz: vi.fn(),
  }
}));

vi.mock('../api/usuarios', () => ({
  UsuariosAPI: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    get: vi.fn(),
  }
}));

vi.mock('../api/proyectos', () => ({
  ProyectosAPI: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    addEquipo: vi.fn(),
    removeEquipo: vi.fn(),
  }
}));

vi.mock('../api/productos', () => ({
  ProductosAPI: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
}));

vi.mock('../api/aprendices', () => ({
  AprendicesAPI: {
    list: vi.fn(),
  }
}));

vi.mock('../api/dashboard', () => ({
  DashboardAPI: {
    getUserImpact: vi.fn().mockResolvedValue({
      resumen_perfil: 'Aprendiz semillerista SENNOVA',
      proyectos_count: 1,
      productos_count: 0,
      semilleros_count: 1,
      cumplimiento: 90,
      presupuesto_total: 0,
      presupuesto_ejecutado: 0,
      distribucion_perfil: []
    })
  }
}));

vi.mock('../api/documentos', () => ({
  DocumentosAPI: {
    list: vi.fn().mockResolvedValue([]),
    upload: vi.fn(),
    getViewUrl: vi.fn()
  }
}));

vi.mock('../api/plantillas', () => ({
  PlantillasAPI: {
    getReportePresupuesto: vi.fn(),
    getDatosCertificado: vi.fn(),
  }
}));

vi.mock('../api/reportes', () => ({
  ReportesAPI: { descargarConsolidadoGrupos: vi.fn() }
}));

vi.mock('../utils/pdfGenerator', () => ({
  PDFGenerator: {
    generateEtapaProductiva: vi.fn(),
    generateSeguimiento: vi.fn(),
    generateInformeFinal: vi.fn(),
    generateBudgetReport: vi.fn(),
    generateProjectPDF: vi.fn(),
    generateCertificate: vi.fn(),
  }
}));

const mockGrupo = {
  id: 'g-1',
  owner_id: 'u-1',
  nombre: 'GRUPO CGAO',
  nombre_completo: 'Centro de Gestión Agroempresarial del Oriente',
  codigo_gruplac: 'COL000123',
  clasificacion: 'A1',
  director_nombre: 'Dra. Marta Rodríguez',
  director_email: 'marta@sena.edu.co',
  lineas_investigacion: ['Agroindustria', 'Desarrollo de Software', 'Biotecnología'],
};

const mockStats = {
  total_productos: 5,
  total_proyectos: 2,
  total_aprendices: 8,
  horas_formativas: 80,
  avance_promedio: 45,
  presupuesto_total: 80000000,
  presupuesto_ejecutado: 35000000,
  produccion: [{ name: 'Software', value: 3 }, { name: 'Artículos', value: 2 }],
  proyectos_por_estado: [{ name: 'En ejecución', value: 2 }]
};

const mockSemilleros = [
  {
    id: 's-1',
    owner_id: 'u-1',
    nombre: 'Semillero de Alimentos SENA',
    sigla: 'ALIMENSA',
    linea_investigacion: 'Agroindustria',
    horas_dedicadas: 40,
    lider_nombre: 'Dra. Marta Rodríguez',
    estado: 'activo',
    total_aprendices: 4
  }
];

const mockProyectos = [
  {
    id: 'p-1',
    owner_id: 'u-1',
    nombre: 'Estandarización de procesos para la extracción de pectina',
    nombre_corto: 'Pectina Guayaba',
    codigo_sgps: 'SGPS-10124',
    estado: 'En ejecución',
    presupuesto_total: 38000000,
    avance_porcentaje: 60,
    linea_investigacion: 'Agroindustria',
    semillero_nombre: 'ALIMENSA',
    owner: { nombre: 'Dra. Marta Rodríguez' },
    equipo: [{ id: 'u-1', nombre: 'Dra. Marta Rodríguez', rol_en_proyecto: 'Líder', horas_dedicadas: 20 }]
  }
];

const mockUsuarios = [
  { id: 'u-1', nombre: 'Dra. Marta Rodríguez', email: 'marta@sena.edu.co', rol: 'investigador', rol_sennova: 'Investigador Principal', estado_cv_lac: 'Actualizado' },
  { id: 'u-2', nombre: 'Admin General', email: 'admin@sena.edu.co', rol: 'admin', rol_sennova: 'Director', estado_cv_lac: 'Actualizado' }
];

const mockProductos = [
  { id: 'prod-1', owner_id: 'u-1', titulo: 'Protocolo de Extracción de Pectina', tipologia: 'Artículo Científico', categoria_minciencias: 'A', año: 2026, autores: 'Rodríguez, M.' }
];

const mockAprendices = [
  { id: 'apr-1', nombre: 'Juan Pérez', documento: '1098765432', ficha: '2561234', programa: 'ADSO', semillero_id: 's-1', estado: 'activo' }
];

describe('GrupoModule Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    GruposAPI.list.mockResolvedValue([mockGrupo]);
    GruposAPI.getStats.mockResolvedValue(mockStats);
    GruposAPI.getProyectos.mockResolvedValue(mockProyectos);
    GruposAPI.uploadPlanOperativo.mockResolvedValue({ ok: true });
    SemillerosAPI.list.mockResolvedValue(mockSemilleros);
    SemillerosAPI.listAprendices.mockResolvedValue(mockAprendices);
    UsuariosAPI.list.mockResolvedValue(mockUsuarios);
    UsuariosAPI.get.mockResolvedValue(mockUsuarios[0]);
    ProductosAPI.list.mockResolvedValue(mockProductos);
    AprendicesAPI.list.mockResolvedValue(mockAprendices);
    ProyectosAPI.list.mockResolvedValue(mockProyectos);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Grupo CGAO banner and investigator directory as the initial tab', async () => {
    render(
      <GrupoModule
        currentUser={{ id: 'u-2', rol: 'admin', nombre: 'Admin General' }}
        onNotify={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('GRUPO CGAO')).toBeDefined();
    });

    expect(screen.getByText(/Grupo de investigadores CGAO/)).toBeDefined();
    expect(screen.getByRole('tab', { name: 'Control GrupLAC / CvLAC' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByText('Tablero de Impacto Científico & Formativo CGAO')).toBeNull();
  });

  it('limits apprentices to their linked semilleros and projects', async () => {
    const onNavigate = vi.fn();
    render(
      <GrupoModule
        currentUser={{ id: 'apr-1', rol: 'aprendiz', nombre: 'Juan Pérez' }}
        onNotify={vi.fn()}
        onNavigate={onNavigate}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Mi espacio de aprendizaje' })).toBeInTheDocument();
    expect(screen.getByText('Semillero de Alimentos SENA')).toBeInTheDocument();
    expect(screen.getByText('Pectina Guayaba')).toBeInTheDocument();
    expect(screen.queryByText(/Monitoreo y Control GrupLAC/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Grupo de investigadores CGAO/)).not.toBeInTheDocument();
    expect(GruposAPI.list).not.toHaveBeenCalled();
    expect(GruposAPI.getStats).not.toHaveBeenCalled();
    expect(UsuariosAPI.list).not.toHaveBeenCalled();
    expect(ProductosAPI.list).not.toHaveBeenCalled();
    expect(AprendicesAPI.list).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Ver mis semilleros' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ver mis proyectos' }));
    expect(onNavigate).toHaveBeenNthCalledWith(1, 'semilleros');
    expect(onNavigate).toHaveBeenNthCalledWith(2, 'mis-proyectos');
  });

  it('recupera el espacio del aprendiz si no cargan sus semilleros ni proyectos', async () => {
    SemillerosAPI.list.mockRejectedValue(new Error('Semilleros no disponibles'));
    ProyectosAPI.list.mockRejectedValue(new Error('Proyectos no disponibles'));

    render(
      <GrupoModule
        currentUser={{ id: 'apr-1', rol: 'aprendiz', nombre: 'Juan Pérez' }}
        onNotify={vi.fn()}
      />
    );

    expect(await screen.findByRole('heading', { name: 'Mi espacio de aprendizaje' })).toBeInTheDocument();
    expect(SemillerosAPI.list).toHaveBeenCalledOnce();
    expect(ProyectosAPI.list).toHaveBeenCalledOnce();
    expect(screen.queryByText('Pectina Guayaba')).not.toBeInTheDocument();
  });

  it('gives a non-admin group owner broad write access while protecting administrator actions', async () => {
    render(
      <GrupoModule
        currentUser={{ id: 'u-1', rol: 'investigador', nombre: 'Dra. Marta Rodríguez' }}
        onNotify={vi.fn()}
      />
    );
    await screen.findByText('GRUPO CGAO');
    expect(screen.getByRole('button', { name: 'Editar Perfil' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar Investigador' })).not.toBeInTheDocument();

    fireEvent.click(document.getElementById('tab-lineas'));
    expect(screen.getByRole('button', { name: /Nueva Línea/i })).toBeInTheDocument();
    fireEvent.click(document.getElementById('tab-info'));
    expect(screen.getByRole('button', { name: 'Editar Ficha' })).toBeInTheDocument();
    fireEvent.click(document.getElementById('tab-plan'));
    expect(screen.getByLabelText(/Subir Plan Operativo/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Abrir catálogo de productos'));
    expect(screen.getByTitle('Editar producto')).toBeInTheDocument();
    expect(screen.getByTitle('Eliminar producto')).toBeInTheDocument();
  });

  it('opens project detail drawer and allows navigating tabs when a project card is clicked', async () => {
    render(
      <GrupoModule
        currentUser={{ id: 'u-2', rol: 'admin', nombre: 'Admin General' }}
        onNotify={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('GRUPO CGAO')).toBeDefined();
    });

    const proyTabBtn = document.getElementById('tab-proyectos');
    fireEvent.click(proyTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Pectina Guayaba')).toBeDefined();
    });

    const projectCard = screen.getByText('Pectina Guayaba').closest('.cursor-pointer');
    fireEvent.click(projectCard);

    // Debe abrir el drawer con la información del proyecto y tabs
    await waitFor(() => {
      expect(screen.getByText('Resumen & Presupuesto')).toBeDefined();
      expect(screen.getByText('Línea de Tiempo')).toBeDefined();
    });
  });

  it('opens semillero detail drawer and displays apprentices when a semillero card is clicked', async () => {
    render(
      <GrupoModule
        currentUser={{ id: 'u-2', rol: 'admin', nombre: 'Admin General' }}
        onNotify={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('GRUPO CGAO')).toBeDefined();
    });

    const semTabBtn = document.getElementById('tab-semilleros');
    fireEvent.click(semTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Semillero de Alimentos SENA')).toBeDefined();
    });

    const semilleroCard = screen.getByText('Semillero de Alimentos SENA').closest('.cursor-pointer');
    fireEvent.click(semilleroCard);

    await waitFor(() => {
      expect(screen.getByText('Líder / Tutor Asignado')).toBeDefined();
    });
  });

  it('opens research line modal when clicking on a research line card', async () => {
    render(
      <GrupoModule
        currentUser={{ id: 'u-2', rol: 'admin', nombre: 'Admin General' }}
        onNotify={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('GRUPO CGAO')).toBeDefined();
    });

    const lineasTabBtn = document.getElementById('tab-lineas');
    fireEvent.click(lineasTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Agroindustria')).toBeDefined();
    });

    const lineaCard = screen.getByText('Agroindustria').closest('.cursor-pointer');
    fireEvent.click(lineaCard);

    await waitFor(() => {
      expect(screen.getByText('Línea Temática de Investigación CGAO')).toBeDefined();
      expect(screen.getByText('Semilleros en esta Línea (1)')).toBeDefined();
    });
  });

  it('opens products modal and apprentices modal from KPI ribbon', async () => {
    render(
      <GrupoModule
        currentUser={{ id: 'u-2', rol: 'admin', nombre: 'Admin General' }}
        onNotify={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('GRUPO CGAO')).toBeDefined();
    });

    // Clic en la píldora superior "Productos I+D"
    const productosPill = screen.getByTitle('Abrir catálogo de productos');
    fireEvent.click(productosPill);

    await waitFor(() => {
      expect(screen.getByText('Catálogo de Productos Científicos & Tecnológicos I+D+i')).toBeDefined();
      expect(screen.getByText('Protocolo de Extracción de Pectina')).toBeDefined();
    });

    // Clic en la píldora superior "Aprendices"
    const aprendicesPill = screen.getByTitle('Abrir directorio de aprendices');
    fireEvent.click(aprendicesPill);

    await waitFor(() => {
      expect(screen.getByText('Directorio de Aprendices Semilleristas')).toBeDefined();
      expect(screen.getByText('Juan Pérez')).toBeDefined();
    });
  });

  it('opens apprentice insight modal when clicking on an apprentice row in Semillero Drawer', async () => {
    render(
      <GrupoModule
        currentUser={{ id: 'u-2', rol: 'admin', nombre: 'Admin General' }}
        onNotify={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('GRUPO CGAO')).toBeDefined();
    });

    // Abrir pestaña de Semilleros
    const semTabBtn = document.getElementById('tab-semilleros');
    fireEvent.click(semTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Semillero de Alimentos SENA')).toBeDefined();
    });

    // Abrir Drawer de Semillero
    const semilleroCard = screen.getByText('Semillero de Alimentos SENA').closest('.cursor-pointer');
    fireEvent.click(semilleroCard);

    await waitFor(() => {
      expect(screen.getByText('Líder / Tutor Asignado')).toBeDefined();
    });

    // Cambiar a la pestaña de Aprendices Vinculados en el Drawer
    const aprendicesTab = screen.getByRole('tab', { name: /Aprendices Vinculados/i });
    fireEvent.click(aprendicesTab);

    await waitFor(() => {
      expect(screen.getByText('Aprendices en Formación (1)')).toBeDefined();
      expect(screen.getByText('Juan Pérez')).toBeDefined();
    });

    // Hacer clic sobre el aprendiz
    const aprendizRow = screen.getByText('Juan Pérez').closest('.cursor-pointer');
    fireEvent.click(aprendizRow);

    // Verificar que se abre el modal 360 con la información completa del aprendiz
    await waitFor(() => {
      expect(screen.getByText('Resumen 360')).toBeDefined();
      expect(screen.getByText('Estado del Investigador / Aprendiz')).toBeDefined();
    });
  });

  it('runs dashboard, export, print, plan and reference-model actions', async () => {
    const onNotify = vi.fn();
    const onNavigate = vi.fn();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<GrupoModule currentUser={{ id: 'u-2', rol: 'admin', nombre: 'Admin General' }} onNotify={onNotify} onNavigate={onNavigate} />);
    await screen.findByText('GRUPO CGAO');

    fireEvent.click(screen.getByTitle('Ir al Dashboard Operativo'));
    fireEvent.click(screen.getByTitle('Descargar consolidado Excel del grupo'));
    fireEvent.click(screen.getByTitle('Imprimir Ficha Resumen'));
    await waitFor(() => expect(ReportesAPI.descargarConsolidadoGrupos).toHaveBeenCalledWith('excel'));
    expect(print).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith('dashboard');

    fireEvent.click(document.getElementById('tab-stats'));
    expect(await screen.findByText('Tablero de Impacto Científico & Formativo CGAO')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Agroindustria'));
    expect(await screen.findByText('Línea Temática de Investigación CGAO')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));

    fireEvent.click(document.getElementById('tab-plan'));
    expect(screen.getByText(/PDF se generan como modelos de referencia/i)).toBeInTheDocument();
    expect(screen.queryByText('Formatos Oficiales SENNOVA')).not.toBeInTheDocument();
    expect(screen.queryByText(/F-0[123]-SENN/)).not.toBeInTheDocument();
    const upload = screen.getByLabelText(/Subir Plan Operativo/i);
    fireEvent.change(upload, { target: { files: [new File(['plan'], 'plan.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(GruposAPI.uploadPlanOperativo).toHaveBeenCalledWith('g-1', expect.any(File)));
    for (const button of screen.getAllByRole('button', { name: 'Generar PDF' })) fireEvent.click(button);
    await waitFor(() => expect(PDFGenerator.generateEtapaProductiva).toHaveBeenCalled());
    await waitFor(() => expect(PDFGenerator.generateSeguimiento).toHaveBeenCalled());
    await waitFor(() => expect(PDFGenerator.generateInformeFinal).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Ir al Repositorio Documental Completo/i }));
    expect(onNavigate).toHaveBeenCalledWith('repositorio');
  });

  it('creates, edits and deletes a research line with confirmation', async () => {
    const onNotify = vi.fn();
    render(<GrupoModule currentUser={{ id: 'u-2', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByText('GRUPO CGAO');
    fireEvent.click(document.getElementById('tab-lineas'));

    fireEvent.click(screen.getByRole('button', { name: /Nueva Línea/i }));
    fireEvent.change(await screen.findByLabelText(/Nombre de la Línea de Investigación/), { target: { value: 'Robótica' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Línea' }));
    await waitFor(() => expect(GruposAPI.update).toHaveBeenCalledWith('g-1', expect.objectContaining({ lineas_investigacion: expect.arrayContaining(['Robótica']) })));

    fireEvent.click(screen.getAllByText('Agroindustria')[0].closest('.cursor-pointer'));
    fireEvent.click(await screen.findByRole('button', { name: 'Renombrar' }));
    fireEvent.change(await screen.findByLabelText(/Nuevo Nombre de la Línea/), { target: { value: 'Agroindustria Sostenible' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(GruposAPI.update).toHaveBeenCalledWith('g-1', expect.objectContaining({ lineas_investigacion: expect.arrayContaining(['Agroindustria Sostenible']) })));

    fireEvent.click(screen.getAllByText('Agroindustria')[0].closest('.cursor-pointer'));
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Línea' }));
    await waitFor(() => expect(GruposAPI.update).toHaveBeenCalledWith('g-1', expect.objectContaining({ lineas_investigacion: expect.not.arrayContaining(['Agroindustria']) })));
  });

  it('creates and edits group projects, filters the list, and opens project drawer actions', async () => {
    const onNotify = vi.fn();
    const onNavigate = vi.fn();
    ProyectosAPI.get.mockResolvedValue({ ...mockProyectos[0], equipo: mockProyectos[0].equipo });
    render(<GrupoModule currentUser={{ id: 'u-2', rol: 'admin' }} onNotify={onNotify} onNavigate={onNavigate} />);
    await screen.findByText('GRUPO CGAO');
    fireEvent.click(document.getElementById('tab-proyectos'));
    fireEvent.change(screen.getByPlaceholderText(/Buscar proyectos por nombre/i), { target: { value: 'Pectina' } });
    expect(screen.getByText('Pectina Guayaba')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Buscar proyectos por nombre/i), { target: { value: 'sin coincidencias' } });
    expect(screen.getByText(/No se encontraron proyectos/i)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Buscar proyectos por nombre/i), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /Nuevo Proyecto/i }));
    fireEvent.change(await screen.findByLabelText(/Nombre Completo del Proyecto/), { target: { value: 'Proyecto nuevo' } });
    fireEvent.change(screen.getByLabelText('Nombre Corto / Sigla'), { target: { value: 'PN' } });
    fireEvent.change(screen.getByLabelText('Código SGPS'), { target: { value: 'SGPS-555' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Proyecto' }));
    await waitFor(() => expect(ProyectosAPI.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Proyecto nuevo', grupo_id: 'g-1' })));

    fireEvent.click(screen.getByText('Pectina Guayaba').closest('.cursor-pointer'));
    expect(await screen.findByText('Ejecución Presupuestal por Rubros')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Liquidación' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Formatos' }));
    expect(screen.getByText(/PDF se generan como modelos de referencia/i)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Descargar' })[0]);
    await waitFor(() => expect(PDFGenerator.generateEtapaProductiva).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('tab', { name: 'Línea de Tiempo' }));
    expect(screen.getByText(/Línea de Tiempo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Editar' }));
    fireEvent.change(await screen.findByLabelText(/Nombre Completo del Proyecto/), { target: { value: 'Proyecto editado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Proyecto' }));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p-1', expect.objectContaining({ nombre: 'Proyecto editado' })));
    fireEvent.click(screen.getByRole('button', { name: /Módulo Proyectos Completo/i }));
    expect(onNavigate).toHaveBeenCalledWith('proyectos');
  });

  it('lista proyectos del semillero y actualiza su asociación al moverlo', async () => {
    const onNotify = vi.fn();
    GruposAPI.getProyectos.mockResolvedValue([{ ...mockProyectos[0], semillero_id: 's-1' }]);
    ProyectosAPI.update.mockResolvedValue({ id: 'p-1', semillero_id: 's-2' });
    SemillerosAPI.list.mockResolvedValue([
      ...mockSemilleros,
      { id: 's-2', owner_id: 'u-1', nombre: 'Semillero Digital', sigla: 'DIGI', estado: 'activo' },
    ]);

    render(<GrupoModule currentUser={{ id: 'u-2', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByText('GRUPO CGAO');
    fireEvent.click(document.getElementById('tab-semilleros'));
    fireEvent.click(screen.getByText('Semillero de Alimentos SENA'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Proyectos Asociados' }));

    expect(screen.getByText('Proyectos Adscritos al Semillero (1)')).toBeInTheDocument();
    expect(screen.getByText('Pectina Guayaba')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Mover a otro semillero'));
    fireEvent.change(screen.getByLabelText('Semillero de Destino'), { target: { value: 's-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Traslado' }));

    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p-1', { semillero_id: 's-2' }));
    await waitFor(() => expect(GruposAPI.getProyectos).toHaveBeenCalledTimes(2));
    expect(onNotify).toHaveBeenCalledWith('Proyecto movido a "Semillero Digital" correctamente', 'success');
  });

  it('manages project team members and confirms project deletion', async () => {
    const onNotify = vi.fn();
    ProyectosAPI.get.mockResolvedValue({ ...mockProyectos[0], equipo: mockProyectos[0].equipo });
    render(<GrupoModule currentUser={{ id: 'u-2', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByText('GRUPO CGAO');
    fireEvent.click(document.getElementById('tab-proyectos'));
    fireEvent.click(screen.getByText('Pectina Guayaba').closest('.cursor-pointer'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Equipo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Vincular Investigador' }));
    fireEvent.change(await screen.findByPlaceholderText('Buscar por nombre, correo o rol...'), { target: { value: 'Admin' } });
    fireEvent.click(await screen.findByText('Admin General'));
    fireEvent.click(screen.getByRole('button', { name: 'Vincular al Proyecto' }));
    await waitFor(() => expect(ProyectosAPI.addEquipo).toHaveBeenCalledWith('p-1', 'u-2', 'Investigador', 20));

    fireEvent.click(screen.getByRole('button', { name: 'Desvincular a Dra. Marta Rodríguez' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Desvincular' }));
    await waitFor(() => expect(ProyectosAPI.removeEquipo).toHaveBeenCalledWith('p-1', 'u-1'));
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar Proyecto' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar Proyecto' }).at(-1));
    await waitFor(() => expect(ProyectosAPI.delete).toHaveBeenCalledWith('p-1'));
  });

  it('creates and edits a semillero and exercises its project, tutor and apprentice actions', async () => {
    const onNotify = vi.fn();
    render(<GrupoModule currentUser={{ id: 'u-2', rol: 'admin' }} onNotify={onNotify} />);
    await screen.findByText('GRUPO CGAO');
    fireEvent.click(document.getElementById('tab-semilleros'));
    fireEvent.click(screen.getByRole('button', { name: /Nuevo Semillero/i }));
    fireEvent.change(await screen.findByLabelText(/Nombre del Semillero/), { target: { value: 'Semillero Nuevo' } });
    fireEvent.change(screen.getByLabelText('Sigla o Acrónimo'), { target: { value: 'SN' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Semillero' }));
    await waitFor(() => expect(SemillerosAPI.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Semillero Nuevo', grupo_id: 'g-1' })));

    fireEvent.click(screen.getByTitle('Editar Semillero'));
    fireEvent.change(screen.getByLabelText(/Nombre del Semillero/), { target: { value: 'Semillero Actualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Semillero' }));
    await waitFor(() => expect(SemillerosAPI.update).toHaveBeenCalledWith('s-1', expect.objectContaining({ nombre: 'Semillero Actualizado' })));

    fireEvent.click(screen.getByText('Semillero de Alimentos SENA').closest('.cursor-pointer'));
    fireEvent.click(await screen.findByRole('tab', { name: 'Tutores' }));
    expect(screen.getByText('Tutor Principal de Semillero')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Proyectos Asociados' }));
    const projectLinkSelect = screen.getAllByRole('combobox').find(select => Array.from(select.options).some(option => option.value === 'p-1'));
    fireEvent.change(projectLinkSelect, { target: { value: 'p-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Vincular' }));
    await waitFor(() => expect(ProyectosAPI.update).toHaveBeenCalledWith('p-1', { semillero_id: 's-1' }));
    fireEvent.click(screen.getByRole('tab', { name: /Aprendices Vinculados/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Vincular Aprendiz' }));
    fireEvent.change(screen.getByLabelText('Seleccione un Aprendiz del Centro'), { target: { value: 'apr-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar Vinculación' }));
    await waitFor(() => expect(SemillerosAPI.addAprendiz).toHaveBeenCalledWith('s-1', expect.objectContaining({ aprendiz_id: 'apr-1' })));
    fireEvent.click(screen.getByTitle('Desvincular del semillero'));
    fireEvent.click(await screen.findByRole('button', { name: 'Desvincular' }));
    await waitFor(() => expect(SemillerosAPI.deleteAprendiz).toHaveBeenCalledWith('s-1', 'apr-1'));
  });

  it('registers and edits investigators, manages product records and filters apprentices', async () => {
    render(<GrupoModule currentUser={{ id: 'u-2', rol: 'admin' }} onNotify={vi.fn()} />);
    await screen.findByText('GRUPO CGAO');
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Investigador' }));
    fireEvent.change(await screen.findByLabelText(/Nombre Completo/), { target: { value: 'Investigadora Nueva' } });
    fireEvent.change(await screen.findByLabelText(/Correo Electrónico/), { target: { value: 'nueva@sena.edu.co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    await waitFor(() => expect(UsuariosAPI.create).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Investigadora Nueva', email: 'nueva@sena.edu.co' })));

    fireEvent.click(screen.getAllByText('Dra. Marta Rodríguez').at(-1));
    fireEvent.click(await screen.findByRole('button', { name: 'Editar Datos CvLAC' }));
    fireEvent.change(await screen.findByLabelText('Nombre Completo'), { target: { value: 'Dra. Marta Editada' } });
    fireEvent.change(screen.getByLabelText('Estado CvLAC'), { target: { value: 'Desactualizado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(UsuariosAPI.update).toHaveBeenCalledWith('u-1', expect.objectContaining({ nombre: 'Dra. Marta Editada', estado_cv_lac: 'Desactualizado' })));

    fireEvent.click(screen.getByTitle('Abrir catálogo de productos'));
    fireEvent.change(screen.getByPlaceholderText(/Buscar producto/i), { target: { value: 'Artículo' } });
    expect(screen.getByText('Protocolo de Extracción de Pectina')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Registrar Nuevo Producto/i }));
    fireEvent.change(await screen.findByLabelText(/Título del Producto/), { target: { value: 'Producto nuevo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar Producto' }));
    await waitFor(() => expect(ProductosAPI.create).toHaveBeenCalledWith(expect.objectContaining({ titulo: 'Producto nuevo' })));

    fireEvent.click(screen.getByTitle('Abrir catálogo de productos'));
    fireEvent.click(screen.getByTitle('Editar producto'));
    fireEvent.change(await screen.findByLabelText(/Título del Producto/), { target: { value: 'Producto editado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar Producto' }));
    await waitFor(() => expect(ProductosAPI.update).toHaveBeenCalledWith('prod-1', expect.objectContaining({ titulo: 'Producto editado' })));

    fireEvent.click(screen.getByTitle('Abrir catálogo de productos'));
    fireEvent.click(screen.getByTitle('Eliminar producto'));
    fireEvent.click(await screen.findByRole('button', { name: 'Eliminar Producto' }));
    await waitFor(() => expect(ProductosAPI.delete).toHaveBeenCalledWith('prod-1'));

    fireEvent.click(screen.getByTitle('Abrir directorio de aprendices'));
    fireEvent.change(screen.getByPlaceholderText(/Buscar aprendiz por nombre/i), { target: { value: 'Juan' } });
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText(/Buscar aprendiz por nombre/i), { target: { value: 'sin resultados' } });
    expect(screen.getByText(/No hay aprendices que coincidan/i)).toBeInTheDocument();
  });

  it('edits group profile, downloads apprentice certificates and closes detail panels', async () => {
    const notify = vi.fn();
    render(<GrupoModule currentUser={{ id: 'u-2', rol: 'admin' }} onNotify={notify} />);
    await screen.findByText('GRUPO CGAO');

    fireEvent.click(screen.getByRole('button', { name: 'Editar Perfil' }));
    const groupName = await screen.findByLabelText(/Nombre del grupo institucional/);
    expect(groupName).toHaveValue('Investigadores CGAO');
    expect(groupName).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Líneas de Investigación (separadas por coma)'), { target: { value: 'Agroindustria, Innovación' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(GruposAPI.update).toHaveBeenCalledWith('g-1', expect.objectContaining({ nombre: 'Investigadores CGAO', lineas_investigacion: ['Agroindustria', 'Innovación'] })));

    fireEvent.click(screen.getByTitle('Abrir directorio de aprendices'));
    fireEvent.click(screen.getByRole('button', { name: /Certificado PDF/i }));
    await waitFor(() => expect(PDFGenerator.generateCertificate).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar Directorio' }));

    fireEvent.click(document.getElementById('tab-lineas'));
    fireEvent.click(screen.getAllByText('Agroindustria')[0].closest('.cursor-pointer'));
    fireEvent.click(screen.getByText('Semillero de Alimentos SENA'));
    expect(await screen.findByText('Líder / Tutor Asignado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
  });
});
