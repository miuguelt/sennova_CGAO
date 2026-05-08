/**
 * Configuración de la API SENNOVA
 */

// URL del backend - Usa variable de entorno Vite o fallback a localhost
export const API_URL = import.meta.env.VITE_API_URL || '/api';

// URL base de CVLAC desde variable de entorno
export const CVLAC_BASE_URL = import.meta.env.VITE_CVLAC_BASE_URL || 'https://scienti.minciencias.gov.co';

// Placeholder para URL de CVLAC
export const CVLAC_URL_PLACEHOLDER = `${CVLAC_BASE_URL}/cvlac/...`;

// Headers por defecto
export const getHeaders = () => {
  const token = localStorage.getItem('token');
  if (!token) {
    console.warn('[AUTH] No se encontró token en localStorage. La petición podría fallar.');
  }
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

const normalizePath = (value) => `/${String(value || '').replace(/^\/+/, '')}`;

const buildApiUrl = (endpoint) => {
  const base = API_URL.replace(/\/+$/, '');
  const path = normalizePath(endpoint);
  const normalizedBase = normalizePath(base);

  if (/^https?:\/\//i.test(endpoint)) return endpoint;
  if (path === normalizedBase || path.startsWith(`${normalizedBase}/`)) return path;

  return `${base}${path}`;
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
      console.error('[AUTH] 401 Unauthorized detected. Wiping session.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
