import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react';
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
import { ProjectDocumentationAPI } from '../api/projectDocumentation';

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
    getExpediente: vi.fn().mockResolvedValue({ completo: false, porcentaje_completitud: 0, etapas: [] }),
  }
}));

vi.mock('../api/projectDocumentation', () => ({ ProjectDocumentationAPI: { get: vi.fn() } }));

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
    getViewUrl: vi.fn(),
    getProyectoDocumentos: vi.fn().mockResolvedValue([]),
    download: vi.fn(),
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
  avance_documental: { porcentaje: 23, campos_completados: 3, campos_totales: 10, documentos_generados: 0, documentos_revisados: 0, documentos_totales: 3 },
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
    avance_documental: { porcentaje: 8, campos_completados: 1, campos_totales: 10, documentos_generados: 0, documentos_revisados: 0, documentos_totales: 2 },
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
    ProjectDocumentationAPI.get.mockResolvedValue({ proyecto: mockProyectos[0], revision: 1, comunes: { centro: 'CGAO' }, campos_comunes: [{ key: 'centro', label: 'Centro de formación', type: 'text' }], documentos: [], avance_documental: mockProyectos[0].avance_documental });
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

    expect(screen.getByText(/Centro de Gestión Agroempresarial del Oriente/)).toBeDefined();
    expect(screen.getByRole('tab', { name: /Estadísticas e Indicadores/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Tablero de Impacto Científico & Formativo CGAO')).toBeDefined();
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
      expect(screen.getByText('Expediente')).toBeDefined();
      expect(screen.getByText('Línea de Tiempo')).toBeDefined();
    });
  });

  it('abre la documentación a lo ancho y conserva el borrador al consultar otras pestañas del proyecto', async () => {
    render(<GrupoModule currentUser={{ id: 'u-2', rol: 'admin' }} onNotify={vi.fn()} />);
    await screen.findByText('GRUPO CGAO');
    fireEvent.click(document.getElementById('tab-proyectos'));
    fireEvent.click(screen.getByText('Pectina Guayaba').closest('.cursor-pointer'));
    const drawer = await screen.findByRole('dialog', { name: 'Pectina Guayaba' });
    expect(within(drawer).getAllByRole('tab')[0]).toHaveTextContent('Documentación');
    expect(within(drawer).getByRole('tab', { name: 'Documentación' })).toHaveAttribute('aria-selected', 'true');
    expect(drawer.querySelector('.project-workspace')).toHaveClass('max-w-[96vw]');
    expect(drawer.querySelector('.project-workspace-body')).toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: 'Aprovechar ancho de pantalla' })).not.toBeInTheDocument();
    const editor = await within(drawer).findByRole('region', { name: 'Construcción de documentación' });
    expect(within(editor).getByRole('heading', { name: 'Construye la documentación de tu proyecto' })).toBeVisible();
    fireEvent.click(within(editor).getByText('Datos comunes'));
    fireEvent.change(within(editor).getByLabelText('Centro de formación'), { target: { value: 'CGAO: borrador de trabajo' } });
    fireEvent.click(within(drawer).getByRole('tab', { name: 'Resumen & Presupuesto' }));
    expect(editor).not.toBeVisible();
    fireEvent.click(within(drawer).getByRole('tab', { name: 'Expediente' }));
    await within(drawer).findByRole('region', { name: 'Expediente del proyecto' });
    expect(await within(drawer).findByRole('region', { name: 'Formulación fuente del proyecto' })).toBeVisible();
    expect(ProjectDocumentationAPI.get).toHaveBeenCalledOnce();
    fireEvent.click(within(drawer).getByRole('tab', { name: 'Documentación' }));
    expect(editor).toBeVisible();
    expect(within(editor).getByLabelText('Centro de formación')).toHaveValue('CGAO: borrador de trabajo');
    expect(ProjectDocumentationAPI.get).toHaveBeenCalledWith('p-1');
  });

  it('presenta el avance documental servido y abre el proyecto desde su acción de construcción', async () => {
    render(<GrupoModule currentUser={{ id: 'u-2', rol: 'admin' }} />);
    await screen.findByText('GRUPO CGAO');
    fireEvent.click(document.getElementById('tab-proyectos'));
    expect(screen.getByRole('heading', { name: 'Proyectos de investigación y documentación' })).toBeVisible();
    const progress = screen.getAllByRole('progressbar', { name: 'Avance documental del proyecto' });
    expect(progress.map(item => item.getAttribute('value'))).toEqual(['23', '8']);
    expect(screen.queryByText('45%')).not.toBeInTheDocument();
    expect(screen.queryByText('60%')).not.toBeInTheDocument();
    expect(screen.queryByText(/entregables aprobados/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Construir documentación' }));
    expect(await screen.findByRole('dialog', { name: 'Pectina Guayaba' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Documentación' })).toHaveAttribute('aria-selected', 'true');
  });

  it('abre el mismo espacio documental desde los proyectos asociados a un semillero del grupo', async () => {
    GruposAPI.getProyectos.mockResolvedValue([{ ...mockProyectos[0], semillero_id: 's-1' }]);
    render(<GrupoModule currentUser={{ id: 'u-2', rol: 'admin' }} />);
    await screen.findByText('GRUPO CGAO');
    fireEvent.click(document.getElementById('tab-semilleros'));
    fireEvent.click(screen.getByText('Semillero de Alimentos SENA'));
    const semillero = await screen.findByRole('dialog', { name: 'Semillero de Alimentos SENA' });
    fireEvent.click(within(semillero).getByRole('tab', { name: 'Proyectos Asociados' }));
    expect(within(semillero).getByRole('progressbar', { name: 'Avance documental del proyecto' })).toHaveAttribute('value', '8');
    fireEvent.click(within(semillero).getByRole('button', { name: 'Construir documentación' }));
    const proyecto = await screen.findByRole('dialog', { name: 'Pectina Guayaba' });
    expect(within(proyecto).getByRole('tab', { name: 'Documentación' })).toHaveAttribute('aria-selected', 'true');
    expect(await within(proyecto).findByLabelText('Centro de formación')).toHaveValue('CGAO');
    expect(screen.queryByRole('dialog', { name: 'Semillero de Alimentos SENA' })).not.toBeInTheDocument();
  });

  it('consulta los datos guardados del proyecto que se elige sin trasladar el borrador de otro proyecto', async () => {
    const segundo = { ...mockProyectos[0], id: 'p-2', nombre: 'Proyecto de software', nombre_corto: 'Software CGAO' };
    GruposAPI.getProyectos.mockResolvedValue([...mockProyectos, segundo]);
    ProjectDocumentationAPI.get.mockImplementation(async id => ({ proyecto: id === 'p-1' ? mockProyectos[0] : segundo, revision: 1, comunes: { centro: `Datos guardados de ${id}` }, campos_comunes: [{ key: 'centro', label: 'Centro de formación', type: 'text' }], documentos: [] }));
    render(<GrupoModule currentUser={{ id: 'u-2', rol: 'admin' }} />);
    await screen.findByText('GRUPO CGAO');
    fireEvent.click(document.getElementById('tab-proyectos'));
    fireEvent.click(screen.getByText('Pectina Guayaba').closest('.cursor-pointer'));
    const primero = await screen.findByRole('dialog', { name: 'Pectina Guayaba' });
    const centro = await within(primero).findByLabelText('Centro de formación');
    fireEvent.change(centro, { target: { value: 'Borrador del primer proyecto' } });
    fireEvent.click(within(primero).getByRole('button', { name: 'Cerrar' }));
    fireEvent.click(screen.getByText('Software CGAO').closest('.cursor-pointer'));
    const seleccionado = await screen.findByRole('dialog', { name: 'Software CGAO' });
    expect(await within(seleccionado).findByLabelText('Centro de formación')).toHaveValue('Datos guardados de p-2');
    expect(ProjectDocumentationAPI.get).toHaveBeenNthCalledWith(1, 'p-1');
    expect(ProjectDocumentationAPI.get).toHaveBeenNthCalledWith(2, 'p-2');
  });

  it('omite el porcentaje cuando falta el resumen documental y conserva las restricciones de administración', async () => {
    GruposAPI.getStats.mockResolvedValue({ ...mockStats, avance_documental: undefined });
    GruposAPI.getProyectos.mockResolvedValue([{ ...mockProyectos[0], avance_documental: undefined }]);
    render(<GrupoModule currentUser={{ id: 'otro-investigador', rol: 'investigador' }} />);
    await screen.findByText('GRUPO CGAO');
    fireEvent.click(document.getElementById('tab-proyectos'));
    expect(screen.queryByRole('progressbar', { name: 'Avance documental del proyecto' })).not.toBeInTheDocument();
    expect(screen.queryByText('60%')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Pectina Guayaba').closest('.cursor-pointer'));
    const drawer = await screen.findByRole('dialog', { name: 'Pectina Guayaba' });
    expect(within(drawer).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
    expect(within(drawer).queryByRole('button', { name: 'Eliminar Proyecto' })).not.toBeInTheDocument();
    expect(await within(drawer).findByRole('region', { name: 'Construcción de documentación' })).toBeVisible();
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
    expect(screen.getByRole('heading', { name: 'Plan Operativo del Grupo' })).toBeVisible();
    expect(screen.getByText(/no hace parte de los documentos requeridos en el expediente/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Generar PDF' })).not.toBeInTheDocument();
    expect(screen.queryByText(/etapa productiva|bitácora/i)).not.toBeInTheDocument();
    const upload = screen.getByLabelText(/Subir Plan Operativo/i);
    fireEvent.change(upload, { target: { files: [new File(['plan'], 'plan.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(GruposAPI.uploadPlanOperativo).toHaveBeenCalledWith('g-1', expect.any(File)));
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
    fireEvent.click(await screen.findByRole('tab', { name: 'Resumen & Presupuesto' }));
    expect(await screen.findByText('Ejecución Presupuestal por Rubros')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Liquidación' }));
    expect(screen.queryByRole('tab', { name: 'Formatos' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Documentación' }));
    expect(await screen.findByText('Construye la documentación de tu proyecto')).toBeVisible();
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
    fireEvent.click(document.getElementById('tab-gruplac'));
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
