/**
 * API Client para SENNOVA Backend
 * FastAPI + PostgreSQL
 * REGLA ANTI-HARDCODING: Todas las configuraciones desde variables de entorno
 */

const API_URL = import.meta.env.VITE_API_URL || '/api';

// URL base de CVLAC desde variable de entorno
export const CVLAC_BASE_URL = import.meta.env.VITE_CVLAC_BASE_URL || 'https://scienti.minciencias.gov.co';

// Placeholder para URL de CVLAC
export const CVLAC_URL_PLACEHOLDER = `${CVLAC_BASE_URL}/cvlac/...`;

// ==========================================
// UTILIDADES
// ==========================================

async function fetchWithAuth(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);
  
  if (response.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Sesión expirada');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Error desconocido' }));
    throw new Error(error.detail || `Error ${response.status}`);
  }
  
  // Si no hay contenido (204), retornar null
  if (response.status === 204) return null;
  
  return response.json();
}

// ==========================================
// AUTH API
// ==========================================

export const AuthAPI = {
  login: async (email, password) => {
    const data = await fetchWithAuth('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('token', data.access_token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },
  
  register: async (userData) => {
    return fetchWithAuth('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
  
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
  
  getMe: () => {
    return fetchWithAuth('/auth/me');
  },
  
  updateMe: (data) => {
    return fetchWithAuth('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  changePassword: (oldPassword, newPassword) => {
    return fetchWithAuth('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });
  },
  
  getToken: () => localStorage.getItem('token'),
  getUser: () => JSON.parse(localStorage.getItem('user') || 'null'),
  isAuthenticated: () => !!localStorage.getItem('token'),
  isAdmin: () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.rol === 'admin';
  }
};

// ==========================================
// USUARIOS API (Admin) - Rutas en /usuarios
// ==========================================

export const UsuariosAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchWithAuth(`/usuarios?${query}`);
  },
  
  get: (id) => fetchWithAuth(`/usuarios/${id}`),
  
  create: (data) => {
    return fetchWithAuth('/usuarios', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: (id, data) => {
    return fetchWithAuth(`/usuarios/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  delete: (id) => {
    return fetchWithAuth(`/usuarios/${id}`, { method: 'DELETE' });
  },

  toggleActive: (id) => {
    return fetchWithAuth(`/usuarios/${id}/toggle-active`, { method: 'POST' });
  },

  resetPassword: (id, newPassword) => {
    return fetchWithAuth(`/usuarios/${id}/reset-password?new_password=${encodeURIComponent(newPassword)}`, { 
      method: 'POST' 
    });
  },

  getStats: () => fetchWithAuth('/usuarios/stats/resumen'),

  getHistorial: (id) => fetchWithAuth(`/usuarios/${id}/historial`),
};

export const UsersAPI = UsuariosAPI; // Alias para compatibilidad

// ==========================================
// PROYECTOS API
// ==========================================

export const ProyectosAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchWithAuth(`/proyectos?${query}`);
  },
  
  get: (id) => fetchWithAuth(`/proyectos/${id}`),
  
  create: (data) => {
    return fetchWithAuth('/proyectos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: (id, data) => {
    return fetchWithAuth(`/proyectos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  delete: (id) => {
    return fetchWithAuth(`/proyectos/${id}`, { method: 'DELETE' });
  },
  
  addEquipo: (proyectoId, userId, data) => {
    return fetchWithAuth(`/proyectos/${proyectoId}/equipo`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, ...data }),
    });
  },
  
  removeEquipo: (proyectoId, userId) => {
    return fetchWithAuth(`/proyectos/${proyectoId}/equipo/${userId}`, {
      method: 'DELETE',
    });
  },
};

// ==========================================
// GRUPOS API
// ==========================================

export const GruposAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchWithAuth(`/grupos?${query}`);
  },
  
  get: (id) => fetchWithAuth(`/grupos/${id}`),
  
  create: (data) => {
    return fetchWithAuth('/grupos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: (id, data) => {
    return fetchWithAuth(`/grupos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  delete: (id) => {
    return fetchWithAuth(`/grupos/${id}`, { method: 'DELETE' });
  },
  
  addIntegrante: (grupoId, userId, rol = 'Miembro') => {
    return fetchWithAuth(`/grupos/${grupoId}/integrantes?user_id=${userId}&rol_en_grupo=${rol}`, {
      method: 'POST',
    });
  },
  
  removeIntegrante: (grupoId, userId) => {
    return fetchWithAuth(`/grupos/${grupoId}/integrantes/${userId}`, {
      method: 'DELETE',
    });
  },
};

// ==========================================
// SEMILLEROS API
// ==========================================

export const SemillerosAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchWithAuth(`/semilleros?${query}`);
  },
  
  get: (id) => fetchWithAuth(`/semilleros/${id}`),
  
  create: (data) => {
    return fetchWithAuth('/semilleros', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: (id, data) => {
    return fetchWithAuth(`/semilleros/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  delete: (id) => {
    return fetchWithAuth(`/semilleros/${id}`, { method: 'DELETE' });
  },
  
  // Aprendices
  listAprendices: (semilleroId) => {
    return fetchWithAuth(`/semilleros/${semilleroId}/aprendices`);
  },
  
  addAprendiz: (semilleroId, data) => {
    return fetchWithAuth(`/semilleros/${semilleroId}/aprendices`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  updateAprendiz: (semilleroId, aprendizId, data) => {
    return fetchWithAuth(`/semilleros/${semilleroId}/aprendices/${aprendizId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  deleteAprendiz: (semilleroId, aprendizId) => {
    return fetchWithAuth(`/semilleros/${semilleroId}/aprendices/${aprendizId}`, {
      method: 'DELETE',
    });
  },
};

// ==========================================
// CONVOCATORIAS API
// ==========================================

export const ConvocatoriasAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchWithAuth(`/convocatorias?${query}`);
  },
  
  get: (id) => fetchWithAuth(`/convocatorias/${id}`),
  
  create: (data) => {
    return fetchWithAuth('/convocatorias', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: (id, data) => {
    return fetchWithAuth(`/convocatorias/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  delete: (id) => {
    return fetchWithAuth(`/convocatorias/${id}`, { method: 'DELETE' });
  },
  
  activas: () => fetchWithAuth('/convocatorias/activas/now'),
  
  stats: () => fetchWithAuth('/convocatorias/stats/resumen'),
};

// ==========================================
// PRODUCTOS API
// ==========================================

export const ProductosAPI = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetchWithAuth(`/productos?${query}`);
  },
  
  get: (id) => fetchWithAuth(`/productos/${id}`),
  
  create: (data) => {
    return fetchWithAuth('/productos', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  update: (id, data) => {
    return fetchWithAuth(`/productos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  delete: (id) => {
    return fetchWithAuth(`/productos/${id}`, { method: 'DELETE' });
  },
  
  verificar: (id, isVerificado) => {
    return fetchWithAuth(`/productos/${id}/verificar`, {
      method: 'POST',
      body: JSON.stringify({ is_verificado: isVerificado }),
    });
  },
  
  stats: () => fetchWithAuth('/productos/stats/resumen'),
  
  misProductos: () => fetchWithAuth('/productos/mis-productos/list'),
};

// ==========================================
// DASHBOARD & STATS API
// ==========================================

export const DashboardAPI = {
  stats: () => fetchWithAuth('/stats/dashboard'),
  adminStats: () => fetchWithAuth('/stats/admin'),
  getAnalyticsEvolucion: (meses = 12) => fetchWithAuth(`/stats/analytics/evolucion?meses=${meses}`),
  getUserImpact: (id) => fetchWithAuth(`/stats/user/${id}/impact`),
  globalSearch: (q) => fetchWithAuth(`/stats/search/global?q=${q}`),
};

// ==========================================
// REPORTES API
// ==========================================

export const ReportesAPI = {
  getEstadisticasResumen: () => fetchWithAuth('/reportes/estadisticas-resumen'),
  
  descargarConsolidadoProyectos: async (año, formato = 'excel') => {
    const url = `${API_URL}/reportes/proyectos-consolidado?formato=${formato}${año ? `&año=${año}` : ''}`;
    window.open(url, '_blank');
    return { filename: `consolidado_proyectos_${formato}` };
  },
  
  descargarConsolidadoGrupos: async (formato = 'excel') => {
    const url = `${API_URL}/reportes/grupos-consolidado?formato=${formato}`;
    window.open(url, '_blank');
    return { filename: `consolidado_grupos_${formato}` };
  },
  
  descargarConsolidadoProductos: async (año, verificados_only = false, formato = 'excel') => {
    const url = `${API_URL}/reportes/productos-consolidado?formato=${formato}${año ? `&año=${año}` : ''}&verificados_only=${verificados_only}`;
    window.open(url, '_blank');
    return { filename: `consolidado_productos_${formato}` };
  },
  
  descargarConsolidadoSemilleros: async (formato = 'excel') => {
    const url = `${API_URL}/reportes/semilleros-consolidado?formato=${formato}`;
    window.open(url, '_blank');
    return { filename: `consolidado_semilleros_${formato}` };
  },
};

// ==========================================
// EXPORT
// ==========================================

export default {
  Auth: AuthAPI,
  Users: UsuariosAPI,
  Usuarios: UsuariosAPI,
  Proyectos: ProyectosAPI,
  Grupos: GruposAPI,
  Semilleros: SemillerosAPI,
  Convocatorias: ConvocatoriasAPI,
  Productos: ProductosAPI,
  Dashboard: DashboardAPI,
  Reportes: ReportesAPI,
};
