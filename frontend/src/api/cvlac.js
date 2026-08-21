/**
 * API de Integración CVLAC
 * Gestión de currículos LAC (Colciencias)
 */

import { fetchAPI } from './config';

const API_BASE = '/cvlac';

export const CVLACAPI = {
  /**
   * Valida una URL de CVLAC
   */
  async validarURL(url) {
    const params = new URLSearchParams({ url });
    return fetchAPI(`${API_BASE}/validar-url?${params}`);
  },

  async validarUrl(url) {
    return this.validarURL(url);
  },

  /**
   * Sube un PDF de CVLAC
   */
  async subirPDF(file, userId = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (userId) formData.append('user_id', userId);

    return fetchAPI(`${API_BASE}/subir-pdf`, {
      method: 'POST',
      body: formData
    });
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
    const payload = Array.isArray(productos) ? { productos } : productos;
    return fetchAPI(`${API_BASE}/importar-productos?user_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  /**
   * Resumen del estado CVLAC en el sistema (solo admin)
   */
  async resumenSistema() {
    return fetchAPI(`${API_BASE}/resumen-sistema`);
  }
};

export const CvlacAPI = CVLACAPI;
