import jsPDF from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';

// Registrar e inicializar el plugin en jsPDF para soporte completo en Vite/ESM
if (typeof applyPlugin === 'function') {
  applyPlugin(jsPDF);
}

// Colores institucionales SENNOVA / SENA
const COLORS = {
  senaGreen: [16, 185, 129],     // Emerald 600
  senaDarkGreen: [5, 150, 105],  // Emerald 700
  senaOrange: [255, 107, 0],     // SENA Orange
  navyDark: [30, 41, 59],        // Slate 800
  indigoDark: [79, 70, 229],     // Indigo 600
  blueDark: [30, 64, 175],       // Blue 800
  slateDark: [15, 23, 42],       // Slate 900
  textMuted: [100, 116, 139],    // Slate 500
  borderGray: [226, 232, 240],   // Slate 200
  bgLight: [248, 250, 252],      // Slate 50
  white: [255, 255, 255]
};

const sanitizeFileName = (str) => (str || 'documento')
  .toString()
  .trim()
  .replace(/[^a-zA-Z0-9_\-]/g, '_')
  .substring(0, 60);

const formatCurrency = (val) => `$${(Number(val) || 0).toLocaleString('es-CO')} COP`;

const formatDate = (d) => {
  if (!d) return new Date().toLocaleDateString('es-CO');
  const dateObj = new Date(d);
  return isNaN(dateObj.getTime()) ? String(d) : dateObj.toLocaleDateString('es-CO');
};

/**
 * Utilidad para generar documentos PDF oficiales de SENNOVA
 * Alineada con el modelo de base de datos PostgreSQL / SQLite y la API de Plantillas
 */
export const PDFGenerator = {
  
  /**
   * 1. Genera un certificado de participación para un aprendiz
   */
  generateCertificate: (data = {}) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const aprendiz = data.datos_aprendiz || data.aprendiz || {};
    const semillero = data.datos_semillero || data.semillero || {};
    const nombreAprendiz = aprendiz.nombre || data.nombre_completo || data.nombre || 'Aprendiz SENA';
    const docAprendiz = aprendiz.documento || data.documento || 'S/N';
    const ficha = aprendiz.ficha || data.ficha || '';
    const programa = aprendiz.programa || aprendiz.programa_formacion || data.programa || data.programa_formacion || '';
    
    const nombreSemillero = semillero.nombre || data.semillero_nombre || 'Semillero de Investigación SENNOVA';
    const fechaIngreso = semillero.fecha_ingreso ? formatDate(semillero.fecha_ingreso) : (data.fecha_ingreso ? formatDate(data.fecha_ingreso) : 'Vigencia actual');
    const horas = semillero.horas || data.horas_dedicadas || data.horas || 80;
    const centro = data.centro || data.entidad || 'Centro de Gestión Agroempresarial y Oriente - Regional Santander';
    const fechaEmision = data.fecha_emision || new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

    const firmas = Array.isArray(data.firmas) && data.firmas.length > 0 ? data.firmas : [];
    const firma1 = firmas[0] || { nombre: data.lider_nombre || 'Líder de Semillero', rol: 'Líder de Semillero SENNOVA' };
    const firma2 = firmas[1] || { nombre: 'SUBDIRECTOR DE CENTRO', rol: 'Subdirector(a) CGAO' };

    // Fondo y Bordes institucionales
    doc.setDrawColor(...COLORS.senaGreen);
    doc.setLineWidth(1);
    doc.rect(5, 5, 287, 200);
    doc.setLineWidth(0.2);
    doc.rect(7, 7, 283, 196);

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...COLORS.navyDark);
    doc.text('CERTIFICADO DE PARTICIPACIÓN', 148.5, 38, { align: 'center' });
    
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(centro, 148.5, 48, { align: 'center' });

    // Cuerpo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(15);
    doc.setTextColor(51, 65, 85);
    doc.text('El Sistema de Investigación, Innovación y Desarrollo Tecnológico - SENNOVA, certifica que:', 148.5, 72, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(...COLORS.senaGreen);
    doc.text(nombreAprendiz.toUpperCase(), 148.5, 90, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(51, 65, 85);
    let idLine = `Identificado(a) con documento No. ${docAprendiz}`;
    if (ficha) idLine += ` • Ficha: ${ficha}`;
    doc.text(idLine, 148.5, 100, { align: 'center' });

    if (programa) {
      doc.setFontSize(11);
      doc.setTextColor(...COLORS.textMuted);
      doc.text(`Programa de Formación: ${programa}`, 148.5, 108, { align: 'center' });
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(15);
    doc.setTextColor(51, 65, 85);
    doc.text('Por su destacada vinculación y participación activa en el semillero:', 148.5, 124, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.navyDark);
    doc.text(nombreSemillero, 148.5, 138, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Vinculación desde: ${fechaIngreso} | Intensidad: ${horas} horas de investigación formativa`, 148.5, 148, { align: 'center' });

    // Fecha de expedición
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Expedido en Vélez, Santander el día ${fechaEmision}`, 148.5, 166, { align: 'center' });

    // Firmas
    doc.setDrawColor(200, 200, 200);
    doc.line(55, 185, 125, 185);
    doc.line(165, 185, 235, 185);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.navyDark);
    doc.text(firma1.nombre || 'Líder de Semillero', 90, 190, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(firma1.rol || 'Líder SENNOVA', 90, 194, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.navyDark);
    doc.text(firma2.nombre || 'Subdirector CGAO', 200, 190, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(firma2.rol || 'Subdirector CGAO', 200, 194, { align: 'center' });

    doc.save(`Certificado_Semillero_${sanitizeFileName(nombreAprendiz)}.pdf`);
  },

  /**
   * 2. Genera un reporte mensual de actividad de investigador
   */
  generateMonthlyReport: (data = {}) => {
    const doc = new jsPDF();
    const inv = data.investigador || {};
    const nombreInv = inv.nombre || data.nombre || 'Investigador SENNOVA';
    const docInv = inv.documento || data.documento || 'N/A';
    const rolInv = inv.rol_sennova || data.rol || 'Investigador';
    const periodo = data.periodo || new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
    const resumen = data.resumen || {
      proyectos_activos: data.proyectos_count || 0,
      productos_generados: data.productos_count || 0,
      cumplimiento: data.cumplimiento || 100
    };

    // Encabezado institucional
    doc.setFillColor(...COLORS.senaGreen);
    doc.rect(0, 0, 210, 38, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.white);
    doc.text('REPORTE MENSUAL DE ACTIVIDADES', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.text('SISTEMA DE INVESTIGACIÓN, INNOVACIÓN Y DESARROLLO TECNOLÓGICO - SENNOVA', 105, 26, { align: 'center' });
    doc.text('CENTRO DE GESTIÓN AGROEMPRESARIAL Y ORIENTE - REGIONAL SANTANDER', 105, 31, { align: 'center' });

    // Info General
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.navyDark);
    doc.text(`Periodo: ${periodo}`, 20, 48);
    doc.text(`Investigador: ${nombreInv}`, 20, 54);
    doc.text(`Documento: ${docInv} • Rol: ${rolInv}`, 20, 60);

    // Resumen Ejecutivo (Cuadro de Métricas)
    doc.setFillColor(...COLORS.bgLight);
    doc.rect(20, 66, 170, 26, 'F');
    doc.setDrawColor(...COLORS.borderGray);
    doc.rect(20, 66, 170, 26, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.navyDark);
    doc.text('RESUMEN EJECUTIVO DE IMPACTO', 25, 74);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Proyectos Activos: ${resumen.proyectos_activos ?? 0}`, 25, 84);
    doc.text(`Productos CTeI: ${resumen.productos_generados ?? 0}`, 85, 84);
    doc.text(`Nivel de Cumplimiento: ${resumen.cumplimiento ?? 100}%`, 140, 84);

    // Tabla de Actividades
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.navyDark);
    doc.text('DETALLE DE ACTIVIDADES Y AVANCES TÉCNICOS', 20, 102);

    const actividades = Array.isArray(data.detalle_actividades) && data.detalle_actividades.length > 0
      ? data.detalle_actividades
      : [{ fecha: formatDate(new Date()), accion: 'Ejecución técnica', desc: 'Desarrollo de actividades de investigación programadas en la vigencia.' }];

    doc.autoTable({
      startY: 106,
      head: [['Fecha', 'Acción / Tipo', 'Descripción del Avance']],
      body: actividades.map(a => [
        a.fecha ? formatDate(a.fecha) : 'N/A',
        a.accion || a.tipo_accion || 'Actividad',
        a.desc || a.descripcion || 'Sin detalle registrado'
      ]),
      headStyles: { fillColor: COLORS.senaGreen },
      alternateRowStyles: { fillColor: [240, 253, 244] },
      styles: { fontSize: 8.5 }
    });

    // Metas y Compromisos
    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY : 160;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.navyDark);
    doc.text('PRÓXIMAS METAS Y COMPROMISOS', 20, finalY + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    const metas = Array.isArray(data.metas_proximo_mes) && data.metas_proximo_mes.length > 0
      ? data.metas_proximo_mes
      : ['Continuar ejecución técnica de los proyectos asignados', 'Actualizar bitácoras y registros de actividades en la plataforma', 'Consolidar entregables y productos para MinCiencias'];

    metas.forEach((meta, index) => {
      doc.text(`• ${meta}`, 25, finalY + 20 + (index * 6));
    });

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Reporte mensual generado automáticamente el ${new Date().toLocaleDateString('es-CO')} - Plataforma SENNOVA CGAO`, 105, 285, { align: 'center' });

    doc.save(`Reporte_Mensual_${sanitizeFileName(periodo)}_${sanitizeFileName(nombreInv)}.pdf`);
  },

  /**
   * 3. Genera un certificado de participación para un integrante de proyecto
   */
  generateProjectCertificate: (data = {}) => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const user = data.datos_usuario || data.usuario || {};
    const proj = data.datos_proyecto || data.proyecto || {};
    const nombreUsuario = user.nombre || data.nombre || 'Investigador';
    const docUsuario = user.documento || data.documento || 'S/N';
    const rolUsuario = user.rol || user.rol_en_proyecto || data.rol || 'Investigador';
    
    const nombreProyecto = proj.nombre || data.nombre_proyecto || 'Proyecto de Investigación SENNOVA';
    const codigoProyecto = proj.codigo || proj.codigo_sgps || data.codigo_sgps || 'SGPS-2026';
    const vigencia = proj.vigencia || data.vigencia || 12;
    const linea = proj.linea || proj.linea_programatica || proj.linea_investigacion || data.linea || 'I+D';

    const centro = data.centro || 'Centro de Gestión Agroempresarial y Oriente - Regional Santander';
    const fechaEmision = data.fecha_emision || new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

    const firmas = Array.isArray(data.firmas) && data.firmas.length > 0 ? data.firmas : [];
    const firma1 = firmas[0] || { nombre: 'Investigador Principal', rol: 'Investigador Principal' };
    const firma2 = firmas[1] || { nombre: 'SUBDIRECTOR DE CENTRO', rol: 'Subdirector(a) CGAO' };

    // Fondo y Bordes
    doc.setDrawColor(...COLORS.senaGreen);
    doc.setLineWidth(1);
    doc.rect(5, 5, 287, 200);
    doc.setLineWidth(0.2);
    doc.rect(7, 7, 283, 196);

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(...COLORS.navyDark);
    doc.text('CERTIFICADO DE PARTICIPACIÓN EN PROYECTO', 148.5, 38, { align: 'center' });
    
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(centro, 148.5, 48, { align: 'center' });

    // Cuerpo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(15);
    doc.setTextColor(51, 65, 85);
    doc.text('El Sistema de Investigación, Innovación y Desarrollo Tecnológico - SENNOVA, otorga el presente reconocimiento a:', 148.5, 72, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(...COLORS.senaGreen);
    doc.text(nombreUsuario.toUpperCase(), 148.5, 90, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(51, 65, 85);
    doc.text(`Identificado(a) con documento No. ${docUsuario}`, 148.5, 100, { align: 'center' });

    doc.setFontSize(15);
    doc.text(`Por su valiosa contribución como ${rolUsuario.toUpperCase()} en el proyecto de investigación:`, 148.5, 118, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...COLORS.navyDark);
    const splitTitle = doc.splitTextToSize(nombreProyecto, 240);
    doc.text(splitTitle, 148.5, 132, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.textMuted);
    const yInfo = 132 + (splitTitle.length * 5) + 4;
    doc.text(`Código SGPS: ${codigoProyecto} | Vigencia: ${vigencia} meses | Línea: ${linea}`, 148.5, yInfo, { align: 'center' });

    // Fecha
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`Expedido en la Regional Santander el día ${fechaEmision}`, 148.5, 166, { align: 'center' });

    // Firmas
    doc.setDrawColor(200, 200, 200);
    doc.line(55, 185, 125, 185);
    doc.line(165, 185, 235, 185);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.navyDark);
    doc.text(firma1.nombre || 'Investigador Principal', 90, 190, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(firma1.rol || 'Investigador Principal', 90, 194, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.navyDark);
    doc.text(firma2.nombre || 'Subdirector CGAO', 200, 190, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(firma2.rol || 'Subdirector CGAO', 200, 194, { align: 'center' });

    doc.save(`Certificado_Proyecto_${sanitizeFileName(nombreUsuario)}.pdf`);
  },

  /**
   * 4. Genera un reporte detallado de presupuesto
   */
  generateBudgetReport: (data = {}) => {
    const doc = new jsPDF();
    const proyecto = data.proyecto || data || {};
    const resumen = data.resumen_financiero || {
      total_asignado: proyecto.presupuesto_total || 0,
      fuente: 'SGPS - SENNOVA'
    };
    const indicadores = data.indicadores || {
      eficiencia_operativa: 100,
      nivel_ejecucion: 0,
      gasto_talento_humano: 'Cargado a nómina SENA'
    };
    const fechaCorte = data.fecha_corte || new Date().toLocaleDateString('es-CO');

    // Encabezado institucional
    doc.setFillColor(...COLORS.senaGreen);
    doc.rect(0, 0, 210, 38, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.white);
    doc.text('INFORME FINANCIERO DE PROYECTO', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.text('SISTEMA DE INVESTIGACIÓN, INNOVACIÓN Y DESARROLLO TECNOLÓGICO - SENNOVA', 105, 26, { align: 'center' });
    doc.text('CENTRO DE GESTIÓN AGROEMPRESARIAL Y ORIENTE - REGIONAL SANTANDER', 105, 31, { align: 'center' });

    // Info del Proyecto
    doc.setTextColor(...COLORS.navyDark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLES GENERALES DEL PROYECTO', 20, 48);
    doc.setDrawColor(...COLORS.borderGray);
    doc.line(20, 50, 190, 50);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Proyecto: ${proyecto.nombre || 'Sin nombre'}`, 20, 58);
    doc.text(`Código SGPS: ${proyecto.codigo || proyecto.codigo_sgps || 'N/A'}`, 20, 65);
    doc.text(`Investigador Principal: ${proyecto.investigador || proyecto.owner?.nombre || 'Investigador Principal'}`, 20, 72);
    doc.text(`Vigencia: ${proyecto.vigencia || 12} meses`, 20, 79);

    // Resumen Financiero
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE ASIGNACIÓN', 135, 58);
    doc.setFontSize(15);
    doc.setTextColor(...COLORS.senaGreen);
    doc.text(formatCurrency(resumen.total_asignado), 135, 68);
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Fuente: ${resumen.fuente || 'SGPS - SENNOVA'}`, 135, 75);

    // Tabla de Rubros
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.navyDark);
    doc.text('DISTRIBUCIÓN PRESUPUESTAL POR RUBROS', 20, 93);

    let rubros = Array.isArray(data.distribucion_rubros) && data.distribucion_rubros.length > 0
      ? data.distribucion_rubros
      : null;

    if (!rubros) {
      const bjson = proyecto.presupuesto_detallado || {};
      const total = Number(proyecto.presupuesto_total) || 1;
      rubros = [
        { label: 'Servicios Tecnológicos', valor: Number(bjson.servicios || 0) },
        { label: 'Materiales y Suministros', valor: Number(bjson.materiales || 0) },
        { label: 'Viáticos y Transporte', valor: Number(bjson.viaticos || 0) },
        { label: 'Equipos de Laboratorio', valor: Number(bjson.equipos || 0) },
        { label: 'Software y Licencias', valor: Number(bjson.software || 0) },
        { label: 'Otros Gastos Operativos', valor: Number(bjson.otros || 0) }
      ].map(r => ({
        ...r,
        porcentaje: total > 0 ? ((r.valor / total) * 100).toFixed(1) : '0.0'
      }));
    }

    doc.autoTable({
      startY: 97,
      head: [['Rubro Presupuestal', 'Valor Asignado (COP)', '% Participación']],
      body: rubros.map(r => [
        r.label || r.rubro || 'Rubro', 
        formatCurrency(r.valor), 
        `${r.porcentaje ?? 0}%`
      ]),
      headStyles: { fillColor: COLORS.navyDark },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'center' }
      },
      styles: { fontSize: 8.5 }
    });

    // Indicadores Estratégicos
    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY : 170;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.navyDark);
    doc.text('INDICADORES DE GESTIÓN Y EFICIENCIA', 20, finalY + 12);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.text(`• Eficiencia Operativa Estimada: ${indicadores.eficiencia_operativa ?? 100}%`, 25, finalY + 20);
    doc.text(`• Nivel de Ejecución Actual: ${indicadores.nivel_ejecucion ?? 0}%`, 25, finalY + 26);
    doc.text(`• Talento Humano: ${indicadores.gasto_talento_humano || 'Cargado a nómina SENA'}`, 25, finalY + 32);

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Reporte generado automáticamente el ${fechaCorte} - Plataforma de Gestión SENNOVA CGAO`, 105, 285, { align: 'center' });

    doc.save(`Presupuesto_${sanitizeFileName(proyecto.codigo || proyecto.codigo_sgps || 'Proyecto')}.pdf`);
  },

  /**
   * 5. Genera el reporte oficial de bitácora técnica
   */
  generateBitacoraReport: (data = {}) => {
    const doc = new jsPDF();
    const proyecto = data.proyecto || data || {};
    const entidad = data.entidad || 'SERVICIO NACIONAL DE APRENDIZAJE - SENA';
    const centro = data.centro || 'CENTRO DE GESTIÓN AGROEMPRESARIAL Y ORIENTE - CGAO';
    const periodo = data.periodo || `Generado el ${new Date().toLocaleDateString('es-CO')}`;
    
    const rawEntradas = Array.isArray(data.entradas) ? data.entradas : (Array.isArray(data.bitacoras) ? data.bitacoras : []);
    const entradas = rawEntradas;

    const resumen = data.resumen_ejecucion || {
      total_entradas: entradas.length,
      firmas_completas: entradas.filter(e => e.is_firmado_investigador && e.is_firmado_aprendiz).length,
      pendientes: entradas.filter(e => !e.is_firmado_investigador || !e.is_firmado_aprendiz).length
    };

    // Encabezado
    doc.setFillColor(...COLORS.indigoDark);
    doc.rect(0, 0, 210, 42, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.white);
    doc.text('BITÁCORA TÉCNICA DE INVESTIGACIÓN', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.text(entidad, 105, 26, { align: 'center' });
    doc.text(centro, 105, 32, { align: 'center' });

    // Info del Proyecto
    doc.setTextColor(...COLORS.navyDark);
    doc.setFontSize(11);
    doc.text('DETALLES DEL PROYECTO', 20, 52);
    doc.setDrawColor(...COLORS.borderGray);
    doc.line(20, 54, 190, 54);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nombre: ${proyecto.nombre || 'Sin definir'}`, 20, 62);
    doc.text(`Código SGPS: ${proyecto.codigo || proyecto.codigo_sgps || 'N/A'}`, 20, 68);
    doc.text(`Línea: ${proyecto.linea || proyecto.linea_programatica || proyecto.linea_investigacion || 'No definida'}`, 20, 74);
    doc.text(`Periodo: ${periodo}`, 20, 80);

    // Resumen de Ejecución
    doc.setFillColor(...COLORS.bgLight);
    doc.rect(130, 58, 65, 26, 'F');
    doc.setDrawColor(...COLORS.borderGray);
    doc.rect(130, 58, 65, 26, 'S');

    doc.setFont('helvetica', 'bold');
    doc.text('ESTADO DE BITÁCORA', 135, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Entradas: ${resumen.total_entradas ?? 0}`, 135, 71);
    doc.text(`Firmas Completas: ${resumen.firmas_completas ?? 0}`, 135, 76);
    doc.text(`Pendientes: ${resumen.pendientes ?? 0}`, 135, 81);

    // Tabla de Entradas
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('HISTORIAL DE ACTIVIDADES Y HALLAZGOS', 20, 96);

    const bodyTable = entradas.length > 0 ? entradas.map(e => [
      e.fecha ? formatDate(e.fecha) : 'N/A', 
      `${(e.titulo || 'Sin título').toUpperCase()}\n(${e.categoria || 'Técnica'})`, 
      e.autor || e.user?.nombre || 'Investigador',
      e.estado_firma || (e.is_firmado_investigador ? 'FIRMADO' : 'PENDIENTE')
    ]) : [['-', 'Sin entradas registradas en la bitácora técnica', '-', 'N/A']];

    doc.autoTable({
      startY: 100,
      head: [['Fecha', 'Título / Categoría', 'Autor', 'Firma']],
      body: bodyTable,
      headStyles: { fillColor: COLORS.indigoDark },
      styles: { fontSize: 8 },
      columnStyles: {
        1: { cellWidth: 75 }
      }
    });

    // Detalle de cada entrada (con saltos de página inteligentes)
    let currentY = (doc.lastAutoTable && doc.lastAutoTable.finalY ? doc.lastAutoTable.finalY : 120) + 14;

    if (entradas.length > 0) {
      entradas.forEach((e, index) => {
        if (currentY > 230) {
          doc.addPage();
          currentY = 25;
        }

        doc.setFillColor(241, 245, 249);
        doc.rect(20, currentY, 170, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(...COLORS.navyDark);
        doc.text(`ENTRADA #${index + 1}: ${e.titulo || 'Sin título'} (${e.categoria || 'General'})`, 24, currentY + 5);
        
        currentY += 12;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        const splitText = doc.splitTextToSize(e.contenido || 'Sin contenido registrado.', 160);
        doc.text(splitText, 24, currentY);
        
        currentY += (splitText.length * 4.5) + 4;
        
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.textMuted);
        doc.text(`Hash de Integridad: ${e.hash_verificacion || 'N/A'} • Autor: ${e.autor || e.user?.nombre || 'Investigador'} • Adjuntos: ${e.adjuntos_count ?? (e.adjuntos?.length || 0)}`, 24, currentY);
        currentY += 10;
      });
    }

    // Glosario y Seguridad en página final si es necesario
    if (currentY > 220) {
      doc.addPage();
      currentY = 25;
    } else {
      currentY += 6;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.navyDark);
    doc.text('SEGURIDAD Y TRAZABILIDAD CRIPTOGRÁFICA', 20, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    const glosario = data.glosario_seguridad || 'Los hashes de verificación garantizan la integridad, inmutabilidad y autenticidad del contenido técnico registrado conforme a los lineamientos SENNOVA.';
    doc.text(doc.splitTextToSize(glosario, 170), 20, currentY + 6);

    doc.save(`Bitacora_Oficial_${sanitizeFileName(proyecto.codigo || proyecto.codigo_sgps || 'Proyecto')}.pdf`);
  },

  /**
   * 6. Genera el Formato de Etapa Productiva
   */
  generateEtapaProductiva: (proyecto = {}) => {
    const doc = new jsPDF();
    
    // Encabezado
    doc.setFillColor(...COLORS.senaGreen);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.white);
    doc.text('FORMATO ETAPA PRODUCTIVA', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.text('CENTRO DE GESTIÓN AGROEMPRESARIAL Y ORIENTE - REGIONAL SANTANDER', 105, 26, { align: 'center' });
    doc.text('SISTEMA DE INVESTIGACIÓN, INNOVACIÓN Y DESARROLLO TECNOLÓGICO - SENNOVA', 105, 31, { align: 'center' });

    // Info del Proyecto
    doc.setTextColor(...COLORS.navyDark);
    doc.setFontSize(11);
    doc.text('DATOS GENERALES DEL PROYECTO', 20, 50);
    doc.setDrawColor(...COLORS.borderGray);
    doc.line(20, 52, 190, 52);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Nombre:', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(proyecto.nombre || 'Sin definir', 145), 40, 60);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Código SGPS:', 20, 74);
    doc.setFont('helvetica', 'normal');
    doc.text(proyecto.codigo_sgps || proyecto.codigo || 'N/A', 50, 74);

    doc.setFont('helvetica', 'bold');
    doc.text('Tipología:', 20, 82);
    doc.setFont('helvetica', 'normal');
    doc.text(proyecto.tipologia || proyecto.linea_programatica || 'I+D e Innovación', 42, 82);

    doc.setFont('helvetica', 'bold');
    doc.text('Vigencia:', 20, 90);
    doc.setFont('helvetica', 'normal');
    doc.text(`${proyecto.vigencia || 12} meses`, 42, 90);

    doc.setFont('helvetica', 'bold');
    doc.text('Presupuesto Total:', 20, 98);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(proyecto.presupuesto_total), 58, 98);

    // Integrantes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('EQUIPO DE INVESTIGADORES Y APRENDICES VINCULADOS', 20, 112);
    doc.setDrawColor(...COLORS.borderGray);
    doc.line(20, 114, 190, 114);

    const equipo = (Array.isArray(proyecto.equipo) && proyecto.equipo.length > 0)
      ? proyecto.equipo
      : (Array.isArray(proyecto.investigadores) && proyecto.investigadores.length > 0 ? proyecto.investigadores : []);

    const bodyEquipo = equipo.length > 0 ? equipo.map(m => [
      m.nombre || m.user?.nombre || 'Integrante', 
      m.rol || m.rol_en_proyecto || m.pivot?.rol_en_proyecto || 'Investigador',
      `${m.horas_dedicadas || m.pivot?.horas_dedicadas || m.horas || 20} hrs/sem`
    ]) : [['Sin integrantes vinculados registrados', 'Investigador', '20 hrs/sem']];

    doc.autoTable({
      startY: 118,
      head: [['Nombre Completo', 'Rol en Proyecto', 'Dedicación Horaria']],
      body: bodyEquipo,
      headStyles: { fillColor: COLORS.senaGreen },
      styles: { fontSize: 8.5 }
    });

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Formato generado automáticamente el ${new Date().toLocaleDateString('es-CO')} - Plataforma SENNOVA CGAO`, 105, 285, { align: 'center' });

    doc.save(`Formato_Etapa_Productiva_${sanitizeFileName(proyecto.codigo_sgps || proyecto.codigo || 'Proyecto')}.pdf`);
  },

  /**
   * 7. Genera el Formato de Seguimiento de Proyecto
   */
  generateSeguimiento: (proyecto = {}) => {
    const doc = new jsPDF();
    
    // Encabezado
    doc.setFillColor(...COLORS.blueDark);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.white);
    doc.text('FORMATO DE SEGUIMIENTO TÉCNICO', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.text('SISTEMA DE INVESTIGACIÓN, INNOVACIÓN Y DESARROLLO TECNOLÓGICO - SENNOVA', 105, 26, { align: 'center' });
    doc.text('CENTRO DE GESTIÓN AGROEMPRESARIAL Y ORIENTE - REGIONAL SANTANDER', 105, 31, { align: 'center' });

    // Info
    doc.setTextColor(...COLORS.navyDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Proyecto: ${proyecto.nombre || proyecto.nombre_corto || proyecto.codigo_sgps || 'Proyecto SENNOVA'}`, 20, 50);
    doc.text(`Código SGPS: ${proyecto.codigo_sgps || proyecto.codigo || 'N/A'}`, 20, 56);
    doc.text(`Fecha de Seguimiento: ${new Date().toLocaleDateString('es-CO')}`, 20, 62);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('HITOS Y ENTREGABLES PROGRAMADOS EN CRONOGRAMA', 20, 74);
    
    const entregables = (Array.isArray(proyecto.entregables) && proyecto.entregables.length > 0)
      ? proyecto.entregables
      : (Array.isArray(proyecto.hitos) && proyecto.hitos.length > 0 ? proyecto.hitos : []);

    const bodyEntregables = entregables.length > 0 ? entregables.map(e => [
      e.fase || 'Fase I', 
      e.titulo || e.nombre || 'Entregable', 
      e.fecha_entrega ? formatDate(e.fecha_entrega) : (e.fecha_limite ? formatDate(e.fecha_limite) : 'Pendiente'),
      (e.estado || 'PENDIENTE').toUpperCase()
    ]) : [['Fase I', 'Sin entregables configurados en cronograma', '-', 'PENDIENTE']];

    doc.autoTable({
      startY: 78,
      head: [['Fase', 'Título del Entregable', 'Fecha Límite', 'Estado']],
      body: bodyEntregables,
      headStyles: { fillColor: COLORS.blueDark },
      styles: { fontSize: 8.5 }
    });

    const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY : 120;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.navyDark);
    doc.text('OBSERVACIONES DE SEGUIMIENTO Y COMPROMISOS', 20, finalY + 12);
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, finalY + 16, 170, 35);

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Formato de seguimiento generado el ${new Date().toLocaleDateString('es-CO')} - Plataforma SENNOVA CGAO`, 105, 285, { align: 'center' });

    doc.save(`Formato_Seguimiento_${sanitizeFileName(proyecto.codigo_sgps || proyecto.codigo || 'Proyecto')}.pdf`);
  },

  /**
   * 8. Genera el Informe Final del Proyecto
   */
  generateInformeFinal: (proyecto = {}) => {
    const doc = new jsPDF();
    
    // Encabezado
    doc.setFillColor(...COLORS.slateDark);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.white);
    doc.text('INFORME FINAL DE PROYECTO SENNOVA', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.text('CENTRO DE GESTIÓN AGROEMPRESARIAL Y ORIENTE - REGIONAL SANTANDER', 105, 26, { align: 'center' });
    doc.text('SISTEMA DE INVESTIGACIÓN, INNOVACIÓN Y DESARROLLO TECNOLÓGICO', 105, 31, { align: 'center' });

    // Info
    doc.setTextColor(...COLORS.navyDark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DE CIERRE DEL PROYECTO', 20, 50);
    doc.setDrawColor(...COLORS.borderGray);
    doc.line(20, 52, 190, 52);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Proyecto: ${proyecto.nombre || 'Sin nombre'}`, 20, 60);
    doc.text(`Código SGPS: ${proyecto.codigo_sgps || proyecto.codigo || 'N/A'}`, 20, 67);
    doc.text(`Línea: ${proyecto.linea_programatica || proyecto.linea_investigacion || 'I+D'}`, 20, 74);
    doc.text(`Estado de Cierre: ${proyecto.estado ? String(proyecto.estado).toUpperCase() : 'FINALIZADO'}`, 20, 81);

    // Productos y Resultados
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE RESULTADOS E INDICADORES ALCANZADOS', 20, 96);
    doc.setDrawColor(...COLORS.borderGray);
    doc.line(20, 98, 190, 98);
    
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    const totalProd = proyecto.total_productos ?? (Array.isArray(proyecto.productos) ? proyecto.productos.length : 0);
    doc.text(`Total Productos CTeI Generados: ${totalProd}`, 20, 108);
    doc.text(`Presupuesto Total Ejecutado: ${formatCurrency(proyecto.presupuesto_total)}`, 20, 115);

    const entregables = Array.isArray(proyecto.entregables) ? proyecto.entregables : [];
    const aprobados = entregables.filter(e => (e.estado || '').toLowerCase() === 'aprobado').length;
    doc.text(`Entregables Aprobados en Cronograma: ${aprobados} de ${entregables.length}`, 20, 122);

    // Firmas de Cierre
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('FIRMAS Y CONFORMIDAD DE CIERRE TÉCNICO', 20, 155);
    doc.setDrawColor(200, 200, 200);
    doc.line(30, 185, 80, 185);
    doc.line(130, 185, 180, 185);
    doc.setFontSize(8.5);
    doc.text('INVESTIGADOR PRINCIPAL', 55, 190, { align: 'center' });
    doc.text('SUBDIRECTOR DE CENTRO', 155, 190, { align: 'center' });

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Informe final generado automáticamente el ${new Date().toLocaleDateString('es-CO')} - Plataforma SENNOVA CGAO`, 105, 285, { align: 'center' });

    doc.save(`Informe_Final_${sanitizeFileName(proyecto.codigo_sgps || proyecto.codigo || 'Proyecto')}.pdf`);
  },

  /**
   * 9. Genera la Ficha Técnica oficial del Proyecto
   */
  generateProjectPDF: (proyecto = {}, teamMembers = []) => {
    const doc = new jsPDF();
    
    // Encabezado institucional
    doc.setFillColor(...COLORS.senaGreen);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(...COLORS.white);
    doc.text('FICHA TÉCNICA DE PROYECTO', 105, 18, { align: 'center' });
    doc.setFontSize(9);
    doc.text('CENTRO DE GESTIÓN AGROEMPRESARIAL Y ORIENTE - REGIONAL SANTANDER', 105, 26, { align: 'center' });
    doc.text('SISTEMA DE INVESTIGACIÓN, INNOVACIÓN Y DESARROLLO TECNOLÓGICO - SENNOVA', 105, 31, { align: 'center' });

    // Información básica
    doc.setTextColor(...COLORS.navyDark);
    doc.setFontSize(11);
    doc.text('INFORMACIÓN GENERAL', 20, 50);
    doc.setDrawColor(...COLORS.borderGray);
    doc.line(20, 52, 190, 52);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Nombre:', 20, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(doc.splitTextToSize(proyecto.nombre || 'Sin definir', 145), 45, 60);

    doc.setFont('helvetica', 'bold');
    doc.text('Código SGPS:', 20, 72);
    doc.setFont('helvetica', 'normal');
    doc.text(proyecto.codigo_sgps || proyecto.codigo || 'N/A', 50, 72);

    doc.setFont('helvetica', 'bold');
    doc.text('Estado:', 120, 72);
    doc.setFont('helvetica', 'normal');
    doc.text((proyecto.estado || 'Aprobado').toUpperCase(), 140, 72);

    doc.setFont('helvetica', 'bold');
    doc.text('Línea:', 20, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(proyecto.linea_investigacion || proyecto.linea_programatica || 'No definida', 45, 80);

    doc.setFont('helvetica', 'bold');
    doc.text('Semillero:', 120, 80);
    doc.setFont('helvetica', 'normal');
    const semNombre = proyecto.semillero?.nombre || proyecto.semillero_nombre || (typeof proyecto.semillero === 'string' ? proyecto.semillero : 'Independiente / No asignado');
    doc.text(semNombre, 142, 80);

    doc.setFont('helvetica', 'bold');
    doc.text('Presupuesto:', 20, 88);
    doc.setFont('helvetica', 'normal');
    doc.text(formatCurrency(proyecto.presupuesto_total), 50, 88);

    doc.setFont('helvetica', 'bold');
    doc.text('Vigencia:', 120, 88);
    doc.setFont('helvetica', 'normal');
    doc.text(`${proyecto.vigencia || 12} meses`, 140, 88);

    // Objetivo General
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('OBJETIVO GENERAL', 20, 100);
    doc.setDrawColor(...COLORS.borderGray);
    doc.line(20, 102, 190, 102);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const objText = doc.splitTextToSize(proyecto.objetivo_general || proyecto.descripcion || 'Sin objetivo general registrado.', 170);
    doc.text(objText, 20, 109);

    // Equipo de investigación
    const currentY = 109 + (objText.length * 4.2) + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('EQUIPO DE INVESTIGACIÓN VINCULADO', 20, currentY);
    doc.setDrawColor(...COLORS.borderGray);
    doc.line(20, currentY + 2, 190, currentY + 2);

    const members = (teamMembers && teamMembers.length > 0)
      ? teamMembers
      : ((Array.isArray(proyecto.equipo) && proyecto.equipo.length > 0)
        ? proyecto.equipo
        : (Array.isArray(proyecto.investigadores) && proyecto.investigadores.length > 0 ? proyecto.investigadores : []));

    const bodyMembers = members.length > 0 ? members.map(m => [
      m.nombre || m.user?.nombre || 'Sin nombre',
      m.email || m.user?.email || 'N/A',
      m.rol || m.rol_en_proyecto || m.pivot?.rol_en_proyecto || 'Investigador',
      `${m.horas_dedicadas || m.pivot?.horas_dedicadas || m.horas || 20} hrs/sem`
    ]) : [['Sin investigadores vinculados registrados', 'N/A', 'Investigador', '20 hrs/sem']];

    doc.autoTable({
      startY: currentY + 6,
      head: [['Nombre', 'Email', 'Rol', 'Dedicación']],
      body: bodyMembers,
      headStyles: { fillColor: COLORS.senaGreen },
      styles: { fontSize: 8.5 }
    });

    // Pie de página
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Ficha técnica generada automáticamente el ${new Date().toLocaleDateString('es-CO')} - Plataforma de Gestión SENNOVA CGAO`, 105, 285, { align: 'center' });

    doc.save(`Ficha_Tecnica_${sanitizeFileName(proyecto.codigo_sgps || proyecto.codigo || 'Proyecto')}.pdf`);
  }
};
