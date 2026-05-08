/**
 * Configuración de la API SENNOVA
 */

// URL del backend - Usa variable de entorno Vite o fallback a localhost
export const API_URL = import.meta.env.VITE_API_URL || '/api';

// URL base de CVLAC desde variable de entorno
export const CVLAC_BASE_URL = import.meta.env.VITE_CVLAC_BASE_URL || 'https://scienti.minciencias.gov.co';

// Placeholder para URL de CVLAC
export const CVLAC_URL_PLACEHOLDER = `${CVLAC_BASE_URL}/cvlac/...`;

// Memoria volátil para el token (más rápido que localStorage para peticiones paralelas)
let _authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

/**
 * Actualiza el token de autenticación tanto en memoria como en localStorage
 * @param {string|null} token - El nuevo token o null para eliminarlo
 */
export const setAuthToken = (token) => {
  _authToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  }
};

// Headers por defecto
export const getHeaders = () => {
  const token = _authToken || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  
  if (!token && !window.location.pathname.includes('/login')) {
    console.warn('[AUTH] No se encontró token de sesión. Las peticiones protegidas fallarán.');
  }
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

const normalizePath = (value) => `/${String(value || '').replace(/^\/+/, '')}`;

const buildApiUrl = (endpoint) => {
  // Si es una URL absoluta, retornar tal cual
  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  
  const base = (API_URL || '/api').replace(/\/+$/, '');
  const path = String(endpoint || '').replace(/^\/+/, '');
  
  // Si el path ya contiene el base (ej: /api/usuarios), no duplicarlo
  const baseRelative = base.startsWith('/') ? base : new URL(base, window.location.origin).pathname;
  if (path.startsWith(baseRelative.replace(/^\/+/, ''))) {
      return `${window.location.origin}/${path}`;
  }

  return `${base}/${path}`;
};

const getErrorMessage = (error, fallback) => {
  const detail = error?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item.msg || item.message).filter(Boolean).join('. ') || fallback;
  }

  if (typeof detail === 'string') return detail;
  if (typeof error?.message === 'string') return error.message;

  return fallback;
};

// Fetch con manejo de errores
export async function fetchAPI(endpoint, options = {}) {
  const url = buildApiUrl(endpoint);
  
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (response.status === 401) {
      console.error('[AUTH] 401 Unauthorized detectado. Cerrando sesión.');
      setAuthToken(null);
      window.location.href = '/login';
      throw new Error('Sesión expirada');
    }
    
    if (response.status === 403) {
      const errorData = await response.json().catch(() => ({ detail: 'Forbidden' }));
      console.error(`[AUTH] 403 Forbidden on ${endpoint}:`, errorData.detail);
      
      if (errorData.detail === "Not authenticated") {
        console.warn('[AUTH] Missing Authorization header. Check if token is available.');
      }
      
      throw new Error(errorData.detail || 'Acceso denegado');
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        detail: `Error ${response.status}: ${response.statusText}` 
      }));
      throw new Error(getErrorMessage(error, 'Error en la petición'));
    }
    
    if (response.status === 204) return null;
    
    return await response.json();
  } catch (error) {
    if (error.message === 'Failed to fetch') {
      throw new Error('No se puede conectar al servidor. Verifica que el backend esté corriendo.');
    }
    throw error;
  }
}
