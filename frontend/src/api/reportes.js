/**
 * API de Reportes SENNOVA
 * Generación de reportes consolidados para reportes a nivel nacional
 */

import { API_URL, fetchAPI } from './config';

const API_BASE = '/reportes';

/**
 * Descarga un archivo desde el servidor
 */
function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * Obtiene el token de autenticación del localStorage
 */
function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': `Bearer ${token}`
  };
}

export const ReportesAPI = {
  /**
   * Genera reporte consolidado de proyectos en Excel
   */
  async descargarConsolidadoProyectos(año = null, formato = 'excel') {
    const params = new URLSearchParams();
    if (año) params.append('año', año);
    params.append('formato', formato);
    
    const response = await fetch(`${API_URL}${API_BASE}/proyectos-consolidado?${params}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Error generando reporte de proyectos');
    }
    
    const blob = await response.blob();
    const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 
                     `consolidado_proyectos.${formato === 'excel' ? 'xlsx' : 'csv'}`;
    
    downloadBlob(blob, filename);
    return { success: true, filename };
  },

  /**
   * Genera reporte consolidado de grupos en Excel
   */
  async descargarConsolidadoGrupos(formato = 'excel') {
    const params = new URLSearchParams();
    params.append('formato', formato);
    
    const response = await fetch(`${API_URL}${API_BASE}/grupos-consolidado?${params}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Error generando reporte de grupos');
    }
    
    const blob = await response.blob();
    const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 
                     `consolidado_grupos.${formato === 'excel' ? 'xlsx' : 'csv'}`;
    
    downloadBlob(blob, filename);
    return { success: true, filename };
  },

  /**
   * Genera reporte consolidado de productos en Excel
   */
  async descargarConsolidadoProductos(año = null, verificadosOnly = false, formato = 'excel') {
    const params = new URLSearchParams();
    if (año) params.append('año', año);
    params.append('verificados_only', verificadosOnly);
    params.append('formato', formato);
    
    const response = await fetch(`${API_URL}${API_BASE}/productos-consolidado?${params}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Error generando reporte de productos');
    }
    
    const blob = await response.blob();
    const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 
                     `consolidado_productos.${formato === 'excel' ? 'xlsx' : 'csv'}`;
    
    downloadBlob(blob, filename);
    return { success: true, filename };
  },

  /**
   * Genera reporte consolidado de semilleros en Excel
   */
  async descargarConsolidadoSemilleros(formato = 'excel') {
    const params = new URLSearchParams();
    params.append('formato', formato);
    
    const response = await fetch(`${API_URL}${API_BASE}/semilleros-consolidado?${params}`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Error generando reporte de semilleros');
    }
    
    const blob = await response.blob();
    const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 
                     `consolidado_semilleros.${formato === 'excel' ? 'xlsx' : 'csv'}`;
    
    downloadBlob(blob, filename);
    return { success: true, filename };
  },

  /**
   * Obtiene estadísticas resumidas para el dashboard de reportes
   */
  async getEstadisticasResumen() {
    const response = await fetch(`${API_URL}${API_BASE}/estadisticas-resumen`, {
      headers: getAuthHeaders()
    });
    
    if (!response.ok) {
      throw new Error('Error obteniendo estadísticas');
    }
    
    return response.json();
  }
};
