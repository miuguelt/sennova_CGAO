import { fetchAPI } from './config';

/**
 * Servicio de Plantillas Inteligentes y Automatización
 */
export const PlantillasAPI = {
  // Proyectos
  generarCronograma: (proyectoId) => fetchAPI(`/plantillas/proyectos/${proyectoId}/cronograma-sennova`, {
    method: 'POST'
  }),

  // Semilleros / Aprendices
  getDatosCertificado: (semilleroId, aprendizId) => 
    fetchAPI(`/plantillas/semilleros/${semilleroId}/certificado-aprendiz/${aprendizId}`),

  // Usuarios
  getReporteMensual: (userId) => 
    fetchAPI(`/plantillas/usuarios/${userId}/reporte-mensual`),

  // Presupuesto
  getReportePresupuesto: (proyectoId) => 
    fetchAPI(`/plantillas/proyectos/${proyectoId}/presupuesto-detalle`),

  // Certificados Masivos
  getCertificadosMasivos: (proyectoId) => 
    fetchAPI(`/plantillas/proyectos/${proyectoId}/certificados-masivos`),

  // Bitácora
  getBitacoraOficial: (proyectoId) => 
    fetchAPI(`/plantillas/proyectos/${proyectoId}/bitacora-oficial`),
};
