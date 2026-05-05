/**
 * Configuración de la API SENNOVA
 */

// URL del backend - Usa variable de entorno Vite o fallback a localhost
export const API_URL = import.meta.env.VITE_API_URL || '/api';

// URL base de CVLAC desde variable de entorno
export const CVLAC_BASE_URL = import.meta.env.VITE_CVLAC_BASE_URL || 'http://scienti.colciencias.gov.co:8084';

// Placeholder para URL de CVLAC
export const CVLAC_URL_PLACEHOLDER = `${CVLAC_BASE_URL}/cvlac/...`;

// Headers por defecto
export const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Fetch con manejo de errores
export async function fetchAPI(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      throw new Error('Sesión expirada');
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        detail: `Error ${response.status}: ${response.statusText}` 
      }));
      throw new Error(error.detail || error.message || 'Error en la petición');
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
