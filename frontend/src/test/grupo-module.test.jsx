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

vi.mock('../api/grupos', () => ({
  GruposAPI: {
    list: vi.fn(),
    getStats: vi.fn(),
    getProyectos: vi.fn(),
    update: vi.fn(),
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

const mockGrupo = {
  id: 'g-1',
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
  { id: 'prod-1', titulo: 'Protocolo de Extracción de Pectina', tipologia: 'Artículo Científico', categoria_minciencias: 'A', año: 2026, autores: 'Rodríguez, M.' }
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
    SemillerosAPI.list.mockResolvedValue(mockSemilleros);
    SemillerosAPI.listAprendices.mockResolvedValue(mockAprendices);
    UsuariosAPI.list.mockResolvedValue(mockUsuarios);
    ProductosAPI.list.mockResolvedValue(mockProductos);
    AprendicesAPI.list.mockResolvedValue(mockAprendices);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders Grupo CGAO banner, KPI ribbon and stats tab correctly', async () => {
    render(
      <GrupoModule
        currentUser={{ id: 'u-2', rol: 'admin', nombre: 'Admin General' }}
        onNotify={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('GRUPO CGAO')).toBeDefined();
    });

    expect(screen.getByText('Tablero de Impacto Científico & Formativo CGAO')).toBeDefined();
    expect(screen.getByText('Producción por Tipología Minciencias')).toBeDefined();
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
});
