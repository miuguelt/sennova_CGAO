import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from '../App';
import { setAuthToken } from '../api/config';
import { DATA_REFRESH_EVENT, emitDataRefresh } from '../utils/dataRefresh';

vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }) => <>{children}</>,
  useAuth: () => ({ currentUser: { id: 'admin-1', nombre: 'Administración', rol: 'admin' }, loading: false, logout: vi.fn() }),
}));
vi.mock('../components/layout/Navbar', () => ({ default: () => <nav aria-label="Navegación de la prueba" /> }));
vi.mock('../components/common/GlobalSearch', () => ({ default: () => null }));
vi.mock('../components/common/QuickActionHub', () => ({ default: () => null }));
vi.mock('react-hot-toast', () => ({ Toaster: () => null, toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('recharts', () => {
  const Container = ({ children }) => <div>{children}</div>;
  return { BarChart: Container, Bar: Container, ResponsiveContainer: Container, PieChart: Container, Pie: Container,
    XAxis: () => null, YAxis: () => null, CartesianGrid: () => null, Tooltip: () => null, Cell: () => null };
});

const project = { id: 'project-1', nombre: 'Proyecto en construcción', nombre_corto: 'Proyecto de aprendizaje', estado: 'En formulación',
  owner_id: 'admin-1', presupuesto_total: 0, equipo: [], linea_investigacion: 'Desarrollo de Software' };
const documentation = {
  proyecto: project, revision: 1, comunes: {}, campos_comunes: [],
  documentos: [{ clave: 'formulacion_proyecto', tipo: 'formulacion_proyecto', titulo: 'Formulación del proyecto', revision: 1, formato: 'docx', carpeta: '1Formulacion',
    datos: { introduccion: '' }, campos: [{ key: 'introduccion', label: 'Introducción', type: 'textarea' }], historial: [], faltantes: [], generable: false }],
  ruta_formulacion: {
    siguiente_paso: 'identificacion', completados: 0, total: 2, porcentaje: 0,
    valores_proyecto: { nombre: project.nombre, vigencia: null },
    campos_proyecto: [{ key: 'nombre', label: 'Título del proyecto', type: 'text' }],
    pasos: [
      { id: 'identificacion', titulo: 'Identificación del proyecto', fuente: 'proyecto', campos: ['nombre'], completo: false, faltantes: [] },
      { id: 'problema', titulo: 'Problema del proyecto', fuente: 'formulacion', campos: ['introduccion'], completo: false, faltantes: [] },
    ],
  },
};
let serverProject;
let serverDocumentation;
let requests;

beforeEach(() => {
  serverProject = structuredClone(project);
  serverDocumentation = structuredClone(documentation);
  requests = [];
  setAuthToken('example');
  vi.stubGlobal('fetch', vi.fn(async (url, options = {}) => {
    const endpoint = new URL(url, window.location.origin).pathname.replace(/^\/api/, '');
    requests.push({ endpoint, options });
    const responses = {
      '/grupos': [{ id: 'group-1', nombre: 'Investigadores CGAO', lineas_investigacion: ['Desarrollo de Software'] }],
      '/grupos/group-1/stats': { total_proyectos: 1, total_productos: 0, total_aprendices: 0, horas_formativas: 0, presupuesto_total: 0, presupuesto_ejecutado: 0, proyectos_por_estado: [], produccion: [] },
      '/grupos/group-1/proyectos': [serverProject],
      '/semilleros': [], '/usuarios': [], '/productos': [], '/aprendices': [],
      '/proyectos/project-1/documentacion': serverDocumentation,
      '/proyectos/project-1/documentacion/recomendar': { recomendaciones: ['Relaciona el título con el propósito y el resultado esperado.'] },
    };
    if (!(endpoint in responses)) throw new Error(`Ruta de prueba sin respuesta: ${endpoint}`);
    return { ok: true, status: 200, json: async () => structuredClone(responses[endpoint]) };
  }));
});

afterEach(() => {
  cleanup();
  setAuthToken(null);
  vi.unstubAllGlobals();
});

async function openWritingProject() {
  render(<App />);
  await screen.findByRole('heading', { name: 'Investigadores CGAO' });
  expect(screen.getByRole('tab', { name: /Estadísticas e Indicadores/ })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(document.getElementById('tab-proyectos'));
  fireEvent.click(screen.getByText('Proyecto de aprendizaje').closest('.cursor-pointer'));
  return screen.findByRole('region', { name: 'Construcción de documentación' });
}

describe('Integración del proyecto escrito desde el inicio institucional', () => {
  it('consulta orientaciones con la API real sin refrescar la aplicación ni perder el título pendiente', async () => {
    const editor = await openWritingProject();
    const title = await within(editor).findByLabelText('Título del proyecto');
    fireEvent.change(title, { target: { value: 'Título elaborado por el usuario' } });
    const refreshListener = vi.fn();
    window.addEventListener(DATA_REFRESH_EVENT, refreshListener);
    const groupQueriesBefore = requests.filter(request => request.endpoint === '/grupos/group-1/proyectos').length;
    try {
      fireEvent.click(within(editor).getByRole('button', { name: 'Consultar orientaciones metodológicas' }));
      const tips = await screen.findByRole('dialog', { name: 'Orientaciones metodológicas' });
      expect(await within(tips).findByText('Relaciona el título con el propósito y el resultado esperado.')).toBeVisible();
      const recommendation = requests.find(request => request.endpoint.endsWith('/recomendar'));
      expect(recommendation.options.method).toBe('POST');
      expect(JSON.parse(recommendation.options.body)).toEqual({ campo: 'nombre', texto: 'Título elaborado por el usuario' });
      expect(refreshListener).not.toHaveBeenCalled();
      expect(requests.filter(request => request.endpoint === '/grupos/group-1/proyectos')).toHaveLength(groupQueriesBefore);
      fireEvent.click(within(tips).getByRole('button', { name: 'Volver al formulario' }));
      expect(screen.getByRole('region', { name: 'Construcción de documentación' })).toBe(editor);
      expect(title).toHaveValue('Título elaborado por el usuario');
      expect(screen.getByRole('tab', { name: /Proyectos y documentación/ })).toHaveAttribute('aria-selected', 'true');
    } finally { window.removeEventListener(DATA_REFRESH_EVENT, refreshListener); }
  });

  it('refresca el grupo y la documentación después de una escritura externa y conserva el título local', async () => {
    const editor = await openWritingProject();
    fireEvent.change(await within(editor).findByLabelText('Título del proyecto'), { target: { value: 'Borrador local pendiente' } });
    const groupQueriesBefore = requests.filter(request => request.endpoint === '/grupos/group-1/proyectos').length;
    const documentQueriesBefore = requests.filter(request => request.endpoint === '/proyectos/project-1/documentacion').length;
    serverProject = { ...serverProject, nombre_corto: 'Datos actualizados por el servidor' };
    serverDocumentation.ruta_formulacion.valores_proyecto.nombre = 'Título guardado por otra persona';
    act(() => emitDataRefresh({ endpoint: '/proyectos/project-1/documentacion/comunes', method: 'PUT' }));
    await waitFor(() => {
      expect(requests.filter(request => request.endpoint === '/grupos/group-1/proyectos')).toHaveLength(groupQueriesBefore + 1);
      expect(requests.filter(request => request.endpoint === '/proyectos/project-1/documentacion')).toHaveLength(documentQueriesBefore + 1);
    });
    const updatedDrawer = await screen.findByRole('dialog', { name: 'Datos actualizados por el servidor' });
    expect(within(updatedDrawer).getByRole('heading', { name: 'Datos actualizados por el servidor' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Construcción de documentación' })).toBe(editor);
    expect(within(editor).getByLabelText('Título del proyecto')).toHaveValue('Borrador local pendiente');
    expect(screen.getByRole('tab', { name: /Proyectos y documentación/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Documentación' })).toHaveAttribute('aria-selected', 'true');
  });
});
