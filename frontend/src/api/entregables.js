/**
 * API de Entregables - Cronograma SENNOVA
 * Gestión de entregables y cronograma de proyectos
 */

import { fetchAPI } from './config';

const API_BASE = '/entregables';

export const EntregablesAPI = {
  /**
   * Lista los entregables de un proyecto
   */
  async listarPorProyecto(proyectoId) {
    return fetchAPI(`${API_BASE}/proyecto/${proyectoId}`);
  },

  /**
   * Obtiene los entregables asignados al usuario actual
   */
  async listarMisEntregables(pendientesOnly = false) {
    const params = new URLSearchParams();
    if (pendientesOnly) params.append('pendientes_only', 'true');
    return fetchAPI(`${API_BASE}/mis-entregables?${params}`);
  },

  /**
   * Obtiene un entregable específico
   */
  async obtener(entregableId) {
    return fetchAPI(`${API_BASE}/${entregableId}`);
  },

  /**
   * Crea un nuevo entregable
   */
  async crear(data) {
    return fetchAPI(API_BASE, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  /**
   * Actualiza un entregable existente
   */
  async actualizar(entregableId, data) {
    return fetchAPI(`${API_BASE}/${entregableId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  /**
   * Elimina un entregable
   */
  async eliminar(entregableId) {
    return fetchAPI(`${API_BASE}/${entregableId}`, {
      method: 'DELETE'
    });
  },

  /**
   * Cambia el estado de un entregable
   */
  async cambiarEstado(entregableId, nuevoEstado, observaciones = null) {
    const params = new URLSearchParams();
    params.append('nuevo_estado', nuevoEstado);
    if (observaciones) params.append('observaciones', observaciones);
    
    return fetchAPI(`${API_BASE}/${entregableId}/cambiar-estado?${params}`, {
      method: 'POST'
    });
  },

  /**
   * Obtiene entregables próximos a vencer
   */
  async alertasProximos(dias = 15) {
    return fetchAPI(`${API_BASE}/alertas/proximos?dias=${dias}`);
  },

  /**
   * Genera automáticamente hitos para un proyecto basados en su tipología
   */
  async generarDesdePlantilla(proyectoId) {
    return fetchAPI(`${API_BASE}/proyecto/${proyectoId}/generate-template`, {
      method: 'POST'
    });
  }
};
