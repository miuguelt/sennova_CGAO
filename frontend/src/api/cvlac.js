/**
 * API de Integración CVLAC
 * Gestión de currículos LAC (Colciencias)
 */

import { API_URL, fetchAPI } from './config.js';

const API_BASE = '/cvlac';

export const CVLACAPI = {
  /**
   * Valida una URL de CVLAC
   */
  async validarURL(url) {
    const params = new URLSearchParams({ url });
    return fetchAPI(`${API_BASE}/validar-url?${params}`);
  },

  /**
   * Sube un PDF de CVLAC
   */
  async subirPDF(file, userId = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (userId) formData.append('user_id', userId);

    const response = await fetch(`${API_URL}${API_BASE}/subir-pdf`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al subir CVLAC');
    }

    return response.json();
  },

  /**
   * Obtiene el estado del CVLAC de un usuario
   */
  async estadoUsuario(userId) {
    return fetchAPI(`${API_BASE}/usuarios/${userId}/estado`);
  },

  /**
   * Lista investigadores sin CVLAC (solo admin)
   */
  async usuariosSinCVLAC() {
    return fetchAPI(`${API_BASE}/usuarios/sin-cvlac`);
  },

  /**
   * Importa productos desde CVLAC parseado
   */
  async importarProductos(userId, productos) {
    return fetchAPI(`${API_BASE}/importar-productos?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(productos)
    });
  },

  /**
   * Resumen del estado CVLAC en el sistema (solo admin)
   */
  async resumenSistema() {
    return fetchAPI(`${API_BASE}/resumen-sistema`);
  }
};
